
import { User } from '../types';

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

export const createAuditLog = (user: User, action: AuditAction, module: string, details: string) => {
  const logs: AuditEntry[] = JSON.parse(localStorage.getItem('school_audit_logs') || '[]');
  
  const newEntry: AuditEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    }).replace(',', ' at'),
    user: user.name,
    role: user.role,
    action,
    module,
    details
  };

  const updatedLogs = [newEntry, ...logs].slice(0, 1000); // Keep last 1000 entries
  localStorage.setItem('school_audit_logs', JSON.stringify(updatedLogs));
  
  // Dispatch event for components listening to storage
  window.dispatchEvent(new Event('storage'));
};

export const getAuditLogs = (): AuditEntry[] => {
  return JSON.parse(localStorage.getItem('school_audit_logs') || '[]');
};
