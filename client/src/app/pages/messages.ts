import { Component, ElementRef, inject, Input, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { ApiService, AuthService, money } from '../core/services';

@Component({
  standalone: true, imports: [RouterLink, FormsModule],
  styles: [`.lay{display:grid;grid-template-columns:320px 1fr;gap:0;height:calc(100vh - 170px);min-height:480px;padding:0;overflow:hidden}
    .side{border-right:1px solid var(--line);overflow:auto}.conv{display:flex;gap:10px;padding:14px;border-bottom:1px solid var(--line);cursor:pointer;align-items:center}.conv:hover,.conv.on{background:var(--g-soft)}
    .main{display:flex;flex-direction:column;min-width:0}.msgs{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:#f7fbf9}
    .m{max-width:70%;padding:9px 13px;border-radius:14px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.06);align-self:flex-start}.m.me{align-self:flex-end;background:var(--g);color:#fff}.m img{max-width:220px;border-radius:10px;display:block}
    .n{background:var(--bad);color:#fff;border-radius:99px;font-size:.7rem;padding:2px 7px;margin-left:auto}`],
  template: `
  <div class="container page"><div class="card lay">
    <div class="side">@for (c of convs(); track c.userId) {
      <a class="conv" [class.on]="c.userId === userId" [routerLink]="['/messages', c.userId]"><div class="ph" style="width:40px;height:40px;border-radius:50%;font-size:1.1rem">👤</div>
        <div style="min-width:0"><b>{{ c.user?.name }}</b><div class="small mut" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ c.last.text || '📷 Photo' }}</div></div>
        @if (c.unread) { <span class="n">{{ c.unread }}</span> }</a>
    } @empty { <div class="empty">No conversations yet.<br>Open a listing and press “Message”.</div> }</div>
    <div class="main">
      @if (!userId) { <div class="empty" style="margin:auto">Select a conversation</div> }
      @else {
        <div class="row between" style="padding:12px 16px;border-bottom:1px solid var(--line)"><b>{{ other()?.name }}</b>
          @if (ctx(); as c) { <a class="badge" [routerLink]="c.booking ? ['/bookings', c.booking._id] : ['/assets', c.asset?._id]">
            {{ c.asset?.title }} @if (c.booking) { · {{ c.booking.status.replace('_',' ') }} · {{ money(c.booking.total) }} } </a> } </div>
        <div class="msgs" #box>@for (m of msgs(); track m._id) { <div class="m" [class.me]="m.from === me()">@if (m.image) { <img [src]="m.image"> } {{ m.text }}</div> }</div>
        <div class="row" style="padding:12px;border-top:1px solid var(--line)">
          <label class="btn ghost sm" style="margin:0">📷<input type="file" accept="image/*" hidden (change)="send($any($event.target).files[0])"></label>
          <input [(ngModel)]="text" (keyup.enter)="send()" placeholder="Type a message…"><button class="btn" (click)="send()">Send</button></div>
      }
    </div>
  </div></div>`,
})
export class MessagesComponent implements OnInit, OnDestroy {
  @Input() userId = '';           // :userId từ route
  @Input() asset = ''; @Input() booking = '';   // query params
  @ViewChild('box') box?: ElementRef<HTMLElement>;
  private api = inject(ApiService); private auth = inject(AuthService); money = money;
  convs = signal<any[]>([]); msgs = signal<any[]>([]); other = signal<any>(null); text = ''; private sub?: Subscription;
  me = () => this.auth.user()?._id;
  ctx = () => { const m = [...this.msgs()].reverse().find(x => x.booking || x.asset); return m ? { booking: m.booking, asset: m.asset } : null; };
  ngOnInit() { this.refresh(); this.sub = interval(3000).subscribe(() => this.refresh()); }   // polling thời gian thực
  ngOnDestroy() { this.sub?.unsubscribe(); }
  refresh() {
    this.api.get<any[]>('/api/chat/conversations').subscribe(c => {
      if (this.userId && !c.find(x => x.userId === this.userId)) this.api.get<any>('/api/chat/' + this.userId).subscribe(r => c = [{ userId: this.userId, user: r.user, last: { text: '' }, unread: 0 }, ...c]);
      this.convs.set(c);
    });
    if (this.userId) this.api.get<any>('/api/chat/' + this.userId).subscribe(r => {
      const grew = r.messages.length !== this.msgs().length; this.other.set(r.user); this.msgs.set(r.messages);
      if (grew) setTimeout(() => this.box && (this.box.nativeElement.scrollTop = 1e9), 30);
    });
  }
  send(file?: File) {
    if (!this.text.trim() && !file) return;
    const fd = new FormData(); fd.append('text', this.text);
    const c = this.ctx(); const a = this.asset || c?.asset?._id, b = this.booking || c?.booking?._id;
    if (a) fd.append('asset', a); if (b) fd.append('booking', b); if (file) fd.append('image', file);
    this.api.post('/api/chat/' + this.userId, fd).subscribe(() => { this.text = ''; this.refresh(); });
  }
}
