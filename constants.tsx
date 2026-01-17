
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  FileSpreadsheet, 
  CreditCard, 
  BookOpen, 
  Bell, 
  Settings,
  UserCheck,
  Images,
  CalendarDays,
  Video,
  ClipboardList,
  WalletCards,
  Contact,
  History,
  PencilRuler,
  BadgeDollarSign,
  Receipt,
  SearchCode,
  Settings2,
  UtensilsCrossed,
  MessageSquareQuote,
  SlidersHorizontal,
  FileClock,
  Banknote,
  Stamp,
  Palette,
  BarChart3,
  Globe
} from 'lucide-react';
import { TimetableEntry, Student } from './types';

export const APP_NAME = "Deen-E-islam School";

export const NAVIGATION = {
  ADMIN: [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin/dashboard' },
    { name: 'School Branding', icon: <Stamp size={20} />, path: '/admin/branding' },
    { name: 'Display Configure', icon: <Palette size={20} />, path: '/admin/display-config' },
    { name: 'Student Management', icon: <Users size={20} />, path: '/admin/students' },
    { name: 'ID Card Gen', icon: <CreditCard size={20} />, path: '/admin/id-cards' },
    { name: 'Teacher Management', icon: <UserCheck size={20} />, path: '/admin/teachers' },
    { name: 'Homework', icon: <PencilRuler size={20} />, path: '/admin/homework' },
    { name: 'Curriculum', icon: <BookOpen size={20} />, path: '/admin/curriculum' },
    { name: 'Attendance', icon: <CalendarCheck size={20} />, path: '/teacher/attendance' },
    { name: 'Timetable', icon: <CalendarDays size={20} />, path: '/admin/timetable' },
    { name: 'Food Chart', icon: <UtensilsCrossed size={20} />, path: '/admin/food-chart' },
    { name: 'SMS Panel', icon: <MessageSquareQuote size={20} />, path: '/admin/sms' },
    { name: 'Fee Management', icon: <Banknote size={20} />, path: '/admin/fees/management' },
    { name: 'Online Fees Payment', icon: <Globe size={20} />, path: '/admin/fees/management' },
    { name: 'Fee Setup', icon: <Settings2 size={20} />, path: '/admin/fees/setup' },
    { name: 'Studentwise Fee', icon: <BadgeDollarSign size={20} />, path: '/admin/fees/studentwise' },
    { name: 'Receipt Config', icon: <Settings size={20} />, path: '/admin/fees/receipt-config' },
    { name: 'General Receipt', icon: <Receipt size={20} />, path: '/admin/fees/general-receipt' },
    { name: 'Fee Ledger', icon: <SearchCode size={20} />, path: '/admin/fees/search' },
    { name: 'Online Fees Audit', icon: <FileClock size={20} />, path: '/admin/fees/audit' },
    { name: 'Exams', icon: <ClipboardList size={20} />, path: '/admin/exams' },
    { name: 'Marksheets', icon: <FileSpreadsheet size={20} />, path: '/admin/marksheet' },
    { name: 'Gallery', icon: <Images size={20} />, path: '/admin/gallery' },
    { name: 'Notice Board', icon: <Bell size={20} />, path: '/admin/notices' },
    { name: 'System Logs', icon: <History size={20} />, path: '/admin/audit' },
  ],
  TEACHER: [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/teacher/dashboard' },
    { name: 'Attendance', icon: <CalendarCheck size={20} />, path: '/teacher/attendance' },
    { name: 'Curriculum', icon: <BookOpen size={20} />, path: '/teacher/curriculum' },
    { name: 'Homework', icon: <PencilRuler size={20} />, path: '/teacher/homework' },
    { name: 'Timetable', icon: <CalendarDays size={20} />, path: '/teacher/timetable' },
    { name: 'Food Chart', icon: <UtensilsCrossed size={20} />, path: '/teacher/food-chart' },
    { name: 'SMS Panel', icon: <MessageSquareQuote size={20} />, path: '/teacher/sms' },
    { name: 'Fee Management', icon: <Banknote size={20} />, path: '/teacher/fees' },
    { name: 'Online Fees Payment', icon: <Globe size={20} />, path: '/teacher/fees' },
    { name: 'Gallery', icon: <Images size={20} />, path: '/teacher/gallery' },
    { name: 'Notices', icon: <Bell size={20} />, path: '/teacher/notices' },
  ],
  STUDENT: [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/student/dashboard' },
    { name: 'Attendance', icon: <CalendarCheck size={20} />, path: '/student/attendance' },
    { name: 'Curriculum', icon: <BookOpen size={20} />, path: '/student/curriculum' },
    { name: 'Homework', icon: <PencilRuler size={20} />, path: '/student/homework' },
    { name: 'Food Chart', icon: <UtensilsCrossed size={20} />, path: '/student/food-chart' },
    { name: 'Fees', icon: <CreditCard size={20} />, path: '/student/fees' },
    { name: 'Online Fees Payment', icon: <Globe size={20} />, path: '/student/fees' },
    { name: 'Timetable', icon: <CalendarDays size={20} />, path: '/student/timetable' },
    { name: 'Gallery', icon: <Images size={20} />, path: '/student/gallery' },
    { name: 'Notice Board', icon: <Bell size={20} />, path: '/student/notices' },
  ]
};

export const MOCK_STUDENTS: Partial<Student>[] = [
  { 
    id: 'student-master', 
    name: 'Star Student', 
    fullName: 'Star Student',
    penNo: 'ABCDE1234F',
    aadharNo: '1234-5678-9012',
    uidId: 'UID-992211',
    grNumber: 'GR-1001',
    residenceAddress: '123, Green Street, City Center',
    fatherName: 'Quincy Doe Sr.',
    motherName: 'Sarah Doe',
    fatherMobile: '9876543210',
    motherMobile: '9876543212',
    rollNo: '101', 
    class: '10th', 
    section: 'A', 
    role: 'STUDENT',
    email: 'student@edu.node',
    mobile: '9876543210'
  }
];

export const MOCK_TEACHERS = [
  { id: 'T001', name: 'Prof. Robert Miller', staffId: 'TEA-101', subject: 'Mathematics', mobile: '9000011111' },
];

export const MOCK_SUBJECTS = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Art', 'Arabic', 'Islamic Studies'];

export const MOCK_TIMETABLE: TimetableEntry[] = [
  { id: 'p1', day: 'Monday', startTime: '08:00', endTime: '08:45', subject: 'Mathematics', teacherId: 'T001', teacherName: 'Prof. Robert Miller', className: '10th', section: 'A', color: 'indigo' },
];
