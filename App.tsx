import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Calendar, Menu, X, BookOpen } from 'lucide-react';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import SessionLog from './components/SessionLog';
import StudentDetail from './components/StudentDetail';
import { TabItem, Student, Session, Payment, AttendanceStatus } from './types';
import { INITIAL_STUDENTS, INITIAL_SESSIONS, INITIAL_PAYMENTS } from './constants';
import * as Supabase from './services/supabase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [financialOffset, setFinancialOffset] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [studentsData, sessionsData, paymentsData] = await Promise.all([
          Supabase.fetchStudents(),
          Supabase.fetchSessions(),
          Supabase.fetchPayments()
        ]);
        
        if (studentsData !== null) {
          setIsSupabaseConnected(true);
          
          if (studentsData && studentsData.length > 0) {
            setStudents(studentsData.map((s: any) => ({
              id: s.id,
              name: s.name,
              classTypes: s.class_types || [],
              email: s.email,
              parentName: s.parent_name,
              notes: s.notes || '',
              balance: s.balance || 0,
              joinedDate: s.joined_date,
              status: s.status || 'Active',
              packages: typeof s.packages === 'string' ? JSON.parse(s.packages) : (s.packages || []),
              progressHistory: typeof s.progress_history === 'string' ? JSON.parse(s.progress_history) : (s.progress_history || [])
            })));
          } else {
            setStudents(INITIAL_STUDENTS);
            setSessions(INITIAL_SESSIONS);
            setPayments(INITIAL_PAYMENTS);
            for (const s of INITIAL_STUDENTS) await Supabase.saveStudent(s);
            for (const s of INITIAL_SESSIONS) await Supabase.saveSession(s);
            for (const p of INITIAL_PAYMENTS) await Supabase.savePayment(p);
          }
          
          if (sessionsData && sessionsData.length > 0) {
            setSessions(sessionsData.map((s: any) => ({
              id: s.id,
              studentIds: s.student_ids || [],
              date: s.date,
              durationMinutes: s.duration_minutes,
              status: s.status,
              studentStatuses: typeof s.student_statuses === 'string' ? JSON.parse(s.student_statuses) : (s.student_statuses || []),
              type: s.type,
              topic: s.topic,
              notes: s.notes,
              price: s.price
            })));
          }
          
          if (paymentsData && paymentsData.length > 0) {
            setPayments(paymentsData.map((p: any) => ({
              id: p.id,
              studentId: p.student_id,
              amount: p.amount,
              date: p.date,
              method: p.method
            })));
          }
        } else {
          setStudents(INITIAL_STUDENTS);
          setSessions(INITIAL_SESSIONS);
          setPayments(INITIAL_PAYMENTS);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setStudents(INITIAL_STUDENTS);
        setSessions(INITIAL_SESSIONS);
        setPayments(INITIAL_PAYMENTS);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const tabs: TabItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'sessions', label: 'Calendar', icon: Calendar },
  ];

  const handleAddStudent = async (newStudentData: Omit<Student, 'id' | 'joinedDate' | 'status'>) => {
    const newStudent: Student = {
      ...newStudentData,
      id: `s${Date.now()}`,
      joinedDate: new Date().toISOString(),
      status: 'Active'
    };
    setStudents(prev => [...prev, newStudent]);
    await Supabase.saveStudent(newStudent);
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (selectedStudent?.id === updatedStudent.id) {
        setSelectedStudent(updatedStudent);
    }
    await Supabase.updateStudent(updatedStudent);
  };

  const handleDeleteStudent = async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    if (selectedStudent?.id === id) setSelectedStudent(null);
    await Supabase.deleteStudent(id);
  };

  const handleAddSession = async (newSessionData: Omit<Session, 'id'>) => {
    const newSession: Session = {
      ...newSessionData,
      id: `sess${Date.now()}`
    };
    setSessions(prev => [...prev, newSession]);
    await Supabase.saveSession(newSession);
  };

  const handleAddPayment = async (newPaymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...newPaymentData,
      id: `p${Date.now()}`
    };
    setPayments(prev => [...prev, newPayment]);
    await Supabase.savePayment(newPayment);
    const student = students.find(s => s.id === newPayment.studentId);
    if (student) {
      const updatedStudent = { ...student, balance: student.balance + newPayment.amount };
      handleUpdateStudent(updatedStudent);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-slate-900">TutorTrack AI</span>
              {isSupabaseConnected && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Saved</span>
              )}
            </div>
            <button
              className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-sm border-b border-slate-200 md:block hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 h-12">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedStudent(null); }}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-slate-900'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <nav className="md:hidden bg-white shadow-sm border-b border-slate-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedStudent(null); setIsMobileMenuOpen(false); }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="inline h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            students={students}
            sessions={sessions}
            payments={payments}
            financialOffset={financialOffset}
            setFinancialOffset={setFinancialOffset}
          />
        )}
        {activeTab === 'students' && !selectedStudent && (
          <StudentList
            students={students}
            onAddStudent={handleAddStudent}
            onSelectStudent={setSelectedStudent}
          />
        )}
        {activeTab === 'students' && selectedStudent && (
          <StudentDetail
            student={selectedStudent}
            sessions={sessions.filter(s => s.studentIds.includes(selectedStudent.id))}
            payments={payments.filter(p => p.studentId === selectedStudent.id)}
            onBack={() => setSelectedStudent(null)}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddSession={handleAddSession}
            onAddPayment={handleAddPayment}
          />
        )}
        {activeTab === 'sessions' && (
          <SessionLog
            sessions={sessions}
            students={students}
            onAddSession={handleAddSession}
          />
        )}
      </main>
    </div>
  );
};

export default App;
