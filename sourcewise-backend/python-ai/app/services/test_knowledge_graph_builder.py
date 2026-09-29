"""
Unit tests for KnowledgeGraphBuilder service.
"""
import pytest
from app.services.knowledge_graph_builder import (
    ConceptGraph,
    find_learning_path,
    detect_knowledge_gaps
)
from app.services.concept_extractor import Concept, ConceptLink


class TestConceptGraph:
    """Test ConceptGraph data structure."""
    
    def test_add_concept(self):
        """Test adding concepts to graph."""
        graph = ConceptGraph()
        concept = Concept("Machine Learning", "AI technique", "source1", 0.9)
        
        graph.add_concept(concept)
        
        assert "Machine Learning" in graph.concepts
        assert graph.concepts["Machine Learning"]["description"] == "AI technique"
        assert "source1" in graph.concepts["Machine Learning"]["source_ids"]
    
    def test_add_concept_merges_sources(self):
        """Test that adding same concept from different sources merges source IDs."""
        graph = ConceptGraph()
        concept1 = Concept("Neural Networks", "Deep learning", "source1", 0.9)
        concept2 = Concept("Neural Networks", "Deep learning", "source2", 0.9)
        
        graph.add_concept(concept1)
        graph.add_concept(concept2)
        
        assert len(graph.concepts) == 1
        assert "source1" in graph.concepts["Neural Networks"]["source_ids"]
        assert "source2" in graph.concepts["Neural Networks"]["source_ids"]
    
    def test_add_relationship(self):
        """Test adding relationships between concepts."""
        graph = ConceptGraph()
        concept1 = Concept("Calculus", "Math", "source1", 0.9)
        concept2 = Concept("Machine Learning", "AI", "source1", 0.9)
        
        graph.add_concept(concept1)
        graph.add_concept(concept2)
        
        link = ConceptLink("Machine Learning", "Calculus", "prerequisite", ["source1"], 0.8)
        graph.add_relationship(link)
        
        assert len(graph.edges) == 1
        assert graph.edges[0]["from"] == "Machine Learning"
        assert graph.edges[0]["to"] == "Calculus"
        assert graph.edges[0]["type"] == "prerequisite"
        assert "Calculus" in graph.concepts["Machine Learning"]["prerequisites"]
    
    def test_to_dict(self):
        """Test converting graph to dictionary."""
        graph = ConceptGraph()
        concept = Concept("Python", "Programming language", "source1", 0.9)
        graph.add_concept(concept)
        
        result = graph.to_dict()
        
        assert "concepts" in result
        assert "edges" in result
        assert len(result["concepts"]) == 1
        assert result["concepts"][0]["name"] == "Python"


class TestFindLearningPath:
    """Test learning path finding algorithm."""
    
    def test_direct_path(self):
        """Test finding direct path between two concepts."""
        graph = ConceptGraph()
        
        # Create concepts
        concepts = [
            Concept("Python Basics", "Intro", "source1", 0.9),
            Concept("Functions", "Functions", "source1", 0.9),
            Concept("OOP", "Object-oriented", "source1", 0.9)
        ]
        for c in concepts:
            graph.add_concept(c)
        
        # Create prerequisite chain: Python Basics -> Functions -> OOP
        graph.add_relationship(ConceptLink("Functions", "Python Basics", "prerequisite", ["source1"], 0.9))
        graph.add_relationship(ConceptLink("OOP", "Functions", "prerequisite", ["source1"], 0.9))
        
        path = find_learning_path("Python Basics", "OOP", set(), graph)
        
        assert "OOP" in path
        assert len(path) >= 1
    
    def test_path_with_known_concepts(self):
        """Test that path excludes concepts user already knows."""
        graph = ConceptGraph()
        
        concepts = [
            Concept("Variables", "Data storage", "source1", 0.9),
            Concept("Functions", "Reusable code", "source1", 0.9),
            Concept("Classes", "OOP", "source1", 0.9)
        ]
        for c in concepts:
            graph.add_concept(c)
        
        graph.add_relationship(ConceptLink("Functions", "Variables", "prerequisite", ["source1"], 0.9))
        graph.add_relationship(ConceptLink("Classes", "Functions", "prerequisite", ["source1"], 0.9))
        
        # User already knows Variables and Functions
        user_knowledge = {"Variables", "Functions"}
        path = find_learning_path("Variables", "Classes", user_knowledge, graph)
        
        # Path should only contain Classes (not already known concepts)
        assert "Classes" in path
        assert "Variables" not in path
        assert "Functions" not in path
    
    def test_target_already_known(self):
        """Test that empty path is returned if target is already known."""
        graph = ConceptGraph()
        concept = Concept("Python", "Language", "source1", 0.9)
        graph.add_concept(concept)
        
        user_knowledge = {"Python"}
        path = find_learning_path("", "Python", user_knowledge, graph)
        
        assert len(path) == 0
    
    def test_no_path_returns_target(self):
        """Test that target is returned when no path exists."""
        graph = ConceptGraph()
        
        # Create isolated concepts
        graph.add_concept(Concept("Concept A", "A", "source1", 0.9))
        graph.add_concept(Concept("Concept B", "B", "source1", 0.9))
        
        path = find_learning_path("Concept A", "Concept B", set(), graph)
        
        # Should return target even if no path
        assert "Concept B" in path


class TestDetectKnowledgeGaps:
    """Test knowledge gap detection."""
    
    def test_detect_missing_prerequisites(self):
        """Test detecting missing prerequisite knowledge."""
        graph = ConceptGraph()
        
        # Create concept hierarchy
        concepts = [
            Concept("Algebra", "Basic math", "source1", 0.9),
            Concept("Calculus", "Advanced math", "source1", 0.9),
            Concept("Linear Algebra", "Matrix math", "source1", 0.9),
            Concept("Machine Learning", "AI", "source1", 0.9)
        ]
        for c in concepts:
            graph.add_concept(c)
        
        # Set up prerequisites
        graph.add_relationship(ConceptLink("Calculus", "Algebra", "prerequisite", ["source1"], 0.9))
        graph.add_relationship(ConceptLink("Machine Learning", "Calculus", "prerequisite", ["source1"], 0.9))
        graph.add_relationship(ConceptLink("Machine Learning", "Linear Algebra", "prerequisite", ["source1"], 0.9))
        
        # User wants to learn ML but only knows Algebra
        user_knowledge = {"Algebra"}
        target_concepts = {"Machine Learning"}
        
        gaps = detect_knowledge_gaps(user_knowledge, target_concepts, graph)
        
        # Should identify Calculus and Linear Algebra as gaps
        assert "Calculus" in gaps
        assert "Linear Algebra" in gaps
        assert "Algebra" not in gaps  # Already known
    
    def test_no_gaps_when_all_known(self):
        """Test that no gaps are detected when all prerequisites are known."""
        graph = ConceptGraph()
        
        concepts = [
            Concept("HTML", "Markup", "source1", 0.9),
            Concept("CSS", "Styling", "source1", 0.9),
            Concept("JavaScript", "Programming", "source1", 0.9)
        ]
        for c in concepts:
            graph.add_concept(c)
        
        graph.add_relationship(ConceptLink("JavaScript", "HTML", "prerequisite", ["source1"], 0.9))
        
        # User knows all prerequisites
        user_knowledge = {"HTML", "CSS"}
        target_concepts = {"JavaScript"}
        
        gaps = detect_knowledge_gaps(user_knowledge, target_concepts, graph)
        
        assert len(gaps) == 0
    
    def test_nested_prerequisites(self):
        """Test detecting nested prerequisite gaps."""
        graph = ConceptGraph()
        
        concepts = [
            Concept("A", "Base", "source1", 0.9),
            Concept("B", "Level 1", "source1", 0.9),
            Concept("C", "Level 2", "source1", 0.9)
        ]
        for c in concepts:
            graph.add_concept(c)
        
        # Chain: C requires B, B requires A
        graph.add_relationship(ConceptLink("B", "A", "prerequisite", ["source1"], 0.9))
        graph.add_relationship(ConceptLink("C", "B", "prerequisite", ["source1"], 0.9))
        
        # User knows nothing, wants to learn C
        user_knowledge = set()
        target_concepts = {"C"}
        
        gaps = detect_knowledge_gaps(user_knowledge, target_concepts, graph)
        
        # Should detect both A and B as gaps
        assert "A" in gaps
        assert "B" in gaps
    
    def test_multiple_targets(self):
        """Test detecting gaps for multiple target concepts."""
        graph = ConceptGraph()
        
        concepts = [
            Concept("Math", "Mathematics", "source1", 0.9),
            Concept("Physics", "Science", "source1", 0.9),
            Concept("Engineering", "Applied science", "source1", 0.9)
        ]
        for c in concepts:
            graph.add_concept(c)
        
        graph.add_relationship(ConceptLink("Physics", "Math", "prerequisite", ["source1"], 0.9))
        graph.add_relationship(ConceptLink("Engineering", "Physics", "prerequisite", ["source1"], 0.9))
        
        # User knows nothing, wants to learn both Physics and Engineering
        user_knowledge = set()
        target_concepts = {"Physics", "Engineering"}
        
        gaps = detect_knowledge_gaps(user_knowledge, target_concepts, graph)
        
        # Should detect Math (prereq for Physics) and Physics (prereq for Engineering)
        assert "Math" in gaps
        assert "Physics" in gaps
