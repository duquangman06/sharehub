import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, ToastService } from '../../core/services';
import { VietnamesePipe } from '../../shared/vietnamese';
@Component({selector:'app-kyc-review',standalone:true,imports:[FormsModule,VietnamesePipe],styleUrl:'./admin-workflows.css',template:`
<section class="card kyc-workspace mb">
  <div class="section-head"><div><span class="eyebrow">HỒ SƠ & LỊCH SỬ XÉT DUYỆT</span><h2>Xác minh danh tính</h2><p>Đối chiếu thông tin, xem hai mặt giấy tờ và lưu căn cứ cho mỗi quyết định.</p></div><span class="source-badge">● Lưu trên MongoDB</span></div>
  <div class="toolbar"><div class="row wrap">@for(t of tabs;track t.id){<button class="chip" [class.on]="filter()===t.id" (click)="filter.set(t.id);selectedId.set('')">{{t.label}} <b>{{count(t.id)}}</b></button>}</div><div class="row"><button class="btn ghost sm" [disabled]="loading()" (click)="load()">Tải lại</button><button class="btn ghost sm" [disabled]="demoBusy()" (click)="demo()">{{demoBusy()?'Đang lưu bộ demo…':'Bổ sung bộ demo'}}</button></div></div>
  @if(error()){<p class="error-notice" role="alert">Chưa tải được hồ sơ. Hãy thử tải lại.</p>}
  @if(loading()){<div class="spinner"></div>} @else {
  <div class="review-layout"><aside class="case-list" aria-label="Danh sách hồ sơ">
    @for(u of visible();track u._id){<button class="case-select" [class.selected]="selected()?._id===u._id" (click)="selectedId.set(u._id)"><div class="row between"><b>{{u.name}}</b><span class="badge" [class.warn]="u.kycStatus==='pending'">{{u.kycStatus|vi}}</span></div><span>{{u.email}}</span><small>{{u.kycSubmission?.documentType==='passport'?'Hộ chiếu':'CCCD'}} · {{u.kycImages?.length||0}}/2 ảnh @if(u.isDemo){· MÔ PHỎNG}</small></button>}
    @empty{<div class="empty">Không có hồ sơ ở trạng thái này.</div>}
  </aside>
  <div class="review-detail">@if(selected();as u){
    @if(u.isDemo){<div class="demo-notice"><b>Hồ sơ mô phỏng</b> · Thông tin và giấy tờ hoàn toàn giả lập, không có giá trị pháp lý. Có thể dùng để thực hành duyệt hoặc từ chối.</div>}
    <div class="identity-meta"><div><small>Họ tên trên hồ sơ</small><b>{{u.kycSubmission?.fullName||u.name}}</b></div><div><small>Loại giấy tờ</small><b>{{u.kycSubmission?.documentType==='passport'?'Hộ chiếu':'CCCD'}}</b></div><div><small>Mã hồ sơ / số giấy tờ đã khai</small><b>{{u.kycSubmission?.documentNumber||'Chưa khai báo'}}</b></div><div><small>Thời điểm gửi</small><b>{{date(u.kycSubmission?.submittedAt||u.kycConsentAt||u.createdAt)}}</b></div></div>
    <div class="evidence-grid">@for(side of [0,1];track side){<div><h3>{{side===0?'Mặt trước / trang thông tin':'Mặt sau / trang bổ trợ'}}</h3>@if(u.kycImages?.[side]){<a [href]="u.kycImages[side]" target="_blank" rel="noopener" class="document-preview"><img [src]="u.kycImages[side]" [alt]="side===0?'Giấy tờ mặt trước':'Giấy tờ mặt sau'"><span>Mở ảnh đầy đủ ↗</span></a>}@else{<div class="missing-evidence">Chưa có ảnh giấy tờ</div>}</div>}</div>
    <p class="small mut">{{u.kycConsentAt?'Đã ghi nhận thông tin đồng ý xử lý hồ sơ.':'Hồ sơ cũ chưa ghi nhận đồng ý xử lý; không thể duyệt.'}} Ảnh giấy tờ chỉ dành cho chủ hồ sơ và quản trị viên.</p>
    @if(u.kycStatus==='pending'){
      <label [for]="'kyc-note-'+u._id">Căn cứ đối chiếu / lý do từ chối <span class="required">*</span></label><textarea rows="3" [id]="'kyc-note-'+u._id" [(ngModel)]="notes[u._id]" maxlength="2000" placeholder="Ví dụ: Hai mặt rõ nét, thông tin hồ sơ khớp với giấy tờ mô phỏng."></textarea><div class="form-hint">Cần ít nhất 10 ký tự. Không duyệt khi thiếu ảnh hoặc thông tin đồng ý.</div>
      <div class="row wrap mt"><button class="btn" [disabled]="busy() || !canApprove(u)" (click)="decide(u,'approve')">Duyệt hồ sơ</button><button class="btn danger" [disabled]="busy() || !validNote(u)" (click)="decide(u,'reject')">Từ chối hồ sơ</button>@if(busy()){<span class="small mut">Đang lưu quyết định…</span>}</div>
    } @else {<div class="decision-result"><b>Kết quả: {{u.kycStatus|vi}}</b><p>{{u.kycReview?.note}}</p><small>{{date(u.kycReview?.reviewedAt)}} · {{u.kycReview?.reviewedBy?.name||'Quản trị viên'}}</small></div>}
    @if(u.kycHistory?.length){<details class="mt"><summary>Lịch sử xử lý ({{u.kycHistory.length}})</summary>@for(h of u.kycHistory;track $index){<p class="history-line"><b>{{h.status|vi}}</b> · {{date(h.reviewedAt)}}<br>{{h.note}}</p>}</details>}
  } @else {<div class="empty">Chọn một hồ sơ để xem thông tin.</div>}</div></div>}
</section>`})
export class KycReviewComponent implements OnInit{
  private api=inject(ApiService);private toast=inject(ToastService);
  items=signal<any[]>([]);loading=signal(false);busy=signal(false);demoBusy=signal(false);error=signal(false);filter=signal('pending');selectedId=signal('');notes:Record<string,string>={};
  tabs=[{id:'pending',label:'Chờ duyệt'},{id:'verified',label:'Đã duyệt'},{id:'rejected',label:'Đã từ chối'},{id:'all',label:'Tất cả hồ sơ'}];
  ngOnInit(){this.load();} visible(){return this.items().filter(u=>this.filter()==='all'||u.kycStatus===this.filter());}
  selected(){return this.visible().find(u=>u._id===this.selectedId())||this.visible()[0];}
  count(status:string){return this.items().filter(u=>status==='all'||u.kycStatus===status).length;}
  date(v:any){return v?new Date(v).toLocaleString('vi-VN'):'Chưa ghi nhận';}
  validNote(u:any){return (this.notes[u._id]||'').trim().length>=10;}
  canApprove(u:any){return this.validNote(u)&&u.kycImages?.length===2&&!!u.kycConsentAt;}
  load(){this.loading.set(true);this.error.set(false);this.api.get<any[]>('/api/admin/kyc',{status:'all'}).subscribe({next:r=>{this.items.set(r);this.loading.set(false);},error:()=>{this.loading.set(false);this.error.set(true);}});}
  decide(u:any,action:string){if(this.busy()||!this.validNote(u))return;this.busy.set(true);this.api.post('/api/admin/kyc/'+u._id+'/'+action,{note:this.notes[u._id]}).subscribe({next:()=>{this.busy.set(false);this.filter.set(action==='approve'?'verified':'rejected');this.selectedId.set(u._id);this.toast.show('Đã lưu kết quả xét duyệt vào MongoDB.');this.load();},error:()=>this.busy.set(false)});}
  demo(){this.demoBusy.set(true);this.api.post<any>('/api/admin/demo/setup').subscribe({next:r=>{this.demoBusy.set(false);this.toast.show(r.alreadyInstalled?'Bộ demo đã có trên MongoDB; giữ nguyên kết quả đã xử lý.':'Đã lưu bộ demo và ảnh GridFS vào MongoDB.');this.filter.set('pending');this.load();},error:()=>this.demoBusy.set(false)});}
}
