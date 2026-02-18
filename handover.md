> [!IMPORTANT]
> All project changes MUST be maintained in `handover.md` and `changelog.md`.

# Handover Document

## Project: High-Density Crypto Terminal

### Overview
A real-time "Bloomberg-style" trading terminal visualizing market tension using Binance Futures data. Built with Angular 19 (Frontend) and FastAPI (Backend). Every metric includes plain-English interpretations and sentiment verdicts.

### Architecture
- **Frontend**: Angular 19 (Standalone Components), RxJS WebSocket, Angular CDK (Drag & Drop), ApexCharts, SCSS.
- **Backend**: Python 3.9+, FastAPI, aiohttp (Binance API, LunarCrush V4 REST + SSE, CryptoCompare, Fear & Greed, CoinGecko).
- **Data Sources**: Binance Futures, LunarCrush V4 (REST + SSE), CryptoCompare, alternative.me, CoinGecko.

### How to Run
1. **LunarCrush API Key**: Ensure `LUNARCRUSH_API_KEY` is set in `backend/main.py`.
2. **Backend**: `cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000`
3. **Frontend**: `cd frontend && npm start -- --port 4200`
4. Open `http://localhost:4200`

### Key Files
| File | Purpose |
|------|---------|
| `backend/market_state.py` | Central data model (MarketState) + social buffers |
| `backend/binance_client.py` | Binance WebSocket + REST client |
| `backend/main.py` | FastAPI server + LunarCrush REST & SSE listeners |
| `backend/scanner.py` | All-ticker momentum scanner + SQLite persistence |
| `frontend/src/styles.scss` | Global matte design system |
| `frontend/src/app/services/market-data.service.ts` | RxJS WebSocket service (now includes social data) |
| `frontend/src/app/components/scanner-widget/` | Momentum Scanner signal feed |
| `frontend/src/app/components/terminal/` | Draggable grid layout |
| `frontend/src/app/components/news-feed/` | Combined Sentiment & Social Dashboard |

### Design System
- **Color Palette**: Matte (Emerald, Rose, Violet, Sky, Amber)
- **Tooltips**: Angular `TooltipDirective` (body-appended)
- **Customization**: Draggable widgets with `localStorage` persistence.

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ws` | WebSocket | Real-time market state + Social Pulse stream |
| `/symbols` | GET | USDT futures pairs list |
| `/signals` | GET | Recent scanner detection history |
| `/news` | GET | Fear & Greed + Trending coins |
| `/health` | GET | Server health check |

### Current Status (v0.8.0)
- **Momentum Scanner**: Real-time volatility detection across 200+ symbols using Binance Firehose.
- **SQLite Persistence**: Scanner signals are stored in `binance_public_scanner.db` for session continuity.
- **Top-Trader Intelligence**: Integrated long/short ratios for scanner signals (rate-limited).
- **Dual-Tier News**: Scrolling tickers for Global Pulse + Asset-Specific Context with Click-to-Read links.
- **Click-to-Sync**: Clicking scanner signals or trending assets instantly refocuses the entire terminal.
- **Social Dashboard**: Real-time social mentions, Galaxy Score, and AltRank via LunarCrush V4.
- **Customizable Layout**: Persistent draggable widget arrangement (V4) via Angular CDK.
- **Market State**: Unified state broadcast (250ms) including technicals, sentiment, and news.
