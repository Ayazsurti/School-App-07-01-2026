
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
      // Fix: Add .select() to ensure inserted record is returned in Supabase v2
      const { data, error } = await supabase.from('notices').insert([{
        title: notice.title,
        content: notice.content,
        category: notice.category,
        date: notice.date,
        posted_by: notice.postedBy,
        attachments: notice.attachments
      }]).select();
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
      // Helper function to sanitize dates for SQL
      const formatDate = (dateStr: string | undefined | null) => {
        if (!dateStr || dateStr.trim() === "") return null;
        return dateStr;
      };

      const isNew = !student.id || student.id.includes('-master') || student.id.length < 20;
      
      const payload: any = {
        full_name: student.fullName || student.name || 'Unknown',
        email: student.email || null,
        roll_no: student.rollNo || null,
        class: student.class || '1st',
        section: student.section || 'A',
        gr_number: student.grNumber || '',
        profile_image: student.profileImage || null,
        father_name: student.fatherName || null,
        mother_name: student.motherName || null,
        father_mobile: student.fatherMobile || null,
        mother_mobile: student.motherMobile || null,
        residence_address: student.residenceAddress || null,
        gender: student.gender || 'Male',
        dob: formatDate(student.dob),
        admission_date: formatDate(student.admissionDate),
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
        // If error code is PGRST204, it means cache is stale. 
        // Instructions for user to run reload notify are better than auto-retry in frontend.
        console.error("Supabase Sync Error:", error);
        if (error.message?.includes('admission_date')) {
          throw new Error("Supabase Cache stale. Please run 'NOTIFY pgrst, reload schema' in SQL Editor.");
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
      const isNew = !teacher.id || teacher.id.length < 20;
      const payload: any = {
        name: teacher.name,
        staff_id: teacher.staffId,
        subject: teacher.subject,
        mobile: teacher.mobile
      };
      if (!isNew) payload.id = teacher.id;
      // Fix: Add .select() to ensure result is returned
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
      // Fix: Add .select() to return updated records
      const { data, error } = await supabase.from('attendance').upsert(records).select();
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
    async upsertMarks(records: any[]) {
      // Fix: Add .select() to return updated records
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
    async insertFolder(name: string, date: string) {
      // Fix: Add .select() to return inserted folder
      const { data, error } = await supabase.from('curriculum_folders').insert([{ name, date }]).select();
      if (error) throw error;
      return data;
    },
    async insertFile(file: any) {
      // Fix: Add .select() to return inserted file
      const { data, error } = await supabase.from('curriculum_files').insert([{
        folder_id: file.folderId,
        title: file.title,
        type: file.type,
        metadata: file.metadata,
        media_url: file.mediaUrl,
        timestamp: file.timestamp
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
      // Fix: Add .select() to return inserted asset
      const { data, error } = await supabase.from('gallery').insert([{
        name: asset.name, url: asset.url, description: asset.description,
        type: asset.type, uploaded_by: asset.uploadedBy, date: asset.date
      }]).select();
      if (error) throw error;
      return data;
    },
    async update(id: string, asset: any) {
      // Fix: Destructured 'data' and added .select() to ensure 'data' is defined and returned
      const { data, error } = await supabase.from('gallery').update({
        name: asset.name, description: asset.description, url: asset.url
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
      // Fix: Add .select() to return inserted video
      const { data, error } = await supabase.from('videos').insert([{
        name: video.name, url: video.url, description: video.description,
        uploaded_by: video.uploadedBy, date: video.date
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
    async upsert(exam: any) {
      const isNew = !exam.id || exam.id.length < 20;
      const payload: any = {
        name: exam.name,
        academic_year: exam.academicYear,
        class_name: exam.className,
        subjects: exam.subjects,
        status: exam.status
      };
      if (!isNew) payload.id = exam.id;
      // Fix: Add .select() to return result
      const { data, error } = await supabase.from('exams').upsert([payload]).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
    }
  },
  fees: {
    async getCategories() {
      const { data, error } = await supabase.from('fee_categories').select('*');
      if (error) throw error;
      return data;
    },
    async getStructures() {
      const { data, error } = await supabase.from('fee_structures').select('*');
      if (error) throw error;
      return data;
    },
    async upsertCategory(cat: any) {
      // Fix: Add .select() to return record
      const { data, error } = await supabase.from('fee_categories').upsert([cat]).select();
      if (error) throw error;
      return data;
    },
    async upsertStructure(struct: any) {
      const { error } = await supabase.from('fee_structures').upsert([{
        class_name: struct.className,
        fees: struct.fees
      }]);
      if (error) throw error;
      return true;
    },
    async getLedger() {
      const { data, error } = await supabase.from('fee_ledger').select('*, students(full_name, gr_number)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async insertPayment(entry: any) {
      // Fix: Add .select() to return inserted payment
      const { data, error } = await supabase.from('fee_ledger').insert([{
        student_id: entry.studentId,
        amount: entry.amount,
        date: entry.date,
        status: entry.status,
        type: entry.type,
        receipt_no: entry.receiptNo
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
      const isNew = !hw.id || hw.id.length < 20;
      const payload: any = {
        title: hw.title,
        description: hw.description,
        subject: hw.subject,
        class_name: hw.className,
        section: hw.section,
        due_date: hw.dueDate,
        created_by: hw.createdBy,
        attachment: hw.attachment
      };
      if (!isNew) payload.id = hw.id;
      // Fix: Add .select() to return record
      const { data, error } = await supabase.from('homework').upsert([payload]).select();
      if (error) throw error;
      return data;
    },
    async delete(id: string) {
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) throw error;
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
        username: log.user,
        role: log.role,
        action: log.action,
        module: log.module,
        details: log.details,
        timestamp: log.timestamp
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
  }
};
