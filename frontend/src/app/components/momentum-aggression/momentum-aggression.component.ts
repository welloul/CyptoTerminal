import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexXAxis } from "ng-apexcharts";
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'app-momentum-aggression',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, TooltipDirective],
  template: `
    <div class="panel" *ngIf="data">
      <div class="panel-header">
        <span class="panel-title">MOMENTUM</span>
        <span class="panel-subtitle">Aggression & Flow</span>
      </div>

      <!-- Momentum Verdict -->
      <div class="verdict-row" [class.bullish]="momentumVerdict === 'BUYING PRESSURE'" [class.bearish]="momentumVerdict === 'SELLING PRESSURE'" [class.neutral]="momentumVerdict === 'BALANCED'">
        <span class="verdict-label">{{momentumVerdict}}</span>
        <span class="verdict-desc">{{momentumDescription}}</span>
      </div>

      <!-- CVD -->
      <div class="metrics-row">
        <div class="metric">
          <span class="label" [appTooltip]="'Net aggressive buying minus selling. Positive = buyers are dominant.'">CVD (Delta)</span>
          <span class="value" [class.positive]="data.cvd > 0" [class.negative]="data.cvd < 0">
            {{data.cvd | number:'1.0-0'}}
          </span>
          <span class="interp">{{cvdInterp}}</span>
        </div>
        <div class="metric">
          <span class="label" [appTooltip]="'Total active contracts. Rising OI + rising price = healthy trend.'">Open Interest</span>
          <span class="value">{{data.openInterest | number:'1.0-2'}}</span>
          <span class="interp">Active contracts</span>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-container">
        <div class="chart-label">CVD TREND</div>
        <apx-chart
          [series]="cvdSeries"
          [chart]="chartConfig"
          [xaxis]="xaxisConfig"
          [stroke]="strokeConfig"
          [fill]="fillConfig"
          [dataLabels]="{ enabled: false }"
          [yaxis]="{ labels: { show: false } }"
          [grid]="{ show: false }"
          [colors]="['#22d3ee']"
        ></apx-chart>
      </div>

      <!-- Taker Volume with NET label -->
      <div class="vol-section">
        <span class="label" [appTooltip]="'Who is more aggressive right now. Large buy volume on flat price = accumulation.'">Taker Volume (5m)</span>
        <div class="vol-bars">
          <div class="vol-col buy">
            <div class="vol-fill" [style.height.%]="buyPct"></div>
            <span class="vol-label">BUY</span>
            <span class="vol-value">{{data.takerBuy | number:'1.0-0'}}</span>
          </div>
          <div class="vol-col sell">
            <div class="vol-fill" [style.height.%]="sellPct"></div>
            <span class="vol-label">SELL</span>
            <span class="vol-value">{{data.takerSell | number:'1.0-0'}}</span>
          </div>
        </div>
        <div class="delta-row">
          <span class="delta-label">NET</span>
          <div class="delta-bar">
            <div class="delta-fill" [class.positive]="takerDelta >= 0" [class.negative]="takerDelta < 0"
                 [style.width.%]="deltaBarWidth"
                 [style.marginLeft.%]="takerDelta >= 0 ? 50 : (50 - deltaBarWidth)">
            </div>
          </div>
          <span class="delta-verdict" [class.positive]="takerDelta >= 0" [class.negative]="takerDelta < 0">
            {{takerDelta >= 0 ? 'Buyers dominating' : 'Sellers dominating'}}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 6px;
      padding: 14px;
      height: 100%;
      display: flex;
      flex-direction: column;
      font-family: var(--font-mono);
      overflow-y: auto;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid var(--color-stress);
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .panel-title { font-size: 0.75rem; font-weight: 700; color: var(--text-primary); letter-spacing: 1.5px; }
    .panel-subtitle { font-size: 0.6rem; color: var(--text-muted); }

    /* Verdict */
    .verdict-row {
      text-align: center;
      padding: 8px;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .verdict-label {
      display: block;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 1.5px;
    }
    .verdict-desc {
      display: block;
      font-size: 0.55rem;
      color: var(--text-secondary);
      font-family: var(--font-sans);
      margin-top: 2px;
    }
    .verdict-row.bullish .verdict-label { color: var(--color-long); }
    .verdict-row.bearish .verdict-label { color: var(--color-short); }
    .verdict-row.neutral .verdict-label { color: var(--text-muted); }

    .metrics-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .metric { display: flex; flex-direction: column; gap: 1px; }
    .label { font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
    .value { font-weight: 700; font-size: 1.1rem; color: var(--text-primary); }
    .value.positive { color: var(--color-long); }
    .value.negative { color: var(--color-short); }
    .interp {
      font-size: 0.55rem;
      color: var(--text-secondary);
      font-family: var(--font-sans);
    }

    .chart-container {
      flex: 0 0 110px;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      margin-bottom: 10px;
      position: relative;
      overflow: hidden;
    }
    .chart-label {
      position: absolute;
      top: 4px; left: 6px;
      font-size: 0.45rem;
      color: var(--text-muted);
      letter-spacing: 1px;
      z-index: 10;
    }

    .vol-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .vol-bars { display: flex; gap: 6px; height: 70px; }
    .vol-col {
      flex: 1;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      position: relative;
      overflow: hidden;
    }
    .vol-fill { width: 100%; transition: height 0.3s ease; }
    .vol-col.buy .vol-fill { background: linear-gradient(to top, var(--color-long-dim), var(--color-long)); opacity: 0.6; }
    .vol-col.sell .vol-fill { background: linear-gradient(to top, var(--color-short-dim), var(--color-short)); opacity: 0.6; }
    .vol-label { position: absolute; top: 3px; font-size: 0.45rem; color: var(--text-muted); letter-spacing: 1px; }
    .vol-value { position: absolute; bottom: 4px; font-size: 0.65rem; font-weight: 700; color: var(--text-primary); }

    .delta-row { display: flex; align-items: center; gap: 6px; }
    .delta-label { font-size: 0.45rem; color: var(--text-muted); width: 20px; }
    .delta-bar { flex: 1; height: 4px; background: var(--bg-tertiary); border-radius: 2px; position: relative; }
    .delta-fill { height: 100%; border-radius: 2px; transition: all 0.3s ease; }
    .delta-fill.positive { background: var(--color-long); }
    .delta-fill.negative { background: var(--color-short); }
    .delta-verdict {
      font-size: 0.5rem;
      font-family: var(--font-sans);
      white-space: nowrap;
    }
    .delta-verdict.positive { color: var(--color-long); }
    .delta-verdict.negative { color: var(--color-short); }
  `]
})
export class MomentumAggressionComponent implements OnChanges {
  @Input() data: any;

  buyPct = 50;
  sellPct = 50;
  takerDelta = 0;
  deltaBarWidth = 0;
  cvdInterp = '';
  momentumVerdict = 'BALANCED';
  momentumDescription = '';

  cvdSeries: ApexAxisChartSeries = [{ name: "CVD", data: [] }];
  chartConfig: ApexChart = { type: "area", height: 110, sparkline: { enabled: true }, animations: { enabled: false } };
  xaxisConfig: ApexXAxis = { type: 'datetime', labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } };
  strokeConfig = { curve: 'smooth' as const, width: 2 };
  fillConfig = { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.05, stops: [0, 100] } };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      const total = (this.data.takerBuy || 0) + (this.data.takerSell || 0);
      this.buyPct = total > 0 ? (this.data.takerBuy / total) * 100 : 50;
      this.sellPct = total > 0 ? (this.data.takerSell / total) * 100 : 50;
      this.takerDelta = (this.data.takerBuy || 0) - (this.data.takerSell || 0);
      this.deltaBarWidth = total > 0 ? Math.min(Math.abs(this.takerDelta) / total * 100, 50) : 0;

      // CVD interpretation
      if (this.data.cvd > 0) this.cvdInterp = 'Buyers are aggressive';
      else if (this.data.cvd < 0) this.cvdInterp = 'Sellers are aggressive';
      else this.cvdInterp = 'Balanced';

      // Overall Momentum Verdict
      const buyDominant = this.buyPct > 55;
      const sellDominant = this.sellPct > 55;
      const cvdBullish = this.data.cvd > 0;
      if (buyDominant && cvdBullish) { this.momentumVerdict = 'BUYING PRESSURE'; this.momentumDescription = 'Aggressive buyers are dominating the tape'; }
      else if (sellDominant && !cvdBullish) { this.momentumVerdict = 'SELLING PRESSURE'; this.momentumDescription = 'Aggressive sellers are dominating the tape'; }
      else { this.momentumVerdict = 'BALANCED'; this.momentumDescription = 'No clear aggression — market is in equilibrium'; }

      if (this.data.history && this.data.history.cvd) {
        const seriesData = this.data.history.cvd.map((d: any) => [d.time, d.cvd]);
        this.cvdSeries = [{ name: "CVD", data: seriesData }];
      }
    }
  }
}
