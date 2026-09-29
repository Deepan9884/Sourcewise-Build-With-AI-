# PracticeGenerator Service

## Overview

The `PracticeGenerator` service creates practice problems and evaluates user answers, all grounded in source material. It supports multiple question types and provides detailed feedback to enhance learning.

**Validates Requirements:** 5.1, 5.2, 5.3, 5.4, 14.1, 14.2

## Features

### Question Types

1. **Multiple Choice Questions (MCQ)**
   - 4 options with one correct answer
   - Plausible distractors
   - Explanation of correct answer
   - Source citations

2. **Short Answer Questions**
   - Open-ended questions requiring 2-4 sentences
   - Key points expected in complete answers
   - Tests understanding, not just recall

3. **Application Problems**
   - Scenario-based problems
   - Requires applying concepts to realistic situations
   - Tests ability to use knowledge in context

### Answer Evaluation

- Detailed feedback on correctness
- Score from 0.0 to 1.0
- Identification of strengths
- Areas for improvement
- Related concepts to explore
- Specific review suggestions

## Usage

### Basic Example

```python
from app.services.practice_generator import PracticeGenerator, QuestionType

generator = PracticeGenerator()

# Source material context
context = """Your source material text here..."""

# Generate a multiple choice question
mcq = await generator.generate_mcq(
    concept="photosynthesis",
    context=context,
    source_id="bio_101",
    source_name="Biology Textbook",
    difficulty=3  # 1=easy, 5=hard
)

print(f"Question: {mcq.question_text}")
print(f"Options: {mcq.options}")
print(f"Correct: {mcq.correct_answer}")
```

### Generate Short Answer Question

```python
sa = await generator.generate_short_answer(
    concept="photosynthesis",
    context=context,
    source_id="bio_101",
    source_name="Biology Textbook",
    difficulty=3
)

print(f"Question: {sa.question_text}")
print(f"Key Points: {sa.key_points}")
```

### Generate Application Problem

```python
app = await generator.generate_application(
    concept="photosynthesis",
    context=context,
    source_id="bio_101",
    source_name="Biology Textbook",
    difficulty=4
)

print(f"Scenario: {app.scenario}")
print(f"Question: {app.question_text}")
print(f"Expected Elements: {app.key_points}")
```

### Evaluate User Answer

```python
evaluation = await generator.evaluate_answer(
    question_text="What are the inputs for photosynthesis?",
    user_answer="Sunlight, water, and carbon dioxide",
    correct_answer="Sunlight, water, CO2",
    question_type=QuestionType.SHORT_ANSWER,
    context=context,
    concept="photosynthesis"
)

print(f"Correct: {evaluation.is_correct}")
print(f"Score: {evaluation.score}")
print(f"Feedback: {evaluation.feedback}")
print(f"Strengths: {evaluation.strengths}")
print(f"Improvements: {evaluation.areas_for_improvement}")
```

## Difficulty Levels

| Level | Description |
|-------|-------------|
| 1 | Basic recall and recognition |
| 2 | Simple understanding and application |
| 3 | Moderate analysis and synthesis |
| 4 | Complex analysis and evaluation |
| 5 | Advanced synthesis and critical thinking |

## Data Models

### MultipleChoiceQuestion

```python
{
    "question_id": str,
    "concept": str,
    "question_text": str,
    "options": List[str],  # 4 options
    "correct_answer": str,
    "difficulty": int,  # 1-5
    "source_ids": List[str],
    "citations": List[Citation],
    "explanation": str
}
```

### ShortAnswerQuestion

```python
{
    "question_id": str,
    "concept": str,
    "question_text": str,
    "key_points": List[str],  # Expected in answer
    "difficulty": int,
    "source_ids": List[str],
    "citations": List[Citation]
}
```

### ApplicationProblem

```python
{
    "question_id": str,
    "concept": str,
    "scenario": str,
    "question_text": str,
    "key_points": List[str],  # Expected in solution
    "difficulty": int,
    "source_ids": List[str],
    "citations": List[Citation]
}
```

### EvaluationResult

```python
{
    "is_correct": bool,
    "score": float,  # 0.0 to 1.0
    "feedback": str,
    "correct_answer_explanation": str,
    "strengths": List[str],
    "areas_for_improvement": List[str],
    "related_concepts": List[str],
    "suggested_review": List[str]
}
```

## Source Grounding

All questions are grounded in source material:

- Questions must be answerable from provided context
- Citations link back to source material
- Explanations reference specific source content
- Evaluation feedback is based on source accuracy

This ensures:
- **Requirement 14.1**: All factual claims are cited
- **Requirement 14.2**: Pedagogical additions are distinguished from source content

## Testing

Run unit tests:

```bash
cd sourcewise-backend/python-ai
python -m pytest app/services/test_practice_generator.py -v
```

Run example:

```bash
cd sourcewise-backend/python-ai
python app/services/practice_generator_example.py
```

## Integration

The PracticeGenerator integrates with:

- **TutorChain**: Provides practice suggestions during tutoring
- **Node.js API**: Endpoints for practice generation and evaluation
- **Frontend**: Practice interface for students
- **LearningProfile**: Tracks practice performance and mastery

## Error Handling

The service includes robust error handling:

- JSON parsing fallbacks for malformed LLM responses
- Graceful degradation when context is empty
- Validation of difficulty levels
- Default values for missing fields

## Future Enhancements

Potential improvements:

- Visual/diagram-based questions
- Multi-step problems
- Adaptive difficulty based on performance
- Question bank caching
- Peer comparison metrics
