const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db/connection');
const { NotFoundError } = require('../utils/errors');

router.post('/', (req, res, next) => {
  try {
    const findingId = req.params.findingId;
    const finding = db.prepare('SELECT * FROM findings WHERE id = ?').get(findingId);
    if (!finding) throw new NotFoundError('Finding');
    
    // Simulate AI generating a remediation
    const patch = `
// Generated Security Patch for: ${finding.title}

// Old code (Vulnerable)
// app.get(req.path, (req, res) => {
//   const data = db.query('SELECT * FROM ' + req.table);
//   res.json(data);
// });

// New code (Mitigated)
app.get(req.path, requireAuth, requireRole('admin'), (req, res) => {
  const allowedTables = ['users', 'settings'];
  if (!allowedTables.includes(req.table)) {
    return res.status(403).json({ error: "Access Denied" });
  }
  const data = db.query('SELECT * FROM ' + req.table);
  res.json(data);
});
`;

    const expected = 'The vulnerability is mitigated by enforcing role-based access control and input validation.';
    
    const stmt = db.prepare('INSERT INTO remediations (id, finding_id, recommendation, status, created_at) VALUES (?, ?, ?, ?, ?)');
    const remId = require('uuid').v4();
    const info = stmt.run(remId, findingId, finding.recommendation || 'Implement standard security controls.', 'proposed', new Date().toISOString());
    
    // For the UI, we return the patch and expected_result dynamically, or we could add them to the DB.
    // The spec UI just needs patch and expected_result on the returned object.
    const rem = {
      id: remId,
      finding_id: findingId,
      status: 'proposed',
      recommendation: finding.recommendation || 'Implement standard security controls.',
      patch,
      expected_result: expected
    };
    
    res.status(201).json({ success: true, data: rem });
  } catch (err) { next(err); }
});

router.get('/', (req, res, next) => {
  try {
    const findingId = req.params.findingId;
    const items = db.prepare('SELECT * FROM remediations WHERE finding_id = ? ORDER BY created_at DESC').all(findingId);
    
    if (items.length > 0) {
      // Inject patch and expected_result since they aren't in the schema
      items[0].patch = `// Generated Security Patch\n\n// New code (Mitigated)\napp.get(req.path, requireAuth, (req, res) => {\n  if(req.user.id !== req.params.userId) return res.status(403).send();\n  // ...\n});`;
      items[0].expected_result = 'The vulnerability is mitigated by enforcing role-based access control and input validation.';
      res.json({ success: true, data: items[0] });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (err) { next(err); }
});

router.patch('/:id', (req, res, next) => {
  try {
    const { status, decision, recommendation } = req.body;
    
    let updates = [];
    let params = [];
    
    // The frontend sends { decision: 'approved' } or { recommendation: '...' }
    const finalStatus = decision || status;
    
    if (finalStatus) { updates.push('status = ?'); params.push(finalStatus); }
    if (recommendation) { updates.push('recommendation = ?'); params.push(recommendation); }
    
    if (updates.length === 0) return res.json({ success: true });
    
    params.push(req.params.id);
    
    const stmt = db.prepare(`UPDATE remediations SET ${updates.join(', ')} WHERE id = ?`);
    const info = stmt.run(...params);
    
    if (info.changes === 0) throw new NotFoundError('Remediation');
    
    const remediation = db.prepare('SELECT * FROM remediations WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: remediation });
  } catch (err) { next(err); }
});

module.exports = router;