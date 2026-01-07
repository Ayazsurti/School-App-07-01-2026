
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Student, Exam } from '../types';
import { 
  Printer, 
  Download, 
  Star, 
  Award, 
  ShieldCheck, 
  User as UserIcon, 
  Search, 
  GraduationCap, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight,
  Upload,
  X,
  FileSignature,
  Info
} from 'lucide-react';
import { APP_NAME, MOCK_STUDENTS } from '../constants';

interface MarksheetGeneratorProps {
  user: User;
  schoolLogo: string | null;
}

const MarksheetGenerator: React.FC<MarksheetGeneratorProps> = ({ user, schoolLogo }) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const examId = queryParams.get('examId');
  const classNameParam = queryParams.get('className');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dynamic Signature States
  const [principalSign, setPrincipalSign] = useState<string | null>(() => localStorage.getItem('school_principal_sign'));
  const [currentClassTeacherSign, setCurrentClassTeacherSign] = useState<string | null>(null);
  
  const teacherSignRef = useRef<HTMLInputElement>(null);
  const principalSignRef = useRef<HTMLInputElement>(null);

  // Load the correct teacher signature whenever the selected student changes
  useEffect(() => {
    if (selectedStudent) {
      const signKey = `teacher_sign_${selectedStudent.class}_${selectedStudent.section}`;
      const savedSign = localStorage.getItem(signKey);
      setCurrentClassTeacherSign(savedSign);
    }
  }, [selectedStudent]);

  // Simulation of available students for the selected class
  const classStudents = useMemo(() => {
    const savedStudents = localStorage.getItem('school_students_db');
    const allStudents: Student[] = savedStudents ? JSON.parse(savedStudents) : MOCK_STUDENTS as any as Student[];
    
    if (user.role === 'STUDENT') return allStudents.filter(s => s.id === user.id);
    if (classNameParam) return allStudents.filter(s => s.class === classNameParam);
    return allStudents.slice(0, 10); 
  }, [user, classNameParam]);

  useEffect(() => {
    if (classStudents.length > 0 && !selectedStudent) {
      setSelectedStudent(classStudents[0]);
    }
  }, [classStudents]);

  // Handle Signature Uploads
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'teacher' | 'principal') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (type === 'teacher' && selectedStudent) {
          const signKey = `teacher_sign_${selectedStudent.class}_${selectedStudent.section}`;
          setCurrentClassTeacherSign(dataUrl);
          localStorage.setItem(signKey, dataUrl);
        } else if (type === 'principal') {
          setPrincipalSign(dataUrl);
          localStorage.setItem('school_principal_sign', dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSignature = (type: 'teacher' | 'principal') => {
    if (type === 'teacher' && selectedStudent) {
      const signKey = `teacher_sign_${selectedStudent.class}_${selectedStudent.section}`;
      setCurrentClassTeacherSign(null);
      localStorage.removeItem(signKey);
    } else if (type === 'principal') {
      setPrincipalSign(null);
      localStorage.removeItem('school_principal_sign');
    }
  };

  // Mock marks data 
  const marks = [
    { subject: 'Mathematics', theory: 68, practical: 25, total: 93, grade: 'A+', max: 100 },
    { subject: 'Science', theory: 62, practical: 28, total: 90, grade: 'A+', max: 100 },
    { subject: 'English', theory: 55, practical: 20, total: 75, grade: 'B+', max: 100 },
    { subject: 'History', theory: 58, practical: 15, total: 73, grade: 'B', max: 100 },
  ];

  const totalObtained = marks.reduce((acc, curr) => acc + curr.total, 0);
  const totalMax = marks.reduce((acc, curr) => acc + curr.max, 0);
  const percentage = (totalObtained / totalMax) * 100;

  const getFinalGrade = (p: number) => {
    if (p >= 90) return 'A+';
    if (p >= 80) return 'A';
    if (p >= 70) return 'B+';
    if (p >= 60) return 'B';
    if (p >= 50) return 'C';
    return 'D';
  };

  const filteredList = classStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.rollNo.includes(searchQuery)
  );

  const isAdminView = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="min-h-full dashboard-rainbow-bg -m-4 lg:-m-8 p-4 lg:p-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar for Admin/Teacher */}
        {isAdminView && (
          <div className="w-full lg:w-80 no-print flex flex-col gap-6">
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-xl border border-white/40">
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight mb-4 flex items-center gap-2">
                <GraduationCap className="text-indigo-600" /> Students Pool
              </h3>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Roll No or Name..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredList.map(student => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all border-2 text-left ${selectedStudent?.id === student.id ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white border-transparent hover:border-slate-100 hover:bg-slate-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedStudent?.id === student.id ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {student.rollNo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-sm truncate ${selectedStudent?.id === student.id ? 'text-white' : 'text-slate-800'}`}>{student.name}</p>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedStudent?.id === student.id ? 'text-indigo-100' : 'text-slate-400'}`}>Class {student.class}-{student.section}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Class-Wise Signature Tools */}
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-xl border border-white/40 space-y-6">
              <div className="px-1">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
                  <FileSignature className="text-indigo-600" size={18} /> Class Validation
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Digital Auth Center</p>
              </div>
              
              <div className="space-y-4">
                {/* Teacher Sign Upload - Scoped by Class */}
                <div>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sign: Std {selectedStudent?.class || '?'}-{selectedStudent?.section || '?'}</p>
                    {currentClassTeacherSign && <CheckCircle2 size={12} className="text-emerald-500" />}
                  </div>
                  <div 
                    onClick={() => teacherSignRef.current?.click()}
                    className={`h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-slate-50 relative group ${currentClassTeacherSign ? 'border-indigo-300' : 'border-slate-200 hover:border-indigo-400'}`}
                  >
                    <input type="file" ref={teacherSignRef} className="hidden" accept="image/*" onChange={(e) => handleSignatureUpload(e, 'teacher')} />
                    {currentClassTeacherSign ? (
                      <>
                        <img src={currentClassTeacherSign} className="w-full h-full object-contain p-2 mix-blend-multiply" alt="Teacher Sign" />
                        <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); clearSignature('teacher'); }}
                            className="p-2 bg-white rounded-xl shadow-xl text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <Upload size={16} className="text-slate-300 mx-auto mb-1" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">Upload Sign</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Principal Sign Upload - Global */}
                <div>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Principal Sign</p>
                    {principalSign && <CheckCircle2 size={12} className="text-emerald-500" />}
                  </div>
                  <div 
                    onClick={() => principalSignRef.current?.click()}
                    className={`h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-slate-50 relative group ${principalSign ? 'border-indigo-300' : 'border-slate-200 hover:border-indigo-400'}`}
                  >
                    <input type="file" ref={principalSignRef} className="hidden" accept="image/*" onChange={(e) => handleSignatureUpload(e, 'principal')} />
                    {principalSign ? (
                      <>
                        <img src={principalSign} className="w-full h-full object-contain p-2 mix-blend-multiply" alt="Principal Sign" />
                        <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); clearSignature('principal'); }}
                            className="p-2 bg-white rounded-xl shadow-xl text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <Upload size={16} className="text-slate-300 mx-auto mb-1" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">Upload Sign</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                 <Info size={14} className="text-indigo-400 mt-0.5" />
                 <p className="text-[8px] font-bold text-indigo-500 leading-relaxed uppercase">Teacher signatures are saved separately for each class and section.</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between no-print gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Academic Achievement</h1>
              <p className="text-slate-500 font-medium">Result profile for {selectedStudent?.name || user.name}</p>
            </div>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white font-black rounded-[1.5rem] hover:bg-slate-800 shadow-xl transition-all w-full sm:w-auto"
            >
              <Printer size={20} strokeWidth={3} /> Print Document
            </button>
          </div>

          {selectedStudent ? (
            <div className="bg-white rounded-[3rem] shadow-2xl border-8 border-slate-50 overflow-hidden relative print:border-0 print:shadow-none min-h-[1000px] flex flex-col">
              {/* Layout Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-35deg]">
                 <h2 className="text-[12rem] font-black uppercase text-indigo-900">DEEN-E-ISLAM</h2>
              </div>

              <div className="relative p-12 lg:p-16 flex-1 flex flex-col">
                {/* Header Section */}
                <div className="flex flex-col items-center text-center mb-16 relative z-10">
                  <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white font-bold text-5xl mb-6 overflow-hidden shadow-2xl ring-4 ring-indigo-50">
                    {schoolLogo ? (
                      <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                      'E'
                    )}
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-tight">{APP_NAME}</h2>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mt-3">Excellence in Academic Standards</p>
                  <div className="mt-8 flex items-center gap-3">
                    <div className="h-px w-16 bg-slate-200"></div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Progress Report • Session 2025-2026</p>
                    <div className="h-px w-16 bg-slate-200"></div>
                  </div>
                </div>

                {/* Identity Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16 bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100 relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Student Name</p>
                    <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">General Register (GR)</p>
                    {/* Fix: Property 'grNo' does not exist on type 'Student'. Replaced with 'grNumber'. */}
                    <p className="text-lg font-black text-slate-800">{selectedStudent.grNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Academic Placement</p>
                    <p className="text-lg font-black text-slate-800">Std {selectedStudent.class} / Sec {selectedStudent.section}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Institutional Roll</p>
                    <p className="text-lg font-black text-slate-800">#{selectedStudent.rollNo}</p>
                  </div>
                </div>

                {/* Academic Scores */}
                <div className="mb-16 relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                      <Award className="text-indigo-600" size={24} strokeWidth={3} /> Examination Matrix
                    </h4>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment Stage: Final Term</span>
                  </div>
                  
                  <div className="rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest">Academic Subject</th>
                          <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest">Theory</th>
                          <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest">Practical</th>
                          <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest">Total</th>
                          <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {marks.map((m) => (
                          <tr key={m.subject} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-6 font-black text-slate-800 text-sm uppercase">{m.subject}</td>
                            <td className="px-8 py-6 text-center text-slate-600 font-bold">{m.theory}</td>
                            <td className="px-8 py-6 text-center text-slate-600 font-bold">{m.practical}</td>
                            <td className="px-8 py-6 text-center font-black text-slate-900 text-lg">{m.total}</td>
                            <td className="px-8 py-6 text-center">
                              <span className={`inline-block px-4 py-1.5 rounded-xl text-xs font-black tracking-widest ${
                                m.grade.startsWith('A') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              }`}>
                                {m.grade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Final Assessment Summary */}
                <div className="flex flex-col md:flex-row gap-10 justify-between items-stretch mb-20 relative z-10">
                  <div className="flex-1 grid grid-cols-3 gap-6 bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white border-2 border-indigo-500/20">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Percent</p>
                      <p className="text-3xl font-black text-white">{percentage.toFixed(1)}%</p>
                    </div>
                    <div className="text-center border-x border-white/10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance</p>
                      <p className="text-3xl font-black text-indigo-400">{getFinalGrade(percentage)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-3xl font-black text-emerald-400">PASSED</p>
                    </div>
                  </div>
                  <div className="w-full md:w-80 bg-slate-50 border-2 border-slate-100 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center italic font-medium text-slate-500">
                    <p className="text-xs leading-relaxed text-slate-400 font-bold uppercase tracking-widest mb-3">Institutional Remarks</p>
                    <p className="text-sm">"Exceptional analytical capability observed. The student is highly encouraged to lead peer study groups in Science subjects."</p>
                  </div>
                </div>

                {/* Footer Signature Section - Dynamic Scoping */}
                <div className="mt-auto pt-16 border-t-4 border-dashed border-slate-100 grid grid-cols-3 items-end relative z-10">
                  {/* Teacher Sign */}
                  <div className="text-center flex flex-col items-center">
                    <div className="h-16 w-48 relative flex items-center justify-center mb-2">
                       {currentClassTeacherSign ? (
                         <img src={currentClassTeacherSign} className="max-h-full max-w-full object-contain mix-blend-multiply opacity-90 animate-in fade-in zoom-in-95 duration-500" alt="Teacher Sign" />
                       ) : (
                         <div className="w-full h-full border-b border-slate-200 opacity-20"></div>
                       )}
                    </div>
                    <div className="w-48 border-b-2 border-slate-300 mb-2"></div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Class Teacher (Std {selectedStudent.class})</p>
                  </div>
                  
                  {/* Validation Stamp */}
                  <div className="text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-4 border-2 border-emerald-100 shadow-xl shadow-emerald-50 animate-pulse">
                      <ShieldCheck size={40} strokeWidth={2.5} />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 tracking-[0.3em] uppercase">Digitally Verified</p>
                    <p className="text-[8px] font-bold text-slate-300 mt-1 uppercase">Institutional Record #2026</p>
                  </div>

                  {/* Principal Sign */}
                  <div className="text-center flex flex-col items-center">
                    <div className="h-16 w-48 relative flex items-center justify-center mb-2">
                       {principalSign ? (
                         <img src={principalSign} className="max-h-full max-w-full object-contain mix-blend-multiply opacity-90" alt="Principal Sign" />
                       ) : (
                         <div className="w-full h-full border-b border-slate-200 opacity-20"></div>
                       )}
                    </div>
                    <div className="w-48 border-b-2 border-slate-300 mb-2"></div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Principal / Administrator</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/70 backdrop-blur-xl p-32 rounded-[3rem] text-center border-4 border-dashed border-white/50 flex flex-col items-center">
               <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                  <Search size={48} />
               </div>
               <h3 className="text-3xl font-black text-slate-800 mb-3">Institutional Archive</h3>
               <p className="text-slate-500 font-medium max-w-sm mx-auto text-lg leading-relaxed">Select a student from the sidebar terminal to generate and authenticate their academic marksheet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Trash2 = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);

export default MarksheetGenerator;
