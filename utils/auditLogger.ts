import { User } from '../types';
import { supabase } from '../supabase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'PAYMENT';

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: AuditAction;
  module: string;
  details: string;
}

export const createAuditLog = async (user: User, action: AuditAction, module: string, details: string) => {
  // Local Backup
  const localLogs: AuditEntry[] = JSON.parse(localStorage.getItem('school_audit_logs') || '[]');
  
  const timestampStr = new Date().toLocaleString('en-GB', { 
    day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', hour12: true 
  }).replace(',', ' at');

  const newEntry: AuditEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: timestampStr,
    user: user.name,
    role: user.role,
    action,
    module,
    details
  };

  const updatedLogs = [newEntry, ...localLogs].slice(0, 1000); 
  localStorage.setItem('school_audit_logs', JSON.stringify(updatedLogs));
  
  // Supabase Persistence
  try {
    const { error } = await supabase
      .from('school_audit_logs')
      .insert([
        {
          timestamp: timestampStr,
          user: user.name,
          role: user.role,
          action,
          module,
          details
        }
      ]);
      
    if (error) console.warn("Supabase Log Error:", error.message);
  } catch (err) {
    console.error("Audit Sync Failed:", err);
  }
  
  window.dispatchEvent(new Event('storage'));
};

export const getAuditLogs = (): AuditEntry[] => {
  return JSON.parse(localStorage.getItem('school_audit_logs') || '[]');
};