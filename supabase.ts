
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://qfordtxirmjeogqthbtv.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UM7jqQWzi2dxxow1MmAEZA_V1zwXxmt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getErrorMessage = (err: any): string => {
  if (typeof err === 'string') return err;
  
  if (err?.code === '42501') return "Database Permission Denied (42501). Please run the 'DROP POLICY' SQL fix in Supabase.";
  if (err?.code === '42703') return "Database Column Mismatch. Check if 'status' column exists in 'students' table.";
  if (err?.code === '23502') return "Constraint Violation: A required field is missing. Ensure 'status' has a default value.";
  if (err?.code === 'PGRST116') return "Record not found in database. The ID might have changed.";
  
  if (err?.message) return err.message;
  return "Cloud Connection Error. Please refresh.";
};

export const db = {
  auth: {
    async login(username: string, pass: string) {
      const lowerUser = username.toLowerCase();
      
      if (lowerUser === 'ayazsurti' && pass === 'Ayaz78692') {
        return { id: 'admin-master', name: 'Ayaz Surti', role: 'ADMIN', profile_image: null };
      }

      // Teacher Login Logic - Matches the 'Auth Hub' in Management
      const { data: tea, error: teaErr } = await supabase
        .from('teachers')
        .select('*')
        .eq('username', username)
        .eq('password', pass)
        .single();
      
      if (!teaErr && tea) {
        if (tea.status === 'BLOCKED') throw new Error("This account has been suspended by the administrator.");
        return { 
          id: tea.id, 
          name: tea.name, 
          role: 'TEACHER', 
          class: tea.assigned_class, 
          section: tea.assigned_section, 
          profile_image: tea.profile_image,
          assignedRole: tea.assigned_role,
          subjects: tea.subject ? tea.subject.split(', ') : [],
          staffId: tea.staff_id,
          mobile: tea.mobile
        };
      }

      // Student Login Logic - Uses GR Number as Username
      const { data: std, error: stdErr } = await supabase
        .from('students')
        .select('*')
        .eq('gr_number', username)
        .eq('password', pass)
        .single();
      
      if (!stdErr && std) {
        if (std.status === 'CANCELLED') throw new Error("This student enrollment has been cancelled.");
        return { 
          id: std.id, 
          name: std.full_name, 
          role: 'STUDENT', 
          class: std.class, 
          section: std.section, 
          profile_image: std.profile_image 
        };
      }

      throw new Error("Invalid credentials. Please verify your Identity ID and Password.");
    },

    async verifyMobile(mobile: string, role: 'TEACHER' | 'STUDENT') {
      let query = supabase.from(role === 'TEACHER' ? 'teachers' : 'students').select('*');
      
      if (role === 'TEACHER') {
        query = query.eq('mobile', mobile);
      } else {
        query = query.or(`father_mobile.eq.${mobile},mother_mobile.eq.${mobile}`);
      }

      const { data, error } = await query.limit(1).single();
      
      if (error || !data) {
        throw new Error(`Mobile ${mobile} is not registered in the ${role} directory.`);
      }
      return data;
    },

    async loginWithMobile(mobile: string, role: 'TEACHER' | 'STUDENT') {
      let query = supabase.from(role === 'TEACHER' ? 'teachers' : 'students').select('*');
      
      if (role === 'TEACHER') {
        query = query.eq('mobile', mobile);
      } else {
        query = query.or(`father_mobile.eq.${mobile},mother_mobile.eq.${mobile}`);
      }

      const { data, error } = await query.limit(1).single();
      
      if (error) throw error;
      return {
        id: data.id,
        name: data.name || data.full_name,
        role: role,
        class: data.class || data.assigned_class,
        section: data.section || data.assigned_section,
        profile_image: data.profile_image,
        assignedRole: data.assigned_role,
        subjects: data.subject ? data.subject.split(', ') : [],
        staffId: data.staff_id || (data as any).staff_id,
        mobile: data.mobile || data.father_mobile
      };
    }
  },
  sms: {
    async sendOTP(mobile: string, otp: string) {
      console.warn("OTP Simulation Mode Active:", otp);
      return { return: true };
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
  audit: {
    async insert(log: any) {
      const { error } = await supabase.from('audit_logs').insert([{
        username: log.user,
        role: log.role,
        action: log.action,
        module: log.module,
        details: log.details,
        timestamp: log.timestamp
      }]);
      if (error) throw error;
    },
    async getAll() {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async deleteAll() {
      const { error } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    async deleteByModule(module: string) {
      const { error } = await supabase.from('audit_logs').delete().eq('module', module);
      if (error) throw error;
    }
  },
  students: {
    async getAll() {
      const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async upsert(student: any) {
      const payload = {
        full_name: student.fullName,
        gr_number: student.grNumber,
        roll_no: student.rollNo,
        class: student.class,
        section: student.section,
        medium: student.medium,
        wing: student.wing,
        gender: student.gender,
        dob: student.dob,
        admission_date: student.admissionDate,
        aadhar_no: student.aadharNo,
        pan_no: student.panNo,
        uid_id: student.uidId,
        pen_no: student.penNo,
        student_type: student.studentType,
        birth_place: student.birthPlace,
        father_name: student.fatherName,
        mother_name: student.motherName,
        father_mobile: student.fatherMobile,
        mother_mobile: student.motherMobile,
        residence_address: student.residenceAddress,
        profile_image: student.profileImage,
        father_photo: student.fatherPhoto,
        mother_photo: student.motherPhoto,
        password: student.password || 'student786',
        status: student.status || 'ACTIVE'
      };

      if (student.id) (payload as any).id = student.id;

      const { data, error } = await supabase.from('students').upsert(payload).select();
      if (error) throw error;
      return data;
    },
    async cancelAdmission(id: string, reason: string, date: string, adminName: string) {
      const { data, error } = await supabase.from('students').update({
        status: 'CANCELLED',
        cancel_reason: reason,
        cancel_date: date,
        cancelled_by: adminName
      }).eq('id', id).select();
      if (error) throw error;
      return data;
    },
    async revertAdmission(id: string) {
      const { data, error } = await supabase
        .from('students')
        .update({
          status: 'ACTIVE',
          cancel_reason: null,
          cancel_date: null,
          cancelled_by: null
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    }
  },
  teachers: {
    async getAll() {
      const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async upsert(teacher: any) {
      const payload = {
        name: teacher.fullName,
        staff_id: teacher.staffId,
        mobile: teacher.mobile,
        alternate_mobile: teacher.alternateMobile,
        email: teacher.email,
        qualification: teacher.qualification,
        residence_address: teacher.residenceAddress,
        gender: teacher.gender,
        status: teacher.status,
        profile_image: teacher.profileImage,
        joining_date: teacher.joiningDate,
        dob: teacher.dob,
        subject: Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : teacher.subjects,
        classes_list: Array.isArray(teacher.classes) ? teacher.classes.join(', ') : teacher.classes,
        assigned_role: teacher.assignedRole,
        assigned_class: teacher.assignedClass,
        assigned_section: teacher.assignedSection,
        aadhar_no: teacher.aadharNo,
        pan_no: teacher.panNo,
        account_no: teacher.accountNo,
        account_type: teacher.accountType,
        bank_name: teacher.bankName,
        ifsc_code: teacher.ifscCode,
        branch_name: teacher.branchName,
        branch_address: teacher.branchAddress,
        branch_code: teacher.branchCode,
        branch_phone: teacher.branchPhone,
        username: teacher.username,
        password: teacher.password
      };

      if (teacher.id) (payload as any).id = teacher.id;

      const { data, error } = await supabase.from('teachers').upsert(payload).select();
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
    async update(id: string, asset: any) {
      const { data, error } = await supabase.from('gallery').update({
        name: asset.name,
        description: asset.description,
        url: asset.url
      }).eq('id', id).select();
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
  idCards: {
    async getTemplates() {
      const { data, error } = await supabase.from('id_card_templates').select('*');
      if (error) throw error;
      return (data || []).map((t: any) => {
        // Robust handling of the 'fields' column which might be an array, an object, or a JSON string
        let rawFields = t.fields;
        if (typeof rawFields === 'string') {
          try {
            rawFields = JSON.parse(rawFields);
          } catch (e) {
            rawFields = [];
          }
        }
        
        const fieldsArray = Array.isArray(rawFields) ? rawFields : [];

        return {
          id: t.id,
          name: t.name,
          orientation: t.orientation,
          width: Number(t.width) || 0,
          height: Number(t.height) || 0,
          headerBg: t.header_bg,
          headerHeight: Number(t.header_height) || 0,
          headerText: t.header_text,
          headerTextSize: Number(t.header_text_size) || 10,
          headerTextColor: t.header_text_color,
          headerAlignment: t.header_alignment,
          cardBgType: t.card_bg_type,
          cardBg: t.card_bg,
          cardBgSecondary: t.card_bg_secondary,
          cardBorderColor: t.card_border_color,
          cardBorderWidth: Number(t.card_border_width) || 0,
          cardRounding: Number(t.card_rounding) || 0,
          photoX: Number(t.photo_x) || 0,
          photoY: Number(t.photo_y) || 0,
          photoSize: Number(t.photo_size) || 28,
          photoShape: t.photo_shape,
          photoBorderSize: Number(t.photo_border_size) || 0,
          photoBorderColor: t.photo_border_color,
          fields: fieldsArray.map((f: any) => ({
            ...f,
            fontSize: Number(f.fontSize) || 8,
            x: Number(f.x) || 0,
            y: Number(f.y) || 0,
            width: Number(f.width) || 50
          })),
          showBackSide: t.show_backside,
          backside_content: t.backside_content,
          backsideX: Number(t.backside_x) || 0,
          backsideY: Number(t.backside_y) || 0,
          backsideWidth: Number(t.backside_width) || 0,
          showQr: t.show_qr,
          qrSize: Number(t.qr_size) || 0,
          qrX: Number(t.qr_x) || 0,
          qrY: Number(t.qr_y) || 0,
          principalSign: t.principal_sign,
          signX: Number(t.sign_x) || 0,
          signY: Number(t.sign_y) || 0,
          signWidth: Number(t.sign_width) || 0,
          watermarkText: t.watermark_text,
          logoInHeader: t.logo_in_header
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
      const payload = {
        title: hw.title,
        description: hw.description,
        subject: hw.subject,
        class_name: hw.className,
        section: hw.section,
        due_date: hw.dueDate,
        created_by: hw.createdBy,
        attachment: hw.attachment
      };
      if (hw.id) (payload as any).id = hw.id;
      const { data, error } = await supabase.from('homework').upsert(payload).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('homework').delete().eq('id', id);
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
  }
};
