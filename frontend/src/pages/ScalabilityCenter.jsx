import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Play, Pause, Square, Activity, AlertTriangle } from 'lucide-react';

const mockData = [
  { users: 10, latency: 45, throughput: 25, errors: 0 },
  { users: 25, latency: 52, throughput: 60, errors: 0 },
  { users: 50, latency: 68, throughput: 115, errors: 0 },
  { users: 100, latency: 140, throughput: 210, errors: 0 },
  { users: 250, latency: 450, throughput: 380, errors: 2 },
  { users: 500, latency: 1200, throughput: 410, errors: 15 },
  { users: 1000, latency: 3500, throughput: 390, errors: 45 },
];

export default function ScalabilityCenter() {
  const [running, setRunning] = useState(false);
  const degradationPoint = 250;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            Scalability Center
            <span className="inline-block ml-3 mt-1 text-xs font-medium bg-info-light text-info px-2 py-0.5 rounded">DEMO DATA</span>
          </h1>
          <p className="text-text-secondary">Analyze system performance under increasing load.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="card lg:col-span-1 space-y-6">
          <h3 className="text-lg font-semibold">Load Test Controls</h3>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Max Concurrent Users (500)</label>
            <input type="range" min="10" max="1000" defaultValue="500" className="w-full accent-primary" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Test Profile</label>
            <select className="input-field">
              <option>Standard Ramp-up (Step)</option>
              <option>Spike Test</option>
              <option>Soak Test</option>
            </select>
          </div>

          <div className="pt-4 border-t border-border flex space-x-3">
             {!running ? (
               <button onClick={() => setRunning(true)} className="btn-primary w-full flex justify-center items-center">
                 <Play className="w-4 h-4 mr-2" /> Start Test
               </button>
             ) : (
               <>
                 <button onClick={() => setRunning(false)} className="btn-secondary flex-1 flex justify-center items-center text-warning hover:bg-warning-light border-warning">
                   <Pause className="w-4 h-4 mr-2" /> Pause
                 </button>
                 <button onClick={() => setRunning(false)} className="btn-secondary flex-1 flex justify-center items-center text-critical hover:bg-critical-light border-critical">
                   <Square className="w-4 h-4 mr-2" /> Stop
                 </button>
               </>
             )}
          </div>

          {running && (
            <div className="mt-4 p-4 bg-info-light border border-info/20 rounded-md">
              <p className="text-sm text-info font-medium flex items-center mb-2"><Activity className="w-4 h-4 mr-2 animate-pulse" /> Test Running (Stage 3/7)</p>
              <div className="w-full bg-info/20 rounded-full h-1.5 mb-1">
                <div className="bg-info h-1.5 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Charts & Highlights */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold">Performance Curve</h3>
               <div className="flex items-center text-sm font-medium text-warning bg-warning-light px-3 py-1 rounded border border-warning/20">
                 <AlertTriangle className="w-4 h-4 mr-2" />
                 Degradation at ~{degradationPoint} Users
               </div>
             </div>
             <div className="h-72">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EB" />
                    <XAxis dataKey="users" label={{ value: 'Concurrent Users', position: 'insideBottom', offset: -5 }} />
                    <YAxis yAxisId="left" label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Throughput (req/s)', angle: 90, position: 'insideRight' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E5EB' }} />
                    <Legend verticalAlign="top" height={36}/>
                    <ReferenceLine x={degradationPoint} stroke="#D97706" strokeDasharray="3 3" label={{ position: 'top', value: 'Degradation', fill: '#D97706', fontSize: 12 }} yAxisId="left" />
                    <Line yAxisId="left" type="monotone" dataKey="latency" stroke="#334EEC" strokeWidth={2} name="Avg Latency (ms)" />
                    <Line yAxisId="right" type="monotone" dataKey="throughput" stroke="#16A34A" strokeWidth={2} name="Throughput (req/s)" />
                  </LineChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4">Metrics Table</h3>
        <table className="w-full text-sm text-left">
          <thead className="bg-background text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Users</th>
              <th className="px-4 py-3 font-medium">Avg Latency</th>
              <th className="px-4 py-3 font-medium">Throughput</th>
              <th className="px-4 py-3 font-medium">Errors</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockData.map((row, i) => {
              const isDegraded = row.users >= degradationPoint;
              return (
                <tr key={i} className={isDegraded ? (row.errors > 10 ? 'bg-critical-light/20' : 'bg-warning-light/20') : ''}>
                  <td className="px-4 py-3 font-medium">{row.users}</td>
                  <td className={`px-4 py-3 ${row.latency > 1000 ? 'text-warning font-bold' : ''}`}>{row.latency} ms</td>
                  <td className="px-4 py-3">{row.throughput} req/s</td>
                  <td className={`px-4 py-3 ${row.errors > 0 ? 'text-critical font-bold' : ''}`}>{row.errors > 0 ? `${row.errors}%` : '0%'}</td>
                  <td className="px-4 py-3">
                    {row.errors > 10 ? <span className="text-critical font-medium">Failing</span> : 
                     isDegraded ? <span className="text-warning font-medium">Degraded</span> : 
                     <span className="text-success font-medium">Stable</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
