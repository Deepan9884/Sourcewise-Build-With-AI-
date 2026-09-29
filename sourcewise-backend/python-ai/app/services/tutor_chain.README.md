# TutorChain - Intelligent Tutoring Orchestration

## Overview

`TutorChain` is the orchestration layer that coordinates all AI tutoring services to provide intelligent, personalized learning experiences. It extends the basic RAG (Retrieval-Augmented Generation) functionality with multi-strategy explanations, Socratic teaching, and context-aware conversation management.

## Architecture

TutorChain integrates the following AI services:

- **ExplanationEngine**: Generates explanations using different pedagogical strategies (analogy, example, stepwise)
- **SocraticEngine**: Implements guided questioning and progressive hints
- **PracticeGenerator**: Creates practice problems and evaluates answers
- **KnowledgeGraphBuilder**: Builds concept graphs and identifies learning paths
- **Vector Store**: Retrieves relevant content from source documents

## Features

### 1. Multiple Tutoring Modes

TutorChain supports four distinct tutoring modes:

- **DIRECT**: Provides clear, direct explanations with multiple strategies
- **SOCRATIC**: Uses guided questions to help users discover answers
- **EXPLORATORY**: Emphasizes examples and exploration
- **EXAM_PREP**: Focuses on step-by-step breakdowns and practice problems

### 2. Multi-Strategy Explanations

For each concept, TutorChain can generate explanations using different strategies:

- **Analogy**: Relates concepts to familiar experiences
- **Example**: Provides concrete instances and use cases
- **Stepwise**: Breaks down concepts into sequential steps

### 3. Context Management

TutorChain maintains conversation context across multiple turns:

- Tracks current topic and concepts discussed
- Manages turn count for conversation flow
- Supports session-based context isolation
- Enables natural follow-up questions

### 4. Adaptive Responses

Responses adapt based on:

- User mastery level (novice, developing, proficient, mastery)
- Tutoring mode preferences
- Conversation history
- Frustration detection (in Socratic mode)

## Usage

### Basic Usage

```python
from app.services.tutor_chain import TutorChain, TutoringMode

# Initialize tutor
tutor = TutorChain()

# Get explanation
response = await tutor.explain(
    question="What is machine learning?",
    source_ids=["source_123"],
    mode=TutoringMode.DIRECT,
    user_profile={"mastery_level": "novice"}
)

print(response.main_explanation)
print(f"Strategy used: {response.strategy_used}")
print(f"Confidence: {response.confidence}")
```

### Streaming Responses

```python
# Stream response for real-time delivery
async for event in tutor.stream_explain(
    question="What is deep learning?",
    source_ids=["source_123"],
    mode=TutoringMode.DIRECT
):
    if event['type'] == 'token':
        print(event['data'], end='', flush=True)
    elif event['type'] == 'citations':
        print(f"\nCitations: {len(event['data'])}")
```

### Context Management

```python
session_id = "session_abc123"

# First question
response1 = await tutor.explain(
    question="What is supervised learning?",
    source_ids=["source_123"],
    session_id=session_id
)

# Follow-up question with context
response2 = await tutor.explain(
    question="Can you give me an example?",
    source_ids=["source_123"],
    session_id=session_id,
    history=[
        {"role": "user", "content": "What is supervised learning?"},
        {"role": "assistant", "content": response1.main_explanation}
    ]
)

# Clear context when done
tutor.clear_context(session_id)
```

### Socratic Mode

```python
# Socratic mode uses guided questions
response = await tutor.explain(
    question="How does a neural network learn?",
    source_ids=["source_123"],
    mode=TutoringMode.SOCRATIC
)

# Response will be a guiding question, not a direct answer
print(response.main_explanation)
# Example: "What do you think happens when a network makes a mistake?"
```

### Exam Prep Mode

```python
# Exam prep mode provides stepwise breakdowns and practice suggestions
response = await tutor.explain(
    question="Explain backpropagation",
    source_ids=["source_123"],
    mode=TutoringMode.EXAM_PREP
)

# Get practice suggestions
for suggestion in response.practice_suggestions:
    print(f"Practice: {suggestion.concept} (Difficulty: {suggestion.difficulty}/5)")
```

## Response Structure

### TutorResponse

```python
class TutorResponse(BaseModel):
    main_explanation: str                           # Primary explanation
    strategy_used: str                              # Strategy used (analogy, example, stepwise, socratic)
    alternative_explanations: List[AlternativeExplanation]  # Other explanation strategies
    related_concepts: List[RelatedConcept]          # Related concepts from sources
    practice_suggestions: List[PracticeSuggestion]  # Practice problem suggestions
    citations: List[Citation]                       # Source citations
    prerequisite_check: Optional[List[str]]         # Missing prerequisites (if any)
    confidence: float                               # Confidence score (0-1)
```

### Alternative Explanations

Each alternative explanation includes:
- `strategy`: The explanation strategy (analogy, example, stepwise)
- `content`: The alternative explanation text
- `when_to_use`: Guidance on when this strategy is most helpful

### Related Concepts

Each related concept includes:
- `concept`: The concept name
- `relationship`: Type of relationship (prerequisite, related, extends)
- `source_ids`: Sources where this concept appears

### Practice Suggestions

Each practice suggestion includes:
- `concept`: The concept to practice
- `difficulty`: Difficulty level (1-5)
- `reason`: Why this practice is suggested

## Streaming Events

When using `stream_explain()`, the following event types are emitted:

1. **citations**: List of source citations (emitted first)
2. **token**: Explanation text (streamed incrementally)
3. **alternatives**: Alternative explanation strategies
4. **related**: Related concepts
5. **practice**: Practice suggestions
6. **done**: Stream complete

## Frustration Detection

In Socratic mode, TutorChain detects user frustration by analyzing conversation history:

- If history has > 3 turns AND
- Last 3 history items contain 3 user messages
- Then: Switch from guiding questions to providing hints

This ensures users don't get stuck in endless questioning loops.

## Confidence Scoring

Confidence scores indicate how well the sources cover the question:

- **0.9+**: 5+ relevant chunks found
- **0.75**: 3-4 relevant chunks found
- **0.6**: 1-2 relevant chunks found
- **0.3**: Few or no relevant chunks
- **0.0**: No content found

## Integration with Other Services

### ExplanationEngine

TutorChain uses ExplanationEngine to generate different explanation strategies:

```python
# Analogy-based explanation
explanation = await self.explanation_engine.generate_analogy(
    question, context, user_level
)

# Example-based explanation
explanation = await self.explanation_engine.generate_example(
    question, context, user_level
)

# Step-by-step explanation
explanation = await self.explanation_engine.generate_stepwise(
    question, context, user_level
)
```

### SocraticEngine

In Socratic mode, TutorChain uses SocraticEngine for guided questioning:

```python
# Generate guiding question
question = await self.socratic_engine.generate_guiding_question(
    user_question, context, difficulty=3
)

# Generate progressive hint
hint = await self.socratic_engine.generate_hint(
    question, context, hint_level=4
)
```

### Vector Store

TutorChain retrieves relevant content from ChromaDB:

```python
chunks = vector_store.query_chunks(
    question=question,
    source_ids=source_ids,
    top_k=settings.TOP_K_CHUNKS
)
```

## Testing

Comprehensive unit tests are available in `test_tutor_chain.py`:

```bash
# Run all tests
pytest app/services/test_tutor_chain.py -v

# Run specific test
pytest app/services/test_tutor_chain.py::test_explain_direct_mode -v
```

Tests cover:
- All tutoring modes (direct, socratic, exploratory, exam_prep)
- Context management
- Streaming responses
- Frustration detection
- Confidence calculation
- Citation building

## Requirements Mapping

This implementation satisfies the following requirements from the Advanced AI Tutor spec:

- **Requirement 11.1**: Multiple tutoring modes (direct, socratic, exploratory, exam_prep)
- **Requirement 11.2**: Tutoring mode configuration and switching
- **Requirement 13.1**: Context-aware conversation management
- **Requirement 1.1-1.3**: Multi-strategy explanations
- **Requirement 2.1-2.5**: Socratic teaching mode
- **Requirement 5.1-5.2**: Practice problem suggestions

## Future Enhancements

Planned improvements:

1. **Enhanced Concept Extraction**: Use ConceptExtractor for more accurate related concept identification
2. **Knowledge Graph Integration**: Use KnowledgeGraphBuilder for prerequisite detection
3. **Semantic Similarity**: Use embedding-based similarity for confidence scoring
4. **Adaptive Difficulty**: Adjust explanation complexity based on user performance
5. **Multi-Source Synthesis**: Better integration of information from multiple sources

## Example Code

See `tutor_chain_example.py` for complete usage examples demonstrating:
- Direct mode with multi-strategy explanations
- Socratic mode with guided questioning
- Exam prep mode with practice suggestions
- Context management across multiple turns
- Streaming responses for real-time delivery
