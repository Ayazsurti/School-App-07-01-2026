
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, IdCardTemplate, Student, IdCardField } from '../types';
import { db, supabase } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Palette, Save, X, Plus, Trash2, LayoutTemplate, 
  Smartphone, Monitor, ChevronRight, Upload, Type, 
  Layers, Maximize, CheckCircle2, Loader2, Info, 
  Settings2, Eye, QrCode, ShieldCheck, Shield,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  Square, Circle, AppWindow, MousePointer2, RefreshCw, FlipVertical,
  Minus, ZoomIn, ZoomOut, Layers2, Sparkles, Image as ImageIcon,
  Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon,
  Maximize2, Minimize2, Phone, MapPin, User as UserIconLucide
} from 'lucide-react';
import { MOCK_STUDENTS, APP_NAME } from '../constants';

interface IdCardDesignerProps {
  user: User;
}

const CR80_WIDTH = 85.60;
const CR80_HEIGHT = 53.98;

const DEFAULT_FIELDS: IdCardField[] = [
  { key: 'fullName', label: 'Student Name', visible: true, fontSize: 10, color: '#0f172a', bold: true, alignment: 'center', x: 2, y: 46, width: 50 },
  { key: 'class', label: 'Class', visible: true, fontSize: 7, color: '#4f46e5', bold: true, alignment: 'left', x: 5, y: 52, width: 25 },
  { key: 'grNumber', label: 'GR NO', visible: true, fontSize: 7, color: '#4f46e5', bold: true, alignment: 'right', x: 25, y: 52, width: 23 },
  { key: 'fatherName', label: 'Father Name', visible: true, fontSize: 6, color: '#64748b', bold: true, alignment: 'center', x: 2, y: 58, width: 50 },
  { key: 'fatherMobile', label: 'Contact', visible: true, fontSize: 7, color: '#0f172a', bold: true, alignment: 'center', x: 2, y: 64, width: 50 },
  { key: 'residenceAddress', label: 'Address', visible: true, fontSize: 5, color: '#475569', bold: false, alignment: 'center', x: 4, y: 70, width: 46 },
];

const INITIAL_TEMPLATE: IdCardTemplate = {
  id: '',
  name: 'Front-Master v2',
  orientation: 'VERTICAL',
  width: CR80_HEIGHT,
  height: CR80_WIDTH,
  headerBg: '#4f46e5',
  headerHeight: 18,
  headerText: APP_NAME,
  headerTextSize: 9,
  headerTextColor: '#ffffff',
  headerAlignment: 'center',
  cardBgType: 'solid',
  cardBg: '#ffffff',
  cardBgSecondary: '#f8fafc',
  cardBorderColor: '#e2e8f0',
  cardBorderWidth: 1,
  cardRounding: 8,
  photoX: 14.5,
  photoY: 22,
  photoSize: 25,
  photoShape: 'ROUNDED',
  photoBorderSize: 1.5,
  photoBorderColor: '#ffffff',
  fields: DEFAULT_FIELDS,
  showBackSide: false,
  backsideContent: 'If found, please return to school office.',
  backsideX: 5,
  backsideY: 10,
  backsideWidth: 44,
  showQr: true,
  qrSize: 10,
  qrX: 4,
  qrY: 4,
  signX: 30,
  signY: 62,
  signWidth: 16,
  logoInHeader: true,
  watermarkText: 'VERIFIED'
};

const IdCardDesigner: React.FC<IdCardDesignerProps> = ({ user }) => {
  const [templates, setTemplates] = useState<IdCardTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<IdCardTemplate | null>(null);
  const [activeSide, setActiveSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [zoom, setZoom] = useState(7);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'OBJECTS' | 'BRANDING' | 'LAYOUT' | 'REVERSE'>('OBJECTS');
  const [selectedElement, setSelectedElement] = useState<string | null>('PHOTO');

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

  const handleSave = async () => {
    if (!activeTemplate || !activeTemplate.name) return;
    setIsSaving(true);
    try {
      await db.idCards.upsertTemplate(activeTemplate);
      await createAuditLog(user, 'UPDATE', 'Identity', `ID Studio Save: ${activeTemplate.name}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchTemplates();
    } catch (e) { alert("Save failed."); }
    finally { setIsSaving(false); }
  };

  const nudge = (axis: 'X' | 'Y', direction: 1 | -1) => {
    if (!activeTemplate || !selectedElement) return;
    const step = 0.5;
    const amount = direction * step;

    if (selectedElement === 'PHOTO') {
      handleUpdate(axis === 'X' ? { photoX: activeTemplate.photoX + amount } : { photoY: activeTemplate.photoY + amount });
    } else if (selectedElement === 'QR') {
      handleUpdate(axis === 'X' ? { qrX: activeTemplate.qrX + amount } : { qrY: activeTemplate.qrY + amount });
    } else if (selectedElement === 'SIGN') {
      handleUpdate(axis === 'X' ? { signX: activeTemplate.signX + amount } : { signY: activeTemplate.signY + amount });
    } else if (selectedElement.startsWith('FIELD_')) {
      const key = selectedElement.replace('FIELD_', '');
      const newFields = activeTemplate.fields.map(f => f.key === key ? { 
        ...f, 
        [axis.toLowerCase()]: (f as any)[axis.toLowerCase()] + amount 
      } : f);
      handleUpdate({ fields: newFields });
    }
  };

  const resize = (direction: 1 | -1) => {
    if (!activeTemplate || !selectedElement) return;
    const step = 1;
    const amount = direction * step;

    if (selectedElement === 'PHOTO') {
      handleUpdate({ photoSize: activeTemplate.photoSize + amount });
    } else if (selectedElement === 'QR') {
      handleUpdate({ qrSize: activeTemplate.qrSize + amount });
    } else if (selectedElement === 'SIGN') {
      handleUpdate({ signWidth: activeTemplate.signWidth + amount });
    } else if (selectedElement.startsWith('FIELD_')) {
      const key = selectedElement.replace('FIELD_', '');
      const newFields = activeTemplate.fields.map(f => f.key === key ? { 
        ...f, 
        fontSize: Math.max(2, f.fontSize + (direction * 0.5))
      } : f);
      handleUpdate({ fields: newFields });
    }
  };

  const previewStudent = MOCK_STUDENTS[0] as Student;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700 relative max-w-[1600px] mx-auto">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={28} strokeWidth={3} />
              <p className="font-black text-xs uppercase tracking-widest">Layout Node Synced</p>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Studio Designer</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-xs tracking-[0.3em] flex items-center gap-2">
            <Move size={14} className="text-indigo-600"/> All-On-Front Master Logic • डिज़ाइनर
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-100 mr-4">
             <button onClick={() => setZoom(z => Math.max(2, z-1))} className="p-3 text-slate-400 hover:text-indigo-600"><ZoomOut size={18}/></button>
             <div className="px-4 flex items-center font-black text-[10px] text-slate-400">{Math.round(zoom * 14.2)}%</div>
             <button onClick={() => setZoom(z => Math.min(15, z+1))} className="p-3 text-slate-400 hover:text-indigo-600"><ZoomIn size={18}/></button>
          </div>
          <button onClick={handleSave} disabled={isSaving || !activeTemplate} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 uppercase text-xs tracking-widest">
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Commit Layout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1">
                 {(['OBJECTS', 'BRANDING', 'LAYOUT', 'REVERSE'] as any).map((t: string) => (
                   <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-4 text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{t}</button>
                 ))}
              </div>

              <div className="p-8 space-y-8">
                {activeTemplate && (
                  <>
                    {activeTab === 'OBJECTS' && (
                      <div className="space-y-6">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Canvas Element</label>
                        <select 
                           value={selectedElement || ''} 
                           onChange={e => setSelectedElement(e.target.value)}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-5 py-4 font-black uppercase text-xs outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner appearance-none cursor-pointer"
                        >
                           <option value="PHOTO">Student Portrait / फोटो</option>
                           <option value="QR">Identity QR / क्यूआर</option>
                           <option value="SIGN">Authority Sign / हस्ताक्षर</option>
                           {activeTemplate.fields.map(f => (
                             <option key={f.key} value={`FIELD_${f.key}`}>{f.label} / क्षेत्र</option>
                           ))}
                        </select>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nudge Position</label>
                           </div>
                           <div className="grid grid-cols-3 gap-2 max-w-[150px] mx-auto">
                              <div />
                              <button onClick={() => nudge('Y', -1)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><ChevronUp size={20}/></button>
                              <div />
                              <button onClick={() => nudge('X', -1)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><ChevronLeft size={20}/></button>
                              <div className="flex items-center justify-center text-indigo-600"><Move size={20}/></div>
                              <button onClick={() => nudge('X', 1)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><ChevronRightIcon size={20}/></button>
                              <div />
                              <button onClick={() => nudge('Y', 1)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><ChevronDown size={20}/></button>
                              <div />
                           </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Object / Font Scaling</label>
                           <div className="flex gap-2">
                              <button onClick={() => resize(-1)} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center gap-2 hover:bg-rose-50 hover:text-rose-600 transition-all text-slate-400 font-black text-[8px] uppercase">
                                 <Minimize2 size={20}/> Smaller
                              </button>
                              <button onClick={() => resize(1)} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center gap-2 hover:bg-emerald-50 hover:text-emerald-600 transition-all text-slate-400 font-black text-[8px] uppercase">
                                 <Maximize2 size={20}/> Bigger
                              </button>
                           </div>
                        </div>
                      </div>
                    )}
                    {/* Other tabs simplified for space */}
                    {activeTab === 'BRANDING' && (
                       <div className="space-y-6">
                          <input type="text" value={activeTemplate.headerText} onChange={e => handleUpdate({ headerText: e.target.value })} className="w-full bg-slate-50 rounded-xl px-5 py-4 font-black uppercase text-xs" placeholder="School Name" />
                          <div className="grid grid-cols-2 gap-4">
                             <input type="color" value={activeTemplate.headerBg} onChange={e => handleUpdate({ headerBg: e.target.value })} className="w-full h-10 rounded-xl" />
                             <input type="color" value={activeTemplate.headerTextColor} onChange={e => handleUpdate({ headerTextColor: e.target.value })} className="w-full h-10 rounded-xl" />
                          </div>
                       </div>
                    )}
                    {activeTab === 'LAYOUT' && (
                       <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-3">
                             <button onClick={() => handleUpdate({ orientation: 'VERTICAL', width: CR80_HEIGHT, height: CR80_WIDTH })} className={`p-4 rounded-2xl border-2 transition-all ${activeTemplate.orientation === 'VERTICAL' ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'}`}><Smartphone className="mx-auto" /></button>
                             <button onClick={() => handleUpdate({ orientation: 'HORIZONTAL', width: CR80_WIDTH, height: CR80_HEIGHT })} className={`p-4 rounded-2xl border-2 transition-all ${activeTemplate.orientation === 'HORIZONTAL' ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'}`}><Monitor className="mx-auto" /></button>
                          </div>
                          <input type="range" min="0" max="32" value={activeTemplate.cardRounding} onChange={e => handleUpdate({ cardRounding: parseInt(e.target.value) })} className="w-full accent-indigo-600" />
                       </div>
                    )}
                    {activeTab === 'REVERSE' && (
                       <textarea rows={5} value={activeTemplate.backsideContent} onChange={e => handleUpdate({ backsideContent: e.target.value })} className="w-full bg-slate-50 border-none rounded-[2rem] p-6 text-xs font-medium shadow-inner" />
                    )}
                  </>
                )}
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 flex flex-col items-center justify-center min-h-[850px] relative bg-white dark:bg-slate-900 rounded-[4rem] p-12 border border-slate-100 overflow-hidden shadow-sm">
           <div className="absolute inset-0 neural-grid-white opacity-20 pointer-events-none"></div>
           <div className="absolute top-10 left-12 flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner no-print">
              <button onClick={() => setActiveSide('FRONT')} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSide === 'FRONT' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>Front Aspect</button>
              <button onClick={() => setActiveSide('BACK')} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSide === 'BACK' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>Back Aspect</button>
           </div>

           {activeTemplate && (
              <div className="animate-in zoom-in-95 duration-700 relative">
                 <div className="absolute inset-0 translate-x-4 translate-y-4 bg-slate-900/5 blur-3xl rounded-[2rem] pointer-events-none"></div>
                 <IdCardComponent template={activeTemplate} student={previewStudent} scale={zoom} side={activeSide} />
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export const IdCardComponent: React.FC<{ template: IdCardTemplate; student: Student; scale?: number; side?: 'FRONT' | 'BACK' }> = ({ template, student, scale = 1, side = 'FRONT' }) => {
  const unit = 'mm';
  
  const cardStyle: React.CSSProperties = {
    width: `${template.width * scale}${unit}`,
    height: `${template.height * scale}${unit}`,
    background: template.cardBgType === 'gradient' ? `linear-gradient(135deg, ${template.cardBg} 0%, ${template.cardBgSecondary} 100%)` : template.cardBg,
    borderRadius: `${template.cardRounding * (scale / 4)}${unit}`,
    border: `${template.cardBorderWidth * (scale / 4)}${unit} solid ${template.cardBorderColor}`,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: `0 ${10 * scale}${unit} ${40 * scale}${unit} rgba(0,0,0,0.15)`,
    fontFamily: "'Poppins', sans-serif"
  };

  if (side === 'BACK') {
    return (
      <div style={cardStyle}>
         <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center pointer-events-none" style={{ fontSize: `${12 * scale}${unit}` }}>
            <span className="font-black rotate-[-35deg] uppercase">RESTRICTED</span>
         </div>
         <div 
            style={{ 
               position: 'absolute', 
               left: `${template.backsideX * scale}${unit}`, 
               top: `${template.backsideY * scale}${unit}`, 
               width: `${template.backsideWidth * scale}${unit}`,
               fontSize: `${2.8 * scale}${unit}`,
               fontWeight: 700,
               color: '#444',
               lineHeight: 1.5,
               textAlign: 'center',
               textTransform: 'uppercase'
            }}
         >
            {template.backsideContent}
         </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
       <div style={{ height: `${template.headerHeight * scale}${unit}`, backgroundColor: template.headerBg }} className="flex items-center justify-center px-4 gap-2">
          {template.logoInHeader && <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center shadow-sm" style={{ width: `${5.5 * scale}${unit}`, height: `${5.5 * scale}${unit}` }}><ShieldCheck className="text-indigo-600" size={14 * (scale / 4)} /></div>}
          <h2 style={{ fontSize: `${template.headerTextSize * (scale / 3.5)}pt`, color: template.headerTextColor }} className="font-black uppercase tracking-tight leading-none text-center">
             {template.headerText}
          </h2>
       </div>

       <div 
          style={{ 
             position: 'absolute',
             left: `${template.photoX * scale}${unit}`,
             top: `${template.photoY * scale}${unit}`,
             width: `${template.photoSize * scale}${unit}`,
             height: `${template.photoSize * scale}${unit}`,
             borderRadius: template.photoShape === 'CIRCLE' ? '50%' : template.photoShape === 'ROUNDED' ? `${scale * 1.5}${unit}` : '0px',
             border: `${template.photoBorderSize * (scale / 4)}${unit} solid ${template.photoBorderColor}`,
             boxShadow: `0 ${4 * scale}${unit} ${12 * scale}${unit} rgba(0,0,0,0.1)`
          }}
          className="bg-slate-50 overflow-hidden flex items-center justify-center z-20"
       >
          {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" /> : <UserIcon size={32 * (scale/4)} />}
       </div>

       {template.fields.filter(f => f.visible).map(f => {
         const isAddress = f.key === 'residenceAddress';
         const isContact = f.key === 'fatherMobile';
         const isName = f.key === 'fullName';
         
         let displayValue = (student as any)[f.key] || '-';
         
         // Custom formatting for contact field to include Father/Mother context if needed
         if (isContact) {
            displayValue = `Contact: ${student.fatherMobile || student.motherMobile || 'N/A'}`;
         }
         if (f.key === 'grNumber') displayValue = `GR No: ${student.grNumber}`;
         if (f.key === 'class') displayValue = `Class: ${student.class}-${student.section}`;

         return (
          <div 
              key={f.key} 
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
                lineHeight: isAddress ? 1.2 : 1,
                textTransform: 'uppercase',
                whiteSpace: isAddress ? 'pre-wrap' : 'nowrap'
              }}
              className={isAddress ? "" : "truncate"}
          >
              {displayValue}
          </div>
         );
       })}

       {template.showQr && (
         <div 
            style={{ 
               position: 'absolute',
               left: `${template.qrX * scale}${unit}`,
               top: `${template.qrY * scale}${unit}`,
               width: `${template.qrSize * scale}${unit}`,
               height: `${template.qrSize * scale}${unit}`,
               backgroundColor: '#fff',
               padding: `${0.8 * scale}${unit}`,
               borderRadius: `${1.2 * scale}${unit}`,
               border: `${0.2 * scale}${unit} solid #eee`
            }}
            className="z-30"
         >
            <QrCode size={100} className="w-full h-full text-slate-900" />
         </div>
       )}

       <div className="absolute bottom-1 right-2 opacity-20 flex flex-col items-end">
          <p style={{ fontSize: `${1.2 * scale}${unit}` }} className="font-black uppercase tracking-widest leading-none">Institutional</p>
          <p style={{ fontSize: `${1.0 * scale}${unit}` }} className="font-bold uppercase tracking-[0.2em] leading-none mt-0.5">Secure Node</p>
       </div>
    </div>
  );
};

const UserIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const ZoomIn = ({ size, className }: { size: number; className?: string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>;
const ZoomOut = ({ size, className }: { size: number; className?: string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>;

export default IdCardDesigner;
