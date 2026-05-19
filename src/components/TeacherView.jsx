import { ShieldCheck, Settings, Download, List, RefreshCw, Play, Square as StopIcon, Printer, FileText, CheckSquare, Square } from 'lucide-react';

const TeacherView = ({
  submissions, selectedIds, onToggleSelect, onSelectAll,
  onExport, generateIndividualPDF, handleExamToggle,
  generateSummaryPDF, fetchSubmissions, onGrade, isExamActive,
  submissionUrl, openSettings
}) => (
  <div className="card shadow-lg">
    <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center flex-wrap gap-3">
      <div className="d-flex align-items-center gap-3">
        <ShieldCheck size={28} className="text-success" />
        <h4 className="mb-0">শিক্ষক ড্যাশবোর্ড</h4>
        <button onClick={openSettings} className="btn btn-outline-light btn-sm" title="Settings">
          <Settings size={18} />
        </button>
      </div>

      <div className="d-flex gap-2 flex-wrap">
        <button 
          onClick={handleExamToggle} 
          className={`btn ${isExamActive ? 'btn-danger' : 'btn-success'} d-flex align-items-center gap-2 fw-bold`}
        >
          {isExamActive ? (
            <><StopIcon size={18} /> Exam বন্ধ করুন</>
          ) : (
            <><Play size={18} /> Exam শুরু করুন</>
          )}
        </button>

        {selectedIds.length > 0 && (
          <button onClick={() => generateIndividualPDF(submissions.filter(s => selectedIds.includes(s.id)))} className="btn btn-primary d-flex align-items-center gap-2">
            <Printer size={18} /> Print ({selectedIds.length})
          </button>
        )}

        <button onClick={onExport} className="btn btn-secondary d-flex align-items-center gap-2">
          <Download size={18} /> Export
        </button>
        <button onClick={generateSummaryPDF} className="btn btn-secondary d-flex align-items-center gap-2">
          <List size={18} /> Summary PDF
        </button>
        <button onClick={fetchSubmissions} className="btn btn-outline-light" title="Refresh">
          <RefreshCw size={20} />
        </button>
      </div>
    </div>

    <div className="card-footer bg-light d-flex justify-content-between align-items-center">
      <small className="text-muted">Source: {submissionUrl || 'Not configured'}</small>
      <small className="text-muted fw-bold">{submissions.length} Submissions</small>
    </div>

    <div className="card-body p-0">
      <div className="table-responsive">
        <table className="table table-hover mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th className="text-center" style={{ width: '50px' }}>
                <button className="btn btn-sm p-0" onClick={onSelectAll}>
                  {submissions.length > 0 && selectedIds.length === submissions.length ? 
                    <CheckSquare size={22} /> : <Square size={22} />}
                </button>
              </th>
              <th>নাম</th>
              <th>আইডি নং</th>
              <th>শাখা</th>
              <th>জমার সময়</th>
              <th>স্ট্যাটাস</th>
              <th className="text-center">প্রাপ্ত নম্বর</th>
              <th className="text-end">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-5 text-muted">
                  এখনো কোনো ছাত্র খাতা জমা দেয়নি।
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id}>
                  <td className="text-center">
                    <button className="btn btn-sm p-0" onClick={() => onToggleSelect(sub.id)}>
                      {selectedIds.includes(sub.id) ? 
                        <CheckSquare size={22} className="text-success" /> : 
                        <Square size={22} />}
                    </button>
                  </td>
                  <td><strong>{sub.userName}</strong></td>
                  <td><small className="text-muted">{sub.userId}</small></td>
                  <td>{sub.userBranch || '-'}</td>
                  <td>
                    <small>{sub.timestamp || sub.date || '-'}</small>
                  </td>
                  <td>
                    {sub.marks ? (
                      <span className="badge bg-success">Graded</span>
                    ) : (
                      <span className="badge bg-warning text-dark">Pending</span>
                    )}
                  </td>
                  <td className="text-center fw-bold fs-5 text-success">
                    {sub.marks ? `${sub.marks}/10` : '-'}
                  </td>
                  <td className="text-end">
                    <button 
                      onClick={() => generateIndividualPDF([sub])} 
                      className="btn btn-outline-secondary btn-sm me-2"
                      title="PDF"
                    >
                      <FileText size={18} />
                    </button>
                    <button 
                      onClick={() => onGrade(sub)} 
                      className="btn btn-success btn-sm"
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
  </div>
);

export default TeacherView;