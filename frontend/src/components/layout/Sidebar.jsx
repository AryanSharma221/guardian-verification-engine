import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import { 
  LayoutDashboard, 
  Map, 
  GitMerge, 
  ShieldAlert, 
  Activity, 
  Users, 
  Briefcase, 
  PlayCircle, 
  AlertTriangle, 
  FileText, 
  Wrench, 
  Settings,
  X
} from 'lucide-react';

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const [appId, setAppId] = useState(null);
  const [appName, setAppName] = useState('Guardian Tests');

  useEffect(() => {
    // Try to extract appId from URL (e.g., /applications/123/...)
    const match = location.pathname.match(/\/applications\/([^\/]+)/);
    let id = match ? match[1] : localStorage.getItem('guardian_current_app_id');
    
    if (id && id !== 'new') {
      setAppId(id);
      localStorage.setItem('guardian_current_app_id', id);
    } else if (!id) {
      // Fetch the most recent app if none selected
      api.get('/applications').then(res => {
        if (res.data && res.data.length > 0) {
          const firstApp = res.data[0].id;
          setAppId(firstApp);
          setAppName(res.data[0].name);
          localStorage.setItem('guardian_current_app_id', firstApp);
        }
      }).catch(() => {});
    }
  }, [location.pathname]);

  useEffect(() => {
    if (appId) {
      api.get(`/applications/${appId}`).then(res => {
        if (res.data) setAppName(res.data.name);
      }).catch((err) => {
        if (err.message.includes('not found') || err.message.includes('404')) {
          localStorage.removeItem('guardian_current_app_id');
          if (appId !== '1') {
            setAppId(null);
          }
        }
      });
    }
  }, [appId]);

  const navItems = [
    { label: 'OVERVIEW', path: appId ? `/applications/${appId}` : '/', icon: LayoutDashboard },
    { label: 'APPLICATION', isHeader: true },
    { label: 'Workflows & Discovery', path: appId ? `/applications/${appId}/discovery` : '#', icon: GitMerge },
    { label: 'Test Plan', path: appId ? `/applications/${appId}/test-plan` : '#', icon: Map },
    { label: 'RESULTS', isHeader: true },
    { label: 'Test Runs', path: '/test-runs', icon: PlayCircle },
    { label: 'Findings', path: '/findings', icon: AlertTriangle },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'SETTINGS', isHeader: true },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col bg-surface border-r border-border text-text-primary">
      <div className="h-16 flex items-center justify-between px-6 border-b border-border">
        <div className="font-bold text-xl text-primary tracking-wide">GUARDIAN</div>
        <button className="lg:hidden text-text-secondary hover:text-text-primary" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-6 mb-6">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Current Application</p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="font-medium text-sm truncate" title={appName}>{appName}</span>
          </div>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map((item, index) => {
            if (item.isHeader) {
              return (
                <div key={index} className="pt-4 pb-1 px-2">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{item.label}</p>
                </div>
              );
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive 
                    ? 'bg-primary-light text-primary' 
                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                  }
                `}
              >
                <Icon className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
