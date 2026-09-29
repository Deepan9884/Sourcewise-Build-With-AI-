"""
Example usage of TutorChain for intelligent tutoring.

This demonstrates how to use the TutorChain class to provide
intelligent tutoring responses with different modes and strategies.
"""
import asyncio
from app.services.tutor_chain import TutorChain, TutoringMode


async def example_direct_mode():
    """Example: Direct tutoring mode with multi-strategy explanations"""
    print("=" * 60)
    print("EXAMPLE 1: Direct Tutoring Mode")
    print("=" * 60)
    
    tutor = TutorChain()
    
    # Simulate a user asking about a concept
    response = await tutor.explain(
        question="What is machine learning?",
        source_ids=["source_123"],
        mode=TutoringMode.DIRECT,
        user_profile={"mastery_level": "novice"}
    )
    
    print(f"\nQuestion: What is machine learning?")
    print(f"\nMain Explanation ({response.strategy_used}):")
    print(response.main_explanation)
    
    print(f"\nAlternative Explanations Available: {len(response.alternative_explanations)}")
    for alt in response.alternative_explanations:
        print(f"  - {alt.strategy}: {alt.when_to_use}")
    
    print(f"\nRelated Concepts: {[c.concept for c in response.related_concepts]}")
    print(f"\nPractice Suggestions: {len(response.practice_suggestions)}")
    print(f"Confidence: {response.confidence:.2f}")


async def example_socratic_mode():
    """Example: Socratic tutoring mode with guided questioning"""
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Socratic Tutoring Mode")
    print("=" * 60)
    
    tutor = TutorChain()
    
    # Simulate Socratic dialogue
    response = await tutor.explain(
        question="How does a neural network learn?",
        source_ids=["source_123"],
        mode=TutoringMode.SOCRATIC,
        history=[]
    )
    
    print(f"\nUser Question: How does a neural network learn?")
    print(f"\nTutor's Guiding Question:")
    print(response.main_explanation)
    print(f"\nStrategy: {response.strategy_used}")


async def example_exam_prep_mode():
    """Example: Exam prep mode with practice problems"""
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Exam Prep Mode")
    print("=" * 60)
    
    tutor = TutorChain()
    
    response = await tutor.explain(
        question="Explain backpropagation algorithm",
        source_ids=["source_123"],
        mode=TutoringMode.EXAM_PREP,
        user_profile={"mastery_level": "developing"}
    )
    
    print(f"\nQuestion: Explain backpropagation algorithm")
    print(f"\nExplanation Strategy: {response.strategy_used}")
    print(f"\nPractice Problems Suggested:")
    for suggestion in response.practice_suggestions:
        print(f"  - {suggestion.concept} (Difficulty: {suggestion.difficulty}/5)")
        print(f"    Reason: {suggestion.reason}")


async def example_context_management():
    """Example: Multi-turn conversation with context management"""
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Context Management")
    print("=" * 60)
    
    tutor = TutorChain()
    session_id = "session_abc123"
    
    # First question
    print("\nTurn 1:")
    response1 = await tutor.explain(
        question="What is supervised learning?",
        source_ids=["source_123"],
        mode=TutoringMode.DIRECT,
        session_id=session_id
    )
    print(f"Q: What is supervised learning?")
    print(f"Context: {tutor.get_context(session_id)}")
    
    # Follow-up question
    print("\nTurn 2:")
    response2 = await tutor.explain(
        question="Can you give me an example?",
        source_ids=["source_123"],
        mode=TutoringMode.DIRECT,
        session_id=session_id,
        history=[
            {"role": "user", "content": "What is supervised learning?"},
            {"role": "assistant", "content": response1.main_explanation}
        ]
    )
    print(f"Q: Can you give me an example?")
    print(f"Context: {tutor.get_context(session_id)}")
    
    # Clear context
    tutor.clear_context(session_id)
    print(f"\nContext after clearing: {tutor.get_context(session_id)}")


async def example_streaming():
    """Example: Streaming responses for real-time delivery"""
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Streaming Response")
    print("=" * 60)
    
    tutor = TutorChain()
    
    print("\nStreaming response for: 'What is deep learning?'")
    print("\nEvents received:")
    
    async for event in tutor.stream_explain(
        question="What is deep learning?",
        source_ids=["source_123"],
        mode=TutoringMode.EXPLORATORY
    ):
        print(f"  - {event['type']}", end="")
        if event['type'] == 'token':
            print(f": {event['data'][:50]}..." if len(event['data']) > 50 else f": {event['data']}")
        elif event['type'] == 'citations':
            print(f": {len(event['data'])} citations")
        elif event['type'] == 'alternatives':
            print(f": {len(event['data'])} alternative explanations")
        elif event['type'] == 'related':
            print(f": {len(event['data'])} related concepts")
        elif event['type'] == 'practice':
            print(f": {len(event['data'])} practice suggestions")
        else:
            print()


async def main():
    """Run all examples"""
    print("\n" + "=" * 60)
    print("TutorChain Usage Examples")
    print("=" * 60)
    print("\nNote: These examples use mock data. In production, they would")
    print("retrieve actual content from ChromaDB vector store.")
    
    # Note: These examples will fail without actual vector store data
    # They are meant to demonstrate the API usage
    
    try:
        await example_direct_mode()
    except Exception as e:
        print(f"\nExample 1 failed (expected without real data): {type(e).__name__}")
    
    try:
        await example_socratic_mode()
    except Exception as e:
        print(f"\nExample 2 failed (expected without real data): {type(e).__name__}")
    
    try:
        await example_exam_prep_mode()
    except Exception as e:
        print(f"\nExample 3 failed (expected without real data): {type(e).__name__}")
    
    try:
        await example_context_management()
    except Exception as e:
        print(f"\nExample 4 failed (expected without real data): {type(e).__name__}")
    
    try:
        await example_streaming()
    except Exception as e:
        print(f"\nExample 5 failed (expected without real data): {type(e).__name__}")
    
    print("\n" + "=" * 60)
    print("Examples complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
