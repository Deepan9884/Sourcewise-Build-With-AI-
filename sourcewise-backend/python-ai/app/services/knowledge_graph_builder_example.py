"""
Example usage of KnowledgeGraphBuilder service.
Demonstrates building graphs, finding learning paths, and detecting knowledge gaps.
"""
import asyncio
from app.services.knowledge_graph_builder import (
    ConceptGraph,
    build_graph,
    find_learning_path,
    detect_knowledge_gaps
)
from app.services.concept_extractor import Concept, ConceptLink


async def example_manual_graph():
    """Example: Manually building a concept graph."""
    print("=" * 60)
    print("Example 1: Manually Building a Concept Graph")
    print("=" * 60)
    
    # Create a graph
    graph = ConceptGraph()
    
    # Add concepts
    concepts = [
        Concept("Python Basics", "Introduction to Python programming", "source1", 0.9),
        Concept("Variables", "Data storage in Python", "source1", 0.9),
        Concept("Functions", "Reusable code blocks", "source1", 0.9),
        Concept("Object-Oriented Programming", "OOP concepts in Python", "source2", 0.9),
        Concept("Classes", "Creating custom types", "source2", 0.9),
        Concept("Inheritance", "Code reuse through inheritance", "source2", 0.9),
    ]
    
    for concept in concepts:
        graph.add_concept(concept)
    
    # Add relationships
    relationships = [
        ConceptLink("Variables", "Python Basics", "prerequisite", ["source1"], 0.9),
        ConceptLink("Functions", "Variables", "prerequisite", ["source1"], 0.9),
        ConceptLink("Object-Oriented Programming", "Functions", "prerequisite", ["source1", "source2"], 0.8),
        ConceptLink("Classes", "Object-Oriented Programming", "prerequisite", ["source2"], 0.9),
        ConceptLink("Inheritance", "Classes", "prerequisite", ["source2"], 0.9),
    ]
    
    for link in relationships:
        graph.add_relationship(link)
    
    print(f"\nGraph contains {len(graph.concepts)} concepts and {len(graph.edges)} relationships")
    print("\nConcepts:")
    for name, data in graph.concepts.items():
        prereqs = ", ".join(data["prerequisites"]) if data["prerequisites"] else "None"
        print(f"  • {name}")
        print(f"    Prerequisites: {prereqs}")
    
    return graph


def example_learning_path(graph):
    """Example: Finding learning paths."""
    print("\n" + "=" * 60)
    print("Example 2: Finding Learning Paths")
    print("=" * 60)
    
    # Scenario 1: Complete beginner
    print("\nScenario 1: Complete beginner wants to learn Inheritance")
    user_knowledge = set()
    path = find_learning_path("", "Inheritance", user_knowledge, graph)
    print(f"Learning path: {' → '.join(path)}")
    
    # Scenario 2: User knows basics
    print("\nScenario 2: User knows Python Basics and Variables, wants to learn Inheritance")
    user_knowledge = {"Python Basics", "Variables"}
    path = find_learning_path("Variables", "Inheritance", user_knowledge, graph)
    print(f"Learning path: {' → '.join(path)}")
    
    # Scenario 3: User knows most prerequisites
    print("\nScenario 3: User knows everything except Classes, wants to learn Inheritance")
    user_knowledge = {"Python Basics", "Variables", "Functions", "Object-Oriented Programming"}
    path = find_learning_path("Object-Oriented Programming", "Inheritance", user_knowledge, graph)
    print(f"Learning path: {' → '.join(path)}")


def example_knowledge_gaps(graph):
    """Example: Detecting knowledge gaps."""
    print("\n" + "=" * 60)
    print("Example 3: Detecting Knowledge Gaps")
    print("=" * 60)
    
    # Scenario 1: Beginner wants to learn advanced topics
    print("\nScenario 1: Beginner wants to learn Classes and Inheritance")
    user_knowledge = {"Python Basics"}
    target_concepts = {"Classes", "Inheritance"}
    gaps = detect_knowledge_gaps(user_knowledge, target_concepts, graph)
    print(f"Knowledge gaps: {', '.join(gaps)}")
    
    # Scenario 2: Intermediate learner
    print("\nScenario 2: User knows basics, wants to learn Inheritance")
    user_knowledge = {"Python Basics", "Variables", "Functions"}
    target_concepts = {"Inheritance"}
    gaps = detect_knowledge_gaps(user_knowledge, target_concepts, graph)
    print(f"Knowledge gaps: {', '.join(gaps)}")
    
    # Scenario 3: No gaps
    print("\nScenario 3: User knows all prerequisites for Classes")
    user_knowledge = {"Python Basics", "Variables", "Functions", "Object-Oriented Programming"}
    target_concepts = {"Classes"}
    gaps = detect_knowledge_gaps(user_knowledge, target_concepts, graph)
    if gaps:
        print(f"Knowledge gaps: {', '.join(gaps)}")
    else:
        print("No knowledge gaps! User is ready to learn Classes.")


def example_graph_serialization(graph):
    """Example: Converting graph to dictionary."""
    print("\n" + "=" * 60)
    print("Example 4: Graph Serialization")
    print("=" * 60)
    
    graph_dict = graph.to_dict()
    
    print(f"\nGraph as dictionary:")
    print(f"  Concepts: {len(graph_dict['concepts'])}")
    print(f"  Edges: {len(graph_dict['edges'])}")
    
    print("\nSample concept:")
    if graph_dict['concepts']:
        sample = graph_dict['concepts'][0]
        print(f"  Name: {sample['name']}")
        print(f"  Description: {sample['description']}")
        print(f"  Sources: {sample['source_ids']}")
        print(f"  Prerequisites: {sample['prerequisites']}")
    
    print("\nSample edge:")
    if graph_dict['edges']:
        sample = graph_dict['edges'][0]
        print(f"  From: {sample['from']}")
        print(f"  To: {sample['to']}")
        print(f"  Type: {sample['type']}")
        print(f"  Strength: {sample['strength']}")


async def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("KnowledgeGraphBuilder Service Examples")
    print("=" * 60)
    
    # Build a manual graph for demonstration
    graph = await example_manual_graph()
    
    # Demonstrate learning path finding
    example_learning_path(graph)
    
    # Demonstrate knowledge gap detection
    example_knowledge_gaps(graph)
    
    # Demonstrate graph serialization
    example_graph_serialization(graph)
    
    print("\n" + "=" * 60)
    print("Examples completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
