# Handover Document

## Project: High-Density Crypto Terminal

### Overview
A real-time "Bloomberg-style" trading terminal visualizing market tension using Binance Futures data. Built with Angular 19 (Frontend) and FastAPI (Backend). Every metric includes plain-English interpretations and sentiment verdicts.

### Architecture
- **Frontend**: Angular 19 (Standalone Components), RxJS WebSocket, Angular CDK (Drag & Drop), ApexCharts, SCSS.
- **Backend**: Python 3.9+, FastAPI, aiohttp (Binance API, LunarCrush V4 REST + SSE, Fear & Greed, CoinGecko).
- **Data Sources**: Binance Futures, LunarCrush V4 (REST + SSE), alternative.me, CoinGecko.

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
| `frontend/src/styles.scss` | Global matte design system |
| `frontend/src/app/services/market-data.service.ts` | RxJS WebSocket service (now includes social data) |
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
| `/news` | GET | Fear & Greed + Trending coins |
| `/health` | GET | Server health check |

### Architecture
- **Frontend**: Angular 19 (Standalone), RxJS, Angular CDK, ApexCharts.
- **Backend**: FastAPI, aiohttp (Binance, LunarCrush, CryptoCompare, Fear & Greed, CoinGecko).
- **Data Streams**: Binance WS/REST, LunarCrush REST/SSE, CryptoCompare News REST.

### Current Status (v0.6.0)
- **Top News Intelligence**: Dual-row scrolling tickers (Global Pulse + Asset-Specific Context).
- **Interactive Exploration**: Click-to-Focus trending list for rapid asset switching and discovery.
- **Readability**: Marquee animation slowed to 240s with hover-pause behavior.
- **Social Dashboard**: Real-time social mentions, Galaxy Score, and AltRank via LunarCrush.
- **Customizable Layout**: Persistent draggable widget arrangement via Angular CDK.
- **Market State**: Unified state broadcast including technicals, sentiment, and dual-tier news.
