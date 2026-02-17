// Supabase configuration - set these in Vercel environment variables
// VITE_SUPABASE_URL = your Supabase project URL
// VITE_SUPABASE_ANON_KEY = your Supabase anon key (not service role!)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const getHeaders = () => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
});

const isConfigured = () => !!(SUPABASE_URL && SUPABASE_KEY);

export async function fetchStudents() {
  if (!isConfigured()) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*`, { headers: getHeaders() });
  return res.json();
}

export async function saveStudent(student: any) {
  if (!isConfigured()) return;
  await fetch(`${SUPABASE_URL}/rest/v1/students`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      id: student.id,
      name: student.name,
      class_types: student.classTypes,
      email: student.email || null,
      parent_name: student.parentName || null,
      notes: student.notes || '',
      balance: student.balance || 0,
      joined_date: student.joinedDate,
      status: student.status,
      packages: JSON.stringify(student.packages || []),
      progress_history: JSON.stringify(student.progressHistory || [])
    })
  });
}

export async function updateStudent(student: any) {
  if (!isConfigured()) return;
  await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${student.id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      name: student.name,
      class_types: student.classTypes,
      email: student.email || null,
      parent_name: student.parentName || null,
      notes: student.notes || '',
      balance: student.balance || 0,
      joined_date: student.joinedDate,
      status: student.status,
      packages: JSON.stringify(student.packages || []),
      progress_history: JSON.stringify(student.progressHistory || [])
    })
  });
}

export async function deleteStudent(id: string) {
  if (!isConfigured()) return;
  await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function fetchSessions() {
  if (!isConfigured()) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions?select=*`, { headers: getHeaders() });
  return res.json();
}

export async function saveSession(session: any) {
  if (!isConfigured()) return;
  await fetch(`${SUPABASE_URL}/rest/v1/sessions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      id: session.id,
      student_ids: session.studentIds,
      date: session.date,
      duration_minutes: session.durationMinutes,
      status: session.status,
      student_statuses: JSON.stringify(session.studentStatuses || []),
      type: session.type,
      topic: session.topic,
      notes: session.notes,
      price: session.price
    })
  });
}

export async function fetchPayments() {
  if (!isConfigured()) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=*`, { headers: getHeaders() });
  return res.json();
}

export async function savePayment(payment: any) {
  if (!isConfigured()) return;
  await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      id: payment.id,
      student_id: payment.studentId,
      amount: payment.amount,
      date: payment.date,
      method: payment.method
    })
  });
}
