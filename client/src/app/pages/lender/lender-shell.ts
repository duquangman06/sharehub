import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
/** Nested Routes: layout cha chứa <router-outlet> cho các trang con */
@Component({
  standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<div class="container page workspace-shell"><div class="row mb wrap"><h1 style="margin:0;flex:1">Kênh cho thuê</h1>
    <a class="chip" routerLink="assets" routerLinkActive="on">Thiết bị của tôi</a><a class="chip" routerLink="orders" routerLinkActive="on">Lịch thuê & yêu cầu</a>
    <a class="chip" routerLink="analytics" routerLinkActive="on">Thống kê & thu hồi vốn</a><a class="btn sm" routerLink="assets/new">+ Đăng thiết bị</a></div><router-outlet /></div>`,
})
export class LenderShellComponent {}
