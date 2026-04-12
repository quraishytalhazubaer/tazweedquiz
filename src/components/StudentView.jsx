import React from 'react';
import { CheckCircle, ClipboardList, Clock, Award } from 'lucide-react';

const QUESTIONS = [
  { id: 'q1', text: '১. লীনের হরফ কয়টি ও কী কী?' },
  { id: 'q2', text: '২. মাদ্দে মুনফাসিল ও মাদ্দে মুত্তাসিল-এর মধ্যে পার্থক্য কী?' },
  { id: 'q3', text: '৩. ওয়াজিব গুন্নাহ কাকে বলা হয়?' },
  { id: 'q4', text: '৪. নিচের আয়াতে হরফ ث কে কয় আলিফ পরিমাণ টেনে পড়তে হবে?', arabic: 'فَجَعَلَهُ غُثَاءً أَحْوَٰ' },
  { id: 'q5', text: '৫. নূন সাকিন বা তানওয়িন-এর পর কয়টি হরফ আসলে গুন্নাহ না করে পড়তে হয়? হরফগুলো কী কী?' },
];

export default function StudentView({ formData, handleChange, handleSubmit, submitStatus, resetStatus }) {
  if (submitStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden my-12 p-10 text-center border border-emerald-100 animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-emerald-600" />
        </div>
        <h3 className="text-3xl font-black text-emerald-800 mb-4 font-serif">আলহামদুলিল্লাহ!</h3>
        <p className="text-emerald-700 text-lg mb-8">আপনার উত্তর সফলভাবে জমা হয়েছে।</p>
        {/* <button 
          onClick={resetStatus} 
          className="bg-emerald-600 text-white px-10 py-4 rounded-full font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-200 active:scale-95"
        >
          নতুন পরীক্ষা দিন
        </button> */}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden my-8 border border-slate-100">
      {/* Premium Header */}
      <div className="bg-emerald-900 text-white p-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-emerald-400 rounded-full blur-3xl"></div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-black mb-4 font-serif tracking-tight">তাজওয়ীদ পরীক্ষা</h1>
        
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md border border-white/10">
            <Clock size={16} className="text-emerald-300" /> সময়: ১৫ মিনিট
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md border border-white/10">
            <Award size={16} className="text-emerald-300" /> মোট নম্বর: ১৬
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-12 bg-slate-50/30">
        {/* Student Info Card */}
        <div className="bg-white p-8 rounded-2xl mb-12 grid grid-cols-1 md:grid-cols-2 gap-6 border border-emerald-100 shadow-sm relative">
          {[
            { id: 'userName', label: 'নাম' },
            { id: 'userId', label: 'আইডি নং' },
            { id: 'userBranch', label: 'শাখা (Branch)' },
            { id: 'date', label: 'তারিখ (Date)' }
          ].map((field) => (
            <div key={field.id} className="space-y-1">
              <label className="block text-slate-600 font-bold text-sm ml-1">{field.label}:</label>
              <input
                type={field.id === 'date' ? 'date' : 'text'}
                name={field.id} // Fixed: Using field.id instead of the whole object
                value={formData[field.id]}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
              />
            </div>
          ))}
        </div>

        {/* Questions Section */}
        <div className="space-y-10">
          {QUESTIONS.map((q) => (
            <div key={q.id} className="group relative bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
              <label className="block text-xl font-bold text-slate-800 mb-6 pl-4 leading-relaxed">
                {q.text}
              </label>
              <div 
                  dir="rtl" 
                  className="mb-6 text-emerald-900 text-right shadow-inner"
                >
                  [2]
                </div>  
              {q.arabic && (
                <div 
                  dir="rtl" 
                  className="bg-emerald-50/50 p-8 rounded-2xl border-r-8 border-emerald-600 mb-6 text-4xl text-emerald-900 text-right font-arabic leading-[2.2] antialiased shadow-inner"
                >
                  {q.arabic}
                </div>
              )}

              <textarea
                name={q.id}
                value={formData[q.id]}
                onChange={handleChange}
                rows="3"
                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-lg"
                placeholder="আপনার উত্তর এখানে লিখুন..."
              />
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-16 text-center">
          <button 
            disabled={submitStatus === 'submitting'} 
            type="submit" 
            className="group relative overflow-hidden bg-emerald-800 text-white font-black py-5 px-16 rounded-full shadow-2xl hover:bg-emerald-900 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 text-xl tracking-wide uppercase"
          >
            <span className="relative z-10 flex items-center gap-3">
              {submitStatus === 'submitting' ? 'জমা দেওয়া হচ্ছে...' : 'পরীক্ষা জমা দিন'}
              <ClipboardList size={22} className="group-hover:rotate-12 transition-transform" />
            </span>
          </button>
          <p className="mt-4 text-slate-400 text-sm font-medium">একবার জমা দিলে আর পরিবর্তন করা যাবে না</p>
        </div>
      </form>
    </div>
  );
}