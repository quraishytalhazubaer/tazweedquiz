import React from 'react';
import { BookOpen, User } from 'lucide-react';

export default function Navbar({ view, setView }) {
  return (
    <nav className="bg-white shadow-md p-4 flex justify-center gap-4">
      <button
        onClick={() => setView('student')}
        className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition ${
          view === 'student' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        <BookOpen size={20} /> Student Portal (পরীক্ষা দিন)
      </button>
      <button
        onClick={() => setView('teacher')}
        className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition ${
          view === 'teacher' ? 'bg-slate-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        <User size={20} /> Teacher Portal (খাতা দেখুন)
      </button>
    </nav>
  );
}