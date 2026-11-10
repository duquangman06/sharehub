import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({ standalone: true, imports: [RouterLink], template: `
  <div class="container page center"><div style="font-size:5rem">🧭</div><h1>404 – Page not found</h1>
  <p class="mut">The page you are looking for does not exist.</p><a routerLink="/" class="btn">Back to home</a></div>` })
export class NotFoundComponent {}
