# KnowledgeGraphBuilder Service

## Overview

The KnowledgeGraphBuilder service constructs concept graphs from source documents and provides graph traversal algorithms for learning path optimization and knowledge gap detection. It integrates with the ConceptExtractor service to identify concepts and their relationships across multiple sources.

## Core Components

### ConceptGraph

A data structure representing a knowledge graph with concepts as nodes and relationships as edges.

**Structure:**
- `concepts`: Dictionary mapping concept names to concept data (description, source_ids, prerequisites, related concepts)
- `edges`: List of relationship edges between concepts

**Methods:**
- `add_concept(concept)`: Add a concept to the graph (merges source IDs if concept already exists)
- `add_relationship(link)`: Add a relationship edge between two concepts
- `to_dict()`: Convert graph to dictionary format for serialization

### build_graph(source_ids)

Constructs a concept graph from all provided source documents.

**Parameters:**
- `source_ids`: List of source document IDs to analyze

**Returns:**
- `ConceptGraph` object with concepts and relationships

**Process:**
1. Retrieves all chunks from specified sources via ChromaDB
2. Samples up to 20 chunks per source for efficiency
3. Extracts concepts from each chunk using ConceptExtractor
4. Identifies relationships between concepts
5. Builds graph structure with nodes and edges

**Example:**
```python
from app.services.knowledge_graph_builder import build_graph

# Build graph from multiple sources
graph = await build_graph(["source1", "source2", "source3"])

# Access concepts
for concept_name, concept_data in graph.concepts.items():
    print(f"{concept_name}: {concept_data['description']}")
    print(f"  Sources: {concept_data['source_ids']}")
    print(f"  Prerequisites: {concept_data['prerequisites']}")

# Access relationships
for edge in graph.edges:
    print(f"{edge['from']} --[{edge['type']}]--> {edge['to']}")
```

### find_learning_path(start_concept, target_concept, user_knowledge, graph)

Finds the optimal learning path from a start concept to a target concept using breadth-first search (BFS).

**Parameters:**
- `start_concept`: Starting concept (can be empty string to start from any known concept)
- `target_concept`: Target concept to reach
- `user_knowledge`: Set of concepts the user already knows
- `graph`: The ConceptGraph to traverse

**Returns:**
- List of concept names representing the learning path (excludes already-known concepts)

**Algorithm:**
- Uses BFS to find shortest path
- Follows prerequisite relationships in reverse (from prerequisite to dependent)
- Also follows "related" and "extends" relationships
- Filters out concepts user already knows
- Returns direct target if no path exists

**Example:**
```python
from app.services.knowledge_graph_builder import find_learning_path

# User knows Python basics, wants to learn Machine Learning
user_knowledge = {"Python Basics", "Variables", "Functions"}
path = find_learning_path(
    start_concept="Python Basics",
    target_concept="Machine Learning",
    user_knowledge=user_knowledge,
    graph=graph
)

# Result might be: ["Linear Algebra", "Calculus", "Statistics", "Machine Learning"]
print("Learning path:", " -> ".join(path))
```

### detect_knowledge_gaps(user_knowledge, target_concepts, graph)

Identifies missing prerequisite knowledge needed to understand target concepts.

**Parameters:**
- `user_knowledge`: Set of concepts the user already knows
- `target_concepts`: Set of concepts the user wants to learn
- `graph`: The ConceptGraph

**Returns:**
- List of concept names representing knowledge gaps (missing prerequisites)

**Process:**
1. For each target concept, retrieves all prerequisites
2. Checks which prerequisites are missing from user knowledge
3. Recursively checks prerequisites of prerequisites
4. Returns deduplicated list of all missing concepts

**Example:**
```python
from app.services.knowledge_graph_builder import detect_knowledge_gaps

# User wants to learn ML but only knows basic programming
user_knowledge = {"Python Basics", "Variables"}
target_concepts = {"Machine Learning", "Deep Learning"}

gaps = detect_knowledge_gaps(user_knowledge, target_concepts, graph)

# Result might be: ["Linear Algebra", "Calculus", "Statistics", "Neural Networks"]
print("Knowledge gaps to address:")
for gap in gaps:
    print(f"  - {gap}")
```

## Integration with ConceptExtractor

The KnowledgeGraphBuilder relies on the ConceptExtractor service for:
- `extract_concepts()`: Identifying key concepts from text chunks
- `find_related_concepts()`: Discovering relationships between concepts across sources

## Performance Considerations

### Chunk Sampling
- Processes up to 20 chunks per source to balance thoroughness with performance
- For large documents, this provides representative concept coverage without excessive processing

### Relationship Limiting
- Limits relationship finding to first 30 concepts to avoid excessive API calls
- Focuses on most important concepts for graph structure

### Caching Recommendations
- Graph building is computationally expensive
- Results should be cached in MongoDB (ConceptGraph model)
- Rebuild only when sources are added/updated

## Use Cases

### 1. Personalized Learning Paths
Generate optimal study sequences based on user's current knowledge and learning goals.

### 2. Knowledge Gap Analysis
Identify missing prerequisites preventing understanding of advanced topics.

### 3. Curriculum Planning
Organize course content based on concept dependencies.

### 4. Prerequisite Recommendations
Suggest foundational topics when user shows confusion on advanced concepts.

### 5. Cross-Source Synthesis
Connect related concepts across multiple documents for comprehensive understanding.

## Requirements Mapping

This service implements the following requirements from the Advanced AI Tutor spec:

- **Requirement 4.2**: Build Concept_Graph linking related topics across all uploaded sources
- **Requirement 4.3**: Identify and suggest prerequisite topics if user shows confusion
- **Requirement 4.4**: Recommend optimal study sequences based on concept dependencies
- **Requirement 6.4**: Build and maintain Concept_Graph showing how topics connect across sources

## Testing

The service includes comprehensive test coverage:

### Unit Tests (`test_knowledge_graph_builder.py`)
- ConceptGraph data structure operations
- Learning path finding with various scenarios
- Knowledge gap detection with nested prerequisites
- Edge cases (empty graphs, no paths, already-known concepts)

### Integration Tests (`test_knowledge_graph_builder_integration.py`)
- Async graph building with mocked dependencies
- Multi-source graph construction
- Error handling during extraction
- Chunk sampling and limiting
- Duplicate concept merging

Run tests:
```bash
pytest app/services/test_knowledge_graph_builder.py -v
pytest app/services/test_knowledge_graph_builder_integration.py -v
```

## Future Enhancements

1. **Weighted Paths**: Consider concept difficulty and user mastery levels in path finding
2. **Multiple Paths**: Return alternative learning paths for user choice
3. **Cycle Detection**: Identify and handle circular dependencies in concept graphs
4. **Graph Visualization**: Export graph data for D3.js or similar visualization libraries
5. **Incremental Updates**: Efficiently update graph when new sources are added
6. **Concept Clustering**: Group related concepts into learning modules
