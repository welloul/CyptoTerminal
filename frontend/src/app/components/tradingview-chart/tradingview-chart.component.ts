import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'app-tradingview-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="chart-container">
      <iframe 
        *ngIf="safeUrl"
        [src]="safeUrl"
        frameborder="0" 
        allowfullscreen="true" 
        scrolling="no">
      </iframe>
      <div *ngIf="!safeUrl" class="loading-state">
        <div class="spinner"></div>
        <span>Initializing Chart...</span>
      </div>
    </div>
  `,
    styles: [`
    .chart-container {
      width: 100%;
      height: 100%;
      background: #000;
      position: relative;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .loading-state {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-family: var(--font-mono);
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-primary);
      border-top-color: var(--color-info);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class TradingviewChartComponent implements OnChanges {
    @Input() symbol: string = 'BTCUSDT';
    safeUrl: SafeResourceUrl | null = null;

    constructor(private sanitizer: DomSanitizer) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['symbol']) {
            this.updateChart();
        }
    }

    private updateChart(): void {
        // TradingView symbol format for Binance Futures is usually BINANCE:BTCUSDT.P or just BINANCE:BTCUSDT
        // Most users prefer .P for perpetuals to see correct funding-aligned price action.
        const tvSymbol = `BINANCE:${this.symbol.toUpperCase()}.P`;

        // Constructing the widget URL
        // theme=dark, interval=1, style=1 (candles), hide_top_toolbar=true for density
        const url = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_762c9&symbol=${tvSymbol}&interval=1&hidesidetoolbar=1&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${tvSymbol}`;

        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}
