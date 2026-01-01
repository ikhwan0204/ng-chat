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

      // 2. Insert text AND the sender ID, then select the data back with user info
      const { data, error } = await this.supabase
        .from('chat')
        .insert({
          text: text,
          sender: userId,
        })
        .select('*,users(*)')
        .single();

      if (error) {
        alert(error.message);
        return null;
      }

      return data;
    } catch (error) {
      alert(error);
      return null;
    }
  }

  async listChat() {
    try {
      const { data, error } = await this.supabase
        .from('chat')
        .select('*,users(*)')
        .order('created_at', { ascending: true });

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

  private realtimeChannel: any;

  subscribeToChatChanges(callback: (payload: any) => void) {
    // Cleanup previous subscription if exists
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }

    console.log('Initializing Realtime connection...');
    this.realtimeChannel = this.supabase
      .channel('room1')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat' },
        (payload) => {
          console.log('Change received!', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime Status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to chat changes');
        }
      });

    return this.realtimeChannel;
  }

  unsubscribeFromChat() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  async getChatById(id: string) {
    const { data, error } = await this.supabase
      .from('chat')
      .select('*,users(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching chat by id:', error);
      return null;
    }
    return data;
  }
}
