import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipDirective } from '../../directives/tooltip.directive';

@Component({
  selector: 'app-positioning-matrix',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  template: `
    <div class="panel" *ngIf="data">
      <div class="panel-header">
        <span class="panel-title">POSITIONING</span>
        <span class="panel-subtitle">Whales vs Retail</span>
      </div>

      <!-- Overall Bias Gauge -->
      <div class="bias-section">
        <div class="bias-gauge">
          <div class="bias-fill" [style.width.%]="overallBias * 100" [class.bullish-fill]="overallBias > 0.55" [class.bearish-fill]="overallBias < 0.45"></div>
          <div class="bias-needle" [style.left.%]="overallBias * 100"></div>
        </div>
        <div class="bias-verdict" [class.bullish]="biasLabel === 'BULLISH'" [class.bearish]="biasLabel === 'BEARISH'" [class.neutral]="biasLabel === 'NEUTRAL'">
          {{biasLabel}}
        </div>
        <div class="bias-desc">{{biasDescription}}</div>
      </div>

      <!-- Global Retail -->
      <div class="metric-row">
        <div class="row-header">
          <span class="label" [appTooltip]="'All retail accounts. Over 70% one-sided = fragile, squeeze risk.'">Retail Crowd</span>
          <div class="ratio-text">
            <span class="long-val">{{data.global.long | percent:'1.0-0'}}</span>
            <span class="sep">/</span>
            <span class="short-val">{{data.global.short | percent:'1.0-0'}}</span>
          </div>
        </div>
        <div class="interpretation">
          <span class="interp-icon">{{retailInterpIcon}}</span>
          <span class="interp-text">{{retailInterpretation}}</span>
        </div>
        <div class="split-bar">
          <div class="bar-long" [style.width.%]="data.global.long * 100"></div>
          <div class="bar-short" [style.width.%]="data.global.short * 100"></div>
          <div class="center-mark"></div>
        </div>
      </div>

      <!-- Top Accounts -->
      <div class="metric-row">
        <div class="row-header">
          <span class="label" [appTooltip]="'Top 20% accounts by equity. If opposing retail = potential trap.'">Smart Money</span>
          <div class="ratio-text">
            <span class="long-val">{{data.topAccounts.long | percent:'1.0-0'}}</span>
            <span class="sep">/</span>
            <span class="short-val">{{data.topAccounts.short | percent:'1.0-0'}}</span>
          </div>
        </div>
        <div class="interpretation">
          <span class="interp-icon">{{smartInterpIcon}}</span>
          <span class="interp-text">{{smartInterpretation}}</span>
        </div>
        <div class="split-bar thin">
          <div class="bar-long" [style.width.%]="data.topAccounts.long * 100"></div>
          <div class="bar-short" [style.width.%]="data.topAccounts.short * 100"></div>
          <div class="center-mark"></div>
        </div>
      </div>

      <!-- Whale Gauge -->
      <div class="metric-row gauge-section">
        <span class="label" [appTooltip]="'Capital weight of top traders. Most important signal.'">Whale Exposure</span>
        <div class="gauge-track">
          <div class="gauge-needle" [style.left.%]="data.topPositions.long * 100"></div>
        </div>
        <div class="gauge-labels">
          <span class="short-val">SHORT</span>
          <span class="gauge-pct">{{data.topPositions.long | percent:'1.0-0'}} Long</span>
          <span class="long-val">LONG</span>
        </div>
        <div class="interpretation">
          <span class="interp-icon">{{whaleInterpIcon}}</span>
          <span class="interp-text">{{whaleInterpretation}}</span>
        </div>
      </div>

      <!-- Divergence -->
      <div class="alert-box" *ngIf="isDivergent()">
        <span class="alert-icon">⚠</span>
        <span>Whales opposing Retail — possible squeeze setup</span>
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
      gap: 12px;
      font-family: var(--font-mono);
      overflow-y: auto;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid var(--accent-cyan);
      padding-bottom: 8px;
    }
    .panel-title { font-size: 0.75rem; font-weight: 700; color: var(--text-primary); letter-spacing: 1.5px; }
    .panel-subtitle { font-size: 0.6rem; color: var(--text-muted); }

    /* Bias Gauge */
    .bias-section {
      text-align: center;
      padding: 8px;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 6px;
    }
    .bias-gauge {
      height: 8px;
      background: linear-gradient(to right, var(--color-short), var(--bg-tertiary) 40%, var(--bg-tertiary) 60%, var(--color-long));
      border-radius: 4px;
      position: relative;
      margin-bottom: 8px;
    }
    .bias-fill { height: 100%; border-radius: 4px; opacity: 0.2; }
    .bias-needle {
      position: absolute;
      top: -4px; bottom: -4px;
      width: 3px;
      background: var(--text-primary);
      border-radius: 2px;
      transition: left 0.8s ease;
      box-shadow: 0 0 6px rgba(255,255,255,0.4);
    }
    .bias-verdict {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 2px;
    }
    .bias-verdict.bullish { color: var(--color-long); }
    .bias-verdict.bearish { color: var(--color-short); }
    .bias-verdict.neutral { color: var(--text-muted); }
    .bias-desc {
      font-size: 0.6rem;
      color: var(--text-secondary);
      font-family: var(--font-sans);
    }

    /* Metrics */
    .metric-row { display: flex; flex-direction: column; gap: 4px; }
    .row-header { display: flex; justify-content: space-between; align-items: center; }
    .label { font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.3px; }
    .ratio-text { font-size: 0.75rem; font-weight: 600; }
    .long-val { color: var(--color-long); }
    .short-val { color: var(--color-short); }
    .sep { color: var(--text-muted); margin: 0 4px; }

    /* Interpretation */
    .interpretation {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      background: var(--bg-primary);
      border-radius: 4px;
      font-size: 0.6rem;
      color: var(--text-secondary);
      font-family: var(--font-sans);
    }
    .interp-icon { font-size: 0.7rem; }

    /* Bars */
    .split-bar {
      height: 5px;
      background: var(--bg-tertiary);
      border-radius: 3px;
      display: flex;
      overflow: hidden;
      position: relative;
    }
    .split-bar.thin { height: 3px; }
    .bar-long { background: var(--color-long); transition: width 0.5s ease; opacity: 0.8; }
    .bar-short { background: var(--color-short); transition: width 0.5s ease; opacity: 0.8; }
    .center-mark { position: absolute; left: 50%; top: -1px; bottom: -1px; width: 1px; background: var(--text-muted); }

    /* Gauge */
    .gauge-section { gap: 6px; }
    .gauge-track {
      height: 8px;
      background: linear-gradient(to right, var(--color-short-dim), var(--bg-tertiary) 35%, var(--bg-tertiary) 65%, var(--color-long-dim));
      border-radius: 4px;
      position: relative;
      border: 1px solid var(--border-primary);
    }
    .gauge-needle {
      position: absolute;
      top: -4px; bottom: -4px;
      width: 3px;
      background: var(--text-primary);
      border-radius: 2px;
      transition: left 0.8s ease;
      box-shadow: 0 0 6px rgba(255,255,255,0.4);
    }
    .gauge-labels { display: flex; justify-content: space-between; font-size: 0.5rem; font-weight: 600; }
    .gauge-pct { color: var(--text-secondary); font-size: 0.65rem; }

    .alert-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--color-warning-dim);
      border: 1px solid var(--color-warning);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 0.6rem;
      color: var(--color-warning);
      font-family: var(--font-sans);
    }
    .alert-icon { font-size: 0.8rem; }
  `]
})
export class PositioningMatrixComponent {
  @Input() data: any;

  overallBias = 0.5;
  biasLabel = 'NEUTRAL';
  biasDescription = 'Market is balanced';
  retailInterpretation = '';
  retailInterpIcon = '⚖️';
  smartInterpretation = '';
  smartInterpIcon = '⚖️';
  whaleInterpretation = '';
  whaleInterpIcon = '⚖️';

  ngOnChanges(): void {
    if (!this.data) return;

    // Retail interpretation
    const rLong = this.data.global.long;
    if (rLong > 0.65) { this.retailInterpretation = 'Retail heavily long — crowded, squeeze risk if price drops'; this.retailInterpIcon = '🔴'; }
    else if (rLong > 0.55) { this.retailInterpretation = 'Retail leaning long — moderate bullish sentiment'; this.retailInterpIcon = '🟢'; }
    else if (rLong < 0.35) { this.retailInterpretation = 'Retail heavily short — crowded, squeeze risk if price pumps'; this.retailInterpIcon = '🔴'; }
    else if (rLong < 0.45) { this.retailInterpretation = 'Retail leaning short — moderate bearish sentiment'; this.retailInterpIcon = '🔴'; }
    else { this.retailInterpretation = 'Retail is balanced — no clear crowd bias'; this.retailInterpIcon = '⚖️'; }

    // Smart Money interpretation
    const sLong = this.data.topAccounts.long;
    if (sLong > 0.6) { this.smartInterpretation = 'Smart money is bullish — following the trend'; this.smartInterpIcon = '🟢'; }
    else if (sLong < 0.4) { this.smartInterpretation = 'Smart money is bearish — risk of downside'; this.smartInterpIcon = '🔴'; }
    else { this.smartInterpretation = 'Smart money is neutral — waiting for a catalyst'; this.smartInterpIcon = '⚖️'; }

    // Whale interpretation
    const wLong = this.data.topPositions.long;
    if (wLong > 0.6) { this.whaleInterpretation = 'Whales are net LONG — big money betting on up'; this.whaleInterpIcon = '🐋🟢'; }
    else if (wLong < 0.4) { this.whaleInterpretation = 'Whales are net SHORT — big money betting on down'; this.whaleInterpIcon = '🐋🔴'; }
    else { this.whaleInterpretation = 'Whales are hedged — no strong directional bias'; this.whaleInterpIcon = '🐋⚖️'; }

    // Overall Bias (weighted: whale 50%, smart 30%, retail 20% — inverted for retail as contrarian)
    const retailContrarian = 1 - rLong; // Contrarian: heavy retail long = bearish signal
    this.overallBias = wLong * 0.5 + sLong * 0.3 + retailContrarian * 0.2;
    if (this.overallBias > 0.6) { this.biasLabel = 'BULLISH'; this.biasDescription = 'Whales and smart money favor upside'; }
    else if (this.overallBias < 0.4) { this.biasLabel = 'BEARISH'; this.biasDescription = 'Whales and smart money favor downside'; }
    else { this.biasLabel = 'NEUTRAL'; this.biasDescription = 'No strong consensus — market is balanced'; }
  }

  isDivergent(): boolean {
    if (!this.data) return false;
    return (this.data.global.long > 0.6 && this.data.topPositions.short > 0.55) ||
      (this.data.global.short > 0.6 && this.data.topPositions.long > 0.55);
  }
}
