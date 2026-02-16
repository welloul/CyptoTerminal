import asyncio
import json
import logging
import aiohttp
from typing import Callable, List, Optional
from market_state import MarketState, MarketMetric, LiquidationEvent

logger = logging.getLogger("BinanceClient")

class BinanceClient:
    BASE_URL = "https://fapi.binance.com"
    SPOT_URL = "https://api.binance.com"
    WS_URL = "wss://fstream.binance.com/ws"
    
    def __init__(self, symbol: str, state: MarketState):
        self.symbol = symbol.upper()
        self.state = state
        self.session: Optional[aiohttp.ClientSession] = None
        self.ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self._running = False
        self._tasks: List[asyncio.Task] = []

    async def start(self):
        if self._running:
            return
        
        self._running = True
        self.session = aiohttp.ClientSession()
        
        # Initial Fetch
        await self._fetch_initial_history()
        
        # Start Tasks
        self._tasks.append(asyncio.create_task(self._poll_rest_data()))
        self._tasks.append(asyncio.create_task(self._poll_spot_price()))
        self._tasks.append(asyncio.create_task(self._connect_websocket()))

    async def stop(self):
        self._running = False
        for task in self._tasks:
            task.cancel()
        self._tasks = []
        
        if self.ws:
            await self.ws.close()
            self.ws = None
            
        if self.session:
            await self.session.close()
            self.session = None

    async def refresh_symbol(self, new_symbol: str):
        logger.info(f"Switching symbol FROM {self.symbol} TO {new_symbol}")
        await self.stop()
        self.symbol = new_symbol.upper()
        self.state.symbol = self.symbol
        # Reset State Data (optional but cleaner)
        self.state.liquidations = []
        self.state.recent_trades = []
        self.state.cvd = 0
        await self.start()

    async def _fetch_initial_history(self):
        try:
            # Fetch Klines (Price History) - 1m interval, last 60 candles
            url = f"{self.BASE_URL}/fapi/v1/klines"
            params = {"symbol": self.symbol, "interval": "1m", "limit": 60}
            async with self.session.get(url, params=params) as resp:
                data = await resp.json()
                # [time, open, high, low, close, volume, ...]
                self.state.price_history = [
                    {"time": d[0], "close": float(d[4])} for d in data
                ]
                # Initialize CVD baseline from last candles (approx)
                # This is a simplification; accurate CVD requires tick history
        except Exception as e:
            logger.error(f"Error fetching history: {e}")

    async def _connect_websocket(self):
        streams = [
            f"{self.symbol.lower()}@aggTrade",
            f"{self.symbol.lower()}@forceOrder",
            f"{self.symbol.lower()}@markPrice"
        ]
        stream_url = f"{self.WS_URL}/{'/'.join(streams)}"
        
        while self._running:
            try:
                # Ensure session exists
                if not self.session or self.session.closed:
                     self.session = aiohttp.ClientSession()

                async with self.session.ws_connect(stream_url) as ws:
                    self.ws = ws
                    logger.info(f"Connected to Binance WebSocket for {self.symbol}")
                    async for msg in ws:
                        if not self._running: break
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = json.loads(msg.data)
                            self._handle_stream_message(data)
                        elif msg.type == aiohttp.WSMsgType.ERROR:
                            break
            except Exception as e:
                if self._running:
                    logger.error(f"WebSocket error: {e}")
                    await asyncio.sleep(5)

    def _handle_stream_message(self, data: dict):
        event_type = data.get("e")
        if event_type == "aggTrade":
            price = float(data["p"])
            qty = float(data["q"])
            is_buyer_maker = data["m"]
            self.state.add_trade(price, qty, is_buyer_maker)
            
            # Real-time chart update (throttle this in frontend or backend if needed)
            ts = data["E"]
            # Append to CVD History if new minute or update last
            # For simplicity, we just push to volatile state, frontend handles charting points
            
        elif event_type == "forceOrder":
            order = data["o"]
            liq_event = LiquidationEvent(
                symbol=self.symbol,
                side=order["S"], 
                price=float(order["ap"]),
                quantity=float(order["q"]),
                timestamp=data["E"]
            )
            self.state.add_liquidation(liq_event)
            
        elif event_type == "markPriceUpdate":
            self.state.update_price(float(data["p"]))
            self.state.funding_rate = float(data["r"])
            self.state.index_price = float(data["P"])

    async def _poll_spot_price(self):
        while self._running:
            try:
                url = f"{self.SPOT_URL}/api/v3/ticker/price"
                params = {"symbol": self.symbol} 
                # Note: Some futures symbols might not map 1:1 to spot (e.g. 1000PEPE vs PEPE)
                # We assume 1:1 for main pairs (BTC, ETH, SOL)
                async with self.session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.state.spot_price = float(data["price"])
                await asyncio.sleep(5) 
            except Exception:
                # Silently fail if spot pair doesn't exist or error
                pass

    async def _poll_rest_data(self):
        while self._running:
            try:
                await self._fetch_open_interest()
                await self._fetch_long_short_ratio()
                await asyncio.sleep(300) 
            except Exception as e:
                logger.error(f"REST polling error: {e}")
                await asyncio.sleep(60)

    async def _fetch_open_interest(self):
        url = f"{self.BASE_URL}/fapi/v1/openInterest"
        async with self.session.get(url, params={"symbol": self.symbol}) as resp:
            data = await resp.json()
            self.state.open_interest = float(data["openInterest"])
            # Add to OI history (timestamp, value)
            self.state.oi_history.append({
                "time": int(data["time"]),
                "oi": float(data["openInterest"])
            })
            if len(self.state.oi_history) > 60:
                self.state.oi_history.pop(0)

    async def _fetch_long_short_ratio(self):
        # Global Long/Short
        url = f"{self.BASE_URL}/futures/data/globalLongShortAccountRatio"
        params = {"symbol": self.symbol, "period": "5m", "limit": 1}
        async with self.session.get(url, params=params) as resp:
            data = await resp.json()
            if data:
                latest = data[0]
                self.state.global_ratio.long_ratio = float(latest["longAccount"])
                self.state.global_ratio.short_ratio = float(latest["shortAccount"])
        
        # Top Trader Account Ratio
        url = f"{self.BASE_URL}/futures/data/topLongShortAccountRatio"
        async with self.session.get(url, params=params) as resp:
            data = await resp.json()
            if data:
                latest = data[0]
                self.state.top_accounts_ratio.long_ratio = float(latest["longAccount"])
                self.state.top_accounts_ratio.short_ratio = float(latest["shortAccount"])

        # Top Trader Position Ratio
        url = f"{self.BASE_URL}/futures/data/topLongShortPositionRatio"
        async with self.session.get(url, params=params) as resp:
            data = await resp.json()
            if data:
                latest = data[0]
                self.state.top_positions_ratio.long_ratio = float(latest["longAccount"])
                self.state.top_positions_ratio.short_ratio = float(latest["shortAccount"])

    async def get_available_symbols(self) -> List[dict]:
        """
        Fetches all trading pairs and their 24h ticker data.
        Returns sorted list by Volume (descending).
        """
        if not self.session:
             self.session = aiohttp.ClientSession()
             
        try:
            url = f"{self.BASE_URL}/fapi/v1/ticker/24hr"
            async with self.session.get(url) as resp:
                data = await resp.json()
                # Filter for USDT pairs only for simplicity
                symbols = [
                    {
                        "symbol": item["symbol"],
                        "price": float(item["lastPrice"]),
                        "change": float(item["priceChangePercent"]),
                        "volume": float(item["quoteVolume"]) # Quote volume is in USDT
                    }
                    for item in data if item["symbol"].endswith("USDT")
                ]
                # Sort by Volume desc
                symbols.sort(key=lambda x: x["volume"], reverse=True)
                return symbols
        except Exception as e:
            logger.error(f"Error fetching symbols: {e}")
            return []
