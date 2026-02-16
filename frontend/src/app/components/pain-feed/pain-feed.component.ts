import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'app-pain-feed',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  template: `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">PAIN FEED</span>
        <span class="panel-subtitle"
              [appTooltip]="'Live Force Orders — Liquidation events from the Binance forced liquidation engine. When the tape moves fast, a cascade is happening. If price stops dropping despite a wall of red liquidations, the bottom is likely in.'">
          Liquidations Tape
        </span>
      </div>

      <!-- Estimated Liquidation Zones -->
      <div class="liq-zones" *ngIf="estimatedZones.length > 0">
        <span class="section-label"
              [appTooltip]="'Estimated Liquidation Zones — Based on current price and common leverage levels (10x–100x). These are the price magnets where concentrated liquidations would be triggered, pulling price toward them to hunt liquidity. Not actual data from Binance — it is calculated.'">
          Est. Liq Magnets
        </span>
        <div class="zones-grid">
          <div *ngFor="let z of estimatedZones" class="zone-item" [class.long-zone]="z.side === 'LONG'" [class.short-zone]="z.side === 'SHORT'">
            <span class="zone-leverage">{{z.leverage}}x</span>
            <span class="zone-price">{{z.price | number:'1.0-0'}}</span>
            <span class="zone-side">{{z.side}}</span>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row" *ngIf="liquidations.length > 0">
        <div class="stat">
          <span class="stat-label"
                [appTooltip]="'Total short positions liquidated (forced to buy). These traders bet price would go down.'">Short Liqs</span>
          <span class="stat-value long-val">{{shortLiqCount}}</span>
        </div>
        <div class="stat">
          <span class="stat-label"
                [appTooltip]="'Total long positions liquidated (forced to sell). These traders bet price would go up.'">Long Liqs</span>
          <span class="stat-value short-val">{{longLiqCount}}</span>
        </div>
      </div>

      <!-- Scrolling Tape -->
      <div class="tape">
        <div *ngFor="let item of liquidations; trackBy: trackByTs"
             class="tape-item"
             [class.buy-liq]="item.side === 'BUY'"
             [class.sell-liq]="item.side === 'SELL'"
             [class.large]="item.qty * item.price > 50000">
          <div class="tape-left">
            <span class="tape-time">{{item.ts | date:'HH:mm:ss'}}</span>
            <span class="tape-side">{{item.side === 'BUY' ? 'SHORT LIQ' : 'LONG LIQ'}}</span>
          </div>
          <div class="tape-right">
            <span class="tape-size">\${{item.qty * item.price | number:'1.0-0'}}</span>
            <span class="tape-price">&#64; {{item.price | number:'1.0-2'}}</span>
          </div>
        </div>
        <div *ngIf="liquidations.length === 0" class="empty">
          <span class="empty-icon">◉</span>
          <span>Waiting for liquidations...</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 6px;
      padding: 16px;
      height: 100%;
      display: flex;
      flex-direction: column;
      font-family: var(--font-mono);
      overflow: hidden;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid var(--color-short);
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .panel-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: 1.5px;
    }
    .panel-subtitle {
      font-size: 0.6rem;
      color: var(--text-muted);
    }

    /* Estimated Zones */
    .liq-zones {
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-primary);
    }
    .section-label {
      font-size: 0.55rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      display: block;
    }
    .zones-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }
    .zone-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 0.65rem;
    }
    .zone-item.long-zone {
      background: rgba(244, 63, 94, 0.08);
      border-left: 2px solid var(--color-short);
    }
    .zone-item.short-zone {
      background: rgba(16, 185, 129, 0.08);
      border-left: 2px solid var(--color-long);
    }
    .zone-leverage {
      color: var(--text-muted);
      font-weight: 600;
      width: 28px;
    }
    .zone-price {
      font-weight: 700;
      color: var(--text-primary);
    }
    .zone-side {
      font-size: 0.5rem;
      color: var(--text-muted);
    }

    /* Stats */
    .stats-row {
      display: flex;
      gap: 16px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-primary);
    }
    .stat { display: flex; flex-direction: column; }
    .stat-label { font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; }
    .stat-value { font-size: 1rem; font-weight: 700; }
    .long-val { color: var(--color-long); }
    .short-val { color: var(--color-short); }

    /* Tape */
    .tape {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tape-item {
      display: flex;
      justify-content: space-between;
      padding: 5px 8px;
      border-radius: 3px;
      font-size: 0.7rem;
      transition: background 0.2s;
      border-left: 3px solid transparent;
    }
    .tape-item.sell-liq {
      color: var(--color-short);
      border-left-color: var(--color-short);
      background: rgba(244, 63, 94, 0.05);
    }
    .tape-item.buy-liq {
      color: var(--color-long);
      border-left-color: var(--color-long);
      background: rgba(16, 185, 129, 0.05);
    }
    .tape-item.large {
      font-weight: 700;
      font-size: 0.75rem;
    }
    .tape-item.large.sell-liq { background: rgba(244, 63, 94, 0.12); }
    .tape-item.large.buy-liq { background: rgba(16, 185, 129, 0.12); }

    .tape-left, .tape-right { display: flex; gap: 8px; align-items: center; }
    .tape-time { color: var(--text-muted); font-size: 0.6rem; width: 55px; }
    .tape-side { font-weight: 600; width: 70px; }
    .tape-size { font-weight: 700; }
    .tape-price { color: var(--text-muted); }

    .empty {
      color: var(--text-muted);
      text-align: center;
      margin-top: 30px;
      font-size: 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .empty-icon {
      font-size: 1.5rem;
      opacity: 0.3;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.2; }
      50% { opacity: 0.5; }
    }
  `]
})
export class PainFeedComponent implements OnChanges {
  @Input() liquidations: any[] = [];
  @Input() currentPrice: number = 0;
  estimatedZones: { leverage: number; price: number; side: string }[] = [];
  longLiqCount = 0;
  shortLiqCount = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['liquidations'] && this.liquidations) {
      this.longLiqCount = this.liquidations.filter(l => l.side === 'SELL').length;
      this.shortLiqCount = this.liquidations.filter(l => l.side === 'BUY').length;
    }
    if (changes['currentPrice'] && this.currentPrice > 0) {
      this.calculateEstimatedZones();
    }
  }

  trackByTs(index: number, item: any): number {
    return item.ts;
  }

  private calculateEstimatedZones(): void {
    const leverages = [10, 25, 50, 100];
    this.estimatedZones = [];
    for (const lev of leverages) {
      // Long liquidation happens when price drops by ~(1/leverage * 100)%
      // With maintenance margin ~0.4%, effective is slightly less
      const longLiqPrice = this.currentPrice * (1 - 1 / lev * 0.95);
      // Short liquidation happens when price rises by ~(1/leverage * 100)%
      const shortLiqPrice = this.currentPrice * (1 + 1 / lev * 0.95);

      this.estimatedZones.push(
        { leverage: lev, price: longLiqPrice, side: 'LONG' },
        { leverage: lev, price: shortLiqPrice, side: 'SHORT' }
      );
    }
    // Sort by distance from current price (closest first)
    this.estimatedZones.sort((a, b) =>
      Math.abs(a.price - this.currentPrice) - Math.abs(b.price - this.currentPrice)
    );
  }
}
