# KnowledgeGraphBuilder Requirements Mapping

## Task 2.2 Implementation Summary

This document maps the KnowledgeGraphBuilder service implementation to the requirements specified in the Advanced AI Tutor specification.

## Implemented Functions

### 1. build_graph(source_ids) → ConceptGraph

**Purpose:** Construct concept graph from all sources

**Implementation:**
- Retrieves chunks from ChromaDB for specified sources
- Samples up to 20 chunks per source for efficiency
- Extracts concepts using ConceptExtractor.extract_concepts()
- Identifies relationships using ConceptExtractor.find_related_concepts()
- Builds graph structure with concepts as nodes and relationships as edges
- Merges duplicate concepts from different sources

**Requirements Addressed:**
- ✅ **Requirement 4.2**: "THE AI_Tutor SHALL build a Concept_Graph linking related topics across all uploaded sources"
- ✅ **Requirement 6.4**: "THE AI_Tutor SHALL build and maintain a Concept_Graph showing how topics connect across sources"

### 2. find_learning_path(start_concept, target_concept, user_knowledge, graph) → List[str]

**Purpose:** Find optimal learning path using graph traversal algorithms

**Implementation:**
- Uses breadth-first search (BFS) to find shortest path
- Follows prerequisite relationships in reverse direction
- Also follows "related" and "extends" relationships
- Filters out concepts user already knows
- Returns ordered list of concepts to study

**Requirements Addressed:**
- ✅ **Requirement 4.4**: "THE AI_Tutor SHALL recommend optimal study sequences based on concept dependencies and the user's Learning_Profile"

### 3. detect_knowledge_gaps(user_knowledge, target_concepts, graph) → List[str]

**Purpose:** Detect knowledge gaps by comparing user knowledge to target concepts

**Implementation:**
- Identifies missing prerequisites for target concepts
- Recursively checks prerequisites of prerequisites
- Returns deduplicated list of all missing concepts
- Enables proactive prerequisite suggestions

**Requirements Addressed:**
- ✅ **Requirement 4.3**: "WHEN a user studies a concept, THE AI_Tutor SHALL identify and suggest prerequisite topics if the user shows confusion"

## Integration with ConceptExtractor

The KnowledgeGraphBuilder integrates with ConceptExtractor (Task 2.1) for:
- **extract_concepts()**: Identifying key concepts from text chunks
- **identify_prerequisites()**: Detecting prerequisite relationships
- **find_related_concepts()**: Discovering concept relationships across sources

This integration ensures:
- Concepts are accurately identified using LLM analysis
- Relationships are semantically meaningful
- Cross-source connections are discovered via vector similarity

## Data Structures

### ConceptGraph Class

**Attributes:**
- `concepts`: Dict[str, Dict] - Maps concept names to concept data
  - name: Concept name
  - description: Brief description
  - source_ids: List of sources containing this concept
  - prerequisites: List of prerequisite concept names
  - related: List of related concept names

- `edges`: List[Dict] - Relationship edges
  - from: Source concept
  - to: Target concept
  - type: Relationship type (prerequisite, related, extends, contrasts, applies_to)
  - strength: Confidence score (0-1)
  - source_ids: Sources supporting this relationship

**Methods:**
- `add_concept(concept)`: Add concept to graph (merges sources if duplicate)
- `add_relationship(link)`: Add relationship edge
- `to_dict()`: Serialize graph to dictionary

## Requirements Coverage Summary

| Requirement | Description | Implementation |
|-------------|-------------|----------------|
| 4.2 | Build Concept_Graph linking topics across sources | ✅ `build_graph()` |
| 4.3 | Identify and suggest prerequisite topics | ✅ `detect_knowledge_gaps()` |
| 4.4 | Recommend optimal study sequences | ✅ `find_learning_path()` |
| 6.4 | Build and maintain Concept_Graph | ✅ `build_graph()` + ConceptGraph class |

## Testing Coverage

### Unit Tests (12 tests)
- ✅ ConceptGraph data structure operations
- ✅ Learning path finding with various scenarios
- ✅ Knowledge gap detection with nested prerequisites
- ✅ Edge cases (empty graphs, no paths, already-known concepts)

### Integration Tests (6 tests)
- ✅ Async graph building with mocked dependencies
- ✅ Multi-source graph construction
- ✅ Error handling during extraction
- ✅ Chunk sampling and limiting
- ✅ Duplicate concept merging

**Total: 18 tests, all passing**

## Usage Examples

### Building a Concept Graph

```python
from app.services.knowledge_graph_builder import build_graph

# Build graph from user's uploaded sources
source_ids = ["source1", "source2", "source3"]
graph = await build_graph(source_ids)

# Access concepts
print(f"Found {len(graph.concepts)} concepts")
for concept_name in graph.concepts:
    print(f"  - {concept_name}")
```

### Finding Learning Paths

```python
from app.services.knowledge_graph_builder import find_learning_path

# User wants to learn Machine Learning
user_knowledge = {"Python", "Math Basics"}
path = find_learning_path(
    start_concept="Python",
    target_concept="Machine Learning",
    user_knowledge=user_knowledge,
    graph=graph
)

print("Recommended learning path:")
for i, concept in enumerate(path, 1):
    print(f"{i}. {concept}")
```

### Detecting Knowledge Gaps

```python
from app.services.knowledge_graph_builder import detect_knowledge_gaps

# Check what's missing for target concepts
user_knowledge = {"Python Basics"}
target_concepts = {"Machine Learning", "Deep Learning"}

gaps = detect_knowledge_gaps(user_knowledge, target_concepts, graph)

print("Knowledge gaps to address:")
for gap in gaps:
    concept_data = graph.concepts[gap]
    print(f"  - {gap}: {concept_data['description']}")
```

## Next Steps (Subsequent Tasks)

This service will be used by:

1. **TutorChain (Task 3.2)**: To identify related concepts and suggest next topics
2. **Node.js API (Task 6.4)**: `/tutor/suggest-topics` endpoint for proactive recommendations
3. **Analytics Service (Task 8.3)**: `/analytics/recommendations` for personalized learning paths
4. **Frontend (Task 12.1)**: KnowledgeMap component for visual concept graph display

## Performance Notes

- Graph building is computationally expensive (LLM calls for each chunk)
- Results should be cached in MongoDB ConceptGraph model
- Rebuild only when sources are added/updated
- Chunk sampling (20 per source) balances coverage with performance
- Relationship finding limited to 30 concepts to avoid excessive API calls
