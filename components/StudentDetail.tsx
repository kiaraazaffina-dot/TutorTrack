import React, { useState } from 'react';
import { Student, Session, AttendanceStatus, ClassType, SkillProgress, SpeakingRubric, WritingRubric, ReadingRubric, ListeningRubric, ReportType, StudentSessionStatus, Payment } from '../types';
import { X, Sparkles, TrendingUp, Activity, MessageSquare, PenTool, BookOpen, Headphones, ChevronDown, ChevronUp, Plus, CreditCard, History, Package, Calendar, User, CheckCircle, Clock, Flag, Target, Award, ListFilter } from 'lucide-react';
import { generateStudentReport } from '../services/geminiService';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { PRICE_1ON1, PRICE_GROUP } from '../constants';

interface StudentDetailProps {
  student: Student;
  sessions: Session[];
  payments: Payment[];
  onClose: () => void;
  onUpdatePayment: (studentId: string, amount: number) => void;
  onUpdateStudent: (student: Student) => void;
  onUpdateSession: (session: Session) => void;
  onAddSession: (session: Omit<Session, 'id'>) => void;
}

const rubricScoreToPercent = (score: number) => score * 25;

const SCALE_LABELS: Record<number, string> = {
  1: 'Emerging',
  2: 'Developing',
  3: 'Proficient',
  4: 'Advanced'
};

const StudentDetail: React.FC<StudentDetailProps> = ({ student, sessions, onClose, onUpdatePayment, onUpdateStudent, onUpdateSession, onAddSession }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'milestones' | 'billing'>('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [addingMilestoneType, setAddingMilestoneType] = useState<ReportType | null>(null);

  // Package Purchase Form State
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [newPkgType, setNewPkgType] = useState<ClassType>(ClassType.OneOnOne);
  const [newPkgClasses, setNewPkgClasses] = useState(10);
  const [newPkgAmount, setNewPkgAmount] = useState(400);

  // New Session State (Inside Profile)
  const [newSessDate, setNewSessDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSessTime, setNewSessTime] = useState('14:00');
  const [newSessTopic, setNewSessTopic] = useState('');
  const [newSessType, setNewSessType] = useState<ClassType>(student.classTypes[0] || ClassType.OneOnOne);
  const [newSessRubrics, setNewSessRubrics] = useState({
      speakingRubric: { fluency: 3, sentenceLength: 3, pronunciation: 3, confidence: 3, opinionExpression: 3 },
      writingRubric: { grammarAccuracy: 3, sentenceStructure: 3, vocabularyRange: 3, organisation: 3, taskCompletion: 3 },
      readingRubric: { readingFluency: 3, accuracy: 3, pronunciation: 3, intonation: 3, comprehension: 3 },
      listeningRubric: { overallUnderstanding: 3, keyInfoRecognition: 3, responseToQuestions: 3, vocabularyAural: 3, listeningStrategies: 3 },
      comment: ''
  });

  // New Milestone Form State
  const [milestoneTopic, setMilestoneTopic] = useState('');
  const [milestoneDate, setMilestoneDate] = useState(new Date().toISOString().split('T')[0]);
  const [milestoneRubrics, setMilestoneRubrics] = useState({
      speakingRubric: { fluency: 3, sentenceLength: 3, pronunciation: 3, confidence: 3, opinionExpression: 3 },
      writingRubric: { grammarAccuracy: 3, sentenceStructure: 3, vocabularyRange: 3, organisation: 3, taskCompletion: 3 },
      readingRubric: { readingFluency: 3, accuracy: 3, pronunciation: 3, intonation: 3, comprehension: 3 },
      listeningRubric: { overallUnderstanding: 3, keyInfoRecognition: 3, responseToQuestions: 3, vocabularyAural: 3, listeningStrategies: 3 },
      notes: ''
  });

  const toggleSession = (id: string) => setExpandedSessions(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleMilestone = (id: string) => setExpandedMilestones(prev => ({ ...prev, [id]: !prev[id] }));

  const studentSessions = sessions.filter(s => s.studentIds.includes(student.id)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const attendedCount = studentSessions.filter(s => s.status === AttendanceStatus.Present || s.status === AttendanceStatus.Late).length;
  const attendanceRate = studentSessions.length ? Math.round((attendedCount / studentSessions.length) * 100) : 0;
  
  const progressHistory = student.progressHistory || [];
  const latestProgress = progressHistory.length > 0 
      ? progressHistory[progressHistory.length - 1] 
      : { reading: 50, writing: 50, listening: 50, speaking: 50 };

  const radarData = [
    { subject: 'Reading', A: latestProgress.reading },
    { subject: 'Writing', A: latestProgress.writing },
    { subject: 'Listening', A: latestProgress.listening },
    { subject: 'Speaking', A: latestProgress.speaking },
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    const report = await generateStudentReport(student, studentSessions.slice(0, 5));
    setAiReport(report);
    setIsGenerating(false);
  };

  const handleCreateNewSession = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSessTopic) return;
      const pricePerStudent = newSessType === ClassType.OneOnOne ? PRICE_1ON1 : PRICE_GROUP;
      
      const sessionData: Omit<Session, 'id'> = {
          studentIds: [student.id],
          date: `${newSessDate}T${newSessTime}:00`,
          durationMinutes: 60,
          status: AttendanceStatus.Present,
          studentStatuses: [{
              studentId: student.id,
              status: AttendanceStatus.Present,
              ...newSessRubrics
          }],
          type: newSessType,
          topic: newSessTopic,
          notes: '',
          price: pricePerStudent
      };

      onAddSession(sessionData);
      setIsAddingSession(false);
      setNewSessTopic('');
  };

  const handleAddMilestone = (e: React.FormEvent) => {
      e.preventDefault();
      if (!addingMilestoneType) return;
      const avg = (vals: number[]) => vals.length > 0 ? rubricScoreToPercent(vals.reduce((a,b)=>a+b,0)/vals.length) : 50;
      const newEntry: SkillProgress = {
          id: `ph${Date.now()}`,
          date: milestoneDate,
          reportType: addingMilestoneType,
          speaking: avg(Object.values(milestoneRubrics.speakingRubric)),
          writing: avg(Object.values(milestoneRubrics.writingRubric)),
          reading: avg(Object.values(milestoneRubrics.readingRubric)),
          listening: avg(Object.values(milestoneRubrics.listeningRubric)),
          speakingRubric: milestoneRubrics.speakingRubric as SpeakingRubric,
          writingRubric: milestoneRubrics.writingRubric as WritingRubric,
          readingRubric: milestoneRubrics.readingRubric as ReadingRubric,
          listeningRubric: milestoneRubrics.listeningRubric as ListeningRubric,
          notes: `${milestoneTopic ? `Topic: ${milestoneTopic}. ` : ''}${milestoneRubrics.notes}`
      };
      onUpdateStudent({ ...student, progressHistory: [...progressHistory, newEntry] });
      setAddingMilestoneType(null);
      setMilestoneTopic('');
      setMilestoneRubrics({
          speakingRubric: { fluency: 3, sentenceLength: 3, pronunciation: 3, confidence: 3, opinionExpression: 3 },
          writingRubric: { grammarAccuracy: 3, sentenceStructure: 3, vocabularyRange: 3, organisation: 3, taskCompletion: 3 },
          readingRubric: { readingFluency: 3, accuracy: 3, pronunciation: 3, intonation: 3, comprehension: 3 },
          listeningRubric: { overallUnderstanding: 3, keyInfoRecognition: 3, responseToQuestions: 3, vocabularyAural: 3, listeningStrategies: 3 },
          notes: ''
      });
  };

  const handleUpdateSessionRubric = (session: Session, studentStatus: StudentSessionStatus) => {
      const updatedStatuses = session.studentStatuses.map(s => 
          s.studentId === student.id ? studentStatus : s
      );
      onUpdateSession({ ...session, studentStatuses: updatedStatuses });
  };

  const handlePurchasePackage = (e: React.FormEvent) => {
      e.preventDefault();
      const updatedPackages = [...(student.packages || [])];
      const existingPkgIndex = updatedPackages.findIndex(p => p.type === newPkgType);
      if (existingPkgIndex > -1) {
          updatedPackages[existingPkgIndex] = { ...updatedPackages[existingPkgIndex], total: updatedPackages[existingPkgIndex].total + newPkgClasses, active: true };
      } else {
          updatedPackages.push({ type: newPkgType, total: newPkgClasses, active: true });
      }
      const updatedClassTypes = [...student.classTypes];
      if (!updatedClassTypes.includes(newPkgType)) updatedClassTypes.push(newPkgType);
      onUpdatePayment(student.id, newPkgAmount);
      onUpdateStudent({ ...student, packages: updatedPackages, classTypes: updatedClassTypes, notes: `${student.notes}\n[System] Purchased ${newPkgClasses} ${newPkgType} sessions for $${newPkgAmount} on ${new Date().toLocaleDateString()}` });
      setIsAddingPackage(false);
  };

  const ScoreButtons = ({ current, onChange, colorClass, size = "w-7 h-7" }: { current: number, onChange: (v: number) => void, colorClass: string, size?: string }) => (
    <div className="flex gap-1.5">
        {[1, 2, 3, 4].map(v => (
            <button key={v} type="button" onClick={() => onChange(v)} className={`${size} flex items-center justify-center rounded-lg text-xs font-black border transition-all ${current === v ? `${colorClass} border-transparent text-white shadow-lg scale-110 z-10` : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                {v}
            </button>
        ))}
    </div>
  );

  const getReportBadge = (type?: ReportType) => {
      switch (type) {
          case 'Beginning': return 'bg-purple-600 text-white shadow-purple-100';
          case 'Mid': return 'bg-blue-600 text-white shadow-blue-100';
          case 'End': return 'bg-emerald-600 text-white shadow-emerald-100';
          default: return 'bg-slate-500 text-white';
      }
  };

  const SessionRow: React.FC<{ session: Session }> = ({ session }) => {
    const studentStatus = session.studentStatuses?.find(s => s.studentId === student.id);
    const isExpanded = !!expandedSessions[session.id];
    
    const rubricState = {
      speakingRubric: studentStatus?.speakingRubric || { fluency: 3, sentenceLength: 3, pronunciation: 3, confidence: 3, opinionExpression: 3 },
      writingRubric: studentStatus?.writingRubric || { grammarAccuracy: 3, sentenceStructure: 3, vocabularyRange: 3, organisation: 3, taskCompletion: 3 },
      readingRubric: studentStatus?.readingRubric || { readingFluency: 3, accuracy: 3, pronunciation: 3, intonation: 3, comprehension: 3 },
      listeningRubric: studentStatus?.listeningRubric || { overallUnderstanding: 3, keyInfoRecognition: 3, responseToQuestions: 3, vocabularyAural: 3, listeningStrategies: 3 },
      comment: studentStatus?.comment || ''
    };

    const handleUpdateField = (category: string, field: string, value: any) => {
        if (!studentStatus) return;
        const updated = { ...studentStatus };
        if (category === 'comment') {
            updated.comment = value;
        } else {
            const key = `${category}Rubric` as keyof StudentSessionStatus;
            (updated[key] as any) = { ...(updated[key] as any), [field]: value };
        }
        handleUpdateSessionRubric(session, updated);
    };

    return (
        <div className={`bg-white rounded-3xl border transition-all shadow-sm ${isExpanded ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-indigo-100/50' : 'border-slate-200 hover:border-indigo-300'}`}>
            <button onClick={() => toggleSession(session.id)} className="w-full flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-2xl ${session.type === ClassType.OneOnOne ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        <Clock className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(session.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        <h4 className="text-sm font-black text-slate-800 tracking-tight">{session.topic}</h4>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border ${studentStatus?.status === AttendanceStatus.Present ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {studentStatus?.status || 'No Status'}
                    </span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
                </div>
            </button>
            
            {isExpanded && (
                <div className="p-7 border-t border-slate-100 bg-slate-50/30 space-y-6 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson Topic (System Title)</label>
                            <input 
                                value={session.topic} 
                                onChange={(e) => onUpdateSession({...session, topic: e.target.value})}
                                className="w-full p-3 border border-slate-200 rounded-2xl text-xs font-black bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Recorded</label>
                            <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-600 flex items-center gap-2 shadow-sm">
                                <Calendar className="w-4 h-4 text-indigo-400" />
                                {new Date(session.date).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Performance Comment</label>
                        <textarea 
                            value={rubricState.comment}
                            onChange={(e) => handleUpdateField('comment', '', e.target.value)}
                            placeholder="Write about what the student achieved during this specific lesson..."
                            className="w-full p-4 border border-slate-200 rounded-2xl text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] shadow-sm italic"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                        {[
                            { cat: 'speaking', icon: MessageSquare, color: 'text-blue-600', bcolor: 'bg-blue-600', criteria: [{f:'fluency', l:'Fluency'}, {f:'sentenceLength', l:'Sentence Length'}, {f:'pronunciation', l:'Pronunciation'}, {f:'confidence', l:'Confidence'}, {f:'opinionExpression', l:'Opinions'}]},
                            { cat: 'writing', icon: PenTool, color: 'text-emerald-600', bcolor: 'bg-emerald-600', criteria: [{f:'grammarAccuracy', l:'Grammar'}, {f:'sentenceStructure', l:'Structure'}, {f:'vocabularyRange', l:'Vocab'}, {f:'organisation', l:'Organisation'}, {f:'taskCompletion', l:'Completion'}]},
                            { cat: 'reading', icon: BookOpen, color: 'text-amber-600', bcolor: 'bg-amber-600', criteria: [{f:'readingFluency', l:'Fluency'}, {f:'accuracy', l:'Accuracy'}, {f:'pronunciation', l:'Pronunc.'}, {f:'intonation', l:'Intonation'}, {f:'comprehension', l:'Compr.'}]},
                            { cat: 'listening', icon: Headphones, color: 'text-violet-600', bcolor: 'bg-violet-600', criteria: [{f:'overallUnderstanding', l:'Understanding'}, {f:'keyInfoRecognition', l:'Key Info'}, {f:'responseToQuestions', l:'Responses'}, {f:'vocabularyAural', l:'Aural Vocab'}, {f:'listeningStrategies', l:'Strategies'}]}
                        ].map(section => (
                            <div key={section.cat} className="space-y-3">
                                <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${section.color}`}><section.icon className="w-3.5 h-3.5" /> {section.cat} Rubric</p>
                                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                                    {section.criteria.map(c => (
                                        <div key={c.f} className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{c.l}</span>
                                                <ScoreButtons 
                                                    current={(rubricState as any)[`${section.cat}Rubric`]?.[c.f]} 
                                                    onChange={(v) => handleUpdateField(section.cat, c.f, v)} 
                                                    colorClass={section.bcolor} 
                                                    size="w-6 h-6"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
  };

  const MilestoneSection = ({ type, title, icon: Icon, colorClass }: { type: ReportType, title: string, icon: any, colorClass: string }) => {
      // Find the LATEST entry for this type
      const relevantEntries = progressHistory.filter(h => h.reportType === type);
      const entry = relevantEntries.length > 0 ? relevantEntries[relevantEntries.length - 1] : null;
      
      const isExpanded = !!expandedMilestones[type];
      const isAdding = addingMilestoneType === type;

      return (
          <div className={`rounded-3xl border-2 transition-all ${isAdding ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-2xl' : 'border-slate-100 bg-white shadow-sm hover:border-indigo-200'}`}>
              <div className={`p-5 flex items-center justify-between cursor-pointer ${entry ? '' : 'opacity-80'}`} onClick={() => entry ? toggleMilestone(type) : setAddingMilestoneType(type)}>
                  <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${colorClass}`}>
                          <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{type}</p>
                          <h4 className="text-sm font-black text-slate-800">{title}</h4>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      {entry ? (
                          <>
                              <div className="flex gap-1">
                                  {['S', 'W', 'R', 'L'].map((s, i) => {
                                      const score = i === 0 ? entry.speaking : i === 1 ? entry.writing : i === 2 ? entry.reading : entry.listening;
                                      return <div key={s} className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white ${score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} title={`${s}: ${score}%`}>{s}</div>
                                  })}
                              </div>
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
                          </>
                      ) : (
                          !isAdding && <button className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors"><Plus className="w-3.5 h-3.5" /> Record</button>
                      )}
                      {isAdding && <button onClick={(e) => { e.stopPropagation(); setAddingMilestoneType(null); }} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400" /></button>}
                  </div>
              </div>

              {isAdding && (
                  <form onSubmit={handleAddMilestone} className="p-7 border-t border-slate-100 bg-indigo-50/30 space-y-6 animate-in zoom-in-95">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson Topic (Focus)</label>
                            <input placeholder="e.g. Assessment Lesson" value={milestoneTopic} onChange={e => setMilestoneTopic(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                            <input type="date" value={milestoneDate} onChange={e => setMilestoneDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white font-bold" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { cat: 'speaking', icon: MessageSquare, color: 'text-blue-600', bcolor: 'bg-blue-600', criteria: [{f:'fluency', l:'Fluency'}, {f:'sentenceLength', l:'Sentence Length'}, {f:'pronunciation', l:'Pronunciation'}, {f:'confidence', l:'Confidence'}, {f:'opinionExpression', l:'Opinions'}]},
                            { cat: 'writing', icon: PenTool, color: 'text-emerald-600', bcolor: 'bg-emerald-600', criteria: [{f:'grammarAccuracy', l:'Grammar'}, {f:'sentenceStructure', l:'Structure'}, {f:'vocabularyRange', l:'Vocab'}, {f:'organisation', l:'Organisation'}, {f:'taskCompletion', l:'Completion'}]},
                            { cat: 'reading', icon: BookOpen, color: 'text-amber-600', bcolor: 'bg-amber-600', criteria: [{f:'readingFluency', l:'Fluency'}, {f:'accuracy', l:'Accuracy'}, {f:'pronunciation', l:'Pronunc.'}, {f:'intonation', l:'Intonation'}, {f:'comprehension', l:'Compr.'}]},
                            { cat: 'listening', icon: Headphones, color: 'text-violet-600', bcolor: 'bg-violet-600', criteria: [{f:'overallUnderstanding', l:'Understanding'}, {f:'keyInfoRecognition', l:'Key Info'}, {f:'responseToQuestions', l:'Responses'}, {f:'vocabularyAural', l:'Aural Vocab'}, {f:'listeningStrategies', l:'Strategies'}]}
                        ].map(section => (
                            <div key={section.cat} className="space-y-3">
                                <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${section.color}`}><section.icon className="w-3.5 h-3.5" /> {section.cat} Rubric</p>
                                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                                    {section.criteria.map(c => (
                                        <div key={c.f} className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{c.l}</span>
                                            <ScoreButtons 
                                                current={(milestoneRubrics as any)[`${section.cat}Rubric`][c.f]} 
                                                onChange={(v) => {
                                                    const key = `${section.cat}Rubric` as keyof typeof milestoneRubrics;
                                                    setMilestoneRubrics({...milestoneRubrics, [key]: {...(milestoneRubrics[key] as any), [c.f]: v}});
                                                }}
                                                colorClass={section.bcolor} 
                                                size="w-6 h-6"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                      </div>

                      <textarea 
                          placeholder="Detailed summary of student performance at this milestone..." 
                          value={milestoneRubrics.notes}
                          onChange={e => setMilestoneRubrics({...milestoneRubrics, notes: e.target.value})}
                          className="w-full p-4 border border-slate-200 rounded-2xl text-xs bg-white font-medium outline-none min-h-[80px]"
                      />
                      <button type="submit" className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${getReportBadge(type)}`}>Record New {type} Stage</button>
                  </form>
              )}

              {isExpanded && entry && (
                  <div className="p-7 border-t border-slate-100 bg-slate-50/50 space-y-8 animate-in slide-in-from-top-2">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { cat: 'speaking', icon: MessageSquare, color: 'text-blue-600', bcolor: 'bg-blue-600', criteria: [{f:'fluency', l:'Fluency'}, {f:'sentenceLength', l:'Sentence Length'}, {f:'pronunciation', l:'Pronunciation'}, {f:'confidence', l:'Confidence'}, {f:'opinionExpression', l:'Opinions'}]},
                            { cat: 'writing', icon: PenTool, color: 'text-emerald-600', bcolor: 'bg-emerald-600', criteria: [{f:'grammarAccuracy', l:'Grammar'}, {f:'sentenceStructure', l:'Structure'}, {f:'vocabularyRange', l:'Vocab'}, {f:'organisation', l:'Organisation'}, {f:'taskCompletion', l:'Completion'}]},
                            { cat: 'reading', icon: BookOpen, color: 'text-amber-600', bcolor: 'bg-amber-600', criteria: [{f:'readingFluency', l:'Fluency'}, {f:'accuracy', l:'Accuracy'}, {f:'pronunciation', l:'Pronunc.'}, {f:'intonation', l:'Intonation'}, {f:'comprehension', l:'Compr.'}]},
                            { cat: 'listening', icon: Headphones, color: 'text-violet-600', bcolor: 'bg-violet-600', criteria: [{f:'overallUnderstanding', l:'Understanding'}, {f:'keyInfoRecognition', l:'Key Info'}, {f:'responseToQuestions', l:'Responses'}, {f:'vocabularyAural', l:'Aural Vocab'}, {f:'listeningStrategies', l:'Strategies'}]}
                        ].map(section => {
                            const rubric = (entry as any)[`${section.cat}Rubric`];
                            return (
                                <div key={section.cat} className="space-y-3">
                                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${section.color}`}><section.icon className="w-3.5 h-3.5" /> {section.cat} Rubric</p>
                                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                                        {section.criteria.map(c => (
                                            <div key={c.f} className="flex justify-between items-center text-[9px] border-b border-slate-50 py-1 last:border-0">
                                                <span className="font-bold text-slate-500 uppercase">{c.l}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-800">{rubric?.[c.f] || '-'}</span>
                                                    <span className="text-[7px] text-slate-300 font-bold uppercase">{SCALE_LABELS[rubric?.[c.f]]}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Milestone Summary</p>
                          <p className="text-xs text-slate-600 leading-relaxed italic">{entry.notes}</p>
                      </div>
                      <div className="flex justify-end">
                          <button onClick={() => setAddingMilestoneType(type)} className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors">Start New {type} Stage Set</button>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-lg bg-slate-50 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col relative overflow-hidden">
        <div className="bg-white p-7 border-b border-slate-200 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
                <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{student.name}</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{student.parentName || 'No Parent Contact'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 pt-4 flex gap-6 border-b border-slate-200 bg-white shadow-sm z-10">
            {['overview', 'sessions', 'milestones', 'billing'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    {tab}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-7 space-y-8 custom-scrollbar pb-10">
            {activeTab === 'overview' ? (
                <>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-indigo-600" /><h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">Growth Radar</h3></div>
                        <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: '800' }} />
                                    <Radar name="Student" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} strokeWidth={3} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', fontSize: '11px', fontWeight: 'bold', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black flex items-center gap-2 text-sm uppercase tracking-wider"><Sparkles className="w-4 h-4" /> AI Student Insight</h3>
                            <button onClick={handleGenerateReport} disabled={isGenerating} className="text-[10px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-black uppercase transition-all backdrop-blur-sm">{isGenerating ? 'Analyzing...' : 'Refresh'}</button>
                        </div>
                        {aiReport ? <div className="bg-black/10 p-5 rounded-2xl text-xs leading-relaxed backdrop-blur-sm border border-white/5 whitespace-pre-line font-medium">{aiReport}</div> : <div className="text-xs text-indigo-100 italic font-medium">Generate a comprehensive AI growth report based on recent assessments...</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 group hover:border-indigo-200 transition-all"><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Attendance</p><p className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{attendanceRate}%</p></div>
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 group hover:border-indigo-200 transition-all"><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total Lessons</p><p className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{attendedCount}</p></div>
                    </div>
                </>
            ) : activeTab === 'sessions' ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Lesson Assessment History</h3>
                        <button 
                            onClick={() => setIsAddingSession(!isAddingSession)} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isAddingSession ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:-translate-y-0.5'}`}
                        >
                            {isAddingSession ? 'Cancel' : <><Plus className="w-3.5 h-3.5" /> Log New Session</>}
                        </button>
                    </div>

                    {isAddingSession && (
                        <div className="bg-white rounded-3xl border-2 border-indigo-500 shadow-2xl p-7 space-y-6 animate-in zoom-in-95">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                    <input type="date" value={newSessDate} onChange={e => setNewSessDate(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</label>
                                    <input type="time" value={newSessTime} onChange={e => setNewSessTime(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lesson Topic (Title)</label>
                                <input placeholder="e.g. Vocabulary: School Subjects" value={newSessTopic} onChange={e => setNewSessTopic(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Quick Rubric & Feedback</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {['speaking', 'writing', 'reading', 'listening'].map(cat => (
                                         <div key={cat} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                             <span className="text-[9px] font-black text-slate-500 uppercase">{cat}</span>
                                             <ScoreButtons 
                                                current={(newSessRubrics as any)[`${cat}Rubric`].fluency || (newSessRubrics as any)[`${cat}Rubric`].grammarAccuracy || (newSessRubrics as any)[`${cat}Rubric`].readingFluency || (newSessRubrics as any)[`${cat}Rubric`].overallUnderstanding} 
                                                onChange={(v) => {
                                                    const key = `${cat}Rubric` as keyof typeof newSessRubrics;
                                                    const currentRubric = { ...newSessRubrics[key] };
                                                    Object.keys(currentRubric).forEach(k => (currentRubric as any)[k] = v);
                                                    setNewSessRubrics({...newSessRubrics, [key]: currentRubric});
                                                }}
                                                colorClass="bg-indigo-600"
                                                size="w-6 h-6"
                                             />
                                         </div>
                                     ))}
                                </div>
                                <textarea 
                                    placeholder="Write a specific achievement for this student today..." 
                                    value={newSessRubrics.comment}
                                    onChange={e => setNewSessRubrics({...newSessRubrics, comment: e.target.value})}
                                    className="w-full p-4 border border-slate-200 rounded-2xl text-xs bg-slate-50 font-medium outline-none min-h-[60px]"
                                />
                            </div>
                            <button onClick={handleCreateNewSession} className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Record Session Assessment</button>
                        </div>
                    )}

                    {studentSessions.length === 0 && !isAddingSession && <p className="text-center py-20 text-slate-400 text-sm italic font-medium">No sessions logged for this student yet.</p>}
                    <div className="space-y-4">
                        {studentSessions.map(session => (
                            <SessionRow key={session.id} session={session} />
                        ))}
                    </div>
                </div>
            ) : activeTab === 'milestones' ? (
                 <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-100 mb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-black text-lg tracking-tight flex items-center gap-2"><Award className="w-6 h-6" /> Assessment Cycles</h3>
                                <p className="text-xs text-indigo-100 mt-1">Track key developmental stages across three core points.</p>
                            </div>
                            <button onClick={() => setAddingMilestoneType('Beginning')} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all backdrop-blur-sm">New Set</button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <MilestoneSection 
                            type="Beginning" 
                            title="Beginning Stage" 
                            icon={Flag} 
                            colorClass="bg-purple-600" 
                        />
                        <MilestoneSection 
                            type="Mid" 
                            title="Mid-Way Point" 
                            icon={Target} 
                            colorClass="bg-blue-600" 
                        />
                        <MilestoneSection 
                            type="End" 
                            title="Final Assessment" 
                            icon={Award} 
                            colorClass="bg-emerald-600" 
                        />
                    </div>

                    {progressHistory.filter(h => h.reportType !== 'Session').length > 0 && (
                        <div className="pt-4">
                             <div className="flex items-center gap-2 mb-4 px-2">
                                <History className="w-4 h-4 text-slate-400" />
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment History</h4>
                             </div>
                             <div className="space-y-3">
                                {[...progressHistory].filter(h => h.reportType !== 'Session').reverse().map(h => (
                                    <div key={h.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${h.reportType === 'Beginning' ? 'bg-purple-500' : h.reportType === 'Mid' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{h.reportType} Report</p>
                                                <p className="text-[9px] text-slate-400">{new Date(h.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                Avg: {Math.round((h.speaking + h.writing + h.reading + h.listening) / 4)}%
                                            </div>
                                            <button onClick={() => toggleMilestone(h.reportType!)} className="text-slate-300 hover:text-indigo-600"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Running Balance</p>
                            <p className={`text-3xl font-black tracking-tighter mt-1 ${student.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {student.balance > 0 ? `$${student.balance}` : `$${Math.abs(student.balance)} Credit`}
                            </p>
                        </div>
                        <button onClick={() => setIsAddingPackage(true)} className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:-translate-y-1 active:translate-y-0">
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>

                    {isAddingPackage && (
                        <div className="bg-white p-6 rounded-3xl border-2 border-indigo-500 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center">
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-600" /> New Class Package</h4>
                                <button onClick={() => setIsAddingPackage(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full"><X className="w-4 h-4" /></button>
                            </div>
                            <form onSubmit={handlePurchasePackage} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Program</label>
                                        <select value={newPkgType} onChange={e => { const type = e.target.value as ClassType; setNewPkgType(type); setNewPkgAmount(type === ClassType.OneOnOne ? PRICE_1ON1 * newPkgClasses : PRICE_GROUP * newPkgClasses); }} className="w-full p-3 border border-slate-200 rounded-2xl text-xs bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                                            <option value={ClassType.OneOnOne}>One-on-One</option>
                                            <option value={ClassType.Group}>Group (1-on-2)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Classes</label>
                                        <input type="number" value={newPkgClasses} onChange={e => { const num = parseInt(e.target.value) || 0; setNewPkgClasses(num); setNewPkgAmount(newPkgType === ClassType.OneOnOne ? PRICE_1ON1 * num : PRICE_GROUP * num); }} className="w-full p-3 border border-slate-200 rounded-2xl text-xs bg-slate-50 font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Payment ($)</label>
                                    <input type="number" value={newPkgAmount} onChange={e => setNewPkgAmount(parseFloat(e.target.value) || 0)} className="w-full p-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 font-black text-emerald-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                                </div>
                                <button type="submit" className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95">Confirm Purchase</button>
                            </form>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Package className="w-3 h-3" /> Running Totals</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {student.packages?.map((pkg, i) => (
                                <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 flex justify-between items-center group hover:border-indigo-200 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${pkg.type === ClassType.OneOnOne ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}><BookOpen className="w-5 h-5" /></div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{pkg.type}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Session credits purchased</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-indigo-600 tracking-tighter">{pkg.total}</p>
                                        <p className="text-[9px] text-slate-400 font-black uppercase">Credits</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
