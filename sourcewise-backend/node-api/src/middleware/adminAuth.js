const supabase = require('../utils/supabase');

/** Require admin flag. Must run AFTER authenticate middleware. */
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const { data: user, error } = await supabase
      .from('users')
      .select('id, is_admin')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!user?.is_admin) {
      return res.status(403).json({
        error: 'Admin access required',
        type: 'https://api.sourcewise.com/errors/forbidden',
      });
    }
    req.admin = true;
    next();
  } catch (error) {
    console.error('[AdminAuth] error:', error.message);
    res.status(500).json({ error: 'Admin verification failed' });
  }
};

module.exports = { requireAdmin };
