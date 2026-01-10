
import { User } from '../types';
import { db } from '../supabase';

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
 * Cloud-Native Institutional Audit Logger.
 * Synchronizes events with Supabase audit_logs table.
 */
export const createAuditLog = async (user: User, action: AuditAction, module: string, details: string) => {
  const timestampStr = new Date().toLocaleString('en-GB', { 
    day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', hour12: true 
  }).replace(',', ' at');

  const logPayload = {
    timestamp: timestampStr,
    user: user.name,
    role: user.role,
    action,
    module,
    details
  };

  try {
    await db.audit.insert(logPayload);
  } catch (err) {
    console.error("Cloud Audit Write Failure:", err);
  }
};

export const getAuditLogs = async (): Promise<AuditEntry[]> => {
  try {
    const data = await db.audit.getAll();
    return data.map((d: any) => ({
      id: d.id,
      timestamp: d.timestamp,
      user: d.username,
      role: d.role,
      action: d.action as AuditAction,
      module: d.module,
      details: d.details
    }));
  } catch (err) {
    console.error("Cloud Audit Read Failure:", err);
    return [];
  }
};
