"""
SourceWise Agent Framework

Specialized agents collaborate through shared systems to create
an Agent-Orchestrated AI Study Operating System.
"""

from app.agents.base import BaseAgent, AgentResult
from app.agents.registry import AgentRegistry
from app.agents.orchestrator import OrchestratorAgent

__all__ = ['BaseAgent', 'AgentResult', 'AgentRegistry', 'OrchestratorAgent']
