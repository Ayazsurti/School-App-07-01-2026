
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImage?: string;
  enrollmentId?: string;
  staffId?: string;
  mobile?: string;
}

export interface Student extends User {
  // Personal Fields
  fullName: string;
  panNumber: string;
  aadharNumber: string;
  uidNumber: string;
  grNumber: string;
  residenceAddress: string;

  // Parental Information
  fatherName: string;
  motherName: string;
  fatherMobile: string;
  motherMobile: string;

  // System Essentials (Required for Attendance/Fees functionality)
  class: string;
  section: string;
  rollNo: string;

  // Extended Details
  dateOfAdmission?: string;
  dateOfBirth?: string;
  remarks?: string;
}

export interface Teacher extends User {
  subject: string;
  classes: string[];
  mobile: string;
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
  subjects: ExamSubject[];
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
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
}

export interface Marksheet {
  id: string;
  studentId: string;
  examId: string;
  marks: SubjectMarks[];
  totalPercentage: number;
  overallGrade: string;
  remarks: string;
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
