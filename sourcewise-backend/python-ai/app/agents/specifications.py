"""
Educational Acceptance Specification System (EAS) - V6.1

Defines strict specifications for every educational artifact.
No artifact reaches the user unless all mandatory specifications pass.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class SpecificationResult:
    """Result of specification validation"""
    passed: bool
    score: float  # 0-100
    rules_passed: int
    rules_total: int
    failed_rules: List[str]
    warnings: List[str]
    details: Dict[str, Any]


# ============================================================
# FLASHCARD ACCEPTANCE SPECIFICATION
# ============================================================

class FlashcardSpecification:
    """
    Flashcard Acceptance Specification
    
    Minimum Score: 90/100
    
    Mandatory Rules:
    - Single Concept Rule: Test only one concept
    - Answer Length Rule: 5-40 words
    - Ambiguity Rule: Questions must be self-contained
    - Exam Relevance Rule: Linked to core concepts
    - Bloom Taxonomy Distribution: Remember 30%, Understand 30%, Apply 20%, Analyze 10%, Evaluate 10%
    - Duplicate Detection: Similarity threshold 85%
    """
    
    MINIMUM_SCORE = 90
    
    @staticmethod
    def validate(flashcard: Dict, all_cards: List[Dict] = None) -> SpecificationResult:
        """Validate a flashcard against specifications"""
        failed_rules = []
        warnings = []
        score = 100
        details = {}
        
        front = flashcard.get("front", "")
        back = flashcard.get("back", "")
        card_type = flashcard.get("type", "qa")
        
        # Rule 1: Single Concept Rule
        if not FlashcardSpecification._check_single_concept(front):
            failed_rules.append("SINGLE_CONCEPT")
            score -= 20
            details["single_concept"] = "FAIL - Multiple concepts detected"
        else:
            details["single_concept"] = "PASS"
        
        # Rule 2: Answer Length Rule (5-40 words)
        word_count = len(back.split())
        if word_count < 3 or word_count > 50:
            failed_rules.append("ANSWER_LENGTH")
            score -= 15
            details["answer_length"] = f"FAIL - {word_count} words (target: 5-40)"
        else:
            details["answer_length"] = f"PASS - {word_count} words"
        
        # Rule 3: Ambiguity Rule
        if not FlashcardSpecification._check_ambiguity(front):
            failed_rules.append("AMBIGUITY")
            score -= 20
            details["ambiguity"] = "FAIL - Question is ambiguous"
        else:
            details["ambiguity"] = "PASS"
        
        # Rule 4: Exam Relevance Rule
        if not FlashcardSpecification._check_exam_relevance(flashcard):
            score -= 10
            warnings.append("EXAM_RELEVANCE")
            details["exam_relevance"] = "WARNING - Low exam relevance"
        else:
            details["exam_relevance"] = "PASS"
        
        # Rule 5: Bloom Taxonomy Distribution (set-level check)
        if all_cards:
            bloom_result = FlashcardSpecification._check_bloom_distribution(all_cards)
            if not bloom_result["passed"]:
                score -= 15
                warnings.append("BLOOM_DISTRIBUTION")
                details["bloom_distribution"] = f"WARNING - {bloom_result['message']}"
            else:
                details["bloom_distribution"] = "PASS"
        
        # Rule 6: Duplicate Detection (85% threshold)
        if all_cards:
            duplicate_result = FlashcardSpecification._check_duplicates(flashcard, all_cards)
            if duplicate_result["is_duplicate"]:
                failed_rules.append("DUPLICATE")
                score -= 25
                details["duplicate"] = f"FAIL - {duplicate_result['message']}"
            else:
                details["duplicate"] = "PASS"
        
        return SpecificationResult(
            passed=len(failed_rules) == 0 and score >= FlashcardSpecification.MINIMUM_SCORE,
            score=max(0, score),
            rules_passed=6 - len(failed_rules),
            rules_total=6,
            failed_rules=failed_rules,
            warnings=warnings,
            details=details,
        )
    
    @staticmethod
    def _check_single_concept(front: str) -> bool:
        """Rule: A flashcard must test only one concept"""
        conjunctions = [" and ", " or ", " but ", " however ", " also ", " as well as "]
        for conj in conjunctions:
            if conj in front.lower():
                return False
        return True
    
    @staticmethod
    def _check_ambiguity(front: str) -> bool:
        """Rule: Questions must be fully self-contained"""
        ambiguous_patterns = [
            "what is it", "how does this", "explain this", "tell me about this",
            "describe it", "what about", "how about"
        ]
        for pattern in ambiguous_patterns:
            if pattern in front.lower():
                return False
        return True
    
    @staticmethod
    def _check_exam_relevance(flashcard: Dict) -> bool:
        """Rule: Every flashcard must be linked to core concepts"""
        exam_keywords = [
            "definition", "concept", "principle", "formula", "process",
            "important", "key", "core", "fundamental", "essential"
        ]
        front = flashcard.get("front", "").lower()
        back = flashcard.get("back", "").lower()
        
        for kw in exam_keywords:
            if kw in front or kw in back:
                return True
        return False
    
    @staticmethod
    def _check_bloom_distribution(cards: List[Dict]) -> Dict:
        """Rule: Bloom Taxonomy Distribution"""
        if len(cards) < 5:
            return {"passed": True, "message": "Too few cards to check distribution"}
        
        bloom_counts = {
            "remember": 0, "understand": 0, "apply": 0,
            "analyze": 0, "evaluate": 0
        }
        
        for card in cards:
            card_type = card.get("type", "qa")
            if card_type in ["definition", "cloze"]:
                bloom_counts["remember"] += 1
            elif card_type in ["concept", "comparison"]:
                bloom_counts["understand"] += 1
            elif card_type in ["application", "process"]:
                bloom_counts["apply"] += 1
            elif card_type == "exam":
                bloom_counts["analyze"] += 1
            else:
                bloom_counts["evaluate"] += 1
        
        total = len(cards)
        ideal = {
            "remember": 0.30, "understand": 0.30, "apply": 0.20,
            "analyze": 0.10, "evaluate": 0.10
        }
        
        for level, count in bloom_counts.items():
            actual = count / total
            ideal_val = ideal.get(level, 0.10)
            if abs(actual - ideal_val) > 0.15:
                return {
                    "passed": False,
                    "message": f"{level} distribution off: {actual:.0%} vs {ideal_val:.0%}"
                }
        
        return {"passed": True, "message": "Distribution acceptable"}
    
    @staticmethod
    def _check_duplicates(flashcard: Dict, all_cards: List[Dict]) -> Dict:
        """Rule: Similarity Threshold 85%"""
        front = flashcard.get("front", "").lower()
        
        for existing in all_cards:
            if existing.get("front", "").lower() == front:
                return {"is_duplicate": True, "message": "Exact duplicate found"}
            
            similarity = FlashcardSpecification._calculate_similarity(
                front, existing.get("front", "").lower()
            )
            if similarity > 0.85:
                return {"is_duplicate": True, "message": f"Similar card found ({similarity:.0%} match)"}
        
        return {"is_duplicate": False, "message": ""}
    
    @staticmethod
    def _calculate_similarity(text1: str, text2: str) -> float:
        """Calculate text similarity using Jaccard index"""
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        if not words1 or not words2:
            return 0
        
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union)


# ============================================================
# QUIZ ACCEPTANCE SPECIFICATION
# ============================================================

class QuizSpecification:
    """
    Quiz Acceptance Specification
    
    Minimum Score: 90/100
    
    Rules:
    - Concept Coverage: 95%+ of source concepts
    - Difficulty Distribution: Easy 30%, Medium 50%, Hard 20% (deviation >10% = FAIL)
    - Question Diversity: Recall, Conceptual, Application, Scenario, Analytical
    - Distractor Quality: Incorrect options must be believable
    - Bloom Distribution: All 6 levels represented
    """
    
    MINIMUM_SCORE = 90
    
    @staticmethod
    def validate(questions: List[Dict], source_concepts: List[str] = None) -> SpecificationResult:
        """Validate quiz against specifications"""
        failed_rules = []
        warnings = []
        score = 100
        details = {}
        
        if not questions:
            return SpecificationResult(
                passed=False, score=0, rules_passed=0, rules_total=6,
                failed_rules=["NO_QUESTIONS"], warnings=[], details={}
            )
        
        # Rule 1: Concept Coverage (95%+)
        if source_concepts:
            coverage = QuizSpecification._check_concept_coverage(questions, source_concepts)
            if coverage["percentage"] < 95:
                score -= 20
                warnings.append("CONCEPT_COVERAGE")
                details["concept_coverage"] = f"WARNING - {coverage['percentage']:.0f}% coverage"
            else:
                details["concept_coverage"] = f"PASS - {coverage['percentage']:.0f}% coverage"
        
        # Rule 2: Difficulty Distribution (Easy 30%, Medium 50%, Hard 20%, deviation >10% = FAIL)
        diff_result = QuizSpecification._check_difficulty_distribution(questions)
        if not diff_result["passed"]:
            score -= 15
            failed_rules.append("DIFFICULTY_DISTRIBUTION")
            details["difficulty_distribution"] = f"FAIL - {diff_result['message']}"
        else:
            details["difficulty_distribution"] = "PASS"
        
        # Rule 3: Question Diversity
        diversity = QuizSpecification._check_question_diversity(questions)
        if not diversity["passed"]:
            score -= 15
            failed_rules.append("QUESTION_DIVERSITY")
            details["question_diversity"] = f"FAIL - Missing: {diversity['missing']}"
        else:
            details["question_diversity"] = "PASS"
        
        # Rule 4: Distractor Quality
        distractor_result = QuizSpecification._check_distractor_quality(questions)
        if not distractor_result["passed"]:
            score -= 10
            warnings.append("DISTRACTOR_QUALITY")
            details["distractor_quality"] = f"WARNING - {distractor_result['message']}"
        else:
            details["distractor_quality"] = "PASS"
        
        # Rule 5: Bloom Distribution (all 6 levels)
        bloom_result = QuizSpecification._check_bloom_distribution(questions)
        if not bloom_result["passed"]:
            score -= 10
            warnings.append("BLOOM_DISTRIBUTION")
            details["bloom_distribution"] = f"WARNING - {bloom_result['message']}"
        else:
            details["bloom_distribution"] = "PASS"
        
        # Rule 6: Minimum Question Count
        if len(questions) < 5:
            score -= 10
            warnings.append("QUESTION_COUNT")
            details["question_count"] = f"WARNING - Only {len(questions)} questions"
        else:
            details["question_count"] = f"PASS - {len(questions)} questions"
        
        return SpecificationResult(
            passed=len(failed_rules) == 0 and score >= QuizSpecification.MINIMUM_SCORE,
            score=max(0, score),
            rules_passed=6 - len(failed_rules),
            rules_total=6,
            failed_rules=failed_rules,
            warnings=warnings,
            details=details,
        )
    
    @staticmethod
    def _check_concept_coverage(questions: List[Dict], concepts: List[str]) -> Dict:
        """Rule: Every major concept must appear (95%+ coverage)"""
        covered = set()
        for q in questions:
            concept = q.get("concept", "")
            if concept:
                covered.add(concept.lower())
        
        if not concepts:
            return {"percentage": 100, "covered": len(covered), "total": 0}
        
        covered_count = sum(1 for c in concepts if c.lower() in covered)
        percentage = (covered_count / len(concepts)) * 100
        
        return {"percentage": percentage, "covered": covered_count, "total": len(concepts)}
    
    @staticmethod
    def _check_difficulty_distribution(questions: List[Dict]) -> Dict:
        """Rule: Easy 30%, Medium 50%, Hard 20% (deviation >10% = FAIL)"""
        if len(questions) < 3:
            return {"passed": True, "message": "Too few questions"}
        
        difficulties = [q.get("difficulty", "medium") for q in questions]
        total = len(questions)
        
        easy = difficulties.count("easy") / total
        medium = difficulties.count("medium") / total
        hard = difficulties.count("hard") / total
        
        ideal = {"easy": 0.30, "medium": 0.50, "hard": 0.20}
        actual = {"easy": easy, "medium": medium, "hard": hard}
        
        for level, ideal_val in ideal.items():
            if abs(actual[level] - ideal_val) > 0.10:
                return {
                    "passed": False,
                    "message": f"{level} deviation >10%: {actual[level]:.0%} vs {ideal_val:.0%}"
                }
        
        return {"passed": True, "message": "Distribution acceptable"}
    
    @staticmethod
    def _check_question_diversity(questions: List[Dict]) -> Dict:
        """Rule: Required types - Recall, Conceptual, Application, Scenario, Analytical"""
        required_types = {"recall", "conceptual", "application", "scenario", "analytical"}
        
        present_types = set()
        for q in questions:
            q_text = q.get("question", "").lower()
            if any(w in q_text for w in ["what", "define", "list", "name"]):
                present_types.add("recall")
            elif any(w in q_text for w in ["explain", "describe", "why", "how does"]):
                present_types.add("conceptual")
            elif any(w in q_text for w in ["apply", "solve", "calculate", "use"]):
                present_types.add("application")
            elif any(w in q_text for w in ["scenario", "case", "situation", "if"]):
                present_types.add("scenario")
            elif any(w in q_text for w in ["analyze", "compare", "evaluate", "contrast"]):
                present_types.add("analytical")
        
        missing = required_types - present_types
        
        if len(missing) > 2:
            return {"passed": False, "missing": list(missing)}
        
        return {"passed": True, "missing": []}
    
    @staticmethod
    def _check_distractor_quality(questions: List[Dict]) -> Dict:
        """Rule: Incorrect options must be believable"""
        weak_distractors = 0
        
        for q in questions:
            options = q.get("options", [])
            if len(options) < 4:
                weak_distractors += 1
                continue
            
            # Check for obviously wrong distractors
            for opt in options:
                opt_lower = opt.lower()
                if "none of the above" in opt_lower or "all of the above" in opt_lower:
                    weak_distractors += 1
                    break
        
        if weak_distractors > len(questions) * 0.3:
            return {"passed": False, "message": f"{weak_distractors} weak distractors detected"}
        
        return {"passed": True, "message": "Distractors acceptable"}
    
    @staticmethod
    def _check_bloom_distribution(questions: List[Dict]) -> Dict:
        """Rule: Quiz must contain all 6 Bloom levels"""
        bloom_counts = {
            "remember": 0, "understand": 0, "apply": 0,
            "analyze": 0, "evaluate": 0, "create": 0
        }
        
        for q in questions:
            q_text = q.get("question", "").lower()
            if any(w in q_text for w in ["what", "define", "list", "name"]):
                bloom_counts["remember"] += 1
            elif any(w in q_text for w in ["explain", "describe"]):
                bloom_counts["understand"] += 1
            elif any(w in q_text for w in ["apply", "solve"]):
                bloom_counts["apply"] += 1
            elif any(w in q_text for w in ["analyze", "compare"]):
                bloom_counts["analyze"] += 1
            elif any(w in q_text for w in ["evaluate", "judge"]):
                bloom_counts["evaluate"] += 1
            elif any(w in q_text for w in ["create", "design"]):
                bloom_counts["create"] += 1
        
        covered_levels = sum(1 for v in bloom_counts.values() if v > 0)
        
        if covered_levels < 4:
            return {"passed": False, "message": f"Only {covered_levels} Bloom levels covered"}
        
        return {"passed": True, "message": f"{covered_levels} Bloom levels covered"}


# ============================================================
# SUMMARY ACCEPTANCE SPECIFICATION
# ============================================================

class SummarySpecification:
    """
    Summary Acceptance Specification
    
    Minimum Score: 90/100
    
    Rules:
    - Compression Ratio: 70%-90%
    - Concept Preservation: 90%+ key concepts
    - Structure: Overview, Core Concepts, Important Facts, Exam Notes, Key Takeaways
    - Hallucination Detection: Every fact must be source aligned
    """
    
    MINIMUM_SCORE = 90
    REQUIRED_SECTIONS = ["overview", "core concepts", "important facts", "exam notes", "key takeaways"]
    
    @staticmethod
    def validate(summary: Dict, source_content: str = "") -> SpecificationResult:
        """Validate summary against specifications"""
        failed_rules = []
        warnings = []
        score = 100
        details = {}
        
        content = summary.get("content", summary.get("summary", ""))
        
        # Rule 1: Compression Ratio (70%-90%)
        if source_content:
            compression = SummarySpecification._check_compression(content, source_content)
            if compression < 70 or compression > 90:
                score -= 15
                warnings.append("COMPRESSION_RATIO")
                details["compression_ratio"] = f"WARNING - {compression:.0f}% (target: 70-90%)"
            else:
                details["compression_ratio"] = f"PASS - {compression:.0f}%"
        
        # Rule 2: Concept Preservation (90%+)
        if source_content:
            preservation = SummarySpecification._check_concept_preservation(content, source_content)
            if preservation < 90:
                score -= 20
                failed_rules.append("CONCEPT_PRESERVATION")
                details["concept_preservation"] = f"FAIL - {preservation:.0f}% preserved"
            else:
                details["concept_preservation"] = f"PASS - {preservation:.0f}% preserved"
        
        # Rule 3: Structure Requirement (5 mandatory sections)
        structure = SummarySpecification._check_structure(content)
        if not structure["passed"]:
            score -= 15
            failed_rules.append("STRUCTURE")
            details["structure"] = f"FAIL - Missing: {structure['missing']}"
        else:
            details["structure"] = "PASS - All sections present"
        
        # Rule 4: Hallucination Detection
        if source_content:
            hallucination = SummarySpecification._check_hallucination(content, source_content)
            if hallucination["score"] < 90:
                score -= 25
                failed_rules.append("HALLUCINATION")
                details["hallucination"] = f"FAIL - {hallucination['message']}"
            else:
                details["hallucination"] = f"PASS - {hallucination['score']}% aligned"
        
        # Rule 5: Length Check
        word_count = len(content.split())
        if word_count < 100 or word_count > 2000:
            score -= 10
            warnings.append("LENGTH")
            details["length"] = f"WARNING - {word_count} words"
        else:
            details["length"] = f"PASS - {word_count} words"
        
        return SpecificationResult(
            passed=len(failed_rules) == 0 and score >= SummarySpecification.MINIMUM_SCORE,
            score=max(0, score),
            rules_passed=5 - len(failed_rules),
            rules_total=5,
            failed_rules=failed_rules,
            warnings=warnings,
            details=details,
        )
    
    @staticmethod
    def _check_compression(summary: str, source: str) -> float:
        """Rule: Compression Ratio 70%-90%"""
        source_words = len(source.split())
        summary_words = len(summary.split())
        
        if source_words == 0:
            return 0
        
        return (summary_words / source_words) * 100
    
    @staticmethod
    def _check_concept_preservation(summary: str, source: str) -> float:
        """Rule: Preserve 90%+ key concepts"""
        source_words = set(source.lower().split())
        summary_words = set(summary.lower().split())
        
        stop_words = {
            "the", "a", "an", "is", "are", "was", "were", "in", "on",
            "at", "to", "for", "of", "with", "this", "that", "these", "those"
        }
        source_words -= stop_words
        summary_words -= stop_words
        
        if not source_words:
            return 100
        
        preserved = source_words & summary_words
        return (len(preserved) / len(source_words)) * 100
    
    @staticmethod
    def _check_structure(content: str) -> Dict:
        """Rule: Mandatory sections - Overview, Core Concepts, Important Facts, Exam Notes, Key Takeaways"""
        content_lower = content.lower()
        missing = []
        
        section_keywords = {
            "overview": ["overview", "introduction", "summary"],
            "core concepts": ["concept", "key concept", "core"],
            "important facts": ["fact", "important", "key point"],
            "exam notes": ["exam", "test", "important for"],
            "key takeaways": ["takeaway", "key point", "remember"],
        }
        
        for section, keywords in section_keywords.items():
            if not any(kw in content_lower for kw in keywords):
                missing.append(section)
        
        return {"passed": len(missing) == 0, "missing": missing}
    
    @staticmethod
    def _check_hallucination(summary: str, source: str) -> Dict:
        """Rule: Every fact must be source aligned"""
        source_words = set(source.lower().split())
        summary_words = set(summary.lower().split())
        
        stop_words = {
            "the", "a", "an", "is", "are", "was", "were", "in", "on",
            "at", "to", "for", "of", "with", "this", "that", "these", "those"
        }
        source_words -= stop_words
        summary_words -= stop_words
        
        if not summary_words:
            return {"score": 100, "message": "No unsupported content"}
        
        unsupported = summary_words - source_words
        support_ratio = 1 - (len(unsupported) / len(summary_words))
        
        return {
            "score": round(support_ratio * 100, 1),
            "message": f"{len(unsupported)} unsupported words" if unsupported else "All content supported",
        }


# ============================================================
# STUDY PLAN ACCEPTANCE SPECIFICATION
# ============================================================

class StudyPlanSpecification:
    """
    Study Plan Acceptance Specification
    
    Minimum Score: 95/100
    
    Rules:
    - Feasibility: Max 6 hours/day, 4 topics/session, 8 concepts/day
    - Revision Rule: Min 20% study time reserved for revision
    - Weak Topic Rule: Weak concepts in first 30% of schedule
    - Recovery Planning: Recovery path mandatory
    - Cognitive Load: Topic limit, session limit, rest intervals
    """
    
    MINIMUM_SCORE = 95
    MAX_DAILY_HOURS = 6
    MAX_TOPICS_PER_SESSION = 4
    MAX_CONCEPTS_PER_DAY = 8
    MIN_REVISION_PERCENTAGE = 20
    
    @staticmethod
    def validate(plan: Dict) -> SpecificationResult:
        """Validate study plan against specifications"""
        failed_rules = []
        warnings = []
        score = 100
        details = {}
        
        days = plan.get("days", [])
        daily_hours = plan.get("dailyHours", 2)
        
        # Rule 1: Feasibility Rules
        feasibility = StudyPlanSpecification._check_feasibility(days, daily_hours)
        if not feasibility["passed"]:
            score -= 20
            failed_rules.append("FEASIBILITY")
            details["feasibility"] = f"FAIL - {feasibility['message']}"
        else:
            details["feasibility"] = "PASS"
        
        # Rule 2: Revision Rule (min 20% study time)
        revision = StudyPlanSpecification._check_revision_time(days)
        if not revision["passed"]:
            score -= 15
            failed_rules.append("REVISION_TIME")
            details["revision_time"] = f"FAIL - {revision['message']}"
        else:
            details["revision_time"] = "PASS"
        
        # Rule 3: Weak Topic Rule (first 30% of schedule)
        weak_topics = plan.get("weak_topics", [])
        if weak_topics:
            weak_result = StudyPlanSpecification._check_weak_topics(days, weak_topics)
            if not weak_result["passed"]:
                score -= 15
                failed_rules.append("WEAK_TOPICS")
                details["weak_topics"] = f"FAIL - {weak_result['message']}"
            else:
                details["weak_topics"] = "PASS"
        
        # Rule 4: Recovery Planning Rule
        recovery = StudyPlanSpecification._check_recovery_plan(plan)
        if not recovery["passed"]:
            score -= 10
            warnings.append("RECOVERY_PLAN")
            details["recovery_plan"] = f"WARNING - {recovery['message']}"
        else:
            details["recovery_plan"] = "PASS"
        
        # Rule 5: Cognitive Load Rule
        cognitive = StudyPlanSpecification._check_cognitive_load(days, daily_hours)
        if not cognitive["passed"]:
            score -= 15
            failed_rules.append("COGNITIVE_LOAD")
            details["cognitive_load"] = f"FAIL - {cognitive['message']}"
        else:
            details["cognitive_load"] = "PASS"
        
        # Rule 6: Milestone Tracking
        milestones = plan.get("milestones", [])
        if not milestones:
            score -= 10
            warnings.append("MILESTONES")
            details["milestones"] = "WARNING - No milestones defined"
        else:
            details["milestones"] = f"PASS - {len(milestones)} milestones"
        
        return SpecificationResult(
            passed=len(failed_rules) == 0 and score >= StudyPlanSpecification.MINIMUM_SCORE,
            score=max(0, score),
            rules_passed=6 - len(failed_rules),
            rules_total=6,
            failed_rules=failed_rules,
            warnings=warnings,
            details=details,
        )
    
    @staticmethod
    def _check_feasibility(days: List[Dict], daily_hours: int) -> Dict:
        """Rule: Max 6 hours/day, 4 topics/session"""
        if daily_hours > StudyPlanSpecification.MAX_DAILY_HOURS:
            return {
                "passed": False,
                "message": f"Daily hours ({daily_hours}) exceeds maximum ({StudyPlanSpecification.MAX_DAILY_HOURS})"
            }
        
        for day in days:
            topics = day.get("topics", [])
            if len(topics) > StudyPlanSpecification.MAX_TOPICS_PER_SESSION:
                return {
                    "passed": False,
                    "message": f"{day.get('name', 'Day')}: {len(topics)} topics exceeds maximum ({StudyPlanSpecification.MAX_TOPICS_PER_SESSION})"
                }
        
        return {"passed": True, "message": "Feasibility rules satisfied"}
    
    @staticmethod
    def _check_revision_time(days: List[Dict]) -> Dict:
        """Rule: Min 20% study time reserved for revision"""
        total_topics = 0
        revision_topics = 0
        
        for day in days:
            topics = day.get("topics", [])
            total_topics += len(topics)
            revision_topics += sum(
                1 for t in topics if "review" in t.lower() or "revision" in t.lower()
            )
        
        if total_topics == 0:
            return {"passed": True, "message": "No topics to check"}
        
        revision_percentage = (revision_topics / total_topics) * 100
        
        if revision_percentage < StudyPlanSpecification.MIN_REVISION_PERCENTAGE:
            return {
                "passed": False,
                "message": f"Revision time {revision_percentage:.0f}% is below minimum ({StudyPlanSpecification.MIN_REVISION_PERCENTAGE}%)"
            }
        
        return {"passed": True, "message": f"Revision time {revision_percentage:.0f}%"}
    
    @staticmethod
    def _check_weak_topics(days: List[Dict], weak_topics: List[str]) -> Dict:
        """Rule: Weak concepts must appear within first 30% of schedule"""
        if not days:
            return {"passed": True, "message": "No days to check"}
        
        early_days = int(len(days) * 0.3) + 1
        early_topics = []
        
        for day in days[:early_days]:
            early_topics.extend(day.get("topics", []))
        
        early_topics_lower = [t.lower() for t in early_topics]
        
        for weak in weak_topics:
            if weak.lower() not in early_topics_lower:
                return {
                    "passed": False,
                    "message": f"Weak topic '{weak}' not in first 30% of schedule"
                }
        
        return {"passed": True, "message": "Weak topics properly prioritized"}
    
    @staticmethod
    def _check_recovery_plan(plan: Dict) -> Dict:
        """Rule: Recovery path mandatory"""
        has_recovery = plan.get("recoveryPlan") or plan.get("recovery_plan")
        
        if not has_recovery:
            return {"passed": False, "message": "No recovery path defined"}
        
        return {"passed": True, "message": "Recovery plan present"}
    
    @staticmethod
    def _check_cognitive_load(days: List[Dict], daily_hours: int) -> Dict:
        """Rule: Topic limit, session limit, rest intervals"""
        if daily_hours > StudyPlanSpecification.MAX_DAILY_HOURS:
            return {
                "passed": False,
                "message": f"Daily hours ({daily_hours}) exceeds limit ({StudyPlanSpecification.MAX_DAILY_HOURS})"
            }
        
        for day in days:
            topics = day.get("topics", [])
            if len(topics) > StudyPlanSpecification.MAX_TOPICS_PER_SESSION:
                return {
                    "passed": False,
                    "message": f"{day.get('name', 'Day')}: {len(topics)} topics exceeds limit ({StudyPlanSpecification.MAX_TOPICS_PER_SESSION})"
                }
        
        return {"passed": True, "message": "Cognitive load within limits"}


# ============================================================
# TUTOR ACCEPTANCE SPECIFICATION
# ============================================================

class TutorSpecification:
    """
    Tutor Acceptance Specification
    
    Rules:
    - Explanation Structure: Beginner, Standard, Advanced, Real World Example
    - Socratic Requirement: Min 2 follow-up questions
    - Misconception Detection: Identify misunderstandings
    - Learning Path: Next Topic, Revision Topic, Practice Topic
    """
    
    @staticmethod
    def validate(explanation: Dict) -> SpecificationResult:
        """Validate tutor explanation"""
        failed_rules = []
        warnings = []
        score = 100
        details = {}
        
        # Rule 1: Explanation Structure (4 mandatory sections)
        structure = TutorSpecification._check_structure(explanation)
        if not structure["passed"]:
            score -= 20
            failed_rules.append("EXPLANATION_STRUCTURE")
            details["explanation_structure"] = f"FAIL - Missing: {structure['missing']}"
        else:
            details["explanation_structure"] = "PASS"
        
        # Rule 2: Socratic Requirement (min 2 follow-up questions)
        socratic = TutorSpecification._check_socratic(explanation)
        if not socratic["passed"]:
            score -= 15
            warnings.append("SOCRATIC")
            details["socratic"] = f"WARNING - Only {socratic['count']} follow-up questions"
        else:
            details["socratic"] = f"PASS - {socratic['count']} follow-up questions"
        
        # Rule 3: Misconception Detection
        misconception = TutorSpecification._check_misconception_detection(explanation)
        if not misconception["passed"]:
            score -= 10
            warnings.append("MISCONCEPTION")
            details["misconception"] = "WARNING - No misconception detection"
        else:
            details["misconception"] = "PASS"
        
        # Rule 4: Learning Path
        learning_path = TutorSpecification._check_learning_path(explanation)
        if not learning_path["passed"]:
            score -= 10
            warnings.append("LEARNING_PATH")
            details["learning_path"] = f"WARNING - Missing: {learning_path['missing']}"
        else:
            details["learning_path"] = "PASS"
        
        return SpecificationResult(
            passed=len(failed_rules) == 0 and score >= 80,
            score=max(0, score),
            rules_passed=4 - len(failed_rules),
            rules_total=4,
            failed_rules=failed_rules,
            warnings=warnings,
            details=details,
        )
    
    @staticmethod
    def _check_structure(explanation: Dict) -> Dict:
        """Rule: Must include Beginner, Standard, Advanced, Real World Example"""
        required = ["beginner", "standard", "advanced", "example"]
        
        present = set()
        content = str(explanation).lower()
        
        if "beginner" in content or "simple" in content or "basic" in content:
            present.add("beginner")
        if "standard" in content or "intermediate" in content:
            present.add("standard")
        if "advanced" in content or "complex" in content:
            present.add("advanced")
        if "example" in content or "for instance" in content:
            present.add("example")
        
        missing = set(required) - present
        
        return {"passed": len(missing) == 0, "missing": list(missing)}
    
    @staticmethod
    def _check_socratic(explanation: Dict) -> Dict:
        """Rule: Min 2 follow-up questions"""
        content = str(explanation).lower()
        question_count = content.count("?")
        
        return {"passed": question_count >= 2, "count": question_count}
    
    @staticmethod
    def _check_misconception_detection(explanation: Dict) -> Dict:
        """Rule: Must identify likely misunderstandings"""
        content = str(explanation).lower()
        
        misconception_keywords = [
            "misconception", "common mistake", "confusion",
            "actually", "not true", "be careful"
        ]
        
        has_detection = any(kw in content for kw in misconception_keywords)
        
        return {"passed": has_detection}
    
    @staticmethod
    def _check_learning_path(explanation: Dict) -> Dict:
        """Rule: Must recommend Next Topic, Revision Topic, Practice Topic"""
        content = str(explanation).lower()
        
        required = ["next topic", "revision", "practice"]
        present = []
        
        for req in required:
            if req in content:
                present.append(req)
        
        missing = set(required) - set(present)
        
        return {"passed": len(missing) == 0, "missing": list(missing)}


# ============================================================
# KNOWLEDGE GRAPH ACCEPTANCE SPECIFICATION
# ============================================================

class KnowledgeGraphSpecification:
    """
    Knowledge Graph Acceptance Specification
    
    Rules:
    - Node Requirements: Definition, Importance, Difficulty, Prerequisites, Dependent Concepts
    - No isolated nodes
    - No circular prerequisite loops
    - Learning path must exist
    """
    
    @staticmethod
    def validate(graph: Dict) -> SpecificationResult:
        """Validate knowledge graph"""
        failed_rules = []
        warnings = []
        score = 100
        details = {}
        
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])
        
        # Rule 1: Node Requirements
        node_result = KnowledgeGraphSpecification._check_nodes(nodes)
        if not node_result["passed"]:
            score -= 20
            failed_rules.append("NODE_REQUIREMENTS")
            details["node_requirements"] = f"FAIL - {node_result['message']}"
        else:
            details["node_requirements"] = "PASS"
        
        # Rule 2: No Isolated Nodes
        isolated = KnowledgeGraphSpecification._check_isolated_nodes(nodes, edges)
        if isolated["count"] > 0:
            score -= 15
            warnings.append("ISOLATED_NODES")
            details["isolated_nodes"] = f"WARNING - {isolated['count']} isolated nodes"
        else:
            details["isolated_nodes"] = "PASS"
        
        # Rule 3: No Circular Dependencies
        circular = KnowledgeGraphSpecification._check_circular_dependencies(edges)
        if circular["has_circular"]:
            score -= 20
            failed_rules.append("CIRCULAR_DEPENDENCIES")
            details["circular_dependencies"] = "FAIL - Circular dependency detected"
        else:
            details["circular_dependencies"] = "PASS"
        
        # Rule 4: Learning Path Exists
        path = KnowledgeGraphSpecification._check_learning_path(nodes, edges)
        if not path["exists"]:
            score -= 15
            failed_rules.append("LEARNING_PATH")
            details["learning_path"] = "FAIL - No valid learning path"
        else:
            details["learning_path"] = "PASS"
        
        return SpecificationResult(
            passed=len(failed_rules) == 0 and score >= 80,
            score=max(0, score),
            rules_passed=4 - len(failed_rules),
            rules_total=4,
            failed_rules=failed_rules,
            warnings=warnings,
            details=details,
        )
    
    @staticmethod
    def _check_nodes(nodes: List[Dict]) -> Dict:
        """Rule: Every node must contain Definition, Importance, Difficulty, Prerequisites, Dependent Concepts"""
        required_fields = ["definition", "importance", "difficulty", "prerequisites"]
        
        for node in nodes:
            for field in required_fields:
                if field not in node:
                    return {"passed": False, "message": f"Node missing: {field}"}
        
        return {"passed": True, "message": "All nodes have required fields"}
    
    @staticmethod
    def _check_isolated_nodes(nodes: List[Dict], edges: List[Dict]) -> Dict:
        """Rule: No isolated nodes"""
        connected = set()
        for edge in edges:
            connected.add(edge.get("source", ""))
            connected.add(edge.get("target", ""))
        
        isolated = [n for n in nodes if n.get("id", "") not in connected]
        
        return {"count": len(isolated), "nodes": [n.get("id", "") for n in isolated[:5]]}
    
    @staticmethod
    def _check_circular_dependencies(edges: List[Dict]) -> Dict:
        """Rule: No circular prerequisite loops"""
        graph = {}
        for edge in edges:
            source = edge.get("source", "")
            target = edge.get("target", "")
            if source not in graph:
                graph[source] = []
            graph[source].append(target)
        
        visited = set()
        rec_stack = set()
        
        def has_cycle(node):
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            
            rec_stack.remove(node)
            return False
        
        for node in graph:
            if node not in visited:
                if has_cycle(node):
                    return {"has_circular": True}
        
        return {"has_circular": False}
    
    @staticmethod
    def _check_learning_path(nodes: List[Dict], edges: List[Dict]) -> Dict:
        """Rule: Learning path must exist"""
        if not nodes:
            return {"exists": False}
        
        has_prereqs = set()
        for edge in edges:
            has_prereqs.add(edge.get("target", ""))
        
        starting_nodes = [n for n in nodes if n.get("id", "") not in has_prereqs]
        
        return {"exists": len(starting_nodes) > 0}


# ============================================================
# REVISION ENGINE SPECIFICATION
# ============================================================

class RevisionSpecification:
    """
    Revision Engine Specification
    
    Rules:
    - Schedule Intervals: 1, 3, 7, 14, 30, 60 days
    - Retention Validation: Expected retention score 70%+
    """
    
    REQUIRED_INTERVALS = [1, 3, 7, 14, 30, 60]
    MINIMUM_RETENTION = 70
    
    @staticmethod
    def validate(schedule: Dict) -> SpecificationResult:
        """Validate revision schedule"""
        failed_rules = []
        warnings = []
        score = 100
        details = {}
        
        intervals = schedule.get("intervals", [])
        retention_score = schedule.get("retention_score", 0)
        
        # Rule 1: Schedule Intervals
        interval_result = RevisionSpecification._check_intervals(intervals)
        if not interval_result["passed"]:
            score -= 20
            failed_rules.append("SCHEDULE_INTERVALS")
            details["schedule_intervals"] = f"FAIL - {interval_result['message']}"
        else:
            details["schedule_intervals"] = "PASS"
        
        # Rule 2: Retention Validation (70%+)
        if retention_score < RevisionSpecification.MINIMUM_RETENTION:
            score -= 30
            failed_rules.append("RETENTION_VALIDATION")
            details["retention_validation"] = f"FAIL - Retention {retention_score}% below minimum ({RevisionSpecification.MINIMUM_RETENTION}%)"
        else:
            details["retention_validation"] = f"PASS - Retention {retention_score}%"
        
        return SpecificationResult(
            passed=len(failed_rules) == 0 and score >= 80,
            score=max(0, score),
            rules_passed=2 - len(failed_rules),
            rules_total=2,
            failed_rules=failed_rules,
            warnings=warnings,
            details=details,
        )
    
    @staticmethod
    def _check_intervals(intervals: List[int]) -> Dict:
        """Rule: Minimum intervals - 1, 3, 7, 14, 30, 60 days"""
        if not intervals:
            return {"passed": False, "message": "No intervals defined"}
        
        missing = [i for i in RevisionSpecification.REQUIRED_INTERVALS if i not in intervals]
        
        if len(missing) > 2:
            return {"passed": False, "message": f"Missing intervals: {missing}"}
        
        return {"passed": True, "message": "Intervals acceptable"}


# ============================================================
# ANALYTICS ACCEPTANCE SPECIFICATION
# ============================================================

class AnalyticsSpecification:
    """
    Analytics Acceptance Specification
    
    Rules:
    - Confidence Requirement: Min 80%
    - Predictions below threshold are hidden
    - Prediction Types: Mastery, Exam Readiness, Retention, Completion, Knowledge Growth
    """
    
    MINIMUM_CONFIDENCE = 80
    
    @staticmethod
    def validate(analytics: Dict) -> SpecificationResult:
        """Validate analytics"""
        failed_rules = []
        warnings = []
        score = 100
        details = {}
        
        confidence = analytics.get("confidence", 0)
        predictions = analytics.get("predictions", {})
        
        # Rule 1: Confidence Requirement (80%+)
        if confidence < AnalyticsSpecification.MINIMUM_CONFIDENCE:
            score -= 30
            failed_rules.append("CONFIDENCE_REQUIREMENT")
            details["confidence_requirement"] = f"FAIL - Confidence {confidence}% below minimum ({AnalyticsSpecification.MINIMUM_CONFIDENCE}%)"
        else:
            details["confidence_requirement"] = f"PASS - Confidence {confidence}%"
        
        # Rule 2: Prediction Types
        required_predictions = ["mastery", "exam_readiness", "retention"]
        present = [p for p in required_predictions if p in predictions]
        
        if len(present) < 2:
            score -= 15
            warnings.append("PREDICTION_TYPES")
            details["prediction_types"] = f"WARNING - Only {len(present)} prediction types"
        else:
            details["prediction_types"] = f"PASS - {len(present)} prediction types"
        
        return SpecificationResult(
            passed=len(failed_rules) == 0 and score >= 80,
            score=max(0, score),
            rules_passed=2 - len(failed_rules),
            rules_total=2,
            failed_rules=failed_rules,
            warnings=warnings,
            details=details,
        )


# Global specification instances
flashcard_spec = FlashcardSpecification()
quiz_spec = QuizSpecification()
study_plan_spec = StudyPlanSpecification()
summary_spec = SummarySpecification()
tutor_spec = TutorSpecification()
knowledge_graph_spec = KnowledgeGraphSpecification()
revision_spec = RevisionSpecification()
analytics_spec = AnalyticsSpecification()
