const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../middleware/auditLogger');

/**
 * AI Diagnosis Engine.
 * Generates structured analysis of findings including:
 * what happened, evidence, impact, root cause, recommendation, confidence.
 */

/**
 * Generate AI diagnosis for a finding.
 */
function diagnoseFinding(findingId) {
  const finding = db.prepare('SELECT * FROM findings WHERE id = ?').get(findingId);
  if (!finding) throw new Error('Finding not found');

  const evidenceRecords = db.prepare('SELECT * FROM evidence WHERE finding_id = ?').all(findingId);

  try {
    const diagnosis = generateDiagnosis(finding, evidenceRecords);

    // Update finding with diagnosis data
    db.prepare(`
      UPDATE findings SET 
        root_cause = COALESCE(?, root_cause),
        recommendation = COALESCE(?, recommendation),
        confidence = COALESCE(?, confidence)
      WHERE id = ?
    `).run(diagnosis.root_cause, diagnosis.recommendation, diagnosis.confidence, findingId);

    logAudit(finding.application_id, 'diagnosis.generated', 'finding', findingId, { confidence: diagnosis.confidence });

    return {
      finding_id: findingId,
      status: 'completed',
      diagnosis,
    };
  } catch (err) {
    logAudit(finding.application_id, 'diagnosis.failed', 'finding', findingId, { error: err.message });
    return {
      finding_id: findingId,
      status: 'ANALYSIS_INCOMPLETE',
      message: 'Analysis incomplete. Raw evidence is still available.',
      raw_evidence: evidenceRecords.map(e => ({
        ...e,
        request: JSON.parse(e.request || '{}'),
        response: JSON.parse(e.response || '{}'),
      })),
    };
  }
}

/**
 * Generate diagnosis based on finding category and severity.
 */
function generateDiagnosis(finding, evidenceRecords) {
  const evidence = JSON.parse(finding.evidence || '{}');

  // Category-specific diagnosis generation
  const generators = {
    security: generateSecurityDiagnosis,
    business_logic: generateBusinessLogicDiagnosis,
    scalability: generateScalabilityDiagnosis,
    data_integrity: generateDataIntegrityDiagnosis,
    reliability: generateReliabilityDiagnosis,
  };

  const generator = generators[finding.category] || generateGenericDiagnosis;
  return generator(finding, evidence, evidenceRecords);
}

function generateSecurityDiagnosis(finding, evidence, evidenceRecords) {
  const isIDOR = finding.title.toLowerCase().includes('idor') || finding.title.toLowerCase().includes('object-level');
  const isRoleBypass = finding.title.toLowerCase().includes('role') || finding.title.toLowerCase().includes('privilege');

  if (isIDOR) {
    return {
      what_happened: `An authorization vulnerability was observed where a user was able to access resources belonging to another user. The API endpoint ${evidence.endpoint || 'under test'} returned a ${evidence.actual_status || 200} response when it should have returned 403 Forbidden.`,
      evidence_summary: `The test authenticated as ${evidence.attacker?.role || 'User A'} (${evidence.attacker?.name || 'attacker'}) and attempted to access a resource owned by ${evidence.victim?.role || 'User B'} (${evidence.victim?.name || 'victim'}). The server returned the complete resource data without performing ownership verification.`,
      impact: finding.impact || 'Unauthorized access to protected information. In healthcare applications, this constitutes a potential HIPAA violation with significant regulatory and legal consequences.',
      root_cause: 'The API performs authentication (verifying who the user is) but does not perform authorization (verifying what the user is allowed to access). The endpoint accepts any valid authentication token and returns the requested resource without checking if the authenticated user has ownership or access rights to that specific resource.',
      recommendation: finding.recommendation || 'Implement object-level authorization checks. Before returning any resource, verify that the authenticated user owns or has explicit access to the requested resource.',
      confidence: 'observed',
      severity_justification: 'This is rated CRITICAL because the vulnerability allows any authenticated user to access any other user\'s data, and the attack is trivially reproducible by modifying the resource ID in the URL.',
    };
  }

  if (isRoleBypass) {
    return {
      what_happened: `A role-based access control bypass was detected. A user with the ${evidence.attacker_role || 'lower-privilege'} role was able to access functionality restricted to the ${evidence.required_role || 'higher-privilege'} role.`,
      evidence_summary: `The test authenticated with the ${evidence.attacker_role || 'Patient'} role and successfully accessed an endpoint requiring ${evidence.required_role || 'Doctor'} privileges.`,
      impact: finding.impact,
      root_cause: 'The application likely checks for authentication but does not enforce role-based access control on certain endpoints. The middleware or route handler does not verify the user\'s role against the required access level.',
      recommendation: finding.recommendation,
      confidence: 'observed',
      severity_justification: `This vulnerability allows ${evidence.attacker_role || 'lower-privilege'} users to perform actions they should not be authorized for.`,
    };
  }

  return generateGenericDiagnosis(finding, evidence, evidenceRecords);
}

function generateBusinessLogicDiagnosis(finding, evidence, evidenceRecords) {
  const isRaceCondition = finding.title.toLowerCase().includes('race') || finding.title.toLowerCase().includes('double booking');

  if (isRaceCondition) {
    return {
      what_happened: `A race condition was detected in the ${evidence.scenario || 'business operation'}. ${evidence.concurrent_requests || 2} simultaneous requests were able to complete when only 1 should have succeeded, resulting in a data integrity violation.`,
      evidence_summary: `Initial state: ${JSON.stringify(evidence.initial_state || {})}. After ${evidence.concurrent_requests || 2} concurrent requests, final state: ${JSON.stringify(evidence.final_state || {})}. The expected outcome was that only 1 request would succeed.`,
      impact: finding.impact || 'Data integrity failure that could lead to conflicting bookings, over-allocation of resources, or financial discrepancies.',
      root_cause: 'The operation uses a check-then-act pattern without proper concurrency control. The availability check and resource allocation are performed as separate, non-atomic database operations. Between the check and the allocation, another concurrent request can read the same stale state and also succeed.',
      recommendation: finding.recommendation,
      confidence: 'observed',
      severity_justification: 'Race conditions can cause data corruption that is difficult to detect and repair. The impact is amplified in systems with financial or safety implications.',
    };
  }

  return generateGenericDiagnosis(finding, evidence, evidenceRecords);
}

function generateScalabilityDiagnosis(finding, evidence, evidenceRecords) {
  return {
    what_happened: `Progressive load testing identified that the application's performance degrades significantly at ${evidence.degradation_point?.concurrent_users || 'elevated'} concurrent users. Response times and error rates exceed acceptable thresholds beyond this point.`,
    evidence_summary: `Across ${evidence.stages?.length || 7} load stages, the application maintained acceptable performance until ${evidence.degradation_point?.concurrent_users || 'the degradation point'} users. At this stage, ${evidence.degradation_point?.reason || 'latency exceeded thresholds'}.`,
    impact: finding.impact || 'The application will become unreliable during peak traffic, leading to poor user experience, failed transactions, and potential data loss.',
    root_cause: finding.root_cause || 'Probable causes include unoptimized database queries, lack of connection pooling, synchronous I/O blocking, absence of caching, or insufficient server resources.',
    recommendation: finding.recommendation,
    confidence: 'likely',
    severity_justification: 'Performance degradation at moderate load levels indicates the application is not ready for production traffic and requires optimization before launch.',
  };
}

function generateDataIntegrityDiagnosis(finding, evidence, evidenceRecords) {
  return {
    what_happened: `A data integrity issue was identified: ${finding.description}`,
    evidence_summary: `Evidence indicates that ${finding.title.toLowerCase()}.`,
    impact: finding.impact,
    root_cause: finding.root_cause || 'The application likely lacks proper validation, audit logging, or integrity constraints for this operation.',
    recommendation: finding.recommendation,
    confidence: 'likely',
    severity_justification: 'Data integrity issues can compound over time and become difficult to remediate retroactively.',
  };
}

function generateReliabilityDiagnosis(finding, evidence, evidenceRecords) {
  return generateGenericDiagnosis(finding, evidence, evidenceRecords);
}

function generateGenericDiagnosis(finding, evidence, evidenceRecords) {
  return {
    what_happened: `Guardian detected an issue: ${finding.title}. ${finding.description}`,
    evidence_summary: evidenceRecords.length > 0
      ? `${evidenceRecords.length} evidence record(s) collected during testing.`
      : 'Evidence is embedded in the finding details.',
    impact: finding.impact || 'Impact assessment requires further analysis.',
    root_cause: finding.root_cause || 'Root cause analysis is inferred based on available evidence. Manual investigation is recommended to confirm.',
    recommendation: finding.recommendation || 'Review the evidence and address the identified issue based on its severity and impact.',
    confidence: finding.confidence || 'inferred',
    severity_justification: `This issue is classified as ${finding.severity} based on the observed behavior and potential impact.`,
  };
}

module.exports = { diagnoseFinding };