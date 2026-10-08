import React, { useState } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function Settings() {
  const [formData, setFormData] = useState({
    maxConcurrency: 100,
    maxRps: 500,
    destructiveWrites: false,
    sandboxMode: true
  });
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const handleDestructiveToggle = () => {
    if (!formData.destructiveWrites) {
      setShowConfirm(true);
      setConfirmInput('');
    } else {
      setFormData({ ...formData, destructiveWrites: false });
    }
  };

  const confirmDestructive = () => {
    if (confirmInput === 'I own this app and accept risk') {
      setFormData({ ...formData, destructiveWrites: true });
      setShowConfirm(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings & Safety Controls</h1>
        <p className="text-text-secondary">Configure boundaries for automated testing.</p>
      </div>

      <div className="card space-y-6">
        <h3 className="text-lg font-semibold border-b border-border pb-2">Rate Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Max Concurrency per Test</label>
            <input 
              type="number" 
              className="input-field" 
              value={formData.maxConcurrency}
              onChange={e => setFormData({...formData, maxConcurrency: parseInt(e.target.value)})}
            />
            <p className="text-xs text-text-muted mt-1">Maximum simultaneous threads.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Max Requests per Second (RPS)</label>
            <input 
              type="number" 
              className="input-field" 
              value={formData.maxRps}
              onChange={e => setFormData({...formData, maxRps: parseInt(e.target.value)})}
            />
            <p className="text-xs text-text-muted mt-1">Global rate limit across all tests.</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold border-b border-border pb-2 pt-4">Test Behavior</h3>
        
        <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
          <div>
            <p className="font-medium">Test Sandbox Mode</p>
            <p className="text-sm text-text-secondary">All requests include 'X-Guardian-Sandbox' header</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={formData.sandboxMode} onChange={() => setFormData({...formData, sandboxMode: !formData.sandboxMode})} />
            <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-critical-light/20 rounded-lg border border-critical/30">
          <div>
            <p className="font-medium text-critical flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Allow Destructive Writes</p>
            <p className="text-sm text-critical/80">Permit tests that modify or delete data</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={formData.destructiveWrites} onChange={handleDestructiveToggle} />
            <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-critical"></div>
          </label>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button className="btn-primary flex items-center">
            <Save className="w-4 h-4 mr-2" /> Save Settings
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/50 backdrop-blur-sm">
          <div className="bg-surface rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-medium text-critical flex items-center mb-4">
                <AlertTriangle className="w-5 h-5 mr-2" /> Danger Zone
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Enabling destructive writes allows Guardian to modify, delete, and corrupt data in the target application to test for business logic flaws. 
                <strong className="block mt-2 text-text-primary">NEVER ENABLE THIS ON A PRODUCTION DATABASE.</strong>
              </p>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Type <span className="font-mono bg-background px-1 border border-border">I own this app and accept risk</span> to confirm:
              </label>
              <input 
                type="text" 
                className="input-field" 
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
              />
            </div>
            <div className="bg-background px-4 py-3 flex justify-end space-x-3 border-t border-border">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary">Cancel</button>
              <button 
                onClick={confirmDestructive} 
                disabled={confirmInput !== 'I own this app and accept risk'}
                className="px-4 py-2 rounded-md font-medium transition-colors bg-critical text-white disabled:opacity-50"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
