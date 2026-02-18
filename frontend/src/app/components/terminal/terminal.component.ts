import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketDataService, MarketState } from '../../services/market-data.service';
import { PositioningMatrixComponent } from '../positioning-matrix/positioning-matrix.component';
import { MomentumAggressionComponent } from '../momentum-aggression/momentum-aggression.component';
import { PainFeedComponent } from '../pain-feed/pain-feed.component';
import { MarketStressComponent } from '../market-stress/market-stress.component';
import { SymbolSelectorComponent } from '../symbol-selector/symbol-selector.component';
import { NewsFeedComponent } from '../news-feed/news-feed.component';
import { TradingviewChartComponent } from '../tradingview-chart/tradingview-chart.component';
import { ScannerWidgetComponent } from '../scanner-widget/scanner-widget.component';
import { Observable } from 'rxjs';
import { CdkDragDrop, moveItemInArray, CdkDrag, CdkDropList, CdkDragHandle } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [
    CommonModule,
    PositioningMatrixComponent,
    MomentumAggressionComponent,
    PainFeedComponent,
    MarketStressComponent,
    SymbolSelectorComponent,
    NewsFeedComponent,
    TradingviewChartComponent,
    ScannerWidgetComponent,
    CdkDrag,
    CdkDropList,
    CdkDragHandle
  ],
  template: `
    <div class="terminal" *ngIf="state$ | async as state">
      <!-- Top News Tickers -->
      <div class="news-bars">
        <div class="news-ticker global">
          <div class="ticker-label">GLOBAL PULSE</div>
          <div class="ticker-content">
            <div class="ticker-track">
              <span *ngFor="let item of state.news?.global" class="ticker-item">
                <a [href]="item.url" target="_blank" rel="noopener noreferrer" class="news-link">
                  <span class="ticker-source">[{{item.source}}]</span> {{item.title}}
                </a>
              </span>
              <!-- Duplicate for seamless loop -->
              <span *ngFor="let item of state.news?.global" class="ticker-item">
                <a [href]="item.url" target="_blank" rel="noopener noreferrer" class="news-link">
                  <span class="ticker-source">[{{item.source}}]</span> {{item.title}}
                </a>
              </span>
            </div>
          </div>
        </div>
        <div class="news-ticker asset">
          <div class="ticker-label">{{state.symbol.replace('USDT', '')}} NEWS</div>
          <div class="ticker-content">
            <div class="ticker-track" [style.animation-duration]="(state.news?.asset?.length || 0) * 10 + 's'">
              <span *ngFor="let item of state.news?.asset" class="ticker-item">
                <a [href]="item.url" target="_blank" rel="noopener noreferrer" class="news-link">
                  <span class="ticker-source highlight">[{{item.source}}]</span> {{item.title}}
                </a>
              </span>
              <!-- Duplicate for seamless loop -->
              <span *ngFor="let item of state.news?.asset" class="ticker-item">
                <a [href]="item.url" target="_blank" rel="noopener noreferrer" class="news-link">
                  <span class="ticker-source highlight">[{{item.source}}]</span> {{item.title}}
                </a>
              </span>
              <span *ngIf="!state.news?.asset?.length" class="ticker-empty">No specific news found for this asset. Monitoring for updates...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Header -->
      <header class="header">
        <div class="header-left">
          <a href="https://t.me/+218910999494" target="_blank" rel="noopener noreferrer" class="contact-link" title="Contact Developer">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.96-.75 3.78-1.65 6.31-2.74 7.58-3.27 3.61-1.51 4.35-1.77 4.84-1.78.11 0 .35.03.5.16.12.1.16.23.18.33.02.11.02.24.01.37z" fill="currentColor"/></svg>
          </a>
          <app-symbol-selector></app-symbol-selector>
          <div class="price-block">
            <span class="price">{{state.price | number:'1.2-2'}}</span>
            <span class="price-label">USD</span>
          </div>
        </div>
        <app-market-stress [data]="state"></app-market-stress>
      </header>

      <!-- Draggable Grid -->
      <div class="grid" cdkDropList cdkDropListOrientation="horizontal" (cdkDropListDropped)="onDrop($event)">
        <div *ngFor="let widgetId of widgetOrder; let i = index" cdkDrag class="col" [cdkDragData]="widgetId">
          <!-- TradingView Chart -->
          <app-tradingview-chart *ngIf="widgetId === 'chart'" [symbol]="state.symbol"></app-tradingview-chart>

          <!-- Positioning -->
          <app-positioning-matrix *ngIf="widgetId === 'positioning'" 
            [data]="state.ratios">
          </app-positioning-matrix>

          <!-- Momentum -->
          <app-momentum-aggression *ngIf="widgetId === 'momentum'" 
            [data]="state.momentum">
          </app-momentum-aggression>

          <!-- Pain Feed -->
          <app-pain-feed *ngIf="widgetId === 'pain'" 
            [liquidations]="state.liquidations" 
            [currentPrice]="state.price">
          </app-pain-feed>

          <!-- Sentiment (Integrated LunarCrush) -->
          <app-news-feed *ngIf="widgetId === 'sentiment'"></app-news-feed>

          <!-- Scanner (New) -->
          <app-scanner-widget *ngIf="widgetId === 'scanner'"></app-scanner-widget>

          <!-- Drag Handle -->
          <div class="drag-handle" cdkDragHandle>
            <svg viewBox="0 0 24 24"><path d="M10 9h4V7h-4v2zm0 4h4v-2h-4v2zm0 4h4v-2h-4v2zm-7-1h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2z" fill="currentColor"/></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Disconnected Overlay -->
    <div *ngIf="(isConnected$ | async) === false" class="overlay">
      <div class="overlay-content">
        <div class="spinner"></div>
        <span>Connecting to Market Data...</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      background: var(--bg-primary);
      color: var(--text-primary);
      overflow: hidden;
    }
    .terminal {
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 8px;
      gap: 8px;
      box-sizing: border-box;
    }

    /* News Tickers */
    .news-bars {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-shrink: 0;
    }
    .news-ticker {
      display: flex;
      align-items: center;
      height: 24px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      overflow: hidden;
      font-size: 0.7rem;
      font-family: var(--font-mono);
    }
    .news-ticker.asset {
      background: rgba(16, 185, 129, 0.03); /* Emerald tint */
      border-color: rgba(16, 185, 129, 0.1);
    }
    .ticker-label {
      padding: 0 10px;
      height: 100%;
      display: flex;
      align-items: center;
      background: var(--bg-tertiary);
      color: var(--text-muted);
      font-weight: bold;
      white-space: nowrap;
      border-right: 1px solid var(--border-primary);
      z-index: 2;
      font-size: 0.65rem;
    }
    .news-ticker.asset .ticker-label {
      background: rgba(16, 185, 129, 0.1);
      color: var(--color-success);
      border-right-color: rgba(16, 185, 129, 0.1);
    }
    .ticker-content {
      flex: 1;
      overflow: hidden;
      position: relative;
    }
    .ticker-track {
      display: inline-flex;
      white-space: nowrap;
      animation: marquee 240s linear infinite; /* Half the current speed: 240s */
      padding-left: 20px;
    }
    .ticker-content:hover .ticker-track {
      animation-play-state: paused;
    }
    .ticker-item {
      padding-right: 40px;
      color: var(--text-secondary);
    }
    .news-link {
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
    }
    .news-link:hover {
      text-decoration: underline;
      color: var(--text-primary);
    }
    .ticker-source {
      color: var(--accent-violet);
      font-weight: bold;
      margin-right: 4px;
    }
    .ticker-source.highlight {
      color: var(--color-success);
    }
    .ticker-empty {
      color: var(--text-muted);
      font-style: italic;
    }

    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 6px;
      padding: 8px 14px;
      flex-shrink: 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .contact-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0, 136, 204, 0.1);
      color: #0088cc;
      transition: all 0.2s;
      border: 1px solid rgba(0, 136, 204, 0.2);
    }
    .contact-link:hover {
      background: #0088cc;
      color: white;
      transform: scale(1.1);
      box-shadow: 0 0 12px rgba(0, 136, 204, 0.4);
    }
    .contact-link svg {
      width: 20px;
      height: 20px;
    }
    .price-block {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .price {
      font-size: 1.6rem;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--text-primary);
    }
    .price-label {
      font-size: 0.6rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    /* Draggable Grid */
    .grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr; /* Rearranged for 5 widgets: 3 cols */
      grid-template-rows: 1fr 1fr;
      gap: 8px;
      min-height: 0;
    }
    .col {
      min-height: 0;
      position: relative;
      background: var(--bg-secondary);
      border-radius: 6px;
      overflow: hidden;
    }
    
    .cdk-drag-preview {
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border: 1px solid var(--color-info);
      border-radius: 6px;
      opacity: 0.9;
      pointer-events: none;
    }
    .cdk-drag-placeholder {
      opacity: 0.2;
      background: var(--bg-tertiary);
      border: 2px dashed var(--border-primary);
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .grid.cdk-drop-list-dragging .col:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .drag-handle {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 24px;
      height: 24px;
      color: var(--text-muted);
      cursor: move;
      opacity: 0.3;
      transition: all 0.2s;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    .col:hover .drag-handle { opacity: 0.6; }
    .drag-handle:hover { opacity: 1 !important; color: var(--color-info); background: rgba(255,255,255,0.05); }
    .drag-handle svg { width: 14px; height: 14px; }

    @media (max-width: 1300px) {
      .grid { grid-template-columns: 1fr 1fr; overflow-y: auto; }
    }
    @media (max-width: 700px) {
      .grid { grid-template-columns: 1fr; overflow-y: auto; }
    }

    .overlay { position: fixed; inset: 0; background: rgba(12, 16, 23, 0.92); display: flex; justify-content: center; align-items: center; z-index: 999; }
    .overlay-content { display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.85rem; }
    .spinner { width: 24px; height: 24px; border: 2px solid var(--border-secondary); border-top-color: var(--accent-cyan); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class TerminalComponent implements OnInit {
  state$: Observable<MarketState | null>;
  isConnected$: Observable<boolean>;
  widgetOrder: string[] = ['chart', 'positioning', 'momentum', 'pain', 'sentiment', 'scanner'];

  constructor(private marketData: MarketDataService) {
    this.state$ = this.marketData.state$;
    this.isConnected$ = this.marketData.isConnected$;

    // Restore layout
    const saved = localStorage.getItem('terminal_layout_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) {
          this.widgetOrder = parsed;
        }
      } catch (e) { }
    }
  }

  ngOnInit() { }

  onDrop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.widgetOrder, event.previousIndex, event.currentIndex);
    localStorage.setItem('terminal_layout_v4', JSON.stringify(this.widgetOrder));
  }
}
