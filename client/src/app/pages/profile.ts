import { RouterLink } from '@angular/router';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { AuthService, ToastService, money } from '../core/services';
import { StarsComponent } from '../shared/ui';

@Component({
  standalone: true, imports: [ReactiveFormsModule, FormsModule, StarsComponent, RouterLink],
  styles: [`.av{width:96px;height:96px;border-radius:50%;background-size:cover;background-position:center;font-size:2.4rem}.bar{height:14px;border-radius:7px;background:#e4ece8;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,#16b98a,var(--g))}
    .drop{border:2px dashed var(--line);border-radius:12px;padding:18px;text-align:center;cursor:pointer;display:block}`],
  template: `
  @if (auth.user(); as u) {
  <div class="container page"><div class="grid g2" style="grid-template-columns:1fr 1fr;align-items:start">
    <div class="col">
      <div class="card"><h2>Personal info</h2>
        <div class="row" style="margin-bottom:12px">
          @if (u.avatar) { <div class="av" [style.background-image]="'url(' + u.avatar + ')'"></div> } @else { <div class="av ph">👤</div> }
          <label class="btn ghost sm" style="margin:0">Change avatar<input type="file" accept="image/*" hidden (change)="avatar = $any($event.target).files[0]"></label>
          @if (avatar) { <span class="small mut">{{ avatar.name }}</span> }</div>
        <form [formGroup]="form" (ngSubmit)="save()" class="col">
          <div><label>Full name</label><input formControlName="name" [class.is-invalid]="form.get('name')?.invalid && form.get('name')?.touched"></div>
          <div><label>Email</label><input [value]="u.email" disabled></div>
          <div><label>Phone</label><input formControlName="phone"></div>
          <div><label>Bio</label><textarea rows="3" formControlName="bio"></textarea></div>
          <button class="btn" [disabled]="form.invalid">Save changes</button></form></div>
      <div class="card"><h3>Wallet</h3><div style="font-size:1.6rem;font-weight:800;color:var(--g)">{{ money(u.walletBalance || 0) }}</div><div class="small mut">Demo balance used for rentals and deposits.</div></div>
    </div>
    <div class="col">
      <div class="card"><h2>Trust Score</h2><a [routerLink]="['/users', u._id]" class="small">Xem lịch sử uy tín và gửi yêu cầu xem xét →</a>
        <div class="row between"><b style="font-size:2rem;color:var(--g)">{{ u.trustScore }}<small class="mut">/100</small></b><span class="badge" [class.warn]="u.trustScore < 70">{{ rank(u.trustScore) }}</span></div>
        <div class="bar"><i [style.width.%]="u.trustScore"></i></div>
        <div class="row between small mut mt"><span>⭐ <app-stars [value]="u.ratingAvg" [count]="u.ratingCount" /></span><span>{{ u.completedCount || 0 }} completed rentals</span></div>
        <p class="small mut">Điểm nội bộ = đánh giá (40) + xác minh (30) + hoàn tất (30) − vi phạm đã xác nhận; không phải điểm CIC.</p></div>
      <div class="card"><h2>Identity verification (eKYC)</h2>@if (u.kycReview?.note) { <p class="small mut">Phản hồi quản trị: {{ u.kycReview.note }}</p> }
        <div class="row between mb"><span>Status</span>
          <span class="badge" [class.warn]="u.kycStatus === 'pending'" [class.bad]="u.kycStatus === 'rejected'" [class.gray]="u.kycStatus === 'none'">
            {{ {none:'Not submitted', pending:'Under review', verified:'Verified', rejected:'Rejected'}[u.kycStatus] }}</span></div>
        @if (u.kycStatus === 'none' || u.kycStatus === 'rejected') {
          <div class="grid g2">
            <label class="drop">🪪 ID front<br><span class="small mut">{{ front?.name || 'Click to upload' }}</span><input type="file" accept="image/*" hidden (change)="front = $any($event.target).files[0]"></label>
            <label class="drop">🪪 ID back<br><span class="small mut">{{ back?.name || 'Click to upload' }}</span><input type="file" accept="image/*" hidden (change)="back = $any($event.target).files[0]"></label></div>
          <label class="row mt small"><input type="checkbox" [(ngModel)]="kycConsent"> Tôi đồng ý ShareHub xử lý 2 ảnh giấy tờ để xác minh tài khoản; chỉ tôi và quản trị viên được truy cập.</label><button class="btn block mt" [disabled]="!front || !back || !kycConsent" (click)="kyc()">Submit for verification</button>
        } @else if (u.kycStatus === 'pending') { <div class="small mut">Our admin team is reviewing your documents.</div>
        } @else { <div class="small" style="color:var(--g)">✔ Đã được quản trị viên đối chiếu giấy tờ. Tin đăng vẫn cần kiểm duyệt.</div> }
      </div>
    </div>
  </div></div> }`,
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService); private fb = inject(FormBuilder); private toast = inject(ToastService); money = money;
  kycConsent = false; avatar?: File; front?: File; back?: File;
  form = this.fb.nonNullable.group({ name: ['', Validators.required], phone: [''], bio: [''] });
  ngOnInit() { this.auth.refresh().subscribe(r => r.user && this.form.patchValue(r.user as any)); }
  rank(s: number) { return s >= 80 ? 'Trusted' : s >= 60 ? 'Reliable' : 'New member'; }
  save() { const fd = new FormData(); Object.entries(this.form.getRawValue()).forEach(([k, v]) => fd.append(k, v)); if (this.avatar) fd.append('avatar', this.avatar);
    this.auth.updateProfile(fd).subscribe(() => this.toast.show('Profile saved.')); }
  kyc() { const fd = new FormData(); fd.append('consent', String(this.kycConsent)); fd.append('docs', this.front!); fd.append('docs', this.back!);
    this.auth.submitKyc(fd).subscribe(() => this.toast.show('Documents submitted for review.')); }
}
