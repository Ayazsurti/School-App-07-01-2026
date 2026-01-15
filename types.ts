
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface DisplaySettings {
  fontFamily: string;
  fontColor: string;
  accentColor: string;
  backgroundImage: string | null;
  bgOpacity: number;
  cardOpacity: number;
  glassBlur: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  username?: string;
  password?: string;
  profileImage?: string;
  enrollmentId?: string;
  staffId?: string;
  mobile?: string;
  rollNo?: string;
  class?: string;
  section?: string;
}

export interface Student extends User {
  fullName: string;
  grNumber: string;
  rollNo: string;
  gender: string;
  admissionDate: string;
  dob: string;
  uidId: string;
  penNo: string;
  aadharNo: string;
  panNo?: string;
  studentType?: string;
  birthPlace?: string;
  motherName: string;
  motherMobile: string;
  fatherName: string;
  fatherMobile: string;
  residenceAddress: string;
  class: string;
  section: string;
  remarks?: string;
}

export interface Teacher extends User {
  fullName: string;
  staffId: string;
  mobile: string;
  alternateMobile?: string;
  email: string;
  qualification: string;
  subjects: string[];
  classes: string[];
  joiningDate: string;
  dob?: string;
  residenceAddress: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  gender: string;
  assignedRole: 'SUBJECT_TEACHER' | 'CLASS_TEACHER';
  assignedClass?: string;
  assignedSection?: string;
  lastLogin?: string;
  // New Fields
  aadharNo?: string;
  panNo?: string;
  accountNo?: string;
  accountType?: 'SAVINGS' | 'CURRENT';
  bankName?: string;
  ifscCode?: string;
  branchName?: string;
  branchAddress?: string;
  branchCode?: string;
  branchPhone?: string;
}

export interface ExamSubject {
  subjectName: string;
  maxTheory: number;
  maxPractical: number;
  maxOral?: number;
  weightage?: number;
}

export interface ExamSchedule {
  id: string;
  examId: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  room?: string;
  invigilator?: string;
}

export interface GradeRule {
  id: string;
  grade: string;
  minPercent: number;
  maxPercent: number;
  point: number;
  remark: string;
}

export interface Exam {
  id: string;
  name: string;
  academicYear: string;
  className: string;
  startDate: string;
  endDate: string;
  examType: 'WRITTEN' | 'ORAL' | 'PRACTICAL' | 'MCQ';
  mode: 'ONLINE' | 'OFFLINE';
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED';
  subjects: ExamSubject[];
}

export interface FeeCategory {
  id: string;
  name: string;
  frequency: 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';
}

export interface FeeStructure {
  className: string;
  fees: {
    categoryId: string;
    amount: number;
  }[];
}

export interface AttendanceRecord {
  id: string;
  date: string;
  userId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
  markedBy: string;
}

export interface SubjectMarks {
  subjectName: string;
  theoryMarks: number;
  practicalMarks: number;
  totalMarks: number;
  grade: string;
  isLocked: boolean;
}

export interface Marksheet {
  id: string;
  studentId: string;
  examId: string;
  marks: SubjectMarks[];
  totalPercentage: number;
  overallGrade: string;
  rank: number;
  remarks: string;
  isResultPublished: boolean;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  type: string;
  receiptNo: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  description?: string;
  date: string;
  uploadedBy: string;
}

export interface NoticeMedia {
  url: string;
  type: 'image' | 'video' | 'pdf';
  name: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'URGENT' | 'GENERAL' | 'ACADEMIC' | 'EVENT';
  postedBy: string;
  attachments?: NoticeMedia[];
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  subject: string;
  className: string;
  section: string;
  dueDate: string;
  createdAt: string;
  createdBy: string;
  attachment?: NoticeMedia;
}

export interface CurriculumItem {
  id: string;
  class: string;
  subject: string;
  topic: string;
  description: string;
}

export interface TimetableEntry {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  className: string;
  section: string;
  room?: string;
  color?: string;
}
