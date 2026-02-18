from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import asyncio
import json
import logging
import time
import aiohttp
from market_state import MarketState
from binance_client import BinanceClient
from scanner import SignalScanner

# Configuration
INITIAL_SYMBOL = "BTCUSDT"
LUNARCRUSH_API_KEY = "lklp3a1wipds9h7t9yu7tibe2rmlohmn6tnjfm9ro"
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

# Global State
market_state = MarketState(symbol=INITIAL_SYMBOL)
binance_client = BinanceClient(symbol=INITIAL_SYMBOL, state=market_state)
scanner = SignalScanner(state=market_state)

# News cache
_news_cache = {"data": [], "ts": 0}
NEWS_CACHE_TTL = 300  # 5 minutes

# Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error brodcasting: {e}")
                self.disconnect(connection)

manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    await binance_client.start()
    asyncio.create_task(broadcast_state())
    asyncio.create_task(lunarcrush_poll_task())
    asyncio.create_task(lunarcrush_sse_listener())
    asyncio.create_task(global_news_poll_task())
    asyncio.create_task(asset_news_poll_task())
    
    # Load initial scanner signals
    market_state.scanner_signals = scanner.get_recent_signals(limit=30)
    await scanner.start()

@app.on_event("shutdown")
async def shutdown_event():
    await binance_client.stop()
    await scanner.stop()

@app.get("/symbols")
async def get_symbols():
    return await binance_client.get_available_symbols()

@app.get("/signals")
async def get_signals():
    return scanner.get_recent_signals()

@app.get("/news")
async def get_news():
    """Fetch Fear & Greed Index + CoinGecko trending coins (free, no key needed)."""
    global _news_cache
    now = time.time()
    if now - _news_cache["ts"] < NEWS_CACHE_TTL and _news_cache["data"]:
        return _news_cache["data"]

    result = {"fearGreed": None, "trending": []}
    try:
        async with aiohttp.ClientSession() as session:
            # Fear & Greed Index
            try:
                async with session.get(
                    "https://api.alternative.me/fng/?limit=7",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        raw = await resp.json()
                        fng_data = raw.get("data", [])
                        if fng_data:
                            current = fng_data[0]
                            result["fearGreed"] = {
                                "value": int(current["value"]),
                                "label": current["value_classification"],
                                "history": [
                                    {"value": int(d["value"]), "label": d["value_classification"],
                                     "timestamp": int(d["timestamp"])}
                                    for d in fng_data
                                ]
                            }
            except Exception as e:
                logger.error(f"Fear & Greed error: {e}")

            # CoinGecko Trending
            try:
                async with session.get(
                    "https://api.coingecko.com/api/v3/search/trending",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        raw = await resp.json()
                        for coin in (raw.get("coins", []))[:10]:
                            item = coin.get("item", {})
                            price_data = item.get("data", {})
                            pct_24h = price_data.get("price_change_percentage_24h", {})
                            change_usd = pct_24h.get("usd", 0) if isinstance(pct_24h, dict) else 0
                            result["trending"].append({
                                "name": item.get("name", ""),
                                "symbol": item.get("symbol", ""),
                                "rank": item.get("market_cap_rank"),
                                "price": price_data.get("price", 0),
                                "change24h": round(change_usd, 2),
                                "thumb": item.get("thumb", ""),
                            })
            except Exception as e:
                logger.error(f"CoinGecko trending error: {e}")

        _news_cache = {"data": result, "ts": now}
        return result
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        return result

async def broadcast_state():
    while True:
        await asyncio.sleep(0.25)
        if manager.active_connections:
            data = market_state.to_dict()
            await manager.broadcast(data)

async def lunarcrush_poll_task():
    """Periodically fetch Galaxy Score and AltRank for the current symbol."""
    while True:
        try:
            # Strip USDT to get base symbol
            coin = market_state.symbol.replace("USDT", "")
            url = f"https://lunarcrush.com/api4/public/coins/{coin}/v1"
            headers = {"Authorization": f"Bearer {LUNARCRUSH_API_KEY}"}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=10) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        coin_data = data.get("data", {})
                        market_state.galaxy_score = coin_data.get("galaxy_score", 0)
                        market_state.alt_rank = coin_data.get("alt_rank", 0)
                        market_state.social_sentiment = coin_data.get("sentiment", 50)
                        
                        s = market_state.social_sentiment
                        if s > 75: market_state.social_sentiment_label = "Extremely Bullish"
                        elif s > 60: market_state.social_sentiment_label = "Bullish"
                        elif s < 25: market_state.social_sentiment_label = "Extremely Bearish"
                        elif s < 40: market_state.social_sentiment_label = "Bearish"
                        else: market_state.social_sentiment_label = "Neutral"
                        
                        logger.info(f"Updated LunarCrush data for {coin}: GS={market_state.galaxy_score}")
                    else:
                        logger.warning(f"LunarCrush REST error: {resp.status}")
        except Exception as e:
            logger.error(f"Error in lunarcrush_poll: {e}")
            
        await asyncio.sleep(600)

async def global_news_poll_task():
    """Periodic task for global news."""
    while True:
        await fetch_global_news()
        await asyncio.sleep(900)

async def fetch_global_news():
    try:
        url = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    raw_news = data.get("Data", [])
                    market_state.global_news = [
                        {"title": n.get("title"), "url": n.get("url"), "source": n.get("source")}
                        for n in raw_news[:15]
                    ]
                    logger.info(f"Updated Global News: {len(market_state.global_news)} items")
    except Exception as e:
        logger.error(f"Error fetching global news: {e}")

async def asset_news_poll_task():
    """Periodic task for asset news."""
    while True:
        await fetch_asset_news()
        await asyncio.sleep(600)

async def fetch_asset_news():
    try:
        coin = market_state.symbol.replace("USDT", "")
        # CryptoCompare uses comma-separated categories. 
        # Adding 'market' as fallback or just the coin symbol.
        url = f"https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories={coin}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    raw_news = data.get("Data", [])
                    market_state.asset_news = [
                        {"title": n.get("title"), "url": n.get("url"), "source": n.get("source")}
                        for n in raw_news[:10]
                    ]
                    # If empty, try fetching with just the coin name as a keyword vs category
                    if not market_state.asset_news:
                        logger.warning(f"No specific news for {coin}, keeping empty or using global fallback?")
                    logger.info(f"Updated Asset News for {coin}: {len(market_state.asset_news)} items")
    except Exception as e:
        logger.error(f"Error fetching asset news: {e}")

async def lunarcrush_sse_listener():
    """Listen to real-time social context from LunarCrush SSE."""
    while True:
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=None, sock_read=300)) as session:
                async with session.get(LUNARCRUSH_SSE_URL) as resp:
                    if resp.status != 200:
                        logger.error(f"LunarCrush SSE error: {resp.status}")
                        await asyncio.sleep(10)
                        continue
                        
                    async for line in resp.content:
                        if not line: continue
                        decoded = line.decode('utf-8').strip()
                        if decoded.startswith("data:"):
                            raw_data = decoded[5:].strip()
                            try:
                                data = json.loads(raw_data)
                                if isinstance(data, dict):
                                    msg = data.get("message") or data.get("text")
                                    if msg:
                                        coin = market_state.symbol.replace("USDT", "")
                                        if coin.lower() in msg.lower() or "market" in msg.lower():
                                            market_state.add_social_message(msg, data.get("sentiment", "neutral"))
                            except json.JSONDecodeError:
                                pass
        except Exception as e:
            logger.debug(f"SSE listener error (expected if connection closed): {e}")
            await asyncio.sleep(5)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("action") == "subscribe":
                    new_symbol = message.get("symbol")
                    if new_symbol and new_symbol != market_state.symbol:
                        await binance_client.refresh_symbol(new_symbol)
                        # Immediate refresh for new symbol
                        asyncio.create_task(lunarcrush_poll_task())
                        asyncio.create_task(fetch_asset_news()) # CALL FUNCTION, NOT TASK LOOP
            except json.JSONDecodeError:
                pass
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/health")
def health_check():
    return {"status": "ok", "symbol": market_state.symbol}
