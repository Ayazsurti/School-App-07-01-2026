
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfordtxirmjeogqthbtv.supabase.co';
const supabaseAnonKey = 'sb_publishable_UM7jqQWzi2dxxow1MmAEZA_V1zwXxmt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SQL COMMANDS TO RUN IN SUPABASE SQL EDITOR:
 * 
 * -- 1. Create Notices Table
 * create table if not exists public.notices (
 *   id uuid default gen_random_uuid() primary key,
 *   title text not null,
 *   content text not null,
 *   category text not null,
 *   date text not null,
 *   posted_by text not null,
 *   attachments jsonb default '[]'::jsonb,
 *   created_at timestamp with time zone default now()
 * );
 * 
 * -- 2. Enable Real-time for Notices
 * alter publication supabase_realtime add table notices;
 */

export const db = {
  notices: {
    async getAll() {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insert(notice: any) {
      const { data, error } = await supabase
        .from('notices')
        .insert([{
          title: notice.title,
          content: notice.content,
          category: notice.category,
          date: notice.date,
          posted_by: notice.postedBy,
          attachments: notice.attachments
        }]);
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  }
};
