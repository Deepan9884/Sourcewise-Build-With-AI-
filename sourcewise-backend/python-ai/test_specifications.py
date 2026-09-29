"""
Tests for Specifications Validation

These tests validate the rule-based specification logic.
They do NOT test LLM output quality — that requires human review or eval datasets.

IMPORTANT: These tests verify deterministic validation rules only.
LLM output quality testing is out of scope for unit tests.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from agents.specifications import (
    FlashcardSpecification,
    QuizSpecification,
    StudyPlanSpecification,
    SummarySpecification,
    TutorSpecification,
    KnowledgeGraphSpecification,
    RevisionSpecification,
    AnalyticsSpecification,
)


class TestFlashcardSpecification:
    """Test flashcard validation rules"""
    
    def test_valid_flashcard_passes(self):
        card = {
            "front": "What is a Binary Search Tree?",
            "back": "A BST is a binary tree where left child < parent < right child.",
            "type": "definition",
        }
        result = FlashcardSpecification.validate(card)
        assert result.passed is True
        assert result.score >= 90
    
    def test_single_concept_rule(self):
        """Flashcard with multiple concepts should fail"""
        card = {
            "front": "What is TCP and how is it different from UDP?",
            "back": "TCP is reliable, UDP is fast.",
            "type": "comparison",
        }
        result = FlashcardSpecification.validate(card)
        assert "SINGLE_CONCEPT" in result.failed_rules
    
    def test_answer_too_short(self):
        """Answer with <3 words should fail"""
        card = {
            "front": "What is SQL?",
            "back": "Query language",
            "type": "definition",
        }
        result = FlashcardSpecification.validate(card)
        assert "ANSWER_LENGTH" in result.failed_rules
    
    def test_answer_too_long(self):
        """Answer with >50 words should fail"""
        card = {
            "front": "What is a database?",
            "back": " " .join(["word"] * 55),
            "type": "definition",
        }
        result = FlashcardSpecification.validate(card)
        assert "ANSWER_LENGTH" in result.failed_rules
    
    def test_ambiguity_rule(self):
        """Ambiguous question should fail"""
        card = {
            "front": "What is it?",
            "back": "A database management system.",
            "type": "definition",
        }
        result = FlashcardSpecification.validate(card)
        assert "AMBIGUITY" in result.failed_rules
    
    def test_duplicate_detection(self):
        """Duplicate cards should be detected"""
        card1 = {"front": "What is SQL?", "back": "Structured Query Language"}
        card2 = {"front": "What is SQL?", "back": "A query language"}
        result = FlashcardSpecification.validate(card2, [card1])
        assert "DUPLICATE" in result.failed_rules
    
    def test_minimum_score_threshold(self):
        """Card with multiple failures should score below 90"""
        card = {
            "front": "What is it and how does it work?",
            "back": "X",
            "type": "qa",
        }
        result = FlashcardSpecification.validate(card)
        assert result.passed is False
        assert result.score < 90


class TestQuizSpecification:
    """Test quiz validation rules"""
    
    def test_valid_quiz_passes(self):
        questions = [
            {"question": "What is 2+2?", "options": ["3", "4", "5", "6"], "answer": 1, "difficulty": "easy"},
            {"question": "Explain gravity", "options": ["Force", "Energy", "Mass", "Time"], "answer": 0, "difficulty": "medium"},
            {"question": "Calculate force", "options": ["F=ma", "E=mc2", "V=IR", "P=IV"], "answer": 0, "difficulty": "hard"},
            {"question": "Analyze this scenario", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium"},
            {"question": "Apply this concept", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium"},
            {"question": "Evaluate this approach", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "easy"},
            {"question": "Compare these methods", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium"},
            {"question": "Define this term", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "easy"},
            {"question": "Solve this problem", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "hard"},
            {"question": "Describe the process", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium"},
        ]
        result = QuizSpecification.validate(questions)
        assert result.passed is True
    
    def test_empty_questions_fails(self):
        result = QuizSpecification.validate([])
        assert result.passed is False
        assert "NO_QUESTIONS" in result.failed_rules
    
    def test_difficulty_distribution_check(self):
        """All easy questions should fail distribution check"""
        questions = [
            {"question": f"Easy question {i}", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "easy"}
            for i in range(5)
        ]
        result = QuizSpecification.validate(questions)
        assert "DIFFICULTY_DISTRIBUTION" in result.failed_rules


class TestStudyPlanSpecification:
    """Test study plan validation rules"""
    
    def test_valid_plan_passes(self):
        plan = {
            "days": [
                {"name": "Day 1", "topics": ["Topic A", "Topic B"], "duration": "2 hours"},
                {"name": "Day 2", "topics": ["Topic C", "Review Topic A"], "duration": "2 hours"},
                {"name": "Day 3", "topics": ["Topic D", "Review all"], "duration": "2 hours"},
            ],
            "dailyHours": 4,
            "milestones": [{"threshold": 50, "label": "Halfway"}],
            "recoveryPlan": {"description": "Catch up plan"},
        }
        result = StudyPlanSpecification.validate(plan)
        assert result.passed is True
        assert result.score >= 95
    
    def test_excessive_hours_fails(self):
        """More than 6 hours/day should fail"""
        plan = {
            "days": [{"name": "Day 1", "topics": ["A"]}],
            "dailyHours": 10,
        }
        result = StudyPlanSpecification.validate(plan)
        assert "FEASIBILITY" in result.failed_rules
    
    def test_too_many_topics_fails(self):
        """More than 4 topics/session should fail"""
        plan = {
            "days": [{"name": "Day 1", "topics": ["A", "B", "C", "D", "E"]}],
            "dailyHours": 4,
        }
        result = StudyPlanSpecification.validate(plan)
        assert "FEASIBILITY" in result.failed_rules


class TestSummarySpecification:
    """Test summary validation rules"""
    
    def test_short_summary_fails(self):
        summary = {"content": "Too short"}
        result = SummarySpecification.validate(summary)
        # Short content triggers both STRUCTURE and LENGTH issues
        assert result.passed is False
    
    def test_valid_summary_passes(self):
        summary = {"content": "This overview covers the main concepts of the topic. The core concepts include important facts and key takeaways. For exam notes, remember the key formulas and definitions. This summary provides a comprehensive overview of the subject matter with important facts organized by topic."}
        result = SummarySpecification.validate(summary)
        assert result.passed is True

    def test_compression_ratio_warning(self):
        """Source text much shorter than summary should trigger compression warning"""
        summary = {"content": "Overview: test. Core concepts: test. Important facts: test. Exam notes: test. Key takeaways: test."}
        source = "A" * 500
        result = SummarySpecification.validate(summary, source)
        assert "COMPRESSION_RATIO" in result.warnings

    def test_concept_preservation_fail(self):
        """Summary with no overlapping words should fail concept preservation"""
        summary = {"content": "Overview: test. Core concepts: test. Important facts: test. Exam notes: test. Key takeaways: test."}
        source = "zzzzz yyyyy xxxxx wwww vvvvv uuuuu"
        result = SummarySpecification.validate(summary, source)
        assert result.score < 90

    def test_structure_missing_sections(self):
        """Summary missing required sections should fail structure"""
        summary = {"content": "Short text with no structure at all."}
        result = SummarySpecification.validate(summary)
        assert "STRUCTURE" in result.failed_rules

    def test_summary_too_long_fails(self):
        """Very long summary should trigger length warning"""
        long_content = "Overview: " + "A " * 500 + "Core concepts: " + "B " * 500 + "Important facts: " + "C " * 500 + "Exam notes: " + "D " * 500 + "Key takeaways: " + "E " * 500
        summary = {"content": long_content}
        result = SummarySpecification.validate(summary)
        assert "LENGTH" in result.warnings

    def test_hallucination_detected(self):
        """Summary with words not in source should trigger hallucination"""
        summary = {"content": "Overview: totally unrelated content. Core concepts: made up facts. Important facts: fabricated data. Exam notes: nonexistent info. Key takeaways: hallucinated material."}
        source = "The actual source text is about biology and chemistry topics."
        result = SummarySpecification.validate(summary, source)
        assert result.score < 90


class TestTutorSpecification:
    """Test tutor acceptance rules"""

    def test_valid_explanation_passes(self):
        explanation = {
            "beginner": "Simple intro for beginners",
            "standard": "Standard intermediate level content with questions to ask. What do you think? How does this relate?",
            "advanced": "Complex and advanced material",
            "example": "For instance, consider this example. A common mistake is confusing these concepts. For next topic review and practice, check the following.",
        }
        result = TutorSpecification.validate(explanation)
        assert result.passed is True

    def test_missing_sections_fails(self):
        explanation = {"beginner": "Only beginner content"}
        result = TutorSpecification.validate(explanation)
        assert "EXPLANATION_STRUCTURE" in result.failed_rules

    def test_socratic_warning_few_questions(self):
        """Fewer than 2 follow-up questions should warn"""
        explanation = {
            "beginner": "Simple intro",
            "standard": "Standard content",
            "advanced": "Advanced material",
            "example": "Example here",
        }
        result = TutorSpecification.validate(explanation)
        assert "SOCRATIC" in result.warnings

    def test_socratic_passes_with_questions(self):
        """At least 2 question marks should pass socratic check"""
        explanation = {
            "beginner": "Simple intro",
            "standard": "What do you think? How does this work?",
            "advanced": "Advanced material",
            "example": "Example here",
        }
        result = TutorSpecification.validate(explanation)
        assert result.details["socratic"].startswith("PASS")

    def test_misconception_detection_warning(self):
        """No misconception keywords should warn"""
        explanation = {
            "beginner": "Simple intro",
            "standard": "Standard content",
            "advanced": "Advanced material",
            "example": "Example here",
        }
        result = TutorSpecification.validate(explanation)
        assert "MISCONCEPTION" in result.warnings

    def test_misconception_detection_passes(self):
        """Misconception keywords should pass"""
        explanation = {
            "beginner": "A common mistake is to confuse these",
            "standard": "Standard content",
            "advanced": "Advanced material",
            "example": "Example here",
        }
        result = TutorSpecification.validate(explanation)
        assert result.details["misconception"] == "PASS"

    def test_learning_path_missing(self):
        """Missing next topic/revision/practice should warn"""
        explanation = {
            "beginner": "Simple intro",
            "standard": "Standard content",
            "advanced": "Advanced material",
            "example": "Example here",
        }
        result = TutorSpecification.validate(explanation)
        assert "LEARNING_PATH" in result.warnings

    def test_learning_path_passes(self):
        """All learning path keywords should pass"""
        explanation = {
            "beginner": "Simple intro",
            "standard": "Standard content about next topic for revision and practice",
            "advanced": "Advanced material",
            "example": "Example here",
        }
        result = TutorSpecification.validate(explanation)
        assert result.details["learning_path"] == "PASS"


class TestKnowledgeGraphSpecification:
    """Test knowledge graph acceptance rules"""

    def test_valid_graph_passes(self):
        graph = {
            "nodes": [
                {"id": "A", "definition": "Concept A", "importance": "High", "difficulty": "easy", "prerequisites": []},
                {"id": "B", "definition": "Concept B", "importance": "Medium", "difficulty": "medium", "prerequisites": ["A"]},
            ],
            "edges": [
                {"source": "B", "target": "A"}
            ]
        }
        result = KnowledgeGraphSpecification.validate(graph)
        assert result.passed is True

    def test_node_missing_required_field(self):
        """Node missing a required field should fail"""
        graph = {
            "nodes": [
                {"id": "A", "definition": "Concept A"}
            ],
            "edges": []
        }
        result = KnowledgeGraphSpecification.validate(graph)
        assert "NODE_REQUIREMENTS" in result.failed_rules

    def test_isolated_nodes_warning(self):
        """Nodes with no edges should trigger isolated warning"""
        graph = {
            "nodes": [
                {"id": "A", "definition": "Def", "importance": "H", "difficulty": "easy", "prerequisites": []},
                {"id": "B", "definition": "Def2", "importance": "M", "difficulty": "medium", "prerequisites": []},
            ],
            "edges": []
        }
        result = KnowledgeGraphSpecification.validate(graph)
        assert "ISOLATED_NODES" in result.warnings

    def test_circular_dependency_fails(self):
        """Circular prerequisite should fail"""
        graph = {
            "nodes": [
                {"id": "A", "definition": "Def", "importance": "H", "difficulty": "easy", "prerequisites": ["B"]},
                {"id": "B", "definition": "Def2", "importance": "M", "difficulty": "medium", "prerequisites": ["A"]},
            ],
            "edges": [
                {"source": "A", "target": "B"},
                {"source": "B", "target": "A"}
            ]
        }
        result = KnowledgeGraphSpecification.validate(graph)
        assert "CIRCULAR_DEPENDENCIES" in result.failed_rules

    def test_no_learning_path_fails(self):
        """No starting nodes should fail learning path check"""
        graph = {
            "nodes": [
                {"id": "A", "definition": "Def", "importance": "H", "difficulty": "easy", "prerequisites": []},
            ],
            "edges": [
                {"source": "nonexistent", "target": "A"}
            ]
        }
        result = KnowledgeGraphSpecification.validate(graph)
        assert "LEARNING_PATH" in result.failed_rules

    def test_learning_path_exists(self):
        """At least one node without incoming edges should pass"""
        graph = {
            "nodes": [
                {"id": "A", "definition": "Def", "importance": "H", "difficulty": "easy", "prerequisites": []},
                {"id": "B", "definition": "Def2", "importance": "M", "difficulty": "medium", "prerequisites": ["A"]},
            ],
            "edges": [
                {"source": "B", "target": "A"}
            ]
        }
        result = KnowledgeGraphSpecification.validate(graph)
        assert result.details["learning_path"] == "PASS"


class TestRevisionSpecification:
    """Test revision schedule acceptance rules"""

    def test_valid_schedule_passes(self):
        schedule = {"intervals": [1, 3, 7, 14, 30, 60], "retention_score": 85}
        result = RevisionSpecification.validate(schedule)
        assert result.passed is True

    def test_missing_intervals_fails(self):
        schedule = {"intervals": [], "retention_score": 85}
        result = RevisionSpecification.validate(schedule)
        assert "SCHEDULE_INTERVALS" in result.failed_rules

    def test_few_intervals_fails(self):
        """Less than 4 of 6 required intervals should fail"""
        schedule = {"intervals": [1, 30], "retention_score": 85}
        result = RevisionSpecification.validate(schedule)
        assert "SCHEDULE_INTERVALS" in result.failed_rules

    def test_low_retention_fails(self):
        """Retention below 70 should fail"""
        schedule = {"intervals": [1, 3, 7, 14, 30, 60], "retention_score": 50}
        result = RevisionSpecification.validate(schedule)
        assert "RETENTION_VALIDATION" in result.failed_rules


class TestAnalyticsSpecification:
    """Test analytics acceptance rules"""

    def test_valid_analytics_passes(self):
        analytics = {"confidence": 90, "predictions": {"mastery": 0.8, "exam_readiness": 0.7, "retention": 0.9}}
        result = AnalyticsSpecification.validate(analytics)
        assert result.passed is True

    def test_low_confidence_fails(self):
        """Confidence below 80 should fail"""
        analytics = {"confidence": 60, "predictions": {"mastery": 0.8, "retention": 0.9}}
        result = AnalyticsSpecification.validate(analytics)
        assert "CONFIDENCE_REQUIREMENT" in result.failed_rules

    def test_few_predictions_warn(self):
        """Fewer than 2 prediction types should warn"""
        analytics = {"confidence": 90, "predictions": {"mastery": 0.8}}
        result = AnalyticsSpecification.validate(analytics)
        assert "PREDICTION_TYPES" in result.warnings

    def test_sufficient_predictions_passes(self):
        """At least 2 of 3 required predictions should pass"""
        analytics = {"confidence": 90, "predictions": {"mastery": 0.8, "retention": 0.9}}
        result = AnalyticsSpecification.validate(analytics)
        assert result.details["prediction_types"].startswith("PASS")


class TestStudyPlanSpecificationExtended:
    """Additional study plan tests beyond the basic coverage"""

    def test_revision_time_below_minimum_fails(self):
        """Less than 20% revision topics should fail"""
        plan = {
            "days": [
                {"name": "Day 1", "topics": ["Topic A", "Topic B", "Topic C", "Topic D", "Topic E"]}
            ],
            "dailyHours": 4,
        }
        result = StudyPlanSpecification.validate(plan)
        assert "REVISION_TIME" in result.failed_rules

    def test_revision_time_passes(self):
        """At least 20% revision topics should pass"""
        plan = {
            "days": [
                {"name": "Day 1", "topics": ["Topic A", "Review Topic B"]}
            ],
            "dailyHours": 4,
        }
        result = StudyPlanSpecification.validate(plan)
        assert "REVISION_TIME" not in result.failed_rules

    def test_weak_topics_in_first_30_percent(self):
        """Weak topics not in first 30% of schedule should fail"""
        plan = {
            "days": [
                {"name": "Day 1", "topics": ["A"]},
                {"name": "Day 2", "topics": ["B"]},
                {"name": "Day 3", "topics": ["C"]},
                {"name": "Day 4", "topics": ["D"]},
                {"name": "Day 5", "topics": ["E"]},
            ],
            "dailyHours": 4,
            "weak_topics": ["Z"],
        }
        result = StudyPlanSpecification.validate(plan)
        assert "WEAK_TOPICS" in result.failed_rules

    def test_weak_topics_in_early_days_passes(self):
        """Weak topics in first 30% of days should pass"""
        plan = {
            "days": [
                {"name": "Day 1", "topics": ["A", "weak_topic"]},
                {"name": "Day 2", "topics": ["B"]},
            ],
            "dailyHours": 4,
            "weak_topics": ["weak_topic"],
        }
        result = StudyPlanSpecification.validate(plan)
        assert "WEAK_TOPICS" not in result.failed_rules

    def test_recovery_plan_warning(self):
        """Missing recovery plan should warn"""
        plan = {
            "days": [{"name": "Day 1", "topics": ["A"]}],
            "dailyHours": 4,
        }
        result = StudyPlanSpecification.validate(plan)
        assert "RECOVERY_PLAN" in result.warnings

    def test_recovery_plan_passes(self):
        """Recovery plan present should pass"""
        plan = {
            "days": [{"name": "Day 1", "topics": ["A", "Review B"]}],
            "dailyHours": 4,
            "recoveryPlan": {"description": "Catch up"},
        }
        result = StudyPlanSpecification.validate(plan)
        assert result.details["recovery_plan"] == "PASS"

    def test_cognitive_load_exceeds(self):
        """More than 6 hours/day should trigger cognitive load failure"""
        plan = {
            "days": [{"name": "Day 1", "topics": ["A"]}],
            "dailyHours": 10,
        }
        result = StudyPlanSpecification.validate(plan)
        assert "COGNITIVE_LOAD" in result.failed_rules

    def test_cognitive_load_passes(self):
        """Reasonable hours/topics should pass cognitive load"""
        plan = {
            "days": [{"name": "Day 1", "topics": ["A", "B"]}],
            "dailyHours": 4,
        }
        result = StudyPlanSpecification.validate(plan)
        assert result.details["cognitive_load"] == "PASS"

    def test_milestones_warning(self):
        """No milestones should warn"""
        plan = {
            "days": [{"name": "Day 1", "topics": ["A"]}],
            "dailyHours": 4,
            "recoveryPlan": {"description": "Catch up"},
        }
        result = StudyPlanSpecification.validate(plan)
        assert "MILESTONES" in result.warnings

    def test_milestones_passes(self):
        """Milestones present should pass"""
        plan = {
            "days": [{"name": "Day 1", "topics": ["A", "Review B"]}],
            "dailyHours": 4,
            "recoveryPlan": {"description": "Catch up"},
            "milestones": [{"threshold": 50, "label": "Halfway"}],
        }
        result = StudyPlanSpecification.validate(plan)
        assert result.details["milestones"].startswith("PASS")


class TestQuizSpecificationExtended:
    """Additional quiz tests beyond the basic coverage"""

    def test_concept_coverage_warning(self):
        """Low concept coverage should warn"""
        questions = [
            {"question": "What is X?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "easy", "concept": "X"},
            {"question": "What is Y?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium", "concept": "Y"},
        ]
        sources = ["X", "Y", "Z", "W"]
        result = QuizSpecification.validate(questions, sources)
        assert "CONCEPT_COVERAGE" in result.warnings

    def test_concept_coverage_passes(self):
        """Full concept coverage should pass"""
        questions = [
            {"question": "What is X?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "easy", "concept": "X"},
            {"question": "What is Y?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium", "concept": "Y"},
        ]
        sources = ["X", "Y"]
        result = QuizSpecification.validate(questions, sources)
        assert "CONCEPT_COVERAGE" not in result.warnings

    def test_question_diversity_fails(self):
        """Too few question types should fail"""
        questions = [
            {"question": "What is X?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "easy"},
            {"question": "Define Y?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium"},
            {"question": "List Z?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "hard"},
        ]
        result = QuizSpecification.validate(questions)
        assert "QUESTION_DIVERSITY" in result.failed_rules

    def test_question_diversity_passes(self):
        """All question types present should pass"""
        questions = [
            {"question": "What is X?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "easy"},
            {"question": "Explain why Y works", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium"},
            {"question": "Apply formula Z", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "hard"},
            {"question": "Analyze this scenario", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium"},
            {"question": "Compare X and Y in case study", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium"},
        ]
        result = QuizSpecification.validate(questions)
        assert "QUESTION_DIVERSITY" not in result.failed_rules

    def test_distractor_quality_warning(self):
        """Too many weak distractors should warn"""
        questions = [
            {"question": "Q1", "options": ["A", "None of the above", "C", "D"], "answer": 0, "difficulty": "easy"},
            {"question": "Q2", "options": ["A", "All of the above", "C", "D"], "answer": 0, "difficulty": "medium"},
        ]
        result = QuizSpecification.validate(questions)
        assert "DISTRACTOR_QUALITY" in result.warnings

    def test_bloom_distribution_warning(self):
        """Fewer than 4 Bloom levels should warn"""
        questions = [
            {"question": "What is X?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "easy"},
            {"question": "What is Y?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "medium"},
        ]
        result = QuizSpecification.validate(questions)
        assert "BLOOM_DISTRIBUTION" in result.warnings

    def test_question_count_warning(self):
        """Fewer than 5 questions should warn"""
        questions = [
            {"question": "What is X?", "options": ["A", "B", "C", "D"], "answer": 0, "difficulty": "easy"},
        ]
        result = QuizSpecification.validate(questions)
        assert "QUESTION_COUNT" in result.warnings
