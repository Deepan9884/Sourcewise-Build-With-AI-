"""
Example usage of SocraticEngine service.

This demonstrates how to use the Socratic teaching methods in practice.
"""
import asyncio
from app.services.socratic_engine import SocraticEngine


# Sample source context about photosynthesis
SAMPLE_CONTEXT = """
Photosynthesis is the process by which green plants and some other organisms 
use sunlight to synthesize nutrients from carbon dioxide and water. 
Photosynthesis in plants generally involves the green pigment chlorophyll 
and generates oxygen as a by-product.

The process can be summarized by the equation:
6CO2 + 6H2O + light energy → C6H12O6 + 6O2

This means that carbon dioxide and water, in the presence of light energy, 
are converted into glucose (a sugar) and oxygen. The glucose is used by the 
plant for energy and growth, while the oxygen is released into the atmosphere.

Photosynthesis occurs in two main stages:
1. Light-dependent reactions: These occur in the thylakoid membranes and 
   require light to produce ATP and NADPH.
2. Light-independent reactions (Calvin cycle): These occur in the stroma 
   and use ATP and NADPH to convert CO2 into glucose.
"""


async def example_basic_socratic_dialogue():
    """Example: Basic Socratic dialogue flow"""
    print("=" * 70)
    print("EXAMPLE 1: Basic Socratic Dialogue")
    print("=" * 70)
    
    engine = SocraticEngine()
    
    # User asks a question
    user_question = "What is photosynthesis?"
    print(f"\nUser Question: {user_question}")
    
    # Generate guiding question (moderate difficulty)
    guiding_question = await engine.generate_guiding_question(
        user_question=user_question,
        context=SAMPLE_CONTEXT,
        difficulty=3
    )
    print(f"\nAI Guiding Question: {guiding_question}")
    
    # Simulate user's initial response (incomplete)
    user_response = "It's how plants make food using sunlight"
    print(f"\nUser Response: {user_response}")
    
    # Check understanding
    expected_insight = "Plants convert light energy into chemical energy (glucose) using CO2 and water, producing oxygen"
    understood = await engine.detect_understanding(
        user_response=user_response,
        expected_insight=expected_insight,
        context=SAMPLE_CONTEXT
    )
    print(f"\nUnderstanding Detected: {understood}")
    
    if not understood:
        print("\nUser needs more guidance...")


async def example_progressive_hints():
    """Example: Progressive hint system"""
    print("\n" + "=" * 70)
    print("EXAMPLE 2: Progressive Hints (Level 1 to 5)")
    print("=" * 70)
    
    engine = SocraticEngine()
    
    question = "What are the products of photosynthesis?"
    print(f"\nQuestion: {question}\n")
    
    # Generate hints at all levels
    for level in range(1, 6):
        hint = await engine.generate_hint(
            question=question,
            context=SAMPLE_CONTEXT,
            hint_level=level
        )
        print(f"Hint Level {level}: {hint}\n")


async def example_difficulty_levels():
    """Example: Different difficulty levels for guiding questions"""
    print("\n" + "=" * 70)
    print("EXAMPLE 3: Guiding Questions at Different Difficulty Levels")
    print("=" * 70)
    
    engine = SocraticEngine()
    
    user_question = "How does photosynthesis work?"
    
    difficulty_labels = {
        1: "Very Easy",
        2: "Easy",
        3: "Moderate",
        4: "Challenging",
        5: "Very Challenging"
    }
    
    for difficulty in [1, 3, 5]:
        print(f"\n{difficulty_labels[difficulty]} (Level {difficulty}):")
        question = await engine.generate_guiding_question(
            user_question=user_question,
            context=SAMPLE_CONTEXT,
            difficulty=difficulty
        )
        print(f"  {question}")


async def example_understanding_detection():
    """Example: Understanding detection with different responses"""
    print("\n" + "=" * 70)
    print("EXAMPLE 4: Understanding Detection")
    print("=" * 70)
    
    engine = SocraticEngine()
    
    expected_insight = "Photosynthesis converts light energy to chemical energy, producing glucose and oxygen from CO2 and water"
    
    # Test different user responses
    test_responses = [
        ("Plants use sunlight to make glucose and oxygen from CO2 and water", "Complete understanding"),
        ("Plants make oxygen using sunlight", "Partial understanding"),
        ("Plants absorb sunlight somehow", "Minimal understanding"),
        ("Photosynthesis is the light-dependent and light-independent reactions that convert carbon dioxide and water into glucose using light energy", "Advanced understanding")
    ]
    
    for response, label in test_responses:
        print(f"\n{label}:")
        print(f"  User: '{response}'")
        
        understood = await engine.detect_understanding(
            user_response=response,
            expected_insight=expected_insight,
            context=SAMPLE_CONTEXT
        )
        print(f"  Understood: {understood}")


async def example_full_socratic_session():
    """Example: Complete Socratic teaching session"""
    print("\n" + "=" * 70)
    print("EXAMPLE 5: Full Socratic Teaching Session")
    print("=" * 70)
    
    engine = SocraticEngine()
    
    # Session setup
    user_question = "What happens during photosynthesis?"
    expected_insight = "Light energy is converted to chemical energy, producing glucose and oxygen"
    current_hint_level = 1
    max_hints = 5
    
    print(f"\nUser Question: {user_question}")
    
    # Step 1: Start with guiding question
    guiding_q = await engine.generate_guiding_question(
        user_question=user_question,
        context=SAMPLE_CONTEXT,
        difficulty=2
    )
    print(f"\nAI: {guiding_q}")
    
    # Simulate user struggling through hints
    simulated_responses = [
        "Plants need sunlight",
        "They use sunlight and water",
        "They make food from sunlight, water, and CO2",
        "They convert light energy into glucose and release oxygen"
    ]
    
    for i, user_response in enumerate(simulated_responses):
        print(f"\nUser: {user_response}")
        
        # Check understanding
        understood = await engine.detect_understanding(
            user_response=user_response,
            expected_insight=expected_insight,
            context=SAMPLE_CONTEXT
        )
        
        if understood:
            print("\nAI: Excellent! You've grasped the key concept. Photosynthesis is indeed about converting light energy into chemical energy stored in glucose, while producing oxygen as a byproduct.")
            break
        else:
            # Provide next hint if available
            if current_hint_level <= max_hints:
                hint = await engine.generate_hint(
                    question=user_question,
                    context=SAMPLE_CONTEXT,
                    hint_level=current_hint_level
                )
                print(f"\nAI (Hint {current_hint_level}): {hint}")
                current_hint_level += 1
            else:
                print("\nAI: Let me explain directly...")
                break


async def example_error_handling():
    """Example: Error handling for invalid inputs"""
    print("\n" + "=" * 70)
    print("EXAMPLE 6: Error Handling")
    print("=" * 70)
    
    engine = SocraticEngine()
    
    # Test invalid hint level
    print("\nTesting invalid hint level (0):")
    try:
        await engine.generate_hint(
            question="What is photosynthesis?",
            context=SAMPLE_CONTEXT,
            hint_level=0
        )
    except ValueError as e:
        print(f"  ✓ Caught expected error: {e}")
    
    print("\nTesting invalid hint level (6):")
    try:
        await engine.generate_hint(
            question="What is photosynthesis?",
            context=SAMPLE_CONTEXT,
            hint_level=6
        )
    except ValueError as e:
        print(f"  ✓ Caught expected error: {e}")


async def main():
    """Run all examples"""
    print("\n" + "=" * 70)
    print("SOCRATIC ENGINE EXAMPLES")
    print("=" * 70)
    print("\nThese examples demonstrate the Socratic teaching capabilities.")
    print("Note: Actual LLM responses will vary based on the model and context.")
    print("\n" + "=" * 70)
    
    # Run examples
    await example_basic_socratic_dialogue()
    await example_progressive_hints()
    await example_difficulty_levels()
    await example_understanding_detection()
    await example_full_socratic_session()
    await example_error_handling()
    
    print("\n" + "=" * 70)
    print("EXAMPLES COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    # Note: This requires Ollama to be running locally
    # Start Ollama: ollama serve
    # Pull model: ollama pull llama3.2:3b
    
    print("\nIMPORTANT: Make sure Ollama is running before executing these examples.")
    print("Start Ollama with: ollama serve")
    print("Pull model with: ollama pull llama3.2:3b\n")
    
    asyncio.run(main())
