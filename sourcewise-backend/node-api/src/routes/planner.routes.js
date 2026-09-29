const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');

router.use(authenticate);

// GET /planner - List all planners
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('planners')
    .select('*')
    .eq('user_id', req.user._id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /planner - Create planner
router.post('/', async (req, res) => {
  const { data, error } = await supabase
    .from('planners')
    .insert({ ...req.body, user_id: req.user._id })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /planner/:id - Get single planner
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('planners')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user._id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Planner not found' });
  res.json(data);
});

// PATCH /planner/:id - Update planner
router.patch('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('planners')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('user_id', req.user._id)
    .select()
    .single();
  if (error || !data) return res.status(404).json({ error: 'Planner not found' });
  res.json(data);
});

// DELETE /planner/:id - Delete planner
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('planners')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user._id);
  if (error) return res.status(404).json({ error: 'Planner not found' });
  res.json({ message: 'Planner deleted' });
});

// POST /planner/:id/replan - Dynamic replanning
router.post('/:id/replan', async (req, res) => {
  try {
    const userId = req.user._id;
    const { missed_day_index, reason } = req.body;

    // Get current planner
    const { data: planner, error: fetchError } = await supabase
      .from('planners')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !planner) {
      return res.status(404).json({ error: 'Planner not found' });
    }

    const planData = typeof planner.data === 'string' ? JSON.parse(planner.data) : planner.data;
    const days = planData.days || [];

    if (missed_day_index === undefined || missed_day_index >= days.length) {
      return res.status(400).json({ error: 'Invalid day index' });
    }

    // Get remaining days and pending tasks
    const remainingDays = [];
    const pendingTasks = [];

    for (let i = missed_day_index; i < days.length; i++) {
      if (days[i].status !== 'completed') {
        pendingTasks.push(...(days[i].topics || []));
        remainingDays.push(days[i]);
      }
    }

    // Redistribute tasks across remaining days
    const tasksPerDay = Math.ceil(pendingTasks.length / Math.max(remainingDays.length, 1));
    let taskIndex = 0;

    const updatedDays = days.map((day, idx) => {
      if (idx < missed_day_index) {
        return day;
      }
      if (day.status === 'completed') {
        return day;
      }

      const dayTasks = pendingTasks.slice(taskIndex, taskIndex + tasksPerDay);
      taskIndex += tasksPerDay;

      return {
        ...day,
        topics: dayTasks.length > 0 ? dayTasks : day.topics,
        status: 'pending',
        replanned: true,
      };
    });

    const updatedPlan = {
      ...planData,
      days: updatedDays,
      lastReplanned: new Date().toISOString(),
      replanCount: (planData.replanCount || 0) + 1,
    };

    // Save updated plan
    const { data: updated, error: updateError } = await supabase
      .from('planners')
      .update({ data: JSON.stringify(updatedPlan) })
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Track progress event
    await supabase.from('progress_events').insert({
      user_id: userId,
      event_type: 'plan_replanned',
      metadata: { planner_id: req.params.id, missed_day: missed_day_index, reason },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /planner/:id/complete-day - Mark a day as complete with milestone check
router.post('/:id/complete-day', async (req, res) => {
  try {
    const userId = req.user._id;
    const { day_index } = req.body;

    const { data: planner, error: fetchError } = await supabase
      .from('planners')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !planner) {
      return res.status(404).json({ error: 'Planner not found' });
    }

    const planData = typeof planner.data === 'string' ? JSON.parse(planner.data) : planner.data;
    const days = planData.days || [];

    if (day_index === undefined || day_index >= days.length) {
      return res.status(400).json({ error: 'Invalid day index' });
    }

    // Mark day as completed
    days[day_index].status = 'completed';
    days[day_index].completedAt = new Date().toISOString();

    // Calculate progress milestones
    const completedDays = days.filter(d => d.status === 'completed').length;
    const totalDays = days.length;
    const progressPercent = Math.round((completedDays / totalDays) * 100);

    // Detect milestone achievements
    const milestones = planData.milestones || [];
    const newMilestones = [];
    const milestoneThresholds = [25, 50, 75, 100];

    for (const threshold of milestoneThresholds) {
      if (progressPercent >= threshold && !milestones.find(m => m.threshold === threshold)) {
        const milestone = {
          threshold,
          achievedAt: new Date().toISOString(),
          label: `${threshold}% Complete`,
        };
        milestones.push(milestone);
        newMilestones.push(milestone);
      }
    }

    const updatedPlan = {
      ...planData,
      days,
      milestones,
      lastCompletedDay: day_index,
      progressPercent,
    };

    const { data: updated, error: updateError } = await supabase
      .from('planners')
      .update({ data: JSON.stringify(updatedPlan) })
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Track progress event
    await supabase.from('progress_events').insert({
      user_id: userId,
      event_type: 'task_completed',
      metadata: { planner_id: req.params.id, day_index, progress_percent: progressPercent },
    });

    res.json({
      planner: updated,
      progress: { completedDays, totalDays, progressPercent },
      newMilestones,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /planner/:id/progress - Get planner progress summary
router.get('/:id/progress', async (req, res) => {
  try {
    const userId = req.user._id;

    const { data: planner, error: fetchError } = await supabase
      .from('planners')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !planner) {
      return res.status(404).json({ error: 'Planner not found' });
    }

    const planData = typeof planner.data === 'string' ? JSON.parse(planner.data) : planner.data;
    const days = planData.days || [];

    const completedDays = days.filter(d => d.status === 'completed').length;
    const totalDays = days.length;
    const totalTopics = days.reduce((sum, d) => sum + (d.topics?.length || 0), 0);
    const completedTopics = days.filter(d => d.status === 'completed').reduce((sum, d) => sum + (d.topics?.length || 0), 0);

    res.json({
      progressPercent: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
      completedDays,
      totalDays,
      completedTopics,
      totalTopics,
      milestones: planData.milestones || [],
      lastReplanned: planData.lastReplanned || null,
      replanCount: planData.replanCount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
