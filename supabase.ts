import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfordtxirmjeogqthbtv.supabase.co';
const supabaseAnonKey = 'sb_publishable_UM7jqQWzi2dxxow1MmAEZA_V1zwXxmt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * DATABASE SCHEMA RECOMMENDATION:
 * 
 * 1. students: id, grNumber, fullName, class, section, rollNo, profileImage, etc.
 * 2. attendance_records: id, date, userId, status, markedBy
 * 3. school_audit_logs: id, timestamp, user, role, action, module, details
 * 4. fee_ledger: id, studentId, amount, date, status, type, receiptNo
 * 5. notices: id, title, content, date, category, postedBy
 */