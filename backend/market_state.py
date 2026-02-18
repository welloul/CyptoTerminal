from dataclasses import dataclass, field
from typing import List, Dict, Optional
import time

@dataclass
class MarketMetric:
    long_ratio: float = 0.0
    short_ratio: float = 0.0
    timestamp: int = 0

@dataclass
class LiquidationEvent:
    symbol: str
    side: str  # "BUY" or "SELL" (Market order side that caused liquidation, usually opposite of position)
    price: float
    quantity: float
    timestamp: int

@dataclass
class MarketState:
    symbol: str
    
    # Positioning
    global_ratio: MarketMetric = field(default_factory=MarketMetric)
    top_accounts_ratio: MarketMetric = field(default_factory=MarketMetric)
    top_positions_ratio: MarketMetric = field(default_factory=MarketMetric)
    
    # Momentum
    mark_price: float = 0.0
    index_price: float = 0.0
    spot_price: float = 0.0  # New: For Basis calculation
    open_interest: float = 0.0
    cvd: float = 0.0
    taker_buy_vol_5m: float = 0.0
    taker_sell_vol_5m: float = 0.0
    
    # History (for Charts)
    price_history: List[Dict] = field(default_factory=list) # [{"time": ts, "close": price}, ...]
    oi_history: List[Dict] = field(default_factory=list)    # [{"time": ts, "oi": value}, ...]
    cvd_history: List[Dict] = field(default_factory=list)   # [{"time": ts, "cvd": value}, ...]

    # Pain
    liquidations: List[LiquidationEvent] = field(default_factory=list)
    recent_trades: List[Dict] = field(default_factory=list)
    
    # Stress
    funding_rate: float = 0.0

    # LunarCrush / Social
    galaxy_score: float = 0.0
    alt_rank: int = 0
    social_sentiment: float = 0.0  # 0 to 100
    social_sentiment_label: str = "Neutral"
    social_pulse: List[Dict] = field(default_factory=list) # Recent SSE messages
    
    # News
    global_news: List[Dict] = field(default_factory=list)
    asset_news: List[Dict] = field(default_factory=list)
    scanner_signals: List[Dict] = field(default_factory=list) # Signals from scanner.py
    scanner_status: str = "Initializing..."

    # Efficiency Score (DPE)
    dpe_score: int = 0
    dpe_label: str = "Balanced"
    dpe_details: str = "Market is in equilibrium."

    @property
    def basis(self) -> float:
        return self.mark_price - self.spot_price if self.spot_price > 0 else 0.0
    
    @property
    def premium_index(self) -> float:
        # Simplified premium index: (Mark - Spot) / Spot
        return (self.mark_price - self.spot_price) / self.spot_price if self.spot_price > 0 else 0.0
        
    def update_price(self, price: float):
        self.mark_price = price
        
    def add_social_message(self, message: str, sentiment: str = "neutral"):
        self.social_pulse.append({
            "text": message,
            "sentiment": sentiment,
            "timestamp": int(time.time() * 1000)
        })
        if len(self.social_pulse) > 30:
            self.social_pulse.pop(0)

    def add_trade(self, price: float, quantity: float, is_buyer_maker: bool):
        # is_buyer_maker = True -> Seller was Taker (Sell Volume)
        # is_buyer_maker = False -> Buyer was Taker (Buy Volume)
        
        volume = price * quantity
        if is_buyer_maker:
            self.taker_sell_vol_5m += volume
            self.cvd -= volume
        else:
            self.taker_buy_vol_5m += volume
            self.cvd += volume
            
        # Keep trade for tape
        self.recent_trades.append({
            "price": price,
            "quantity": quantity,
            "side": "SELL" if is_buyer_maker else "BUY",
            "timestamp": int(time.time() * 1000)
        })
        if len(self.recent_trades) > 50:
            self.recent_trades.pop(0)

    def add_liquidation(self, event: LiquidationEvent):
        self.liquidations.append(event)
        if len(self.liquidations) > 50:
            self.liquidations.pop(0)

    def add_scanner_signal(self, signal: Dict):
        self.scanner_signals.append(signal)
        if len(self.scanner_signals) > 30:
            self.scanner_signals.pop(0)

    def update_cvd_history(self, timestamp: int):
        """Maintains a history of CVD values for charting."""
        # Only add a new point if it's a new minute to keep the chart clean
        if not self.cvd_history or (timestamp - self.cvd_history[-1]["time"]) >= 60000:
            self.cvd_history.append({"time": timestamp, "cvd": self.cvd})
            if len(self.cvd_history) > 100:
                self.cvd_history.pop(0)
        else:
            # Update the last point for real-time smoothness
            self.cvd_history[-1]["cvd"] = self.cvd

    def update_dpe(self):
        """Calculates Delta-to-Price Efficiency (DPE) Score (0-10)."""
        score = 0
        details = []

        if len(self.price_history) < 5 or len(self.cvd_history) < 5:
            return

        # 1. PRICE DISPARITY / DIVERGENCE (4 Points)
        curr_price = self.mark_price
        prev_price = self.price_history[-2]["close"] if len(self.price_history) > 1 else curr_price
        curr_cvd = self.cvd
        prev_cvd = self.cvd_history[-2]["cvd"] if len(self.cvd_history) > 1 else curr_cvd

        price_rising = curr_price > prev_price
        cvd_falling = curr_cvd < prev_cvd
        price_falling = curr_price < prev_price
        cvd_rising = curr_cvd > prev_cvd

        if price_rising and cvd_falling:
            score += 4
            details.append("Bearish Divergence (Price ^, CVD v)")
        elif price_falling and cvd_rising:
            score += 4
            details.append("Bullish Divergence (Price v, CVD ^)")

        # 2. ABSORPTION (3 Points)
        # Check if volume is high but price movement is tight
        vol_5m = self.taker_buy_vol_5m + self.taker_sell_vol_5m
        price_range = abs(curr_price - prev_price)
        
        # Simple thresholding for demonstration
        if vol_5m > 100000 and price_range < (curr_price * 0.0001):
            score += 3
            details.append("Whale Absorption Detected")

        # 3. EXHAUSTION (3 Points)
        # Using a simple moving average as a VWAP proxy for this state-only logic
        prices = [p["close"] for p in self.price_history[-20:]]
        avg_price = sum(prices) / len(prices)
        std_dev = (sum((x - avg_price) ** 2 for x in prices) / len(prices)) ** 0.5
        
        if std_dev > 0:
            z_score = (curr_price - avg_price) / std_dev
            if abs(z_score) > 2:
                score += 3
                details.append("Overextended (Mean Reversion Risk)")

        self.dpe_score = min(score, 10)
        self.dpe_details = " | ".join(details) if details else "Market is in equilibrium."
        
        if self.dpe_score >= 8: self.dpe_label = "CRITICAL"
        elif self.dpe_score >= 5: self.dpe_label = "UNSTABLE"
        else: self.dpe_label = "BALANCED"

    def to_dict(self):
        return {
            "symbol": self.symbol,
            "price": self.mark_price,
            "fundingRate": self.funding_rate,
            "basis": self.basis,
            "premiumIndex": self.premium_index,
            "ratios": {
                "global": {"long": self.global_ratio.long_ratio, "short": self.global_ratio.short_ratio},
                "topAccounts": {"long": self.top_accounts_ratio.long_ratio, "short": self.top_accounts_ratio.short_ratio},
                "topPositions": {"long": self.top_positions_ratio.long_ratio, "short": self.top_positions_ratio.short_ratio}
            },
            "momentum": {
                "cvd": self.cvd,
                "openInterest": self.open_interest,
                "takerBuy": self.taker_buy_vol_5m,
                "takerSell": self.taker_sell_vol_5m
            },
            "history": {
                "price": self.price_history,
                "oi": self.oi_history,
                "cvd": self.cvd_history
            },
            "liquidations": [
                {"price": l.price, "side": l.side, "qty": l.quantity, "ts": l.timestamp} 
                for l in self.liquidations
            ],
            "social": {
                "galaxyScore": self.galaxy_score,
                "altRank": self.alt_rank,
                "sentiment": self.social_sentiment,
                "sentimentLabel": self.social_sentiment_label,
                "pulse": self.social_pulse
            },
            "news": {
                "global": self.global_news,
                "asset": self.asset_news
            },
            "scannerSignals": self.scanner_signals,
            "scannerStatus": self.scanner_status,
            "dpe": {
                "score": self.dpe_score,
                "label": self.dpe_label,
                "details": self.dpe_details
            }
        }
