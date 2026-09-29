const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');

router.use(authenticate);

// GET /settings - Get user settings
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('settings')
      .eq('id', req.user._id)
      .single();

    if (error) throw error;
    res.json(data?.settings || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /settings - Update user settings
router.patch('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ settings: req.body })
      .eq('id', req.user._id)
      .select('settings')
      .single();

    if (error) throw error;
    res.json(data?.settings || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /settings/profile - Update user profile
router.patch('/profile', async (req, res) => {
  try {
    const { name, email, bio } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (bio !== undefined) updates.bio = bio;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user._id)
      .select('id, email, name, bio')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const bcrypt = require('bcryptjs');

// PATCH /settings/password - Change user password
router.patch('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', req.user._id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', user.id);

    if (updateError) throw updateError;

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /settings/export - Export all user study data
router.get('/export', async (req, res) => {
  try {
    const userId = req.user._id;
    const [userRes, sourcesRes, plannersRes, quizRes, profileRes] = await Promise.allSettled([
      supabase.from('users').select('id, email, name, settings, created_at').eq('id', userId).single(),
      supabase.from('sources').select('*').eq('user_id', userId),
      supabase.from('planners').select('*').eq('user_id', userId),
      supabase.from('quiz_results').select('*').eq('user_id', userId),
      supabase.from('learning_profiles').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: userRes.status === 'fulfilled' ? userRes.value.data : null,
      learningProfile: profileRes.status === 'fulfilled' ? profileRes.value.data : null,
      sources: sourcesRes.status === 'fulfilled' ? sourcesRes.value.data : [],
      studyPlans: plannersRes.status === 'fulfilled' ? plannersRes.value.data : [],
      quizResults: quizRes.status === 'fulfilled' ? quizRes.value.data : [],
      system: 'SourceWise AI Study Companion v11'
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=sourcewise-data-${Date.now()}.json`);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
