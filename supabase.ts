
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://qfordtxirmjeogqthbtv.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UM7jqQWzi2dxxow1MmAEZA_V1zwXxmt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MASTER_ACCOUNTS = [
  { username: 'ayazsurti', password: 'password123', role: 'ADMIN', full_name: 'Ayaz Surti', id: 'admin-master' },
  { username: 'teacher1', password: 'password123', role: 'TEACHER', full_name: 'Lead Teacher', id: 'teacher-master' },
  { username: 'student1', password: 'password123', role: 'STUDENT', full_name: 'Demo Student', id: 'student-master' }
];

const safeDate = (d: any) => {
  if (!d || d === "" || d === "null" || d === "undefined" || d === "-") return null;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d;
  return null;
};

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
      const { error } = await supabase.from('settings').upsert([{ key, value, updated_at: new Date().toISOString() }]);
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
      // 1. Build strict payload
      const payload: any = {
        full_name: student.fullName || student.name || 'Unnamed Student',
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
        dob: safeDate(student.dob),
        admission_date: safeDate(student.admissionDate),
        aadhar_no: student.aadharNo || null,
        uid_id: student.uidId || null,
        pen_no: student.penNo || null
      };

      if (student.id && student.id.length > 20 && !student.id.includes('-master')) {
        payload.id = student.id;
      }

      // Initial Try
      let result = await supabase.from('students').upsert(payload, { onConflict: 'gr_number' }).select();

      // 2. DYNAMIC AUTO-REPAIR: If Supabase reports ANY column is missing in cache
      // Loop up to 3 times to strip missing columns identified by error messages
      let retryCount = 0;
      while (result.error && result.error.message.includes("column") && result.error.message.includes("schema cache") && retryCount < 3) {
        const errorMessage = result.error.message;
        console.warn("Supabase Schema Cache Mismatch:", errorMessage);
        
        // Extract the column name from error: Could not find the 'column_name' column...
        const match = errorMessage.match(/'([^']+)'/);
        const colName = match ? match[1] : null;

        if (colName && payload.hasOwnProperty(colName)) {
          console.log(`Auto-repair: Removing missing column '${colName}' from payload and retrying...`);
          delete payload[colName];
          result = await supabase.from('students').upsert(payload, { onConflict: 'gr_number' }).select();
        } else {
          // If we can't identify the column but it's a cache error, try stripping all optional new columns
          delete payload.gender;
          delete payload.dob;
          delete payload.admission_date;
          delete payload.aadhar_no;
          result = await supabase.from('students').upsert(payload, { onConflict: 'gr_number' }).select();
          break;
        }
        retryCount++;
      }

      if (result.error) throw new Error(result.error.message);
      return result.data;
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
      const cleaned = records.filter(r => r.student_id && r.student_id.length > 20);
      const { data, error } = await supabase.from('attendance').upsert(cleaned).select();
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
      const cleaned = records.filter(r => r.student_id && r.student_id.length > 20);
      const { data, error } = await supabase.from('marks').upsert(cleaned).select();
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
    async insertFolder(name: string, timestamp: string) {
      const { data, error } = await supabase.from('curriculum_folders').insert([{ name, timestamp }]).select();
      if (error) throw error;
      return data;
    },
    async insertFile(file: any) {
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
      const { data, error } = await supabase.from('gallery').insert([{
        name: asset.name, url: asset.url, description: asset.description,
        type: asset.type, uploaded_by: asset.uploadedBy, date: asset.date
      }]).select();
      if (error) throw error;
      return data;
    },
    async update(id: string, asset: any) {
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
      const { data, error } = await supabase.from('fee_categories').upsert([cat]).select();
      if (error) throw error;
      return data;
    },
    async upsertStructure(struct: any) {
      const { error } = await supabase.from('fee_structures').upsert([{
        class_name: struct.className,
        fees: struct.fees,
        updated_at: new Date().toISOString()
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
