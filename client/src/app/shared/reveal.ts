import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';
@Directive({selector:'[appReveal]', standalone:true})
export class RevealDirective implements AfterViewInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>); private observer?: IntersectionObserver;
  ngAfterViewInit() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const node = this.el.nativeElement;
    this.observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { node.classList.add('revealed'); this.observer?.disconnect(); }
    }), {threshold:.08});
    node.classList.add('reveal-ready'); this.observer.observe(node);
  }
  ngOnDestroy() { this.observer?.disconnect(); }
}
