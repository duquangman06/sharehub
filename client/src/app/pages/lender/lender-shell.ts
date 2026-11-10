import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
/** Nested Routes: layout cha chứa <router-outlet> cho các trang con */
@Component({
  standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<div class="container page"><div class="row mb wrap"><h1 style="margin:0;flex:1">Lender Portal</h1>
    <a class="chip" routerLink="assets" routerLinkActive="on">My assets</a><a class="chip" routerLink="orders" routerLinkActive="on">Calendar & orders</a>
    <a class="chip" routerLink="analytics" routerLinkActive="on">Analytics & ROI</a><a class="btn sm" routerLink="assets/new">+ New asset</a></div><router-outlet /></div>`,
})
export class LenderShellComponent {}
