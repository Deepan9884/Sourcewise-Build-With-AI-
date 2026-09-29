"""
Base Agent - Abstract base class for all SourceWise agents.

Agents don't own data. They operate on shared systems:
- Knowledge Hub
- Learning Profile
- Progress Engine
- Planner Engine
- Revision Engine
- Analytics Engine
- Agent Memory (persistent across sessions)
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class AgentResult(BaseModel):
    """Standard result from any agent execution"""
    success: bool
    agent_name: str
    action: str
    data: Optional[Dict[str, Any]] = None
    message: str
    errors: List[str] = []
    metadata: Dict[str, Any] = {}
    timestamp: str = datetime.now().isoformat()


class AgentContext(BaseModel):
    """Shared context passed to all agents"""
    user_id: str
    source_ids: List[str] = []
    learning_profile: Optional[Dict[str, Any]] = None
    active_sources: List[Dict[str, Any]] = []
    conversation_history: List[Dict[str, Any]] = []
    agent_memory: Optional[Dict[str, Any]] = None  # Persistent memory context
    metadata: Dict[str, Any] = {}


class BaseAgent(ABC):
    """
    Abstract base class for all SourceWise agents.
    
    Agents read from and write to shared systems.
    They never own data directly.
    """
    
    def __init__(self):
        self.name = self.__class__.__name__
        self.version = "1.0.0"
    
    @abstractmethod
    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        """
        Execute the agent's primary action.
        
        Args:
            context: Shared context with user data and memory
            **kwargs: Additional parameters
            
        Returns:
            AgentResult with success status and data
        """
        pass
    
    @abstractmethod
    def can_handle(self, intent: str) -> bool:
        """
        Determine if this agent can handle the given intent.
        
        Args:
            intent: User intent string
            
        Returns:
            True if this agent should handle the intent
        """
        pass
    
    def get_capabilities(self) -> List[str]:
        """Return list of capabilities this agent provides"""
        return []
    
    def get_dependencies(self) -> List[str]:
        """Return list of agents this agent depends on"""
        return []
    
    def _create_result(
        self,
        success: bool,
        action: str,
        data: Optional[Dict] = None,
        message: str = "",
        errors: Optional[List[str]] = None,
        metadata: Optional[Dict] = None
    ) -> AgentResult:
        """Helper to create standardized results"""
        return AgentResult(
            success=success,
            agent_name=self.name,
            action=action,
            data=data or {},
            message=message,
            errors=errors or [],
            metadata=metadata or {},
        )
