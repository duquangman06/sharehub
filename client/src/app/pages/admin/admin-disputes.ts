import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, ToastService, money } from '../../core/services';
@Component({standalone:true,imports:[FormsModule,RouterLink],templateUrl:'./admin-disputes.html',styleUrl:'./admin-workflows.css'})
export class AdminDisputesComponent implements OnInit{
 private api=inject(ApiService);private toast=inject(ToastService);money=money;
 list=signal<any[]>([]);loading=signal(false);error=signal(false);busy=signal(false);demoBusy=signal(false);filter=signal('open');selectedId=signal('');
 pct:Record<string,number>={};notes:Record<string,string>={};ack:Record<string,boolean>={};
 tabs=[{id:'open',label:'Đang chờ xử lý'},{id:'resolved',label:'Đã giải quyết'},{id:'all',label:'Tất cả hồ sơ'}];
 ngOnInit(){this.load();}
 visible(){return this.list().filter(b=>this.filter()==='all'||b.dispute?.status===this.filter());}
 selected(){return this.visible().find(b=>b._id===this.selectedId())||this.visible()[0];}
 count(s:string){return this.list().filter(b=>s==='all'||b.dispute?.status===s).length;}
 load(){this.loading.set(true);this.error.set(false);this.api.get<any[]>('/api/admin/disputes',{status:'all'}).subscribe({next:r=>{this.list.set(r);this.loading.set(false);},error:()=>{this.error.set(true);this.loading.set(false);}});}
 date(v:any){return v?new Date(v).toLocaleString('vi-VN'):'Chưa ghi nhận thời điểm';}
 id(u:any){return String(u?._id||u||'');}
 responses(b:any,role:string){return (b.dispute.responses||[]).filter((e:any)=>this.id(e.from)===this.id(b[role]));}
 photos(b:any,side:string){return (side==='checkin'?b.checkinPhotos:b.checkoutPhotos)||[];}
 percent(b:any){return this.pct[b._id]??100;}
 refund(b:any){return Math.round(b.deposit*this.percent(b)/100);}
 setRefund(b:any,value:any){this.pct[b._id]=typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=b.deposit?(b.deposit?value/b.deposit*100:100):NaN;}
 netRent(b:any){return Math.max(0,b.rentalFee-(b.discount||0));}
 valid(b:any){const p=this.percent(b);return typeof p==='number'&&Number.isFinite(p)&&p>=0&&p<=100&&(this.notes[b._id]||'').trim().length>=10&&this.ack[b._id]===true;}
 resolve(b:any,dialog:HTMLDialogElement){if(this.busy()||!this.valid(b))return;this.busy.set(true);this.api.post('/api/admin/disputes/'+b._id+'/resolve',{refundToRenterPercent:this.percent(b),note:this.notes[b._id]}).subscribe({next:()=>{this.busy.set(false);dialog.close();this.filter.set('resolved');this.selectedId.set(b._id);this.toast.show('Đã lưu quyết định và phân bổ ví mô phỏng vào MongoDB.');this.load();},error:()=>this.busy.set(false)});}
 demo(){this.demoBusy.set(true);this.api.post<any>('/api/admin/demo/setup').subscribe({next:r=>{this.demoBusy.set(false);this.toast.show(r.alreadyInstalled?'Bộ demo đã có; giữ nguyên những kết quả đã xử lý.':'Đã lưu bộ tranh chấp demo và ảnh vào MongoDB.');this.filter.set('open');this.load();},error:()=>this.demoBusy.set(false)});}
}
