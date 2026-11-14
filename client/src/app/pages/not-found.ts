import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({ standalone: true, imports: [RouterLink], template: `
  <div class="container page center"><div style="font-size:5rem">🧭</div><h1>404 – Không tìm thấy trang</h1>
  <p class="mut">Trang bạn tìm không tồn tại hoặc đã được chuyển đi.</p><a routerLink="/" class="btn">Về trang chủ</a></div>` })
export class NotFoundComponent {}
