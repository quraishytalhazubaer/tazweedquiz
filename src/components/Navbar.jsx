import { User, LogOut, ClipboardCheck } from 'lucide-react';

const Navbar = ({ user, onLogout }) => (
  <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow">
    <div className="container">
      <a className="navbar-brand d-flex align-items-center gap-2" href="#">
        <ClipboardCheck size={24} />
        <span>IBTRA Evaluation</span>
      </a>

      <div className="d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2 bg-dark px-3 py-2 rounded-3">
          <User size={18} className="text-success" />
          <span className="text-light small">
            {user.name} ({user.role === 'teacher' ? 'শিক্ষক' : 'ছাত্র'})
          </span>
        </div>
        <button onClick={onLogout} className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  </nav>
);

export default Navbar;