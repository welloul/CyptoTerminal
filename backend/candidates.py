import asyncio
import sqlite3
import time
import pandas as pd
import pandas_ta as ta
from binance import AsyncClient, BinanceSocketManager
from datetime import datetime

# --- CONFIG ---
DB_NAME = "binance_public_scanner.db"
TOP_TRADER_LIMITER = asyncio.Semaphore(2)  # Max 2 slots
COOLDOWN_SECONDS = 120  # 2 Minutes
last_alert_time = {} 

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS signals
                 (timestamp TEXT, symbol TEXT, price REAL, rsi REAL, delta REAL, top_ratio REAL)''')
    conn.commit()
    conn.close()

async def get_top_trader_sentiment_limited(client, symbol):
    """Ensures no more than 2 requests per minute across the whole script."""
    async with TOP_TRADER_LIMITER:
        try:
            # Weight for this is usually 1, but without key we are very careful
            data = await client.futures_top_longshort_position_ratio(symbol=symbol, period='15m', limit=1)
            ratio = float(data[0]['longShortRatio']) if data else 1.0
            
            # Lock the slot for 30 seconds to maintain 2-per-minute pace
            await asyncio.sleep(30) 
            return ratio
        except Exception as e:
            print(f"Rate limit hit or API error on {symbol}: {e}")
            return 1.0

async def process_scanner():
    client = await AsyncClient.create() 
    bm = BinanceSocketManager(client)
    init_db()

    # Firehose: Get every ticker update without API keys
    ts = bm.all_ticker_futures_socket()
    print(f"Scanner Active. Alerts cooldown: 2m. Top-Trader limit: 2/min.")

    async with ts as tscm:
        while True:
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
                    if symbol in last_alert_time and (now - last_alert_time[symbol]) < COOLDOWN_SECONDS:
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
                            sentiment = await get_top_trader_sentiment_limited(client, symbol)
                            
                            last_alert_time[symbol] = now
                            save_to_sqlite(symbol, curr_price, curr_rsi, cvd, sentiment)
                            
                            side = "SHORT" if is_short_signal else "LONG"
                            print(f"[{datetime.now().strftime('%H:%M:%S')}] {side} SIGNAL: {symbol} | RSI: {curr_rsi:.2f} | CVD: {cvd:.2f}")

def save_to_sqlite(symbol, price, rsi, delta, ratio):
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute("INSERT INTO signals VALUES (?,?,?,?,?,?)", 
                  (datetime.now().isoformat(), symbol, price, rsi, delta, ratio))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(process_scanner())
    except KeyboardInterrupt:
        print("\nScanner stopped by user.")