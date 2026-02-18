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
            "scannerStatus": self.scanner_status
        }
