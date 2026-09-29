"""
Example usage of PracticeGenerator service.

This demonstrates how to use the PracticeGenerator to create practice problems
and evaluate answers, all grounded in source material.
"""
import asyncio
from app.services.practice_generator import PracticeGenerator, QuestionType


async def main():
    """Demonstrate PracticeGenerator usage"""
    generator = PracticeGenerator()
    
    # Sample source material
    context = """Photosynthesis is the process by which plants convert light energy into chemical energy.
It occurs in chloroplasts and requires sunlight, water, and carbon dioxide.
The process produces glucose and oxygen as outputs.
The light-dependent reactions occur in the thylakoid membranes, while the Calvin cycle occurs in the stroma."""
    
    print("=" * 80)
    print("PRACTICE GENERATOR EXAMPLE")
    print("=" * 80)
    
    # Example 1: Generate Multiple Choice Question
    print("\n1. GENERATING MULTIPLE CHOICE QUESTION")
    print("-" * 80)
    try:
        mcq = await generator.generate_mcq(
            concept="photosynthesis",
            context=context,
            source_id="bio_101",
            source_name="Biology Textbook",
            difficulty=3
        )
        print(f"Question: {mcq.question_text}")
        print(f"Options:")
        for option in mcq.options:
            print(f"  {option}")
        print(f"Correct Answer: {mcq.correct_answer}")
        print(f"Explanation: {mcq.explanation}")
        print(f"Citations: {len(mcq.citations)} source(s)")
    except Exception as e:
        print(f"Error generating MCQ: {e}")
    
    # Example 2: Generate Short Answer Question
    print("\n2. GENERATING SHORT ANSWER QUESTION")
    print("-" * 80)
    try:
        sa = await generator.generate_short_answer(
            concept="photosynthesis",
            context=context,
            source_id="bio_101",
            source_name="Biology Textbook",
            difficulty=3
        )
        print(f"Question: {sa.question_text}")
        print(f"Key Points Expected:")
        for i, point in enumerate(sa.key_points, 1):
            print(f"  {i}. {point}")
        print(f"Citations: {len(sa.citations)} source(s)")
    except Exception as e:
        print(f"Error generating short answer: {e}")
    
    # Example 3: Generate Application Problem
    print("\n3. GENERATING APPLICATION PROBLEM")
    print("-" * 80)
    try:
        app = await generator.generate_application(
            concept="photosynthesis",
            context=context,
            source_id="bio_101",
            source_name="Biology Textbook",
            difficulty=4
        )
        print(f"Scenario: {app.scenario}")
        print(f"Question: {app.question_text}")
        print(f"Key Solution Elements:")
        for i, point in enumerate(app.key_points, 1):
            print(f"  {i}. {point}")
        print(f"Citations: {len(app.citations)} source(s)")
    except Exception as e:
        print(f"Error generating application problem: {e}")
    
    # Example 4: Evaluate an Answer
    print("\n4. EVALUATING AN ANSWER")
    print("-" * 80)
    try:
        evaluation = await generator.evaluate_answer(
            question_text="What are the main inputs and outputs of photosynthesis?",
            user_answer="Photosynthesis takes in sunlight, water, and CO2, and produces glucose and oxygen.",
            correct_answer="Inputs: sunlight, water, carbon dioxide. Outputs: glucose, oxygen.",
            question_type=QuestionType.SHORT_ANSWER,
            context=context,
            concept="photosynthesis"
        )
        print(f"Correct: {evaluation.is_correct}")
        print(f"Score: {evaluation.score:.2f}")
        print(f"Feedback: {evaluation.feedback}")
        print(f"Strengths: {', '.join(evaluation.strengths)}")
        print(f"Areas for Improvement: {', '.join(evaluation.areas_for_improvement)}")
        print(f"Suggested Review: {', '.join(evaluation.suggested_review)}")
    except Exception as e:
        print(f"Error evaluating answer: {e}")
    
    print("\n" + "=" * 80)
    print("EXAMPLE COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
