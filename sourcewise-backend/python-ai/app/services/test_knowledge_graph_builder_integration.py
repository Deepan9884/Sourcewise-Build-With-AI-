"""
Integration tests for KnowledgeGraphBuilder service.
Tests the async build_graph function with mocked dependencies.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.knowledge_graph_builder import build_graph
from app.services.concept_extractor import Concept, ConceptLink


@pytest.mark.asyncio
async def test_build_graph_empty_sources():
    """Test building graph with no sources returns empty graph."""
    with patch('app.services.knowledge_graph_builder._get_collection') as mock_get_col:
        mock_col = MagicMock()
        mock_col.get.return_value = {"ids": [], "documents": [], "metadatas": []}
        mock_get_col.return_value = mock_col
        
        graph = await build_graph([])
        
        assert len(graph.concepts) == 0
        assert len(graph.edges) == 0


@pytest.mark.asyncio
async def test_build_graph_with_chunks():
    """Test building graph from source chunks."""
    with patch('app.services.knowledge_graph_builder._get_collection') as mock_get_col, \
         patch('app.services.knowledge_graph_builder.extract_concepts') as mock_extract, \
         patch('app.services.knowledge_graph_builder.find_related_concepts') as mock_find_related:
        
        # Mock ChromaDB collection
        mock_col = MagicMock()
        mock_col.get.return_value = {
            "ids": ["chunk1", "chunk2"],
            "documents": [
                "Machine learning is a subset of artificial intelligence.",
                "Neural networks are used in deep learning."
            ],
            "metadatas": [
                {"source_id": "source1", "source_name": "ML Basics"},
                {"source_id": "source1", "source_name": "ML Basics"}
            ]
        }
        mock_get_col.return_value = mock_col
        
        # Mock concept extraction
        mock_extract.side_effect = [
            [Concept("Machine Learning", "AI subset", "source1", 0.9)],
            [Concept("Neural Networks", "Deep learning", "source1", 0.9)]
        ]
        
        # Mock relationship finding
        mock_find_related.return_value = [
            ConceptLink("Neural Networks", "Machine Learning", "related", ["source1"], 0.8)
        ]
        
        graph = await build_graph(["source1"])
        
        # Verify concepts were added
        assert "Machine Learning" in graph.concepts
        assert "Neural Networks" in graph.concepts
        
        # Verify extraction was called
        assert mock_extract.call_count == 2
        
        # Verify relationship finding was attempted
        assert mock_find_related.called


@pytest.mark.asyncio
async def test_build_graph_handles_extraction_errors():
    """Test that graph building continues even if some extractions fail."""
    with patch('app.services.knowledge_graph_builder._get_collection') as mock_get_col, \
         patch('app.services.knowledge_graph_builder.extract_concepts') as mock_extract, \
         patch('app.services.knowledge_graph_builder.find_related_concepts') as mock_find_related:
        
        # Mock ChromaDB collection
        mock_col = MagicMock()
        mock_col.get.return_value = {
            "ids": ["chunk1"],
            "documents": ["Python is a programming language."],
            "metadatas": [{"source_id": "source1", "source_name": "Python Guide"}]
        }
        mock_get_col.return_value = mock_col
        
        # Mock concept extraction
        mock_extract.return_value = [
            Concept("Python", "Programming language", "source1", 0.9)
        ]
        
        # Mock relationship finding to raise error
        mock_find_related.side_effect = Exception("API error")
        
        # Should not raise exception
        graph = await build_graph(["source1"])
        
        # Concept should still be added even if relationship finding fails
        assert "Python" in graph.concepts


@pytest.mark.asyncio
async def test_build_graph_limits_chunks_per_source():
    """Test that graph building limits chunks processed per source."""
    with patch('app.services.knowledge_graph_builder._get_collection') as mock_get_col, \
         patch('app.services.knowledge_graph_builder.extract_concepts') as mock_extract:
        
        # Mock ChromaDB collection with many chunks
        chunk_ids = [f"chunk{i}" for i in range(50)]
        documents = [f"Text {i}" for i in range(50)]
        metadatas = [{"source_id": "source1", "source_name": "Large Source"} for _ in range(50)]
        
        mock_col = MagicMock()
        mock_col.get.return_value = {
            "ids": chunk_ids,
            "documents": documents,
            "metadatas": metadatas
        }
        mock_get_col.return_value = mock_col
        
        # Mock concept extraction
        mock_extract.return_value = [Concept("Test", "Test concept", "source1", 0.9)]
        
        graph = await build_graph(["source1"])
        
        # Should only process 20 chunks per source (as per implementation)
        assert mock_extract.call_count == 20


@pytest.mark.asyncio
async def test_build_graph_multiple_sources():
    """Test building graph from multiple sources."""
    with patch('app.services.knowledge_graph_builder._get_collection') as mock_get_col, \
         patch('app.services.knowledge_graph_builder.extract_concepts') as mock_extract, \
         patch('app.services.knowledge_graph_builder.find_related_concepts') as mock_find_related:
        
        # Mock ChromaDB collection to return different chunks for different sources
        def get_side_effect(where):
            source_id = where["source_id"]
            if source_id == "source1":
                return {
                    "ids": ["chunk1"],
                    "documents": ["Python programming"],
                    "metadatas": [{"source_id": "source1", "source_name": "Python"}]
                }
            elif source_id == "source2":
                return {
                    "ids": ["chunk2"],
                    "documents": ["JavaScript programming"],
                    "metadatas": [{"source_id": "source2", "source_name": "JavaScript"}]
                }
            return {"ids": [], "documents": [], "metadatas": []}
        
        mock_col = MagicMock()
        mock_col.get.side_effect = get_side_effect
        mock_get_col.return_value = mock_col
        
        # Mock concept extraction
        mock_extract.side_effect = [
            [Concept("Python", "Language", "source1", 0.9)],
            [Concept("JavaScript", "Language", "source2", 0.9)]
        ]
        
        # Mock relationship finding
        mock_find_related.return_value = []
        
        graph = await build_graph(["source1", "source2"])
        
        # Should have concepts from both sources
        assert "Python" in graph.concepts
        assert "JavaScript" in graph.concepts
        assert graph.concepts["Python"]["source_ids"] == ["source1"]
        assert graph.concepts["JavaScript"]["source_ids"] == ["source2"]


@pytest.mark.asyncio
async def test_build_graph_merges_duplicate_concepts():
    """Test that duplicate concepts from different sources are merged."""
    with patch('app.services.knowledge_graph_builder._get_collection') as mock_get_col, \
         patch('app.services.knowledge_graph_builder.extract_concepts') as mock_extract, \
         patch('app.services.knowledge_graph_builder.find_related_concepts') as mock_find_related:
        
        # Mock ChromaDB collection to return chunks per source
        def get_side_effect(where):
            source_id = where["source_id"]
            if source_id == "source1":
                return {
                    "ids": ["chunk1"],
                    "documents": ["Machine learning intro"],
                    "metadatas": [{"source_id": "source1", "source_name": "ML Basics"}]
                }
            elif source_id == "source2":
                return {
                    "ids": ["chunk2"],
                    "documents": ["Machine learning advanced"],
                    "metadatas": [{"source_id": "source2", "source_name": "ML Advanced"}]
                }
            return {"ids": [], "documents": [], "metadatas": []}
        
        mock_col = MagicMock()
        mock_col.get.side_effect = get_side_effect
        mock_get_col.return_value = mock_col
        
        # Mock concept extraction - same concept from different sources
        mock_extract.side_effect = [
            [Concept("Machine Learning", "AI technique", "source1", 0.9)],
            [Concept("Machine Learning", "AI technique", "source2", 0.9)]
        ]
        
        mock_find_related.return_value = []
        
        graph = await build_graph(["source1", "source2"])
        
        # Should have only one concept with both source IDs
        assert len(graph.concepts) == 1
        assert "Machine Learning" in graph.concepts
        assert "source1" in graph.concepts["Machine Learning"]["source_ids"]
        assert "source2" in graph.concepts["Machine Learning"]["source_ids"]
