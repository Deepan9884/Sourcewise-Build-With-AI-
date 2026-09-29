"""
Golden Dataset System

Provides trusted educational resources for evaluation and benchmarking.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime


class GoldenDataset:
    """
    Manages the golden dataset of trusted educational resources.
    
    Contents:
    - 1000 Flashcards
    - 1000 Quiz Questions
    - 500 Summaries
    - 500 Study Plans
    - 500 Tutor Conversations
    - 250 Knowledge Graphs
    
    Requirements:
    - Human Validated
    - Faculty Reviewed
    - Version Controlled
    """
    
    def __init__(self):
        self._flashcards: List[Dict] = []
        self._quizzes: List[Dict] = []
        self._summaries: List[Dict] = []
        self._plans: List[Dict] = []
        self._conversations: List[Dict] = []
        self._knowledge_graphs: List[Dict] = []
        
        self._initialize_sample_data()
    
    def _initialize_sample_data(self):
        """Initialize with sample golden data"""
        # Sample flashcards
        self._flashcards = [
            {
                "front": "What is a Binary Search Tree?",
                "back": "A BST is a binary tree where each node has at most two children, with left child < parent < right child. This property enables O(log n) search, insert, and delete operations.",
                "type": "definition",
                "difficulty": "medium",
                "topic": "Data Structures",
                "validated": True,
                "faculty_approved": True,
            },
            {
                "front": "Compare TCP and UDP protocols.",
                "back": "TCP: Connection-oriented, reliable, ordered delivery, slower. Used for web browsing, email.\nUDP: Connectionless, unreliable, faster. Used for video streaming, gaming.",
                "type": "comparison",
                "difficulty": "medium",
                "topic": "Networking",
                "validated": True,
                "faculty_approved": True,
            },
        ]
        
        # Sample quizzes
        self._quizzes = [
            {
                "question": "Which data structure is best for implementing a priority queue?",
                "options": ["Array", "Linked List", "Heap", "Stack"],
                "answer": 2,
                "difficulty": "medium",
                "topic": "Data Structures",
                "validated": True,
            },
        ]
        
        # Sample summaries
        self._summaries = [
            {
                "topic": "Database Normalization",
                "content": "Database normalization is the process of organizing data to reduce redundancy...",
                "validated": True,
                "quality_score": 95,
            },
        ]
    
    def get_flashcards(self, topic: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Get golden flashcards"""
        cards = self._flashcards
        if topic:
            cards = [c for c in cards if topic.lower() in c.get("topic", "").lower()]
        return cards[:limit]
    
    def get_quizzes(self, topic: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Get golden quizzes"""
        quizzes = self._quizzes
        if topic:
            quizzes = [q for q in quizzes if topic.lower() in q.get("topic", "").lower()]
        return quizzes[:limit]
    
    def get_summaries(self, topic: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Get golden summaries"""
        summaries = self._summaries
        if topic:
            summaries = [s for s in summaries if topic.lower() in s.get("topic", "").lower()]
        return summaries[:limit]
    
    def get_for_benchmark(self, content_type: str, limit: int = 5) -> List[Dict]:
        """Get golden data for benchmarking"""
        if content_type == "flashcard":
            return self.get_flashcards(limit=limit)
        elif content_type == "quiz":
            return self.get_quizzes(limit=limit)
        elif content_type == "summary":
            return self.get_summaries(limit=limit)
        return []
    
    def add_validated_item(self, content_type: str, item: Dict):
        """Add a validated item to the golden dataset"""
        item["validated"] = True
        item["added_at"] = datetime.now().isoformat()
        
        if content_type == "flashcard":
            self._flashcards.append(item)
        elif content_type == "quiz":
            self._quizzes.append(item)
        elif content_type == "summary":
            self._summaries.append(item)
        elif content_type == "plan":
            self._plans.append(item)
    
    def get_statistics(self) -> Dict:
        """Get dataset statistics"""
        return {
            "flashcards": len(self._flashcards),
            "quizzes": len(self._quizzes),
            "summaries": len(self._summaries),
            "plans": len(self._plans),
            "conversations": len(self._conversations),
            "knowledge_graphs": len(self._knowledge_graphs),
            "total": (
                len(self._flashcards) + len(self._quizzes) +
                len(self._summaries) + len(self._plans)
            ),
        }


# Global instance
golden_dataset = GoldenDataset()
