
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://qfordtxirmjeogqthbtv.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UM7jqQWzi2dxxow1MmAEZA_V1zwXxmt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getErrorMessage = (err: any): string => {
  if (typeof err === 'string') return err;
  if (err?.code === '42501') return "Database Permission Denied (42501).";
  if (err?.code === '23505') return "Record already exists (Unique Conflict).";
  if (err?.message) return err.message;
  return "Cloud Sync Interrupted. Reconnecting...";
};

export const db = {
  auth: {
    async login(username: string, pass: string) {
      const cleanUser = (username || '').trim().toLowerCase();
      const cleanPass = (pass || '').trim();
      
      if (cleanUser === 'ayazsurti' && cleanPass === 'Ayaz78692') {
        return { id: 'admin-master', name: 'Ayaz Surti', role: 'ADMIN', profile_image: null };
      }
      
      const { data: tea, error: teaErr } = await supabase
        .from('teachers')
        .select('*')
        .eq('username', cleanUser)
        .eq('password', cleanPass)
        .single();

      if (!teaErr && tea) {
        return { 
          ...tea, 
          role: 'TEACHER', 
          id: tea.id, 
          name: tea.name, 
          class: tea.assigned_class, 
          section: tea.assigned_section,
          permissions: tea.permissions ? tea.permissions.split(', ') : []
        };
      }

      const { data: std, error: stdErr } = await supabase
        .from('students')
        .select('*')
        .eq('gr_number', username.trim().toUpperCase())
        .eq('password', cleanPass)
        .single();

      if (!stdErr && std) {
        return { 
          ...std, 
          role: 'STUDENT', 
          id: std.id, 
          name: std.full_name, 
          class: String(std.class || '').trim(), 
          section: std.section,
          accessRights: std.access_rights || [],
          feeOverrides: std.fee_overrides || {}
        };
      }

      throw new Error("Invalid Credentials.");
    },

    async verifyMobile(mobile: string, role: 'TEACHER' | 'STUDENT') {
      const table = role === 'TEACHER' ? 'teachers' : 'students';
      const col = role === 'TEACHER' ? 'mobile' : 'father_mobile';
      const { data, error } = await supabase.from(table).select('id').eq(col, mobile.trim()).single();
      if (error || !data) throw new Error("Mobile not registered.");
      return data;
    },

    async loginWithMobile(mobile: string, role: 'TEACHER' | 'STUDENT') {
      const table = role === 'TEACHER' ? 'teachers' : 'students';
      const col = role === 'TEACHER' ? 'mobile' : 'father_mobile';
      const { data, error } = await supabase.from(table).select('*').eq(col, mobile.trim()).single();
      if (error || !data) throw new Error("Authentication failed.");
      return data;
    }
  },
  sms: {
    async sendOTP(mobile: string, otp: string) {
      console.log(`[CLOUD_GATEWAY] Dispatching OTP ${otp} to ${mobile}`);
      return { success: true };
    },
    async getHistory() {
      const { data, error } = await supabase
        .from('sms_history')
        .select('*')
        .order('created_at', { ascending: false });
      return error ? [] : data;
    },
    async insertHistory(payload: { message: string, targets: string, recipient_count: number, sent_by: string }) {
      const { data, error } = await supabase.from('sms_history').insert([{
        message: payload.message, 
        targets: payload.targets, 
        recipient_count: payload.recipient_count, 
        sent_by: payload.sent_by, 
        timestamp: new Date().toLocaleString('en-GB')
      }]).select();
      if (error) throw error;
      return data;
    }
  },
  settings: {
    async getAll() {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      const settings: any = {};
      data.forEach(item => { settings[item.key] = item.value; });
      return settings;
    },
    async update(key: string, value: string | null) {
      const { error } = await supabase
        .from('settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() }, 
          { onConflict: 'key' }
        );
      if (error) throw error;
    }
  },
  students: {
    async getAll() {
      const { data, error } = await supabase.from('students').select('*').order('roll_no', { ascending: true });
      if (error) throw error;
      return data;
    },
    async upsert(s: any) {
      const payload: any = {
        full_name: s.fullName, gr_number: s.grNumber, roll_no: s.rollNo, class: s.class, section: s.section, gender: s.gender, dob: s.dob, admission_date: s.admissionDate, aadhar_no: s.aadharNo, pan_no: s.panNo, uid_id: s.uidId, student_type: s.studentType, birth_place: s.birthPlace, mother_name: s.motherName, mother_mobile: s.motherMobile, father_name: s.fatherName, father_mobile: s.fatherMobile, residence_address: s.residenceAddress, profile_image: s.profileImage, father_photo: s.fatherPhoto, mother_photo: s.motherPhoto, password: s.password || 'student786', status: s.status || 'ACTIVE', medium: s.medium || 'ENGLISH MEDIUM', wing: s.wing, access_rights: s.accessRights || [], fee_overrides: s.feeOverrides || {}
      };
      if (s.id && !s.id.startsWith('temp-')) payload.id = s.id;
      const { data, error } = await supabase.from('students').upsert([payload]).select();
      if (error) throw error;
      return data;
    },
    async cancelAdmission(id: string, reason: string, date: string, cancelledBy: string) {
      const { error } = await supabase.from('students').update({ status: 'CANCELLED', cancel_reason: reason, cancel_date: date, cancelled_by: cancelledBy }).eq('id', id);
      if (error) throw error;
    },
    async revertAdmission(id: string) {
      const { error } = await supabase.from('students').update({ status: 'ACTIVE', cancel_reason: null, cancel_date: null, cancelled_by: null }).eq('id', id);
      if (error) throw error;
    },
    async delete(id: string) {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    }
  },
  teachers: {
    async getAll() {
      const { data, error } = await supabase.from('teachers').select('*');
      if (error) throw error;
      return data;
    },
    async upsert(t: any) {
      const payload = { name: t.fullName, staff_id: t.staffId, mobile: t.mobile, alternate_mobile: t.alternate_mobile, email: t.email, qualification: t.qualification, residence_address: t.residenceAddress, gender: t.gender, status: t.status, profile_image: t.profile_image, signature_image: t.signature_image, joining_date: t.joining_date, dob: t.dob, subject: Array.isArray(t.subjects) ? t.subjects.join(', ') : t.subjects, classes_list: Array.isArray(t.classes) ? t.classes.join(', ') : t.classes, permissions: Array.isArray(t.permissions) ? t.permissions.join(', ') : t.permissions, assigned_role: t.assigned_role, assigned_class: t.assigned_class, assigned_section: t.assigned_section, aadhar_no: t.aadhar_no, pan_no: t.pan_no, account_no: t.account_no, account_type: t.account_type, bank_name: t.bank_name, ifsc_code: t.ifsc_code, username: (t.username || '').toLowerCase().trim(), password: t.password };
      if (t.id) (payload as any).id = t.id;
      const { data, error } = await supabase.from('teachers').upsert([payload]).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) throw error;
    }
  },
  attendance: {
    async getByDate(date: string) {
      const { data, error } = await supabase.from('attendance').select('*').eq('date', date);
      if (error) throw error;
      return data;
    },
    async bulkUpsert(records: any[]) {
      const { data, error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id, date' }).select();
      if (error) throw error;
      return data;
    }
  },
  teacherAttendance: {
    async getByDate(date: string) {
      const { data, error } = await supabase.from('teacher_attendance').select('*').eq('date', date);
      if (error) throw error;
      return data;
    },
    async bulkUpsert(records: any[]) {
      const { data, error } = await supabase.from('teacher_attendance').upsert(records, { onConflict: 'teacher_id, date' }).select();
      if (error) throw error;
      return data;
    }
  },
  idCards: {
    async getTemplates() {
      const { data, error } = await supabase.from('id_card_templates').select('*');
      if (error) throw error;
      return (data || []).map((t: any) => {
        let fields = t.fields;
        if (typeof fields === 'string') { try { fields = JSON.parse(fields); } catch (e) { fields = []; } }
        if (!Array.isArray(fields)) fields = fields ? [fields] : [];
        return {
          ...t, headerBg: t.header_bg, headerHeight: Number(t.header_height), headerText: t.header_text, headerTextSize: Number(t.header_text_size), headerTextColor: t.header_text_color, headerAlignment: t.header_alignment, cardBgType: t.card_bg_type, cardBg: t.card_bg, cardBgSecondary: t.card_bg_secondary, cardBorderColor: t.card_border_color, cardBorderWidth: Number(t.card_border_width), cardRounding: Number(t.card_rounding), photo_x: Number(t.photo_x), photo_y: Number(t.photo_y), photo_size: Number(t.photo_size), photo_shape: t.photo_shape, photo_border_size: Number(t.photo_border_size), photo_border_color: t.photo_border_color, show_backside: t.show_backside, backside_content: t.backside_content, backside_x: Number(t.backside_x), backside_y: Number(t.backside_y), backside_width: Number(t.backside_width), show_qr: t.show_qr, qr_size: Number(t.qr_size), qr_x: Number(t.qr_x), qr_y: Number(t.qr_y), principal_sign: t.principal_sign, sign_x: Number(t.sign_x), sign_y: Number(t.sign_y), sign_width: Number(t.sign_width), watermark_text: t.watermark_text, logo_in_header: t.logo_in_header, fields: fields 
        };
      });
    },
    async upsertTemplate(template: any) {
      const payload = {
        name: template.name, orientation: template.orientation, width: template.width, height: template.height, header_bg: template.headerBg, header_height: template.headerHeight, header_text: template.headerText, header_text_size: template.headerTextSize, header_text_color: template.headerTextColor, header_alignment: template.headerAlignment, card_bg_type: template.cardBgType, card_bg: template.cardBg, card_bg_secondary: template.cardBgSecondary, card_border_color: template.cardBorderColor, card_border_width: template.cardBorderWidth, card_rounding: template.cardRounding, photo_x: template.photoX, photo_y: template.photoY, photo_size: template.photoSize, photo_shape: template.photoShape, photo_border_size: template.photoBorderSize, photo_border_color: template.photoBorderColor, fields: template.fields, show_backside: template.showBackSide, backside_content: template.backsideContent, backside_x: template.backsideX, backside_y: template.backsideY, backside_width: template.backsideWidth, show_qr: template.showQr, qr_size: template.qrSize, qr_x: template.qr_x, qr_y: template.qr_y, principal_sign: template.principalSign, sign_x: template.signX, sign_y: template.signY, sign_width: template.signWidth, watermark_text: template.watermarkText, logo_in_header: template.logo_in_header
      };
      if (template.id && !template.id.startsWith('temp-')) (payload as any).id = template.id;
      const { data, error } = await supabase.from('id_card_templates').upsert(payload).select();
      if (error) throw error;
      return data;
    }
  },
  audit: {
    async insert(log: any) {
      const payload = { timestamp: log.timestamp, username: log.user, role: log.role, action: log.action, module: log.module, details: log.details };
      const { error } = await supabase.from('audit_logs').insert([payload]);
      if (error) throw error;
    },
    async getAll() {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async deleteByModule(module: string) {
      const { error } = await supabase.from('audit_logs').delete().eq('module', module);
      if (error) throw error;
    },
    async deleteAll() {
      const { error } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    }
  },
  fees: {
    async getStructures() {
      const { data, error } = await supabase.from('fee_structures').select('*');
      if (error) throw error;
      return (data || []).map((s: any) => ({ className: s.class_name, fees: s.fees }));
    },
    async upsertStructure(data: any) {
      const { error } = await supabase.from('fee_structures').upsert([{ class_name: data.className, fees: data.fees }], { onConflict: 'class_name' });
      if (error) throw error;
    },
    async getLedger() {
      const { data, error } = await supabase.from('fee_ledger').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insertPayment(payment: any) {
      const { data, error } = await supabase.from('fee_ledger').insert([{ student_id: payment.studentId, amount: payment.amount, date: payment.date, status: payment.status, type: payment.type, receipt_no: payment.receiptNo, quarter: payment.quarter, mode: payment.mode }]).select();
      if (error) throw error;
      return data;
    }
  },
  homework: {
    async getAll() {
      const { data, error } = await supabase.from('homework').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async upsert(hw: any) {
      const { data, error } = await supabase.from('homework').upsert(hw).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) throw error;
    }
  },
  notices: {
    async getAll() {
      const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insert(notice: any) {
      const { data, error } = await supabase.from('notices').insert(notice).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) throw error;
    }
  },
  marks: {
    async getByExam(examId: string) {
      const { data, error } = await supabase.from('marks').select('*').eq('exam_id', examId);
      if (error) throw error;
      return data;
    },
    async upsertMarks(records: any[]) {
      const { data, error } = await supabase.from('marks').upsert(records).select();
      if (error) throw error;
      return data;
    }
  },
  curriculum: {
    async getFolders() {
      const { data, error } = await supabase.from('curriculum_folders').select('*, curriculum_files(*)');
      if (error) throw error;
      return data;
    },
    async insertFolder(name: string, timestamp: string, metadata?: any) {
      const { data, error } = await supabase.from('curriculum_folders').insert([{ name, timestamp, metadata }]).select();
      if (error) throw error;
      return data;
    },
    async insertFile(payload: any) {
      const { data, error } = await supabase.from('curriculum_files').insert([{ folder_id: payload.folderId, title: payload.title, type: payload.type, media_url: payload.mediaUrl, metadata: payload.metadata, timestamp: payload.timestamp }]).select();
      if (error) throw error;
      return data;
    },
    async deleteFile(id: string) {
      const { error } = await supabase.from('curriculum_files').delete().eq('id', id);
      if (error) throw error;
    }
  },
  gallery: {
    async getAll() {
      const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insert(asset: any) {
      const { data, error } = await supabase.from('gallery').insert([{ name: asset.name, url: asset.url, description: asset.description, type: asset.type, uploaded_by: asset.uploadedBy, date: asset.date }]).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      if (error) throw error;
    }
  },
  videos: {
    async getAll() {
      const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insert(video: any) {
      const { data, error } = await supabase.from('videos').insert([{ name: video.name, url: video.url, description: video.description, uploaded_by: video.uploadedBy, date: video.date }]).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
    }
  },
  grading: {
    async getAll() {
      const { data, error } = await supabase.from('grading_rules').select('*').order('min_percent', { ascending: false });
      if (error) throw error;
      return data;
    },
    async upsert(rule: any) {
      const { data, error } = await supabase.from('grading_rules').upsert([rule]).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('grading_rules').delete().eq('id', id);
      if (error) throw error;
    }
  },
  reports: {
    async getProfiles() {
      const { data, error } = await supabase.from('report_profiles').select('*');
      if (error) throw error;
      return data;
    },
    async upsertProfile(profile: any) {
      const { data, error } = await supabase.from('report_profiles').upsert([profile], { onConflict: 'name' }).select();
      if (error) throw error;
      return data;
    }
  }
};
