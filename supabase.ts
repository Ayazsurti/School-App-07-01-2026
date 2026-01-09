import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfordtxirmjeogqthbtv.supabase.co';
const supabaseAnonKey = 'sb_publishable_UM7jqQWzi2dxxow1MmAEZA_V1zwXxmt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * DATABASE SCHEMA RECOMMENDATION (Execute in Supabase SQL Editor):
 * 
 * -- 1. Students Table
 * create table students (
 *   id uuid default uuid_generate_v4() primary key,
 *   full_name text not null,
 *   gr_number text unique not null,
 *   class text not null,
 *   section text not null,
 *   roll_no text,
 *   email text,
 *   pan_number text,
 *   aadhar_number text,
 *   uid_number text,
 *   residence_address text,
 *   father_name text,
 *   mother_name text,
 *   father_mobile text,
 *   mother_mobile text,
 *   profile_image text,
 *   created_at timestamp with time zone default timezone('utc'::text, now())
 * );
 * 
 * -- 2. Curriculum Table
 * create table curriculum (
 *   id uuid default uuid_generate_v4() primary key,
 *   folder_name text not null,
 *   title text not null,
 *   metadata text,
 *   media_data text, -- Storing Base64 for the PDF content
 *   media_type text default 'pdf',
 *   uploaded_by text,
 *   created_at timestamp with time zone default timezone('utc'::text, now())
 * );
 * 
 * -- 3. Attendance Records
 * create table attendance_records (
 *   id uuid default uuid_generate_v4() primary key,
 *   date date not null,
 *   user_id uuid references students(id) on delete cascade,
 *   status text not null,
 *   marked_by text,
 *   unique(date, user_id)
 * );
 * 
 * -- 4. Fee Ledger
 * create table fee_ledger (
 *   id uuid default uuid_generate_v4() primary key,
 *   student_id uuid references students(id) on delete cascade,
 *   amount numeric not null,
 *   date date not null,
 *   status text not null,
 *   type text,
 *   receipt_no text unique
 * );
 * 
 * -- 5. Audit Logs
 * create table school_audit_logs (
 *   id uuid default uuid_generate_v4() primary key,
 *   timestamp text,
 *   "user" text,
 *   role text,
 *   action text,
 *   module text,
 *   details text
 * );
 */