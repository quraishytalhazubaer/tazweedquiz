import React from 'react';
import { CheckCircle } from 'lucide-react';

const QUESTIONS = [
  { id: 'q1', text: '১. লীনের হরফ কয়টি ও কী কী?' },
  { id: 'q2', text: '২. মাদ্দে মুনফাসিল ও মাদ্দে মুত্তাসিল-এর মধ্যে পার্থক্য কী?' },
  { id: 'q3', text: '৩. ওয়াজিব গুন্নাহ কাকে বলা হয়?' },
  { id: 'q4', text: '৪. নিচের আয়াতে আলিফ হরফকে কয় আলিফ পরিমাণ টেনে পড়তে হবে?', arabic: 'فَجَعَلَهُ غُثَاءً أَحْوَٰ' },
  { id: 'q5', text: '৫. নূন সাকিন বা তানওয়িন-এর পর কয়টি হরফ আসলে গুন্নাহ না করে পড়তে হয়? হরফগুলো কী কী?' },
  { id: 'q6', text: '৬. কলকলাহ (Qalqalah) শব্দের অর্থ কী? কলকলাহ-এর হরফ কয়টি?' },
  { id: 'q7', text: '৭. ইযহার (Izhar) কাকে বলে? ইযহারের হরফগুলো লিখুন।' },
  { id: 'q8', text: '৮. মীম সাকিন-এর পর \'মীম\' (م) আসলে কীভাবে পড়তে হয়?' }
];

export default function StudentView({ formData, handleChange, handleSubmit, submitStatus, resetStatus }) {
  if (submitStatus === 'success') {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden my-6 p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-green-800 mb-2">আলহামদুলিল্লাহ!</h3>
        <p className="text-green-700">আপনার উত্তর সফলভাবে জমা হয়েছে।</p>
        <button onClick={resetStatus} className="mt-6 bg-emerald-600 text-white px-6 py-2 rounded-full hover:bg-emerald-700">
          নতুন পরীক্ষা দিন
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden my-6">
      <div className="bg-emerald-800 text-white p-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 font-serif">তাজওয়ীদ পরীক্ষা</h1>
        <p className="mt-2 text-emerald-200">সময়: ১৫ মিনিট | মোট নম্বর: ১৬</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8">
        <div className="bg-emerald-50 p-4 rounded-lg mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 border border-emerald-100">
          {['userName', 'userId', 'userBranch', 'testDate'].map((field) => (
            <div key={field}>
              <label className="block text-gray-700 font-semibold mb-1 capitalize">{field.replace('user', '')}:</label>
              <input
                type={field === 'testDate' ? 'date' : 'text'}
                name={field}
                value={formData[field]}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {QUESTIONS.map((q) => (
            <div key={q.id} className="p-4 bg-gray-50 border-l-4 border-emerald-600 rounded-r-lg">
              <label className="block text-lg font-semibold text-gray-800 mb-2">{q.text}</label>
              
                {q.arabic && (
                    <div 
                        dir="rtl" 
                        className="font-arabic text-4xl text-emerald-800 mb-4 text-right leading-[2] antialiased"
                    >
                        {q.arabic}
                    </div>
                    )}

              <textarea
                name={q.id}
                value={formData[q.id]}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="আপনার উত্তর এখানে লিখুন..."
              />
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button disabled={submitStatus === 'submitting'} type="submit" className="bg-emerald-700 text-white font-bold py-3 px-8 rounded-full shadow-lg disabled:opacity-50">
            {submitStatus === 'submitting' ? 'জমা দেওয়া হচ্ছে...' : 'পরীক্ষা জমা দিন (Submit)'}
          </button>
        </div>
      </form>
    </div>
  );
}