import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
@Component({
  standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<div class="container page workspace-shell"><div class="row mb wrap"><h1 style="margin:0;flex:1">Trung tâm quản trị</h1>
    <a class="chip" routerLink="management" routerLinkActive="on">Thành viên, đơn & uy tín</a><a class="chip" routerLink="overview" routerLinkActive="on">Tổng quan</a><a class="chip" routerLink="moderation" routerLinkActive="on">Kiểm duyệt & xác minh</a><a class="chip" routerLink="disputes" routerLinkActive="on">Xử lý tranh chấp</a></div><router-outlet /></div>`,
})
export class AdminShellComponent {}
