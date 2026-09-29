"""
Educational Trust Engine

Measures trustworthiness of every artifact.
Formula: Trust Score = (Quality + Specification + Benchmark + Historical Success + Confidence) / 5
"""

from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class TrustScore:
    """Trust score for an educational artifact"""
    overall: float  # 0-100
    quality: float
    specification: float
    benchmark: float
    historical_success: float
    confidence: float
    grade: str
    level: str  # Exceptional, Approved, Warning, Reject


class EducationalTrustEngine:
    """
    Measures trustworthiness of every artifact.
    
    Trust Score = (Quality + Specification + Benchmark + Historical Success + Confidence) / 5
    
    Scale:
    95-100 = Exceptional
    90-94 = Approved
    80-89 = Warning
    Below 80 = Reject
    """
    
    def calculate_trust_score(
        self,
        quality: float = 0,
        specification: float = 0,
        benchmark: float = 0,
        historical_success: float = 0,
        confidence: float = 0
    ) -> TrustScore:
        """Calculate trust score for an artifact"""
        overall = (quality + specification + benchmark + historical_success + confidence) / 5
        overall = round(overall, 1)
        
        # Determine grade
        if overall >= 95:
            grade = "A+"
        elif overall >= 90:
            grade = "A"
        elif overall >= 80:
            grade = "B"
        elif overall >= 70:
            grade = "C"
        else:
            grade = "D"
        
        # Determine level
        if overall >= 95:
            level = "Exceptional"
        elif overall >= 90:
            level = "Approved"
        elif overall >= 80:
            level = "Warning"
        else:
            level = "Reject"
        
        return TrustScore(
            overall=overall,
            quality=quality,
            specification=specification,
            benchmark=benchmark,
            historical_success=historical_success,
            confidence=confidence,
            grade=grade,
            level=level,
        )
    
    def get_trust_summary(self, scores: List[TrustScore]) -> Dict:
        """Get summary of trust scores"""
        if not scores:
            return {"average": 0, "min": 0, "max": 0, "pass_rate": 0}
        
        overall_scores = [s.overall for s in scores]
        
        return {
            "average": round(sum(overall_scores) / len(overall_scores), 1),
            "min": round(min(overall_scores), 1),
            "max": round(max(overall_scores), 1),
            "pass_rate": round(sum(1 for s in scores if s.overall >= 90) / len(scores) * 100, 1),
        }


# Global instance
trust_engine = EducationalTrustEngine()
