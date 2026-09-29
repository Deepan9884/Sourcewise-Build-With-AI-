"""
TutorChain — orchestration layer for intelligent tutoring.

Extends RAGChain to coordinate all AI services (ExplanationEngine, SocraticEngine,
PracticeGenerator, KnowledgeGraphBuilder) for intelligent tutoring responses.
"""
from typing import List, Dict, Optional, AsyncIterator
from enum import Enum
from pydantic import BaseModel
from app.services import vector_store, llm as llm_service
from app.services.rag_chain import answer as rag_answer, stream_answer as rag_stream_answer
from app.services.explanation_engine import ExplanationEngine, MasteryLevel
from app.services.socratic_engine import SocraticEngine
from app.services.practice_generator import PracticeGenerator
from app.services.knowledge_graph_builder import build_graph, find_learning_path, detect_knowledge_gaps
from app.services.personality_engine import personality_engine, UserPersona
from app.services.conversation_memory import conversation_memory
from app.config import settings


class TutoringMode(str, Enum):
    """Tutoring modes matching requirements"""
    DIRECT = "direct"
    SOCRATIC = "socratic"
    EXPLORATORY = "exploratory"
    EXAM_PREP = "exam_prep"


class Citation(BaseModel):
    """Source citation"""
    id: int
    chunk_id: str
    source_id: str
    source_name: str
    text: str
    page: int


class RelatedConcept(BaseModel):
    """Related concept with relationship type"""
    concept: str
    relationship: str  # "prerequisite", "related", "extends"
    source_ids: List[str]


class PracticeSuggestion(BaseModel):
    """Practice problem suggestion"""
    concept: str
    difficulty: int
    reason: str


class AlternativeExplanation(BaseModel):
    """Alternative explanation strategy"""
    strategy: str
    content: str
    when_to_use: str


class CrossSourceSynthesis(BaseModel):
    """Cross-source synthesis metadata"""
    sources_used: List[str]  # List of source names
    has_complementary_info: bool
    has_contradictory_info: bool
    synthesis_notes: Optional[str] = None  # Summary of how sources relate


class TutorResponse(BaseModel):
    """Complete tutoring response"""
    main_explanation: str
    strategy_used: str
    alternative_explanations: List[AlternativeExplanation]
    related_concepts: List[RelatedConcept]
    practice_suggestions: List[PracticeSuggestion]
    citations: List[Citation]
    prerequisite_check: Optional[List[str]] = None
    confidence: float
    cross_source_synthesis: Optional[CrossSourceSynthesis] = None


class TutorChain:
    """
    Orchestrates all AI tutoring services to provide intelligent, personalized responses.
    Extends RAGChain functionality with multi-strategy explanations, Socratic teaching,
    and context-aware conversation management.

    Now includes:
    - PersonalityEngine for adaptive, friendly responses
    - ConversationMemory for deep context tracking across sessions
    """
    
    def __init__(self):
        self.explanation_engine = ExplanationEngine()
        self.socratic_engine = SocraticEngine()
        self.practice_generator = PracticeGenerator()
        # Conversation context for multi-turn management
        self._conversation_contexts: Dict[str, Dict] = {}
        # User personas cache (session_id -> UserPersona)
        self._user_personas: Dict[str, UserPersona] = {}
    
    async def explain(
        self,
        question: str,
        source_ids: List[str],
        user_profile: Optional[Dict] = None,
        mode: TutoringMode = TutoringMode.DIRECT,
        history: Optional[List[Dict]] = None,
        session_id: Optional[str] = None
    ) -> TutorResponse:
        """
        Generate comprehensive tutoring response with multiple explanation strategies.
        
        Args:
            question: User's question
            source_ids: List of source document IDs to search
            user_profile: User's learning profile with mastery levels and preferences
            mode: Tutoring mode (direct, socratic, exploratory, exam_prep)
            history: Conversation history for context
            session_id: Session ID for context management
            
        Returns:
            TutorResponse with main explanation, alternatives, related concepts, and more
        """
        # Update conversation context
        if session_id:
            self._update_context(session_id, question, history or [])
        
        # Retrieve relevant chunks from vector store
        chunks = vector_store.query_chunks(
            question=question,
            source_ids=source_ids,
            top_k=settings.TOP_K_CHUNKS,
        )
        
        if not chunks:
            return self._create_no_content_response()
        
        # Build context from chunks with cross-source synthesis
        context = self._build_context_from_chunks_with_synthesis(chunks)
        
        # Analyze cross-source synthesis
        synthesis_metadata = await self._analyze_cross_source_synthesis(chunks, question)
        
        # Determine user mastery level
        user_level = self._get_user_mastery_level(user_profile)
        
        # Determine if this is the first message in the session
        is_first_message = (
            session_id
            and session_id in self._conversation_contexts
            and self._conversation_contexts[session_id].get("turn_count", 0) <= 1
        ) or (session_id and session_id not in self._conversation_contexts)
        
        # Generate response based on tutoring mode
        if mode == TutoringMode.SOCRATIC:
            main_explanation = await self._generate_socratic_response(
                question, context, history or [], session_id, user_profile
            )
            strategy_used = "socratic"
        else:
            # For other modes, use explanation engine with appropriate strategy
            main_explanation, strategy_used = await self._generate_direct_response(
                question, context, user_level, mode, synthesis_metadata,
                session_id=session_id, history=history,
                is_first_message=is_first_message,
            )
        
        # Generate alternative explanations (for direct, exploratory, exam_prep modes)
        alternative_explanations = []
        if mode != TutoringMode.SOCRATIC:
            alternative_explanations = await self._generate_alternatives(
                question, context, user_level, strategy_used
            )
        
        # Extract concepts from question and context using ConceptExtractor
        related_concepts = await self._identify_related_concepts_advanced(
            question, chunks, source_ids
        )
        
        # Generate practice suggestions
        practice_suggestions = self._generate_practice_suggestions(
            question, chunks, mode
        )
        
        # Check for missing prerequisites using KnowledgeGraphBuilder
        prerequisite_check = await self._check_prerequisites(
            question, chunks, user_profile, source_ids
        )
        
        # Build citations
        citations = self._build_citations(chunks)
        
        # Calculate confidence based on chunk relevance
        confidence = self._calculate_confidence(chunks)
        
        return TutorResponse(
            main_explanation=main_explanation,
            strategy_used=strategy_used,
            alternative_explanations=alternative_explanations,
            related_concepts=related_concepts,
            practice_suggestions=practice_suggestions,
            citations=citations,
            prerequisite_check=prerequisite_check,
            confidence=confidence,
            cross_source_synthesis=synthesis_metadata
        )
    
    async def stream_explain(
        self,
        question: str,
        source_ids: List[str],
        user_profile: Optional[Dict] = None,
        mode: TutoringMode = TutoringMode.DIRECT,
        history: Optional[List[Dict]] = None,
        session_id: Optional[str] = None
    ) -> AsyncIterator[Dict]:
        """
        Stream tutoring response for real-time delivery.
        
        Yields SSE-style event dicts:
            {"type": "citations", "data": [...]}
            {"type": "token", "data": "..."}
            {"type": "alternatives", "data": [...]}
            {"type": "related", "data": [...]}
            {"type": "practice", "data": [...]}
            {"type": "done"}
        """
        # Update conversation context
        if session_id:
            self._update_context(session_id, question, history or [])
        
        # Retrieve relevant chunks
        chunks = vector_store.query_chunks(
            question=question,
            source_ids=source_ids,
            top_k=settings.TOP_K_CHUNKS,
        )
        
        if not chunks:
            yield {
                "type": "token",
                "data": "I couldn't find any relevant information in your selected sources."
            }
            yield {"type": "done"}
            return
        
        # Emit citations first
        citations = self._build_citations(chunks)
        yield {"type": "citations", "data": [c.model_dump() for c in citations]}
        
        # Build context with synthesis
        context = self._build_context_from_chunks_with_synthesis(chunks)
        
        # Analyze cross-source synthesis
        synthesis_metadata = await self._analyze_cross_source_synthesis(chunks, question)
        
        # Emit synthesis metadata if available
        if synthesis_metadata:
            yield {"type": "synthesis", "data": synthesis_metadata.model_dump()}
        
        user_level = self._get_user_mastery_level(user_profile)
        
        # Determine if this is the first message in the session
        is_first_message = (
            session_id
            and session_id in self._conversation_contexts
            and self._conversation_contexts[session_id].get("turn_count", 0) <= 1
        ) or (session_id and session_id not in self._conversation_contexts)
        
        # Stream main explanation based on mode
        if mode == TutoringMode.SOCRATIC:
            response = await self._generate_socratic_response(
                question, context, history or [], session_id, user_profile
            )
            yield {"type": "token", "data": response}
            strategy_used = "socratic"
        else:
            response, strategy_used = await self._generate_direct_response(
                question, context, user_level, mode, synthesis_metadata,
                session_id=session_id, history=history,
                is_first_message=is_first_message,
            )
            yield {"type": "token", "data": response}
        
        # Emit alternative explanations
        if mode != TutoringMode.SOCRATIC:
            alternatives = await self._generate_alternatives(
                question, context, user_level, strategy_used
            )
            yield {"type": "alternatives", "data": [a.model_dump() for a in alternatives]}
        
        # Emit related concepts
        related = self._identify_related_concepts(chunks, question)
        yield {"type": "related", "data": [r.model_dump() for r in related]}
        
        # Emit practice suggestions
        practice = self._generate_practice_suggestions(question, chunks, mode)
        yield {"type": "practice", "data": [p.model_dump() for p in practice]}
        
        yield {"type": "done"}
    
    def get_context(self, session_id: str) -> Optional[Dict]:
        """
        Get conversation context for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Context dictionary with conversation history and current topic
        """
        return self._conversation_contexts.get(session_id)
    
    def clear_context(self, session_id: str):
        """
        Clear conversation context for a session.
        
        Args:
            session_id: Session identifier
        """
        if session_id in self._conversation_contexts:
            del self._conversation_contexts[session_id]
    
    # ─── Private Helper Methods ───────────────────────────────────────────────
    
    def _detect_explicit_direct_request(self, question: str) -> bool:
        """
        Detect if user explicitly requests a direct answer.
        
        Looks for phrases like:
        - "just tell me"
        - "give me the answer"
        - "stop asking questions"
        - "I need a direct answer"
        """
        question_lower = question.lower()
        
        direct_request_phrases = [
            "just tell me",
            "just give me",
            "give me the answer",
            "tell me the answer",
            "stop asking",
            "stop with the questions",
            "direct answer",
            "straight answer",
            "i need to know",
            "i don't have time",
            "please just explain",
            "can you just tell",
            "enough questions"
        ]
        
        return any(phrase in question_lower for phrase in direct_request_phrases)
    
    def _detect_frustration_level(
        self,
        history: List[Dict],
        session_id: Optional[str] = None
    ) -> int:
        """
        Detect user frustration level from conversation history.
        
        Returns frustration level 0-5:
        - 0: No frustration signals
        - 1: Minor confusion
        - 2: Repeated questions
        - 3: Multiple confusion signals
        - 4: High frustration (should switch to direct)
        - 5: Extreme frustration
        
        Signals:
        - Repeated similar questions
        - Confusion phrases ("I don't understand", "confused", "lost")
        - Short frustrated responses ("what?", "huh?", "??")
        - Multiple consecutive user messages
        """
        if not history or len(history) < 2:
            return 0
        
        frustration_score = 0
        
        # Get recent history (last 6 messages)
        recent_history = history[-6:]
        user_messages = [h for h in recent_history if h.get("role") == "user"]
        
        if not user_messages:
            return 0
        
        # Signal 1: Multiple consecutive user messages (indicates confusion)
        consecutive_user = 0
        for i in range(len(recent_history) - 1):
            if (recent_history[i].get("role") == "user" and 
                recent_history[i + 1].get("role") == "user"):
                consecutive_user += 1
        
        if consecutive_user >= 2:
            frustration_score += 2
        elif consecutive_user >= 1:
            frustration_score += 1
        
        # Signal 2: Confusion phrases in user messages
        confusion_phrases = [
            "don't understand",
            "confused",
            "lost",
            "not clear",
            "doesn't make sense",
            "still don't get",
            "what do you mean",
            "i'm stuck",
            "help",
            "frustrated"
        ]
        
        confusion_count = 0
        for msg in user_messages:
            content = msg.get("content", "").lower()
            if any(phrase in content for phrase in confusion_phrases):
                confusion_count += 1
        
        if confusion_count >= 2:
            frustration_score += 2
        elif confusion_count >= 1:
            frustration_score += 1
        
        # Signal 3: Short frustrated responses
        short_frustrated = ["what?", "huh?", "??", "what", "huh", "idk", "i don't know"]
        for msg in user_messages[-2:]:  # Check last 2 user messages
            content = msg.get("content", "").lower().strip()
            if content in short_frustrated or (len(content) < 10 and "?" in content):
                frustration_score += 1
        
        # Signal 4: Repeated similar questions (check session context)
        if session_id and session_id in self._conversation_contexts:
            context = self._conversation_contexts[session_id]
            turn_count = context.get("turn_count", 0)
            
            # If many turns without progress, increase frustration
            if turn_count >= 5:
                frustration_score += 1
            if turn_count >= 8:
                frustration_score += 1
        
        # Cap at 5
        return min(frustration_score, 5)
    
    def _get_socratic_difficulty(self, user_profile: Optional[Dict]) -> int:
        """
        Determine Socratic question difficulty based on user profile.
        
        Returns difficulty 1-5 based on user's mastery level and preferences.
        """
        if not user_profile:
            return 3  # Default moderate difficulty
        
        # Check user's mastery level
        mastery_level = self._get_user_mastery_level(user_profile)
        
        # Map mastery to difficulty
        difficulty_map = {
            MasteryLevel.NOVICE: 2,      # Easier questions for beginners
            MasteryLevel.DEVELOPING: 3,   # Moderate questions
            MasteryLevel.PROFICIENT: 4,   # Challenging questions
            MasteryLevel.MASTERY: 5       # Sophisticated questions
        }
        
        difficulty = difficulty_map.get(mastery_level, 3)
        
        # Check if user has hint preference that should adjust difficulty
        preferences = user_profile.get("preferences", {})
        hint_pref = preferences.get("hintPreference", "moderate")
        
        if hint_pref == "generous":
            difficulty = max(1, difficulty - 1)  # Make questions easier
        elif hint_pref == "minimal":
            difficulty = min(5, difficulty + 1)  # Make questions harder
        
        return difficulty
    
    def _update_context(self, session_id: str, question: str, history: List[Dict]):
        """
        Update conversation context for multi-turn management.
        
        Now uses ConversationMemory for deep context tracking including:
        - Topic thread detection
        - User fact extraction
        - Confusion/satisfaction signal detection
        - Running summary generation
        """
        # Initialize conversation memory session if needed
        if session_id not in self._conversation_contexts:
            conversation_memory.init_session(session_id)
            self._conversation_contexts[session_id] = {
                "current_topic": None,
                "concepts_discussed": [],
                "turn_count": 0,
            }
        
        context = self._conversation_contexts[session_id]
        context["turn_count"] += 1
        context["last_question"] = question
        
        # Update conversation memory with the new interaction
        # The AI response will be updated when the response is generated
        conversation_memory.update(
            session_id=session_id,
            user_message=question,
            ai_response="",  # Will be filled after response generation
            history=history,
        )
        
        # Get memory context for response generation
        memory_context = conversation_memory.get_context_for_response(session_id)
        
        # Extract concepts from question (simple keyword extraction)
        words = question.lower().split()
        potential_concepts = [w for w in words if len(w) > 4]
        if potential_concepts:
            context["current_topic"] = potential_concepts[0]
            context["concepts_discussed"].extend(potential_concepts[:3])
        
        # Add memory context to conversation context
        context["memory"] = memory_context
    
    def _build_context_from_chunks(self, chunks: List[Dict]) -> str:
        """Build context string from retrieved chunks"""
        context_parts = []
        for chunk in chunks[:5]:  # Use top 5 chunks
            context_parts.append(f"[{chunk['source_name']}, p.{chunk['page']}]\n{chunk['text']}")
        return "\n\n".join(context_parts)
    
    def _get_user_mastery_level(self, user_profile: Optional[Dict]) -> MasteryLevel:
        """Extract user mastery level from profile"""
        if not user_profile:
            return MasteryLevel.NOVICE
        
        # Look for mastery level in profile
        # This is a simplified version - production would analyze concept-specific mastery
        level_str = user_profile.get("mastery_level", "novice")
        try:
            return MasteryLevel(level_str.lower())
        except ValueError:
            return MasteryLevel.NOVICE
    
    async def _generate_socratic_response(
        self,
        question: str,
        context: str,
        history: List[Dict],
        session_id: Optional[str] = None,
        user_profile: Optional[Dict] = None
    ) -> str:
        """
        Generate Socratic guiding question or hint based on user state.
        
        Implements progressive hint system and frustration detection:
        - Detects explicit requests for direct answers
        - Tracks repeated questions and confusion signals
        - Progressively increases hint specificity
        - Switches to direct explanation when appropriate
        """
        # Check for explicit request to switch to direct mode
        if self._detect_explicit_direct_request(question):
            # User explicitly asked for direct answer
            # Generate direct explanation with pedagogical note
            user_level = self._get_user_mastery_level(user_profile)
            explanation, _ = await self._generate_direct_response(
                question, context, user_level, TutoringMode.DIRECT, None,
                session_id=session_id, history=history,
            )
            return (
                f"{explanation}\n\n"
                "I have provided a direct answer as requested. "
                "Remember, discovering answers through guided questions often leads to deeper understanding!"
            )
        
        # Detect frustration level and determine hint progression
        frustration_level = self._detect_frustration_level(history, session_id)
        
        # High frustration: provide direct explanation
        if frustration_level >= 4:
            user_level = self._get_user_mastery_level(user_profile)
            explanation, _ = await self._generate_direct_response(
                question, context, user_level, TutoringMode.DIRECT, None,
                session_id=session_id, history=history,
            )
            return (
                f"{explanation}\n\n"
                "I noticed you might be struggling with this concept, so I have provided a direct explanation. "
                "Feel free to ask follow-up questions!"
            )
        
        # Moderate frustration: provide progressive hints
        if frustration_level >= 2:
            # Map frustration level to hint level (2-4)
            hint_level = min(frustration_level + 1, 5)
            hint = await self.socratic_engine.generate_hint(question, context, hint_level)
            
            # Add encouragement based on hint level
            if hint_level >= 4:
                encouragement = "\n\n💡 This is a substantial hint. You're very close to the answer!"
            elif hint_level >= 3:
                encouragement = "\n\n💡 Think about this hint carefully. You're making progress!"
            else:
                encouragement = "\n\n💡 Consider this clue and see if it helps you move forward."
            
            return hint + encouragement
        
        # Low/no frustration: generate guiding question
        # Adjust difficulty based on user profile
        difficulty = self._get_socratic_difficulty(user_profile)
        return await self.socratic_engine.generate_guiding_question(
            question, context, difficulty
        )
    
    async def _generate_direct_response(
        self,
        question: str,
        context: str,
        user_level: MasteryLevel,
        mode: TutoringMode,
        synthesis_metadata: Optional[CrossSourceSynthesis] = None,
        session_id: Optional[str] = None,
        history: Optional[List[Dict]] = None,
        is_first_message: bool = False,
    ) -> tuple[str, str]:
        """
        Generate direct explanation response with adaptive personality.
        
        Uses PersonalityEngine to create responses that match the user's
        communication style - making the AI feel warm and ChatGPT-like.
        
        Args:
            question: User's question
            context: Context from retrieved chunks
            user_level: User's mastery level
            mode: Tutoring mode
            synthesis_metadata: Cross-source synthesis information
            session_id: Session ID for persona lookup
            history: Conversation history for pattern analysis
            is_first_message: Whether this is the session's first message
        
        Returns:
            Tuple of (explanation, strategy_used)
        """
        # Enhance context with synthesis instructions if multiple sources
        enhanced_context = context
        if synthesis_metadata and len(synthesis_metadata.sources_used) > 1:
            synthesis_instruction = "\n\n=== CROSS-SOURCE SYNTHESIS ===\n"
            synthesis_instruction += f"You are working with {len(synthesis_metadata.sources_used)} sources: {', '.join(synthesis_metadata.sources_used)}.\n"
            
            if synthesis_metadata.has_complementary_info:
                synthesis_instruction += "These sources provide COMPLEMENTARY information - integrate their different perspectives and details.\n"
            
            if synthesis_metadata.has_contradictory_info:
                synthesis_instruction += "These sources contain CONTRADICTORY information - highlight the differences and explain both viewpoints.\n"
            
            if synthesis_metadata.synthesis_notes:
                synthesis_instruction += f"Note: {synthesis_metadata.synthesis_notes}\n"
            
            enhanced_context = context + synthesis_instruction
        
        # Get or create user persona for adaptive responses
        persona = self._get_or_create_persona(session_id, history)
        
        # Generate adaptive system prompt using PersonalityEngine
        system_prompt = personality_engine.generate_system_prompt(
            persona=persona,
            context=enhanced_context,
            mode=mode.value,
            is_first_message=is_first_message,
        )
        
        # Select strategy based on mode and user level
        explanation = ""
        strategy = ""
        
        if mode == TutoringMode.EXAM_PREP:
            explanation = await self._generate_with_personality(
                question, enhanced_context, system_prompt, user_level, "stepwise"
            )
            strategy = "stepwise"
        elif mode == TutoringMode.EXPLORATORY:
            explanation = await self._generate_with_personality(
                question, enhanced_context, system_prompt, user_level, "example"
            )
            strategy = "example"
        else:
            # For direct mode, use analogy as default
            explanation = await self._generate_with_personality(
                question, enhanced_context, system_prompt, user_level, "analogy"
            )
            strategy = "analogy"
        
        return explanation, strategy
    
    def _get_or_create_persona(
        self,
        session_id: Optional[str],
        history: Optional[List[Dict]] = None
    ) -> UserPersona:
        """
        Get or create a UserPersona for adaptive responses.
        
        Analyzes conversation history to detect communication patterns
        and builds/updates the user's persona.
        """
        if session_id and session_id in self._user_personas:
            persona = self._user_personas[session_id]
        else:
            persona = UserPersona()
        
        # Analyze patterns from history if available
        if history:
            patterns = personality_engine.analyze_message_patterns(history)
            if patterns:
                persona = personality_engine.update_persona(persona, patterns)
        
        # Cache the persona
        if session_id:
            self._user_personas[session_id] = persona
        
        return persona
    
    async def _generate_with_personality(
        self,
        question: str,
        context: str,
        system_prompt: str,
        user_level: MasteryLevel,
        strategy: str
    ) -> str:
        """
        Generate explanation using the adaptive system prompt from PersonalityEngine.
        
        This replaces the standard ExplanationEngine calls to use the more
        natural, personality-driven prompts.
        """
        from app.services.llm import raw_chat
        
        # Build the user message with context and question
        user_message = f"""SOURCE MATERIAL:
{context}

---

QUESTION: {question}

Please explain this concept using a {strategy}-based approach. Stay grounded in the source material while being warm, clear, and engaging."""
        
        try:
            return await raw_chat(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.4
            )
        except Exception as e:
            print(f"[TutorChain] Personality generation failed, falling back: {e}")
            # Fallback to standard explanation engine
            if strategy == "analogy":
                return await self.explanation_engine.generate_analogy(question, context, user_level)
            elif strategy == "example":
                return await self.explanation_engine.generate_example(question, context, user_level)
            else:
                return await self.explanation_engine.generate_stepwise(question, context, user_level)
    
    async def _generate_alternatives(
        self,
        question: str,
        context: str,
        user_level: MasteryLevel,
        primary_strategy: str
    ) -> List[AlternativeExplanation]:
        """Generate alternative explanation strategies"""
        alternatives = []
        
        # Generate 2 alternative strategies different from primary
        strategies = ["analogy", "example", "stepwise"]
        strategies.remove(primary_strategy)
        
        for strategy in strategies[:2]:
            if strategy == "analogy":
                content = await self.explanation_engine.generate_analogy(
                    question, context, user_level
                )
                when_to_use = "Use when you want to relate the concept to something familiar"
            elif strategy == "example":
                content = await self.explanation_engine.generate_example(
                    question, context, user_level
                )
                when_to_use = "Use when you want to see concrete instances"
            else:  # stepwise
                content = await self.explanation_engine.generate_stepwise(
                    question, context, user_level
                )
                when_to_use = "Use when you want a step-by-step breakdown"
            
            alternatives.append(AlternativeExplanation(
                strategy=strategy,
                content=content,
                when_to_use=when_to_use
            ))
        
        return alternatives
    
    def _build_context_from_chunks_with_synthesis(self, chunks: List[Dict]) -> str:
        """
        Build context string from retrieved chunks with cross-source synthesis.
        Identifies complementary and contradictory information across sources.
        """
        if not chunks:
            return ""
        
        # Group chunks by source
        chunks_by_source = {}
        for chunk in chunks[:8]:  # Use top 8 chunks for better coverage
            source_id = chunk["source_id"]
            if source_id not in chunks_by_source:
                chunks_by_source[source_id] = []
            chunks_by_source[source_id].append(chunk)
        
        # Build context with source grouping
        context_parts = []
        
        if len(chunks_by_source) > 1:
            # Multiple sources - highlight cross-source synthesis
            context_parts.append("Information from multiple sources:\n")
            for source_id, source_chunks in chunks_by_source.items():
                source_name = source_chunks[0]["source_name"]
                context_parts.append(f"\n=== From {source_name} ===")
                for chunk in source_chunks[:3]:  # Top 3 chunks per source
                    context_parts.append(f"[p.{chunk['page']}] {chunk['text']}")
            
            # Add synthesis instructions for LLM
            context_parts.append("\n\n=== SYNTHESIS INSTRUCTIONS ===")
            context_parts.append(
                "When explaining this concept, analyze the information from all sources above. "
                "Identify where sources complement each other (add different details or perspectives) "
                "and where they contradict each other (provide conflicting information). "
                "Create a unified explanation that integrates multiple perspectives and highlights "
                "any important differences in how sources treat this concept."
            )
        else:
            # Single source - standard format
            for chunk in chunks[:5]:
                context_parts.append(f"[{chunk['source_name']}, p.{chunk['page']}]\n{chunk['text']}")
        
        return "\n\n".join(context_parts)
    
    async def _analyze_cross_source_synthesis(
        self,
        chunks: List[Dict],
        question: str
    ) -> Optional[CrossSourceSynthesis]:
        """
        Analyze chunks from multiple sources to detect complementary and contradictory information.
        
        Args:
            chunks: Retrieved chunks from vector store
            question: User's question for context
            
        Returns:
            CrossSourceSynthesis metadata or None if only one source
        """
        if not chunks:
            return None
        
        # Group chunks by source
        chunks_by_source = {}
        for chunk in chunks[:8]:
            source_id = chunk["source_id"]
            if source_id not in chunks_by_source:
                chunks_by_source[source_id] = {
                    "name": chunk["source_name"],
                    "chunks": []
                }
            chunks_by_source[source_id]["chunks"].append(chunk)
        
        # If only one source, no synthesis needed
        if len(chunks_by_source) <= 1:
            return None
        
        # Build prompt to analyze cross-source relationships
        source_names = [info["name"] for info in chunks_by_source.values()]
        
        analysis_prompt = f"""Analyze the following information from multiple sources about: {question}

"""
        
        for source_id, info in chunks_by_source.items():
            analysis_prompt += f"\n=== From {info['name']} ===\n"
            for chunk in info["chunks"][:2]:  # Top 2 chunks per source
                analysis_prompt += f"{chunk['text']}\n\n"
        
        analysis_prompt += """
Analyze these sources and answer:
1. Do the sources provide COMPLEMENTARY information (different details/perspectives that add to each other)? Answer YES or NO.
2. Do the sources provide CONTRADICTORY information (conflicting claims or disagreements)? Answer YES or NO.
3. In 1-2 sentences, summarize how these sources relate to each other.

Format your response as:
COMPLEMENTARY: [YES/NO]
CONTRADICTORY: [YES/NO]
SUMMARY: [Your 1-2 sentence summary]
"""
        
        try:
            # Use LLM to analyze cross-source relationships via raw_chat
            from app.services.llm import raw_chat
            
            analysis_response = await raw_chat(
                [
                    {
                        "role": "system",
                        "content": "You are an expert at analyzing and comparing information from multiple sources."
                    },
                    {
                        "role": "user",
                        "content": analysis_prompt
                    }
                ],
                temperature=0.3
            )
            
            # Parse the response
            has_complementary = False
            has_contradictory = False
            synthesis_notes = None
            
            lines = analysis_response.strip().split("\n")
            for line in lines:
                line = line.strip()
                if line.startswith("COMPLEMENTARY:"):
                    has_complementary = "YES" in line.upper()
                elif line.startswith("CONTRADICTORY:"):
                    has_contradictory = "YES" in line.upper()
                elif line.startswith("SUMMARY:"):
                    synthesis_notes = line.replace("SUMMARY:", "").strip()
            
            return CrossSourceSynthesis(
                sources_used=source_names,
                has_complementary_info=has_complementary,
                has_contradictory_info=has_contradictory,
                synthesis_notes=synthesis_notes
            )
            
        except Exception as e:
            print(f"[TutorChain] Error analyzing cross-source synthesis: {e}")
            # Return basic synthesis info without detailed analysis
            return CrossSourceSynthesis(
                sources_used=source_names,
                has_complementary_info=True,  # Assume complementary by default
                has_contradictory_info=False,
                synthesis_notes=f"Information drawn from {len(source_names)} sources."
            )
    
    async def _identify_related_concepts_advanced(
        self,
        question: str,
        chunks: List[Dict],
        source_ids: List[str]
    ) -> List[RelatedConcept]:
        """
        Identify related concepts using ConceptExtractor and KnowledgeGraphBuilder.
        This replaces the simple keyword extraction approach.
        """
        from app.services.concept_extractor import extract_concepts, find_related_concepts
        
        related = []
        
        try:
            # Extract main concepts from the question and top chunks
            all_concepts = []
            
            # Extract concepts from question
            question_concepts = await extract_concepts(question, source_ids[0] if source_ids else "query")
            all_concepts.extend(question_concepts)
            
            # Extract concepts from top chunks
            for chunk in chunks[:3]:
                chunk_concepts = await extract_concepts(chunk["text"], chunk["source_id"])
                all_concepts.extend(chunk_concepts)
            
            # Get unique concept names
            concept_names = list(set(c.name for c in all_concepts))
            
            # For each main concept, find related concepts using ConceptExtractor
            for concept_name in concept_names[:3]:  # Limit to top 3 concepts
                concept_links = await find_related_concepts(concept_name, source_ids)
                
                for link in concept_links[:2]:  # Top 2 related concepts per main concept
                    # Avoid duplicates
                    if not any(r.concept == link.related_concept for r in related):
                        related.append(RelatedConcept(
                            concept=link.related_concept,
                            relationship=link.relationship_type,
                            source_ids=link.source_ids
                        ))
                    
                    if len(related) >= 5:  # Cap at 5 related concepts
                        break
                
                if len(related) >= 5:
                    break
            
            # If we didn't find enough related concepts, fall back to simple extraction
            if len(related) < 3:
                fallback_concepts = self._identify_related_concepts(chunks, question)
                for concept in fallback_concepts:
                    if not any(r.concept == concept.concept for r in related):
                        related.append(concept)
                        if len(related) >= 5:
                            break
            
        except Exception as e:
            print(f"[TutorChain] Error in advanced concept identification: {e}")
            # Fall back to simple keyword extraction
            related = self._identify_related_concepts(chunks, question)
        
        return related
    
    async def _check_prerequisites(
        self,
        question: str,
        chunks: List[Dict],
        user_profile: Optional[Dict],
        source_ids: List[str]
    ) -> Optional[List[str]]:
        """
        Check for missing prerequisites using KnowledgeGraphBuilder.
        Returns list of prerequisite concepts the user may need to learn first.
        """
        try:
            # Extract concepts from the question
            from app.services.concept_extractor import extract_concepts, identify_prerequisites
            
            # Get main concepts from question
            question_concepts = await extract_concepts(question, source_ids[0] if source_ids else "query")
            
            if not question_concepts:
                return None
            
            # Get user's known concepts from profile
            user_knowledge = set()
            if user_profile and "concept_mastery" in user_profile:
                # Extract concepts where user has at least "developing" mastery
                for mastery in user_profile["concept_mastery"]:
                    if mastery.get("level") in ["developing", "proficient", "mastery"]:
                        user_knowledge.add(mastery.get("concept", ""))
            
            # Build concept graph from sources
            graph = await build_graph(source_ids)
            
            # Get target concepts from question
            target_concepts = set(c.name for c in question_concepts[:3])  # Top 3 concepts
            
            # Detect knowledge gaps
            gaps = detect_knowledge_gaps(user_knowledge, target_concepts, graph)
            
            # Return gaps if any found
            if gaps:
                return gaps[:5]  # Cap at 5 prerequisites
            
            return None
            
        except Exception as e:
            print(f"[TutorChain] Error checking prerequisites: {e}")
            return None
    
    def _identify_related_concepts(
        self,
        chunks: List[Dict],
        question: str
    ) -> List[RelatedConcept]:
        """Identify related concepts from chunks (simplified fallback version)"""
        # This is a fallback implementation for when advanced extraction fails
        related = []
        
        # Extract potential concepts from chunks (simple keyword extraction)
        seen_concepts = set()
        for chunk in chunks[:3]:
            words = chunk["text"].split()
            # Look for capitalized words or technical terms
            for i, word in enumerate(words):
                if len(word) > 5 and (word[0].isupper() or "_" in word):
                    concept = word.strip(".,;:!?")
                    if concept not in seen_concepts and concept.lower() not in question.lower():
                        seen_concepts.add(concept)
                        related.append(RelatedConcept(
                            concept=concept,
                            relationship="related",
                            source_ids=[chunk["source_id"]]
                        ))
                        if len(related) >= 3:
                            break
            if len(related) >= 3:
                break
        
        return related
    
    def _generate_practice_suggestions(
        self,
        question: str,
        chunks: List[Dict],
        mode: TutoringMode
    ) -> List[PracticeSuggestion]:
        """Generate practice problem suggestions based on the topic and mode"""
        suggestions = []
        concept = self._extract_main_concept(question)

        if mode == TutoringMode.EXAM_PREP:
            suggestions.extend([
                PracticeSuggestion(
                    concept=concept, difficulty=2,
                    reason="Warm up with a basic recall question to solidify foundations"
                ),
                PracticeSuggestion(
                    concept=concept, difficulty=3,
                    reason="Test your understanding with an application question"
                ),
                PracticeSuggestion(
                    concept=concept, difficulty=4,
                    reason="Challenge yourself with an analysis-level problem"
                ),
            ])
        elif mode == TutoringMode.SOCRATIC:
            suggestions.append(PracticeSuggestion(
                concept=concept, difficulty=3,
                reason="Continue exploring this concept through guided questions"
            ))
        elif mode == TutoringMode.EXPLORATORY:
            suggestions.extend([
                PracticeSuggestion(
                    concept=concept, difficulty=2,
                    reason="Explore this concept with concrete examples"
                ),
                PracticeSuggestion(
                    concept=concept, difficulty=3,
                    reason="Compare this concept with related topics"
                ),
            ])
        else:
            suggestions.extend([
                PracticeSuggestion(
                    concept=concept, difficulty=2,
                    reason="Reinforce your understanding with a practice question"
                ),
                PracticeSuggestion(
                    concept=concept, difficulty=3,
                    reason="Test deeper understanding with an application problem"
                ),
            ])

        return suggestions
    
    def _extract_main_concept(self, question: str) -> str:
        """Extract main concept from question (simplified)"""
        # Remove common question words
        stop_words = {"what", "how", "why", "when", "where", "is", "are", "the", "a", "an", "does", "do"}
        words = question.lower().split()
        content_words = [w.strip("?.,;:!") for w in words if w.lower() not in stop_words]
        
        # Return first significant word or phrase (up to 3 words for better concept capture)
        if content_words:
            return " ".join(content_words[:3])
        return "this concept"
    
    def _build_citations(self, chunks: List[Dict]) -> List[Citation]:
        """Build citation list from chunks"""
        citations = []
        for i, chunk in enumerate(chunks[:4]):  # Cap at 4 citations
            citations.append(Citation(
                id=i + 1,
                chunk_id=chunk["chunk_id"],
                source_id=chunk["source_id"],
                source_name=chunk["source_name"],
                text=chunk["text"][:280] + ("..." if len(chunk["text"]) > 280 else ""),
                page=chunk["page"]
            ))
        return citations
    
    def _calculate_confidence(self, chunks: List[Dict]) -> float:
        """Calculate confidence score based on chunk relevance"""
        if not chunks:
            return 0.0
        
        # Simple confidence based on number of chunks found
        # Production version would use semantic similarity scores
        if len(chunks) >= 5:
            return 0.9
        elif len(chunks) >= 3:
            return 0.75
        elif len(chunks) >= 1:
            return 0.6
        return 0.3
    
    def _create_no_content_response(self) -> TutorResponse:
        """Create response when no relevant content is found"""
        return TutorResponse(
            main_explanation="I couldn't find any relevant information in your selected sources. Please make sure you have uploaded and selected the correct documents.",
            strategy_used="direct",
            alternative_explanations=[],
            related_concepts=[],
            practice_suggestions=[],
            citations=[],
            prerequisite_check=None,
            confidence=0.0
        )
