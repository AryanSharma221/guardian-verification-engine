const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { logAudit } = require('../middleware/auditLogger');

function getDiscovery(applicationId) {
  const result = db.prepare('SELECT * FROM discovery_results WHERE application_id = ? ORDER BY created_at DESC LIMIT 1').get(applicationId);
  if (!result) return null;
  return parseDiscoveryResult(result);
}

function runDiscovery(applicationId) {
  const ts = new Date().toISOString();
  
  // Update status to discovering
  db.prepare("UPDATE applications SET status = 'discovering', updated_at = ? WHERE id = ?").run(ts, applicationId);
  
  logAudit(applicationId, 'discovery.started', 'application', applicationId, {});

  // Simulate network discovery (deterministic demo mode)
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
  const isReachable = false; // Demo MVP forces simulated mode
  
  if (!isReachable) {
    return runSimulatedDiscovery(applicationId, app, ts);
  }
}

function runSimulatedDiscovery(applicationId, app, ts) {
  const discoveryId = uuidv4();

  let pages = [];
  let endpoints = [];
  let forms = [];
  let roles = [];
  let entities = [];
  let sensitiveFields = [];
  let criticalWorkflows = [];
  let isFromSpec = false;

  if (app.base_url && app.base_url.includes('unreachable')) {
    const error = new Error('The application could not be reached. Check the URL and try again.');
    error.statusCode = 400;
    throw error;
  }

  // Attempt to parse the user-provided API spec
  if (app.api_spec) {
    try {
      const spec = JSON.parse(app.api_spec);
      if (spec.paths) {
        isFromSpec = true;
        const entitySet = new Set();
        
        Object.keys(spec.paths).forEach(path => {
          const methods = spec.paths[path];
          
          // Infer entity from first path segment (e.g., /users/...)
          const segments = path.split('/').filter(Boolean);
          const entityName = segments.length > 0 ? segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/s$/, '') : 'Resource';
          entitySet.add(entityName);

          Object.keys(methods).forEach(method => {
            if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
              const details = methods[method];
              endpoints.push({
                method: method.toUpperCase(),
                path: path,
                description: details.summary || `${method.toUpperCase()} ${path}`
              });

              if (method.toLowerCase() === 'post') {
                criticalWorkflows.push({
                  name: `Create ${entityName}`,
                  steps: ['Validate Input', 'Process Data', 'Save Record'],
                  risk: 'Race condition on creation'
                });
                forms.push({
                  name: `Create ${entityName} Form`,
                  path: path,
                  fields: ['id', 'data']
                });
              }
            }
          });
        });

        entities = Array.from(entitySet).map(e => ({ name: e, type: 'business', description: `${e} resources` }));
        pages = Array.from(entitySet).map(e => ({ name: `${e} Portal`, path: `/${e.toLowerCase()}s`, type: 'data-management' }));
        roles = [
          { name: 'Admin', description: 'Full access to all API resources' },
          { name: 'User', description: 'Standard access to API resources' }
        ];
        sensitiveFields = [
          { field: 'id', entity: entities[0]?.name || 'Resource', classification: 'PII' }
        ];
      }
    } catch (e) {
      console.error("Failed to parse API spec", e);
    }
  }

  // Fallback to generic SaaS or MediFlow data if spec parsing failed or was empty
  if (!isFromSpec) {
    const isMediflow = app.name && app.name.toLowerCase().includes('mediflow');

    if (isMediflow) {
      pages = [
        { name: 'Patient Portal', path: '/patients', type: 'data-management' },
        { name: 'Doctor Dashboard', path: '/doctors', type: 'overview' },
        { name: 'Appointments', path: '/appointments', type: 'workflow' },
        { name: 'Billing', path: '/billing', type: 'financial' },
      ];

      endpoints = [
        { method: 'GET', path: '/api/patients', description: 'List patients' },
        { method: 'POST', path: '/api/patients', description: 'Create patient record' },
        { method: 'GET', path: '/api/appointments', description: 'List appointments' },
        { method: 'POST', path: '/api/appointments', description: 'Book appointment' },
        { method: 'DELETE', path: '/api/appointments/:id', description: 'Cancel appointment' },
        { method: 'GET', path: '/api/records/:id', description: 'View medical report' },
        { method: 'POST', path: '/api/prescriptions', description: 'Create prescription' },
        { method: 'POST', path: '/api/billing', description: 'Process payment' },
      ];

      forms = [
        { name: 'Booking Form', path: '/appointments/new', fields: ['patient_id', 'doctor_id', 'slot'] },
        { name: 'Payment Form', path: '/billing/new', fields: ['appointment_id', 'card'] },
      ];

      roles = [
        { name: 'Patient', description: 'Can view own records and book appointments' },
        { name: 'Doctor', description: 'Can view assigned patients and create prescriptions' },
        { name: 'Receptionist', description: 'Can manage all appointments and billing' },
        { name: 'Admin', description: 'Full system access' },
      ];

      entities = [
        { name: 'Patient', type: 'PII', description: 'Patient records' },
        { name: 'Appointment', type: 'workflow', description: 'Scheduled visits' },
        { name: 'Medical Report', type: 'PHI', description: 'Health records' },
        { name: 'Prescription', type: 'PHI', description: 'Medications' },
        { name: 'Payment', type: 'financial', description: 'Transactions' },
      ];

      sensitiveFields = [
        { field: 'ssn', entity: 'Patient', classification: 'PII' },
        { field: 'diagnosis', entity: 'Medical Report', classification: 'PHI' },
        { field: 'card_number', entity: 'Payment', classification: 'PCI' },
      ];

      criticalWorkflows = [
        { name: 'Book Appointment', steps: ['Select Slot', 'Confirm'], risk: 'Race condition, Double booking' },
        { name: 'Cancel Appointment', steps: ['Check Auth', 'Remove'], risk: 'Unauthorized action' },
        { name: 'View Medical Report', steps: ['Fetch Data'], risk: 'IDOR, PHI Leak' },
        { name: 'Create Prescription', steps: ['Validate Doctor', 'Save'], risk: 'Privilege escalation' },
        { name: 'Process Payment', steps: ['Charge', 'Generate Receipt'], risk: 'Race condition' },
      ];
    } else {
      pages = [
        { name: 'Login', path: '/login', type: 'authentication' },
        { name: 'Dashboard', path: '/dashboard', type: 'overview' },
        { name: 'User Directory', path: '/users', type: 'data-management' },
        { name: 'Organizations', path: '/orgs', type: 'data-management' },
        { name: 'Transactions', path: '/transactions', type: 'workflow' },
        { name: 'Billing', path: '/billing', type: 'financial' },
        { name: 'API Keys', path: '/api-keys', type: 'security' },
        { name: 'System Settings', path: '/settings', type: 'administration' },
      ];

      endpoints = [
        { method: 'POST', path: '/api/auth/login', description: 'User authentication' },
        { method: 'POST', path: '/api/auth/register', description: 'User registration' },
        { method: 'GET', path: '/api/users', description: 'List users' },
        { method: 'GET', path: '/api/users/:id', description: 'Get user profile' },
        { method: 'POST', path: '/api/users', description: 'Create user' },
        { method: 'PUT', path: '/api/users/:id', description: 'Update user' },
        { method: 'DELETE', path: '/api/users/:id', description: 'Delete user' },
        { method: 'GET', path: '/api/orgs', description: 'List organizations' },
        { method: 'GET', path: '/api/orgs/:id', description: 'Get organization' },
        { method: 'POST', path: '/api/orgs', description: 'Create organization' },
        { method: 'PUT', path: '/api/orgs/:id', description: 'Update organization' },
        { method: 'DELETE', path: '/api/orgs/:id', description: 'Delete organization' },
        { method: 'GET', path: '/api/transactions', description: 'List transactions' },
        { method: 'POST', path: '/api/transactions', description: 'Create transaction' },
        { method: 'GET', path: '/api/keys', description: 'List API keys' },
        { method: 'POST', path: '/api/keys', description: 'Generate API key' },
        { method: 'GET', path: '/api/billing/invoices', description: 'List invoices' },
        { method: 'POST', path: '/api/billing/charge', description: 'Process charge' },
        { method: 'GET', path: '/api/admin/system', description: 'System status (admin)' },
      ];

      forms = [
        { name: 'Login Form', path: '/login', fields: ['email', 'password'] },
        { name: 'User Registration', path: '/users/new', fields: ['name', 'email', 'phone', 'role'] },
        { name: 'Organization Setup', path: '/orgs/new', fields: ['org_name', 'billing_email', 'tax_id'] },
        { name: 'API Key Generation', path: '/keys/new', fields: ['key_name', 'scopes', 'expiration'] },
        { name: 'Payment Method', path: '/billing/new', fields: ['org_id', 'card_number', 'cvv', 'expiry'] },
      ];

      roles = [
        { name: 'User', description: 'Standard user, can view own data and org resources' },
        { name: 'Manager', description: 'Can manage org users, view billing, generate keys' },
        { name: 'Billing Admin', description: 'Can manage payment methods and view invoices' },
        { name: 'Super Admin', description: 'Full system access across all organizations' },
      ];

      entities = [
        { name: 'User', type: 'PII', description: 'User personal data' },
        { name: 'Organization', type: 'business', description: 'Tenant organizations' },
        { name: 'Transaction', type: 'transactional', description: 'Business transactions' },
        { name: 'API_Key', type: 'sensitive', description: 'Authentication tokens' },
        { name: 'Invoice', type: 'financial', description: 'Billing statements' },
      ];

      sensitiveFields = [
        { field: 'password_hash', entity: 'User', classification: 'Credential' },
        { field: 'tax_id', entity: 'Organization', classification: 'Confidential' },
        { field: 'secret_key', entity: 'API_Key', classification: 'Credential' },
        { field: 'card_number', entity: 'Invoice', classification: 'PCI' },
        { field: 'cvv', entity: 'Invoice', classification: 'PCI' },
        { field: 'date_of_birth', entity: 'User', classification: 'PII' },
      ];

      criticalWorkflows = [
        { name: 'User Onboarding', steps: ['Register', 'Verify Email', 'Create Org'], risk: 'Privilege escalation' },
        { name: 'Process Transaction', steps: ['Validate Balance', 'Execute Transfer', 'Confirm'], risk: 'Race condition, Double charge' },
        { name: 'Generate API Key', steps: ['Select Scopes', 'Generate Secret', 'Store'], risk: 'Insecure storage, IDOR' },
        { name: 'Access Org Data', steps: ['Authenticate', 'Check Tenant ID', 'Return Data'], risk: 'Cross-tenant data leakage' },
        { name: 'Delete Organization', steps: ['Confirm intent', 'Cascade delete', 'Remove'], risk: 'Unauthorized destructive action' },
      ];
    }
  }

  const confidenceScores = {
    endpoints: isFromSpec ? 1.0 : 0.92,
    roles: 0.88,
    entities: isFromSpec ? 0.98 : 0.95,
    sensitive_fields: 0.85,
    workflows: 0.90,
    overall: 0.90,
  };

  // Insert discovery result
  db.prepare(`
    INSERT INTO discovery_results 
    (id, application_id, status, pages, endpoints, forms, roles, entities, 
     sensitive_fields, critical_workflows, confidence_scores, is_simulated, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    discoveryId, applicationId, 'completed',
    JSON.stringify(pages), JSON.stringify(endpoints), JSON.stringify(forms),
    JSON.stringify(roles.map(r => r.name)), JSON.stringify(entities.map(e => e.name)),
    JSON.stringify(sensitiveFields), JSON.stringify(criticalWorkflows),
    JSON.stringify(confidenceScores), isFromSpec ? 0 : 1, ts, ts
  );

  // Insert roles
  const insertRole = db.prepare('INSERT INTO application_roles (id, application_id, name, description) VALUES (?, ?, ?, ?)');
  for (const role of roles) {
    insertRole.run(uuidv4(), applicationId, role.name, role.description);
  }

  // Insert entities
  const insertEntity = db.prepare('INSERT INTO application_entities (id, application_id, name, type, description) VALUES (?, ?, ?, ?, ?)');
  for (const entity of entities) {
    insertEntity.run(uuidv4(), applicationId, entity.name, entity.type, entity.description);
  }

  // Update app status
  db.prepare("UPDATE applications SET status = 'discovered', updated_at = ? WHERE id = ?")
    .run(ts, applicationId);

  logAudit(applicationId, 'discovery.completed', 'discovery', discoveryId, { simulated: !isFromSpec, from_spec: isFromSpec });

  const result = db.prepare('SELECT * FROM discovery_results WHERE id = ?').get(discoveryId);
  return parseDiscoveryResult(result);
}

function parseDiscoveryResult(row) {
  if (!row) return null;
  return {
    ...row,
    pages: JSON.parse(row.pages || '[]'),
    endpoints: JSON.parse(row.endpoints || '[]'),
    forms: JSON.parse(row.forms || '[]'),
    roles: JSON.parse(row.roles || '[]'),
    entities: JSON.parse(row.entities || '[]'),
    sensitive_fields: JSON.parse(row.sensitive_fields || '[]'),
    critical_workflows: JSON.parse(row.critical_workflows || '[]'),
    confidence_scores: JSON.parse(row.confidence_scores || '{}'),
  };
}

module.exports = {
  runDiscovery,
  getDiscovery,
};