"""
KnowledgeGraphBuilder — constructs concept graphs from sources and provides graph traversal.
Uses ConceptExtractor to identify concepts and builds a graph structure for learning path optimization.
"""
from typing import List, Dict, Set, Optional, Tuple
from collections import deque
from app.services.concept_extractor import (
    extract_concepts,
    identify_prerequisites,
    find_related_concepts,
    Concept,
    ConceptLink
)
from app.services.vector_store import _get_collection


class ConceptGraph:
    """Represents a knowledge graph of concepts and their relationships."""
    
    def __init__(self):
        self.concepts: Dict[str, Dict] = {}  # concept_name -> {description, source_ids, prerequisites, related}
        self.edges: List[Dict] = []  # List of relationship edges
    
    def add_concept(self, concept: Concept):
        """Add a concept to the graph."""
        if concept.name not in self.concepts:
            self.concepts[concept.name] = {
                "name": concept.name,
                "description": concept.description,
                "source_ids": [concept.source_id],
                "prerequisites": [],
                "related": []
            }
        else:
            # Merge source IDs if concept already exists
            if concept.source_id not in self.concepts[concept.name]["source_ids"]:
                self.concepts[concept.name]["source_ids"].append(concept.source_id)
    
    def add_relationship(self, link: ConceptLink):
        """Add a relationship edge to the graph."""
        # Ensure both concepts exist
        if link.concept not in self.concepts or link.related_concept not in self.concepts:
            return
        
        # Add edge
        edge = {
            "from": link.concept,
            "to": link.related_concept,
            "type": link.relationship_type,
            "strength": link.strength,
            "source_ids": link.source_ids
        }
        self.edges.append(edge)
        
        # Update concept relationships
        if link.relationship_type == "prerequisite":
            if link.related_concept not in self.concepts[link.concept]["prerequisites"]:
                self.concepts[link.concept]["prerequisites"].append(link.related_concept)
        else:
            if link.related_concept not in self.concepts[link.concept]["related"]:
                self.concepts[link.concept]["related"].append(link.related_concept)
    
    def to_dict(self) -> Dict:
        """Convert graph to dictionary format."""
        return {
            "concepts": list(self.concepts.values()),
            "edges": self.edges
        }


async def build_graph(source_ids: List[str]) -> ConceptGraph:
    """
    Build a concept graph from all provided sources.
    
    Args:
        source_ids: List of source document IDs to analyze
    
    Returns:
        ConceptGraph with concepts and relationships
    """
    graph = ConceptGraph()
    
    # Get all chunks from the specified sources
    col = _get_collection()
    all_chunks = []
    
    for source_id in source_ids:
        chunks = col.get(where={"source_id": source_id})
        if chunks and chunks["ids"]:
            for i, chunk_id in enumerate(chunks["ids"]):
                all_chunks.append({
                    "chunk_id": chunk_id,
                    "text": chunks["documents"][i],
                    "source_id": chunks["metadatas"][i]["source_id"],
                    "source_name": chunks["metadatas"][i]["source_name"]
                })
    
    if not all_chunks:
        return graph
    
    # Extract concepts from chunks (sample to avoid processing too many)
    # Process up to 20 chunks per source for efficiency
    chunks_per_source = {}
    for chunk in all_chunks:
        sid = chunk["source_id"]
        if sid not in chunks_per_source:
            chunks_per_source[sid] = []
        if len(chunks_per_source[sid]) < 20:
            chunks_per_source[sid].append(chunk)
    
    # Extract concepts from sampled chunks
    all_concepts = []
    for source_id, chunks in chunks_per_source.items():
        for chunk in chunks:
            concepts = await extract_concepts(chunk["text"], source_id)
            all_concepts.extend(concepts)
    
    # Add concepts to graph
    for concept in all_concepts:
        graph.add_concept(concept)
    
    # Build relationships between concepts
    concept_names = list(graph.concepts.keys())
    
    # For each concept, find related concepts
    for concept_name in concept_names[:30]:  # Limit to avoid too many API calls
        try:
            links = await find_related_concepts(concept_name, source_ids)
            for link in links:
                graph.add_relationship(link)
        except Exception as e:
            print(f"[KnowledgeGraphBuilder] Error finding relationships for {concept_name}: {e}")
            continue
    
    return graph


def find_learning_path(
    start_concept: str,
    target_concept: str,
    user_knowledge: Set[str],
    graph: ConceptGraph
) -> List[str]:
    """
    Find optimal learning path from start to target concept using BFS.
    
    Args:
        start_concept: Starting concept (can be empty string for any start)
        target_concept: Target concept to reach
        user_knowledge: Set of concepts the user already knows
        graph: The concept graph to traverse
    
    Returns:
        List of concept names representing the learning path
    """
    if target_concept not in graph.concepts:
        return []
    
    # If user already knows the target, return empty path
    if target_concept in user_knowledge:
        return []
    
    # Build adjacency list for graph traversal
    adjacency = {}
    for concept_name in graph.concepts.keys():
        adjacency[concept_name] = []
    
    for edge in graph.edges:
        # For learning paths, we follow prerequisite relationships in reverse
        # (from prerequisite to dependent concept)
        if edge["type"] == "prerequisite":
            adjacency[edge["to"]].append(edge["from"])
        # Also follow "related" and "extends" relationships
        elif edge["type"] in ["related", "extends"]:
            adjacency[edge["from"]].append(edge["to"])
    
    # BFS to find shortest path
    if start_concept and start_concept in graph.concepts:
        queue = deque([(start_concept, [start_concept])])
        visited = {start_concept}
    else:
        # Start from any known concept
        queue = deque()
        visited = set()
        for known in user_knowledge:
            if known in graph.concepts:
                queue.append((known, [known]))
                visited.add(known)
        
        # If no known concepts, start from concepts with no prerequisites
        if not queue:
            for concept_name, concept_data in graph.concepts.items():
                if not concept_data["prerequisites"]:
                    queue.append((concept_name, [concept_name]))
                    visited.add(concept_name)
                    break
    
    if not queue:
        return [target_concept]  # Fallback: just return target
    
    while queue:
        current, path = queue.popleft()
        
        if current == target_concept:
            # Filter out concepts user already knows
            filtered_path = [c for c in path if c not in user_knowledge]
            return filtered_path if filtered_path else [target_concept]
        
        # Explore neighbors
        for neighbor in adjacency.get(current, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
    
    # No path found, return direct target
    return [target_concept]


def detect_knowledge_gaps(
    user_knowledge: Set[str],
    target_concepts: Set[str],
    graph: ConceptGraph
) -> List[str]:
    """
    Identify missing prerequisite knowledge needed to understand target concepts.
    
    Args:
        user_knowledge: Set of concepts the user already knows
        target_concepts: Set of concepts the user wants to learn
        graph: The concept graph
    
    Returns:
        List of concept names representing knowledge gaps (missing prerequisites)
    """
    gaps = set()
    
    for target in target_concepts:
        if target not in graph.concepts:
            continue
        
        # Get all prerequisites for this target
        prerequisites = graph.concepts[target].get("prerequisites", [])
        
        # Check which prerequisites are missing
        for prereq in prerequisites:
            if prereq not in user_knowledge:
                gaps.add(prereq)
                
                # Recursively check prerequisites of prerequisites
                if prereq in graph.concepts:
                    nested_prereqs = graph.concepts[prereq].get("prerequisites", [])
                    for nested in nested_prereqs:
                        if nested not in user_knowledge:
                            gaps.add(nested)
    
    return list(gaps)
