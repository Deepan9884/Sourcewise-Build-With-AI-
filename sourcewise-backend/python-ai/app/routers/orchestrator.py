"""
Orchestrator Router - API endpoint for agent orchestration.

Exposes the agent system through a single unified endpoint.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.agents.orchestrator import orchestrator
from app.agents.registry import registry
from app.agents.base import AgentContext


router = APIRouter()


class OrchestratorRequest(BaseModel):
    """Request to the agent orchestrator"""
    message: str
    source_ids: List[str] = []
    user_id: str = "anonymous"
    context: Optional[Dict[str, Any]] = None
    action: Optional[str] = None
    topic: Optional[str] = None
    count: Optional[int] = None
    difficulty: Optional[str] = None
    mode: Optional[str] = None
    exam_date: Optional[str] = None
    daily_hours: Optional[int] = None


class OrchestratorResponse(BaseModel):
    """Response from the agent orchestrator"""
    success: bool
    agent: str
    action: str
    data: Optional[Dict[str, Any]] = None
    message: str
    errors: List[str] = []
    metadata: Dict[str, Any] = {}


@router.post("", response_model=OrchestratorResponse)
async def orchestrate(req: OrchestratorRequest):
    """
    Main orchestration endpoint.
    
    Routes user requests to appropriate agents and returns aggregated results.
    """
    try:
        # Build context
        context = AgentContext(
            user_id=req.user_id,
            source_ids=req.source_ids,
            learning_profile=req.context.get("learning_profile") if req.context else None,
        )
        
        # Execute orchestrator
        result = await orchestrator.execute(
            context,
            user_request=req.message,
            action=req.action,
            topic=req.topic,
            count=req.count,
            difficulty=req.difficulty,
            mode=req.mode,
            exam_date=req.exam_date,
            daily_hours=req.daily_hours,
        )
        
        return OrchestratorResponse(
            success=result.success,
            agent=result.agent_name,
            action=result.action,
            data=result.data,
            message=result.message,
            errors=result.errors,
            metadata=result.metadata,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents")
async def list_agents():
    """List all registered agents and their capabilities"""
    return registry.summary()


@router.get("/agents/{agent_name}")
async def get_agent(agent_name: str):
    """Get details about a specific agent"""
    agent = registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
    
    return {
        "name": agent.name,
        "version": agent.version,
        "capabilities": agent.get_capabilities(),
        "dependencies": agent.get_dependencies(),
    }


@router.get("/health")
async def health():
    """Check orchestrator health"""
    return {
        "status": "ok",
        "agents_registered": len(registry.get_all_agents()),
        "agents": list(registry.get_agent_capabilities().keys()),
    }
