import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'app-market-stress',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  template: `
    <div class="stress-bar" *ngIf="data">
      <!-- Stress Verdict -->
      <div class="stress-verdict" [class.hot]="stressLevel === 'OVERHEATED'" [class.cold]="stressLevel === 'COOL'" [class.normal]="stressLevel === 'NORMAL'">
        {{stressLevel}}
      </div>

      <!-- Funding -->
      <div class="badge" [appTooltip]="'Funding: Cost longs pay shorts every 8h. Above 0.05% = longs paying massive premium (squeeze risk). Negative = shorts paying.'"
           [class.hot]="data.fundingRate > 0.0005"
           [class.cold]="data.fundingRate < -0.0005">
        <span class="badge-label">FUNDING</span>
        <span class="badge-value">{{data.fundingRate * 100 | number:'1.4-4'}}%</span>
        <span class="badge-interp">{{fundingInterp}}</span>
      </div>

      <!-- Basis -->
      <div class="metric" [appTooltip]="'Futures − Spot. Positive = traders paying premium (bullish speculation). Negative = fear/hedging.'">
        <span class="metric-label">BASIS</span>
        <span class="metric-value" [class.positive]="data.basis > 0" [class.negative]="data.basis < 0">
          {{data.basis | number:'1.2-2'}}
        </span>
        <span class="metric-interp">{{basisInterp}}</span>
      </div>

      <!-- Premium -->
      <div class="metric" [appTooltip]="'(Mark − Index) / Index. High premium = local FOMO on this exchange.'">
        <span class="metric-label">PREMIUM</span>
        <span class="metric-value" [class.hot-text]="data.premiumIndex > 0.001">
          {{data.premiumIndex * 100 | number:'1.3-3'}}%
        </span>
      </div>

      <!-- Mark -->
      <div class="metric divider" [appTooltip]="'Fair value price used for liquidation calculations.'">
        <span class="metric-label">MARK</span>
        <span class="metric-value mark">{{data.price | number:'1.2-2'}}</span>
      </div>
    </div>
  `,
  styles: [`
    .stress-bar {
      display: flex;
      gap: 12px;
      align-items: center;
      background: var(--bg-secondary);
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid var(--border-primary);
    }
    .stress-verdict {
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 2px 8px;
      border-radius: 3px;
      white-space: nowrap;
    }
    .stress-verdict.hot { color: var(--color-short); background: var(--color-short-dim); }
    .stress-verdict.cold { color: var(--color-long); background: var(--color-long-dim); }
    .stress-verdict.normal { color: var(--text-muted); background: var(--bg-tertiary); }

    .badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--bg-tertiary);
      padding: 4px 10px;
      border-radius: 4px;
      border: 1px solid var(--border-secondary);
      min-width: 75px;
    }
    .badge.hot { border-color: var(--color-stress); background: var(--color-stress-dim); }
    .badge.cold { border-color: var(--color-long); background: var(--color-long-dim); }
    .badge-label { font-size: 0.5rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-value { font-weight: 700; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-primary); }
    .badge.hot .badge-value { color: var(--color-stress); }
    .badge.cold .badge-value { color: var(--color-long); }
    .badge-interp { font-size: 0.45rem; color: var(--text-secondary); font-family: var(--font-sans); }

    .metric { display: flex; flex-direction: column; align-items: flex-end; }
    .metric.divider { border-left: 1px solid var(--border-secondary); padding-left: 12px; }
    .metric-label { font-size: 0.5rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-value { font-weight: 600; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-primary); }
    .metric-value.mark { font-weight: 700; }
    .metric-value.positive { color: var(--color-long); }
    .metric-value.negative { color: var(--color-short); }
    .metric-value.hot-text { color: var(--color-stress); }
    .metric-interp { font-size: 0.45rem; color: var(--text-secondary); font-family: var(--font-sans); }
  `]
})
export class MarketStressComponent {
  @Input() data: any;

  stressLevel = 'NORMAL';
  fundingInterp = '';
  basisInterp = '';

  ngOnChanges(): void {
    if (!this.data) return;

    // Funding interpretation
    const fr = this.data.fundingRate;
    if (fr > 0.001) this.fundingInterp = 'Longs paying heavy';
    else if (fr > 0.0005) this.fundingInterp = 'Bullish premium';
    else if (fr < -0.0005) this.fundingInterp = 'Shorts paying';
    else this.fundingInterp = 'Normal range';

    // Basis interpretation
    if (this.data.basis > 20) this.basisInterp = 'Contango';
    else if (this.data.basis < -20) this.basisInterp = 'Backwardation';
    else this.basisInterp = 'Near spot';

    // Stress level
    const highFunding = Math.abs(fr) > 0.0005;
    const highPremium = Math.abs(this.data.premiumIndex) > 0.001;
    if (highFunding && highPremium) this.stressLevel = 'OVERHEATED';
    else if (highFunding || highPremium) this.stressLevel = 'ELEVATED';
    else this.stressLevel = 'NORMAL';
  }
}
