
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://qfordtxirmjeogqthbtv.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UM7jqQWzi2dxxow1MmAEZA_V1zwXxmt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getErrorMessage = (err: any): string => {
  if (typeof err === 'string') return err;
  if (err?.code === '42501') return "Database Permission Denied (42501).";
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
        .eq('gr_number', cleanUser.toUpperCase())
        .eq('password', cleanPass)
        .single();

      if (!stdErr && std) {
        return { ...std, role: 'STUDENT', id: std.id, name: std.full_name, class: std.class, section: std.section };
      }

      throw new Error("Invalid Node Access Key. Check Username or Master Key.");
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
      console.log(`[SMS] OTP ${otp} -> ${mobile}`);
      return { success: true };
    },
    async getHistory() {
      const { data, error } = await supabase
        .from('sms_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn("SMS dedicated table not found, falling back to audit logs.");
        const { data: auditData } = await supabase.from('audit_logs').select('*').eq('module', 'SMS').order('created_at', { ascending: false });
        return (auditData || []).map(a => ({
          id: a.id,
          message: a.details,
          targets: 'Multiple Classes',
          recipient_count: 'N/A',
          sent_by: a.username,
          created_at: a.created_at,
          timestamp: a.timestamp
        }));
      }
      return data;
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
      const { error } = await supabase.from('settings').upsert([{ key, value, updated_at: new Date().toISOString() }]);
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
        full_name: s.fullName,
        gr_number: s.grNumber,
        roll_no: s.rollNo,
        class: s.class,
        section: s.section,
        gender: s.gender,
        dob: s.dob,
        admission_date: s.admissionDate,
        aadhar_no: s.aadharNo,
        pan_no: s.panNo,
        uid_id: s.uidId,
        student_type: s.studentType,
        birth_place: s.birthPlace,
        mother_name: s.motherName,
        mother_mobile: s.motherMobile,
        father_name: s.fatherName,
        father_mobile: s.fatherMobile,
        residence_address: s.residenceAddress,
        profile_image: s.profileImage,
        father_photo: s.fatherPhoto,
        mother_photo: s.motherPhoto,
        password: s.password || 'student786',
        status: s.status || 'ACTIVE',
        medium: s.medium || 'ENGLISH MEDIUM',
        wing: s.wing
      };

      if (s.id && !s.id.startsWith('temp-')) {
        payload.id = s.id;
      }

      const { data, error } = await supabase.from('students').upsert([payload]).select();
      if (error) throw error;
      return data;
    },
    async cancelAdmission(id: string, reason: string, date: string, cancelledBy: string) {
      const { error } = await supabase.from('students').update({
        status: 'CANCELLED',
        cancel_reason: reason,
        cancel_date: date,
        cancelled_by: cancelledBy
      }).eq('id', id);
      if (error) throw error;
    },
    async revertAdmission(id: string) {
      const { error } = await supabase.from('students').update({
        status: 'ACTIVE',
        cancel_reason: null,
        cancel_date: null,
        cancelled_by: null
      }).eq('id', id);
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
      const payload = {
        name: t.fullName,
        staff_id: t.staffId,
        mobile: t.mobile,
        alternate_mobile: t.alternateMobile,
        email: t.email,
        qualification: t.qualification,
        residence_address: t.residenceAddress,
        gender: t.gender,
        status: t.status,
        profile_image: t.profileImage,
        signature_image: t.signatureImage,
        joining_date: t.joiningDate,
        dob: t.dob,
        subject: Array.isArray(t.subjects) ? t.subjects.join(', ') : t.subjects,
        classes_list: Array.isArray(t.classes) ? t.classes.join(', ') : t.classes,
        permissions: Array.isArray(t.permissions) ? t.permissions.join(', ') : t.permissions,
        assigned_role: t.assignedRole,
        assigned_class: t.assignedClass,
        assigned_section: t.assignedSection,
        aadhar_no: t.aadharNo,
        pan_no: t.panNo,
        account_no: t.accountNo,
        account_type: t.accountType,
        bank_name: t.bankName,
        ifsc_code: t.ifscCode,
        username: (t.username || '').toLowerCase().trim(),
        password: t.password
      };
      
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
      const { data, error } = await supabase.from('attendance').upsert(records).select();
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
        if (typeof fields === 'string') {
          try { fields = JSON.parse(fields); } catch (e) { fields = []; }
        }
        if (!Array.isArray(fields)) {
          fields = fields ? [fields] : [];
        }
        return {
          ...t,
          headerBg: t.header_bg,
          headerHeight: Number(t.header_height),
          headerText: t.header_text,
          headerTextSize: Number(t.header_text_size),
          headerTextColor: t.header_text_color,
          headerAlignment: t.header_alignment,
          cardBgType: t.card_bg_type,
          cardBg: t.card_bg,
          cardBgSecondary: t.card_bg_secondary,
          cardBorderColor: t.card_border_color,
          cardBorderWidth: Number(t.card_border_width),
          cardRounding: Number(t.card_rounding),
          photoX: Number(t.photo_x),
          photoY: Number(t.photo_y),
          photoSize: Number(t.photo_size),
          photoShape: t.photo_shape,
          photoBorderSize: Number(t.photo_border_size),
          photoBorderColor: t.photo_border_color,
          showBackSide: t.show_backside,
          backsideContent: t.backside_content,
          backsideX: Number(t.backside_x),
          backsideY: Number(t.backside_y),
          backsideWidth: Number(t.backside_width),
          showQr: t.show_qr,
          qrSize: Number(t.qr_size),
          qrX: Number(t.qr_x),
          qrY: Number(t.qr_y),
          principalSign: t.principal_sign,
          signX: Number(t.sign_x),
          signY: Number(t.sign_y),
          signWidth: Number(t.sign_width),
          watermarkText: t.watermark_text,
          logoInHeader: t.logo_in_header,
          fields: fields 
        };
      });
    },
    async upsertTemplate(template: any) {
      const payload = {
        name: template.name,
        orientation: template.orientation,
        width: template.width,
        height: template.height,
        header_bg: template.headerBg,
        header_height: template.headerHeight,
        header_text: template.headerText,
        header_text_size: template.headerTextSize,
        header_text_color: template.headerTextColor,
        header_alignment: template.headerAlignment,
        card_bg_type: template.cardBgType,
        card_bg: template.cardBg,
        card_bg_secondary: template.cardBgSecondary,
        card_border_color: template.cardBorderColor,
        card_border_width: template.cardBorderWidth,
        card_rounding: template.cardRounding,
        photo_x: template.photoX,
        photo_y: template.photoY,
        photo_size: template.photoSize,
        photo_shape: template.photoShape,
        photo_border_size: template.photoBorderSize,
        photo_border_color: template.photoBorderColor,
        fields: template.fields,
        show_backside: template.showBackSide,
        backside_content: template.backsideContent,
        backside_x: template.backsideX,
        backside_y: template.backsideY,
        backside_width: template.backsideWidth,
        show_qr: template.showQr,
        qr_size: template.qrSize,
        qr_x: template.qrX,
        qr_y: template.qrY,
        principal_sign: template.principalSign,
        sign_x: template.signX,
        sign_y: template.signY,
        sign_width: template.signWidth,
        watermark_text: template.watermarkText,
        logo_in_header: template.logo_in_header
      };
      if (template.id && !template.id.startsWith('temp-')) (payload as any).id = template.id;
      const { data, error } = await supabase.from('id_card_templates').upsert(payload).select();
      if (error) throw error;
      return data;
    }
  },
  audit: {
    async insert(log: any) {
      const payload = {
        timestamp: log.timestamp,
        username: log.user,
        role: log.role,
        action: log.action,
        module: log.module,
        details: log.details
      };
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
      return (data || []).map((s: any) => ({
        className: s.class_name,
        fees: s.fees
      }));
    },
    async upsertStructure(data: any) {
      const { error } = await supabase.from('fee_structures').upsert([{
        class_name: data.className,
        fees: data.fees
      }], { onConflict: 'class_name' });
      if (error) throw error;
    },
    async getLedger() {
      const { data, error } = await supabase.from('fee_ledger').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insertPayment(payment: any) {
      const { data, error } = await supabase.from('fee_ledger').insert([{
        student_id: payment.studentId,
        amount: payment.amount,
        date: payment.date,
        status: payment.status,
        type: payment.type,
        receipt_no: payment.receiptNo,
        quarter: payment.quarter,
        mode: payment.mode
      }]).select();
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
      const { data, error } = await supabase.from('curriculum_files').insert([{
        folder_id: payload.folderId,
        title: payload.title,
        type: payload.type,
        media_url: payload.mediaUrl,
        metadata: payload.metadata,
        timestamp: payload.timestamp
      }]).select();
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
      const { data, error } = await supabase.from('gallery').insert([{
        name: asset.name,
        url: asset.url,
        description: asset.description,
        type: asset.type,
        uploaded_by: asset.uploadedBy,
        date: asset.date
      }]).select();
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
      const { data, error } = await supabase.from('videos').insert([{
        name: video.name,
        url: video.url,
        description: video.description,
        uploaded_by: video.uploadedBy,
        date: video.date
      }]).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
    }
  },
  exams: {
    async getAll() {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async getSchedules(examId: string) {
      const { data, error } = await supabase.from('exam_schedules').select('*').eq('exam_id', examId);
      if (error) throw error;
      return data;
    },
    async upsert(exam: any) {
      const payload = {
        name: exam.name,
        academic_year: exam.academicYear,
        class_name: exam.className,
        exam_type: exam.examType,
        mode: exam.mode,
        status: exam.status,
        subjects: exam.subjects,
        start_date: exam.startDate,
        end_date: exam.endDate
      };
      if (exam.id) (payload as any).id = exam.id;
      const { data, error } = await supabase.from('exams').upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    async upsertSchedules(schedules: any[]) {
      const { data, error } = await supabase.from('exam_schedules').upsert(schedules).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('exams').delete().eq('id', id);
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
      const { data, error } = await supabase.from('grading_rules').upsert(rule).select();
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
      const { data, error } = await supabase.from('report_profiles').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    async upsertProfile(profile: any) {
      const { data, error } = await supabase.from('report_profiles').upsert([{
        name: profile.name,
        configs: profile.configs,
        fields: profile.fields,
        updated_at: new Date().toISOString()
      }], { onConflict: 'name' }).select();
      if (error) throw error;
      return data;
    },
    async deleteProfile(name: string) {
      const { error } = await supabase.from('report_profiles').delete().eq('name', name);
      if (error) throw error;
    }
  }
};
