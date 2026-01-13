
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://qfordtxirmjeogqthbtv.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UM7jqQWzi2dxxow1MmAEZA_V1zwXxmt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MASTER_ACCOUNTS = [
  { username: 'ayazsurti', password: 'password123', role: 'ADMIN', full_name: 'Ayaz Surti', id: 'admin-master' },
  { username: 'teacher1', password: 'password123', role: 'TEACHER', full_name: 'Lead Teacher', id: 'teacher-master' },
  { username: 'student1', password: 'password123', role: 'STUDENT', full_name: 'Demo Student', id: 'student-master' }
];

export const db = {
  auth: {
    async login(username: string, pass: string) {
      const lowerUser = username.toLowerCase();
      const master = MASTER_ACCOUNTS.find(a => a.username === lowerUser && a.password === pass);
      if (master) return master;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', lowerUser)
        .eq('password', pass)
        .single();
      
      if (error) throw new Error("Invalid Credentials");
      return data;
    }
  },
  profiles: {
    async updateImage(userId: string, imageUrl: string) {
      if (userId.includes('-master')) return;
      const { error } = await supabase
        .from('profiles')
        .update({ profile_image: imageUrl })
        .eq('id', userId);
      if (error) throw error;
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
      const { error } = await supabase.from('settings').upsert([{ key, value }]);
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
      const { data, error } = await supabase.from('notices').insert([{
        title: notice.title, content: notice.content, category: notice.category,
        date: notice.date, posted_by: notice.postedBy, attachments: notice.attachments
      }]);
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('notices').delete().eq('id', id);
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
      const isNew = !student.id || student.id.length < 20 || student.id.includes('-master');
      
      // Strict mapping to DB columns to prevent PGRST204
      const payload: any = {
        full_name: student.fullName || student.name || '', 
        email: student.email || '', 
        roll_no: student.rollNo || '',
        class: student.class || '1st', 
        section: student.section || 'A', 
        gr_number: student.grNumber || '',
        profile_image: student.profileImage || '', 
        father_name: student.fatherName || '',
        mother_name: student.motherName || '', 
        father_mobile: student.fatherMobile || '',
        mother_mobile: student.motherMobile || '',
        residence_address: student.residenceAddress || '',
        gender: student.gender || 'Male',
        dob: student.dob || null,
        admission_date: student.admissionDate || null,
        aadhar_no: student.aadharNo || null,
        uid_id: student.uidId || null,
        pen_no: student.penNo || null
      };

      if (!isNew) {
        payload.id = student.id;
      }
      
      const { data, error } = await supabase
        .from('students')
        .upsert(payload)
        .select();

      if (error) {
        console.error("Supabase Sync Error:", error.message, error.code);
        if (error.code === 'PGRST204') {
          throw new Error("Column 'aadhar_no' not found in database. Please run the SQL migration in Supabase Dashboard.");
        }
        throw error;
      }
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
      const cleanId = (teacher.id && teacher.id.length > 20) ? teacher.id : undefined;
      const { data, error } = await supabase.from('teachers').upsert([{
        id: cleanId,
        name: teacher.name, staff_id: teacher.staffId, subject: teacher.subject,
        mobile: teacher.mobile
      }]);
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) throw error;
    }
  },
  homework: {
    async getAll() {
      const { data, error } = await supabase.from('homework').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async upsert(hw: any) {
      const cleanId = (hw.id && hw.id.length > 20) ? hw.id : undefined;
      const { data, error } = await supabase.from('homework').upsert([{
        id: cleanId,
        title: hw.title, description: hw.description, subject: hw.subject,
        class_name: hw.className, section: hw.section, due_date: hw.dueDate,
        created_by: hw.createdBy, attachment: hw.attachment
      }]);
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) throw error;
    }
  },
  exams: {
    async getAll() {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async upsert(exam: any) {
      const cleanId = (exam.id && exam.id.length > 20) ? exam.id : undefined;
      const { data, error } = await supabase.from('exams').upsert([{
        id: cleanId,
        name: exam.name, academic_year: exam.academicYear, class_name: exam.className,
        subjects: exam.subjects, status: exam.status
      }]);
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
    }
  },
  fees: {
    async getLedger() {
      const { data, error } = await supabase.from('fee_ledger').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insertPayment(payment: any) {
      const { data, error } = await supabase.from('fee_ledger').insert([{
        student_id: payment.studentId, amount: payment.amount, date: payment.date,
        status: payment.status, type: payment.type, receipt_no: payment.receipt_no
      }]);
      if (error) throw error;
      return data;
    },
    async getCategories() {
      const { data, error } = await supabase.from('fee_categories').select('*');
      if (error) throw error;
      return data;
    },
    async upsertCategory(cat: any) {
      const cleanId = (cat.id && cat.id.length > 20) ? cat.id : undefined;
      const { error } = await supabase.from('fee_categories').upsert([{
        id: cleanId,
        name: cat.name, frequency: cat.frequency
      }]);
      if (error) throw error;
    },
    async deleteCategory(id: string) {
      const { error } = await supabase.from('fee_categories').delete().eq('id', id);
      if (error) throw error;
    },
    async getStructures() {
      const { data, error } = await supabase.from('fee_structures').select('*');
      if (error) throw error;
      return data;
    },
    async upsertStructure(struct: any) {
      const { error } = await supabase.from('fee_structures').upsert([{
        class_name: struct.className, fees: struct.fees
      }]);
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
      const { data, error } = await supabase.from('attendance').upsert(records);
      if (error) throw error;
      return data;
    }
  },
  marks: {
    async getByExam(examId: string) {
      const { data, error } = await supabase.from('marks').select('*').eq('exam_id', examId);
      if (error) throw error;
      return data;
    },
    async upsertMarks(marksRecords: any[]) {
      const { data, error } = await supabase.from('marks').upsert(marksRecords);
      if (error) throw error;
      return data;
    }
  },
  audit: {
    async getAll() {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000);
      if (error) throw error;
      return data;
    },
    async insert(log: any) {
      const { error } = await supabase.from('audit_logs').insert([{
        username: log.user, role: log.role, action: log.action,
        module: log.module, details: log.details, timestamp: log.timestamp
      }]);
      if (error) throw error;
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
  gallery: {
    async getAll() {
      const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insert(asset: any) {
      const { data, error } = await supabase.from('gallery').insert([{
        name: asset.name, url: asset.url, description: asset.description,
        type: asset.type, uploaded_by: asset.uploadedBy, date: asset.date
      }]);
      if (error) throw error;
      return data;
    },
    async update(id: string, asset: any) {
      const { error } = await supabase.from('gallery').update({
        name: asset.name, description: asset.description
      }).eq('id', id);
      if (error) throw error;
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
        name: video.name, url: video.url, description: video.description,
        uploaded_by: video.uploadedBy, date: video.date
      }]);
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
    }
  },
  curriculum: {
    async getFolders() {
      const { data, error } = await supabase.from('curriculum_folders').select('*, curriculum_files(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insertFolder(name: string, timestamp: string) {
      const { data, error } = await supabase.from('curriculum_folders').insert([{ name, timestamp }]).select();
      if (error) throw error;
      return data[0];
    },
    async insertFile(file: any) {
      const { data, error } = await supabase.from('curriculum_files').insert([{
        folder_id: file.folderId, title: file.title, type: file.type,
        metadata: file.metadata, media_url: file.mediaUrl, timestamp: file.timestamp
      }]);
      if (error) throw error;
      return data;
    },
    async deleteFile(id: string) {
      const { error } = await supabase.from('curriculum_files').delete().eq('id', id);
      if (error) throw error;
    }
  }
};
