const supabase = require('../utils/supabase');
const demoService = require('../services/demoAccountService');

/** Ensure the authenticated user owns the plan. Attaches req.studyPlan. */
function requirePlanOwner({ idParam = 'id', planIdBodyField = 'plan_id' } = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id || req.user?._id;
      const planId = req.params[idParam] || req.body[planIdBodyField] || req.query.plan_id;

      if (demoService.isDemoUser(req)) {
        req.studyPlan = demoService.getPlanById(planId);
        req.planId = planId || req.studyPlan?.id || 'plan-demo-ml-2026';
        return next();
      }

      if (!planId) return res.status(400).json({ error: 'plan id is required' });
      const { data: plan, error } = await supabase.from('study_plans').select('id, user_id').eq('id', planId).single();
      if (error || !plan) return res.status(404).json({ error: 'Study plan not found' });
      if (plan.user_id !== userId) return res.status(403).json({ error: 'Access denied' });
      req.studyPlan = plan;
      req.planId = plan.id;
      next();
    } catch (e) {
      res.status(500).json({ error: 'Plan access check failed' });
    }
  };
}

/** Ensure the schedule slot belongs to the user (via parent plan). Attaches req.slot. */
function requireSlotOwner({ idParam = 'id' } = {}) {
  return async (req, res, next) => {
    try {
      if (demoService.isDemoUser(req)) {
        req.slot = { id: req.params[idParam], plan_id: 'plan-demo-ml-2026' };
        return next();
      }

      const userId = req.user?.userId || req.user?.id || req.user?._id;
      const slotId = req.params[idParam];
      const { data: slot, error } = await supabase.from('schedule_slots').select('id, plan_id').eq('id', slotId).single();
      if (error || !slot) return res.status(404).json({ error: 'Schedule slot not found' });
      const { data: plan } = await supabase.from('study_plans').select('id, user_id').eq('id', slot.plan_id).single();
      if (!plan || plan.user_id !== userId) return res.status(403).json({ error: 'Access denied' });
      req.slot = slot;
      next();
    } catch (e) {
      res.status(500).json({ error: 'Slot access check failed' });
    }
  };
}

module.exports = { requirePlanOwner, requireSlotOwner };
