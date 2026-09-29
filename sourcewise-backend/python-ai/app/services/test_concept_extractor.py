"""
Unit tests for ConceptExtractor service.
Tests concept extraction, prerequisite identification, and concept linking.
"""
import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.concept_extractor import (
    extract_concepts,
    identify_prerequisites,
    find_related_concepts,
    Concept,
    ConceptLink
)


class TestConceptExtraction:
    """Test concept extraction from text."""
    
    @pytest.mark.asyncio
    async def test_extract_concepts_success(self):
        """Test successful concept extraction."""
        mock_response = {
            "choices": [{
                "message": {
                    "content": '[{"name": "Machine Learning", "description": "A field of AI focused on learning from data"}, {"name": "Neural Networks", "description": "Computing systems inspired by biological neural networks"}]'
                }
            }]
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_post = AsyncMock(return_value=MagicMock(
                raise_for_status=MagicMock(),
                json=MagicMock(return_value=mock_response)
            ))
            mock_client.return_value.__aenter__.return_value.post = mock_post
            
            concepts = await extract_concepts(
                "Machine learning uses neural networks to learn patterns from data.",
                "source_123"
            )
            
            assert len(concepts) == 2
            assert concepts[0].name == "Machine Learning"
            assert concepts[0].source_id == "source_123"
            assert concepts[1].name == "Neural Networks"
    
    @pytest.mark.asyncio
    async def test_extract_concepts_with_markdown(self):
        """Test extraction when LLM returns markdown code blocks."""
        mock_response = {
            "choices": [{
                "message": {
                    "content": '```json\n[{"name": "Python", "description": "A programming language"}]\n```'
                }
            }]
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_post = AsyncMock(return_value=MagicMock(
                raise_for_status=MagicMock(),
                json=MagicMock(return_value=mock_response)
            ))
            mock_client.return_value.__aenter__.return_value.post = mock_post
            
            concepts = await extract_concepts("Python is a programming language.", "source_456")
            
            assert len(concepts) == 1
            assert concepts[0].name == "Python"
    
    @pytest.mark.asyncio
    async def test_extract_concepts_empty_text(self):
        """Test extraction with empty text."""
        mock_response = {
            "choices": [{
                "message": {
                    "content": '[]'
                }
            }]
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_post = AsyncMock(return_value=MagicMock(
                raise_for_status=MagicMock(),
                json=MagicMock(return_value=mock_response)
            ))
            mock_client.return_value.__aenter__.return_value.post = mock_post
            
            concepts = await extract_concepts("", "source_789")
            
            assert len(concepts) == 0
    
    @pytest.mark.asyncio
    async def test_extract_concepts_error_handling(self):
        """Test error handling when LLM call fails."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_post = AsyncMock(side_effect=Exception("Connection error"))
            mock_client.return_value.__aenter__.return_value.post = mock_post
            
            concepts = await extract_concepts("Some text", "source_error")
            
            assert len(concepts) == 0


class TestPrerequisiteIdentification:
    """Test prerequisite concept identification."""
    
    @pytest.mark.asyncio
    async def test_identify_prerequisites_success(self):
        """Test successful prerequisite identification."""
        mock_response = {
            "choices": [{
                "message": {
                    "content": '["Algebra", "Functions", "Calculus"]'
                }
            }]
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_post = AsyncMock(return_value=MagicMock(
                raise_for_status=MagicMock(),
                json=MagicMock(return_value=mock_response)
            ))
            mock_client.return_value.__aenter__.return_value.post = mock_post
            
            prerequisites = await identify_prerequisites(
                "Differential Equations",
                "Differential equations require understanding of calculus and algebra."
            )
            
            assert len(prerequisites) == 3
            assert "Algebra" in prerequisites
            assert "Calculus" in prerequisites
    
    @pytest.mark.asyncio
    async def test_identify_prerequisites_none(self):
        """Test when no prerequisites are found."""
        mock_response = {
            "choices": [{
                "message": {
                    "content": '[]'
                }
            }]
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_post = AsyncMock(return_value=MagicMock(
                raise_for_status=MagicMock(),
                json=MagicMock(return_value=mock_response)
            ))
            mock_client.return_value.__aenter__.return_value.post = mock_post
            
            prerequisites = await identify_prerequisites(
                "Basic Concept",
                "This is a foundational concept with no prerequisites."
            )
            
            assert len(prerequisites) == 0
    
    @pytest.mark.asyncio
    async def test_identify_prerequisites_error_handling(self):
        """Test error handling in prerequisite identification."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_post = AsyncMock(side_effect=Exception("API error"))
            mock_client.return_value.__aenter__.return_value.post = mock_post
            
            prerequisites = await identify_prerequisites("Concept", "Context")
            
            assert len(prerequisites) == 0


class TestRelatedConceptFinding:
    """Test finding related concepts across sources."""
    
    @pytest.mark.asyncio
    async def test_find_related_concepts_success(self):
        """Test successful related concept finding."""
        mock_chunks = [
            {
                "chunk_id": "chunk1",
                "text": "Machine learning algorithms learn from data",
                "source_id": "source1",
                "source_name": "ML Basics",
                "page": 1,
                "score": 0.9
            },
            {
                "chunk_id": "chunk2",
                "text": "Deep learning is a subset of machine learning",
                "source_id": "source2",
                "source_name": "DL Guide",
                "page": 5,
                "score": 0.85
            }
        ]
        
        mock_llm_response = {
            "choices": [{
                "message": {
                    "content": '[{"concept": "Machine Learning", "related_concept": "Deep Learning", "relationship_type": "extends"}]'
                }
            }]
        }
        
        with patch('app.services.concept_extractor.query_chunks', return_value=mock_chunks):
            with patch('httpx.AsyncClient') as mock_client:
                mock_post = AsyncMock(return_value=MagicMock(
                    raise_for_status=MagicMock(),
                    json=MagicMock(return_value=mock_llm_response)
                ))
                mock_client.return_value.__aenter__.return_value.post = mock_post
                
                links = await find_related_concepts("Machine Learning", ["source1", "source2"])
                
                assert len(links) == 1
                assert links[0].concept == "Machine Learning"
                assert links[0].related_concept == "Deep Learning"
                assert links[0].relationship_type == "extends"
                assert "source1" in links[0].source_ids or "source2" in links[0].source_ids
    
    @pytest.mark.asyncio
    async def test_find_related_concepts_no_chunks(self):
        """Test when no similar chunks are found."""
        with patch('app.services.concept_extractor.query_chunks', return_value=[]):
            links = await find_related_concepts("Unknown Concept", ["source1"])
            
            assert len(links) == 0
    
    @pytest.mark.asyncio
    async def test_find_related_concepts_error_handling(self):
        """Test error handling in related concept finding."""
        with patch('app.services.concept_extractor.query_chunks', side_effect=Exception("Vector store error")):
            links = await find_related_concepts("Concept", ["source1"])
            
            assert len(links) == 0


class TestDataClasses:
    """Test Concept and ConceptLink data classes."""
    
    def test_concept_to_dict(self):
        """Test Concept serialization."""
        concept = Concept(
            name="Test Concept",
            description="A test concept",
            source_id="source_123",
            confidence=0.95
        )
        
        result = concept.to_dict()
        
        assert result["name"] == "Test Concept"
        assert result["description"] == "A test concept"
        assert result["source_id"] == "source_123"
        assert result["confidence"] == 0.95
    
    def test_concept_link_to_dict(self):
        """Test ConceptLink serialization."""
        link = ConceptLink(
            concept="Concept A",
            related_concept="Concept B",
            relationship_type="prerequisite",
            source_ids=["source1", "source2"],
            strength=0.8
        )
        
        result = link.to_dict()
        
        assert result["concept"] == "Concept A"
        assert result["related_concept"] == "Concept B"
        assert result["relationship_type"] == "prerequisite"
        assert result["source_ids"] == ["source1", "source2"]
        assert result["strength"] == 0.8


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
