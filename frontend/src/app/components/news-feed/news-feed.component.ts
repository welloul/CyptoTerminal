import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { MarketDataService, MarketState } from '../../services/market-data.service';
import { TooltipDirective } from '../../directives/tooltip.directive';

interface TrendingCoin {
  name: string;
  symbol: string;
  rank: number;
  price: number;
  change24h: number;
  thumb: string;
}

interface FearGreed {
  value: number;
  label: string;
  history: { value: number; label: string; timestamp: number }[];
}

interface SentimentData {
  fearGreed: FearGreed | null;
  trending: TrendingCoin[];
}

@Component({
  selector: 'app-news-feed',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  template: `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">SENTIMENT & SOCIAL</span>
        <span class="panel-subtitle">Global + Asset Specific</span>
      </div>

      <div class="sentiment-grid">
        <!-- Fear & Greed (Global) -->
        <div class="sentiment-box" [class.loading]="!fng">
          <div class="box-label" [appTooltip]="'Global market sentiment index (0-100). Higher = Greed, Lower = Fear.'">
            FEAR & GREED
          </div>
          <div class="box-value" [class]="fngClass">{{fng?.value || '--'}}</div>
          <div class="box-sub">{{fng?.label || 'Loading...'}}</div>
          <div class="sparkline" *ngIf="fng?.history">
            <div *ngFor="let h of fng?.history?.slice()?.reverse()" 
                 class="spark-bar" [style.height.px]="h.value * 0.2 + 2"
                 [appTooltip]="h.value + ' (' + h.label + ')'"></div>
          </div>
        </div>

        <!-- LunarCrush Galaxy Score (Asset Specific) -->
        <div class="sentiment-box highlight" [class.loading]="!social">
          <div class="box-label" [appTooltip]="'LunarCrush Galaxy Score: Overall health of the coin based on social engagement and market performance.'">
            GALAXY SCORE
          </div>
          <div class="box-value info">{{social?.galaxyScore || '--'}}</div>
          <div class="box-sub">AltRank: #{{social?.altRank || '--'}}</div>
          <div class="social-summary">{{social?.sentimentLabel || 'Neutral'}}</div>
        </div>
      </div>

      <!-- Social Pulse Tape -->
      <div class="pulse-section">
        <div class="section-badge">SOCIAL PULSE</div>
        <div class="pulse-tape">
          <div *ngFor="let msg of social?.pulse" class="pulse-msg" [class]="msg.sentiment">
            <span class="pulse-time">{{msg.timestamp | date:'HH:mm'}}</span>
            <span class="pulse-text">{{msg.text}}</span>
          </div>
          <div *ngIf="!social?.pulse?.length" class="pulse-empty">Waiting for social context...</div>
        </div>
      </div>

      <!-- Trending Coins -->
      <div class="trending-section" *ngIf="trending.length > 0">
        <span class="section-label">🔥 Trending (Click to focus)</span>
        <div class="trending-list">
          <div *ngFor="let coin of trending" 
               class="trending-item clickable" 
               (click)="selectCoin(coin.symbol)"
               [appTooltip]="'Click to refocus terminal on ' + coin.symbol + 'USDT'">
            <img [src]="coin.thumb" class="coin-thumb" alt="">
            <span class="coin-name">{{coin.symbol}}</span>
            <span class="coin-change" [class.positive]="coin.change24h > 0">{{coin.change24h | number:'1.1-1'}}%</span>
          </div>
        </div>
      </div>

      <!-- Global Loading -->
      <div *ngIf="loading && !fng && !social" class="loading-overlay">
        <div class="spinner"></div>
      </div>
    </div>
  `,
  styles: [`
    .panel {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 6px;
      padding: 12px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid var(--color-info);
      padding-bottom: 6px;
    }
    .panel-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 1px; color: var(--text-primary); }
    .panel-subtitle { font-size: 0.55rem; color: var(--text-muted); }

    .sentiment-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .sentiment-box {
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      padding: 8px;
      text-align: center;
      transition: opacity 0.3s;
    }
    .sentiment-box.highlight { border-color: var(--color-info); }
    .box-label { font-size: 0.5rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; }
    .box-value { font-size: 1.4rem; font-weight: 700; line-height: 1; }
    .box-sub { font-size: 0.55rem; margin-top: 2px; color: var(--text-muted); }
    .social-summary { font-size: 0.5rem; color: var(--color-info); font-weight: 600; margin-top: 4px; }

    .sparkline { display: flex; align-items: flex-end; justify-content: center; gap: 2px; height: 16px; margin-top: 6px; opacity: 0.6; }
    .spark-bar { width: 3px; background: var(--text-muted); border-radius: 1px; }

    .pulse-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: rgba(0,0,0,0.15);
      border-radius: 4px;
      padding: 8px;
      min-height: 0;
      border: 1px solid var(--border-primary);
    }
    .section-badge { 
      font-size: 0.45rem; 
      background: var(--bg-tertiary); 
      width: fit-content; 
      padding: 1px 4px; 
      border-radius: 2px; 
      margin-bottom: 6px;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }
    .pulse-tape {
      flex: 1;
      overflow-y: auto;
      font-size: 0.58rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .pulse-msg {
      border-left: 2px solid var(--border-primary);
      padding-left: 6px;
      line-height: 1.2;
    }
    .pulse-msg.bullish { border-color: var(--color-long); }
    .pulse-msg.bearish { border-color: var(--color-short); }
    .pulse-time { color: var(--text-muted); font-size: 0.5rem; margin-right: 4px; display: inline-block; width: 32px; }
    .pulse-text { color: var(--text-secondary); }
    .pulse-empty { color: var(--text-muted); opacity: 0.5; text-align: center; margin-top: 20px; font-size: 0.55rem; }

    .trending-section { padding-top: 8px; border-top: 1px solid var(--border-primary); }
    .section-label { font-size: 0.5rem; color: var(--text-muted); display: block; margin-bottom: 4px; text-transform: uppercase; }
    .trending-list { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
    .trending-item { display: flex; align-items: center; gap: 4px; background: var(--bg-primary); padding: 2px 6px; border-radius: 2px; white-space: nowrap; border: 1px solid var(--border-primary); }
    
    .clickable { cursor: pointer; transition: all 0.2s; }
    .clickable:hover { 
      background: var(--bg-tertiary); 
      border-color: var(--color-info); 
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    }

    .coin-thumb { width: 10px; height: 10px; border-radius: 50%; }
    .coin-name { font-size: 0.55rem; font-weight: 600; color: var(--text-primary); }
    .coin-change { font-size: 0.55rem; color: var(--color-short); font-weight: 700; }
    .coin-change.positive { color: var(--color-long); }

    .loading-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; border-radius: 6px; z-index: 10; }
    .info { color: var(--color-info); }
    .spinner { width: 20px; height: 20px; border: 2px solid transparent; border-top-color: var(--color-info); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* F&G Colors */
    .extreme-fear { color: #f43f5e; }
    .fear { color: #f97316; }
    .neutral { color: var(--text-muted); }
    .greed { color: #84cc16; }
    .extreme-greed { color: #10b981; }

    .loading { opacity: 0.5; }
  `]
})
export class NewsFeedComponent implements OnInit, OnDestroy {
  social: MarketState['social'] | undefined;
  fng: FearGreed | null = null;
  trending: TrendingCoin[] = [];
  loading = true;
  private sub = new Subscription();

  constructor(private http: HttpClient, private marketData: MarketDataService) { }

  ngOnInit(): void {
    this.fetchGlobalSentiment();
    this.sub.add(
      this.marketData.state$.subscribe(state => {
        if (state?.social) {
          this.social = state.social;
          this.loading = false;
        }
      })
    );
    setInterval(() => this.fetchGlobalSentiment(), 300_000);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  fetchGlobalSentiment(): void {
    this.http.get<SentimentData>(`${this.marketData.apiUrl}/news`).subscribe({
      next: (data) => {
        this.fng = data.fearGreed;
        this.trending = data.trending || [];
      },
      error: () => { }
    });
  }

  selectCoin(symbol: string): void {
    const binanceSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`.toUpperCase();
    this.marketData.changeSymbol(binanceSymbol);
  }

  get fngClass(): string {
    if (!this.fng) return '';
    const v = this.fng.value;
    if (v <= 25) return 'extreme-fear';
    if (v <= 40) return 'fear';
    if (v > 75) return 'extreme-greed';
    if (v > 60) return 'greed';
    return 'neutral';
  }
}
