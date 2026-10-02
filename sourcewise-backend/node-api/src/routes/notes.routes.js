const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');

router.use(authenticate);

/**
 * Helper to normalize note data returned from sources table
 */
function normalizeNote(row) {
  if (!row) return null;
  const concepts = row.concepts || {};
  const analysis = row.analysis || {};

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.name || 'Untitled Notes',
    content: row.summary || '',
    style: concepts.style || 'Comprehensive Study Notes',
    depth: concepts.depth || row.difficulty || 'Balanced',
    topic: concepts.topic || '',
    tags: concepts.tags || [],
    sourceIds: analysis.sourceIds || [],
    jsonData: analysis.jsonContent || null,
    wordCount: analysis.wordCount || (row.summary ? row.summary.split(/\s+/).filter(Boolean).length : 0),
    createdAt: row.created_at,
    lastModified: analysis.lastModified || row.created_at,
    preview: (row.summary || '').slice(0, 160).replace(/[#*`_]/g, '').trim(),
  };
}

const demoService = require('../services/demoAccountService');

/**
 * GET /notes - List all notes for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      return res.json(demoService.getNotes());
    }
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('user_id', req.user._id)
      .eq('type', 'note')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const notes = (data || []).map(normalizeNote);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /notes/:id - Fetch a single note by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .eq('type', 'note')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Note not found in cloud storage' });
    }

    res.json(normalizeNote(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /notes - Save a new note to cloud storage
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      style = 'Comprehensive Study Notes',
      depth = 'Balanced',
      topic = '',
      sourceIds = [],
      jsonData = null,
      tags = [],
    } = req.body || {};

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Note content is required to save to cloud storage' });
    }

    // Auto-derive a meaningful title if none provided
    let derivedTitle = (title || '').trim();
    if (!derivedTitle) {
      const headingMatch = content.match(/^#\s+(.+)$/m);
      if (headingMatch && headingMatch[1].trim()) {
        derivedTitle = headingMatch[1].trim();
      } else if (topic && topic.trim()) {
        derivedTitle = `${topic.trim()} Study Notes`;
      } else {
        const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        derivedTitle = `Study Notes (${dateStr})`;
      }
    }

    const words = content.split(/\s+/).filter(Boolean).length;
    const now = new Date().toISOString();

    const insertPayload = {
      user_id: req.user._id,
      name: derivedTitle,
      type: 'note',
      status: 'ready',
      summary: content,
      difficulty: depth,
      concepts: {
        style,
        depth,
        topic,
        tags,
      },
      analysis: {
        jsonContent: jsonData,
        sourceIds,
        wordCount: words,
        lastModified: now,
      },
    };

    const { data, error } = await supabase
      .from('sources')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(normalizeNote(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /notes/:id - Update an existing note in cloud storage ("change that")
 */
router.put('/:id', async (req, res) => {
  try {
    const {
      title,
      content,
      style,
      depth,
      topic,
      jsonData,
      tags,
    } = req.body || {};

    // First fetch existing note to merge metadata
    const { data: existing, error: fetchErr } = await supabase
      .from('sources')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .eq('type', 'note')
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Note not found in cloud storage' });
    }

    const existingConcepts = existing.concepts || {};
    const existingAnalysis = existing.analysis || {};
    const now = new Date().toISOString();

    const updatePayload = {
      ...(title ? { name: title.trim() } : {}),
      ...(content !== undefined ? { summary: content } : {}),
      ...(depth ? { difficulty: depth } : {}),
      concepts: {
        ...existingConcepts,
        ...(style ? { style } : {}),
        ...(depth ? { depth } : {}),
        ...(topic !== undefined ? { topic } : {}),
        ...(tags ? { tags } : {}),
      },
      analysis: {
        ...existingAnalysis,
        ...(jsonData !== undefined ? { jsonContent: jsonData } : {}),
        ...(content !== undefined ? { wordCount: content.split(/\s+/).filter(Boolean).length } : {}),
        lastModified: now,
      },
    };

    const { data, error } = await supabase
      .from('sources')
      .update(updatePayload)
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .select()
      .single();

    if (error) throw error;

    res.json(normalizeNote(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /notes/:id - Remove note from cloud storage
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .eq('type', 'note');

    if (error) throw error;

    res.json({ message: 'Note deleted from cloud storage successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
