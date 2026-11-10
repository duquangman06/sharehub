import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
@Component({
  standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<div class="container page"><div class="row mb wrap"><h1 style="margin:0;flex:1">Admin Dashboard</h1>
    <a class="chip" routerLink="management" routerLinkActive="on">Thành viên, đơn & uy tín</a><a class="chip" routerLink="overview" routerLinkActive="on">Overview</a><a class="chip" routerLink="moderation" routerLinkActive="on">Moderation & eKYC</a><a class="chip" routerLink="disputes" routerLinkActive="on">Dispute room</a></div><router-outlet /></div>`,
})
export class AdminShellComponent {}
