import { Component, ElementRef, ViewChild, effect, inject, signal, OnDestroy, Injector, afterNextRender } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AuthService, money } from '../core/services';
interface ChatMessage { role: 'user'|'assistant'; text: string; cards?: any[]; mode?: string; at?: string; }
@Component({selector:'app-rental-assistant',standalone:true,imports:[FormsModule,RouterLink],templateUrl:'./rental-assistant.html',styleUrl:'./rental-assistant.css'})
export class RentalAssistantComponent implements OnDestroy {
 private http=inject(HttpClient);private auth=inject(AuthService);private injector=inject(Injector);private identity='';private request?:Subscription;private historyRequest?:Subscription;private generation=0;
 @ViewChild('log') log?:ElementRef<HTMLElement>;@ViewChild('input') input?:ElementRef<HTMLTextAreaElement>;@ViewChild('launcher') launcher?:ElementRef<HTMLButtonElement>;
 open=signal(false);busy=signal(false);loading=signal(false);messages=signal<ChatMessage[]>([]);error=signal('');mode=signal<string|null>(null);draft='';money=money;
 prompts=['Tìm máy ảnh dưới 500.000đ mỗi ngày','Thuê lều cắm trại 2 ngày ở Biên Hòa','Tiền cọc và tiền thuê khác nhau thế nào?','Vì sao chủ chưa xác minh thì chưa đặt được?'];
 constructor(){effect(()=>{const id=this.auth.user()?._id||'guest';if(id!==this.identity){this.identity=id;this.generation++;this.request?.unsubscribe();this.historyRequest?.unsubscribe();this.messages.set([]);this.mode.set(null);this.error.set('');this.busy.set(false);this.draft='';if(this.open())this.load();}});}
 toggle(){if(this.open())this.close();else{this.open.set(true);if(!this.busy())this.load();afterNextRender(()=>this.input?.nativeElement.focus(),{injector:this.injector});}}
 close(){this.open.set(false);this.launcher?.nativeElement.focus();}
 load(){const generation=this.generation;this.loading.set(true);this.historyRequest?.unsubscribe();this.historyRequest=this.http.get<{messages:ChatMessage[];configured:boolean}>('/api/assistant/thread').subscribe({next:r=>{if(generation!==this.generation)return;this.messages.set(r.messages);this.mode.set(r.messages.filter(m=>m.role==='assistant').at(-1)?.mode||(r.configured?null:'basic'));this.loading.set(false);this.scroll();},error:()=>{if(generation!==this.generation)return;this.loading.set(false);this.error.set('Chưa tải được hội thoại. Bạn có thể thử gửi câu hỏi bên dưới.');}});}
 send(text?:string){if(this.busy()||this.loading())return;const value=(text??this.draft).trim();if(!value||value.length>1200)return;this.draft='';this.error.set('');this.busy.set(true);this.messages.update(m=>[...m,{role:'user',text:value}]);this.scroll();const generation=this.generation;
  this.request=this.http.post<any>('/api/assistant/message',{message:value}).subscribe({next:r=>{if(generation!==this.generation)return;this.messages.update(m=>[...m,{role:'assistant',text:r.text,cards:r.cards,mode:r.mode}]);this.mode.set(r.mode);this.busy.set(false);this.scroll();},error:e=>{if(generation!==this.generation)return;this.busy.set(false);this.messages.update(m=>m.slice(0,-1));this.draft=value;this.error.set(e.error?.message||'Chưa nhận được phản hồi. Câu hỏi đã được giữ lại để bạn gửi lại.');this.scroll();}});
 }
 key(event:KeyboardEvent){if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();this.send();}}
 private scroll(){afterNextRender(()=>{const el=this.log?.nativeElement;if(el)el.scrollTop=el.scrollHeight;},{injector:this.injector});}
 ngOnDestroy(){this.request?.unsubscribe();this.historyRequest?.unsubscribe();}
}
