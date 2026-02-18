import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketDataService } from '../../services/market-data.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-scanner-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scanner-widget">
      <div class="widget-header">
        <span class="title">MOMENTUM SCANNER</span>
        <span class="badge">REAL-TIME</span>
      </div>
      
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>TIME</th>
              <th>SYMBOL</th>
              <th>SIDE</th>
              <th>RSI</th>
              <th>CVD</th>
              <th>RATIO</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let signal of signals$ | async" (click)="signal?.symbol && selectSymbol(signal.symbol)" class="signal-row">
              <td>{{signal?.timestamp ? formatTime(signal.timestamp) : '--:--'}}</td>
              <td class="symbol">{{signal?.symbol?.replace('USDT', '') || '???'}}</td>
              <td [class.side-long]="isLong(signal?.rsi || 50)" [class.side-short]="!isLong(signal?.rsi || 50)">
                {{isLong(signal?.rsi || 50) ? 'LONG' : 'SHORT'}}
              </td>
              <td [class.extreme]="isExtremeRsi(signal?.rsi || 50)">{{(signal?.rsi || 0) | number:'1.0-0'}}</td>
              <td>{{formatLargeNumber(signal?.delta || 0)}}</td>
              <td>{{(signal?.top_ratio || 1) | number:'1.2-2'}}</td>
            </tr>
            <tr *ngIf="!(signals$ | async)?.length">
              <td colspan="6" class="empty">Scanning for volatility...</td>
            </tr>
          </tbody>
        </table>
      <div class="widget-footer" *ngIf="status$ | async as status">
        <span class="status-icon"></span>
        <span class="status-text">{{status}}</span>
      </div>
    </div>
  `,
  styles: [`
    .scanner-widget {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-secondary);
      font-family: var(--font-mono);
    }
    .widget-header {
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-primary);
      background: rgba(255,255,255,0.02);
    }
    .title {
      font-size: 0.75rem;
      font-weight: bold;
      color: var(--text-secondary);
      letter-spacing: 1px;
    }
    .badge {
      font-size: 0.6rem;
      padding: 2px 6px;
      background: rgba(16, 185, 129, 0.1);
      color: var(--color-success);
      border-radius: 4px;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .table-container {
      flex: 1;
      overflow-y: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.7rem;
    }
    th {
      position: sticky;
      top: 0;
      background: var(--bg-tertiary);
      padding: 8px 10px;
      text-align: left;
      color: var(--text-muted);
      font-weight: normal;
      border-bottom: 1px solid var(--border-primary);
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      color: var(--text-secondary);
    }
    .signal-row {
      cursor: pointer;
      transition: background 0.15s;
    }
    .signal-row:hover {
      background: rgba(255,255,255,0.05);
    }
    .symbol {
      color: var(--text-primary);
      font-weight: bold;
    }
    .side-long { color: var(--color-success); font-weight: bold; }
    .side-short { color: var(--color-danger); font-weight: bold; }
    .extreme { color: var(--accent-amber); font-weight: bold; }
    .empty {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
      font-style: italic;
    }
    .widget-footer {
      padding: 6px 12px;
      background: var(--bg-tertiary);
      border-top: 1px solid var(--border-primary);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.6rem;
      color: var(--text-muted);
    }
    .status-icon {
      width: 6px;
      height: 6px;
      background: var(--color-success);
      border-radius: 50%;
      box-shadow: 0 0 6px var(--color-success);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }
    .status-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: var(--border-primary); border-radius: 2px; }
  `]
})
export class ScannerWidgetComponent {
  signals$: Observable<any[]>;
  status$: Observable<string>;

  constructor(private marketData: MarketDataService) {
    this.signals$ = this.marketData.state$.pipe(
      map(state => state?.scannerSignals || [])
    );
    this.status$ = this.marketData.state$.pipe(
      map(state => (state as any)?.scannerStatus || 'Active')
    );
  }

  isLong(rsi: number): boolean {
    return rsi < 50;
  }

  isExtremeRsi(rsi: number): boolean {
    return rsi > 80 || rsi < 20;
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  formatLargeNumber(num: number): string {
    if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toFixed(0);
  }

  selectSymbol(symbol: string) {
    this.marketData.changeSymbol(symbol);
  }
}
