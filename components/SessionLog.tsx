import React, { useState } from 'react';
import { Session, Student, AttendanceStatus, ClassType, StudentSessionStatus, SkillProgress, SpeakingRubric, WritingRubric, ReadingRubric, ListeningRubric, ReportType } from '../types';
import { Calendar as CalendarIcon, CheckCircle, Sparkles, ChevronLeft, ChevronRight, X, Edit, Search, ChevronDown, ChevronUp, TrendingUp, MessageSquare, PenTool, BookOpen, Headphones } from 'lucide-react';
import { generateLessonPlan } from '../services/geminiService';
import { PRICE_1ON1, PRICE_GROUP } from '../constants';

interface SessionLogProps {
  sessions: Session[];
  students: Student[];
  onAddSession: (session: Omit<Session, 'id'>) => void;
  onUpdateSession: (session: Session) => void;
  onDeleteSession: (id: string) => void;
  onUpdateStudent: (student: Student) => void; 
  onSelectStudent?: (student: Student) => void;
}

type ViewMode = 'year' | 'month' | 'week';

const rubricScoreToPercent = (score: number) => score * 25;

const SCALE_LABELS: Record<number, string> = {
  1: 'Emerging',
  2: 'Developing',
  3: 'Proficient',
  4: 'Advanced'
};

const SessionLog: React.FC<SessionLogProps> = ({ sessions, students, onAddSession, onUpdateSession, onUpdateStudent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [studentComments, setStudentComments] = useState<Record<string, string>>({});
  
  const [date, setDate] = useState('');
  const [time, setTime] = useState('14:00');
  const [topic, setTopic] = useState('');
  const [sessionType, setSessionType] = useState<ClassType>(ClassType.OneOnOne);
  const [notes, setNotes] = useState('');
  
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [currentProgressStudentId, setCurrentProgressStudentId] = useState<string | null>(null);
  const [tempRubrics, setTempRubrics] = useState<Record<string, {
    speakingRubric: SpeakingRubric;
    writingRubric: WritingRubric;
    readingRubric: ReadingRubric;
    listeningRubric: ListeningRubric;
  }>>({}); 

  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState('');

  const filteredStudents = students.filter(s => 
    s.status === 'Active' && 
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay, year, month };
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const openAddModal = (dateStr?: string) => {
    resetForm();
    setDate(dateStr || new Date().toISOString().split('T')[0]);
    setEditingSessionId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (session: Session) => {
    setEditingSessionId(session.id);
    setSelectedStudents(session.studentIds);
    const statusMap: Record<string, AttendanceStatus> = {};
    const commentMap: Record<string, string> = {};
    const rubricMap: typeof tempRubrics = {};

    session.studentStatuses.forEach(s => {
      statusMap[s.studentId] = s.status;
      commentMap[s.studentId] = s.comment || '';
      if (s.speakingRubric) {
        rubricMap[s.studentId] = {
            speakingRubric: s.speakingRubric,
            writingRubric: s.writingRubric!,
            readingRubric: s.readingRubric!,
            listeningRubric: s.listeningRubric!
        };
      }
    });
    setStudentStatuses(statusMap);
    setStudentComments(commentMap);
    setTempRubrics(rubricMap);

    setDate(new Date(session.date).toISOString().split('T')[0]);
    setTime(new Date(session.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setTopic(session.topic);
    setSessionType(session.type);
    setNotes(session.notes);
    setGeneratedPlan('');
    setIsModalOpen(true);
  };

  const handleStudentToggle = (id: string) => {
    let newSelected = [];
    if (selectedStudents.includes(id)) {
      newSelected = selectedStudents.filter(s => s !== id);
      const newStatuses = { ...studentStatuses };
      const newComments = { ...studentComments };
      const newRubrics = { ...tempRubrics };
      delete newStatuses[id];
      delete newComments[id];
      delete newRubrics[id];
      setStudentStatuses(newStatuses);
      setStudentComments(newComments);
      setTempRubrics(newRubrics);
    } else {
      if (selectedStudents.length >= 2) return; 
      newSelected = [...selectedStudents, id];
      setStudentStatuses({ ...studentStatuses, [id]: AttendanceStatus.Present });
      setStudentComments({ ...studentComments, [id]: '' });
    }
    setSelectedStudents(newSelected);
    if (newSelected.length === 2) setSessionType(ClassType.Group);
    else if (newSelected.length === 1) setSessionType(ClassType.OneOnOne);
  };

  const openProgressModal = (studentId: string) => {
      setCurrentProgressStudentId(studentId);
      if (!tempRubrics[studentId]) {
          const s = students.find(st => st.id === studentId);
          const latest = s?.progressHistory?.[s.progressHistory.length - 1];
          setTempRubrics(prev => ({
              ...prev,
              [studentId]: {
                  speakingRubric: latest?.speakingRubric || { fluency: 3, sentenceLength: 3, pronunciation: 3, confidence: 3, opinionExpression: 3 },
                  writingRubric: latest?.writingRubric || { grammarAccuracy: 3, sentenceStructure: 3, vocabularyRange: 3, organisation: 3, taskCompletion: 3 },
                  readingRubric: latest?.readingRubric || { readingFluency: 3, accuracy: 3, pronunciation: 3, intonation: 3, comprehension: 3 },
                  listeningRubric: latest?.listeningRubric || { overallUnderstanding: 3, keyInfoRecognition: 3, responseToQuestions: 3, vocabularyAural: 3, listeningStrategies: 3 }
              }
          }));
      }
      setProgressModalOpen(true);
  };

  const updateRubricScore = (category: 'speaking' | 'writing' | 'reading' | 'listening', field: string, value: number) => {
      if (!currentProgressStudentId) return;
      const key = `${category}Rubric` as keyof typeof tempRubrics[string];
      setTempRubrics(prev => {
          const studentData = prev[currentProgressStudentId];
          const rubric = (studentData[key] as any);
          return {
              ...prev,
              [currentProgressStudentId]: { ...studentData, [key]: { ...rubric, [field]: value } }
          };
      });
  };

  const handleGeneratePlan = async () => {
    if (!topic || selectedStudents.length === 0) return;
    setIsGeneratingPlan(true);
    const plan = await generateLessonPlan(topic, students.filter(s => selectedStudents.includes(s.id)).map(s => s.name), 60);
    setGeneratedPlan(plan);
    setNotes(prev => prev + (prev ? '\n\n' : '') + "AI Lesson Plan Generated.");
    setIsGeneratingPlan(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0) return;
    const pricePerStudent = sessionType === ClassType.OneOnOne ? PRICE_1ON1 : PRICE_GROUP;
    const sessionData = {
      studentIds: selectedStudents,
      date: `${date}T${time}:00`,
      durationMinutes: 60,
      status: AttendanceStatus.Present,
      studentStatuses: selectedStudents.map(id => ({ 
        studentId: id, 
        status: studentStatuses[id] || AttendanceStatus.Present,
        comment: studentComments[id] || '',
        ...tempRubrics[id]
      })),
      type: sessionType,
      topic,
      notes: generatedPlan ? `${notes}\n\n--- AI Plan ---\n${generatedPlan}` : notes,
      price: pricePerStudent * selectedStudents.length
    };

    if (editingSessionId) onUpdateSession({ ...sessionData, id: editingSessionId });
    else onAddSession(sessionData);

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedStudents([]);
    setStudentStatuses({});
    setStudentComments({});
    setTopic('');
    setNotes('');
    setGeneratedPlan('');
    setSessionType(ClassType.OneOnOne);
    setEditingSessionId(null);
    setTempRubrics({});
  };

  const renderMonthView = () => {
    const { days, firstDay, year, month } = getDaysInMonth(currentDate);
    const allSlots = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
    return (
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="bg-slate-50 p-3 text-center text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100">{d}</div>)}
            {allSlots.map((day, index) => {
                if (!day) return <div key={index} className="bg-white/50 h-32" />;
                const dayStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const daySessions = sessions.filter(s => s.date.startsWith(dayStr));
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                return (
                    <div key={index} onClick={() => openAddModal(dayStr)} className="bg-white h-32 p-2 border-t border-slate-50 hover:bg-indigo-50/30 cursor-pointer overflow-y-auto group transition-colors">
                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 group-hover:text-indigo-600'}`}>{day}</span>
                        <div className="mt-1.5 space-y-1">
                            {daySessions.map(s => (
                                <div key={s.id} onClick={(e) => { e.stopPropagation(); openEditModal(s); }} className={`text-[9px] p-1.5 rounded-lg border-l-4 shadow-sm truncate font-medium transition-all hover:scale-105 ${s.type === ClassType.OneOnOne ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-orange-50 border-orange-400 text-orange-700'}`}>
                                    {s.topic}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  const ScoreButtons = ({ current, onChange, colorClass }: { current: number, onChange: (v: number) => void, colorClass: string }) => (
    <div className="flex flex-col items-end gap-1">
        <div className="flex gap-1">
            {[1, 2, 3, 4].map(v => (
                <button key={v} type="button" onClick={() => onChange(v)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold border transition-all ${current === v ? `${colorClass} border-transparent text-white shadow-md scale-110 z-10` : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>{v}</button>
            ))}
        </div>
        <span className="text-[9px] font-black uppercase text-slate-400">{SCALE_LABELS[current]}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner">
                <button onClick={handlePrev} className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all active:scale-95"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 text-[10px] font-bold uppercase text-slate-500 hover:text-indigo-600">Today</button>
                <button onClick={handleNext} className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-all active:scale-95"><ChevronRight className="w-4 h-4" /></button>
            </div>
        </div>
        <button onClick={() => openAddModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5"><CalendarIcon className="w-4 h-4" /> Log Session</button>
      </div>

      {renderMonthView()}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl my-auto relative animate-in zoom-in-95 duration-200">
                <div className="p-7 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10 rounded-t-3xl">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">{editingSessionId ? 'Edit Lesson Log' : 'Log New Lesson'}</h3>
                        <p className="text-xs text-slate-500 mt-1">Record lesson details and individual feedback</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-7 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Session Program</label>
                            <select value={sessionType} onChange={e => setSessionType(e.target.value as ClassType)} className="w-full p-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none">
                                <option value={ClassType.OneOnOne}>One-on-One</option>
                                <option value={ClassType.Group}>One-on-Two (Group)</option>
                            </select>
                        </div>
                        <div className="space-y-1 relative">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Students</label>
                            <button type="button" onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)} className="w-full p-3 border border-slate-200 rounded-2xl flex justify-between items-center bg-slate-50 text-sm text-slate-600 hover:bg-white transition-all">
                                <span className="truncate">{selectedStudents.length === 0 ? "Select Attendees" : `${selectedStudents.length} Students Selected`}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${isStudentDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isStudentDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-20 p-3 space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" /><input autoFocus type="text" placeholder="Find student..." className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 rounded-xl outline-none" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} /></div>
                                    <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                        {filteredStudents.map(s => (
                                            <button key={s.id} type="button" onClick={() => handleStudentToggle(s.id)} disabled={!selectedStudents.includes(s.id) && selectedStudents.length >= 2} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${selectedStudents.includes(s.id) ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-600 disabled:opacity-40'}`}>
                                                {s.name} {selectedStudents.includes(s.id) && <CheckCircle className="w-3.5 h-3.5" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedStudents.length > 0 && (
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Individual Student Feedback</label>
                            <div className="space-y-4">
                                {selectedStudents.map(id => {
                                    const stu = students.find(s => s.id === id);
                                    return (
                                        <div key={id} className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800">{stu?.name}</span>
                                                    {tempRubrics[id] && (
                                                        <span className="text-[9px] font-black uppercase text-indigo-600 flex items-center gap-1">
                                                            <TrendingUp className="w-2.5 h-2.5" /> Assessment Ready
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select value={studentStatuses[id]} onChange={e => setStudentStatuses({...studentStatuses, [id]: e.target.value as AttendanceStatus})} className="text-xs p-1.5 rounded-xl border border-slate-200 bg-white font-semibold">
                                                        {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => openProgressModal(id)} className={`p-2 rounded-xl border shadow-sm transition-all ${tempRubrics[id] ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-400 border-slate-200 hover:text-indigo-600'}`} title="Detailed Rubric Assessment"><TrendingUp className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                            <textarea 
                                                placeholder={`Detailed comments for ${stu?.name.split(' ')[0]} (will show in student history)`}
                                                value={studentComments[id] || ''}
                                                onChange={e => setStudentComments({...studentComments, [id]: e.target.value})}
                                                className="w-full p-3 border border-slate-200 rounded-2xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300 min-h-[60px]"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white transition-all outline-none" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Time</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white transition-all outline-none" required />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Lesson Topic</label>
                        <input placeholder="e.g. Past Simple, Reading Fluency..." value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:bg-white transition-all outline-none" required />
                    </div>

                    <div className="space-y-1 relative">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">General Lesson Notes</label>
                        <textarea placeholder="Lesson summary, common mistakes, or general notes..." value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-4 border border-slate-200 rounded-3xl text-sm bg-slate-50 focus:bg-white transition-all outline-none min-h-[100px]" rows={3} />
                        <button type="button" disabled={!topic || selectedStudents.length === 0 || isGeneratingPlan} onClick={handleGeneratePlan} className="absolute bottom-4 right-4 text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all active:scale-95">
                            <Sparkles className="w-3.5 h-3.5" /> {isGeneratingPlan ? 'Drafting...' : 'AI Plan'}
                        </button>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-2xl transition-colors">Discard</button>
                        <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all hover:-translate-y-0.5 active:translate-y-0">Record Session</button>
                    </div>
                </form>

                {progressModalOpen && currentProgressStudentId && (
                     <div className="absolute inset-0 z-50 bg-white rounded-3xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                        <div className="p-7 border-b border-slate-100 bg-indigo-600 text-white flex justify-between items-center rounded-t-3xl shadow-lg">
                            <div><h3 className="text-xl font-black flex items-center gap-2">Rubric Assessment</h3><p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest">{students.find(s => s.id === currentProgressStudentId)?.name}</p></div>
                            <button onClick={() => setProgressModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-sm transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto space-y-10 custom-scrollbar pb-24">
                            <section>
                                <h4 className="flex items-center gap-2 font-black text-slate-800 text-sm mb-6 border-l-4 border-blue-500 pl-4 uppercase tracking-wider">Speaking Rubric</h4>
                                <div className="space-y-4">
                                    {[
                                        { f: 'fluency', l: 'Fluency' },
                                        { f: 'sentenceLength', l: 'Sentence Length & Complexity' },
                                        { f: 'pronunciation', l: 'Pronunciation & Intonation' },
                                        { f: 'confidence', l: 'Confidence' },
                                        { f: 'opinionExpression', l: 'Opinion Expression & Justification' },
                                    ].map(i => (
                                        <div key={i.f} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-2xl gap-3">
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{i.l}</span>
                                            <ScoreButtons current={(tempRubrics[currentProgressStudentId]?.speakingRubric as any)?.[i.f]} onChange={v => updateRubricScore('speaking', i.f, v)} colorClass="bg-blue-600" />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h4 className="flex items-center gap-2 font-black text-slate-800 text-sm mb-6 border-l-4 border-emerald-500 pl-4 uppercase tracking-wider">Writing Rubric</h4>
                                <div className="space-y-4">
                                    {[
                                        { f: 'grammarAccuracy', l: 'Grammar Accuracy' },
                                        { f: 'sentenceStructure', l: 'Sentence Structure' },
                                        { f: 'vocabularyRange', l: 'Vocabulary Range' },
                                        { f: 'organisation', l: 'Organisation of Ideas' },
                                        { f: 'taskCompletion', l: 'Task Completion' },
                                    ].map(i => (
                                        <div key={i.f} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-2xl gap-3">
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{i.l}</span>
                                            <ScoreButtons current={(tempRubrics[currentProgressStudentId]?.writingRubric as any)?.[i.f]} onChange={v => updateRubricScore('writing', i.f, v)} colorClass="bg-emerald-600" />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h4 className="flex items-center gap-2 font-black text-slate-800 text-sm mb-6 border-l-4 border-amber-500 pl-4 uppercase tracking-wider">Reading Rubric</h4>
                                <div className="space-y-4">
                                    {[
                                        { f: 'readingFluency', l: 'Reading Fluency' },
                                        { f: 'accuracy', l: 'Accuracy' },
                                        { f: 'pronunciation', l: 'Pronunciation' },
                                        { f: 'intonation', l: 'Intonation & Expression' },
                                        { f: 'comprehension', l: 'Comprehension While Reading' },
                                    ].map(i => (
                                        <div key={i.f} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-2xl gap-3">
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{i.l}</span>
                                            <ScoreButtons current={(tempRubrics[currentProgressStudentId]?.readingRubric as any)?.[i.f]} onChange={v => updateRubricScore('reading', i.f, v)} colorClass="bg-amber-600" />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h4 className="flex items-center gap-2 font-black text-slate-800 text-sm mb-6 border-l-4 border-violet-500 pl-4 uppercase tracking-wider">Listening Rubric</h4>
                                <div className="space-y-4">
                                    {[
                                        { f: 'overallUnderstanding', l: 'Overall Understanding' },
                                        { f: 'keyInfoRecognition', l: 'Key Information Recognition' },
                                        { f: 'responseToQuestions', l: 'Response to Spoken Questions' },
                                        { f: 'vocabularyAural', l: 'Vocabulary Recognition (Aural)' },
                                        { f: 'listeningStrategies', l: 'Listening Strategies' },
                                    ].map(i => (
                                        <div key={i.f} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-2xl gap-3">
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{i.l}</span>
                                            <ScoreButtons current={(tempRubrics[currentProgressStudentId]?.listeningRubric as any)?.[i.f]} onChange={v => updateRubricScore('listening', i.f, v)} colorClass="bg-violet-600" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-end rounded-b-3xl">
                             <button type="button" onClick={() => setProgressModalOpen(false)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95">Save Rubric Scores</button>
                        </div>
                     </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default SessionLog;
