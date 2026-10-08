const express = require('express');
const router = express.Router({ mergeParams: true });
const testPlanGenerator = require('../engines/testPlanGenerator');

router.post('/generate', async (req, res, next) => {
  try {
    console.log("Generating plan for:", req.params.id);
    const result = await testPlanGenerator.generateTestPlan(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await testPlanGenerator.getTestPlan(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;