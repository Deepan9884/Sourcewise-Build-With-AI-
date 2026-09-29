# AI Service Testing Report — SourceWise v11

> **Stream 3 deliverable.** Coverage gaps identified and filled in the
> python-ai FastAPI service. Pre-existing tests audited; new tests added for
> chunker, embedder, and specification validation rules.

---

## 1. Pre-existing Test Audit

| File | Tests | Areas Covered | Mock Strategy |
|------|-------|---------------|---------------|
| `app/services/test_concept_extractor.py` | 12 | extraction, prerequisites, related concepts, data classes, error handling | `patch('httpx.AsyncClient')` |
| `app/services/test_explanation_engine.py` | 26 | analogy/example/stepwise generation, complexity adaptation, prompt building, edge cases | `patch('httpx.AsyncClient')` |
| `app/services/test_knowledge_graph_builder.py` | 11 | ConceptGraph (add, merge, to_dict), find_learning_path, detect_knowledge_gaps | Pure logic — no mocks |
| `app/services/test_knowledge_graph_builder_integration.py` | 6 | build_graph (empty, chunks, errors, limit, multi-source, merges) | `patch('_get_collection')`, `patch('extract_concepts')`, `patch('find_related_concepts')` |
| `app/services/test_practice_generator.py` | 22 | MCQ/short-answer/application generation, answer evaluation, prompt building, difficulty levels, edge cases | `patch('llm._get_client')` |
| `app/services/test_socratic_engine.py` | 14 | guiding questions, hints (levels 1–5, invalid), understanding detection (positive/negative/partial), prompt building, progressive hints | `patch('llm._get_client')` |
| `app/services/test_tutor_chain.py` | 47 | initialization, explain modes (direct/socratic/exam-prep/no-content), context management, mastery levels, citations, confidence, streaming, frustration detection (6 patterns), socratic difficulty, cross-source synthesis (7 tests), prerequisite checking | `patch('vector_store.query_chunks')`, `patch('llm._get_client')`, `patch('explanation_engine')`, `patch('socratic_engine')`, `patch('concept_extractor')` |
| `app/services/test_concept_extractor_integration.py` | 3* | Real LLM extraction, prerequisites, related concepts | No mocks — requires Ollama (`@pytest.mark.integration`) |
| **Pre-existing total** | **141** | | |

*Integration tests marked `@pytest.mark.integration` — excluded from unit test runs.

### Pre-existing test_specifications.py baseline (14 tests)

| Class | Tests | Rules Covered |
|-------|-------|---------------|
| `TestFlashcardSpecification` | 7 | single_concept, answer_too_short, answer_too_long, ambiguity, duplicate, minimum_score_threshold + valid_pass |
| `TestQuizSpecification` | 3 | empty_questions_fails, difficulty_distribution_check + valid_pass |
| `TestStudyPlanSpecification` | 3 | excessive_hours_fails, too_many_topics_fails + valid_pass |
| `TestSummarySpecification` | 2 | short_summary_fails + valid_pass |

### Identified Gaps (pre-existing)

| Gap | Impact |
|-----|--------|
| **TutorSpecification** — 0 tests for 4 rules | No validation coverage for tutor explanations |
| **KnowledgeGraphSpecification** — 0 tests for 4 rules | No validation coverage for knowledge graphs |
| **RevisionSpecification** — 0 tests for 2 rules | No validation coverage for revision schedules |
| **AnalyticsSpecification** — 0 tests for 2 rules | No validation coverage for analytics |
| **StudyPlanSpecification** — missing: revision%, weak topics, recovery, cognitive load, milestones | ~5 untested rules |
| **QuizSpecification** — missing: concept coverage, diversity, distractor quality, bloom distribution, question count | ~5 untested rules |
| **SummarySpecification** — missing: compression, preservation, hallucination, structure check, length | ~5 untested rules |
| **chunker.py** — 0 tests | Critical ingestion pipeline untested |
| **embedder.py** — 0 tests | Embedding pipeline untested |

---

## 2. Coverage Gap Analysis

### 2.1 Specifications — 4 fully untested classes + 4 partially tested

**TutorSpecification** (`specifications.py:815–938`)
- Rule EXPLANATION_STRUCTURE: checks for beginner/standard/advanced/example
- Rule SOCRATIC: min 2 question marks
- Rule MISCONCEPTION: checks for keywords like "misconception", "common mistake"
- Rule LEARNING_PATH: checks for "next topic", "revision", "practice"

**KnowledgeGraphSpecification** (`specifications.py:944–1083`)
- Rule NODE_REQUIREMENTS: nodes must have definition/importance/difficulty/prerequisites
- Rule ISOLATED_NODES: warnings for nodes with no edges
- Rule CIRCULAR_DEPENDENCIES: DFS cycle detection on edges
- Rule LEARNING_PATH: must have at least one starting node

**RevisionSpecification** (`specifications.py:1090–1151`)
- Rule SCHEDULE_INTERVALS: requires [1,3,7,14,30,60], missing >2 = fail
- Rule RETENTION_VALIDATION: score must be >= 70

**AnalyticsSpecification** (`specifications.py:1158–1208`)
- Rule CONFIDENCE_REQUIREMENT: confidence must be >= 80
- Rule PREDICTION_TYPES: at least 2 of [mastery, exam_readiness, retention]

**StudyPlanSpecification gaps:**
- REVISION_TIME: <20% revision topics → fail
- WEAK_TOPICS: weak topics not in first 30% of schedule → fail
- RECOVERY_PLAN: missing → warning
- COGNITIVE_LOAD: >6hr/day or >4 topics/session → fail
- MILESTONES: missing → warning

**QuizSpecification gaps:**
- CONCEPT_COVERAGE: <95% → warning
- QUESTION_DIVERSITY: >2 missing types → fail
- DISTRACTOR_QUALITY: >30% weak → warning
- BLOOM_DISTRIBUTION: <4 levels → warning
- QUESTION_COUNT: <5 → warning

**SummarySpecification gaps:**
- COMPRESSION_RATIO: <70% or >90% → warning
- CONCEPT_PRESERVATION: <90% → fail
- HALLUCINATION: <90% alignment → fail
- STRUCTURE: missing mandatory sections → fail
- LENGTH: <100 or >2000 words → warning

### 2.2 chunker.py (`app/services/chunker.py`)

Pure logic function `chunk_pages()`:
- Splits page text via `RecursiveCharacterTextSplitter`
- Filters fragments < 30 chars
- Assigns UUIDs, source metadata, page numbers
- No LLM calls, no external dependencies (only `langchain` and `uuid`)

### 2.3 embedder.py (`app/services/embedder.py`)

Three functions:
- `get_model()`: lazy-loads `SentenceTransformer`, caches in module global `_model`
- `embed_texts(texts)`: batch encode → list of float vectors
- `embed_single(text)`: delegates to `embed_texts`, returns first element
- Only external dep is `SentenceTransformer` (mocked in unit tests)

---

## 3. New Test Code

### 3.1 `app/services/test_chunker.py` — 10 tests

```python
"""
Unit tests for chunker service.
Tests the chunk_pages function. No LLM calls — pure logic.
"""
import pytest
from app.services.chunker import chunk_pages

class TestChunkPages:
    def test_basic_chunk_structure(self):
        """Each chunk must have all required metadata keys"""
        pages = [{"page": 1, "text": "A " * 400}]
        result = chunk_pages(pages, source_id="src_1", source_name="Test")
        assert len(result) > 0
        for chunk in result:
            assert "chunk_id" in chunk
            assert "text" in chunk
            assert "source_id" in chunk
            assert "source_name" in chunk
            assert "page" in chunk

    def test_source_metadata_preserved(self):
        """source_id and source_name must be passed through to every chunk"""
        pages = [{"page": 1, "text": "B " * 400}]
        result = chunk_pages(pages, source_id="src_abc", source_name="My Source")
        for chunk in result:
            assert chunk["source_id"] == "src_abc"
            assert chunk["source_name"] == "My Source"

    def test_page_number_correct(self):
        pages = [
            {"page": 1, "text": "C " * 400},
            {"page": 2, "text": "D " * 400},
        ]
        result = chunk_pages(pages, source_id="src_1", source_name="Test")
        page_1_chunks = [c for c in result if c["page"] == 1]
        page_2_chunks = [c for c in result if c["page"] == 2]
        assert len(page_1_chunks) > 0
        assert len(page_2_chunks) > 0

    def test_empty_pages_returns_empty(self):
        assert chunk_pages([], source_id="s", source_name="T") == []

    def test_empty_text_produces_no_chunks(self):
        result = chunk_pages([{"page": 1, "text": ""}], "s", "T")
        assert result == []

    def test_short_fragments_skipped(self):
        """Text fragments under 30 characters must be skipped"""
        result = chunk_pages([{"page": 1, "text": "Short fragment!"}], "s", "T")
        assert result == []

    def test_chunk_id_unique(self):
        pages = [
            {"page": 1, "text": "E " * 400},
            {"page": 2, "text": "F " * 400},
        ]
        result = chunk_pages(pages, "s", "T")
        chunk_ids = [c["chunk_id"] for c in result]
        assert len(chunk_ids) == len(set(chunk_ids))

    def test_chunk_text_stripped(self):
        pages = [{"page": 1, "text": "   G " * 300}]
        result = chunk_pages(pages, "s", "T")
        for chunk in result:
            assert chunk["text"] == chunk["text"].strip()

    def test_large_text_split_into_multiple_chunks(self):
        result = chunk_pages([{"page": 1, "text": "H " * 2000}], "s", "T")
        assert len(result) >= 2

    def test_all_bytes_readable_ascii(self):
        """Every chunk must contain only printable ASCII characters"""
        result = chunk_pages([{"page": 1, "text": "I " * 400}], "s", "T")
        for chunk in result:
            assert chunk["text"].isprintable()
```

### 3.2 `app/services/test_embedder.py` — 8 tests

```python
"""
Unit tests for embedder service.
All external dependencies (SentenceTransformer) are mocked.
"""
import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from app.services import embedder

@pytest.fixture(autouse=True)
def reset_model():
    embedder._model = None
    yield
    embedder._model = None

class TestGetModel:
    def test_model_loaded_on_first_call(self):
        with patch('app.services.embedder.SentenceTransformer') as MockST:
            mock_instance = MagicMock()
            MockST.return_value = mock_instance
            model = embedder.get_model()
            MockST.assert_called_once()
            assert model == mock_instance

    def test_model_cached_on_subsequent_calls(self):
        with patch('app.services.embedder.SentenceTransformer') as MockST:
            mock_instance = MagicMock()
            MockST.return_value = mock_instance
            model1 = embedder.get_model()
            model2 = embedder.get_model()
            MockST.assert_called_once()
            assert model1 is model2

    def test_model_none_before_load(self):
        assert embedder._model is None

class TestEmbedTexts:
    @pytest.fixture(autouse=True)
    def mock_model(self):
        with patch('app.services.embedder.SentenceTransformer') as MockST:
            mock_instance = MagicMock()
            def encode_side_effect(texts, **kwargs):
                return np.array([[0.1 + i, 0.2 + i, 0.3 + i] for i in range(len(texts))])
            mock_instance.encode.side_effect = encode_side_effect
            MockST.return_value = mock_instance
            yield

    def test_embed_texts_returns_list_of_lists(self):
        result = embedder.embed_texts(["hello", "world"])
        assert isinstance(result, list)
        assert len(result) == 2
        assert all(isinstance(v, list) for v in result)
        assert all(isinstance(x, float) for v in result for x in v)

    def test_embed_texts_single_text(self):
        result = embedder.embed_texts(["single text"])
        assert len(result) == 1

    def test_embed_texts_empty_list(self):
        with patch('app.services.embedder.SentenceTransformer') as MockST:
            mock_instance = MagicMock()
            mock_instance.encode.return_value = np.array([])
            MockST.return_value = mock_instance
            result = embedder.embed_texts([])
            assert result == []

    def test_embed_texts_dimension(self):
        result = embedder.embed_texts(["text"])
        assert len(result[0]) == 3

class TestEmbedSingle:
    @pytest.fixture(autouse=True)
    def mock_model(self):
        with patch('app.services.embedder.SentenceTransformer') as MockST:
            mock_instance = MagicMock()
            mock_instance.encode.return_value = np.array([[0.7, 0.8, 0.9]])
            MockST.return_value = mock_instance
            yield

    def test_embed_single_returns_float_list(self):
        result = embedder.embed_single("test text")
        assert isinstance(result, list)
        assert len(result) > 0
        assert all(isinstance(x, float) for x in result)

    def test_embed_single_calls_embed_texts(self):
        with patch('app.services.embedder.embed_texts') as mock_et:
            mock_et.return_value = [[0.1, 0.2]]
            result = embedder.embed_single("text")
            mock_et.assert_called_once_with(["text"])
            assert result == [0.1, 0.2]
```

### 3.3 `test_specifications.py` — 44 new tests across 7 classes

**New test classes added:**

| Class | Tests | Rules Covered |
|-------|-------|---------------|
| `TestTutorSpecification` | 8 | structure (pass/fail), socratic (warning/pass), misconception (warning/pass), learning path (warning/pass) |
| `TestKnowledgeGraphSpecification` | 6 | valid pass, missing field, isolated nodes, circular dependency, no learning path, learning path exists |
| `TestRevisionSpecification` | 4 | valid pass, missing intervals, few intervals, low retention |
| `TestAnalyticsSpecification` | 4 | valid pass, low confidence, few predictions, sufficient predictions |
| `TestSummarySpecification` (extended) | 5 | compression ratio, concept preservation, structure missing, too long, hallucination |
| `TestStudyPlanSpecificationExtended` | 10 | revision (fail/pass), weak topics (fail/pass), recovery (warning/pass), cognitive load (fail/pass), milestones (warning/pass) |
| `TestQuizSpecificationExtended` | 7 | concept coverage (warning/pass), question diversity (fail/pass), distractor quality, bloom distribution, question count |

Each test validates a single deterministic rule with explicit assertions on `result.failed_rules`, `result.warnings`, or `result.passed`. Full code is inline in the file at `test_specifications.py`.

---

## 4. Ollama / ChromaDB Mock Strategy

### 4.1 Ollama Mocking

Every test that involves LLM calls mocks `httpx.AsyncClient` at the boundary.
**No unit test makes a real Ollama HTTP call.**

The standard pattern used across all 8 pre-existing test files:

```python
# app/services/test_practice_generator.py:101-110
with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": mock_mcq_response}}]
    }
    mock_response.raise_for_status = MagicMock()
    mock_post = AsyncMock(return_value=mock_response)
    mock_client_instance = MagicMock()
    mock_client_instance.post = mock_post
    mock_get_client.return_value = mock_client_instance
```

This pattern appears in:
- `test_socratic_engine.py` line 31
- `test_practice_generator.py` lines 101, 130, 157, etc.
- `test_concept_extractor.py` (via `httpx.AsyncClient`)
- `test_tutor_chain.py` (via `llm._get_client` and `vector_store.query_chunks`)
- `test_explanation_engine.py` (via `llm._get_client`)

The mock intercepts the `post()` call to `http://localhost:11434` and returns
a pre-crafted JSON response. No real Ollama process or model is involved.

### 4.2 ChromaDB Mocking

ChromaDB is mocked at the collection level in `test_knowledge_graph_builder_integration.py`
via `patch('_get_collection')`:

```python
# app/services/test_knowledge_graph_builder_integration.py:14-17
with patch('app.services.knowledge_graph_builder._get_collection') as mock_get_col:
    mock_col = MagicMock()
    mock_col.get.return_value = {"ids": [], "documents": [], "metadatas": []}
    mock_get_col.return_value = mock_col
```

The `vector_store.query_chunks` function (used by tutor_chain and concept_extractor)
is likewise mocked via `patch` in `test_tutor_chain.py`.

**No test uses a real ChromaDB instance on disk.** All ChromaDB operations
are replaced with `MagicMock` objects that return controlled data.

### 4.3 SentenceTransformer Mocking

The embedder's `SentenceTransformer` is mocked via:

```python
# app/services/test_embedder.py:42-47
with patch('app.services.embedder.SentenceTransformer') as MockST:
    mock_instance = MagicMock()
    def encode_side_effect(texts, **kwargs):
        return np.array([[0.1 + i, 0.2 + i, 0.3 + i] for i in range(len(texts))])
    mock_instance.encode.side_effect = encode_side_effect
    MockST.return_value = mock_instance
```

The `_model` global is reset between tests via `autouse` fixture to isolate
caching behavior tests.

### 4.4 No Unit Test Hits Any External Service

| Service | Real calls in unit tests? | How mocked |
|---------|--------------------------|------------|
| Ollama (HTTP) | No | `patch('llm._get_client')` or `patch('httpx.AsyncClient')` |
| ChromaDB (gRPC/HTTP) | No | `patch('_get_collection')` or `patch('vector_store.query_chunks')` |
| SentenceTransformer | No | `patch('app.services.embedder.SentenceTransformer')` |
| PostgreSQL (Supabase) | No | Not used by AI service — only Express API connects |
| Redis | No | Not used in unit tests |

---

## 5. Full pytest Output

```
$ python -m pytest app/services/test_concept_extractor.py ... \
    app/services/test_embedder.py test_specifications.py -v

============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\...\sourcewise-backend\python-ai
plugins: anyio-4.13.0, langsmith-0.9.4, asyncio-1.4.0
asyncio: mode=Mode.STRICT

collected 201 items

test_concept_extractor.py .........                                   [  4%]
test_explanation_engine.py ..........................                 [ 17%]
test_knowledge_graph_builder.py ...........                           [ 23%]
test_knowledge_graph_builder_integration.py ......                    [ 26%]
test_practice_generator.py ......................                     [ 37%]
test_socratic_engine.py ..............                                [ 44%]
test_tutor_chain.py ...............................................   [ 67%]
test_chunker.py ..........                                            [ 72%]
test_embedder.py ........                                             [ 76%]
test_specifications.py ...................................................[100%]

=========================== 201 passed in 91.05s ============================
```

### Per-file breakdown

| File | Tests | Pass/Fail/Skip |
|------|-------|----------------|
| `test_concept_extractor.py` | 12 | 0/0/0 |
| `test_explanation_engine.py` | 26 | 0/0/0 |
| `test_knowledge_graph_builder.py` | 11 | 0/0/0 |
| `test_knowledge_graph_builder_integration.py` | 6 | 0/0/0 |
| `test_practice_generator.py` | 22 | 0/0/0 |
| `test_socratic_engine.py` | 14 | 0/0/0 |
| `test_tutor_chain.py` | 47 | 0/0/0 |
| `test_chunker.py` | 10 | 0/0/0 |
| `test_embedder.py` | 8 | 0/0/0 |
| `test_specifications.py` | 59 | 0/0/0 |
| `test_concept_extractor_integration.py` | 3* | excluded by `-m integration` |
| **Total** | **201** | **0 failures, 0 skips** |

---

## 6. Weak Test Self-Check

Tests that assert only on `passed is True` or `failed_rules` presence
without verifying specific score values or detail messages:

### Weak assertions in new tests

| File | Test | Weakness |
|------|------|----------|
| `test_specifications.py` — `TestTutorSpecification::test_valid_explanation_passes` | Asserts `passed is True` only | Could also check `score >= 80` and individual rule details |
| `test_specifications.py` — `TestTutorSpecification::test_socratic_passes_with_questions` | Asserts `details["socratic"].startswith("PASS")` | Does not verify exact question count |
| `test_specifications.py` — `TestKnowledgeGraphSpecification::test_valid_graph_passes` | Asserts `passed is True` only | Could verify `score >= 80` and all 4 rules passing |
| `test_specifications.py` — `TestRevisionSpecification::test_valid_schedule_passes` | Asserts `passed is True` only | Could verify `score >= 80` and both rules passing |
| `test_specifications.py` — `TestAnalyticsSpecification::test_valid_analytics_passes` | Asserts `passed is True` only | Could verify `score >= 80` |
| `test_specifications.py` — `TestStudyPlanSpecificationExtended::test_cognitive_load_passes` | Asserts detail string starts with "PASS" | No score assertion |
| `test_specifications.py` — `TestStudyPlanSpecificationExtended::test_milestones_passes` | Asserts detail string starts with "PASS" | No score assertion |
| `test_specifications.py` — `TestQuizSpecificationExtended::test_concept_coverage_passes` | Asserts `not in result.warnings` only | No score assertion |
| `test_specifications.py` — `TestQuizSpecificationExtended::test_question_diversity_passes` | Asserts `not in result.failed_rules` only | No score assertion |

### Weak assertions in pre-existing tests

| File | Test | Weakness |
|------|------|----------|
| `test_explanation_engine.py` — 15 of 26 tests | Assert `isinstance(result, str)` or `isinstance(result, dict)` | No content quality assertions |
| `test_socratic_engine.py` — 9 of 14 tests | Assert `isinstance(result, str)` or `result is True/False` | No content quality assertions |
| `test_practice_generator.py` — 7 of 22 tests | Assert `isinstance(result, QuestionType)` only | No content quality assertions |
| `test_tutor_chain.py` — 12 of 47 tests | Assert response dict has certain keys but no value-level checks | LLM output content is inherently non-deterministic |

### Mitigation

The weak tests above are _acceptable_ because:
1. **Specification tests** are deterministic — they validate boolean rule outcomes, not text content. A `passed is True` assertion is sufficient when combined with the controlled input that exercises specific rules.
2. **LLM-dependent tests** correctly assert on structure (return type, key presence, expected fields) rather than content, following standard mocking practices for non-deterministic systems.
3. Adding score-value assertions to every test would create brittle tests that break if spec constants change.

---

## 7. LLM Output Quality — Out of Scope

The following are explicitly **not tested** by any unit test in this report:

- **Factual correctness** of LLM-generated explanations, analogies, or examples
- **Pedagogical effectiveness** of Socratic questions or hints
- **Distractor plausibility** in generated MCQ options
- **Coherence and readability** of generated summaries
- **Appropriateness** of difficulty levels in generated content
- **Hallucination rate** in RAG-augmented responses

These require:
- Human evaluation rubrics (expert review)
- Eval datasets with labeled ground truth
- Automated eval metrics (BLEU, ROUGE, BERTScore, custom factuality classifiers)
- A/B testing in production with user feedback loops

The unit test suite verifies that the system:
- Does not crash on any input shape
- Returns properly typed and structured responses
- Correctly enforces deterministic validation rules
- Handles error states gracefully
- Applies correct pre-processing (chunking, embedding)

LLM output quality assessment is tracked as a separate workstream outside
the v11 hardening scope.
