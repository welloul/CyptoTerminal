# Changelog

All notable changes to this project will be documented in this file.

## [0.8.0] - 2026-02-17
 
 ### Added
 - **Momentum Scanner Widget**: New dashboard widget monitoring 200+ USDT futures pairs via Firehose.
 - **Backend Signal Engine**: Integrated `SignalScanner` detecting >2.5% price moves and RSI extremes.
 - **Click-to-Sync**: Seamless symbol switching by clicking scanner rows or trending pulse items.
 - **SQLite Persistence**: Scanner signal history is preserved in `binance_public_scanner.db`.
 - **Top-Trader Sentiment**: Rate-limited (2/min) integration of positioning ratios for detected signals.
 
 ### Changed
 - **Broadcast Frequency**: Increased WebSocket state broadcast speed to 250ms for improved responsiveness.
 - **Layout Persistence**: Upgraded to `terminal_layout_v4` to accommodate the 6-widget grid.

## [0.7.0] - 2026-02-16

### Added
- **TradingView Integration**: Added a real-time Advanced Chart widget configured for Binance Futures Perpetual data.
- **Clickable Headlines**: Newsheadlines in both tickers are now active links that open the source story in new tabs.
- **5-Widget Grid**: Expanded the terminal layout to support 5 concurrent dashlets with draggable reordering.

## [0.6.0] - 2026-02-16

### Added
- **Dual-Tier News Tickers**: High-visibility global and asset-specific news feeds at the top of the terminal.
- **Top News Ticker**: Scrolling "GLOBAL PULSE" row for general crypto market headlines from CryptoCompare.
- **Contextual News Ticker**: Scrolling "ASSET NEWS" row that dynamically filters headlines for the selected symbol.
- **Interactive Trending**: Click-to-Focus functionality in the trending list for instant symbol switching.
- **Hover-Pause**: News tickers now pause on hover for better readability.

### Changed
- **Ticker UX**: Slowed down animation speed by 50% relative to initial implementation for easier reading.
- **Backend Architecture**: Optimized news polling to prevent loop duplication on symbol selection.

## [0.5.0] - 2026-02-16

### Added
- **LunarCrush Integration**: Galaxy Score and AltRank metrics for current assets.
- **Social Pulse**: Real-time social context stream filtered by symbol, using LunarCrush V4 SSE backend.
- **Movable Widgets**: Implemented `@angular/cdk` drag-and-drop handles for all terminal dashboard widgets.
- **Layout Persistence**: Dashboard arrangement is automatically saved to `localStorage` and restored on page load.
- **Sentiment & Social Dashboard**: Rebuilt the sentiment panel to show both global F&G and asset-specific social context.

### Changed
- **Backend Architecture**: Added persistent async tasks for LunarCrush REST polling and SSE listening.
- **Terminal Layout**: Widgets now wrapped in draggable containers with hover-state handles.

## [0.4.0] - 2026-02-16

### Added
- **Sentiment Panel**: New 4th column with Fear & Greed Index (alternative.me) and CoinGecko Trending Coins.
- **Fear & Greed Gauge**: Red-amber-green gradient (0–100), 7-day sparkline, plain-English interpretation.
- **Trending Coins**: Top 10 most-searched coins with 24h % change from CoinGecko.
- **Backend `/news` endpoint**: Fetches Fear & Greed + CoinGecko trending data with 5-minute caching.
- **Verdict Gauges**: BULLISH/BEARISH/NEUTRAL (Positioning), BUYING/SELLING PRESSURE (Momentum), OVERHEATED/NORMAL (Stress).
- **Plain-English Interpretations**: Every metric now has human-readable text (e.g. "Retail heavily long — squeeze risk").
- **Divergence Alert**: Warning when whales oppose retail positioning.
- **Estimated Liquidation Magnets**: Calculated liq zones for 10x/25x/50x/100x leverage.
- **TooltipDirective**: Body-appended tooltips to prevent clipping by overflow containers.

### Changed
- **Terminal Layout**: Expanded from 2-column to 4-column responsive grid (breakpoints at 1200px, 700px).
- **PositioningMatrix**: Added weighted bias gauge (50% whale, 30% smart money, 20% contrarian retail).
- **MomentumAggression**: Added NET taker delta bar with "Buyers/Sellers dominating" label.
- **MarketStress**: Added stress-level badge with funding/basis interpretations.
- **Tooltip System**: Migrated from CSS `data-tip` pseudo-elements to Angular `TooltipDirective`.

## [0.3.0] - 2026-02-16

### Changed
- **Matte Color System**: Replaced neon/fluorescent colors with professional matte palette (Emerald, Rose, Violet, Sky, Amber) using CSS custom properties.
- **Typography**: Switched from Roboto Mono to JetBrains Mono for data display.
- **SymbolSelector**: Now fetches ALL Binance Futures pairs via `/symbols` endpoint. Supports sorting by volume, gainers, and losers. Shows % change in dropdown.
- **MarketStress**: Funding Rate now displayed as a "Digital Badge" with hot/cold states. All metrics have hover explainers.
- **PainFeed**: Redesigned as a scrolling tape with dollar-value display, large-liquidation highlighting, stats counters, and a simplified liquidation cluster heatmap.
- **MomentumAggression**: Added NET taker delta bar. All metrics have hover explainers.
- **PositioningMatrix**: Added Whale/Retail divergence alert. Gauge redesigned as gradient track with needle.

### Added
- **Tooltip System**: Pure CSS hover explainers on every metric label. Uses `data-tip` attribute and `tip-host` class.
- **Backend `/symbols` endpoint**: Returns all USDT futures pairs sorted by 24h quote volume.
- **Liquidation Clusters**: Approximate heatmap showing price zones with concentrated liquidations.
- **Divergence Alert**: Automatic warning when whale positioning opposes retail sentiment.

## [0.2.0] - 2026-02-16

### Added
- Symbol Selection dropdown (BTC, ETH, SOL, etc.)
- Historical charts for CVD using ApexCharts
- Basis and Premium Index metrics
- Whale Positioning Gauge

## [0.1.0] - 2026-02-16

### Added
- Initial project structure (Angular Frontend + Python Backend)
- `handover.md` and `changelog.md`
- Real-time WebSocket data from Binance Futures API
- Positioning Matrix, Momentum, Pain Feed, Market Stress components
