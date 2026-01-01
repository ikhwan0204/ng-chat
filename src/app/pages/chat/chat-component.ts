import { Component, effect, inject, signal, NgZone, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ModalComponent } from '../../layout/modal/modal-component';
import { Router } from '@angular/router';
import { Ichat } from '../../interface/chat-interface';
import { ChatService } from '../../services/chat-service';

@Component({
  selector: 'app-chat',
  imports: [ReactiveFormsModule, DatePipe, ModalComponent],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.css',
})
export class ChatComponent implements OnDestroy {
  private chat_service = inject(ChatService);
  private auth = inject(AuthService);
  chatForm!: FormGroup;
  private fb = inject(FormBuilder);
  chats = signal<Ichat[]>([]);
  currentUser = signal<any>(null);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private intervalId: any;

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  constructor() {
    const session = localStorage.getItem('session');
    if (session && session !== 'undefined') {
      this.currentUser.set(JSON.parse(session));
    }
    // Effect for auto-scroll
    effect(() => {
      if (this.chats().length > 0) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop =
        this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.log('Scroll to bottom failed:', err);
    }
  }

  ngOnInit() {
    this.onListChat();
    
    this.chatForm = this.fb.group({
      chat_message: ['', Validators.required],
    });

    // Polling fallback: Fetch chats every 2 seconds
    this.intervalId = setInterval(() => {
      this.onListChat();
    }, 2000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  onSubmit() {
    const formValue = this.chatForm.value.chat_message;
    console.log(formValue);

    this.chat_service
      .chatMessage(formValue)
      .then((res) => {
        console.log('Sent message response:', res);
        if (res) {
          // Immediately update UI for the sender (Optimistic update)
          this.chats.update((current) => {
            // Avoid duplicates if polling caught it already
            if (current.some(c => c.id === res.id)) return current;
            return [...current, res];
          });
          this.chatForm.reset();
        }
      })
      .catch((err) => {
        alert(err.message);
      });
  }

  onListChat() {
    this.chat_service
      .listChat()
      .then((res: Ichat[] | null) => {
        if (res !== null) {
          const currentChats = this.chats();
          
          // Smart update: Only update signal if data has changed
          const hasChanged = 
            res.length !== currentChats.length || 
            (res.length > 0 && res[res.length - 1].id !== currentChats[currentChats.length - 1]?.id);

          if (hasChanged) {
             this.chats.set(res);
          }
        }
      })
      .catch((err) => {
        console.error('Polling error:', err);
      });
  }

  openDropDown(msg: Ichat) {
    console.log(msg);
    this.chat_service.selectedChats(msg);
  }

  async logOut() {
    this.auth
      .signOut()
      .then(() => {
        this.router.navigate(['/login']);
      })
      .catch((err) => {
        alert(err.message);
      });
  }
}
