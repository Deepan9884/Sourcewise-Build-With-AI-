# ConceptExtractor Service

## Overview

The ConceptExtractor service identifies key concepts from text, detects prerequisite relationships, and links related concepts across multiple sources. It uses the existing LLM service (Ollama) for semantic understanding and the vector store (ChromaDB) for finding related content.

## Features

### 1. Concept Extraction (`extract_concepts`)

Identifies key concepts, topics, or ideas from text using LLM analysis.

**Parameters:**
- `text` (str): The text to analyze
- `source_id` (str): The source document ID

**Returns:**
- `List[Concept]`: List of identified concepts with names, descriptions, and confidence scores

**Example:**
```python
from app.services.concept_extractor import extract_concepts

text = "Machine learning uses neural networks to learn patterns from data."
concepts = await extract_concepts(text, "source_123")

for concept in concepts:
    print(f"{concept.name}: {concept.description}")
```

### 2. Prerequisite Identification (`identify_prerequisites`)

Detects prerequisite concepts needed to understand a given concept.

**Parameters:**
- `concept` (str): The concept to analyze
- `context` (str): Surrounding text providing context

**Returns:**
- `List[str]`: List of prerequisite concept names

**Example:**
```python
from app.services.concept_extractor import identify_prerequisites

concept = "Differential Equations"
context = "Differential equations require understanding of calculus..."
prerequisites = await identify_prerequisites(concept, context)

print(f"Prerequisites: {', '.join(prerequisites)}")
```

### 3. Related Concept Finding (`find_related_concepts`)

Finds related concepts across multiple sources using semantic similarity.

**Parameters:**
- `concept` (str): The concept to find relations for
- `all_source_ids` (List[str]): List of source IDs to search across

**Returns:**
- `List[ConceptLink]`: List of concept relationships with types and strengths

**Relationship Types:**
- `prerequisite`: Needed before learning this concept
- `related`: Connected or similar topic
- `extends`: Builds upon this concept
- `contrasts`: Opposite or contrasting idea
- `applies_to`: Practical application area

**Example:**
```python
from app.services.concept_extractor import find_related_concepts

links = await find_related_concepts("Machine Learning", ["source1", "source2"])

for link in links:
    print(f"{link.concept} -> {link.related_concept} ({link.relationship_type})")
```

## Data Classes

### Concept

Represents an identified concept.

**Attributes:**
- `name` (str): Concise concept name (2-4 words)
- `description` (str): Brief description (1 sentence)
- `source_id` (str): Source document ID
- `confidence` (float): Confidence score (0-1)

**Methods:**
- `to_dict()`: Serialize to dictionary

### ConceptLink

Represents a relationship between concepts.

**Attributes:**
- `concept` (str): Source concept name
- `related_concept` (str): Related concept name
- `relationship_type` (str): Type of relationship
- `source_ids` (List[str]): Source IDs where relationship appears
- `strength` (float): Relationship strength (0-1)

**Methods:**
- `to_dict()`: Serialize to dictionary

## Implementation Details

### LLM Integration

The service uses structured prompts to guide the LLM in extracting concepts and relationships. It handles:
- JSON parsing from LLM responses
- Markdown code block removal
- Error handling for malformed responses

### Vector Store Integration

For finding related concepts, the service:
1. Queries the vector store for semantically similar chunks
2. Builds context from top results
3. Uses LLM to identify relationships
4. Returns structured ConceptLink objects

### Error Handling

All functions include comprehensive error handling:
- Returns empty lists on errors (never crashes)
- Logs errors for debugging
- Handles network timeouts and API failures gracefully

## Testing

### Unit Tests

Run unit tests with mocked dependencies:
```bash
pytest app/services/test_concept_extractor.py -v
```

### Integration Tests

Run integration tests with real Ollama (requires Ollama running):
```bash
pytest app/services/test_concept_extractor_integration.py -v -s -m integration
```

## Requirements Mapping

This service implements:
- **Requirement 1.5**: Proactively identify and explain prerequisite concepts
- **Requirement 4.2**: Build concept graph linking related topics across sources
- **Requirement 6.4**: Build and maintain concept graph showing topic connections

## Dependencies

- `httpx`: For async HTTP calls to Ollama
- `app.services.llm`: LLM service configuration
- `app.services.vector_store`: Vector store for semantic search
- `app.services.embedder`: Text embedding for similarity

## Configuration

Uses settings from `app.config`:
- `OLLAMA_BASE_URL`: Ollama API endpoint
- `OLLAMA_MODEL`: LLM model to use
- Temperature: 0.2 (low for consistent extraction)
- Timeout: 60 seconds for LLM calls

## Future Enhancements

Potential improvements:
- Caching of extracted concepts to avoid re-processing
- Batch processing for multiple texts
- Confidence scoring based on multiple extraction attempts
- Support for domain-specific concept taxonomies
- Concept merging and deduplication across sources
