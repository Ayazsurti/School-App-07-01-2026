
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

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'DUE';
export type PaymentMode = 'CASH' | 'UPI' | 'GOOGLE_PAY' | 'PHONE_PE' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'BANK_TRANSFER';

export interface QuarterFee {
  total: number;
  paid: number;
  pending: number;
  status: PaymentStatus;
  mode?: PaymentMode;
  date?: string;
}

export interface StudentFees {
  q1: QuarterFee;
  q2: QuarterFee;
  q3: QuarterFee;
  q4: QuarterFee;
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
  fatherPhoto?: string;
  motherPhoto?: string;
  fees?: StudentFees;
  status?: string;
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
    quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  }[];
}

export interface AttendanceRecord {
  id: string;
  date: string;
  userId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
  markedBy: string;
}

export interface ExamSubject {
  subjectName: string;
  maxTheory: number;
  maxPractical: number;
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
  subjects?: ExamSubject[];
}

export interface ExamSchedule {
  id?: string;
  exam_id?: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  room?: string;
  invilogator?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  type: string;
  receiptNo: string;
  quarter?: string;
  mode?: string;
}

export interface TimetableEntry {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  className: string;
  section: string;
  color?: string;
}

export interface NoticeMedia {
  url: string;
  type: 'pdf' | 'image' | 'video' | string;
  name?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  date: string;
  postedBy: string;
  attachments: NoticeMedia[];
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

export interface GradeRule {
  id: string;
  grade: string;
  minPercent: number;
  maxPercent: number;
  point: number;
  remark: string;
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
