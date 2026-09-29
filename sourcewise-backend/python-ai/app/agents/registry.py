"""
Agent Registry - Central registry for all SourceWise agents.

Manages agent registration, discovery, and routing.
"""

from typing import Dict, List, Optional, Type
from app.agents.base import BaseAgent, AgentContext, AgentResult


class AgentRegistry:
    """
    Central registry for all agents.
    
    Agents register themselves and declare their capabilities.
    The registry handles routing and dependency resolution.
    """
    
    def __init__(self):
        self._agents: Dict[str, BaseAgent] = {}
        self._intent_map: Dict[str, str] = {}
    
    def register(self, agent: BaseAgent, intents: Optional[List[str]] = None):
        """Register an agent with optional intent mappings"""
        self._agents[agent.name] = agent
        
        if intents:
            for intent in intents:
                self._intent_map[intent.lower()] = agent.name
    
    def get_agent(self, name: str) -> Optional[BaseAgent]:
        """Get an agent by name"""
        return self._agents.get(name)
    
    def get_agent_for_intent(self, intent: str) -> Optional[BaseAgent]:
        """Find the best agent for a given intent"""
        # Check exact intent mapping first
        agent_name = self._intent_map.get(intent.lower())
        if agent_name:
            return self._agents.get(agent_name)
        
        # Fall back to capability matching
        for agent in self._agents.values():
            if agent.can_handle(intent):
                return agent
        
        return None
    
    def get_all_agents(self) -> List[BaseAgent]:
        """Get all registered agents"""
        return list(self._agents.values())
    
    def get_agent_capabilities(self) -> Dict[str, List[str]]:
        """Get capabilities of all agents"""
        return {
            name: agent.get_capabilities()
            for name, agent in self._agents.items()
        }
    
    def resolve_dependencies(self, agent_name: str) -> List[str]:
        """Resolve agent dependencies in execution order"""
        agent = self._agents.get(agent_name)
        if not agent:
            return []
        
        deps = agent.get_dependencies()
        resolved = []
        
        for dep in deps:
            if dep not in resolved:
                resolved.extend(self.resolve_dependencies(dep))
            resolved.append(dep)
        
        return resolved
    
    def get_execution_plan(self, intent: str) -> List[str]:
        """Get execution plan for a given intent"""
        agent = self.get_agent_for_intent(intent)
        if not agent:
            return []
        
        deps = self.resolve_dependencies(agent.name)
        deps.append(agent.name)
        return deps
    
    def summary(self) -> Dict:
        """Get registry summary"""
        return {
            "total_agents": len(self._agents),
            "agents": list(self._agents.keys()),
            "intents": list(self._intent_map.keys()),
            "capabilities": self.get_agent_capabilities(),
        }


# Global registry instance
registry = AgentRegistry()
