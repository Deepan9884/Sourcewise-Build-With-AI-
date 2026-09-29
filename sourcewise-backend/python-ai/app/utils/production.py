"""
Production Intelligence System - Enterprise-grade reliability and performance.

Implements:
- Circuit Breakers
- Retry Policies
- Fallback Models
- Agent Recovery
- Performance Monitoring
- Health Checks
"""

from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
import time
import logging

logger = logging.getLogger('sourcewise.production')


# ============================================================
# CIRCUIT BREAKER
# ============================================================

class CircuitState(str, Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered


class CircuitBreaker:
    """
    Prevents cascading failures by stopping requests to failing services.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        success_threshold: int = 3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = None
    
    @property
    def state(self) -> CircuitState:
        """Get current state"""
        if self._state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if self._last_failure_time:
                elapsed = (datetime.now() - self._last_failure_time).seconds
                if elapsed >= self.recovery_timeout:
                    self._state = CircuitState.HALF_OPEN
                    self._success_count = 0
        return self._state
    
    def can_execute(self) -> bool:
        """Check if request can be executed"""
        return self.state != CircuitState.OPEN
    
    def record_success(self):
        """Record a successful execution"""
        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.success_threshold:
                self._state = CircuitState.CLOSED
                self._failure_count = 0
                logger.info("Circuit breaker closed - service recovered")
        else:
            self._failure_count = 0
    
    def record_failure(self):
        """Record a failed execution"""
        self._failure_count += 1
        self._last_failure_time = datetime.now()
        
        if self._failure_count >= self.failure_threshold:
            self._state = CircuitState.OPEN
            logger.warning(f"Circuit breaker opened after {self._failure_count} failures")
    
    def get_status(self) -> Dict:
        """Get circuit breaker status"""
        return {
            "state": self.state.value,
            "failure_count": self._failure_count,
            "success_count": self._success_count,
            "last_failure": self._last_failure_time.isoformat() if self._last_failure_time else None,
        }


# ============================================================
# RETRY POLICY
# ============================================================

class RetryPolicy:
    """
    Configurable retry policy with exponential backoff.
    """
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 30.0,
        exponential_base: float = 2.0
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
    
    def get_delay(self, attempt: int) -> float:
        """Get delay for a given attempt number"""
        delay = self.base_delay * (self.exponential_base ** attempt)
        return min(delay, self.max_delay)
    
    def should_retry(self, attempt: int, exception: Exception) -> bool:
        """Determine if should retry"""
        if attempt >= self.max_retries:
            return False
        
        # Don't retry certain exceptions
        non_retryable = [ValueError, KeyError, TypeError]
        if type(exception) in non_retryable:
            return False
        
        return True


# ============================================================
# FALLBACK SYSTEM
# ============================================================

class FallbackSystem:
    """
    Provides fallback responses when primary systems fail.
    """
    
    def __init__(self):
        self._fallbacks: Dict[str, Callable] = {}
    
    def register_fallback(self, action: str, fallback_fn: Callable):
        """Register a fallback function for an action"""
        self._fallbacks[action] = fallback_fn
    
    async def execute_with_fallback(
        self,
        action: str,
        primary_fn: Callable,
        *args,
        **kwargs
    ) -> Any:
        """Execute with automatic fallback"""
        try:
            return await primary_fn(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Primary execution failed for {action}: {e}")
            
            fallback = self._fallbacks.get(action)
            if fallback:
                logger.info(f"Using fallback for {action}")
                return await fallback(*args, **kwargs)
            
            raise
    
    def get_default_fallbacks(self) -> Dict[str, Callable]:
        """Get default fallback functions"""
        return {
            "generate_quiz": self._fallback_quiz,
            "generate_flashcards": self._fallback_flashcards,
            "generate_plan": self._fallback_plan,
        }
    
    async def _fallback_quiz(self, topic: str = "general", count: int = 5) -> Dict:
        """Fallback quiz generation"""
        return {
            "questions": [
                {
                    "question": f"What is {topic}?",
                    "options": ["Definition A", "Definition B", "Definition C", "Definition D"],
                    "answer": 0,
                    "explanation": f"This tests basic knowledge of {topic}",
                    "difficulty": "easy",
                    "concept": topic,
                }
            ] * count,
            "fallback": True,
        }
    
    async def _fallback_flashcards(self, topic: str = "general", count: int = 10) -> Dict:
        """Fallback flashcard generation"""
        return {
            "cards": [
                {
                    "front": f"What is {topic}?",
                    "back": f"A fundamental concept in the field.",
                    "type": "definition",
                    "difficulty": "easy",
                }
            ] * count,
            "fallback": True,
        }
    
    async def _fallback_plan(self, topic: str = "general", days: int = 5) -> Dict:
        """Fallback plan generation"""
        return {
            "title": f"Study Plan for {topic}",
            "days": [
                {"name": f"Day {i+1}", "topics": [f"Topic {i+1}"], "duration": "2 hours"}
                for i in range(days)
            ],
            "fallback": True,
        }


# ============================================================
# PERFORMANCE MONITOR
# ============================================================

class PerformanceMonitor:
    """
    Tracks performance metrics for optimization.
    """
    
    def __init__(self):
        self._metrics: Dict[str, list] = {}
    
    def record_metric(self, name: str, value: float, tags: Dict = None):
        """Record a performance metric"""
        if name not in self._metrics:
            self._metrics[name] = []
        
        self._metrics[name].append({
            "value": value,
            "timestamp": datetime.now().isoformat(),
            "tags": tags or {},
        })
        
        # Keep last 1000 metrics
        if len(self._metrics[name]) > 1000:
            self._metrics[name] = self._metrics[name][-1000:]
    
    def record_latency(self, operation: str, latency_ms: float):
        """Record operation latency"""
        self.record_metric(f"latency.{operation}", latency_ms)
    
    def record_error(self, operation: str, error_type: str):
        """Record an error"""
        self.record_metric(f"errors.{operation}", 1, {"error_type": error_type})
    
    def get_average_latency(self, operation: str, window_minutes: int = 60) -> float:
        """Get average latency for an operation"""
        metrics = self._metrics.get(f"latency.{operation}", [])
        
        cutoff = datetime.now() - timedelta(minutes=window_minutes)
        recent = [m for m in metrics if datetime.fromisoformat(m["timestamp"]) > cutoff]
        
        if not recent:
            return 0
        
        return sum(m["value"] for m in recent) / len(recent)
    
    def get_error_rate(self, operation: str, window_minutes: int = 60) -> float:
        """Get error rate for an operation"""
        errors = self._metrics.get(f"errors.{operation}", [])
        
        cutoff = datetime.now() - timedelta(minutes=window_minutes)
        recent_errors = [m for m in errors if datetime.fromisoformat(m["timestamp"]) > cutoff]
        
        # Total calls would need to be tracked separately
        # For now, return error count
        return len(recent_errors)
    
    def get_health_status(self) -> Dict:
        """Get overall health status"""
        health = {
            "status": "healthy",
            "metrics": {},
        }
        
        for name, metrics in self._metrics.items():
            if "latency" in name:
                avg = sum(m["value"] for m in metrics[-100:]) / max(1, len(metrics[-100:]))
                health["metrics"][name] = {
                    "average": round(avg, 2),
                    "count": len(metrics),
                }
                
                # Check for degraded performance
                if avg > 5000:  # 5 seconds
                    health["status"] = "degraded"
        
        return health


# ============================================================
# HEALTH CHECKER
# ============================================================

class HealthChecker:
    """
    Comprehensive health checking for all services.
    """
    
    def __init__(self):
        self._checks: Dict[str, Callable] = {}
    
    def register_check(self, name: str, check_fn: Callable):
        """Register a health check"""
        self._checks[name] = check_fn
    
    async def check_health(self) -> Dict:
        """Run all health checks"""
        results = {}
        overall_status = "healthy"
        
        for name, check_fn in self._checks.items():
            try:
                result = await check_fn()
                results[name] = {
                    "status": "healthy",
                    "details": result,
                }
            except Exception as e:
                results[name] = {
                    "status": "unhealthy",
                    "error": str(e),
                }
                overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "checks": results,
            "timestamp": datetime.now().isoformat(),
        }


# Global instances
circuit_breakers: Dict[str, CircuitBreaker] = {}
retry_policies: Dict[str, RetryPolicy] = {}
fallback_system = FallbackSystem()
performance_monitor = PerformanceMonitor()
health_checker = HealthChecker()


def get_circuit_breaker(name: str) -> CircuitBreaker:
    """Get or create a circuit breaker"""
    if name not in circuit_breakers:
        circuit_breakers[name] = CircuitBreaker()
    return circuit_breakers[name]


def get_retry_policy(name: str) -> RetryPolicy:
    """Get or create a retry policy"""
    if name not in retry_policies:
        retry_policies[name] = RetryPolicy()
    return retry_policies[name]
