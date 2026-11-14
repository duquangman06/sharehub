import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, ToastService } from '../core/services';

/** Cross-Field Validation: so sánh mật khẩu & xác nhận (Chương V) */
const match = (g: AbstractControl): ValidationErrors | null =>
  g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true };
/** Custom Validation: độ mạnh mật khẩu */
const strong = (c: AbstractControl): ValidationErrors | null =>
  /(?=.*[A-Za-z])(?=.*\d).{6,}/.test(c.value || '') ? null : { weak: true };

@Component({
  standalone: true, imports: [ReactiveFormsModule],
  styles: [`.wrap{max-width:440px;margin:0 auto}.tabs{display:grid;grid-template-columns:1fr 1fr;background:var(--g-soft);border-radius:12px;padding:4px;margin-bottom:18px}
    .tabs button{border:0;background:none;padding:10px;border-radius:9px;font:600 .95rem Inter;cursor:pointer}.tabs button.on{background:#fff;box-shadow:var(--sh);color:var(--g)}
    .bar{height:6px;border-radius:3px;background:#e4ece8;margin-top:6px;overflow:hidden}.bar i{display:block;height:100%;transition:.2s}`],
  template: `
  <div class="container page auth-page"><div class="wrap card">
    <h2 class="center">Chào mừng đến ShareHub</h2>
    <div class="tabs"><button [class.on]="mode() === 'login'" (click)="mode.set('login')">Đăng nhập</button><button [class.on]="mode() === 'register'" (click)="mode.set('register')">Đăng ký</button></div>
    @if (mode() === 'login') {
      <form [formGroup]="loginForm" (ngSubmit)="doLogin()" class="col">
        <div><label for="auth-field-1">Email</label><input id="auth-field-1" formControlName="email" type="email" placeholder="an@sharehub.vn" [class.is-invalid]="bad(loginForm,'email')">
          @if (bad(loginForm,'email')) { <div class="err">Vui lòng nhập email hợp lệ.</div> }</div>
        <div><label for="auth-field-2">Mật khẩu</label><input id="auth-field-2" formControlName="password" type="password" [class.is-invalid]="bad(loginForm,'password')">
          @if (bad(loginForm,'password')) { <div class="err">Vui lòng nhập mật khẩu.</div> }</div>
        <div class="row between small"><label class="row" style="margin:0"><input type="checkbox" formControlName="rememberMe"> Ghi nhớ đăng nhập</label><a style="color:var(--g);cursor:pointer" (click)="toast.show('Khôi phục mật khẩu hiện là chức năng minh họa.')">Quên mật khẩu?</a></div>
        <button class="btn block" [disabled]="loginForm.invalid || busy()">Đăng nhập</button>
        <div class="small mut center">Dùng thử: an&#64;sharehub.vn / 123456 · admin&#64;sharehub.vn / Admin&#64;123</div>
      </form>
    } @else {
      <form [formGroup]="regForm" (ngSubmit)="doRegister()" class="col">
        <div><label for="auth-field-3">Họ và tên</label><input id="auth-field-3" formControlName="name" [class.is-invalid]="bad(regForm,'name')">@if (bad(regForm,'name')) {<div class="err">Vui lòng nhập họ tên.</div>}</div>
        <div><label for="auth-field-4">Email</label><input id="auth-field-4" formControlName="email" type="email" [class.is-invalid]="bad(regForm,'email')">@if (bad(regForm,'email')) {<div class="err">Vui lòng nhập email hợp lệ.</div>}</div>
        <div><label for="auth-field-5">Số điện thoại</label><input id="auth-field-5" formControlName="phone" [class.is-invalid]="bad(regForm,'phone')">@if (bad(regForm,'phone')) {<div class="err">Số điện thoại cần có 9–11 chữ số.</div>}</div>
        <div><label for="auth-field-6">Mật khẩu</label><input id="auth-field-6" formControlName="password" type="password" [class.is-invalid]="bad(regForm,'password')">
          <div class="bar"><i [style.width.%]="strength()" [style.background]="strength() < 50 ? '#d64545' : strength() < 80 ? '#e9a23b' : '#0b8a63'"></i></div>
          @if (bad(regForm,'password')) {<div class="err">Tối thiểu 6 ký tự, gồm chữ và số.</div>}</div>
        <div><label for="auth-field-7">Nhập lại mật khẩu</label><input id="auth-field-7" formControlName="confirm" type="password" [class.is-invalid]="regForm.errors?.['mismatch'] && regForm.get('confirm')?.touched">
          @if (regForm.errors?.['mismatch'] && regForm.get('confirm')?.touched) {<div class="err">Mật khẩu xác nhận chưa khớp.</div>}</div>
        <label class="row small" style="font-weight:500"><input type="checkbox" formControlName="terms"> Tôi đồng ý với điều khoản sử dụng</label>
        <button class="btn block" [disabled]="regForm.invalid || busy()">Tạo tài khoản</button>
      </form>
    }
    <div class="row" style="margin:16px 0"><hr style="flex:1;border:0;border-top:1px solid var(--line)"><span class="small mut">hoặc tiếp tục với</span><hr style="flex:1;border:0;border-top:1px solid var(--line)"></div>
    <div class="grid g2"><button class="btn ghost" (click)="toast.show('Đăng nhập Google hiện là giao diện minh họa.')">Google</button><button class="btn ghost" (click)="toast.show('Đăng nhập Facebook hiện là giao diện minh họa.')">Facebook</button></div>
  </div></div>`,
})
export class AuthComponent implements OnInit {
  private fb = inject(FormBuilder); private auth = inject(AuthService); private router = inject(Router); private route = inject(ActivatedRoute);
  toast = inject(ToastService);
  mode = signal<'login' | 'register'>('login'); busy = signal(false);
  loginForm = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required], rememberMe: [false] });
  regForm = this.fb.nonNullable.group({
    name: ['', Validators.required], email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{9,11}$/)]],
    password: ['', [Validators.required, strong]], confirm: ['', Validators.required], terms: [false, Validators.requiredTrue],
  }, { validators: match });
  ngOnInit() {
    // Cookie "Remember me": điền sẵn email lần sau
    this.auth.load().subscribe(() => {
      if (this.auth.rememberedEmail) this.loginForm.patchValue({ email: this.auth.rememberedEmail, rememberMe: true });
    });
  }
  bad(f: any, k: string) { const c = f.get(k); return c.invalid && (c.touched || c.dirty); }
  strength() { const v = this.regForm.value.password || ''; return Math.min(100, v.length * 12 + (/\d/.test(v) ? 20 : 0) + (/[A-Z]/.test(v) ? 15 : 0)); }
  private done() { this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/'); }
  doLogin() { this.busy.set(true); this.auth.login(this.loginForm.getRawValue()).subscribe({ next: () => this.done(), error: e => { this.busy.set(false); this.toast.show(e.error?.message || 'Đăng nhập không thành công', true); } }); }
  doRegister() { this.busy.set(true); const { confirm, terms, ...b } = this.regForm.getRawValue();
    this.auth.register(b).subscribe({ next: () => this.done(), error: e => { this.busy.set(false); this.toast.show(e.error?.message || 'Đăng ký không thành công', true); } }); }
}
