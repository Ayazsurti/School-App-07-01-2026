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

/**
 * Local-First Institutional Audit Logger.
 * Stores events in school_audit_logs_v4 for local tracking.
 */
export const createAuditLog = async (user: User, action: AuditAction, module: string, details: string) => {
  const timestampStr = new Date().toLocaleString('en-GB', { 
    day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', hour12: true 
  }).replace(',', ' at');

  const logPayload: AuditEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: timestampStr,
    user: user.name,
    role: user.role,
    action,
    module,
    details
  };

  try {
    const localLogs: AuditEntry[] = JSON.parse(localStorage.getItem('school_audit_logs_v4') || '[]');
    // Maintain a rolling buffer of 1000 logs
    const updatedLogs = [logPayload, ...localLogs].slice(0, 1000);
    localStorage.setItem('school_audit_logs_v4', JSON.stringify(updatedLogs));
    
    // Broadcast storage event for real-time UI updates
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error("Local Audit Write Failure:", err);
  }
};

export const getAuditLogs = (): AuditEntry[] => {
  try {
    return JSON.parse(localStorage.getItem('school_audit_logs_v4') || '[]');
  } catch (err) {
    console.error("Local Audit Read Failure:", err);
    return [];
  }
};