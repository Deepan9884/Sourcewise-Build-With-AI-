"""
Example usage of ConceptExtractor service.
Demonstrates concept extraction, prerequisite identification, and concept linking.

Run with: python -m app.services.concept_extractor_example
"""
import asyncio
from app.services.concept_extractor import (
    extract_concepts,
    identify_prerequisites,
    find_related_concepts
)


async def example_extract_concepts():
    """Example: Extract concepts from text."""
    print("\n" + "="*60)
    print("EXAMPLE 1: Extract Concepts from Text")
    print("="*60)
    
    text = """
    Machine learning is a subset of artificial intelligence that enables 
    computers to learn from data without explicit programming. Deep learning, 
    a specialized form of machine learning, uses neural networks with multiple 
    layers to process complex patterns. These neural networks are inspired by 
    the structure and function of biological brains.
    """
    
    print(f"\nInput text:\n{text.strip()}\n")
    
    try:
        concepts = await extract_concepts(text, "example_source_1")
        
        print(f"✓ Extracted {len(concepts)} concepts:\n")
        for i, concept in enumerate(concepts, 1):
            print(f"{i}. {concept.name}")
            print(f"   Description: {concept.description}")
            print(f"   Source: {concept.source_id}")
            print(f"   Confidence: {concept.confidence:.2f}\n")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        print("  Make sure Ollama is running: ollama serve")


async def example_identify_prerequisites():
    """Example: Identify prerequisites for a concept."""
    print("\n" + "="*60)
    print("EXAMPLE 2: Identify Prerequisites")
    print("="*60)
    
    concept = "Convolutional Neural Networks"
    context = """
    Convolutional Neural Networks (CNNs) are a specialized type of neural 
    network designed for processing grid-like data such as images. To understand 
    CNNs, students should first be familiar with basic neural networks, 
    including concepts like activation functions, backpropagation, and gradient 
    descent. Additionally, knowledge of linear algebra (matrices and convolution 
    operations) and basic calculus is essential.
    """
    
    print(f"\nConcept: {concept}")
    print(f"\nContext:\n{context.strip()}\n")
    
    try:
        prerequisites = await identify_prerequisites(concept, context)
        
        print(f"✓ Identified {len(prerequisites)} prerequisites:\n")
        for i, prereq in enumerate(prerequisites, 1):
            print(f"{i}. {prereq}")
        
        if not prerequisites:
            print("  (No prerequisites identified)")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        print("  Make sure Ollama is running: ollama serve")


async def example_find_related_concepts():
    """Example: Find related concepts across sources."""
    print("\n" + "="*60)
    print("EXAMPLE 3: Find Related Concepts")
    print("="*60)
    
    concept = "Machine Learning"
    source_ids = ["example_source_1", "example_source_2"]
    
    print(f"\nConcept: {concept}")
    print(f"Searching across sources: {', '.join(source_ids)}\n")
    
    try:
        links = await find_related_concepts(concept, source_ids)
        
        if links:
            print(f"✓ Found {len(links)} related concepts:\n")
            for i, link in enumerate(links, 1):
                print(f"{i}. {link.concept} -> {link.related_concept}")
                print(f"   Relationship: {link.relationship_type}")
                print(f"   Sources: {', '.join(link.source_ids)}")
                print(f"   Strength: {link.strength:.2f}\n")
        else:
            print("  (No related concepts found)")
            print("  Note: This requires data in the vector store")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        print("  Make sure Ollama is running and vector store has data")


async def main():
    """Run all examples."""
    print("\n" + "="*60)
    print("ConceptExtractor Service Examples")
    print("="*60)
    print("\nThis script demonstrates the ConceptExtractor service capabilities.")
    print("Requirements:")
    print("  - Ollama running locally (ollama serve)")
    print("  - Model downloaded (ollama pull llama3.2:3b)")
    
    # Run examples
    await example_extract_concepts()
    await example_identify_prerequisites()
    await example_find_related_concepts()
    
    print("\n" + "="*60)
    print("Examples completed!")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
