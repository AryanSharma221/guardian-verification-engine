import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import { Database, Server, Users, GitBranch } from 'lucide-react';

export default function ApplicationMap() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const res = await api.get(`/applications/${id}/discovery`);
        if (!res.data) {
          setError('No discovery data available.');
        } else {
          setData({
            roles: res.data.roles || [],
            entities: res.data.entities || [],
            workflows: res.data.critical_workflows || [],
            endpoints: res.data.endpoints || []
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMap();
  }, [id]);

  if (loading) return <LoadingSkeleton count={1} type="chart" />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Application Map</h1>
        <p className="text-text-secondary">Visual representation of discovered architecture</p>
      </div>
      
      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Main Map Area - Simple columns layout */}
        <div className="flex-1 bg-surface border border-border rounded-lg p-6 overflow-auto shadow-sm flex flex-col xl:flex-row gap-6">
          
          <MapColumn title="Roles" icon={Users} items={data?.roles} onSelect={setSelectedNode} active={selectedNode} />
          <div className="hidden xl:flex flex-col justify-center text-border"><GitBranch className="w-8 h-8 rotate-90 xl:rotate-0" /></div>
          
          <MapColumn title="Workflows" icon={GitBranch} items={data?.workflows} onSelect={setSelectedNode} active={selectedNode} />
          <div className="hidden xl:flex flex-col justify-center text-border"><GitBranch className="w-8 h-8 rotate-90 xl:rotate-0" /></div>
          
          <MapColumn title="Entities" icon={Database} items={data?.entities} onSelect={setSelectedNode} active={selectedNode} />
          <div className="hidden xl:flex flex-col justify-center text-border"><GitBranch className="w-8 h-8 rotate-90 xl:rotate-0" /></div>
          
          <MapColumn title="Endpoints" icon={Server} items={data?.endpoints?.slice(0, 8)} onSelect={setSelectedNode} active={selectedNode} />
          
        </div>

        {/* Details Panel */}
        {selectedNode && (
          <div className="w-80 card h-full overflow-auto flex-shrink-0 animate-in slide-in-from-right-8">
            <h3 className="text-lg font-semibold border-b border-border pb-3 mb-4">{selectedNode.name}</h3>
            <p className="text-sm text-text-secondary mb-4">Category: <span className="capitalize font-medium text-text-primary">{selectedNode.type}</span></p>
            
            {selectedNode.data?.description && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-text-secondary">{selectedNode.data.description}</p>
              </div>
            )}
            
            {selectedNode.data?.steps && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Workflow Steps</h4>
                <ol className="list-decimal list-inside text-sm text-text-secondary space-y-1">
                  {selectedNode.data.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}
            
            {selectedNode.data?.risk && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Security Risk</h4>
                <p className="text-sm text-text-secondary">{selectedNode.data.risk}</p>
              </div>
            )}

            {selectedNode.data?.method && (
               <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Endpoint</h4>
                <p className="text-sm font-mono bg-background p-2 rounded border border-border">{selectedNode.data.method} {selectedNode.data.path}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MapColumn({ title, icon: Icon, items, onSelect, active }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-[200px]">
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 mr-2" /> {title}
      </h3>
      <div className="space-y-3 flex-1 overflow-y-auto pr-2 pb-2">
        {items?.map((item, i) => {
          const isObj = typeof item === 'object';
          const name = isObj ? item.name || item.path : item;
          const isActive = active?.name === name;
          return (
            <div 
              key={i}
              onClick={() => onSelect({ type: title.toLowerCase(), name, data: item })}
              className={`
                p-3 rounded-md border text-center cursor-pointer transition-colors text-sm font-medium break-all
                ${isActive ? 'bg-primary text-white border-primary shadow-md' : 'bg-background border-border hover:border-primary/50 text-text-primary'}
              `}
            >
              {name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
