import React from 'react';
import { ChevronLeft, Save } from 'lucide-react';

export default function GradingView({ submission, currentMarks, setCurrentMarks, handleSave, goBack }) {
    // List of questions to display alongside the answers
    const questions = [
        { id: 'q1', text: '১. লীনের হরফ কয়টি ও কী কী?' },
        { id: 'q2', text: '২. মাদ্দে মুনফাসিল ও মাদ্দে মুত্তাসিল-এর মধ্যে পার্থক্য কী?' },
        { id: 'q3', text: '৩. ওয়াজিব গুন্নাহ কাকে বলা হয়?' },
        { id: 'q4', text: '৪. নিচের আয়াতে আলিফ হরফকে কয় আলিফ পরিমাণ টেনে পড়তে হবে?', arabic: 'فَجَعَلَهُ غُثَاءً أَحْوَٰ' },
        { id: 'q5', text: '৫. নূন সাকিন বা তানওয়িন-এর পর কয়টি হরফ আসলে গুন্নাহ না করে পড়তে হয়? হরফগুলো কী কী?' },
    ];

    return (
        <div className="max-w-4xl mx-auto my-6 bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Top Bar */}
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                <button onClick={goBack} className="flex items-center gap-2 hover:text-emerald-400 transition">
                    <ChevronLeft size={20} /> পিছনে যান
                </button>
                <h3 className="text-lg font-bold">{submission.userName} এর উত্তরপত্র</h3>
                <div className="w-20"></div> {/* Spacer */}
            </div>

            <div className="p-6">
                {/* Student Bio */}
                <div className="grid grid-cols-3 gap-4 mb-8 bg-slate-50 p-4 rounded-lg border">
                    <p><strong>নাম:</strong> {submission.userName}</p>
                    <p><strong>আইডি:</strong> {submission.userId}</p>
                    <p><strong>শাখা:</strong> {submission.userBranch}</p>
                </div>

                {/* Answers Section */}
                <div className="space-y-6 mb-10">
                    {questions.map((q) => (
                        <div key={q.id} className="border-l-4 border-emerald-600 pl-4 py-2 bg-gray-50 rounded-r-lg">
                            <p className="font-bold text-slate-700 mb-2">{q.text}</p>
                            {q.arabic && <p dir="rtl" className="text-2xl mb-2 text-emerald-800 font-serif">{q.arabic}</p>}
                            <div className="bg-white p-3 border rounded text-slate-800 min-h-[50px]">
                                {submission[q.id] || <span className="text-gray-400">উত্তর প্রদান করা হয়নি</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grading Footer */}
                <div className="border-t pt-6 flex items-center justify-between bg-white sticky bottom-0 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-4">
                        <label className="font-bold text-lg">প্রাপ্ত নম্বর (১০ এর মধ্যে):</label>
                        <input
                            type="number"
                            max="16"
                            min="0"
                            className="w-24 p-2 border-2 border-emerald-500 rounded text-center text-xl font-bold"
                            value={currentMarks}
                            onChange={(e) => setCurrentMarks(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={handleSave}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition"
                    >
                        <Save size={20} /> মার্কস সেভ করুন
                    </button>
                </div>
            </div>
        </div>
    );
}