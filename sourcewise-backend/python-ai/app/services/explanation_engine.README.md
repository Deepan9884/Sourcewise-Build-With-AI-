# ExplanationEngine Service

## Overview

The `ExplanationEngine` service provides multi-strategy explanation generation for the Advanced AI Tutor system. It generates explanations using different pedagogical approaches (analogy, example, step-by-step) and adapts complexity based on user mastery level.

## Features

- **Multiple Explanation Strategies**: Generate explanations using analogies, concrete examples, or step-by-step breakdowns
- **Adaptive Complexity**: Automatically adjust explanation complexity based on user's mastery level (novice, developing, proficient, mastery)
- **Source Grounding**: All explanations are grounded in provided source material
- **Pedagogical Soundness**: Uses established teaching strategies and prompt engineering

## Usage

### Basic Usage

```python
from app.services.explanation_engine import ExplanationEngine, MasteryLevel

engine = ExplanationEngine()

# Generate analogy-based explanation
analogy = await engine.generate_analogy(
    concept="photosynthesis",
    context="Photosynthesis is the process by which plants convert light energy...",
    user_level=MasteryLevel.NOVICE
)

# Generate example-based explanation
example = await engine.generate_example(
    concept="photosynthesis",
    context="Photosynthesis is the process by which plants convert light energy...",
    user_level=MasteryLevel.DEVELOPING
)

# Generate step-by-step explanation
stepwise = await engine.generate_stepwise(
    concept="photosynthesis",
    context="Photosynthesis is the process by which plants convert light energy...",
    user_level=MasteryLevel.PROFICIENT
)

# Adapt existing explanation to different complexity level
adapted = await engine.adapt_complexity(
    explanation="Original technical explanation...",
    user_level=MasteryLevel.NOVICE,
    concept="photosynthesis"
)
```

## Methods

### `generate_analogy(concept, context, user_level)`

Generates an analogy-based explanation that relates the concept to familiar experiences.

**Parameters:**
- `concept` (str): The concept to explain
- `context` (str): Source material context
- `user_level` (MasteryLevel): User's mastery level (default: NOVICE)

**Returns:** String containing the analogy-based explanation

**Example:**
```python
explanation = await engine.generate_analogy(
    concept="neural networks",
    context="Neural networks are computational models inspired by biological neurons...",
    user_level=MasteryLevel.NOVICE
)
```

### `generate_example(concept, context, user_level)`

Generates concrete examples that illustrate the concept in action.

**Parameters:**
- `concept` (str): The concept to explain
- `context` (str): Source material context
- `user_level` (MasteryLevel): User's mastery level (default: NOVICE)

**Returns:** String containing example-based explanation

**Example:**
```python
explanation = await engine.generate_example(
    concept="recursion",
    context="Recursion is when a function calls itself...",
    user_level=MasteryLevel.DEVELOPING
)
```

### `generate_stepwise(concept, context, user_level)`

Generates a step-by-step breakdown that builds understanding progressively.

**Parameters:**
- `concept` (str): The concept to explain
- `context` (str): Source material context
- `user_level` (MasteryLevel): User's mastery level (default: NOVICE)

**Returns:** String containing step-by-step explanation

**Example:**
```python
explanation = await engine.generate_stepwise(
    concept="binary search",
    context="Binary search is an efficient algorithm for finding an item...",
    user_level=MasteryLevel.PROFICIENT
)
```

### `adapt_complexity(explanation, user_level, concept)`

Adapts an existing explanation to match the user's mastery level.

**Parameters:**
- `explanation` (str): Original explanation to adapt
- `user_level` (MasteryLevel): Target mastery level
- `concept` (str): The concept being explained

**Returns:** String containing adapted explanation

**Example:**
```python
adapted = await engine.adapt_complexity(
    explanation="Photosynthesis involves light-dependent and light-independent reactions...",
    user_level=MasteryLevel.NOVICE,
    concept="photosynthesis"
)
```

## Mastery Levels

The `MasteryLevel` enum defines four levels of user understanding:

- **NOVICE**: Complete beginner with no prior knowledge. Explanations use simple language and avoid jargon.
- **DEVELOPING**: Basic understanding, building knowledge. Explanations introduce technical terms with clear definitions.
- **PROFICIENT**: Solid understanding, can handle technical language. Explanations use appropriate terminology and moderate depth.
- **MASTERY**: Advanced learner ready for deep insights. Explanations provide advanced connections and edge cases.

## Prompt Engineering

The ExplanationEngine uses specialized prompts for each strategy:

### Analogy Prompts
- Relate to everyday experiences
- Highlight key aspects of the concept
- Make abstract concepts concrete and relatable

### Example Prompts
- Draw examples from source material
- Illustrate concept in action
- Show typical cases and edge cases

### Stepwise Prompts
- Break down into logical, sequential parts
- Build understanding progressively
- Use numbered steps with clear transitions

### Complexity Adaptation
- Adjust vocabulary complexity
- Modify amount of detail and depth
- Change assumptions about prior knowledge
- Adapt pace of information delivery

## Integration with LLM Service

The ExplanationEngine uses the existing Ollama LLM service with:
- Custom system prompts for educational context
- Temperature of 0.4 for creative but consistent explanations
- Timeout of 120 seconds for complex explanations
- Source context injection for grounding

## Testing

Run the unit tests:

```bash
cd sourcewise-backend/python-ai
python -m pytest app/services/test_explanation_engine.py -v
```

The test suite covers:
- All explanation strategies (analogy, example, stepwise)
- Complexity adaptation for all mastery levels
- Prompt building and structure
- Edge cases (empty context, long concept names)
- Mock LLM integration

## Requirements Mapping

This service implements the following requirements from the Advanced AI Tutor spec:

- **Requirement 1.1**: Multiple explanation strategies (analogies, examples, step-by-step)
- **Requirement 1.2**: Synthesis from multiple sources
- **Requirement 1.3**: Alternative explanation approaches
- **Requirement 1.4**: Adaptive complexity based on understanding level

## Future Enhancements

Potential improvements:
- Visual explanation generation (diagrams, charts)
- Multi-modal explanations (text + images)
- Explanation quality scoring
- User feedback integration for strategy selection
- Caching of frequently requested explanations
- Support for multiple languages
