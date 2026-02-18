from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import asyncio
import json
import logging
import time
import os
from market_state import MarketState
from binance_client import BinanceClient
from scanner import SignalScanner

# Configuration
INITIAL_SYMBOL = "BTCUSDT"
LUNARCRUSH_API_KEY = os.getenv("LUNARCRUSH_API_KEY", "lklp3a1wipds9h7t9yu7tibe2rmlohmn6tnjfm9ro")
LUNARCRUSH_SSE_URL = f"https://lunarcrush.ai/sse?key={LUNARCRUSH_API_KEY}"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Main")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "CryptoTerminal.ly API",
        "version": "0.8.0",
        "binance_ws": "connected",
        "endpoints": ["/ws", "/symbols", "/signals", "/news"]
    }

# Global Components (Shared)
_scanner_signals = []
_global_news = []
_news_cache = {"data": [], "ts": 0}
NEWS_CACHE_TTL = 300 

# Scanner instance (Shared)
# Dummy state for scanner just to satisfy its init
scanner_state = MarketState(symbol="SCANNER")
scanner = SignalScanner(state=scanner_state)

# Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_sessions = {} # websocket -> {state, client, tasks}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        state = MarketState(symbol=INITIAL_SYMBOL)
        state.scanner_signals = scanner.get_recent_signals(limit=30)
        state.global_news = _global_news
        
        client = BinanceClient(symbol=INITIAL_SYMBOL, state=state)
        await client.start()
        
        # Start private update loop
        broadcast_task = asyncio.create_task(self.session_broadcast(websocket, state))
        social_task = asyncio.create_task(self.session_poll_social(state))
        news_task = asyncio.create_task(self.session_poll_news(state))
        sse_task = asyncio.create_task(self.session_sse_listener(state))

        self.active_sessions[websocket] = {
            "state": state,
            "client": client,
            "tasks": [broadcast_task, social_task, news_task, sse_task]
        }

    async def disconnect(self, websocket: WebSocket):
        session = self.active_sessions.pop(websocket, None)
        if session:
            await session["client"].stop()
            for t in session["tasks"]:
                t.cancel()

    async def session_broadcast(self, websocket: WebSocket, state: MarketState):
        while True:
            try:
                # Merge global scanner signals before sending
                state.scanner_signals = scanner.get_recent_signals(limit=30)
                state.global_news = _global_news
                await websocket.send_json(state.to_dict())
                await asyncio.sleep(0.3)
            except:
                break

    async def session_poll_social(self, state: MarketState):
        while True:
            try:
                coin = state.symbol.replace("USDT", "")
                url = f"https://lunarcrush.com/api4/public/coins/{coin}/v1"
                headers = {"Authorization": f"Bearer {LUNARCRUSH_API_KEY}"}
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, headers=headers, timeout=10) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            coin_data = data.get("data", {})
                            state.galaxy_score = coin_data.get("galaxy_score", 0)
                            state.alt_rank = coin_data.get("alt_rank", 0)
                            state.social_sentiment = coin_data.get("sentiment", 50)
                            
                            s = state.social_sentiment
                            if s > 75: state.social_sentiment_label = "Extremely Bullish"
                            elif s > 60: state.social_sentiment_label = "Bullish"
                            elif s < 25: state.social_sentiment_label = "Extremely Bearish"
                            elif s < 40: state.social_sentiment_label = "Bearish"
                            else: state.social_sentiment_label = "Neutral"
            except: pass
            await asyncio.sleep(600)

    async def session_poll_news(self, state: MarketState):
        while True:
            try:
                coin = state.symbol.replace("USDT", "")
                url = f"https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories={coin}"
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=10) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            raw_news = data.get("Data", [])
                            state.asset_news = [{"title": n["title"], "url": n["url"], "source": n["source"]} for n in raw_news[:10]]
            except: pass
            await asyncio.sleep(600)

    async def session_sse_listener(self, state: MarketState):
        while True:
            try:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=None)) as session:
                    async with session.get(LUNARCRUSH_SSE_URL) as resp:
                        async for line in resp.content:
                            if not line: continue
                            decoded = line.decode('utf-8').strip()
                            if decoded.startswith("data:"):
                                raw_data = decoded[5:].strip()
                                try:
                                    data = json.loads(raw_data)
                                    msg = data.get("message") or data.get("text")
                                    if msg:
                                        coin = state.symbol.replace("USDT", "")
                                        if coin.lower() in msg.lower() or "market" in msg.lower():
                                            state.add_social_message(msg, data.get("sentiment", "neutral"))
                                except: pass
            except: pass
            await asyncio.sleep(5)

manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    await scanner.start()
    asyncio.create_task(global_news_loop())

async def global_news_loop():
    global _global_news
    while True:
        try:
            url = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        _global_news = [{"title": n["title"], "url": n["url"], "source": n["source"]} for n in data.get("Data", [])[:15]]
        except: pass
        await asyncio.sleep(900)

@app.get("/symbols")
async def get_symbols():
    # Temporary client just to fetch symbols
    temp_state = MarketState(symbol="BTCUSDT")
    client = BinanceClient(symbol="BTCUSDT", state=temp_state)
    async with aiohttp.ClientSession() as session:
        client.session = session
        return await client.get_available_symbols()

@app.get("/signals")
async def get_signals():
    return scanner.get_recent_signals()

@app.get("/news")
async def get_news():
    global _news_cache
    now = time.time()
    if now - _news_cache["ts"] < NEWS_CACHE_TTL and _news_cache["data"]:
        return _news_cache["data"]
    
    result = {"fearGreed": None, "trending": []}
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get("https://api.alternative.me/fng/?limit=7") as resp:
                raw = await resp.json()
                fng_data = raw.get("data", [])
                if fng_data:
                    result["fearGreed"] = {
                        "value": int(fng_data[0]["value"]),
                        "label": fng_data[0]["value_classification"],
                        "history": [{"value": int(d["value"]), "label": d["value_classification"], "timestamp": int(d["timestamp"])} for d in fng_data]
                    }
            async with session.get("https://api.coingecko.com/api/v3/search/trending") as resp:
                raw = await resp.json()
                for coin in (raw.get("coins", []))[:10]:
                    item = coin["item"]
                    result["trending"].append({
                        "symbol": item["symbol"],
                        "thumb": item["thumb"],
                        "change24h": round(item.get("data", {}).get("price_change_percentage_24h", {}).get("usd", 0), 2)
                    })
        except: pass
    _news_cache = {"data": result, "ts": now}
    return result

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message.get("action") == "subscribe":
                new_symbol = message.get("symbol")
                session = manager.active_sessions.get(websocket)
                if session and new_symbol:
                    await session["client"].refresh_symbol(new_symbol)
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS Error: {e}")
        await manager.disconnect(websocket)

@app.get("/health")
def health_check():
    return {"status": "ok", "users": len(manager.active_sessions)}
