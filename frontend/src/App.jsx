import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';

// Pages
import Overview from './pages/Overview';
import ApplicationCreate from './pages/ApplicationCreate';
import Discovery from './pages/Discovery';
import ApplicationMap from './pages/ApplicationMap';
import TestPlan from './pages/TestPlan';
import SecurityCenter from './pages/SecurityCenter';
import AuthorizationTest from './pages/AuthorizationTest';
import ScalabilityCenter from './pages/ScalabilityCenter';
import ConcurrencyCenter from './pages/ConcurrencyCenter';
import BusinessLogic from './pages/BusinessLogic';
import ActiveTestRun from './pages/ActiveTestRun';
import TestRuns from './pages/TestRuns';
import Findings from './pages/Findings';
import FindingDetail from './pages/FindingDetail';
import EvidenceViewer from './pages/EvidenceViewer';
import Remediation from './pages/Remediation';
import Retest from './pages/Retest';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="applications/new" element={<ApplicationCreate />} />
          <Route path="applications/:id" element={<Overview />} />
          <Route path="applications/:id/discovery" element={<Discovery />} />
          <Route path="applications/:id/map" element={<ApplicationMap />} />
          <Route path="applications/:id/test-plan" element={<TestPlan />} />
          <Route path="security" element={<SecurityCenter />} />
          <Route path="security/authorization/:id" element={<AuthorizationTest />} />
          <Route path="scalability" element={<ScalabilityCenter />} />
          <Route path="concurrency" element={<ConcurrencyCenter />} />
          <Route path="business-logic" element={<BusinessLogic />} />
          <Route path="test-runs" element={<TestRuns />} />
          <Route path="test-runs/:id" element={<ActiveTestRun />} />
          <Route path="findings" element={<Findings />} />
          <Route path="findings/:id" element={<FindingDetail />} />
          <Route path="findings/:id/evidence" element={<EvidenceViewer />} />
          <Route path="findings/:id/remediation" element={<Remediation />} />
          <Route path="findings/:id/retest" element={<Retest />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
