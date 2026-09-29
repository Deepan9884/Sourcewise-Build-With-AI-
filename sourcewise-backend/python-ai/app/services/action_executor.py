"""
Action Executor — Routes parsed intents to appropriate AI services.

Takes a ParsedIntent and executes the corresponding action using
existing AI services (PracticeGenerator, TutorChain, etc.)
"""
import json
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.services.intent_parser import ParsedIntent, ActionType
from app.services import vector_store, llm as llm_service


class ActionResult(BaseModel):
    """Result of an executed action"""
    type: str  # "chat" | "quiz" | "flashcards" | "summary" | "planner" | "audio" | "study_guide" | "notes"
    data: Optional[Dict[str, Any]] = None
    message: str  # AI message to display
    requires_confirmation: bool = False  # High-risk actions
    confirmation_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ActionExecutor:
    """
    Executes AI actions by routing to appropriate services.
    Implements smart defaults: autonomous for low-risk, confirm for high-risk.
    """
    
    # Actions that require user confirmation
    HIGH_RISK_ACTIONS = {
        ActionType.CREATE_PLANNER,
    }
    
    async def execute(
        self,
        intent: ParsedIntent,
        source_ids: List[str],
        user_id: str = "demo_user",
        history: Optional[List[Dict]] = None,
    ) -> ActionResult:
        """
        Execute the parsed intent and return results.
        
        Args:
            intent: Parsed intent from IntentParser
            source_ids: Selected source document IDs
            user_id: Current user ID
            history: Conversation history
            
        Returns:
            ActionResult with type, data, and AI message
        """
        # Check if action requires confirmation
        requires_confirmation = intent.action in self.HIGH_RISK_ACTIONS
        
        try:
            match intent.action:
                case ActionType.CREATE_QUIZ:
                    return await self._create_quiz(intent, source_ids, user_id)
                
                case ActionType.CREATE_FLASHCARDS:
                    return await self._create_flashcards(intent, source_ids, user_id)
                
                case ActionType.SUMMARIZE:
                    return await self._summarize(intent, source_ids, user_id)
                
                case ActionType.CREATE_PLANNER:
                    return await self._create_planner(intent, source_ids, user_id, requires_confirmation)
                
                case ActionType.TUTOR:
                    return await self._tutor(intent, source_ids, user_id, history)
                
                case ActionType.GENERATE_AUDIO:
                    return await self._generate_audio(intent, source_ids, user_id)
                
                case ActionType.CREATE_STUDY_GUIDE:
                    return await self._create_study_guide(intent, source_ids, user_id)
                
                case ActionType.CREATE_NOTES:
                    return await self._create_notes(intent, source_ids, user_id)
                
                case ActionType.EXPLAIN_CONCEPT:
                    return await self._explain_concept(intent, source_ids, user_id, history)
                
                case ActionType.FIND_CONNECTIONS:
                    return await self._find_connections(intent, source_ids, user_id)
                
                case ActionType.ANALYZE_SOURCE:
                    return await self._analyze_source(intent, source_ids, user_id)
                
                case ActionType.CHAT | _:
                    return await self._chat(intent, source_ids, user_id, history)
                    
        except Exception as e:
            print(f"[ActionExecutor] Error executing {intent.action}: {e}")
            return ActionResult(
                type="chat",
                message=f"I encountered an error while processing your request. Let me try a different approach.\n\nError: {str(e)}",
                data=None,
            )
    
    async def _create_quiz(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str
    ) -> ActionResult:
        """Generate quiz questions from sources using LLM"""
        topic = intent.topic or "general knowledge"
        count = intent.count or 5
        
        # Get chunks from sources
        chunks = vector_store.query_chunks(
            question=f"quiz on {topic}",
            source_ids=source_ids,
            top_k=10,
        )
        
        if not chunks:
            return ActionResult(
                type="chat",
                message="Please select sources first to generate a quiz.",
            )
        
        # Generate quiz using LLM
        quiz_prompt = f"""Create {count} quiz questions about: {topic}

Based on the source material provided.

FORMAT each question EXACTLY like this:
Q: [question text]
A: [option A]
B: [option B]
C: [option C]
D: [option D]
ANSWER: [correct letter]
EXPLANATION: [why this is correct]

--- (separator between questions)

Create exactly {count} questions. Be direct and factual."""
        
        response = await llm_service.chat_action(
            question=quiz_prompt,
            context_chunks=chunks,
            history=[],
            action_type="create_quiz",
        )
        
        # Parse questions from response
        questions = self._parse_quiz_questions(response, count)
        
        message = f"Created {len(questions)} quiz questions about **{topic}**.\n\nClick **Start Quiz** below to begin!"
        
        return ActionResult(
            type="quiz",
            data={
                "questions": questions,
                "topic": topic,
                "source_ids": source_ids,
            },
            message=message,
            metadata={"question_count": len(questions)},
        )
    
    def _parse_quiz_questions(self, text: str, expected_count: int) -> list:
        """Parse quiz questions from LLM response"""
        import re
        questions = []
        
        # Split by separator or double newline or **QN**:
        blocks = re.split(r'\n---\n|\n\n\n|\*\*Q\d+\*\*', text)
        
        for block in blocks:
            if not block.strip():
                continue
            
            # Match Q: or **Q**: or similar patterns
            q_match = re.search(r'(?:Q:|Question:)\s*(.+?)(?:\n|$)', block)
            if not q_match:
                # Try to find first line as question
                lines = block.strip().split('\n')
                if lines and len(lines[0]) > 10:
                    q_match = type('obj', (object,), {'group': lambda self, n: lines[0].strip()})()
            
            if not q_match:
                continue
            
            options = []
            for letter in ['A', 'B', 'C', 'D']:
                opt_match = re.search(rf'{letter}\)\s*(.+?)(?:\n|$)', block)
                if not opt_match:
                    opt_match = re.search(rf'{letter}:\s*(.+?)(?:\n|$)', block)
                if opt_match:
                    options.append(opt_match.group(1).strip())
            
            answer_match = re.search(r'ANSWER:\s*([A-D])', block, re.IGNORECASE)
            explanation_match = re.search(r'EXPLANATION:\s*(.+?)(?:\n|$)', block)
            
            if q_match and len(options) >= 4:
                answer_idx = 'ABCD'.index(answer_match.group(1).upper()) if answer_match else 0
                questions.append({
                    "q": q_match.group(1).strip(),
                    "options": options[:4],
                    "answer": answer_idx,
                    "explanation": explanation_match.group(1).strip() if explanation_match else "",
                    "topic": "General"
                })
        
        return questions[:expected_count] if questions else []
    
    async def _create_flashcards(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str
    ) -> ActionResult:
        """Generate flashcards from sources using LLM"""
        topic = intent.topic or "key concepts"
        count = intent.count or 10
        
        # Get chunks from sources
        chunks = vector_store.query_chunks(
            question=f"flashcards about {topic}",
            source_ids=source_ids,
            top_k=10,
        )
        
        if not chunks:
            return ActionResult(
                type="chat",
                message="Please select sources first to generate flashcards.",
            )
        
        # Generate flashcards using LLM
        cards_prompt = f"""Create {count} flashcards about: {topic}

Based on the source material provided.

FORMAT each flashcard EXACTLY like this:
FRONT: [question or term]
BACK: [answer or definition]

--- (separator between cards)

Create exactly {count} cards. Be concise and factual."""
        
        response = await llm_service.chat_action(
            question=cards_prompt,
            context_chunks=chunks,
            history=[],
            action_type="create_flashcards",
        )
        
        # Parse flashcards from response
        cards = self._parse_flashcards(response, count)
        
        message = f"Created {len(cards)} flashcards about **{topic}**.\n\nClick **Study Now** to start reviewing!"
        
        return ActionResult(
            type="flashcards",
            data={
                "cards": cards,
                "topic": topic,
                "source_ids": source_ids,
            },
            message=message,
            metadata={"card_count": len(cards)},
        )
    
    def _parse_flashcards(self, text: str, expected_count: int) -> list:
        """Parse flashcards from LLM response"""
        import re
        cards = []
        
        # Split by separator or card markers
        blocks = re.split(r'\n---\n|\n\n\n|\*\*Card\s*\d+\*\*', text)
        
        for block in blocks:
            if not block.strip():
                continue
            
            front_match = re.search(r'(?:FRONT|Term|Question):\s*(.+?)(?:\n|$)', block)
            back_match = re.search(r'(?:BACK|Answer|Definition):\s*(.+?)(?:\n|$)', block)
            
            if front_match and back_match:
                cards.append({
                    "front": front_match.group(1).strip(),
                    "back": back_match.group(1).strip(),
                })
            else:
                # Try to parse as two-line pairs
                lines = [l.strip() for l in block.strip().split('\n') if l.strip()]
                if len(lines) >= 2:
                    cards.append({
                        "front": lines[0].lstrip('-* ').strip(),
                        "back": lines[1].lstrip('-* ').strip(),
                    })
        
        return cards[:expected_count] if cards else []
    
    async def _summarize(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str
    ) -> ActionResult:
        """Generate comprehensive summary of sources"""
        from app.services.explanation_engine import ExplanationEngine
        
        engine = ExplanationEngine()
        
        # Get chunks from sources
        chunks = vector_store.query_chunks(
            question="main topics key concepts summary",
            source_ids=source_ids,
            top_k=15,
        )
        
        if not chunks:
            return ActionResult(
                type="chat",
                message="I couldn't find any content in your selected sources to summarize. Please make sure you have uploaded and selected documents.",
            )
        
        # Build context
        context = "\n\n".join([
            f"[{c['source_name']}, p.{c['page']}]\n{c['text']}"
            for c in chunks[:10]
        ])
        
        # Generate summary using LLM
        summary_prompt = f"""Create a comprehensive summary of the following study materials.

SOURCES:
{context}

Provide:
1. **Executive Summary** (2-3 sentences)
2. **Key Concepts** (bullet points)
3. **Important Details** (organized by topic)
4. **Key Takeaways** (what to remember for exams)

Format with clear headings and bullet points."""
        
        summary = await llm_service.chat_action(
            question=summary_prompt,
            context_chunks=chunks,
            history=[],
            action_type="summarize",
        )
        
        # Count unique sources
        unique_sources = list(set(c['source_name'] for c in chunks))
        
        message = f"I've analyzed **{len(unique_sources)} source(s)** and created a comprehensive summary.\n\n"
        message += "**Quick Actions:**\n"
        message += "- Click **Export** to save as notes\n"
        message += "- Click **Create Flashcards** to make cards from key points\n"
        message += "- Click **Create Quiz** to test on this material"
        
        return ActionResult(
            type="summary",
            data={
                "summary": summary,
                "source_count": len(unique_sources),
                "sources": unique_sources,
                "chunk_count": len(chunks),
            },
            message=message,
            metadata={"source_count": len(unique_sources)},
        )
    
    async def _create_planner(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str,
        requires_confirmation: bool = False
    ) -> ActionResult:
        """Generate study plan as structured JSON"""
        exam_date = intent.exam_date or "1 week from now"
        topic = intent.topic or "your study material"
        daily_hours = intent.metadata.get('daily_hours', 2) if intent.metadata else 2
        
        # Get content overview
        chunks = vector_store.query_chunks(
            question="main topics chapters concepts",
            source_ids=source_ids,
            top_k=10,
        )
        
        context = "\n".join([
            f"- {c['source_name']}: {c['text'][:100]}..."
            for c in chunks[:5]
        ]) if chunks else "No specific content available"
        
        planner_prompt = f"""Create a detailed study plan as JSON for: {topic}
Exam date: {exam_date}
Daily study hours: {daily_hours}

Available study material:
{context}

Return ONLY valid JSON with this exact structure:
{{
  "title": "Study Plan for {topic}",
  "days": [
    {{
      "name": "Day 1",
      "topics": ["Topic 1", "Topic 2"],
      "activities": ["Read chapter 1", "Review flashcards"],
      "duration": "2 hours",
      "status": "pending",
      "milestone": false
    }}
  ],
  "milestones": [],
  "totalDays": 7,
  "dailyHours": {daily_hours}
}}

Rules:
- Create 5-7 days of study
- Include review sessions
- Build in practice quizzes
- Mark milestone days (25%, 50%, 75%, 100%)
- Each day should have 2-4 topics
- Duration should match dailyHours
- Return ONLY the JSON, no other text"""
        
        plan_text = await llm_service.chat_action(
            question=planner_prompt,
            context_chunks=chunks,
            history=[],
            action_type="create_planner",
        )
        
        # Parse JSON from response
        import re
        try:
            json_match = re.search(r'\{[\s\S]*\}', plan_text)
            if json_match:
                plan_data = json.loads(json_match.group())
            else:
                plan_data = self._create_fallback_plan(topic, exam_date, daily_hours)
        except json.JSONDecodeError:
            plan_data = self._create_fallback_plan(topic, exam_date, daily_hours)
        
        message = f"I've created a personalized study plan for **{topic}**.\n\n"
        
        if requires_confirmation:
            message += "**⚠️ This will update your study planner.**\n\n"
        
        return ActionResult(
            type="planner",
            data={
                "plan": plan_data,
                "topic": topic,
                "exam_date": exam_date,
                "source_ids": source_ids,
            },
            message=message,
            requires_confirmation=requires_confirmation,
            confirmation_message=f"This will create a new study plan for {topic}. Continue?",
        )
    
    def _create_fallback_plan(self, topic, exam_date, daily_hours):
        """Create a basic fallback plan if JSON parsing fails"""
        return {
            "title": f"Study Plan for {topic}",
            "days": [
                {
                    "name": f"Day {i+1}",
                    "topics": [f"Topic {i+1}"],
                    "activities": ["Read and review"],
                    "duration": f"{daily_hours} hours",
                    "status": "pending",
                    "milestone": i in [1, 3, 5],
                }
                for i in range(5)
            ],
            "milestones": [
                {"threshold": 25, "label": "25% Complete"},
                {"threshold": 50, "label": "50% Complete"},
                {"threshold": 75, "label": "75% Complete"},
                {"threshold": 100, "label": "100% Complete"},
            ],
            "totalDays": 5,
            "dailyHours": daily_hours,
        }
    
    async def _tutor(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str,
        history: Optional[List[Dict]] = None
    ) -> ActionResult:
        """Tutor mode with Socratic method"""
        from app.services.tutor_chain import TutorChain, TutoringMode
        
        tutor = TutorChain()
        mode_str = intent.mode or "direct"
        
        try:
            mode = TutoringMode(mode_str)
        except ValueError:
            mode = TutoringMode.DIRECT
        
        response = await tutor.explain(
            question=intent.question or "Help me understand this topic",
            source_ids=source_ids,
            mode=mode,
            history=history,
        )
        
        message = response.main_explanation
        
        # Add related concepts if available
        if response.related_concepts:
            message += "\n\n**Related Concepts:**\n"
            for concept in response.related_concepts[:3]:
                message += f"- {concept.concept} ({concept.relationship})\n"
        
        # Add practice suggestions
        if response.practice_suggestions:
            message += "\n**Practice Suggestions:**\n"
            for suggestion in response.practice_suggestions[:2]:
                message += f"- {suggestion.reason}\n"
        
        return ActionResult(
            type="chat",
            data={
                "explanation": response.main_explanation,
                "strategy": response.strategy_used,
                "alternatives": [a.model_dump() for a in response.alternative_explanations],
                "related_concepts": [r.model_dump() for r in response.related_concepts],
                "practice_suggestions": [p.model_dump() for p in response.practice_suggestions],
                "citations": [c.model_dump() for c in response.citations],
                "confidence": response.confidence,
            },
            message=message,
        )
    
    async def _generate_audio(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str
    ) -> ActionResult:
        """Generate audio content from sources"""
        topic = intent.topic or "your study material"
        
        # Get relevant content
        chunks = vector_store.query_chunks(
            question=topic,
            source_ids=source_ids,
            top_k=5,
        )
        
        if not chunks:
            return ActionResult(
                type="chat",
                message=f"I couldn't find content about **{topic}** in your sources. Please select different sources or try a different topic.",
            )
        
        # Generate audio script
        script_prompt = f"""Create a podcast-style audio script about: {topic}

Based on these sources:
{chr(10).join([f"[{c['source_name']}] {c['text'][:200]}" for c in chunks[:3]])}

Create a natural, conversational script that:
1. Introduces the topic
2. Explains key concepts clearly
3. Uses examples and analogies
4. Summarizes key points

Make it sound like a knowledgeable tutor explaining to a student."""
        
        script = await llm_service.chat_action(
            question=script_prompt,
            context_chunks=chunks,
            history=[],
            action_type="generate_audio",
        )
        
        message = f"I've generated an audio script for **{topic}**.\n\n"
        message += "**Quick Actions:**\n"
        message += "- Click **Generate Audio** to convert to speech\n"
        message += "- Click **Edit Script** to modify the content\n"
        message += "- Click **Download** to save the script"
        
        return ActionResult(
            type="audio",
            data={
                "script": script,
                "topic": topic,
                "source_ids": source_ids,
            },
            message=message,
        )
    
    async def _create_study_guide(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str
    ) -> ActionResult:
        """Create comprehensive study guide"""
        topic = intent.topic or "your study material"
        
        chunks = vector_store.query_chunks(
            question=f"comprehensive overview {topic}",
            source_ids=source_ids,
            top_k=15,
        )
        
        if not chunks:
            return ActionResult(
                type="chat",
                message="I couldn't find enough content to create a study guide. Please select more sources.",
            )
        
        context = "\n\n".join([
            f"[{c['source_name']}, p.{c['page']}]\n{c['text']}"
            for c in chunks[:10]
        ])
        
        guide_prompt = f"""Create a comprehensive study guide for: {topic}

Based on this material:
{context}

The study guide should include:
1. **Overview** - Brief introduction
2. **Key Concepts** - Main ideas with explanations
3. **Detailed Notes** - Organized by topic
4. **Key Terms & Definitions** - Important vocabulary
5. **Common Mistakes** - What to avoid
6. **Practice Questions** - 5-10 review questions
7. **Summary** - Quick reference section

Format with clear headings, bullet points, and examples where helpful."""
        
        guide = await llm_service.chat_action(
            question=guide_prompt,
            context_chunks=chunks,
            history=[],
            action_type="create_study_guide",
        )
        
        message = f"I've created a comprehensive study guide for **{topic}**.\n\n"
        message += "**Quick Actions:**\n"
        message += "- Click **Export as PDF** to download\n"
        message += "- Click **Create Flashcards** from key terms\n"
        message += "- Click **Create Quiz** to test your knowledge"
        
        return ActionResult(
            type="study_guide",
            data={
                "guide": guide,
                "topic": topic,
                "source_ids": source_ids,
            },
            message=message,
        )
    
    async def _create_notes(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str
    ) -> ActionResult:
        """Create organized notes from sources"""
        topic = intent.topic or "key topics"
        
        chunks = vector_store.query_chunks(
            question=topic,
            source_ids=source_ids,
            top_k=10,
        )
        
        if not chunks:
            return ActionResult(
                type="chat",
                message="I couldn't find content to create notes from. Please select sources first.",
            )
        
        context = "\n\n".join([
            f"[{c['source_name']}, p.{c['page']}]\n{c['text']}"
            for c in chunks[:8]
        ])
        
        notes_prompt = f"""Create organized study notes for: {topic}

Based on:
{context}

Format as clean, organized notes with:
- Clear headings
- Bullet points
- Key definitions highlighted
- Important formulas or processes numbered
- Cross-references between related concepts

Make it easy to scan and review quickly."""
        
        notes = await llm_service.chat_action(
            question=notes_prompt,
            context_chunks=chunks,
            history=[],
            action_type="create_notes",
        )
        
        message = f"I've created organized notes for **{topic}**.\n\n"
        message += "**Quick Actions:**\n"
        message += "- Click **Export** to save\n"
        message += "- Click **Edit** to modify"
        
        return ActionResult(
            type="notes",
            data={"notes": notes, "topic": topic},
            message=message,
        )
    
    async def _explain_concept(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str,
        history: Optional[List[Dict]] = None
    ) -> ActionResult:
        """Explain a specific concept"""
        from app.services.tutor_chain import TutorChain, TutoringMode
        
        tutor = TutorChain()
        question = intent.question or f"Explain {intent.topic}"
        
        response = await tutor.explain(
            question=question,
            source_ids=source_ids,
            mode=TutoringMode.DIRECT,
            history=history,
        )
        
        message = response.main_explanation
        
        if response.citations:
            message += "\n\n**Sources:**\n"
            for cite in response.citations[:3]:
                message += f"- {cite.source_name} (p.{cite.page})\n"
        
        return ActionResult(
            type="chat",
            data={
                "explanation": response.main_explanation,
                "citations": [c.model_dump() for c in response.citations],
                "related_concepts": [r.model_dump() for r in response.related_concepts],
            },
            message=message,
        )
    
    async def _find_connections(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str
    ) -> ActionResult:
        """Find connections between topics"""
        topic = intent.topic or "all topics"
        
        chunks = vector_store.query_chunks(
            question=topic,
            source_ids=source_ids,
            top_k=15,
        )
        
        if not chunks:
            return ActionResult(
                type="chat",
                message="I need more sources to find meaningful connections.",
            )
        
        context = "\n\n".join([
            f"[{c['source_name']}]\n{c['text']}"
            for c in chunks[:10]
        ])
        
        connections_prompt = f"""Analyze these study materials and find connections between topics.

Material:
{context}

Find and explain:
1. **Direct Connections** - Topics that directly relate to each other
2. **Cause & Effect** - How one concept affects another
3. **Comparisons** - Similarities and differences
4. **Hierarchies** - Prerequisite relationships
5. **Cross-Source Links** - How different sources complement each other

Create a clear, visual-friendly explanation of how everything connects."""
        
        connections = await llm_service.chat_action(
            question=connections_prompt,
            context_chunks=chunks,
            history=[],
            action_type="find_connections",
        )
        
        message = f"I've analyzed the connections between topics in your sources.\n\n"
        message += "**Quick Actions:**\n"
        message += "- Click **Create Knowledge Map** to visualize connections\n"
        message += "- Click **Create Flashcards** for related concepts"
        
        return ActionResult(
            type="chat",
            data={"connections": connections, "topic": topic},
            message=message,
        )
    
    async def _analyze_source(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str
    ) -> ActionResult:
        """Deep analysis of uploaded sources"""
        chunks = vector_store.query_chunks(
            question="main topics structure concepts",
            source_ids=source_ids,
            top_k=20,
        )
        
        if not chunks:
            return ActionResult(
                type="chat",
                message="Please select sources to analyze.",
            )
        
        # Group by source
        by_source = {}
        for c in chunks:
            sid = c['source_id']
            if sid not in by_source:
                by_source[sid] = {'name': c['source_name'], 'chunks': []}
            by_source[sid]['chunks'].append(c)
        
        analysis_results = {}
        for sid, info in by_source.items():
            context = "\n".join([f"[p.{c['page']}] {c['text']}" for c in info['chunks'][:5]])
            
            analysis_prompt = f"""Analyze this document thoroughly:

{context}

Provide:
1. **Document Overview** - What is this document about?
2. **Chapter Structure** - Main sections/topics
3. **Key Concepts** - Important ideas (list them)
4. **Key Takeaways** - What to remember
5. **Difficulty Assessment** - Easy/Medium/Hard topics
6. **Study Recommendations** - How to best study this material"""
            
            analysis = await llm_service.chat_action(
                question=analysis_prompt,
                context_chunks=info['chunks'],
                history=[],
                action_type="analyze_source",
            )
            
            analysis_results[sid] = {
                'name': info['name'],
                'analysis': analysis,
                'chunk_count': len(info['chunks']),
            }
        
        message = f"I've completed a deep analysis of **{len(analysis_results)} source(s)**.\n\n"
        message += "The analysis includes chapter structure, key concepts, and study recommendations."
        
        return ActionResult(
            type="chat",
            data={"analyses": analysis_results},
            message=message,
        )
    
    async def _chat(
        self, intent: ParsedIntent, source_ids: List[str], user_id: str,
        history: Optional[List[Dict]] = None
    ) -> ActionResult:
        """General chat using RAG"""
        from app.services.rag_chain import answer as rag_answer
        
        question = intent.question or "Hello, can you help me study?"
        
        answer_text, citations = await rag_answer(
            question=question,
            source_ids=source_ids,
            history=history or [],
        )
        
        # Build message with citations
        message = answer_text
        if citations:
            message += "\n\n**Sources:**\n"
            for cite in citations:
                message += f"- [{cite['id']}] {cite['source_name']} (p.{cite['page']})\n"
        
        return ActionResult(
            type="chat",
            data={
                "answer": answer_text,
                "citations": citations,
            },
            message=message,
        )
