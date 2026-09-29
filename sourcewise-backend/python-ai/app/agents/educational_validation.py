from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

@dataclass
class ValidationDimension:
    name: str
    score: float
    weight: float
    passed: bool
    details: str = ''

@dataclass
class EducationalValidationResult:
    artifact_type: str
    overall_score: float
    educational_confidence: float
    dimensions: List[ValidationDimension]
    specification_compliance: float
    passed: bool
    outcome_prediction: Dict[str, Any]
    recommendations: List[str]

class UniversalEducationalFramework:
    MINIMUM_CONFIDENCE = 90
    
    DIMENSIONS = [
        ('accuracy', 0.15),
        ('completeness', 0.15),
        ('educational_value', 0.15),
        ('exam_relevance', 0.12),
        ('clarity', 0.13),
        ('actionability', 0.10),
        ('difficulty_accuracy', 0.10),
        ('retention_potential', 0.10),
    ]
    
    def validate(self, artifact_type: str, content: Dict, specification_score: float = 0) -> EducationalValidationResult:
        dimensions = []
        for dim_name, weight in self.DIMENSIONS:
            score = self._score_dimension(dim_name, content)
            dimensions.append(ValidationDimension(
                name=dim_name, score=score, weight=weight,
                passed=score >= 85, details=f'{dim_name}: {score}/100'
            ))
        
        overall = sum(d.score * d.weight for d in dimensions) / sum(d.weight for d in dimensions)
        
        edu_confidence = (overall * 0.6 + specification_score * 0.4) if specification_score > 0 else overall
        
        outcome = self._predict_outcome(artifact_type, edu_confidence, content)
        
        recommendations = []
        for d in dimensions:
            if not d.passed:
                recommendations.append(f'Improve {d.name} (currently {d.score})')
        
        return EducationalValidationResult(
            artifact_type=artifact_type,
            overall_score=round(overall, 1),
            educational_confidence=round(edu_confidence, 1),
            dimensions=dimensions,
            specification_compliance=specification_score,
            passed=edu_confidence >= self.MINIMUM_CONFIDENCE,
            outcome_prediction=outcome,
            recommendations=recommendations,
        )
    
    def _score_dimension(self, name: str, content: Dict) -> float:
        if name == 'accuracy':
            return self._score_accuracy(content)
        elif name == 'completeness':
            return self._score_completeness(content)
        elif name == 'educational_value':
            return self._score_educational_value(content)
        elif name == 'exam_relevance':
            return self._score_exam_relevance(content)
        elif name == 'clarity':
            return self._score_clarity(content)
        elif name == 'actionability':
            return self._score_actionability(content)
        elif name == 'difficulty_accuracy':
            return self._score_difficulty(content)
        elif name == 'retention_potential':
            return self._score_retention(content)
        return 50
    
    def _score_accuracy(self, content: Dict) -> float:
        score = 70
        if content.get('source_aligned', True):
            score += 15
        if content.get('fact_checked', False):
            score += 15
        return min(100, score)
    
    def _score_completeness(self, content: Dict) -> float:
        score = 60
        if content.get('covers_key_concepts', True):
            score += 20
        if content.get('has_examples', False):
            score += 10
        if content.get('has_summary', False):
            score += 10
        return min(100, score)
    
    def _score_educational_value(self, content: Dict) -> float:
        score = 50
        card_type = content.get('type', 'qa')
        type_bonuses = {'concept': 20, 'comparison': 25, 'application': 25, 'process': 20, 'exam': 15, 'cloze': 15, 'definition': 10}
        score += type_bonuses.get(card_type, 10)
        if len(content.get('back', content.get('content', ''))) > 50:
            score += 15
        return min(100, score)
    
    def _score_exam_relevance(self, content: Dict) -> float:
        score = 50
        exam_kw = ['exam', 'important', 'key', 'definition', 'formula', 'process']
        text = str(content).lower()
        for kw in exam_kw:
            if kw in text:
                score += 8
                break
        return min(100, score)
    
    def _score_clarity(self, content: Dict) -> float:
        score = 60
        front = content.get('front', content.get('question', ''))
        if 10 < len(front) < 200:
            score += 20
        if '?' in front or ':' in front:
            score += 10
        if content.get('explanation'):
            score += 10
        return min(100, score)
    
    def _score_actionability(self, content: Dict) -> float:
        score = 60
        if content.get('has_activities', False):
            score += 20
        if content.get('has_practice', False):
            score += 10
        if content.get('has_review', False):
            score += 10
        return min(100, score)
    
    def _score_difficulty(self, content: Dict) -> float:
        diff = content.get('difficulty', 'medium')
        if diff == 'easy': return 75
        elif diff == 'medium': return 85
        elif diff == 'hard': return 90
        return 70
    
    def _score_retention(self, content: Dict) -> float:
        score = 50
        if content.get('has_flashcards', False): score += 15
        if content.get('has_spaced_repetition', False): score += 20
        if content.get('has_review_schedule', False): score += 15
        return min(100, score)
    
    def _predict_outcome(self, artifact_type: str, confidence: float, content: Dict) -> Dict:
        retention_gain = round(confidence * 0.2, 1)
        mastery_increase = round(confidence * 0.15, 1)
        knowledge_gain = round(confidence * 0.25, 1)
        return {
            'expected_retention_gain': f'+{retention_gain}%',
            'expected_mastery_increase': f'+{mastery_increase}%',
            'expected_knowledge_gain': f'+{knowledge_gain}%',
            'confidence': round(confidence, 1),
        }

educational_framework = UniversalEducationalFramework()
