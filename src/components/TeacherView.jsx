import React from 'react';
import { ShieldCheck, Download, RefreshCw, CheckSquare, Square, FileText, Printer, List } from 'lucide-react';

export default function TeacherView({ 
  submissions = [], 
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  onExport,
  generateIndividualPDF,
  generateSummaryPDF,
  fetchSubmissions, 
  onGrade 
}) {
  return (
    <div className="max-w-6xl mx-auto my-6 bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-slate-800 text-white p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck /> শিক্ষক ড্যাশবোর্ড
        </h1>
        {selectedIds.length > 0 && (
            <button 
                onClick={() => generateIndividualPDF(submissions.filter(s => selectedIds.includes(s.id)))}
                className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold animate-pulse"
            >
                <Printer size={16} /> Print Results ({selectedIds.length})
            </button>
        )}
        <button 
          onClick={onExport} 
          className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Download size={20} /> Excel এ ডাউনলোড করুন
        </button>
        <button onClick={generateSummaryPDF} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition">
            <List size={16} /> Summary PDF
        </button>
        <button onClick={fetchSubmissions} className="bg-slate-700 p-2 rounded hover:bg-slate-600"><RefreshCw size={18} /></button>
      </div>

      <div className="p-6 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-4 w-10">
                <button onClick={onSelectAll}>
                  {submissions.length > 0 && selectedIds.length === submissions.length
                    ? <CheckSquare size={20} className="text-emerald-600" />
                    : <Square size={20} />
                  }
                </button>
              </th>
              <th className="p-3 border-b">নাম</th>
              <th className="p-3 border-b">আইডি নং</th>
              <th className="p-3 border-b">শাখা</th>
              <th className="p-3 border-b">জমার সময়</th>
              <th className="p-3 border-b text-center">স্ট্যাটাস</th>
              <th className="p-3 border-b text-center">প্রাপ্ত নম্বর</th>
              <th className="p-3 border-b text-center">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center p-6 text-gray-500">
                  এখনো কোনো ছাত্র খাতা জমা দেয়নি।
                </td>
              </tr>
            ) : (
              submissions.map((sub, index) => (
                <tr key={sub.id || index} className="border-b hover:bg-slate-50 transition">

                  {/* Checkbox */}
                  <td className="p-4">
                    <button onClick={() => onToggleSelect(sub.id)}>
                      {selectedIds.includes(sub.id)
                        ? <CheckSquare size={20} className="text-emerald-600" />
                        : <Square size={20} />
                      }
                    </button>
                  </td>

                  <td className="p-3 font-semibold">{sub.userName || 'N/A'}</td>
                  <td className="p-3">{sub.userId || 'N/A'}</td>
                  <td className="p-3">{sub.userBranch || 'N/A'}</td>
                  <td className="p-3 text-sm">{sub.timestamp || 'N/A'}</td>

                  {/* Status */}
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      sub.marks ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {sub.marks ? 'Graded' : 'Pending'}
                    </span>
                  </td>

                  {/* Marks */}
                  <td className="p-3 text-center font-bold text-emerald-700">
                    {sub.marks ? `${sub.marks}/10` : '-'}
                  </td>

                  {/* Action */}
                  <td className="p-3 text-center">
                    <button onClick={() => generateIndividualPDF([sub])} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"><FileText size={20} /></button>
                    <button 
                      onClick={() => onGrade(sub)} 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      খাতা দেখুন
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
}