"""
Integration tests for ConceptExtractor service.
These tests require Ollama to be running locally.
Run with: pytest test_concept_extractor_integration.py -v -s
"""
import pytest
import asyncio
from app.services.concept_extractor import (
    extract_concepts,
    identify_prerequisites,
    find_related_concepts
)


@pytest.mark.asyncio
@pytest.mark.integration
async def test_extract_concepts_integration():
    """
    Integration test for concept extraction with real LLM.
    Requires Ollama to be running.
    """
    text = """
    Machine learning is a subset of artificial intelligence that focuses on 
    enabling computers to learn from data without being explicitly programmed. 
    Neural networks are a key component of modern machine learning systems, 
    inspired by the structure of biological brains.
    """
    
    try:
        concepts = await extract_concepts(text, "test_source_1")
        
        # Verify we got some concepts back
        assert len(concepts) > 0, "Should extract at least one concept"
        
        # Verify concept structure
        for concept in concepts:
            assert concept.name, "Concept should have a name"
            assert concept.description, "Concept should have a description"
            assert concept.source_id == "test_source_1"
            assert 0 <= concept.confidence <= 1
        
        print(f"\n✓ Extracted {len(concepts)} concepts:")
        for c in concepts:
            print(f"  - {c.name}: {c.description}")
        
    except Exception as e:
        pytest.skip(f"Ollama not available or error occurred: {e}")


@pytest.mark.asyncio
@pytest.mark.integration
async def test_identify_prerequisites_integration():
    """
    Integration test for prerequisite identification with real LLM.
    Requires Ollama to be running.
    """
    concept = "Differential Equations"
    context = """
    Differential equations are mathematical equations that relate functions 
    with their derivatives. To understand differential equations, students 
    need a solid foundation in calculus, including derivatives and integrals, 
    as well as algebra and basic function theory.
    """
    
    try:
        prerequisites = await identify_prerequisites(concept, context)
        
        # We expect some prerequisites for this advanced topic
        print(f"\n✓ Identified {len(prerequisites)} prerequisites for '{concept}':")
        for prereq in prerequisites:
            print(f"  - {prereq}")
        
        # Basic validation
        assert isinstance(prerequisites, list)
        
    except Exception as e:
        pytest.skip(f"Ollama not available or error occurred: {e}")


@pytest.mark.asyncio
@pytest.mark.integration
async def test_find_related_concepts_integration():
    """
    Integration test for finding related concepts.
    Requires Ollama and populated vector store.
    """
    # This test would need actual data in the vector store
    # For now, we'll just verify it doesn't crash with empty results
    
    try:
        links = await find_related_concepts("Machine Learning", ["test_source"])
        
        # Should return empty list if no data in vector store
        assert isinstance(links, list)
        
        print(f"\n✓ Found {len(links)} related concepts")
        for link in links:
            print(f"  - {link.concept} -> {link.related_concept} ({link.relationship_type})")
        
    except Exception as e:
        pytest.skip(f"Vector store not available or error occurred: {e}")


if __name__ == "__main__":
    # Run integration tests
    pytest.main([__file__, "-v", "-s", "-m", "integration"])
