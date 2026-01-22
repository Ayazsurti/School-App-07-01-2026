
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, IdCardTemplate, Student, IdCardField } from '../types';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Save, X, Plus, Smartphone, Monitor, Upload, 
  CheckCircle2, Loader2, Info, QrCode, ShieldCheck,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon,
  User as UserIconLucide,
  ArrowLeft,
  Lock,
  Unlock,
  Grid3X3,
  ImageIcon,
  Type,
  Layers,
  Sparkles,
  Scaling,
  MousePointer2,
  Settings,
  Circle,
  Square,
  FileSignature,
  ZoomIn,
  ZoomOut,
  LayoutTemplate,
  Shield,
  Minus,
  Trash2,
  Database,
  PlusCircle
} from 'lucide-react';
import { MOCK_STUDENTS, APP_NAME } from '../constants';

interface IdCardDesignerProps {
  user: User;
}

// PVC CR80 (ID-1) Standard Dimensions
const CR80_WIDTH = 85.60; // mm
const CR80_HEIGHT = 53.98; // mm

// List of all available student fields from Student Management
const AVAILABLE_STUDENT_FIELDS = [
  { key: 'fullName', label: 'Student Full Name' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'grNumber', label: 'GR Number' },
  { key: 'rollNo', label: 'Roll Number' },
  { key: 'class', label: 'Class/Grade' },
  { key: 'section', label: 'Section' },
  { key: 'medium', label: 'Medium' },
  { key: 'wing', label: 'Wing' },
  { key: 'gender', label: 'Gender' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'bloodGroup', label: 'Blood Group' },
  { key: 'aadharNo', label: 'Aadhar Card No' },
  { key: 'panNo', label: 'PAN Card No' },
  { key: 'uidId', label: 'UID ID' },
  { key: 'penNo', label: 'PEN Number' },
  { key: 'fatherName', label: "Father's Name" },
  { key: 'motherName', label: "Mother's Name" },
  { key: 'fatherMobile', label: "Father's Mobile" },
  { key: 'motherMobile', label: "Mother's Mobile" },
  { key: 'residenceAddress', label: 'Address' },
  { key: 'admissionDate', label: 'Admission Date' },
  { key: 'studentType', label: 'Student Category' },
  { key: 'birthPlace', label: 'Birth Place' },
];

const DEFAULT_FIELDS: IdCardField[] = [
  { key: 'fullName', label: 'NAME', visible: true, fontSize: 10, color: '#0f172a', bold: true, alignment: 'center', x: 2, y: 46, width: 50 },
  { key: 'class', label: 'STD', visible: true, fontSize: 7, color: '#4f46e5', bold: true, alignment: 'left', x: 5, y: 52, width: 25 },
  { key: 'grNumber', label: 'GR NO', visible: true, fontSize: 7, color: '#4f46e5', bold: true, alignment: 'right', x: 25, y: 52, width: 23 },
  { key: 'fatherMobile', label: 'MOBILE', visible: true, fontSize: 7, color: '#0f172a', bold: true, alignment: 'center', x: 2, y: 64, width: 50 },
];

const INITIAL_TEMPLATE: IdCardTemplate = {
  id: '',
  name: 'Standard PVC Master v4',
  orientation: 'VERTICAL',
  width: CR80_HEIGHT,
  height: CR80_WIDTH,
  headerBg: '#4f46e5',
  headerHeight: 18,
  headerText: APP_NAME,
  headerTextSize: 9,
  headerTextColor: '#ffffff',
  headerAlignment: 'center',
  headerX: 0,
  headerY: 0,
  logoInHeader: true,
  logoX: 5,
  logoY: 5,
  logoSize: 8,
  cardBgType: 'solid',
  cardBg: '#ffffff',
  cardBgSecondary: '#f8fafc',
  cardBgImage: '',
  cardBorderColor: '#e2e8f0',
  cardBorderWidth: 0.5,
  cardRounding: 3.18, 
  photoX: 14.5,
  photoY: 22,
  photoSize: 25,
  photoShape: 'ROUNDED',
  photoBorderSize: 1.5,
  photoBorderColor: '#ffffff',
  fields: DEFAULT_FIELDS,
  showBackSide: false,
  backsideContent: 'IF FOUND, PLEASE RETURN TO SCHOOL OFFICE.',
  backsideX: 5,
  backsideY: 10,
  backsideWidth: 44,
  showQr: true,
  qrSize: 12,
  qrX: 4,
  qrY: 4,
  principalSign: '',
  signX: 30,
  signY: 65,
  signWidth: 20,
  watermarkText: 'OFFICIAL',
  snapToGrid: true
};

const IdCardDesigner: React.FC<IdCardDesignerProps> = ({ user }) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<IdCardTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<IdCardTemplate | null>(null);
  const [activeSide, setActiveSide] = useState<'FRONT' | 'BACK'>('FRONT');
  
  // Initial zoom set to 20 (representing 20% scale) for a "small" open state
  const [zoom, setZoom] = useState(20);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [mainTab, setMainTab] = useState<'TEMPLATE' | 'ELEMENTS'>('TEMPLATE');
  const [elementCategory, setElementCategory] = useState<'BRANDING' | 'PROFILE' | 'DATA' | 'SECURITY'>('BRANDING');
  
  const [selectedElement, setSelectedElement] = useState<string | null>('PHOTO');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await db.idCards.getTemplates();
      setTemplates(data);
      if (data.length > 0) setActiveTemplate(data[0]);
      else setActiveTemplate({ ...INITIAL_TEMPLATE, id: 'temp-' + Date.now() });
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleUpdate = (updates: Partial<IdCardTemplate>) => {
    if (!activeTemplate) return;
    setActiveTemplate({ ...activeTemplate, ...updates });
  };

  const setOrientation = (type: 'VERTICAL' | 'HORIZONTAL') => {
    if (type === 'VERTICAL') {
      handleUpdate({ orientation: 'VERTICAL', width: CR80_HEIGHT, height: CR80_WIDTH });
    } else {
      handleUpdate({ orientation: 'HORIZONTAL', width: CR80_WIDTH, height: CR80_HEIGHT });
    }
  };

  const handleSave = async () => {
    if (!activeTemplate || !activeTemplate.name) return;
    setIsSaving(true);
    try {
      await db.idCards.upsertTemplate(activeTemplate);
      await createAuditLog(user, 'UPDATE', 'Identity', `Template Synced: ${activeTemplate.name}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchTemplates();
    } catch (e) { alert("Sync failed."); }
    finally { setIsSaving(false); }
  };

  const nudge = (axis: 'X' | 'Y', direction: 1 | -1, fine = false) => {
    if (!activeTemplate || !selectedElement) return;
    const step = fine ? 0.1 : 1;
    const amount = direction * step;

    if (selectedElement === 'PHOTO') {
      handleUpdate(axis === 'X' ? { photoX: activeTemplate.photoX + amount } : { photoY: activeTemplate.photoY + amount });
    } else if (selectedElement === 'QR') {
      handleUpdate(axis === 'X' ? { qrX: (activeTemplate.qrX || 4) + amount } : { qrY: (activeTemplate.qrY || 4) + amount });
    } else if (selectedElement === 'SIGN') {
      handleUpdate(axis === 'X' ? { signX: (activeTemplate.signX || 30) + amount } : { signY: (activeTemplate.signY || 65) + amount });
    } else if (selectedElement === 'LOGO') {
      handleUpdate(axis === 'X' ? { logoX: (activeTemplate.logoX || 5) + amount } : { logoY: (activeTemplate.logoY || 5) + amount });
    } else if (selectedElement === 'HEADER_TEXT') {
      handleUpdate(axis === 'X' ? { headerX: (activeTemplate.headerX || 0) + amount } : { headerY: (activeTemplate.headerY || 0) + amount });
    } else if (selectedElement.startsWith('FIELD_')) {
      const key = selectedElement.replace('FIELD_', '');
      const newFields = activeTemplate.fields.map(f => f.key === key ? { 
        ...f, 
        [axis.toLowerCase()]: (f as any)[axis.toLowerCase()] + amount 
      } : f);
      handleUpdate({ fields: newFields });
    }
  };

  const resizeElement = (direction: 1 | -1, fine = false) => {
    if (!activeTemplate || !selectedElement) return;
    const step = fine ? 0.2 : 1;
    const amount = direction * step;

    if (selectedElement === 'PHOTO') {
      handleUpdate({ photoSize: Math.max(10, activeTemplate.photoSize + amount) });
    } else if (selectedElement === 'QR') {
      handleUpdate({ qrSize: Math.max(5, (activeTemplate.qrSize || 10) + amount) });
    } else if (selectedElement === 'SIGN') {
      handleUpdate({ signWidth: Math.max(10, (activeTemplate.signWidth || 20) + amount) });
    } else if (selectedElement === 'LOGO') {
      handleUpdate({ logoSize: Math.max(2, (activeTemplate.logoSize || 8) + amount) });
    } else if (selectedElement.startsWith('FIELD_')) {
      const key = selectedElement.replace('FIELD_', '');
      const newFields = activeTemplate.fields.map(f => f.key === key ? { 
        ...f, 
        fontSize: Math.max(2, f.fontSize + (direction * 0.2))
      } : f);
      handleUpdate({ fields: newFields });
    }
  };

  const updateField = (key: string, updates: Partial<IdCardField>) => {
    if (!activeTemplate) return;
    const newFields = activeTemplate.fields.map(f => f.key === key ? { ...f, ...updates } : f);
    handleUpdate({ fields: newFields });
  };

  const addFieldToTemplate = (fieldKey: string) => {
    if (!activeTemplate) return;
    const fieldDef = AVAILABLE_STUDENT_FIELDS.find(f => f.key === fieldKey);
    if (!fieldDef) return;

    // Check if field already exists
    if (activeTemplate.fields.some(f => f.key === fieldKey)) {
      alert("This field is already present on the card.");
      return;
    }

    const newField: IdCardField = {
      key: fieldKey,
      label: fieldDef.label.split(' ')[0].toUpperCase(),
      visible: true,
      fontSize: 7,
      color: '#0f172a',
      bold: false,
      alignment: 'left',
      x: 5,
      y: 40,
      width: 44
    };

    handleUpdate({ fields: [...activeTemplate.fields, newField] });
    setSelectedElement(`FIELD_${fieldKey}`);
  };

  const removeField = (key: string) => {
    if (!activeTemplate) return;
    handleUpdate({ fields: activeTemplate.fields.filter(f => f.key !== key) });
    if (selectedElement === `FIELD_${key}`) setSelectedElement(null);
  };

  const previewStudent = MOCK_STUDENTS[0] as Student;

  // Actual scale passed to IdCardComponent. 
  // Adjusted to ensure scale remains useful within the new 1-50% constraints.
  // Multiply zoom by 0.15 so that 50% results in a scale of 7.5 (close to previous default).
  const currentScale = useMemo(() => zoom * 0.15, [zoom]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700 relative max-w-full mx-auto">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-5 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={28} strokeWidth={3} />
              <p className="font-black text-xs uppercase tracking-widest">Blueprint Secured</p>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/admin/dashboard')} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-800"><ArrowLeft size={24} /></button>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Identity Designer</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-xs tracking-[0.3em] flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500"/> PVC MASTER CONFIGURATION • LIVE ENGINE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-100 dark:border-slate-700">
             <button onClick={() => setZoom(z => Math.max(1, z-1))} className="p-3 text-slate-400 hover:text-indigo-600"><ZoomOut size={18}/></button>
             <div className="px-4 flex items-center font-black text-[10px] text-slate-400 uppercase w-16 justify-center">{zoom}%</div>
             <button onClick={() => setZoom(z => Math.min(50, z+1))} className="p-3 text-slate-400 hover:text-indigo-600"><ZoomIn size={18}/></button>
          </div>
          <button onClick={handleSave} disabled={isSaving || !activeTemplate} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 uppercase text-xs tracking-widest active:scale-95">
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Sync Blueprint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-4">
        {/* Left Column: Side Panel Controls */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col min-h-[750px]">
              {/* Primary Navigation */}
              <div className="flex bg-slate-50 dark:bg-slate-800/50 p-2 gap-2 border-b border-slate-100 dark:border-slate-800">
                 <button 
                  onClick={() => setMainTab('TEMPLATE')} 
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${mainTab === 'TEMPLATE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                 >
                    <LayoutTemplate size={14}/> Edit Template
                 </button>
                 <button 
                  onClick={() => setMainTab('ELEMENTS')} 
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${mainTab === 'ELEMENTS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                 >
                    <Layers size={14}/> Customize Elements
                 </button>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                {activeTemplate && (
                  <>
                    {/* EDIT TEMPLATE (Global Styles) */}
                    {mainTab === 'TEMPLATE' && (
                      <div className="space-y-8 animate-in slide-in-from-left-4">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Card Format</label>
                            <div className="grid grid-cols-2 gap-3">
                               <button onClick={() => setOrientation('VERTICAL')} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${activeTemplate.orientation === 'VERTICAL' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                                  <Smartphone size={28} />
                                  <span className="text-[9px] font-black uppercase">Portrait</span>
                               </button>
                               <button onClick={() => setOrientation('HORIZONTAL')} className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${activeTemplate.orientation === 'HORIZONTAL' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                                  <Monitor size={28} />
                                  <span className="text-[9px] font-black uppercase">Landscape</span>
                               </button>
                            </div>
                         </div>

                         <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Canvas Background</label>
                            <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl">
                               {(['solid', 'gradient', 'image'] as const).map(type => (
                                 <button key={type} onClick={() => handleUpdate({ cardBgType: type })} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-xl transition-all ${activeTemplate.cardBgType === type ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{type}</button>
                               ))}
                            </div>
                            
                            {activeTemplate.cardBgType === 'image' ? (
                               <button onClick={() => bgInputRef.current?.click()} className="w-full py-10 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center gap-2 text-slate-400 hover:bg-indigo-50 transition-all">
                                  <ImageIcon size={24}/>
                                  <span className="text-[9px] font-black uppercase tracking-widest">Upload Canvas Image</span>
                               </button>
                            ) : (
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                     <span className="text-[8px] font-black text-slate-400 uppercase ml-1">Primary</span>
                                     <input type="color" value={activeTemplate.cardBg} onChange={e => handleUpdate({ cardBg: e.target.value })} className="w-full h-12 rounded-2xl cursor-pointer border-none bg-transparent" />
                                  </div>
                                  {activeTemplate.cardBgType === 'gradient' && (
                                    <div className="space-y-1.5">
                                       <span className="text-[8px] font-black text-slate-400 uppercase ml-1">Secondary</span>
                                       <input type="color" value={activeTemplate.cardBgSecondary} onChange={e => handleUpdate({ cardBgSecondary: e.target.value })} className="w-full h-12 rounded-2xl cursor-pointer border-none bg-transparent" />
                                    </div>
                                  )}
                               </div>
                            )}
                            <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => handleUpdate({ cardBgImage: ev.target?.result as string });
                                reader.readAsDataURL(file);
                              }
                            }} />
                         </div>

                         <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                            <div className="flex justify-between items-center px-1">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Corner Rounding</label>
                               <span className="text-[10px] font-black text-indigo-600">{activeTemplate.cardRounding}mm</span>
                            </div>
                            <input type="range" min="0" max="10" step="0.1" value={activeTemplate.cardRounding} onChange={e => handleUpdate({ cardRounding: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                         </div>

                         <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Global Precision</label>
                            <button onClick={() => handleUpdate({ snapToGrid: !activeTemplate.snapToGrid })} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${activeTemplate.snapToGrid ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-600' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>
                               <div className="flex items-center gap-3">
                                  <Grid3X3 size={18}/>
                                  <span className="text-[10px] font-black uppercase tracking-widest">Snap-to-Grid Engine</span>
                               </div>
                               {activeTemplate.snapToGrid ? <Lock size={14}/> : <Unlock size={14}/>}
                            </button>
                         </div>
                      </div>
                    )}

                    {/* CUSTOMIZE ELEMENTS (Object Editor) */}
                    {mainTab === 'ELEMENTS' && (
                      <div className="space-y-8 animate-in slide-in-from-right-4 h-full flex flex-col">
                         {/* Element Category Selector */}
                         <div className="grid grid-cols-4 gap-2 no-print">
                            {[
                               { id: 'BRANDING', icon: <Sparkles size={14}/> },
                               { id: 'PROFILE', icon: <UserIconLucide size={14}/> },
                               { id: 'DATA', icon: <Type size={14}/> },
                               { id: 'SECURITY', icon: <Shield size={14}/> }
                            ].map(cat => (
                               <button 
                                key={cat.id} 
                                onClick={() => setElementCategory(cat.id as any)}
                                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${elementCategory === cat.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}
                               >
                                  {cat.icon}
                                  <span className="text-[7px] font-black uppercase">{cat.id}</span>
                               </button>
                            ))}
                         </div>

                         {/* Contextual Sub-panel */}
                         <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {elementCategory === 'BRANDING' && (
                               <div className="space-y-6 animate-in fade-in">
                                  <div className="space-y-4">
                                     <div className="flex justify-between items-center px-1">
                                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Header Node</h4>
                                        <button onClick={() => setSelectedElement('HEADER_TEXT')} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Move size={14}/></button>
                                     </div>
                                     <input type="text" value={activeTemplate.headerText} onChange={e => handleUpdate({ headerText: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 font-black uppercase text-xs outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                                     <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                           <span className="text-[8px] font-black text-slate-400 uppercase">Header Height</span>
                                           <input type="number" value={activeTemplate.headerHeight} onChange={e => handleUpdate({ headerHeight: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 font-black text-xs" />
                                        </div>
                                        <div className="space-y-1.5">
                                           <span className="text-[8px] font-black text-slate-400 uppercase">Font Scale</span>
                                           <input type="number" value={activeTemplate.headerTextSize} onChange={e => handleUpdate({ headerTextSize: parseInt(e.target.value) || 9 })} className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2 font-black text-xs" />
                                        </div>
                                     </div>
                                  </div>

                                  <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                                     <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-3">
                                           <input type="checkbox" id="l_active" checked={activeTemplate.logoInHeader} onChange={e => handleUpdate({ logoInHeader: e.target.checked })} className="w-5 h-5 rounded text-indigo-600" />
                                           <label htmlFor="l_active" className="text-[10px] font-black text-slate-400 uppercase">Institutional Logo</label>
                                        </div>
                                        <button onClick={() => setSelectedElement('LOGO')} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Move size={14}/></button>
                                     </div>
                                     <button onClick={() => logoInputRef.current?.click()} className="w-full py-4 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[8px] font-black uppercase text-slate-400 hover:bg-indigo-50 transition-all">
                                        <Upload size={14}/> Replace Asset
                                     </button>
                                     <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => {
                                       const file = e.target.files?.[0];
                                       if (file) {
                                         const reader = new FileReader();
                                         reader.onload = (ev) => handleUpdate({ customLogo: ev.target?.result as string });
                                         reader.readAsDataURL(file);
                                       }
                                     }} />
                                  </div>
                               </div>
                            )}

                            {elementCategory === 'PROFILE' && (
                               <div className="space-y-6 animate-in fade-in">
                                  <div className="space-y-4">
                                     <div className="flex justify-between items-center px-1">
                                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Portrait Lab</h4>
                                        <button onClick={() => setSelectedElement('PHOTO')} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Move size={14}/></button>
                                     </div>
                                     <div className="grid grid-cols-3 gap-2">
                                        {(['SQUARE', 'ROUNDED', 'CIRCLE'] as any).map((s: string) => (
                                          <button key={s} onClick={() => handleUpdate({ photoShape: s as any })} className={`py-4 rounded-2xl border transition-all ${activeTemplate.photoShape === s ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}>
                                             {s === 'CIRCLE' ? <Circle size={18} className="mx-auto" /> : s === 'SQUARE' ? <Square size={18} className="mx-auto" /> : <div className="w-5 h-5 border-2 border-current rounded-md mx-auto" />}
                                             <span className="text-[7px] font-black uppercase mt-2 block">{s}</span>
                                          </button>
                                        ))}
                                     </div>
                                  </div>
                                  <div className="space-y-4 pt-4">
                                     <div className="flex justify-between">
                                        <span className="text-[9px] font-black uppercase text-slate-400">Border Weight</span>
                                        <span className="text-[9px] font-black text-indigo-600">{activeTemplate.photoBorderSize}mm</span>
                                     </div>
                                     <input type="range" min="0" max="10" step="0.5" value={activeTemplate.photoBorderSize} onChange={e => handleUpdate({ photoBorderSize: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                                  </div>
                                  <div className="space-y-1.5 pt-2">
                                     <span className="text-[8px] font-black text-slate-400 uppercase ml-1">Stroke Color</span>
                                     <input type="color" value={activeTemplate.photoBorderColor} onChange={e => handleUpdate({ photoBorderColor: e.target.value })} className="w-full h-10 rounded-2xl cursor-pointer border-none bg-transparent" />
                                  </div>
                               </div>
                            )}

                            {elementCategory === 'DATA' && (
                               <div className="space-y-6 flex-1 flex flex-col animate-in fade-in">
                                  {/* Field Addition Toolbar */}
                                  <div className="bg-indigo-50 dark:bg-indigo-950/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800 space-y-3">
                                     <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                        <PlusCircle size={14}/> Add Metadata Field
                                     </div>
                                     <div className="relative">
                                        <select 
                                          onChange={e => { if(e.target.value) addFieldToTemplate(e.target.value); e.target.value = ''; }}
                                          className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none cursor-pointer"
                                        >
                                           <option value="">-- Select Field to Add --</option>
                                           {AVAILABLE_STUDENT_FIELDS.map(f => (
                                              <option key={f.key} value={f.key}>{f.label}</option>
                                           ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                     </div>
                                  </div>

                                  <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                     {activeTemplate.fields.map((f) => (
                                        <div key={f.key} className={`p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border transition-all space-y-4 group ${selectedElement === `FIELD_${f.key}` ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-800' : 'border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800'}`}>
                                           <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                 <input type="checkbox" checked={f.visible} onChange={e => updateField(f.key, { visible: e.target.checked })} className="w-5 h-5 rounded text-indigo-600" />
                                                 <div onClick={() => setSelectedElement(`FIELD_${f.key}`)} className="cursor-pointer">
                                                    <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px] block leading-none">{f.label}</span>
                                                    <span className="text-[7px] font-bold text-indigo-400 uppercase tracking-widest">{f.key}</span>
                                                 </div>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                 <button onClick={() => setSelectedElement(`FIELD_${f.key}`)} className={`p-2 rounded-lg transition-all ${selectedElement === `FIELD_${f.key}` ? 'bg-indigo-600 text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}><Move size={14}/></button>
                                                 <button onClick={() => removeField(f.key)} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={14}/></button>
                                              </div>
                                           </div>
                                           
                                           {f.visible && selectedElement === `FIELD_${f.key}` && (
                                             <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700 animate-in zoom-in-95">
                                                <div className="grid grid-cols-2 gap-3">
                                                   <div className="space-y-1">
                                                      <span className="text-[8px] font-black text-slate-400 uppercase ml-1">Label</span>
                                                      <input type="text" value={f.label} onChange={e => updateField(f.key, { label: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase" placeholder="Label" />
                                                   </div>
                                                   <div className="space-y-1">
                                                      <span className="text-[8px] font-black text-slate-400 uppercase ml-1">Font Size</span>
                                                      <input type="number" step="0.5" value={f.fontSize} onChange={e => updateField(f.key, { fontSize: parseFloat(e.target.value) })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[10px] font-black" placeholder="Size" />
                                                   </div>
                                                </div>
                                                <div className="flex gap-2">
                                                   <button onClick={() => updateField(f.key, { bold: !f.bold })} className={`flex-1 py-1.5 rounded-lg border transition-all ${f.bold ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-400'}`}><Bold size={12} className="mx-auto"/></button>
                                                   {(['left', 'center', 'right'] as const).map(align => (
                                                     <button key={align} onClick={() => updateField(f.key, { alignment: align })} className={`flex-1 py-1.5 rounded-lg border transition-all ${f.alignment === align ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-400'}`}>
                                                       {align === 'left' ? <AlignLeft size={12} className="mx-auto"/> : align === 'center' ? <AlignCenter size={12} className="mx-auto"/> : <AlignRight size={12} className="mx-auto"/>}
                                                     </button>
                                                   ))}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                   <label className="text-[8px] font-black text-slate-400 uppercase">Text Color</label>
                                                   <input type="color" value={f.color} onChange={e => updateField(f.key, { color: e.target.value })} className="flex-1 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700" />
                                                </div>
                                             </div>
                                           )}
                                        </div>
                                     ))}
                                  </div>
                               </div>
                            )}

                            {elementCategory === 'SECURITY' && (
                               <div className="space-y-8 animate-in fade-in">
                                  <div className="space-y-4">
                                     <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-3">
                                           <input type="checkbox" id="q_active" checked={activeTemplate.showQr} onChange={e => handleUpdate({ showQr: e.target.checked })} className="w-5 h-5 rounded text-indigo-600" />
                                           <label htmlFor="q_active" className="text-[10px] font-black text-slate-400 uppercase">Verification QR</label>
                                        </div>
                                        <button onClick={() => setSelectedElement('QR')} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Move size={14}/></button>
                                     </div>
                                     <div className="space-y-1.5">
                                        <span className="text-[8px] font-black text-slate-400 uppercase ml-1">QR Scale</span>
                                        <input type="range" min="5" max="30" step="1" value={activeTemplate.qrSize} onChange={e => handleUpdate({ qrSize: parseInt(e.target.value) })} className="w-full accent-indigo-600" />
                                     </div>
                                  </div>

                                  <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                                     <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authority Signature</label>
                                        <button onClick={() => setSelectedElement('SIGN')} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Move size={14}/></button>
                                     </div>
                                     <div 
                                       onClick={() => fileInputRef.current?.click()}
                                       className="h-28 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-3xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition-all overflow-hidden"
                                     >
                                        {activeTemplate.principalSign ? <img src={activeTemplate.principalSign} className="h-full object-contain mix-blend-multiply" /> : (
                                          <>
                                             <FileSignature size={24} className="text-slate-300" />
                                             <span className="text-[8px] font-black text-slate-400 uppercase mt-2">Upload Sign PNG</span>
                                          </>
                                        )}
                                     </div>
                                     <input type="file" ref={fileInputRef} className="hidden" accept="image/png" onChange={e => {
                                       const file = e.target.files?.[0];
                                       if (file) {
                                         const reader = new FileReader();
                                         reader.onload = (ev) => handleUpdate({ principalSign: ev.target?.result as string });
                                         reader.readAsDataURL(file);
                                       }
                                     }} />
                                  </div>
                               </div>
                            )}
                         </div>

                         {/* Common Movement Controls (Only visible when mainTab === 'ELEMENTS') */}
                         <div className="pt-6 border-t border-slate-50 dark:border-slate-800 space-y-4">
                            <div className="flex justify-between items-center mb-2 px-1">
                               <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest leading-none">Active Object Control</p>
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{selectedElement?.replace('FIELD_', '')}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 max-w-[160px] mx-auto">
                               <div />
                               <button onMouseDown={() => nudge('Y', -1)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><ChevronUp size={16}/></button>
                               <div />
                               <button onMouseDown={() => nudge('X', -1)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><ChevronLeft size={16}/></button>
                               <div className="flex items-center justify-center text-indigo-600"><MousePointer2 size={16}/></div>
                               <button onMouseDown={() => nudge('X', 1)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><ChevronRightIcon size={16}/></button>
                               <div />
                               <button onMouseDown={() => nudge('Y', 1)} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><ChevronDown size={16}/></button>
                               <div />
                            </div>

                            <div className="flex gap-2">
                               <button onMouseDown={() => resizeElement(-1)} className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-50 hover:text-rose-600 transition-all font-black text-[8px] uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                                  <Minus size={12}/> Scale -
                               </button>
                               <button onMouseDown={() => resizeElement(1)} className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 hover:text-emerald-600 transition-all font-black text-[8px] uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                                  <Plus size={12}/> Scale +
                               </button>
                            </div>
                         </div>
                      </div>
                    )}
                  </>
                )}
              </div>
           </div>

           <div className="p-8 bg-indigo-50 dark:bg-indigo-950/20 rounded-[3rem] border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-4">
              <Sparkles className="text-indigo-500 shrink-0 mt-1" size={20}/>
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-tight">Pro Studio Engine</p>
                 <p className="text-[8px] font-bold text-indigo-700/60 dark:text-indigo-400/60 leading-relaxed uppercase">Select elements on the card or use the 'Customize' tab for granular positioning and font scaling.</p>
              </div>
           </div>
        </div>

        {/* Right Column: High Fidelity Preview */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col items-center justify-center min-h-[850px] relative bg-white dark:bg-slate-900 rounded-[4rem] p-12 border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
           <div className="absolute inset-0 neural-grid-white opacity-20 pointer-events-none"></div>
           
           <div className="absolute top-10 left-1/2 -translate-x-1/2 flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner no-print z-40 border border-slate-200 dark:border-slate-700 gap-1">
              <button onClick={() => setActiveSide('FRONT')} className={`px-12 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSide === 'FRONT' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>Card Front Face</button>
              <button onClick={() => setActiveSide('BACK')} className={`px-12 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSide === 'BACK' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>Card Back Face</button>
           </div>

           {activeTemplate && (
              <div className="animate-in zoom-in-95 duration-700 relative">
                 {/* Visual Guides */}
                 <div className="absolute -inset-[2mm] border-2 border-dashed border-rose-500/10 pointer-events-none rounded-sm hidden lg:block" style={{ width: `${(activeTemplate.width + 4) * currentScale}mm`, height: `${(activeTemplate.height + 4) * currentScale}mm`, left: '-2mm', top: '-2mm' }}>
                    <span className="absolute -top-6 left-0 text-[8px] font-black text-rose-500 uppercase">2mm Trim Bleed</span>
                 </div>
                 <div className="absolute inset-[3mm] border border-dotted border-emerald-500/10 pointer-events-none rounded-sm hidden lg:block" style={{ zIndex: 100 }}>
                    <span className="absolute -bottom-6 left-0 text-[8px] font-black text-emerald-500 uppercase">3mm Safety Zone</span>
                 </div>

                 {/* Grid Overlay for Visual Snap */}
                 {activeTemplate.snapToGrid && (
                   <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)`, backgroundSize: `${5 * currentScale}mm ${5 * currentScale}mm` }}></div>
                 )}

                 <div className="absolute inset-0 translate-x-4 translate-y-4 bg-slate-900/5 blur-3xl rounded-[2rem] pointer-events-none"></div>
                 <IdCardComponent template={activeTemplate} student={previewStudent} scale={currentScale} side={activeSide} onSelectElement={(key) => {
                    setSelectedElement(key);
                    setMainTab('ELEMENTS');
                    // Automatically jump to the right element category if possible
                    if (['PHOTO'].includes(key)) setElementCategory('PROFILE');
                    else if (['LOGO', 'HEADER_TEXT'].includes(key)) setElementCategory('BRANDING');
                    else if (key.startsWith('FIELD_')) setElementCategory('DATA');
                    else if (['QR', 'SIGN'].includes(key)) setElementCategory('SECURITY');
                 }} />
                 
                 <div className="mt-16 flex flex-col items-center gap-2 opacity-30 no-print">
                    <div className="flex items-center gap-4 text-slate-400 font-black uppercase text-[10px] tracking-[0.5em]">
                      <span>READY FOR PVC THERMAL PRINT</span>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                      <span>WYSIWYG CANVAS</span>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>
      
      {/* Active Element Feedback Floating Tooltip */}
      <div className="fixed bottom-6 right-8 no-print flex gap-3 z-[1100]">
         {selectedElement && (
           <div className="bg-slate-900/90 backdrop-blur-xl px-8 py-4 rounded-3xl text-white shadow-2xl flex items-center gap-6 border border-white/10 animate-in slide-in-from-bottom-4">
              <div className="flex flex-col">
                 <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Focus Mode</span>
                 <span className="text-xs font-black uppercase tracking-tight">{selectedElement.replace('FIELD_', '')}</span>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <button onClick={() => setSelectedElement(null)} className="p-2 bg-white/5 hover:bg-rose-600 rounded-xl transition-all shadow-sm"><X size={16}/></button>
           </div>
         )}
      </div>
    </div>
  );
};

export const IdCardComponent: React.FC<{ 
  template: IdCardTemplate; 
  student: Student; 
  scale?: number; 
  side?: 'FRONT' | 'BACK';
  onSelectElement?: (key: string) => void;
}> = ({ template, student, scale = 1, side = 'FRONT', onSelectElement }) => {
  const unit = 'mm';
  
  const cardStyle: React.CSSProperties = {
    width: `${template.width * scale}${unit}`,
    height: `${template.height * scale}${unit}`,
    background: template.cardBgType === 'gradient' 
      ? `linear-gradient(135deg, ${template.cardBg} 0%, ${template.cardBgSecondary || '#f8fafc'} 100%)` 
      : template.cardBgType === 'image' && template.cardBgImage
      ? `url(${template.cardBgImage}) center/cover no-repeat`
      : template.cardBg,
    borderRadius: `${(template.cardRounding || 3.18) * scale}${unit}`,
    border: `${(template.cardBorderWidth || 0.5) * scale}${unit} solid ${template.cardBorderColor || '#e2e8f0'}`,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: `0 ${8 * scale}${unit} ${30 * scale}${unit} rgba(0,0,0,0.12)`,
    fontFamily: "'Poppins', sans-serif",
    transition: 'all 0.3s ease-out'
  };

  const handleElClick = (e: React.MouseEvent, key: string) => {
    if (onSelectElement) {
      e.stopPropagation();
      onSelectElement(key);
    }
  };

  if (side === 'BACK') {
    return (
      <div style={cardStyle} onClick={(e) => handleElClick(e, 'BACKSIDE')}>
         <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center pointer-events-none" style={{ fontSize: `${12 * scale}${unit}` }}>
            <span className="font-black rotate-[-35deg] uppercase">OFFICIAL IDENTITY</span>
         </div>
         <div 
            style={{ 
               position: 'absolute', 
               left: `${(template.backsideX || 5) * scale}${unit}`, 
               top: `${(template.backsideY || 5) * scale}${unit}`, 
               width: `${(template.backsideWidth || (template.width - 10)) * scale}${unit}`,
               fontSize: `${2.8 * scale}${unit}`,
               fontWeight: 800,
               color: '#1e293b',
               lineHeight: 1.6,
               textAlign: 'center',
               textTransform: 'uppercase'
            }}
         >
            {template.backsideContent}
         </div>
         <div className="absolute bottom-6 left-0 w-full flex flex-col items-center gap-2 opacity-20">
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center"><QrCode size={100} className="text-white scale-[0.5]" /></div>
            <p style={{ fontSize: `${1.2 * scale}${unit}` }} className="font-black uppercase tracking-[0.4em]">Institutional Data Node</p>
         </div>
      </div>
    );
  }

  return (
    <div style={cardStyle} onClick={(e) => handleElClick(e, 'CANVAS')}>
       {/* Background Watermark */}
       {template.watermarkText && (
         <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none rotate-[-35deg]">
            <span style={{ fontSize: `${10 * scale}${unit}` }} className="font-black uppercase">{template.watermarkText}</span>
         </div>
       )}

       {/* Floating Branded Elements */}
       <div style={{ position: 'absolute', width: '100%', height: `${(template.headerHeight || 18) * scale}${unit}`, backgroundColor: template.headerBg, zIndex: 5 }} />
       
       {template.logoInHeader && (
         <div 
           onClick={(e) => handleElClick(e, 'LOGO')}
           style={{ 
             position: 'absolute', 
             left: `${template.logoX * scale}${unit}`, 
             top: `${template.logoY * scale}${unit}`,
             width: `${(template.logoSize || 8) * scale}${unit}`, 
             height: `${(template.logoSize || 8) * scale}${unit}`,
             zIndex: 25
           }}
           className="bg-white rounded-md flex items-center justify-center shadow-sm overflow-hidden cursor-move hover:ring-2 hover:ring-indigo-400 transition-all"
         >
            {template.customLogo ? <img src={template.customLogo} className="w-full h-full object-contain" /> : <ShieldCheck className="text-indigo-600" size={14 * (scale / 4)} />}
         </div>
       )}

       <h2 
          onClick={(e) => handleElClick(e, 'HEADER_TEXT')}
          style={{ 
            position: 'absolute',
            left: `${(template.headerX || 0) * scale}${unit}`,
            top: `${(template.headerY || 0) * scale}${unit}`,
            width: '100%',
            height: `${(template.headerHeight || 18) * scale}${unit}`,
            fontSize: `${(template.headerTextSize || 9) * (scale / 3.5)}pt`, 
            color: template.headerTextColor,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} 
          className="font-black uppercase tracking-tight leading-none text-center cursor-move hover:bg-white/5 transition-colors"
        >
           {template.headerText}
        </h2>

       {/* Student Portrait */}
       <div 
          onClick={(e) => handleElClick(e, 'PHOTO')}
          style={{ 
             position: 'absolute',
             left: `${template.photoX * scale}${unit}`,
             top: `${template.photoY * scale}${unit}`,
             width: `${template.photoSize * scale}${unit}`,
             height: `${template.photoSize * scale}${unit}`,
             borderRadius: template.photoShape === 'CIRCLE' ? '50%' : template.photoShape === 'ROUNDED' ? `${scale * 1.5}${unit}` : '0px',
             border: `${(template.photoBorderSize || 1) * scale}${unit} solid ${template.photoBorderColor || '#fff'}`,
             boxShadow: `0 ${4 * scale}${unit} ${12 * scale}${unit} rgba(0,0,0,0.15)`,
             zIndex: 30
          }}
          className="bg-slate-100 overflow-hidden flex items-center justify-center cursor-move hover:ring-2 hover:ring-indigo-400 transition-all"
       >
          {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" /> : <UserIconLucide size={32 * (scale/4)} className="text-slate-300" />}
       </div>

       {/* Data Grid / Fields */}
       {template.fields.filter(f => f.visible).map(f => {
         let displayValue = (student as any)[f.key];
         
         // Special formatting for complex fields
         if (f.key === 'class') displayValue = `${student.class}-${student.section || 'A'}`;
         else if (f.key === 'fullName') displayValue = student.fullName;
         else if (f.key === 'grNumber') displayValue = student.grNumber;
         else if (f.key === 'residenceAddress') displayValue = student.residenceAddress;
         
         if (!displayValue) displayValue = 'N/A';

         const finalLabel = f.label ? `${f.label}: ` : '';
         const content = f.key === 'fullName' ? displayValue : `${finalLabel}${displayValue}`;

         return (
          <div 
              key={f.key} 
              onClick={(e) => handleElClick(e, `FIELD_${f.key}`)}
              style={{ 
                position: 'absolute',
                left: `${f.x * scale}${unit}`,
                top: `${f.y * scale}${unit}`,
                width: `${f.width * scale}${unit}`,
                fontSize: `${f.fontSize * (scale / 3.5)}pt`,
                color: f.color,
                fontWeight: f.bold ? 900 : 500,
                fontStyle: f.italic ? 'italic' : 'normal',
                textAlign: f.alignment as any,
                lineHeight: f.key === 'residenceAddress' ? 1.3 : 1,
                textTransform: 'uppercase',
                whiteSpace: f.key === 'residenceAddress' ? 'pre-wrap' : 'nowrap',
                zIndex: f.zIndex || 10,
                cursor: 'move'
              }}
              className={`${f.key === 'residenceAddress' ? "leading-tight" : "truncate"} hover:bg-black/5 transition-colors rounded-sm px-0.5`}
          >
              {content}
          </div>
         );
       })}

       {/* Security Dynamic QR */}
       {template.showQr && (
         <div 
            onClick={(e) => handleElClick(e, 'QR')}
            style={{ 
               position: 'absolute',
               left: `${(template.qrX || 4) * scale}${unit}`,
               top: `${(template.qrY || 4) * scale}${unit}`,
               width: `${(template.qrSize || 10) * scale}${unit}`,
               height: `${(template.qrSize || 10) * scale}${unit}`,
               backgroundColor: '#fff',
               padding: `${0.8 * scale}${unit}`,
               borderRadius: `${1.2 * scale}${unit}`,
               border: `${0.2 * scale}${unit} solid #eee`,
               zIndex: 40
            }}
            className="shadow-sm cursor-move hover:ring-2 hover:ring-indigo-400 transition-all"
         >
            <QrCode size={100} className="w-full h-full text-slate-900" />
         </div>
       )}

       {/* Validation Signature */}
       <div 
          onClick={(e) => handleElClick(e, 'SIGN')}
          style={{ 
             position: 'absolute',
             left: `${(template.signX || 30) * scale}${unit}`,
             top: `${(template.signY || 65) * scale}${unit}`,
             width: `${(template.signWidth || 20) * scale}${unit}`,
             textAlign: 'center',
             zIndex: 40
          }}
          className="cursor-move hover:bg-black/5 transition-colors p-1"
       >
          <div className="h-6 w-full flex items-center justify-center opacity-70">
             {template.principalSign ? <img src={template.principalSign} className="max-h-full object-contain mix-blend-multiply" /> : <div style={{height: `${0.5 * scale}${unit}`, width: '80%', background: '#ccc'}} />}
          </div>
          <p style={{ fontSize: `${1.2 * scale}${unit}`, marginTop: `${0.5 * scale}${unit}` }} className="font-black uppercase text-slate-400 tracking-widest">Authority Sign</p>
       </div>

       {/* Institutional Security Bar */}
       <div className="absolute right-0 top-0 h-full w-1 bg-indigo-600 opacity-20"></div>

       {/* Footer Node ID */}
       <div className="absolute bottom-1.5 left-2 opacity-15 flex flex-col items-start z-50">
          <p style={{ fontSize: `${1.0 * scale}${unit}` }} className="font-black uppercase tracking-[0.4em] leading-none">Security Node: 2026-DIS-0{Math.floor(Math.random()*9)}</p>
       </div>
    </div>
  );
};

export default IdCardDesigner;
