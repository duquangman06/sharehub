import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, CatalogService, ToastService, money } from '../../core/services';
import { VietnamesePipe } from '../../shared/vietnamese';
@Component({standalone:true,imports:[RouterLink,VietnamesePipe],templateUrl:'./admin-overview.html',styleUrl:'./admin-overview.css'})
export class AdminOverviewComponent implements OnInit{
 private api=inject(ApiService);private toast=inject(ToastService);cat=inject(CatalogService);money=money;
 s=signal<any>(null);loading=signal(false);error=signal(false);demoBusy=signal(false);month=signal('');
 colors=['#537f9e','#83a99a','#dbb477','#bd816a','#959dc0','#a1b8bf','#d2a7a1','#a0ab8a'];
 ngOnInit(){this.load();}
 load(){this.loading.set(true);this.error.set(false);this.api.get<any>('/api/admin/stats').subscribe({next:d=>{this.s.set(d);this.loading.set(false);},error:()=>{this.error.set(true);this.loading.set(false);}});}
 demo(){this.demoBusy.set(true);this.api.post<any>('/api/admin/demo/setup').subscribe({next:r=>{this.demoBusy.set(false);this.toast.show(r.alreadyInstalled?'Bộ demo đã được lưu; không thay đổi các quyết định đã xử lý.':'Đã bổ sung dữ liệu và ảnh demo vào MongoDB.');this.load();},error:()=>this.demoBusy.set(false)});}
 cards(d:any){return [{label:'Thành viên',value:d.users,link:'/admin/management',detail:'Hồ sơ trên hệ thống'},{label:'Tin đang hiển thị',value:d.assets,link:'/admin/moderation',detail:'Có thể tìm kiếm'},{label:'Tổng đơn thuê',value:d.bookings,link:'/admin/management',detail:'Toàn bộ trạng thái'},{label:'Tin chờ duyệt',value:d.pendingAssets,link:'/admin/moderation',detail:'Cần kiểm duyệt'},{label:'Hồ sơ chờ xác minh',value:d.pendingKyc,link:'/admin/moderation',detail:'Cần đối chiếu giấy tờ'},{label:'Tranh chấp mở',value:d.openDisputes,link:'/admin/disputes',detail:'Cần xem bằng chứng'}];}
 selected(d:any){return d.series.find((p:any)=>p.key===this.month())||d.series[d.series.length-1];}
 maxRevenue(rows:any[]){return Math.max(1,...rows.map(p=>p.revenue));} bar(value:number,rows:any[]){return value/this.maxRevenue(rows)*78;}
 short(n:number){return n>=1e6?(n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' tr':n>=1e3?Math.round(n/1000)+' nghìn':'0';}
 date(v:any){return new Date(v).toLocaleString('vi-VN');}
 categoryWidth(c:any,rows:any[]){return c.revenue/Math.max(1,...rows.map(r=>r.revenue))*100;}
 donut(rows:any[],total:number){let at=0;return total?'conic-gradient('+rows.map((r,i)=>{const begin=at;at+=r.count/total*100;return this.colors[i%this.colors.length]+' '+begin+'% '+at+'%';}).join(',')+')':'#edf0ec';}
}
