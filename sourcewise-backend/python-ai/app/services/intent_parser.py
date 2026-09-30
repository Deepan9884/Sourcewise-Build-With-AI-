"""
Intent Parser — Parses natural language into structured AI actions.

Uses Ollama LLM with a structured system prompt to detect user intent
and extract parameters for action execution.
"""
import json
import httpx
from typing import Optional, List
from pydantic import BaseModel
from enum import Enum
from app.config import settings


class ActionType(str, Enum):
    """Supported AI actions"""
    CHAT = "chat"
    CREATE_QUIZ = "create_quiz"
    CREATE_FLASHCARDS = "create_flashcards"
    SUMMARIZE = "summarize"
    CREATE_PLANNER = "create_planner"
    TUTOR = "tutor"
    GENERATE_AUDIO = "generate_audio"
    CREATE_STUDY_GUIDE = "create_study_guide"
    CREATE_NOTES = "create_notes"
    EXPLAIN_CONCEPT = "explain_concept"
    FIND_CONNECTIONS = "find_connections"
    ANALYZE_SOURCE = "analyze_source"
    LIST_TASKS = "list_tasks"
    RECOMMEND_STUDY = "recommend_study"
    COMPLETE_TASK = "complete_task"
    PACING_STATUS = "pacing_status"
    GET_SCHEDULE = "get_schedule"


class ParsedIntent(BaseModel):
    """Parsed user intent with action and parameters"""
    action: ActionType
    topic: Optional[str] = None
    count: Optional[int] = None
    question: Optional[str] = None
    mode: Optional[str] = "direct"
    source_ids: Optional[List[str]] = None
    exam_date: Optional[str] = None
    difficulty: Optional[str] = "mixed"
    focus: Optional[str] = None
    metadata: Optional[dict] = None


INTENT_SYSTEM_PROMPT = """You are an intent parser for SourceWise AI, a personal study assistant and companion. Parse the student's message into a JSON action. Return ONLY valid JSON — no explanation, no markdown, no code blocks.

## Available Actions

| Action | When to Use | Required Fields | Optional Fields |
|--------|------------|-----------------|-----------------|
| list_tasks | Inquiring about pending tasks, today's tasks, study checklist | — | — |
| recommend_study | Asking what to study right now, what's next, what to prioritize | — | topic |
| complete_task | Marking a task or study session as done / completed | topic | — |
| pacing_status | Checking study pace, exam readiness, on-track status | — | topic |
| get_schedule | Viewing timetable, today's or weekly study schedule | — | exam_date |
| chat | General questions, personal conversation, greetings, follow-ups | question | — |
| create_quiz | Requesting quiz, test, practice questions, MCQ | topic | count, difficulty |
| create_flashcards | Requesting flashcards, cards, memorization aids | topic | count |
| summarize | Requesting summary, overview, TLDR, key points | — | topic |
| create_planner | Requesting study plan, schedule creation, timetable | — | topic, exam_date |
| tutor | Requesting Socratic method, guided teaching, "help me understand" | question | mode (direct/socratic/exploratory/exam_prep) |
| generate_audio | Requesting audio, podcast, voice, listen | topic | — |
| create_study_guide | Requesting comprehensive guide, complete review | topic | — |
| create_notes | Requesting organized notes, note-taking | topic | — |
| explain_concept | Explaining a specific concept, "what is X", "how does Y work" | question/topic | — |
| find_connections | Comparing topics, finding relationships, cross-references | topic | — |
| analyze_source | Deep analysis of uploaded documents | — | — |

## Output Format
Return exactly this JSON structure:
{"action": "<action>", "topic": "<topic or null>", "count": <number or null>, "question": "<full question text>", "exam_date": "<date or null>", "mode": "<mode or null>"}

## Few-Shot Examples

### Personal Tasks & Schedule
"what are all the task pending here like list today's task" → {"action": "list_tasks"}
"what are my pending tasks?" → {"action": "list_tasks"}
"list today's tasks" → {"action": "list_tasks"}
"what do I have to do today?" → {"action": "list_tasks"}
"what should I study right now?" → {"action": "recommend_study"}
"what's next to study?" → {"action": "recommend_study"}
"mark physics as done" → {"action": "complete_task", "topic": "physics"}
"how is my study pace?" → {"action": "pacing_status"}
"show my schedule for today" → {"action": "get_schedule"}

### Simple Questions
"what is photosynthesis?" → {"action": "explain_concept", "question": "what is photosynthesis?", "topic": "photosynthesis"}
"hello, how are you?" → {"action": "chat", "question": "hello, how are you?"}
"can you help me study?" → {"action": "chat", "question": "can you help me study?"}

### Quiz & Flashcards
"create a quiz on chapter 3" → {"action": "create_quiz", "topic": "chapter 3", "count": 10}
"make 20 flashcards about DNA" → {"action": "create_flashcards", "topic": "DNA", "count": 20}
"test me on photosynthesis" → {"action": "create_quiz", "topic": "photosynthesis", "count": 10}
"give me some practice questions" → {"action": "create_quiz", "count": 10}

### Summaries & Guides
"summarize my sources" → {"action": "summarize"}
"give me a TLDR of chapter 5" → {"action": "summarize", "topic": "chapter 5"}
"create a study guide for the exam" → {"action": "create_study_guide"}
"write notes on cell division" → {"action": "create_notes", "topic": "cell division"}

### Planning
"plan my study for exam on Friday" → {"action": "create_planner", "exam_date": "Friday"}
"make me a study schedule for next week" → {"action": "create_planner", "exam_date": "next week"}

### Explanation & Tutoring
"explain DNA replication in detail" → {"action": "explain_concept", "topic": "DNA replication", "question": "explain DNA replication in detail"}
"teach me about enzymes" → {"action": "tutor", "question": "teach me about enzymes", "mode": "socratic"}
"help me understand quantum mechanics" → {"action": "tutor", "question": "help me understand quantum mechanics", "mode": "socratic"}
"quiz me interactively on chemistry" → {"action": "tutor", "question": "quiz me on chemistry", "mode": "socratic"}

### Connections & Analysis
"find connections between topics" → {"action": "find_connections"}
"how does photosynthesis relate to cellular respiration?" → {"action": "find_connections", "topic": "photosynthesis and cellular respiration", "question": "how does photosynthesis relate to cellular respiration?"}
"analyze my uploaded documents" → {"action": "analyze_source"}
"deep dive into chapter 3" → {"action": "analyze_source", "topic": "chapter 3"}

### Audio
"create a podcast about this topic" → {"action": "generate_audio", "topic": "this topic"}
"make audio notes for studying" → {"action": "generate_audio"}

### Ambiguous / Multi-Intent
"quiz and flashcards on chapter 2" → {"action": "create_quiz", "topic": "chapter 2", "count": 10}
(Implicitly defaults to quiz for ambiguous combined requests)

## Rules
1. Return ONLY valid JSON — nothing else
2. Default to "chat" if intent is truly unclear
3. Extract topic from the message when mentioned
4. Extract count when a number is specified (default: quiz=10, flashcards=15)
5. Extract exam_date when a date/timeframe is mentioned
6. For "explain" / "what is" / "how does" → use explain_concept
7. For "teach me" / "help me understand" / "guide me" → use tutor with socratic mode
8. For "compare" / "relate" / "connect" / "how are X and Y related" → use find_connections
9. If the student asks multiple things, pick the PRIMARY intent"""


async def parse_intent(
    message: str,
    source_ids: Optional[List[str]] = None,
    history: Optional[List[dict]] = None,
) -> ParsedIntent:
    """
    Parse user message into a structured intent using LLM with deterministic fast path.
    
    Args:
        message: User's natural language message
        source_ids: Available source IDs for context
        history: Conversation history for context
        
    Returns:
        ParsedIntent with action and parameters
    """
    import re
    message_clean = message.strip()
    message_lower = message_clean.lower()

    # Fast-path deterministic detection for personal assistant & task queries
    # 1. Pending tasks / list today's tasks
    if re.search(r"\b(pending\s+tasks?|tasks?\s+pending|list\s+(today'?s?\s+)?tasks?|today'?s?\s+tasks?|what\s+are\s+(all\s+)?(the\s+|my\s+)?tasks?|my\s+tasks?|tasks?\s+for\s+today|what\s+do\s+i\s+have\s+to\s+do\s+today|what\s+to\s+do\s+today|what'?s\s+pending|pending\s+work|pending\s+assignment|to-?do\s+list)\b", message_lower):
        return ParsedIntent(
            action=ActionType.LIST_TASKS,
            question=message_clean,
            source_ids=source_ids,
        )

    # 2. What should I study next
    if re.search(r"\b(what\s+should\s+i\s+study|what\s+to\s+study\s+next|what'?s\s+next|next\s+task|where\s+should\s+i\s+start|recommend\s+study|what\s+next|what\s+now)\b", message_lower):
        return ParsedIntent(
            action=ActionType.RECOMMEND_STUDY,
            question=message_clean,
            source_ids=source_ids,
        )

    # 3. Complete task
    complete_match = re.search(r"\b(mark|finish|complete|check)\s+(.+?)\s+(as\s+)?(done|completed|finished)\b", message_lower)
    if complete_match:
        topic_extracted = complete_match.group(2).strip()
        return ParsedIntent(
            action=ActionType.COMPLETE_TASK,
            topic=topic_extracted,
            question=message_clean,
            source_ids=source_ids,
        )

    # 4. Pacing status
    if re.search(r"\b(how\s+is\s+my\s+pace|how\s+am\s+i\s+pacing|pacing\s+status|am\s+i\s+on\s+track|study\s+pace|exam\s+countdown)\b", message_lower):
        return ParsedIntent(
            action=ActionType.PACING_STATUS,
            question=message_clean,
            source_ids=source_ids,
        )

    # 5. Get schedule
    if re.search(r"\b(my\s+schedule|show\s+(my\s+)?schedule|today'?s?\s+schedule|timetable|study\s+calendar)\b", message_lower):
        return ParsedIntent(
            action=ActionType.GET_SCHEDULE,
            question=message_clean,
            source_ids=source_ids,
        )

    # 6. Friendly greetings & chitchat
    if re.match(r"^\s*(hi|hello|hey|greetings|howdy|sup|hola|yo|good\s+(morning|afternoon|evening)|who\s+are\s+you|what\s+can\s+you\s+do|help)(\s*!|\s*\.|\s*\?|\s*$)", message_lower):
        return ParsedIntent(
            action=ActionType.CHAT,
            question=message_clean,
            source_ids=source_ids,
        )

    # 7. Fast-path Quiz generation
    if re.search(r"\b(create|make|generate|build|give\s+me|start)\b.*\b(quiz|test|mcqs?)\b", message_lower) or re.search(r"\b(quiz\s+me|take\s+a\s+quiz)\b", message_lower):
        count_match = re.search(r"(\d+)\s*(?:-?\s*questions?|questions?|mcqs?|\b)", message_lower)
        count = int(count_match.group(1)) if count_match and 1 <= int(count_match.group(1)) <= 50 else 5
        diff_match = re.search(r"\b(easy|medium|hard|advanced|beginner)\b", message_lower)
        difficulty = diff_match.group(1) if diff_match else "medium"
        topic_match = re.search(r'(?:focusing\s+on|about|on|covering)\s+["\']?([^"\'\n.,]+)["\']?', message_clean, re.IGNORECASE)
        topic = topic_match.group(1).strip() if topic_match else "selected materials"
        return ParsedIntent(
            action=ActionType.CREATE_QUIZ,
            count=count,
            difficulty=difficulty,
            topic=topic,
            question=message_clean,
            source_ids=source_ids,
        )

    # 8. Fast-path Flashcards generation
    if re.search(r"\b(create|make|generate|build|give\s+me)\b.*\b(flashcards?|flash\s+cards?|cards?|anki)\b", message_lower):
        count_match = re.search(r"(\d+)\s*(?:flashcards?|cards?)", message_lower)
        count = int(count_match.group(1)) if count_match and 1 <= int(count_match.group(1)) <= 50 else 10
        topic_match = re.search(r'(?:focusing\s+on|about|on|covering)\s+["\']?([^"\'\n.,]+)["\']?', message_clean, re.IGNORECASE)
        topic = topic_match.group(1).strip() if topic_match else "key concepts"
        return ParsedIntent(
            action=ActionType.CREATE_FLASHCARDS,
            count=count,
            topic=topic,
            question=message_clean,
            source_ids=source_ids,
        )

    # 9. Fast-path Notes / Summary generation
    if re.search(r"\b(generate|create|write|make|take)\b.*\b(notes?|study\s+guide|summary|summarize)\b", message_lower):
        topic_match = re.search(r'(?:focusing\s+on|about|on|covering)\s+["\']?([^"\'\n.,]+)["\']?', message_clean, re.IGNORECASE)
        topic = topic_match.group(1).strip() if topic_match else "selected materials"
        action = ActionType.SUMMARIZE if "summar" in message_lower else ActionType.CREATE_NOTES
        return ParsedIntent(
            action=action,
            topic=topic,
            question=message_clean,
            source_ids=source_ids,
        )

    try:
        from app.services.llm import raw_chat

        # Build messages for LLM
        messages = [
            {"role": "system", "content": INTENT_SYSTEM_PROMPT}
        ]
        
        # Add recent history for context
        if history:
            for msg in history[-6:]:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        response_text = (await raw_chat(messages, temperature=0.1)).strip()
        
        # Parse JSON response with multiple extraction strategies
        parsed = None

        # Strategy 1: Direct JSON parse
        try:
            parsed = json.loads(response_text)
        except json.JSONDecodeError:
            pass

        # Strategy 2: Extract from markdown code block
        if parsed is None:
            for marker in ["```json", "```"]:
                if marker in response_text:
                    try:
                        json_str = response_text.split(marker, 1)[1].split("```")[0].strip()
                        parsed = json.loads(json_str)
                        break
                    except (json.JSONDecodeError, IndexError):
                        continue

        # Strategy 3: Find first { ... } block
        if parsed is None:
            try:
                start = response_text.index("{")
                end = response_text.rindex("}") + 1
                parsed = json.loads(response_text[start:end])
            except (ValueError, json.JSONDecodeError):
                pass

        if parsed is None:
            raise ValueError("Could not extract valid JSON from LLM response")

        # Validate and create ParsedIntent
        action = parsed.get("action", "chat")
        try:
            action_type = ActionType(action)
        except ValueError:
            action_type = ActionType.CHAT
        
        return ParsedIntent(
            action=action_type,
            topic=parsed.get("topic"),
            count=parsed.get("count"),
            question=parsed.get("question", message),
            mode=parsed.get("mode", "direct"),
            source_ids=source_ids,
            exam_date=parsed.get("exam_date"),
            difficulty=parsed.get("difficulty", "mixed"),
            focus=parsed.get("focus"),
        )
        
    except Exception as e:
        print(f"[IntentParser] Error parsing intent with LLM: {e}")
        # Fallback to keyword-based parsing
        return parse_intent_sync(message, source_ids)


def parse_intent_sync(message: str, source_ids: Optional[List[str]] = None) -> ParsedIntent:
    """
    Synchronous fallback for intent parsing using keyword matching.
    Used when LLM is unavailable or fails.
    """
    import re
    message_clean = message.strip()
    message_lower = message_clean.lower()
    
    # Fast regex match for task queries
    if re.search(r"\b(pending\s+tasks?|tasks?\s+pending|list\s+(today'?s?\s+)?tasks?|today'?s?\s+tasks?|what\s+are\s+(all\s+)?(the\s+|my\s+)?tasks?|my\s+tasks?|tasks?\s+for\s+today|what\s+do\s+i\s+have\s+to\s+do\s+today|what\s+to\s+do\s+today|what'?s\s+pending|to-?do\s+list)\b", message_lower):
        return ParsedIntent(action=ActionType.LIST_TASKS, question=message_clean, source_ids=source_ids)

    if re.search(r"\b(what\s+should\s+i\s+study|what\s+to\s+study\s+next|what'?s\s+next|next\s+task|where\s+should\s+i\s+start|recommend\s+study)\b", message_lower):
        return ParsedIntent(action=ActionType.RECOMMEND_STUDY, question=message_clean, source_ids=source_ids)

    complete_match = re.search(r"\b(mark|finish|complete|check)\s+(.+?)\s+(as\s+)?(done|completed|finished)\b", message_lower)
    if complete_match:
        return ParsedIntent(action=ActionType.COMPLETE_TASK, topic=complete_match.group(2).strip(), question=message_clean, source_ids=source_ids)

    if re.search(r"\b(how\s+is\s+my\s+pace|how\s+am\s+i\s+pacing|pacing\s+status|am\s+i\s+on\s+track|study\s+pace)\b", message_lower):
        return ParsedIntent(action=ActionType.PACING_STATUS, question=message_clean, source_ids=source_ids)

    # Keyword-based intent detection with weighted scoring
    intent_scores = {
        ActionType.LIST_TASKS: 0,
        ActionType.RECOMMEND_STUDY: 0,
        ActionType.COMPLETE_TASK: 0,
        ActionType.PACING_STATUS: 0,
        ActionType.GET_SCHEDULE: 0,
        ActionType.CREATE_QUIZ: 0,
        ActionType.CREATE_FLASHCARDS: 0,
        ActionType.SUMMARIZE: 0,
        ActionType.CREATE_PLANNER: 0,
        ActionType.EXPLAIN_CONCEPT: 0,
        ActionType.GENERATE_AUDIO: 0,
        ActionType.CREATE_STUDY_GUIDE: 0,
        ActionType.CREATE_NOTES: 0,
        ActionType.FIND_CONNECTIONS: 0,
        ActionType.ANALYZE_SOURCE: 0,
        ActionType.TUTOR: 0,
        ActionType.CHAT: 0,
    }
    
    # Task indicators
    if any(w in message_lower for w in ["task", "tasks", "pending", "todo", "to-do", "checklist"]):
        intent_scores[ActionType.LIST_TASKS] += 3

    # Quiz indicators
    quiz_words = ["quiz", "test", "exam", "question", "practice", "mcq", "multiple choice", "evaluate"]
    for word in quiz_words:
        if word in message_lower:
            intent_scores[ActionType.CREATE_QUIZ] += 2
    
    # Flashcard indicators
    flash_words = ["flashcard", "flash card", "cards", "anki", "memorize", "flash"]
    for word in flash_words:
        if word in message_lower:
            intent_scores[ActionType.CREATE_FLASHCARDS] += 2
    
    # Summary indicators
    summary_words = ["summarize", "summary", "overview", "key points", "tldr", "brief"]
    for word in summary_words:
        if word in message_lower:
            intent_scores[ActionType.SUMMARIZE] += 2
    
    # Planner indicators
    planner_words = ["plan", "schedule", "planner", "study plan", "calendar", "timetable"]
    for word in planner_words:
        if word in message_lower:
            intent_scores[ActionType.CREATE_PLANNER] += 2
    
    # Date indicators (boost planner)
    date_words = ["tomorrow", "next week", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "december", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november"]
    for word in date_words:
        if word in message_lower:
            intent_scores[ActionType.CREATE_PLANNER] += 1
    
    # Explain indicators
    explain_words = ["explain", "what is", "what are", "how does", "how do", "why does", "why do", "tell me about", "describe", "define"]
    for word in explain_words:
        if word in message_lower:
            intent_scores[ActionType.EXPLAIN_CONCEPT] += 2
    
    # Audio indicators
    audio_words = ["audio", "podcast", "listen", "tts", "voice", "speak"]
    for word in audio_words:
        if word in message_lower:
            intent_scores[ActionType.GENERATE_AUDIO] += 2
    
    # Study guide indicators
    guide_words = ["study guide", "comprehensive guide", "complete guide", "full guide"]
    for word in guide_words:
        if word in message_lower:
            intent_scores[ActionType.CREATE_STUDY_GUIDE] += 2
    
    # Notes indicators
    notes_words = ["notes", "organized notes", "note-taking", "write notes"]
    for word in notes_words:
        if word in message_lower:
            intent_scores[ActionType.CREATE_NOTES] += 2
    
    # Connection indicators
    connect_words = ["connect", "relationship", "between", "compare", "contrast", "relate"]
    for word in connect_words:
        if word in message_lower:
            intent_scores[ActionType.FIND_CONNECTIONS] += 2
    
    # Analysis indicators
    analyze_words = ["analyze", "analysis", "deep dive", "examine", "investigate"]
    for word in analyze_words:
        if word in message_lower:
            intent_scores[ActionType.ANALYZE_SOURCE] += 2
    
    # Tutor indicators
    tutor_words = ["help me understand", "socratic", "guide me", "ask me", "teach me", "quiz me interactively"]
    for word in tutor_words:
        if word in message_lower:
            intent_scores[ActionType.TUTOR] += 2
    
    # Default to chat with small score
    intent_scores[ActionType.CHAT] = 0.1
    
    # Get the highest scoring intent
    best_intent = max(intent_scores, key=intent_scores.get)
    best_score = intent_scores[best_intent]
    
    # If no strong signal, default to chat
    if best_score < 2:
        best_intent = ActionType.CHAT
    
    # Extract topic - look for "about X", "on X", "for X", "what is X"
    topic = None
    import re
    
    # Try various patterns
    topic_match = re.search(r'(?:about|on|for|of)\s+(.+?)(?:\?|\.|$)', message_lower)
    if topic_match:
        topic = topic_match.group(1).strip()
    elif re.match(r'what (?:is|are) (?:a |an |the )?(.+?)(?:\?|\.|$)', message_lower):
        topic_match = re.match(r'what (?:is|are) (?:a |an |the )?(.+?)(?:\?|\.|$)', message_lower)
        topic = topic_match.group(1).strip()
    elif re.match(r'explain\s+(.+?)(?:\?|\.|$)', message_lower):
        topic_match = re.match(r'explain\s+(.+?)(?:\?|\.|$)', message_lower)
        topic = topic_match.group(1).strip()
    else:
        # Remove action keywords to get topic
        topic_words = message_lower
        for word in ['create', 'make', 'generate', 'quiz', 'flashcards', 'flashcard', 'test', 'questions', 'with', 'a', 'the', 'for', 'on', 'about', 'summarize', 'summary', 'explain', 'plan', 'study', 'guide', 'notes', 'audio', 'connections', 'find', 'analyze', 'my', 'sources', 'please', 'can', 'you', 'i', 'want', 'need', 'to']:
            topic_words = topic_words.replace(word, '')
        topic_words = ' '.join(topic_words.split()).strip()
        if topic_words and len(topic_words) > 2:
            topic = topic_words
    
    # Extract count - look for numbers
    count = None
    count_match = re.search(r'(\d+)\s*(?:question|card|flashcard|item)', message_lower)
    if count_match:
        count = int(count_match.group(1))
    else:
        num_match = re.search(r'(\d+)', message)
        if num_match and int(num_match.group(1)) <= 50:
            count = int(num_match.group(1))
    
    return ParsedIntent(
        action=best_intent,
        topic=topic,
        count=count,
        question=message,
        source_ids=source_ids,
    )
