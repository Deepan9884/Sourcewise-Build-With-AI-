# SocraticEngine Service

## Overview

The `SocraticEngine` service implements the Socratic teaching method for the Advanced AI Tutor. Instead of providing direct answers, it guides learners to discover knowledge through progressive questioning, hints, and understanding detection.

## Purpose

This service enables the AI tutor to:
- Generate guiding questions that lead users toward insights
- Provide progressive hints from subtle to nearly direct
- Detect when users have reached genuine understanding
- Support active learning and critical thinking development

## Core Methods

### `generate_guiding_question(user_question, context, difficulty)`

Generates a Socratic guiding question instead of a direct answer.

**Parameters:**
- `user_question` (str): The user's original question
- `context` (str): Source material context for grounding
- `difficulty` (int): Question difficulty level (1=very easy, 5=challenging)

**Returns:**
- `str`: A guiding question that leads toward discovery

**Example:**
```python
engine = SocraticEngine()
question = await engine.generate_guiding_question(
    user_question="What is photosynthesis?",
    context=source_text,
    difficulty=2
)
# Returns: "What do you think plants need to create their own food?"
```

### `generate_hint(question, context, hint_level)`

Generates progressive hints at specified levels of directness.

**Parameters:**
- `question` (str): The question or concept the user is working on
- `context` (str): Source material context
- `hint_level` (int): Hint specificity (1=subtle, 5=nearly direct answer)

**Returns:**
- `str`: A hint at the specified level

**Hint Levels:**
1. **Very subtle** - Points in the right direction without revealing much
2. **Gentle nudge** - Highlights relevant principles, requires significant thinking
3. **Moderate help** - Identifies key concepts, provides partial framework
4. **Substantial guidance** - Explains most reasoning, leaves final connection
5. **Nearly direct** - Provides almost all information, only final synthesis needed

**Example:**
```python
# Level 1 hint (subtle)
hint1 = await engine.generate_hint(
    question="What are the products of photosynthesis?",
    context=source_text,
    hint_level=1
)
# Returns: "Think about what plants produce that other organisms need."

# Level 5 hint (nearly direct)
hint5 = await engine.generate_hint(
    question="What are the products of photosynthesis?",
    context=source_text,
    hint_level=5
)
# Returns: "Photosynthesis produces glucose and oxygen..."
```

### `detect_understanding(user_response, expected_insight, context)`

Determines if the user has reached genuine understanding.

**Parameters:**
- `user_response` (str): The user's answer or explanation
- `expected_insight` (str): The key insight or understanding expected
- `context` (str): Source material context

**Returns:**
- `bool`: True if user demonstrates understanding, False otherwise

**Example:**
```python
understood = await engine.detect_understanding(
    user_response="Plants use sunlight to make glucose and oxygen from water and CO2",
    expected_insight="Plants convert light energy to chemical energy",
    context=source_text
)
# Returns: True
```

## Usage Patterns

### Basic Socratic Dialogue

```python
from app.services.socratic_engine import SocraticEngine

engine = SocraticEngine()

# User asks a question
user_question = "How does photosynthesis work?"

# Generate guiding question instead of direct answer
guiding_q = await engine.generate_guiding_question(
    user_question=user_question,
    context=source_context,
    difficulty=3
)

# User struggles, provide hint
hint = await engine.generate_hint(
    question=user_question,
    context=source_context,
    hint_level=2
)

# User responds, check understanding
understood = await engine.detect_understanding(
    user_response=user_answer,
    expected_insight="Plants convert light to chemical energy",
    context=source_context
)

if understood:
    print("Great! You've got it!")
else:
    # Provide another hint at higher level
    hint = await engine.generate_hint(
        question=user_question,
        context=source_context,
        hint_level=3
    )
```

### Progressive Hint System

```python
# Start with subtle hint
current_hint_level = 1

while not understood and current_hint_level <= 5:
    hint = await engine.generate_hint(
        question=question,
        context=context,
        hint_level=current_hint_level
    )
    
    # Show hint to user, get response
    user_response = get_user_response()
    
    # Check understanding
    understood = await engine.detect_understanding(
        user_response=user_response,
        expected_insight=expected_insight,
        context=context
    )
    
    if not understood:
        current_hint_level += 1
```

## Integration with TutorChain

The SocraticEngine is used by TutorChain when Socratic mode is active:

```python
# In TutorChain.explain()
if tutoring_mode == "socratic":
    # Generate guiding question instead of direct answer
    response = await socratic_engine.generate_guiding_question(
        user_question=question,
        context=retrieved_context,
        difficulty=determine_difficulty(user_profile)
    )
    
    # Track hint progression
    if user_requests_hint:
        hint = await socratic_engine.generate_hint(
            question=question,
            context=context,
            hint_level=session.hint_level
        )
        session.hint_level += 1
    
    # Detect when to switch to direct explanation
    if user_response:
        understood = await socratic_engine.detect_understanding(
            user_response=user_response,
            expected_insight=extract_key_insight(context),
            context=context
        )
        
        if understood:
            # Provide confirmation and move forward
            pass
        elif session.hint_level > 5 or user_frustrated:
            # Switch to direct explanation
            pass
```

## Design Principles

1. **Source Grounding**: All questions and hints are based on source material
2. **Progressive Disclosure**: Hints increase in directness gradually
3. **Understanding Detection**: Evaluates genuine comprehension, not just correct answers
4. **Pedagogical Soundness**: Based on Socratic method principles
5. **Supportive Tone**: Encouraging and patient, never condescending

## Requirements Satisfied

This service satisfies the following requirements from the Advanced AI Tutor spec:

- **Requirement 2.1**: Respond with guided questions in Socratic mode
- **Requirement 2.2**: Provide progressively specific hints when users struggle
- **Requirement 2.3**: Recognize when users reach understanding
- **Requirement 2.4**: Balance between guiding questions and direct explanations
- **Requirement 2.5**: Provide direct answers when explicitly requested

## Testing

Run the unit tests:

```bash
cd sourcewise-backend/python-ai
python -m pytest app/services/test_socratic_engine.py -v
```

Test coverage includes:
- Guiding question generation at different difficulty levels
- Progressive hint generation (levels 1-5)
- Understanding detection (positive, negative, partial)
- Input validation (hint level bounds)
- Prompt building for all methods

## Dependencies

- `httpx`: For async HTTP requests to Ollama LLM
- `app.config.settings`: Configuration for Ollama base URL and model
- `app.services.llm`: Shared LLM utilities

## Error Handling

- **ValueError**: Raised when `hint_level` is not between 1 and 5
- **httpx.HTTPError**: Raised when LLM service is unavailable
- All LLM errors are propagated to the caller for handling

## Performance Considerations

- Each method makes one LLM call
- Typical response time: 1-3 seconds depending on model
- Uses temperature 0.4 for balanced creativity and consistency
- Understanding detection uses temperature 0.2 for reliable evaluation

## Future Enhancements

Potential improvements:
- Cache common guiding questions for faster responses
- Track which hint levels are most effective per user
- Adapt difficulty based on user's historical performance
- Support multi-turn Socratic dialogues with conversation memory
- Generate follow-up questions based on user's partial understanding
