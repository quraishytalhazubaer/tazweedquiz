import { useState } from 'react';
import { ShieldCheck, AlertCircle, Lock } from 'lucide-react';

const TEACHER_PASSWORD = "admin786";
const STUDENT_ACCESS_CODE = "ibtra2024";

const Login = ({ onLogin, onManualRefresh }) => {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('নাম প্রদান করুন'); return; }

    if (role === 'teacher') {
      if (password !== TEACHER_PASSWORD) { setError('ভুল শিক্ষক পাসওয়ার্ড'); return; }
    } else {
      if (password !== STUDENT_ACCESS_CODE) { setError('ভুল স্টুডেন্ট এক্সেস কোড'); return; }
    }

    onManualRefresh();
    onLogin({ role, name });
  };

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow-lg" style={{ maxWidth: '420px', width: '100%' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <div className="bg-success bg-opacity-10 w-20 h-20 rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3">
              <ShieldCheck className="text-success" size={48} />
            </div>
            <h2 className="fw-bold">IBTRA Evaluation Portal</h2>
            <p className="text-muted">আপনার অ্যাকাউন্ট লগইন করুন</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="btn-group w-100 mb-4" role="group">
              <button type="button" className={`btn ${role === 'student' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setRole('student')}>Student</button>
              <button type="button" className={`btn ${role === 'teacher' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setRole('teacher')}>Teacher</button>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">পুরো নাম</label>
              <input required className="form-control" placeholder="আপনার নাম লিখুন" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold">{role === 'teacher' ? 'পাসওয়ার্ড' : 'এক্সেস কোড'}</label>
              <div className="input-group">
                <span className="input-group-text"><Lock size={18} /></span>
                <input required type="password" className="form-control" placeholder={role === 'teacher' ? "Teacher Password" : "Student Access Code"} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <button className="btn btn-success w-100 py-3 fw-bold">লগইন করুন</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;