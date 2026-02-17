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
            <tr *ngFor="let signal of signals$ | async" (click)="selectSymbol(signal.symbol)" class="signal-row">
              <td>{{formatTime(signal.timestamp)}}</td>
              <td class="symbol">{{signal.symbol.replace('USDT', '')}}</td>
              <td [class.side-long]="isLong(signal.rsi)" [class.side-short]="!isLong(signal.rsi)">
                {{isLong(signal.rsi) ? 'LONG' : 'SHORT'}}
              </td>
              <td [class.extreme]="isExtremeRsi(signal.rsi)">{{signal.rsi | number:'1.0-0'}}</td>
              <td>{{formatLargeNumber(signal.delta)}}</td>
              <td>{{signal.top_ratio | number:'1.2-2'}}</td>
            </tr>
            <tr *ngIf="!(signals$ | async)?.length">
              <td colspan="6" class="empty">Scanning for volatility...</td>
            </tr>
          </tbody>
        </table>
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
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: var(--border-primary); border-radius: 2px; }
  `]
})
export class ScannerWidgetComponent {
    signals$: Observable<any[]>;

    constructor(private marketData: MarketDataService) {
        this.signals$ = this.marketData.state$.pipe(
            map(state => state?.scannerSignals || [])
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
