const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

// Shared secret forwarded to the Python AI service (see INTERNAL_API_KEY).
// Read per call (not at module load) so tests and env reloads are honoured.
// Omitted when unconfigured (plain local-dev mode).
const aiHeaders = () => (process.env.INTERNAL_API_KEY
  ? { 'X-Internal-Key': process.env.INTERNAL_API_KEY }
  : {});

router.use(authenticate);

// GET /sources - List all user sources
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /sources - Create source metadata
router.post('/', async (req, res) => {
  try {
    const { name, type, size, status, chunks_indexed } = req.body;

    const { data, error } = await supabase
      .from('sources')
      .insert({
        user_id: req.user._id,
        name: name || 'Untitled',
        type: type || 'pdf',
        size: size || 0,
        status: status || 'ready',
        chunks_indexed: chunks_indexed || 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger async analysis (don't wait for it)
    triggerSourceAnalysis(data.id, req.user._id).catch(err => {
      console.error('[SourceRoutes] Analysis trigger failed:', err.message);
    });

    // Track progress event
    await supabase.from('progress_events').insert({
      user_id: req.user._id,
      event_type: 'source_upload',
      source_id: data.id,
      metadata: { source_name: name, source_type: type },
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /sources/:id - Get single source
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Source not found' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /sources/:id - Update source
router.patch('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sources')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Source not found' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /sources/:id - Delete source and cleanup vectors
router.delete('/:id', async (req, res) => {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id);

    // Delete from Supabase if this is a database UUID
    if (isUuid) {
      try {
        const { error } = await supabase
          .from('sources')
          .delete()
          .eq('id', req.params.id)
          .eq('user_id', req.user._id);

        if (error) {
          console.warn('[SourceRoutes] Supabase delete error:', error.message);
        }
      } catch (dbErr) {
        console.warn('[SourceRoutes] Supabase delete exception:', dbErr.message);
      }

      // Track progress event (best effort)
      try {
        await supabase.from('progress_events').insert({
          user_id: req.user._id,
          event_type: 'source_delete',
          source_id: req.params.id,
        });
      } catch (_) {}
    }

    // Try to delete from ChromaDB (best effort)
    try {
      await axios.delete(`${PYTHON_AI_URL}/ingest/${req.params.id}`, { headers: aiHeaders() });
    } catch (e) {
      console.log('[SourceRoutes] ChromaDB cleanup skipped:', e.message);
    }

    res.json({ message: 'Source deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /sources/:id/analyze - Trigger source analysis
router.post('/:id/analyze', async (req, res) => {
  try {
    const { data: source, error: fetchError } = await supabase
      .from('sources')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .single();

    if (fetchError || !source) return res.status(404).json({ error: 'Source not found' });

    const analysis = await triggerSourceAnalysis(source.id, req.user._id);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Trigger source analysis via Python AI
async function triggerSourceAnalysis(sourceId, userId) {
  try {
    const response = await axios.post(`${PYTHON_AI_URL}/sources/analyze`, {
      source_ids: [sourceId],
      analysis_type: 'full',
    }, { timeout: 30000, headers: aiHeaders() });

    const rawData = response.data;
    const analysis = Array.isArray(rawData) ? (rawData[0] || {}) : (rawData || {});

    // Save analysis to database
    await supabase.from('source_analysis').upsert({
      source_id: sourceId,
      user_id: userId,
      summary: analysis.overview || '',
      key_concepts: analysis.key_concepts || [],
      difficulty: analysis.difficulty_assessment || 'medium',
      estimated_reading_time: analysis.estimated_study_time || 30,
      chapter_structure: analysis.chapter_structure || [],
      key_takeaways: analysis.key_takeaways || [],
      recommendations: analysis.recommendations || [],
    }, { onConflict: 'source_id' });

    // Update source with analysis data
    await supabase.from('sources').update({
      summary: analysis.overview || '',
      difficulty: analysis.difficulty_assessment || 'medium',
      estimated_reading_time: analysis.estimated_study_time || 30,
      analysis: analysis,
    }).eq('id', sourceId);

    // Extract and save concepts
    if (analysis.key_concepts && analysis.key_concepts.length > 0) {
      for (const concept of analysis.key_concepts) {
        const conceptName = concept.name || concept;
        
        // Save concept mastery
        await supabase.from('concept_mastery').upsert({
          user_id: userId,
          concept: conceptName,
          source_id: sourceId,
          mastery_score: 0,
          level: 'novice',
        }, { onConflict: 'user_id,concept' });

        // Auto-schedule initial review for new concepts
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + 1); // Review tomorrow
        
        await supabase.from('review_schedule').upsert({
          user_id: userId,
          concept: conceptName,
          source_id: sourceId,
          mastery_score: 0,
          next_review_date: nextReview.toISOString(),
          interval_days: 1,
          review_count: 0,
        }, { onConflict: 'user_id,concept' });
      }
    }

    // Track source upload progress event
    await supabase.from('progress_events').insert({
      user_id: userId,
      event_type: 'source_analyzed',
      source_id: sourceId,
      metadata: {
        concepts_extracted: analysis.key_concepts?.length || 0,
        difficulty: analysis.difficulty_assessment,
      },
    });

    return analysis;
  } catch (error) {
    console.error('[SourceAnalysis] Failed:', error.message);
    return null;
  }
}

module.exports = router;
