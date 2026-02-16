import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketDataService } from '../../services/market-data.service';
import { HttpClient } from '@angular/common/http';

interface SymbolInfo {
  symbol: string;
  price: number;
  change: number;
  volume: number;
}

@Component({
  selector: 'app-symbol-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="selector-wrapper">
      <!-- Symbol Dropdown -->
      <div class="select-box">
        <select [(ngModel)]="selectedSymbol" (change)="onSymbolChange()">
          <option *ngFor="let sym of filteredSymbols" [value]="sym.symbol">
            {{sym.symbol}} ({{sym.change >= 0 ? '+' : ''}}{{sym.change | number:'1.2-2'}}%)
          </option>
        </select>
      </div>

      <!-- Sort Controls -->
      <div class="sort-controls">
        <button [class.active]="sortBy === 'volume'" (click)="sortSymbols('volume')">Vol</button>
        <button [class.active]="sortBy === 'gainers'" (click)="sortSymbols('gainers')">▲</button>
        <button [class.active]="sortBy === 'losers'" (click)="sortSymbols('losers')">▼</button>
      </div>

      <!-- Status -->
      <div class="status">
        <span class="dot" [class.live]="isConnected"></span>
        {{ isConnected ? 'LIVE' : 'OFF' }}
      </div>
    </div>
  `,
  styles: [`
    .selector-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .select-box select {
      background: var(--bg-tertiary);
      color: var(--accent-cyan);
      border: 1px solid var(--border-secondary);
      padding: 6px 10px;
      font-family: var(--font-mono);
      font-weight: 600;
      font-size: 0.85rem;
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      min-width: 220px;
    }
    .select-box select:hover { border-color: var(--text-muted); }

    .sort-controls {
      display: flex;
      gap: 2px;
    }
    .sort-controls button {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      color: var(--text-muted);
      padding: 4px 8px;
      font-size: 0.65rem;
      font-family: var(--font-mono);
      cursor: pointer;
      border-radius: 2px;
      transition: all 0.15s;
    }
    .sort-controls button.active {
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
      border-color: var(--accent-cyan);
    }
    .sort-controls button:hover { color: var(--text-primary); }

    .status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.65rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
    .dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--color-short);
    }
    .dot.live {
      background: var(--color-long);
      box-shadow: 0 0 6px var(--color-long);
    }
  `]
})
export class SymbolSelectorComponent implements OnInit {
  allSymbols: SymbolInfo[] = [];
  filteredSymbols: SymbolInfo[] = [];
  selectedSymbol = 'BTCUSDT';
  sortBy = 'volume';
  isConnected = false;

  constructor(
    private marketData: MarketDataService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.marketData.isConnected$.subscribe((v: boolean) => this.isConnected = v);

    // Keep internal selection synced with global state (for trending clicks)
    this.marketData.state$.subscribe(state => {
      if (state?.symbol && state.symbol !== this.selectedSymbol) {
        this.selectedSymbol = state.symbol;
      }
    });

    this.loadSymbols();
  }

  loadSymbols() {
    this.http.get<SymbolInfo[]>('http://localhost:8000/symbols').subscribe({
      next: (data) => {
        this.allSymbols = data;
        this.sortSymbols(this.sortBy);
      },
      error: () => {
        // Fallback list
        this.filteredSymbols = [
          { symbol: 'BTCUSDT', price: 0, change: 0, volume: 0 },
          { symbol: 'ETHUSDT', price: 0, change: 0, volume: 0 },
          { symbol: 'SOLUSDT', price: 0, change: 0, volume: 0 },
        ];
      }
    });
  }

  sortSymbols(by: string) {
    this.sortBy = by;
    const sorted = [...this.allSymbols];
    if (by === 'volume') sorted.sort((a, b) => b.volume - a.volume);
    else if (by === 'gainers') sorted.sort((a, b) => b.change - a.change);
    else if (by === 'losers') sorted.sort((a, b) => a.change - b.change);
    this.filteredSymbols = sorted;
  }

  onSymbolChange() {
    this.marketData.changeSymbol(this.selectedSymbol);
  }
}
