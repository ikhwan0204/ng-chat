import { Injectable, signal } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment.development';
import { Ichat } from '../interface/chat-interface';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  supabase!: SupabaseClient;
  public savedChat = signal({});

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  async chatMessage(text: string) {
    try {
      // 1. Get the current logged-in user
      const user = await this.supabase.auth.getUser();
      const userId = user.data.user?.id;

      // 2. Insert text AND the sender ID
      const { data, error } = await this.supabase.from('chat').insert({ 
        text: text,
        sender: userId 
      });

      if (error) {
        alert(error.message);
      }
    } catch (error) {
      alert(error);
    }
  }

  async listChat() {
    try {
      const { data, error } = await this.supabase
        .from('chat')
        .select('*,users(*)');

      if (error) {
        alert(error.message);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async deleteChat(id: string) {
    const data = await this.supabase.from('chat').delete().eq('id', id);

    return data;
  }

  selectedChats(msg: Ichat) {
    this.savedChat.set(msg);
  }
}
