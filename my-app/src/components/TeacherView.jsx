import React from 'react';
import { ShieldCheck, Download } from 'lucide-react';

export default function TeacherView({ submissions, onExport, onGrade }) {
  return (
    <div className="max-w-6xl mx-auto my-6 bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-slate-800 text-white p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck /> শিক্ষক ড্যাশবোর্ড</h1>
        </div>
        <button onClick={onExport} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg flex items-center gap-2">
          <Download size={20} /> Excel এ ডাউনলোড করুন
        </button>
      </div>

      <div className="p-6 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-3 border-b">নাম</th>
              <th className="p-3 border-b">আইডি নং</th>
              <th className="p-3 border-b">শাখা</th>
              <th className="p-3 border-b text-center">স্ট্যাটাস</th>
              <th className="p-3 border-b text-center">প্রাপ্ত নম্বর</th>
              <th className="p-3 border-b text-center">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr><td colSpan="6" className="text-center p-6 text-gray-500">এখনো কোনো ছাত্র খাতা জমা দেয়নি।</td></tr>
            ) : submissions.map((sub) => (
              <tr key={sub.id} className="border-b hover:bg-slate-50 transition">
                <td className="p-3 font-semibold">{sub.student_info.name}</td>
                <td className="p-3">{sub.student_info.id}</td>
                <td className="p-3">{sub.student_info.branch}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${sub.marks !== undefined ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {sub.marks !== undefined ? 'Graded' : 'Pending'}
                  </span>
                </td>
                <td className="p-3 text-center font-bold text-emerald-700">{sub.marks !== undefined ? `${sub.marks}/16` : '-'}</td>
                <td className="p-3 text-center">
                  <button onClick={() => onGrade(sub)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                    খাতা দেখুন
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}