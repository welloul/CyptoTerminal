# High-Density Crypto Terminal (v0.8.0)

A high-frequency market intelligence platform that transforms raw blockchain and exchange data into human-readable interpretations. This project is built to expose market tension, social psychology, and institutional positioning in real-time.

---

## 🏗️ Technical Architecture

The system operates as a **Real-Time State Machine** using a multi-client aggregator pattern.

### 1. Backend (Python/FastAPI)
The backend functions as the **State Producer**. It is built with a non-blocking `asyncio` architecture to handle high-throughput WebSocket data and long-lived SSE connections simultaneously.

*   **State Aggregator**: The `MarketState` singleton maintains the current global market environment.
*   **Momentum Scanner**: A dedicated engine (`SignalScanner`) monitoring 200+ USDT futures pairs in real-time for RSI and volatility anomalies.
*   **Persistence**: Scanner signals are persisted to a SQLite database (`binance_public_scanner.db`) for session continuity.
*   **Polling Loop**: Background tasks refresh secondary data (REST results like Long/Short ratios, Fear & Greed, and LunarCrush metrics) every 5-10 minutes.
*   **Stream Listeners**:
    *   **Binance WebSocket**: Subscribes to `aggTrade`, `markPrice`, and `forceOrder` for the current symbol.
    *   **Binance Firehose**: A separate "all-ticker" socket for the scanner engine.
    *   **LunarCrush SSE**: A persistent listener for global social context messages, filtered locally for relevance.
*   **Broadcast Engine**: Sends the serialized `MarketState` to all frontend clients every 250ms (or immediately on high-volatility events).

### 2. Frontend (Angular 19)
The frontend is the **State Visualizer**. It is optimized for "Information Density" without sacrificing performance.

*   **Reactive Data Flow**: `MarketDataService` acts as the single entry point for the WebSocket. It exposes a `state$` Observable that all widgets subscribe to using the `async` pipe.
*   **Draggable Grid**: Uses `@angular/cdk/drag-drop` to allow users to build their own layouts.
*   **Matte Design System**: A custom CSS variable-based theme designed for professional environments (low eye-strain, high contrast for actionable alerts).

---

## 📂 Codebase Breakdown

### 🛰️ Backend
| File | Role | Responsibility |
|------|------|----------------|
| `main.py` | **Orchestrator** | FastAPI routes, WebSocket lifecycle, background polling tasks, and LunarCrush SSE management. |
| `market_state.py` | **The Brain** | Data normalization, math calculations (Leverage Magnets, Net Delta), and Plain-English interpretation logic. |
| `binance_client.py` | **Data Fetcher** | Reliable persistent connection to Binance Futures WebSockets and REST API for symbol discovery. |
| `scanner.py` | **The Hunter** | Real-time all-ticker anomaly detection (RSI/Volatility) with SQLite persistence. |

### 🖥️ Frontend
| File | Role | Responsibility |
|------|------|----------------|
| `market-data.service.ts` | **Data Hub** | Managing the WS connection and broadcasting the state signal across the app. |
| `terminal.component.ts` | **Grid Controller** | Managing widget reordering logic and `localStorage` layout persistence. |
| `tradingview-chart.component.ts` | **Visualizer** | Advanced TradingView Chart integration with Binance Futures Perpetual data. |
| `scanner-widget.component.ts` | **Signal Feed** | Real-time display of scanner detections with click-to-sync functionality. |
| `tooltip.directive.ts` | **UX Helper** | Angular directive to render tooltips into the body to prevent clipping in hidden-overflow panels. |
| `styles.scss` | **Visual Core** | Definition of the Matte color palette and global UI tokens. |

---

## 📊 Dashboard Widgets: Logic & Calculations

Each widget is designed to answer a specific market question.

### 1. Momentum Scanner (NEW)
*   **Momentum Scanner**: Real-time volatility detection across 200+ symbols using Binance Firehose.
*   **DPE Efficiency Score**: Institutional absorption and divergence engine with 10-point scale and "Market Story" alerts.
*   **CVD Fix**: Resolved broken trend chart by properly buffering per-minute historical data in the backend.
*   **SQLite Persistence**: Scanner signals are stored in `binance_public_scanner.db`.
*   **Top-Trader Intelligence**: Integrated long/short ratios for scanner signals.
*   **Dual-Tier News**: Scrolling tickers for Global Pulse + Asset-Specific Context with Click-to-Read links.
*   **Click-to-Sync**: Clicking scanner signals or trending assets instantly refocuses the entire terminal.
*   **Social Dashboard**: Real-time social mentions, Galaxy Score, and AltRank via LunarCrush V4.
*   **Customizable Layout**: Persistent draggable widget arrangement (V4) via Angular CDK.
*   **Market State**: Unified state broadcast (250ms) including technicals, sentiment, and news.

### 2. Real-Time Charting (TradingView)
*   **Data Source**: TradingView Advanced Real-Time Chart Widget.
*   **Configuration**: Set to pull `BINANCE:{SYMBOL}.P` (Binance Futures Perpetual) data for exact trade alignment.
*   **Insight**: High-fidelity technical analysis synced with terminal symbol selection.

### 3. Momentum & Aggression (CVD / OI)
*   **Data Source**: `aggTrade` (Volume) and `openInterest` REST.
*   **Calculation**:
    *   **Net Taker Delta**: `TakerBuyVolume - TakerSellVolume`.
    *   **Aggression Level**: Analyzes the rate of change in CVD relative to price movement.
*   **Insight**: Shows if buyers or sellers are *hitting the market* aggressively or just sitting on the books.

### 4. Pain Feed (Liquidation Magnets)
*   **Data Source**: Binance `forceOrder` stream.
*   **Calculation**:
    *   **Estimated Magnets**: Calculates the 100x/50x/25x/10x liquidation prices for the current price level.
    *   *Logic*: If price is $50,000, 100x short liquidations are clustered around $50,500.
*   **Insight**: Identifies "Liquidity Gravity" zones where price is likely to be pulled during a squeeze.

### 5. Market Stress (Cost of Capital)
*   **Data Source**: `fundingRate`, `markPrice`, `indexPrice`.
*   **Calculation**:
    *   **Basis**: `MarkPrice - IndexPrice`.
    *   **Stress Level**: Classified as `OVERHEATED` if Funding Rate > 0.05% or `PANIC` if < -0.05%.
*   **Insight**: Measures how much long/short traders are paying to keep their positions open.

### 6. Efficiency Score (DPE) (NEW)
*   **Logic**: A 10-point scale evaluating **Price Efficiency**.
*   **Divergence (4 pts)**: Detects when price makes higher highs while CVD makes lower highs (Bearish) or vice versa (Bullish).
*   **Absorption (3 pts)**: High aggressive volume coupled with narrow price action, indicating institutional limit orders absorbing market pressure.
*   **Exhaustion (3 pts)**: Uses VWAP Z-Score logic to detect "overextended" prices prone to mean reversion.
*   **Insight**: Explains the "Market Story" (e.g., "Whale Absorption" at 9/10).

### 7. Dual-Tier News Pulse
*   **Data Source**: LunarCrush V4 (REST + SSE) & Alternative.me (F&G).
*   **Logic**:
    *   **Social Context**: Filters the global SSE stream for keywords matching the current symbol.
    *   **Galaxy Score**: A proprietary 0-100 score weighing social engagement against market performance.
*   **Insight**: Adds the "Human Element" to technical data, detecting hype or fear before it hits the price chart.

---

## 🔧 Installation & Setup

1.  **Environment**: Create a Python venv in `/backend` and install `requirements.txt`.
2.  **API Keys**: Set your `LUNARCRUSH_API_KEY` as an environment variable or in `backend/main.py`.
3.  **Run Backend**: `uvicorn main:app --reload --port 8000`
4.  **Run Frontend**: `npm install` and `npm start` in `/frontend`.
5.  **Access**: Open `http://localhost:4200` (Default Angular port).

