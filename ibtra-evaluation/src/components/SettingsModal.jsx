import { Settings, Save, X } from 'lucide-react';

const SettingsModal = ({ url, setUrl, onSave, onClose }) => (
  <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header bg-dark text-white">
          <h5 className="modal-title d-flex align-items-center gap-2">
            <Settings size={22} /> System Settings
          </h5>
          <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
        </div>
        <div className="modal-body">
          <div className="mb-3">
            <label className="form-label fw-bold">Submission Sheety URL (Sheet1)</label>
            <input
              type="text"
              className="form-control font-monospace"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.sheety.co/..."
            />
            <small className="text-muted">
              Change this URL to point to your Google Sheet submission tab.
            </small>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-success d-flex align-items-center gap-2" onClick={onSave}>
            <Save size={18} /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default SettingsModal;