import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import ErrorMessage from '../components/common/ErrorMessage';
import SeverityBadge from '../components/common/SeverityBadge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { Settings, Play, CheckSquare, Square, ChevronDown, ChevronUp, AlertCircle, Save } from 'lucide-react';

export default function TestPlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const appId = id || localStorage.getItem('guardian_current_app_id');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [testPlan, setTestPlan] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({ security: true, concurrency: true, load: true });
  const [inputConfigOpen, setInputConfigOpen] = useState({});
  const [tempInputs, setTempInputs] = useState({});

  useEffect(() => {
    fetchPlan();
  }, [appId]);

  const fetchPlan = async () => {
    try {
      const res = await api.get(`/applications/${appId}/test-plan`);
      if (res.data) {
         setTestPlan(res.data);
      }
      setError(null);
    } catch (err) {
      if (err.message.includes('not found') || err.status === 404) {
        setError('Application not found. Please create a new application from the Overview page.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.post(`/applications/${appId}/test-plan/generate`);
      setTestPlan(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const toggleTest = async (testId, currentIncluded) => {
    try {
      await api.patch(`/tests/${testId}`, { included: !currentIncluded });
      await fetchPlan();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleCategory = async (category, tests, turnOn) => {
    try {
      await Promise.all(tests.map(t => api.patch(`/tests/${t.id}`, { included: turnOn })));
      await fetchPlan();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleAll = async (turnOn) => {
    try {
      await Promise.all(testPlan.tests.map(t => api.patch(`/tests/${t.id}`, { included: turnOn })));
      await fetchPlan();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartExecution = async () => {
    try {
       await api.post('/test-runs', { application_id: appId });
       navigate('/test-runs');
    } catch (err) {
       setError(err.message);
    }
  };

  const handleInputSave = async (test) => {
    try {
      const currentInputs = tempInputs[test.id] || {};
      const savedInputs = { ...test.inputs, ...currentInputs };
      
      // Basic formatting, e.g. obfuscate credentials locally before sending if needed, 
      // but standard is to send to backend, backend should handle it.
      await api.patch(`/tests/${test.id}`, { inputs: savedInputs });
      
      setInputConfigOpen(prev => ({ ...prev, [test.id]: false }));
      await fetchPlan();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingSkeleton count={3} />;

  if (!testPlan) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">AI Test Plan Generation</h1>
        <p className="text-text-secondary mb-8">Generate an intelligent, tailored test plan based on the discovered application model.</p>
        
        {error && error.includes('Application not found') ? (
          <div className="mb-6">
            <ErrorMessage message="This application no longer exists. Please create a new one." />
            <button onClick={() => navigate('/')} className="btn-primary mt-4">Go to Overview</button>
          </div>
        ) : (
          <>
            <button 
              onClick={generatePlan} 
              disabled={generating}
              className="btn-primary text-lg px-8 py-3"
            >
              {generating ? 'Generating Plan...' : 'Generate AI Test Plan'}
            </button>
            {error && <div className="mt-6"><ErrorMessage message={error} /></div>}
            {error && <button onClick={generatePlan} className="btn-secondary mt-4">Retry</button>}
          </>
        )}
      </div>
    );
  }

  const { plan, tests, summary } = testPlan;
  
  const securityTests = tests.filter(t => t.category === 'security');
  const concurrencyTests = tests.filter(t => t.category === 'concurrency');
  const loadTests = tests.filter(t => t.category === 'load');

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold">Test Plan</h1>
          <p className="text-text-secondary">Review and configure the generated tests before execution.</p>
        </div>
        <button onClick={handleStartExecution} className="btn-primary flex items-center">
          <Play className="w-4 h-4 mr-2" /> Start Full Test Execution
        </button>
      </div>

      {error && <div className="mb-6"><ErrorMessage message={error} /></div>}

      <div className="bg-surface border border-border rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm gap-4">
        <div className="flex flex-wrap space-x-6 text-sm">
           <div><span className="text-text-secondary">Total Tests:</span> <span className="font-semibold">{summary.total}</span></div>
           <div><span className="text-text-secondary">Selected:</span> <span className="font-semibold">{summary.included}</span></div>
           {summary.require_input > 0 && (
             <div className="text-warning font-medium flex items-center">
               <Settings className="w-4 h-4 mr-1" /> {summary.require_input} require configuration
             </div>
           )}
        </div>
        <div className="flex space-x-3 text-sm">
           <button onClick={() => toggleAll(true)} className="text-primary hover:underline">Select All</button>
           <button onClick={() => toggleAll(false)} className="text-primary hover:underline">Deselect All</button>
        </div>
      </div>

      <div className="space-y-6">
        <TestGroup 
          title="Security Tests" 
          groupKey="security" 
          tests={securityTests}
          expanded={expandedGroups.security}
          onToggle={() => toggleGroup('security')}
          onToggleTest={toggleTest}
          onToggleCategory={toggleCategory}
          inputConfigOpen={inputConfigOpen}
          setInputConfigOpen={setInputConfigOpen}
          tempInputs={tempInputs}
          setTempInputs={setTempInputs}
          handleInputSave={handleInputSave}
        />
        <TestGroup 
          title="Concurrency & Race Condition Tests" 
          groupKey="concurrency" 
          tests={concurrencyTests}
          expanded={expandedGroups.concurrency}
          onToggle={() => toggleGroup('concurrency')}
          onToggleTest={toggleTest}
          onToggleCategory={toggleCategory}
          inputConfigOpen={inputConfigOpen}
          setInputConfigOpen={setInputConfigOpen}
          tempInputs={tempInputs}
          setTempInputs={setTempInputs}
          handleInputSave={handleInputSave}
        />
        <TestGroup 
          title="Load & Scalability Tests" 
          groupKey="load" 
          tests={loadTests}
          expanded={expandedGroups.load}
          onToggle={() => toggleGroup('load')}
          onToggleTest={toggleTest}
          onToggleCategory={toggleCategory}
          inputConfigOpen={inputConfigOpen}
          setInputConfigOpen={setInputConfigOpen}
          tempInputs={tempInputs}
          setTempInputs={setTempInputs}
          handleInputSave={handleInputSave}
        />
      </div>
    </div>
  );
}

function TestGroup({ title, tests, expanded, onToggle, onToggleTest, onToggleCategory, inputConfigOpen, setInputConfigOpen, tempInputs, setTempInputs, handleInputSave }) {
  if (!tests || tests.length === 0) return null;
  
  const allIncluded = tests.every(t => t.included);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <div 
        className="flex justify-between items-center p-4 bg-background border-b border-border cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleCategory(title.toLowerCase(), tests, !allIncluded); }} 
            className="mr-3 text-primary focus:outline-none"
          >
            {allIncluded ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-text-muted" />}
          </button>
          <h3 className="font-semibold">{title} <span className="text-text-muted text-sm font-normal ml-2">({tests.length})</span></h3>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
      </div>
      
      {expanded && (
        <div className="divide-y divide-border">
          {tests.map((test) => {
             let reqInputs = {};
             try { reqInputs = typeof test.required_inputs === 'string' ? JSON.parse(test.required_inputs) : (test.required_inputs || {}); } catch(e){}
             let savedInputs = {};
             try { savedInputs = typeof test.inputs === 'string' ? JSON.parse(test.inputs) : (test.inputs || {}); } catch(e){}
             
             const hasReq = Object.keys(reqInputs).length > 0;
             const isMissingReq = hasReq && Object.entries(reqInputs).some(([k,v]) => v.required && !savedInputs[k]);
             const isConfigOpen = inputConfigOpen[test.id];

             return (
              <div key={test.id} className="p-4 flex flex-col hover:bg-background/50 transition-colors">
                <div className="flex items-start">
                  <button onClick={() => onToggleTest(test.id, test.included)} className="mt-1 mr-4 text-primary focus:outline-none shrink-0">
                    {test.included ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-text-muted" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-medium text-text-primary truncate">{test.name}</h4>
                      <SeverityBadge severity={test.severity_estimate} />
                      {isMissingReq && (
                         <span className="flex items-center text-xs font-medium text-warning bg-warning-light px-2 py-0.5 rounded">
                           <AlertCircle className="w-3 h-3 mr-1" /> INPUT REQUIRED
                         </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2 mb-2">{test.description}</p>
                    
                    {(test.affected_component || test.workflow || test.safety_level) && (
                      <div className="flex flex-wrap gap-2 mb-3 mt-1 text-xs">
                        {test.affected_component && <span className="px-2 py-0.5 bg-background border border-border rounded text-text-secondary">Target: <span className="font-medium text-text-primary">{test.affected_component}</span></span>}
                        {test.workflow && <span className="px-2 py-0.5 bg-background border border-border rounded text-text-secondary">Workflow: <span className="font-medium text-text-primary">{test.workflow}</span></span>}
                        {test.safety_level && <span className="px-2 py-0.5 bg-background border border-border rounded text-text-secondary">Safety: <span className="font-medium text-text-primary">{test.safety_level}</span></span>}
                      </div>
                    )}

                    {hasReq && (
                       <button 
                         onClick={() => setInputConfigOpen(p => ({ ...p, [test.id]: !isConfigOpen }))}
                         className="text-xs font-medium text-primary flex items-center hover:underline"
                       >
                         <Settings className="w-3 h-3 mr-1" /> Configure Test Inputs
                       </button>
                    )}
                  </div>
                </div>

                {/* Configuration Panel */}
                {isConfigOpen && (
                  <div className="ml-9 mt-4 p-4 bg-background border border-border rounded-md">
                    <h5 className="text-sm font-semibold mb-3">Test Configuration</h5>
                    <div className="space-y-4">
                      {Object.entries(reqInputs).map(([key, config]) => {
                        const val = tempInputs[test.id]?.[key] !== undefined ? tempInputs[test.id][key] : (savedInputs[key] || '');
                        // If it's a secret that was already saved and we're just viewing, obscure it unless typing
                        const isSecret = config.type === 'credentials' || key.includes('secret') || key.includes('token');
                        const displayVal = (isSecret && savedInputs[key] && tempInputs[test.id]?.[key] === undefined) ? '********' : val;

                        return (
                          <div key={key}>
                            <label className="block text-xs font-medium text-text-primary mb-1">
                              {config.label} {config.required && <span className="text-critical">*</span>}
                            </label>
                            {config.type === 'object' || config.type === 'array' ? (
                               <textarea 
                                 className="input-field text-sm font-mono h-20" 
                                 placeholder={config.type === 'object' ? '{"key":"value"}' : '["item1", "item2"]'}
                                 value={typeof displayVal === 'object' ? JSON.stringify(displayVal) : displayVal}
                                 onChange={(e) => setTempInputs(p => ({ ...p, [test.id]: { ...(p[test.id]||{}), [key]: e.target.value } }))}
                               />
                            ) : (
                               <input 
                                 type={isSecret ? 'password' : 'text'}
                                 className="input-field text-sm" 
                                 placeholder={isSecret ? 'Enter secret...' : `Enter ${config.label.toLowerCase()}...`}
                                 value={displayVal}
                                 onChange={(e) => setTempInputs(p => ({ ...p, [test.id]: { ...(p[test.id]||{}), [key]: e.target.value } }))}
                               />
                            )}
                          </div>
                        )
                      })}
                      <button onClick={() => handleInputSave(test)} className="btn-secondary text-sm flex items-center mt-2">
                        <Save className="w-4 h-4 mr-1" /> Save Configuration
                      </button>
                    </div>
                  </div>
                )}
              </div>
             );
          })}
        </div>
      )}
    </div>
  );
}
