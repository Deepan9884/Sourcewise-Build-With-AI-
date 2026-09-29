"""
Agent Router — Unified AI endpoint for all user interactions.

Routes natural language commands to appropriate AI services and returns
structured responses that the frontend can render as interactive components.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from app.services.intent_parser import parse_intent, ParsedIntent
from app.services.action_executor import ActionExecutor


router = APIRouter()
executor = ActionExecutor()


class AgentRequest(BaseModel):
    """Request to the AI Agent"""
    message: str
    source_ids: List[str] = []
    user_id: str = "demo_user"
    conversation_history: List[Dict] = []
    context: Optional[Dict[str, Any]] = None  # Additional context (current page, etc.)
    
    class Config:
        # Allow extra fields and be lenient
        extra = "allow"


class AgentResponse(BaseModel):
    """Response from the AI Agent"""
    type: str  # "chat" | "quiz" | "flashcards" | "summary" | etc.
    message: str  # AI message to display
    data: Optional[Dict[str, Any]] = None  # Structured data for interactive components
    requires_confirmation: bool = False
    confirmation_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    intent: Optional[Dict[str, Any]] = None  # Detected intent for debugging


@router.post("", response_model=AgentResponse)
async def agent_chat(req: AgentRequest):
    """
    Main AI Agent endpoint.
    
    Accepts natural language messages and routes them to appropriate
    AI services. Returns structured responses that the frontend can
    render as interactive components (quizzes, flashcards, etc.).
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    try:
        # 1. Parse user intent
        intent = await parse_intent(
            message=req.message,
            source_ids=req.source_ids,
            history=req.conversation_history,
        )
        
        # 2. Execute the action
        result = await executor.execute(
            intent=intent,
            source_ids=req.source_ids,
            user_id=req.user_id,
            history=req.conversation_history,
        )
        
        # 3. Build response
        return AgentResponse(
            type=result.type,
            message=result.message,
            data=result.data,
            requires_confirmation=result.requires_confirmation,
            confirmation_message=result.confirmation_message,
            metadata=result.metadata,
            intent={
                "action": intent.action.value,
                "topic": intent.topic,
                "count": intent.count,
                "difficulty": intent.difficulty,
            },
        )
        
    except Exception as e:
        print(f"[Agent] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ConfirmRequest(BaseModel):
    """Request to confirm a high-risk action"""
    action_id: str
    confirmed: bool
    source_ids: List[str] = []
    user_id: str = "demo_user"


@router.post("/confirm")
async def confirm_action(req: ConfirmRequest):
    """Handle confirmation of high-risk actions"""
    # In production, this would retrieve the pending action from cache
    # and execute it if confirmed
    return {"status": "confirmed" if req.confirmed else "cancelled"}


@router.get("/suggestions")
async def get_suggestions(source_ids: List[str] = [], user_id: str = "demo_user"):
    """
    Get AI-powered suggestions based on current context.
    Used for quick action buttons and smart recommendations.
    """
    suggestions = []
    
    if source_ids:
        suggestions.extend([
            {
                "id": "summarize",
                "label": "Summarize Sources",
                "description": "Get a comprehensive overview of your documents",
                "icon": "FileText",
                "action": "summarize",
            },
            {
                "id": "quiz",
                "label": "Create Quiz",
                "description": "Test your knowledge with AI-generated questions",
                "icon": "CheckSquare",
                "action": "create_quiz",
            },
            {
                "id": "flashcards",
                "label": "Make Flashcards",
                "description": "Generate flashcards from key concepts",
                "icon": "Layers",
                "action": "create_flashcards",
            },
            {
                "id": "study_guide",
                "label": "Study Guide",
                "description": "Create a comprehensive study guide",
                "icon": "BookOpen",
                "action": "create_study_guide",
            },
        ])
    
    # Always include these
    suggestions.extend([
        {
            "id": "explain",
            "label": "Explain Concept",
            "description": "Get a detailed explanation of any topic",
            "icon": "Lightbulb",
            "action": "explain_concept",
        },
        {
            "id": "connections",
            "label": "Find Connections",
            "description": "Discover how topics relate to each other",
            "icon": "Network",
            "action": "find_connections",
        },
    ])
    
    return {"suggestions": suggestions}


@router.get("/health")
async def agent_health():
    """Check if the AI agent is healthy"""
    from app.services.llm import check_ollama_health
    
    health = await check_ollama_health()
    return {
        "status": "healthy" if health.get("ollama_running") else "degraded",
        "ollama": health,
    }
