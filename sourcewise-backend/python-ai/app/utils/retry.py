"""
Retry and Error Handling Utilities for Production Hardening.

Provides retry logic, error boundaries, and structured logging.
"""

import time
import logging
from typing import Callable, Any, Optional
from functools import wraps


# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('sourcewise')


def retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """
    Decorator for retrying failed operations with exponential backoff.
    
    Args:
        max_attempts: Maximum number of retry attempts
        delay: Initial delay between retries in seconds
        backoff: Multiplier for delay after each retry
        exceptions: Tuple of exceptions to catch and retry
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay
            
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_attempts} failed for {func.__name__}: {e}. "
                            f"Retrying in {current_delay}s..."
                        )
                        time.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(
                            f"All {max_attempts} attempts failed for {func.__name__}: {e}"
                        )
            
            raise last_exception
        return wrapper
    return decorator


def safe_execute(default_value: Any = None, log_error: bool = True):
    """
    Decorator for safely executing functions with error handling.
    
    Args:
        default_value: Value to return on error
        log_error: Whether to log the error
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                if log_error:
                    logger.error(f"Error in {func.__name__}: {e}")
                return default_value
        return wrapper
    return decorator


class ErrorBoundary:
    """
    Context manager for catching and handling errors in agent execution.
    """
    
    def __init__(self, agent_name: str, fallback_message: str = "An error occurred"):
        self.agent_name = agent_name
        self.fallback_message = fallback_message
        self.errors = []
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.errors.append({
                "type": exc_type.__name__,
                "message": str(exc_val),
                "agent": self.agent_name,
            })
            logger.error(f"Error in {self.agent_name}: {exc_val}")
            return True  # Suppress the exception
        return False
    
    def has_errors(self) -> bool:
        return len(self.errors) > 0
    
    def get_errors(self) -> list:
        return self.errors


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format"""
    if seconds < 1:
        return f"{seconds * 1000:.0f}ms"
    elif seconds < 60:
        return f"{seconds:.1f}s"
    else:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
