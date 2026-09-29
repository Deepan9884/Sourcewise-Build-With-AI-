const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');

const authenticate = async (req, res, next) => {
  try {
    // EventSource clients (SSE) can't set headers — accept ?token= like /events.
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Select only columns that are guaranteed to exist
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', decoded.userId)
      .single();
    
    if (error) {
      console.error('[Auth] Supabase query error:', error.message);
      return res.status(401).json({ error: 'Database error during authentication' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Set user with consistent id fields
    req.user = {
      _id: user.id,
      userId: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
    };
    next();
  } catch (error) {
    console.error('[Auth] Unexpected error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticate };
