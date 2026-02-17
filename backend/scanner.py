import asyncio
import sqlite3
import time
import pandas as pd
import pandas_ta as ta
import logging
from datetime import datetime
from binance import AsyncClient, BinanceSocketManager
from market_state import MarketState

logger = logging.getLogger("SignalScanner")

DB_NAME = "binance_public_scanner.db"

class SignalScanner:
    def __init__(self, state: MarketState):
        self.state = state
        self.last_alert_time = {}
        self.cooldown_seconds = 120
        self.top_trader_limiter = asyncio.Semaphore(2)
        self._running = False
        self.init_db()

    def init_db(self):
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS signals
                     (timestamp TEXT, symbol TEXT, price REAL, rsi REAL, delta REAL, top_ratio REAL)''')
        conn.commit()
        conn.close()

    async def get_top_trader_sentiment_limited(self, client, symbol):
        """Ensures no more than 2 requests per minute across the whole script."""
        async with self.top_trader_limiter:
            try:
                data = await client.futures_top_longshort_position_ratio(symbol=symbol, period='15m', limit=1)
                ratio = float(data[0]['longShortRatio']) if data else 1.0
                # Lock the slot for 30 seconds to maintain 2-per-minute pace
                await asyncio.sleep(30) 
                return ratio
            except Exception as e:
                logger.error(f"Rate limit hit or API error on {symbol}: {e}")
                return 1.0

    async def start(self):
        self._running = True
        logger.info("Scanner started...")
        asyncio.create_task(self.run())

    async def stop(self):
        self._running = False

    async def run(self):
        client = await AsyncClient.create() 
        bm = BinanceSocketManager(client)
        ts = bm.all_ticker_futures_socket()
        
        async with ts as tscm:
            while self._running:
                try:
                    msg = await tscm.recv()
                    if not msg: continue
                    
                    for item in msg:
                        symbol = item['s']
                        if not symbol.endswith('USDT'): continue

                        curr_price = float(item['c'])
                        open_price = float(item['o'])
                        price_change = ((curr_price - open_price) / open_price) * 100

                        # Check if price move is > 3%
                        if abs(price_change) > 3:
                            now = time.time()
                            
                            # 2-Minute Cooldown logic
                            if symbol in self.last_alert_time and (now - self.last_alert_time[symbol]) < self.cooldown_seconds:
                                continue

                            # Fetch klines for Indicators and CVD
                            klines = await client.futures_klines(symbol=symbol, interval='1m', limit=50)
                            df = pd.DataFrame(klines, columns=['time','o','h','l','c','v','ct','qv','n','tb','tq','i']).astype(float)
                            
                            # RSI & Volume Checks
                            df['rsi'] = ta.rsi(df['c'], length=14)
                            curr_rsi = df['rsi'].iloc[-1]
                            vol_decreasing = df['v'].iloc[-1] < df['v'].iloc[-2] < df['v'].iloc[-3]

                            if vol_decreasing:
                                # Conditions for Long (Oversold) or Short (Overbought)
                                is_short_signal = price_change > 0 and curr_rsi > 70
                                is_long_signal = price_change < 0 and curr_rsi < 30

                                if is_short_signal or is_long_signal:
                                    # CVD Delta calculation: Taker Buy - Taker Sell
                                    df['delta'] = df['tb'] - (df['v'] - df['tb'])
                                    cvd = df['delta'].sum()

                                    # Sentiment (Rate Limited to 2/min)
                                    sentiment = await self.get_top_trader_sentiment_limited(client, symbol)
                                    
                                    self.last_alert_time[symbol] = now
                                    signal = {
                                        "timestamp": datetime.now().isoformat(),
                                        "symbol": symbol,
                                        "price": curr_price,
                                        "rsi": float(curr_rsi),
                                        "delta": float(cvd),
                                        "top_ratio": sentiment
                                    }
                                    
                                    self.save_to_sqlite(signal)
                                    self.state.add_scanner_signal(signal)
                                    
                                    side = "SHORT" if is_short_signal else "LONG"
                                    logger.info(f"detected {side} SIGNAL: {symbol} | RSI: {curr_rsi:.2f}")
                except Exception as e:
                    logger.error(f"Scanner run error: {e}")
                    await asyncio.sleep(5)
        
        await client.close_connection()

    def save_to_sqlite(self, signal):
        try:
            conn = sqlite3.connect(DB_NAME)
            c = conn.cursor()
            c.execute("INSERT INTO signals VALUES (?,?,?,?,?,?)", 
                      (signal["timestamp"], signal["symbol"], signal["price"], signal["rsi"], signal["delta"], signal["top_ratio"]))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"DB Error: {e}")

    def get_recent_signals(self, limit=20):
        try:
            conn = sqlite3.connect(DB_NAME)
            c = conn.cursor()
            c.execute("SELECT * FROM signals ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = c.fetchall()
            conn.close()
            return [
                {
                    "timestamp": r[0],
                    "symbol": r[1],
                    "price": r[2],
                    "rsi": r[3],
                    "delta": r[4],
                    "top_ratio": r[5]
                } for r in rows
            ]
        except Exception as e:
            logger.error(f"DB Fetch Error: {e}")
            return []
