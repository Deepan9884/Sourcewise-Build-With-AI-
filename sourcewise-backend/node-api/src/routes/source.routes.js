const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const supabase = require('../utils/supabase');
const llmService = require('../services/llmService');

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || '';

// Shared secret forwarded to the Python AI service (see INTERNAL_API_KEY).
const aiHeaders = () => (process.env.INTERNAL_API_KEY
  ? { 'X-Internal-Key': process.env.INTERNAL_API_KEY }
  : {});

const demoService = require('../services/demoAccountService');

router.use(authenticate);

// GET /sources - List all user sources
router.get('/', async (req, res) => {
  try {
    let dbSources = [];
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('user_id', req.user._id)
        .order('created_at', { ascending: false });
      if (!error && data) dbSources = data;
    } catch (_) {}

    if (demoService.isDemoUser(req)) {
      const demoList = demoService.getSources();
      const combined = [...dbSources, ...demoList];
      const seen = new Set();
      const unique = [];
      for (const s of combined) {
        const key = s.id || (s.name || '').toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(s);
        }
      }
      return res.json(unique.map(s => ({
        ...s,
        chunks_count: s.chunks_count || s.chunks_indexed || 0,
        chunks_indexed: s.chunks_count || s.chunks_indexed || 0,
        chunksIndexed: s.chunks_count || s.chunks_indexed || 0,
      })));
    }

    const formatted = dbSources.map(s => ({
      ...s,
      chunks_count: s.chunks_count || 0,
      chunks_indexed: s.chunks_count || 0,
      chunksIndexed: s.chunks_count || 0,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /sources - Create source metadata
router.post('/', async (req, res) => {
  try {
    const { name, type, size, status, chunks_indexed, chunks_count, file_url, summary, concepts, analysis, text_content } = req.body;
    const chunks = Number(chunks_count || chunks_indexed || 0);

    const insertPayload = {
      user_id: req.user._id,
      name: name || 'Untitled',
      type: type || 'pdf',
      status: status || 'ready',
      chunks_count: chunks,
    };
    if (file_url) insertPayload.file_url = file_url;
    if (summary) insertPayload.summary = summary;
    if (concepts) insertPayload.concepts = concepts;
    if (analysis) insertPayload.analysis = analysis;

    // Only assign id if it's a valid UUID; otherwise let Postgres generate UUID
    const isUuid = req.body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.body.id);
    if (isUuid) {
      insertPayload.id = req.body.id;
    }

    let savedData = null;
    try {
      const { data, error } = await supabase
        .from('sources')
        .insert(insertPayload)
        .select()
        .single();
      if (!error && data) savedData = data;
    } catch (dbErr) {
      console.warn('[SourceRoutes] Supabase insert note:', dbErr.message);
    }

    if (!savedData) {
      savedData = {
        id: req.body.id || `src-${Date.now()}`,
        ...insertPayload,
        created_at: new Date().toISOString(),
      };
    }

    if (demoService.isDemoUser(req)) {
      demoService.addSource(savedData);
    }

    // Trigger async cloud analysis with real text_content
    triggerSourceAnalysis(savedData.id, req.user._id, text_content || summary).catch(err => {
      console.error('[SourceRoutes] Analysis trigger failed:', err.message);
    });

    // Track progress event (safely)
    try {
      await supabase.from('progress_events').insert({
        user_id: req.user._id,
        event_type: 'source_upload',
        source_id: savedData.id,
        metadata: { source_name: name, source_type: type },
      });
    } catch (peErr) {
      console.warn('[SourceRoutes] Progress event logging skipped:', peErr.message);
    }

    res.status(201).json({
      ...savedData,
      size: size || 0,
      chunks_count: savedData.chunks_count ?? chunks,
      chunks_indexed: savedData.chunks_count ?? chunks,
      chunksIndexed: savedData.chunks_count ?? chunks,
    });
  } catch (error) {
    console.error('[SourceRoutes] POST /sources exception:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /sources/:id - Get single source
router.get('/:id', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      const src = demoService.getSourceById(req.params.id);
      if (src) return res.json(src);
    }

    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Source not found' });
    res.json({
      ...data,
      chunks_count: data.chunks_count || 0,
      chunks_indexed: data.chunks_count || 0,
      chunksIndexed: data.chunks_count || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /sources/:id - Update source
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'type', 'file_url', 'status', 'chunks_count', 'summary', 'concepts', 'analysis', 'difficulty', 'estimated_reading_time'];
    const updatePayload = {};
    for (const key of Object.keys(req.body)) {
      if (allowed.includes(key)) {
        updatePayload[key] = req.body[key];
      }
    }
    if (req.body.chunks_indexed !== undefined && updatePayload.chunks_count === undefined) {
      updatePayload.chunks_count = Number(req.body.chunks_indexed) || 0;
    }

    const { data, error } = await supabase
      .from('sources')
      .update(updatePayload)
      .eq('id', req.params.id)
      .eq('user_id', req.user._id)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Source not found' });
    res.json({
      ...data,
      chunks_count: data.chunks_count || 0,
      chunks_indexed: data.chunks_count || 0,
      chunksIndexed: data.chunks_count || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /sources/:id - Delete source and cleanup vectors
router.delete('/:id', async (req, res) => {
  try {
    if (demoService.isDemoUser(req)) {
      demoService.deleteSource(req.params.id);
      return res.json({ message: 'Source deleted' });
    }

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
    if (demoService.isDemoUser(req)) {
      const src = demoService.getSourceById(req.params.id);
      if (src) return res.json(src.analysis || {});
    }
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

// POST /sources/knowledge-graph - Generate interactive concept graph
router.post('/knowledge-graph', async (req, res) => {
  try {
    const { source_ids, sourceIds } = req.body;
    const ids = source_ids || sourceIds || [];
    const graph = await llmService.generateKnowledgeGraph(ids, req.user?._id);
    res.json(graph);
  } catch (error) {
    console.error('[SourceRoutes] Knowledge graph error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /sources/analyze - Deep analyze sources
router.post('/analyze', async (req, res) => {
  try {
    const { source_ids, sourceIds } = req.body;
    const ids = source_ids || sourceIds || [];
    let docName = 'Study Document';
    let docSummary = '';
    if (ids.length > 0) {
      const sources = await llmService.getSourcesMetadata(ids, req.user?._id);
      if (sources.length > 0) {
        docName = sources[0].name || docName;
        docSummary = sources[0].summary || '';
      }
    }
    const analysis = await llmService.analyzeDocument(docName, docSummary);
    res.json(analysis);
  } catch (error) {
    console.error('[SourceRoutes] Analyze error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /sources/synthesize - Cross-source synthesis
router.post('/synthesize', async (req, res) => {
  try {
    const { source_ids, sourceIds, focus_topic } = req.body;
    const ids = source_ids || sourceIds || [];
    const result = await llmService.synthesizeCrossSource(ids, focus_topic, req.user?._id);
    res.json(result);
  } catch (error) {
    console.error('[SourceRoutes] Synthesize error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Trigger source analysis via Gemini Cloud LLM
async function triggerSourceAnalysis(sourceId, userId, textContent = '') {
  try {
    let sourceName = 'Study Material';
    let existingSummary = textContent || '';

    // Fetch existing source from Supabase
    try {
      const { data: s } = await supabase.from('sources').select('*').eq('id', sourceId).single();
      if (s) {
        sourceName = s.name || sourceName;
        existingSummary = textContent || s.summary || existingSummary;
      }
    } catch (_) {}

    // Use Gemini Cloud LLM directly for deep document analysis
    const analysis = await llmService.analyzeDocument(sourceName, existingSummary);

    // Save analysis to database
    try {
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
    } catch (e) {
      console.warn('[SourceRoutes] source_analysis upsert note:', e.message);
    }

    // Update source with analysis data
    try {
      await supabase.from('sources').update({
        summary: analysis.overview || '',
        difficulty: analysis.difficulty_assessment || 'medium',
        estimated_reading_time: analysis.estimated_study_time || 30,
        concepts: analysis.key_concepts || [],
        analysis: analysis,
      }).eq('id', sourceId);
    } catch (e) {
      console.warn('[SourceRoutes] sources update note:', e.message);
    }

    // Extract and save concepts for mastery tracking
    if (analysis.key_concepts && analysis.key_concepts.length > 0) {
      for (const concept of analysis.key_concepts) {
        const conceptName = concept.name || (typeof concept === 'string' ? concept : '');
        if (!conceptName) continue;
        try {
          await supabase.from('concept_mastery').upsert({
            user_id: userId,
            concept: conceptName,
            source_id: sourceId,
            mastery_score: 0,
            level: 'novice',
          }, { onConflict: 'user_id,concept' });
        } catch (_) {}

        try {
          const nextReview = new Date();
          nextReview.setDate(nextReview.getDate() + 1);
          await supabase.from('review_schedule').upsert({
            user_id: userId,
            concept: conceptName,
            source_id: sourceId,
            mastery_score: 0,
            next_review_date: nextReview.toISOString(),
            interval_days: 1,
            review_count: 0,
          }, { onConflict: 'user_id,concept' });
        } catch (_) {}
      }
    }

    // Track source upload progress event
    try {
      await supabase.from('progress_events').insert({
        user_id: userId,
        event_type: 'source_analyzed',
        source_id: sourceId,
        metadata: {
          concepts_extracted: analysis.key_concepts?.length || 0,
          difficulty: analysis.difficulty_assessment,
        },
      });
    } catch (_) {}

    return analysis;
  } catch (error) {
    console.error('[SourceAnalysis] Cloud analysis failed:', error.message);
    return null;
  }
}

module.exports = router;
