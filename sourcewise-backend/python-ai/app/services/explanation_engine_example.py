"""
Example usage of ExplanationEngine service.

This script demonstrates how to use the ExplanationEngine to generate
different types of explanations for educational concepts.
"""
import asyncio
from app.services.explanation_engine import ExplanationEngine, MasteryLevel


async def main():
    """Demonstrate ExplanationEngine usage"""
    
    # Initialize the engine
    engine = ExplanationEngine()
    
    # Sample context from a source document
    context = """
    Photosynthesis is the process by which plants, algae, and some bacteria 
    convert light energy (usually from the sun) into chemical energy stored 
    in glucose molecules. This process occurs primarily in the chloroplasts 
    of plant cells.
    
    The process requires three main inputs:
    1. Light energy (from the sun)
    2. Water (H2O) absorbed through roots
    3. Carbon dioxide (CO2) from the air
    
    The outputs of photosynthesis are:
    1. Glucose (C6H12O6) - used for energy and growth
    2. Oxygen (O2) - released into the atmosphere
    
    The overall chemical equation is:
    6CO2 + 6H2O + light energy → C6H12O6 + 6O2
    """
    
    concept = "photosynthesis"
    
    print("=" * 80)
    print("ExplanationEngine Demo")
    print("=" * 80)
    print()
    
    # Example 1: Generate analogy for novice level
    print("1. ANALOGY-BASED EXPLANATION (Novice Level)")
    print("-" * 80)
    try:
        analogy = await engine.generate_analogy(
            concept=concept,
            context=context,
            user_level=MasteryLevel.NOVICE
        )
        print(analogy)
    except Exception as e:
        print(f"Note: This example requires Ollama to be running.")
        print(f"Error: {e}")
    print()
    
    # Example 2: Generate example for developing level
    print("2. EXAMPLE-BASED EXPLANATION (Developing Level)")
    print("-" * 80)
    try:
        example = await engine.generate_example(
            concept=concept,
            context=context,
            user_level=MasteryLevel.DEVELOPING
        )
        print(example)
    except Exception as e:
        print(f"Note: This example requires Ollama to be running.")
        print(f"Error: {e}")
    print()
    
    # Example 3: Generate stepwise for proficient level
    print("3. STEP-BY-STEP EXPLANATION (Proficient Level)")
    print("-" * 80)
    try:
        stepwise = await engine.generate_stepwise(
            concept=concept,
            context=context,
            user_level=MasteryLevel.PROFICIENT
        )
        print(stepwise)
    except Exception as e:
        print(f"Note: This example requires Ollama to be running.")
        print(f"Error: {e}")
    print()
    
    # Example 4: Adapt complexity
    print("4. COMPLEXITY ADAPTATION")
    print("-" * 80)
    original_explanation = """
    Photosynthesis involves two main stages: the light-dependent reactions 
    occurring in the thylakoid membranes, and the light-independent reactions 
    (Calvin cycle) in the stroma. The light-dependent reactions use photosystems 
    I and II to generate ATP and NADPH, which are then used in the Calvin cycle 
    to fix carbon dioxide into glucose.
    """
    
    print("Original (Technical):")
    print(original_explanation)
    print()
    
    try:
        adapted = await engine.adapt_complexity(
            explanation=original_explanation,
            user_level=MasteryLevel.NOVICE,
            concept=concept
        )
        print("Adapted for Novice:")
        print(adapted)
    except Exception as e:
        print(f"Note: This example requires Ollama to be running.")
        print(f"Error: {e}")
    print()
    
    # Example 5: Demonstrate complexity guidance
    print("5. COMPLEXITY GUIDANCE FOR EACH LEVEL")
    print("-" * 80)
    for level in MasteryLevel:
        guidance = engine._get_complexity_guidance(level)
        print(f"{level.value.upper()}: {guidance}")
    print()
    
    print("=" * 80)
    print("Demo Complete!")
    print("=" * 80)


if __name__ == "__main__":
    print("\nExplanationEngine Example")
    print("This example demonstrates the different explanation strategies.")
    print("\nNote: Requires Ollama to be running with a model loaded.")
    print("Start Ollama: ollama serve")
    print("Pull a model: ollama pull llama3.2:3b")
    print()
    
    asyncio.run(main())
