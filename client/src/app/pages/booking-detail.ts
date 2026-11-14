import { VietnamesePipe } from '../shared/vietnamese';
import { Component, ElementRef, inject, Input, OnInit, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';
import { ApiService, ToastService, money } from '../core/services';
import { STATUS_STEPS, fmtDate, statusIndex } from '../shared/ui';
import { STATUS_BADGE } from './my-rentals';

@Component({
  standalone: true, imports: [VietnamesePipe, RouterLink, FormsModule],
  styles: [`.ph4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ph4 img,.ph4 .e{width:100%;height:90px;object-fit:cover;border-radius:10px;background:#eef3f1;display:grid;place-items:center;color:var(--mut)}
    canvas{border:6px solid #fff;border-radius:12px;box-shadow:var(--sh)}.code{font:700 1.3rem monospace;letter-spacing:3px}`],
  template: `
  @if (!b()) { <div class="spinner"></div> } @else { <div class="container page booking-page" style="max-width:980px">
    <div class="row between"><h1>{{ b().asset.title }}</h1><span class="badge" [class]="'badge ' + badge[b().status]">{{ (b().status) | vi }}</span></div>
    <div class="small mut mb">{{ fmt(b().startDate) }} → {{ fmt(b().endDate) }} · {{ b().days }} ngày · tổng tiền {{ money(b().total) }} (tiền cọc {{ money(b().deposit) }}) · 📍 {{ b().handoverAddress }}</div>

    <div class="card"><div class="stepper">@for (s of steps; track s; let i = $index) {
      <div class="st" [class.done]="i < idx()" [class.now]="i === idx()"><i>{{ i < idx() ? '✓' : i + 1 }}</i>{{ (s) | vi }}</div> }</div>
      @if (b().status === 'rejected') { <div class="badge bad">Đã từ chối: {{ b().rejectReason }} – đã hoàn tiền</div> }
      @if (b().status === 'cancelled') { <div class="badge bad">Đã hủy – đã hoàn tiền</div> }
    </div>

    <section class="card mt"><h3>Hồ sơ giao dịch & độ tin cậy</h3><div class="row wrap">@for (u of [b().renter,b().owner]; track u._id) { <a [routerLink]="['/users',u._id]" class="chip">{{ u.name }} · {{ u.trustScore }}/100 · {{ (u.kycStatus) | vi }}</a> }</div><p class="small mut">Xem hồ sơ và các vi phạm đã xác nhận trước khi chấp nhận đơn. Chủ tài sản có quyền từ chối và hoàn tiền.</p>@if (b().termsAcceptance?.version) { <details><summary>Điều khoản đã chấp thuận: {{ b().termsAcceptance.version }} · {{ fmt(b().termsAcceptance.acceptedAt) }}</summary><ol>@for (t of b().termsAcceptance.snapshot; track t) { <li>{{ t }}</li> }</ol></details> } @else { <p class="small mut">Đơn cũ chưa ghi nhận phiên bản điều khoản.</p> }<p class="small">Biên bản nhận: {{ b().pickupNote || 'Chưa có' }} · Biên bản trả: {{ b().returnNote || 'Chưa có' }}</p></section>
    <div class="grid g2 mt" style="align-items:start">
      <!-- CHECK-IN -->
      <div class="card"><h3>📦 Nhận tài sản</h3>
        @if (b().status === 'pending') {
          <p class="mut small">Đang chờ chủ tài sản duyệt yêu cầu.</p>
          @if (b().myRole === 'owner') { <div class="row"><button class="btn" (click)="act('approve')">Chấp nhận</button><input [(ngModel)]="reason" placeholder="Lý do từ chối"><button class="btn danger" (click)="act('reject', { reason })">Từ chối</button></div> }
          @else { <button class="btn ghost" (click)="act('cancel')">Hủy đơn và hoàn tiền</button> }
        } @else if (b().status === 'paid') {
          @if (b().myRole === 'owner') { <p class="small">Cho người thuê xem mã QR này khi hai bên bàn giao tài sản.</p><div class="center"><canvas #qr></canvas><div class="code">{{ b().pickupToken }}</div></div> }
          @else { <p class="small">Quét mã QR của chủ hoặc nhập mã, chụp tối đa 4 ảnh hiện trạng và xác nhận.</p>
            <input [(ngModel)]="token" placeholder="Mã nhận tài sản" style="text-transform:uppercase"><input type="file" multiple accept="image/*" (change)="files = $any($event.target).files" class="mt">
            <textarea [(ngModel)]="handoverNote" placeholder="Biên bản: serial, phụ kiện, tình trạng, lỗi đã có…" class="mt"></textarea><button class="btn block mt" [disabled]="!files?.length || !handoverNote.trim()" (click)="scan('checkin')">Xác nhận đã nhận tài sản</button> }
        } @else if (b().checkinPhotos?.length) { <div class="ph4">@for (p of b().checkinPhotos; track p) { <img [src]="p"> }</div><div class="small mut mt">Ghi nhận ngày {{ fmt(b().checkinAt) }}</div>
        } @else { <p class="mut small">Chưa có ảnh được ghi nhận.</p> }
      </div>
      <!-- CHECK-OUT -->
      <div class="card"><h3>↩️ Trả tài sản</h3>
        @if (b().status === 'picked_up') {
          @if (b().myRole === 'renter') { <p class="small">Cho chủ tài sản xem mã QR này khi hoàn trả.</p><div class="center"><canvas #qr></canvas><div class="code">{{ b().returnToken }}</div></div> }
          @else { <p class="small">Quét mã QR của người thuê và chụp lại hiện trạng tài sản.</p>
            <input [(ngModel)]="token" placeholder="Mã trả tài sản" style="text-transform:uppercase"><input type="file" multiple accept="image/*" (change)="files = $any($event.target).files" class="mt">
            <textarea [(ngModel)]="handoverNote" placeholder="Biên bản: serial, phụ kiện, tình trạng, lỗi đã có…" class="mt"></textarea><button class="btn block mt" [disabled]="!files?.length || !handoverNote.trim()" (click)="scan('checkout')">Xác nhận đã trả tài sản</button> }
        } @else if (b().status === 'returned' && b().myRole === 'owner') {
          <p class="small">Đã trả tài sản. Hãy kiểm tra hiện trạng trước khi hoàn cọc.</p><button class="btn block" (click)="act('complete')">Release tiền cọc & complete</button>
        } @else if (b().checkoutPhotos?.length) { <div class="ph4">@for (p of b().checkoutPhotos; track p) { <img [src]="p"> }</div>
        } @else { <p class="mut small">Thực hiện sau khi đã nhận tài sản.</p> }
      </div>
    </div>

    @if (['picked_up','returned'].includes(b().status)) {
      <div class="card mt"><h3>Bạn gặp vấn đề với đơn thuê?</h3><div class="row"><input [(ngModel)]="issue" placeholder="Mô tả hư hỏng, trầy xước hoặc khác biệt so với tin đăng…"><button class="btn danger" [disabled]="!issue" (click)="act('dispute', { reason: issue })">Báo sự cố / Khiếu nại</button></div></div> }
    @if (b().status === 'disputed') { <div class="card mt"><span class="badge bad">Đang xử lý tranh chấp</span> <span class="small">{{ b().dispute?.reason }} – quản trị viên đang xem xét bằng chứng.</span></div> }
    @if (b().status === 'paid' && b().myRole === 'renter') { <button class="btn ghost mt" (click)="act('cancel')">Hủy trước khi nhận & hoàn tiền</button> }
    @if (b().dispute) { <section class="card mt"><h3>Phản hồi & bằng chứng của hai bên</h3>@for (e of b().dispute.responses; track $index) { <p class="small"><b>{{ e.from === b().renter._id ? b().renter.name : b().owner.name }}</b> · {{ fmt(e.at) }}<br>{{ e.note }}</p><div class="ph4">@for (p of e.photos; track p) { <img [src]="p" alt="Bằng chứng tranh chấp"> }</div> }@if (b().status === 'disputed' && b().myRole !== 'admin') { <textarea [(ngModel)]="evidenceNote" placeholder="Phản hồi, hiện trạng và đề nghị xử lý"></textarea><input type="file" multiple accept="image/*" (change)="evidenceFiles = $any($event.target).files"><button class="btn mt" [disabled]="evidenceNote.trim().length < 10" (click)="sendEvidence()">Gửi bằng chứng cho quản trị viên</button> }</section> }
    @if (b().dispute?.status === 'resolved') { <div class="card mt"><b>Kết quả xử lý tranh chấp:</b> {{ b().dispute.refundToRenterPercent }}% tiền cọc hoàn cho người thuê; {{ money(b().dispute.compensationToOwner) }} bồi thường cho chủ tài sản. <i>{{ b().dispute.adminNote }}</i></div> }

    @if (b().status === 'completed' && !reviewed()) {
      <div class="card mt"><h3>Đánh giá về {{ b().myRole === 'renter' ? b().owner.name : b().renter.name }}</h3>
        <div class="row">@for (s of [1,2,3,4,5]; track s) { <button class="chip" [class.on]="rating >= s" (click)="rating = s">★</button> }</div>
        <textarea rows="2" [(ngModel)]="comment" class="mt" placeholder="Trải nghiệm thuê của bạn thế nào?"></textarea><button class="btn mt" (click)="review()">Gửi đánh giá</button></div> }
    <div class="row mt"><a class="btn ghost" [routerLink]="['/messages', b().myRole === 'renter' ? b().owner._id : b().renter._id]" [queryParams]="{ booking: b()._id }">💬 Trao đổi về đơn thuê</a></div>
  </div> }`,
})
export class BookingDetailComponent implements OnInit {
  @Input() id = '';
  private api = inject(ApiService); private toast = inject(ToastService);
  money = money; fmt = fmtDate; badge = STATUS_BADGE; steps = STATUS_STEPS;
  b = signal<any>(null); idx = () => statusIndex(this.b().status);
  evidenceNote = ''; evidenceFiles: FileList | null = null;
  sendEvidence() { const fd = new FormData(); fd.append('note',this.evidenceNote); Array.from(this.evidenceFiles || []).slice(0,4).forEach(f => fd.append('photos',f)); this.api.post('/api/bookings/' + this.id + '/dispute-evidence',fd).subscribe(() => { this.evidenceNote = ''; this.evidenceFiles = null; this.load(); }); }
  handoverNote = ''; token = ''; files: FileList | null = null; reason = ''; issue = ''; rating = 5; comment = ''; reviewedLocal = signal(false);
  private qrEl?: ElementRef<HTMLCanvasElement>;
  @ViewChild('qr') set qr(e: ElementRef<HTMLCanvasElement> | undefined) {
    if (e && e !== this.qrEl && this.b()) {
      this.qrEl = e; const t = this.b().myRole === 'owner' ? this.b().pickupToken : this.b().returnToken;
      QRCode.toCanvas(e.nativeElement, `${location.origin}/bookings/${this.id}?code=${t}`, { width: 170, margin: 1, color: { dark: '#0a6f51' } });
    }
  }
  reviewed() { return this.reviewedLocal() || (this.b().myRole === 'renter' ? this.b().reviewedByRenter : this.b().reviewedByOwner); }
  ngOnInit() { this.load(); }
  load() { this.qrEl = undefined; this.api.get<any>('/api/bookings/' + this.id).subscribe(b => this.b.set(b)); }
  act(a: string, body: any = {}) { this.api.post(`/api/bookings/${this.id}/${a}`, body).subscribe(() => { this.toast.show('Đã cập nhật.'); this.load(); }); }
  scan(kind: 'checkin' | 'checkout') {
    const fd = new FormData(); fd.append('token', this.token); fd.append('note', this.handoverNote);
    Array.from(this.files || []).slice(0, 4).forEach(f => fd.append('photos', f));
    this.api.post(`/api/bookings/${this.id}/${kind}`, fd).subscribe(() => { this.token = ''; this.files = null; this.toast.show('Đã xác nhận.'); this.load(); });
  }
  review() { this.api.post(`/api/bookings/${this.id}/review`, { rating: this.rating, comment: this.comment }).subscribe(() => { this.reviewedLocal.set(true); this.toast.show('Cảm ơn bạn đã gửi đánh giá!'); }); }
}
