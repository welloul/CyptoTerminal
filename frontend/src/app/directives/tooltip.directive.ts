import { Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';

@Directive({
    selector: '[appTooltip]',
    standalone: true
})
export class TooltipDirective {
    @Input('appTooltip') tooltipText = '';

    private tooltipEl: HTMLElement | null = null;

    constructor(private el: ElementRef, private renderer: Renderer2) { }

    @HostListener('mouseenter')
    onMouseEnter() {
        if (!this.tooltipText || this.tooltipEl) return;

        this.tooltipEl = this.renderer.createElement('div');
        this.renderer.addClass(this.tooltipEl, 'global-tooltip');

        const text = this.renderer.createText(this.tooltipText);
        this.renderer.appendChild(this.tooltipEl, text);
        this.renderer.appendChild(document.body, this.tooltipEl);

        // Position above the element
        const rect = this.el.nativeElement.getBoundingClientRect();
        const tipRect = this.tooltipEl!.getBoundingClientRect();

        let top = rect.top - tipRect.height - 8;
        let left = rect.left + rect.width / 2 - tipRect.width / 2;

        // Clamp to viewport
        if (top < 4) top = rect.bottom + 8;
        if (left < 4) left = 4;
        if (left + tipRect.width > window.innerWidth - 4) {
            left = window.innerWidth - tipRect.width - 4;
        }

        this.renderer.setStyle(this.tooltipEl, 'top', `${top}px`);
        this.renderer.setStyle(this.tooltipEl, 'left', `${left}px`);
        this.renderer.setStyle(this.tooltipEl, 'opacity', '1');
    }

    @HostListener('mouseleave')
    onMouseLeave() {
        this.removeTooltip();
    }

    private removeTooltip() {
        if (this.tooltipEl) {
            this.renderer.removeChild(document.body, this.tooltipEl);
            this.tooltipEl = null;
        }
    }

    ngOnDestroy() {
        this.removeTooltip();
    }
}
