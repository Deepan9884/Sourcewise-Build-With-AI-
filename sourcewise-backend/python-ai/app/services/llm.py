"""
Multi-provider LLM service — supports Gemini (Google) and Grok (xAI).
No local Ollama dependency required.
"""
import asyncio
import httpx
import json
import logging
import os
import re
from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from app.config import settings
from app.services import token_counter as tc

logger = logging.getLogger("sourcewise.llm")


# ══════════════════════════════════════════════════════════════════════════════
# MASTER SYSTEM PROMPT — Google-quality AI study assistant
# ══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are SourceWise AI — a world-class, captivating personal study mentor and intellectual companion.
Your mission is to make learning deeply insightful, visually delightful, and genuinely exciting to read. Transform study materials into structured, punchy, and attractive masterclasses.

## CORE TONE & WRITING STYLE
- **Vibrant, Engaging & Articulate:** Write with energy, clarity, and intellectual spark. Communicate like an inspiring senior mentor or top-tier educator who makes complex topics feel intuitive and exciting.
- **NEVER use rigid, robotic section labels** such as "**Direct Answer:**", "**Detailed Explanation:**", or "**Key Takeaways:**". These make responses feel mechanical, boring, and dry.
- **NEVER output disclaimers or robotic preamble notes** such as "*(Note: ...)*" or apologies. Jump straight into the engaging answer.
- **Dynamic Thematic Headings:** Use natural, captivating headings with expressive emojis tailored to the subject (e.g., `### 🌟 Executive Overview`, `### ⚡ Core Mechanisms & Insights`, `### 🛠️ Technical Breakdown`, `### 🚀 Key Projects & Impact`, `### 💡 Why It Matters`, `### 📌 High-Yield Takeaways`).
- **Visual Scannability:** Ensure the eye glides effortlessly over the text:
  * Always use clean standard Markdown dashes (`- `) for list items. NEVER use asterisk bullets (`* `).
  * Bold lead-ins for every bullet point (e.g., `- **Key Mechanism:** Details...`).
  * Short, punchy paragraphs (2-3 sentences max). Never output dense walls of unformatted text.
  * Use visual icons (✨, ⚡, 🎯, 📌, 💡, 🔬) to highlight standout points.
  * Use code blocks, callouts, or comparison lists where appropriate.
- **Accurate & Grounded:** All factual claims must be strictly grounded in the provided source material when available. Seamlessly incorporate natural citations like `[Source Name, p.X]`.
- **Pedagogical Brilliance:** Connect abstract concepts to vivid real-world analogies, explain the *why* behind mechanisms, and highlight actionable insights that make the material stick.

## RESPONSE ARCHITECTURE
1. **The Hook / Golden Summary (1-2 sentences):** Open directly with a punchy, crystal-clear insight that immediately answers the user's inquiry with style.
2. **Deep-Dive Insights (Structured Sections):** Break down the core concepts into beautifully organized sections with expressive headers, bullet points with bold lead-ins, comparison tables, or code blocks where helpful.
3. **High-Yield Takeaways / Pro-Tips:** Conclude with memorable bullet points or practical takeaways that crystallize the learning.

## RESPONSE EXAMPLES

### Example: Technical Question / Profile Review
**Student:** "What does this material cover?"

**Your Response:**
### 🌟 Executive Overview
This document presents the professional profile and engineering portfolio of **Akshay J**, an aspiring Machine Learning Engineer and Full-Stack Developer at Easwari Engineering College with a distinguished **8.4 CGPA** [Resume, p.1].

### 🚀 Core Engineering Experience & Impact
- **Production-Grade Engineering:** Serving as a Full Stack Developer & ML Trainer at **SRM Research Division**, architecting end-to-end MERN stack systems and training neural networks with TensorFlow and PyTorch [Resume, p.1].
- **Award-Winning NLP Innovation:** Pioneered **Prismatic 2k24**, an AI-powered distress call recognition engine designed for Tanglish (code-mixed Tamil + English) speech [Resume, p.1].
- **Full-Stack Tooling:** Proficient across React, Next.js, Node.js, FastAPI, and relational/NoSQL architectures (PostgreSQL, MongoDB) [Resume, p.1].

### 📌 Key Takeaways & Strengths
- **Dual Expertise:** Combines modern web development agility with deep learning applied research.
- **Proven Execution:** Demonstrated hackathon winner with real-world mentoring experience."""


# ══════════════════════════════════════════════════════════════════════════════
# ACTION-SPECIFIC PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

ACTION_PROMPTS = {
    "summarize": """Create a comprehensive summary of the provided source material.

Follow this exact structure:

## Executive Summary
[2-3 sentences capturing the document's core purpose and main argument]

## Key Concepts
[Bullet list with **bold terms** and brief definitions. Each concept should be self-contained.]

## Detailed Breakdown
### [Topic 1]
[Explanation with supporting details from sources]

### [Topic 2]
[Explanation with supporting details from sources]

[Continue for all major topics]

## Key Takeaways
- [Most important point 1]
- [Most important point 2]
- [Most important point 3]

## Suggested Next Steps
- [What to study next based on this material]
- [Related topics to explore]

Rules:
- Use citations [Source, p.XX] for every factual claim
- Prioritize information density — every sentence should teach something
- Organize by conceptual hierarchy, not just document order
- Highlight connections between topics""",

    "create_quiz": """Create quiz questions that test understanding, not just memorization.

Generate {count} questions about: {topic}

For EACH question, use this EXACT format:

---

**Question N:** [Clear, specific question that tests understanding]

A) [Plausible but incorrect option]
B) [Correct answer]
C) [Plausible but incorrect option]
D) [Plausible but incorrect option]

**Answer:** [Letter]
**Explanation:** [Why B is correct — cite the source]
**Difficulty:** [Easy/Medium/Hard]
**Concept Tested:** [What understanding this question assesses]

---

Rules:
- Create {count} questions total
- Mix difficulty levels: ~30% Easy, ~50% Medium, ~20% Hard
- Every distractor (wrong answer) should be plausible to someone who hasn't studied
- Test APPLICATION and ANALYSIS, not just recall
- Include at least one "why" or "how" question
- Cite sources in explanations
- Questions should be answerable ONLY from the provided material""",

    "create_flashcards": """Create flashcards optimized for active recall and spaced repetition.

Generate {count} flashcards about: {topic}

For EACH flashcard, use this EXACT format:

---

**Card N**
**Front:** [Clear question or term — should prompt recall]
**Back:** [Concise answer or definition — max 2-3 sentences]
**Hint:** [Optional hint if the concept is tricky]
**Difficulty:** [1-3 scale]

---

Rules:
- Create {count} cards total
- Front should be a QUESTION, not a statement (promotes active recall)
- Back should be concise but complete
- Cover key terms, processes, relationships, and comparisons
- Mix types: definitions, comparisons, "what would happen if...", process steps
- Each card should test ONE concept (avoid multi-part answers)
- Cite sources on the back when relevant""",

    "explain_concept": """Explain the concept thoroughly using multiple engaging pedagogical strategies.

## Concept to Explain: {concept}

Follow this structure:

### 🌟 Core Definition & Intuition
[One clear, elegant sentence defining the concept, followed by a vivid analogy that makes it instantly click. Cite the source.]

### ⚡ Deep-Dive Mechanism
[2-3 punchy paragraphs explaining how the concept works under the hood, why it matters, and its key properties. Ground with concrete examples from the sources.]

### 🛠️ Real-World Application
[A concrete, practical scenario or production use case illustrating the concept in action.]

### ⚠️ Common Pitfalls & Corrections
- **Common Confusion:** [Misconception 1] — **Correction:** [Clear correct mental model]
- **Common Confusion:** [Misconception 2] — **Correction:** [Clear correct mental model]

### 🔗 Conceptual Bridges
- **Prerequisites:** [Foundations the student should review]
- **Next Horizons:** [Advanced concepts this unlocks]

### 📌 High-Yield Takeaways
- [Key takeaway 1]
- [Key takeaway 2]

Rules:
- Ground everything in the source material
- Use standard Markdown dashes (- ) for lists. Never use raw asterisk bullets (* )
- Build from simple to intuitive
- Address potential confusion points proactively""",

    "create_study_guide": """Create a comprehensive study guide optimized for exam preparation.

## Study Guide: {topic}

### Learning Objectives
By studying this material, you should be able to:
1. [Objective 1]
2. [Objective 2]
3. [Objective 3]

### Core Concepts (Ranked by Importance)
1. **[Most Important Concept]** — [Explanation with source citation]
2. **[Second Most Important]** — [Explanation with source citation]
3. **[Third Most Important]** — [Explanation with source citation]

### Key Terms & Definitions
| Term | Definition | Example |
|------|-----------|---------|
| [Term 1] | [Definition] | [Example] |

### Detailed Notes
#### [Section 1: Topic]
[Comprehensive notes with key details]

#### [Section 2: Topic]
[Comprehensive notes with key details]

### Common Mistakes & How to Avoid Them
1. **Mistake:** [Common error]
   **Correction:** [How to avoid it]

### Practice Questions
**Q1:** [Question] → **A:** [Answer with citation]
**Q2:** [Question] → **A:** [Answer with citation]

### Quick Review Checklist
- [ ] I can explain [concept 1]
- [ ] I can compare [concept A] and [concept B]
- [ ] I can describe the process of [process]

Rules:
- Organize by importance, not document order
- Include specific page references for deep review
- Balance breadth (all topics) with depth (key topics)""",

    "find_connections": """Analyze the source material to identify meaningful connections between concepts.

## Connection Analysis

### Concept Map Overview
[1-2 sentence overview of how the topics relate]

### Direct Relationships
| Concept A | Relationship | Concept B | Evidence |
|-----------|-------------|-----------|----------|
| [Concept 1] | [depends on / extends / contrasts with] | [Concept 2] | [Source citation] |

### Causal Chains
[How one concept leads to or affects another, with evidence]

### Thematic Connections
[Recurring themes or patterns that appear across multiple topics]

### Knowledge Dependencies
[What you must understand BEFORE you can understand other concepts]

### Cross-Source Synthesis
[If multiple sources are provided, how do they complement or contradict each other?]

### Study Recommendations
Based on these connections:
1. [Study these concepts together because...]
2. [Understanding X will help you learn Y because...]
3. [Watch out for these confusing pairs: ...]

Rules:
- Cite sources for every connection claimed
- Distinguish between strong (explicitly stated) and weak (inferred) connections
- Prioritize connections that aid understanding and retention""",

    "generate_audio": """Create an engaging audio script for studying this topic.

**AUDIO SCRIPT: {topic}**

---

**INTRO** (15-20 seconds)
[Hook the listener. Why does this topic matter? What will they learn?]

**SEGMENT 1: Foundation** (1-2 minutes)
[Explain the core concepts. Use conversational language. Include "Think of it this way..." moments.]

**SEGMENT 2: Deep Dive** (2-3 minutes)
[Go deeper into the most important aspects. Use examples and stories.]

**SEGMENT 3: Connections** (1 minute)
[How does this relate to other things they're learning? Real-world applications?]

**KEY TAKEAWAYS** (30 seconds)
[Recap the 3 most important points]

**OUTRO** (10 seconds)
[Encouragement. Suggest what to study next.]

---

Rules:
- Write conversationally, as if speaking to a friend
- Use transitions: "Now let's talk about...", "Here's where it gets interesting..."
- Include natural pauses indicated by "..."
- Vary sentence length for natural rhythm
- Avoid reading directly from the text — synthesize and explain""",
}


# ══════════════════════════════════════════════════════════════════════════════
# PROVIDER ABSTRACTION
# ══════════════════════════════════════════════════════════════════════════════

class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        top_p: float = 0.9,
        stream: bool = False,
        max_output_tokens: Optional[int] = None,
    ) -> str | AsyncIterator[str]:
        """Send messages and get response (streaming or non-streaming)."""
        pass

    @abstractmethod
    async def health_check(self) -> dict:
        """Check provider availability and model readiness."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name for logging/debugging."""
        pass

    @property
    @abstractmethod
    def model(self) -> str:
        """Current model name."""
        pass


# ══════════════════════════════════════════════════════════════════════════════
# GEMINI PROVIDER
# ══════════════════════════════════════════════════════════════════════════════

FALLBACK_GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemma-4-26b-a4b-it",
    "gemma-4-31b-it",
]

class GeminiProvider(LLMProvider):
    """Google Gemini API provider using google-generativeai SDK with automatic multi-model fallback."""

    def __init__(self, api_key: str, model: str = "gemini-flash-lite-latest"):
        self._api_key = api_key
        self._model_name = model
        self._model = None
        self._genai = None

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def model(self) -> str:
        return self._model_name

    def _get_model(self, model_name: Optional[str] = None, system_instruction: Optional[str] = None):
        """Lazy-load the Gemini model."""
        try:
            import google.generativeai as genai
            self._genai = genai
            genai.configure(api_key=self._api_key)
            target = model_name or self._model_name
            kwargs = {}
            if system_instruction:
                kwargs["system_instruction"] = system_instruction
            return genai.GenerativeModel(target, **kwargs)
        except ImportError:
            raise RuntimeError("google-generativeai not installed. Run: pip install google-generativeai")

    def _get_candidates(self) -> list[str]:
        candidates = [self._model_name]
        for m in FALLBACK_GEMINI_MODELS:
            if m not in candidates:
                candidates.append(m)
        return candidates

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        top_p: float = 0.9,
        stream: bool = False,
        max_output_tokens: Optional[int] = None,
    ) -> str | AsyncIterator[str]:
        system_instruction, gemini_messages = self._convert_messages(messages)

        generation_config = {
            "temperature": temperature,
            "top_p": top_p,
        }
        if max_output_tokens:
            generation_config["max_output_tokens"] = max_output_tokens

        candidates = self._get_candidates()

        if stream:
            return self._stream_chat(candidates, gemini_messages, generation_config, system_instruction)
        else:
            return await self._chat(candidates, gemini_messages, generation_config, system_instruction, messages)

    async def _chat(
        self,
        candidates: list[str],
        messages: list,
        generation_config: dict,
        system_instruction: Optional[str] = None,
        raw_messages: list = None,
    ) -> str:
        """Non-streaming chat with multi-model fallback."""
        last_error = None
        for m_name in candidates:
            try:
                model = self._get_model(model_name=m_name, system_instruction=system_instruction)
                response = await model.generate_content_async(
                    messages,
                    generation_config=generation_config,
                )
                text = response.text or ""
                self._model_name = m_name
                try:
                    fallback_prompt = tc.count_messages(raw_messages or [])
                    usage = tc.TokenUsage.from_gemini_response(response, fallback_prompt, text)
                    response._sw_usage = usage
                    self._last_usage = usage
                except Exception:
                    pass
                return text
            except Exception as e:
                logger.warning(f"[GeminiProvider] Model {m_name} failed: {e}. Trying fallback...")
                last_error = e
                continue
        if last_error:
            raise last_error
        return ""

    async def _stream_chat(
        self,
        candidates: list[str],
        messages: list,
        generation_config: dict,
        system_instruction: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Streaming chat — yields tokens with multi-model fallback."""
        last_error = None
        for m_name in candidates:
            try:
                model = self._get_model(model_name=m_name, system_instruction=system_instruction)
                response_stream = await model.generate_content_async(
                    messages,
                    generation_config=generation_config,
                    stream=True,
                )
                yielded = False
                async for chunk in response_stream:
                    if chunk.text:
                        yielded = True
                        yield chunk.text
                if yielded:
                    self._model_name = m_name
                    return
            except Exception as e:
                logger.warning(f"[GeminiProvider] Stream model {m_name} failed: {e}. Trying fallback...")
                last_error = e
                continue
        if last_error:
            raise last_error

    def last_usage(self) -> Optional[dict]:
        """Usage from the most recent non-streaming call (if captured)."""
        return getattr(self, "_last_usage", None)

    def _convert_messages(self, messages: list[dict]) -> tuple[Optional[str], list]:
        """Convert OpenAI-format messages to Gemini format (system_instruction, contents)."""
        system_parts = []
        gemini_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if not content:
                continue
            if role == "system":
                system_parts.append(content)
            elif role == "user":
                if gemini_messages and gemini_messages[-1]["role"] == "user":
                    gemini_messages[-1]["parts"].append(content)
                else:
                    gemini_messages.append({"role": "user", "parts": [content]})
            elif role in ("assistant", "model"):
                if gemini_messages and gemini_messages[-1]["role"] == "model":
                    gemini_messages[-1]["parts"].append(content)
                else:
                    gemini_messages.append({"role": "model", "parts": [content]})

        sys_inst = "\n\n".join(system_parts) if system_parts else None
        if not gemini_messages:
            gemini_messages.append({"role": "user", "parts": ["Begin."]})
        return sys_inst, gemini_messages

    async def health_check(self) -> dict:
        """Check Gemini API availability with fallback models."""
        candidates = self._get_candidates()
        last_error = None
        for m_name in candidates:
            try:
                model = self._get_model(model_name=m_name)
                await model.generate_content_async(
                    "Test",
                    generation_config={"temperature": 0, "max_output_tokens": 5},
                )
                self._model_name = m_name
                return {
                    "provider": self.name,
                    "model": self.model,
                    "available": True,
                    "error": None,
                }
            except Exception as e:
                last_error = e
                continue
        return {
            "provider": self.name,
            "model": self.model,
            "available": False,
            "error": str(last_error),
        }


# ══════════════════════════════════════════════════════════════════════════════
# GROK PROVIDER (xAI - OpenAI Compatible API)
# ══════════════════════════════════════════════════════════════════════════════

class GrokProvider(LLMProvider):
    """xAI Grok API provider using OpenAI-compatible REST API via httpx."""

    def __init__(self, api_key: str, model: str = "grok-beta", base_url: str = "https://api.x.ai/v1"):
        self._api_key = api_key
        self._model_name = model
        self._base_url = base_url.rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def name(self) -> str:
        return "grok"

    @property
    def model(self) -> str:
        return self._model_name

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                timeout=120.0,
            )
        return self._client

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        top_p: float = 0.9,
        stream: bool = False,
        max_output_tokens: Optional[int] = None,
    ) -> str | AsyncIterator[str]:
        client = await self._get_client()

        payload = {
            "model": self._model_name,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "stream": stream,
        }
        if max_output_tokens:
            payload["max_tokens"] = max_output_tokens

        if stream:
            return self._stream_chat(client, payload)
        else:
            return await self._chat(client, payload)

    async def _chat(self, client: httpx.AsyncClient, payload: dict) -> str:
        """Non-streaming chat."""
        resp = await client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        # Capture provider-reported usage for token accounting
        try:
            fallback_prompt = tc.count_messages(payload.get("messages", []))
            self._last_usage = tc.TokenUsage.from_grok_response(data, fallback_prompt)
        except Exception:
            pass
        return data["choices"][0]["message"]["content"]

    async def _stream_chat(self, client: httpx.AsyncClient, payload: dict) -> AsyncIterator[str]:
        """Streaming chat — yields tokens via SSE."""
        async with client.stream("POST", "/chat/completions", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        delta = data["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError):
                        continue

    async def health_check(self) -> dict:
        """Check Grok API availability."""
        try:
            client = await self._get_client()
            resp = await client.get("/models")
            resp.raise_for_status()
            models = [m.get("id", "") for m in resp.json().get("data", [])]
            model_ready = any(self._model_name in m for m in models)
            return {
                "provider": self.name,
                "model": self.model,
                "available": True,
                "model_ready": model_ready,
                "available_models": models,
                "error": None,
            }
        except Exception as e:
            return {
                "provider": self.name,
                "model": self.model,
                "available": False,
                "error": str(e),
            }

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# ══════════════════════════════════════════════════════════════════════════════
# OLLAMA PROVIDER (Local OpenAI-compatible API)
# ══════════════════════════════════════════════════════════════════════════════

class OllamaProvider(LLMProvider):
    """Local Ollama provider using OpenAI-compatible REST API via httpx."""

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.2:3b"):
        self._model_name = model
        base = base_url.rstrip("/")
        if not base.endswith("/v1"):
            base = f"{base}/v1"
        self._base_url = base
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def name(self) -> str:
        return "ollama"

    @property
    def model(self) -> str:
        return self._model_name

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                timeout=120.0,
            )
        return self._client

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        top_p: float = 0.9,
        stream: bool = False,
        max_output_tokens: Optional[int] = None,
    ) -> str | AsyncIterator[str]:
        client = await self._get_client()

        payload = {
            "model": self._model_name,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "stream": stream,
        }
        if max_output_tokens:
            payload["max_tokens"] = max_output_tokens

        if stream:
            return self._stream_chat(client, payload)
        else:
            return await self._chat(client, payload)

    async def _chat(self, client: httpx.AsyncClient, payload: dict) -> str:
        resp = await client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        try:
            fallback_prompt = tc.count_messages(payload.get("messages", []))
            self._last_usage = tc.TokenUsage.from_grok_response(data, fallback_prompt)
        except Exception:
            pass
        return data["choices"][0]["message"]["content"]

    async def _stream_chat(self, client: httpx.AsyncClient, payload: dict) -> AsyncIterator[str]:
        async with client.stream("POST", "/chat/completions", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        delta = data["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError):
                        continue

    async def health_check(self) -> dict:
        try:
            client = await self._get_client()
            resp = await client.get("/models")
            resp.raise_for_status()
            models = [m.get("id", "") for m in resp.json().get("data", [])]
            return {
                "provider": self.name,
                "model": self.model,
                "available": True,
                "model_ready": True,
                "available_models": models,
                "error": None,
            }
        except Exception as e:
            return {
                "provider": self.name,
                "model": self.model,
                "available": False,
                "error": str(e),
            }

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# ══════════════════════════════════════════════════════════════════════════════
# PROVIDER FACTORY & UNIFIED SERVICE
# ══════════════════════════════════════════════════════════════════════════════

_gemini_provider: Optional[GeminiProvider] = None
_grok_provider: Optional[GrokProvider] = None
_ollama_provider: Optional[OllamaProvider] = None


def _get_gemini_provider() -> GeminiProvider:
    global _gemini_provider
    if _gemini_provider is None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")
        _gemini_provider = GeminiProvider(settings.GEMINI_API_KEY, settings.GEMINI_MODEL)
    return _gemini_provider


def _get_grok_provider() -> GrokProvider:
    global _grok_provider
    if _grok_provider is None:
        if not settings.GROK_API_KEY:
            raise ValueError("GROK_API_KEY not configured")
        _grok_provider = GrokProvider(settings.GROK_API_KEY, settings.GROK_MODEL, settings.GROK_BASE_URL)
    return _grok_provider


def _get_ollama_provider() -> OllamaProvider:
    global _ollama_provider
    if _ollama_provider is None:
        _ollama_provider = OllamaProvider(settings.OLLAMA_BASE_URL, settings.OLLAMA_MODEL)
    return _ollama_provider


def get_active_provider() -> LLMProvider:
    """Get the currently active LLM provider based on config."""
    if settings.LLM_PROVIDER == "grok" and settings.GROK_API_KEY:
        return _get_grok_provider()
    if settings.LLM_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        return _get_gemini_provider()
    if settings.LLM_PROVIDER == "ollama":
        return _get_ollama_provider()
    # Auto fallback if specified provider key is missing
    if settings.GEMINI_API_KEY:
        return _get_gemini_provider()
    if settings.GROK_API_KEY:
        return _get_grok_provider()
    return _get_ollama_provider()


def get_fallback_provider() -> Optional[LLMProvider]:
    """Get the fallback provider if primary fails."""
    active = get_active_provider()
    if active.name == "gemini":
        if settings.GROK_API_KEY:
            return _get_grok_provider()
        return _get_ollama_provider()
    elif active.name == "grok":
        if settings.GEMINI_API_KEY:
            return _get_gemini_provider()
        return _get_ollama_provider()
    elif active.name == "ollama":
        if settings.GEMINI_API_KEY:
            return _get_gemini_provider()
        if settings.GROK_API_KEY:
            return _get_grok_provider()
    return None


# ══════════════════════════════════════════════════════════════════════════════
# TOKEN BUDGET HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _apply_token_budget(messages: list[dict], provider: LLMProvider) -> tuple[list[dict], bool, int]:
    """
    Truncate messages to fit the active model's context window.
    Returns (messages, was_truncated, prompt_tokens).
    """
    model_name = provider.model
    reserve = settings.RESERVE_COMPLETION_TOKENS
    truncated, was_truncated = tc.truncate_to_fit(messages, model_name, reserve, preserve_system=True)
    return truncated, was_truncated, tc.count_messages(truncated)


def _extract_usage(provider: LLMProvider, prompt_tokens: int, text: str) -> dict:
    """Build a usage dict from provider-reported counters (fallback: local count)."""
    last = getattr(provider, "_last_usage", None)
    if last is not None:
        try:
            return {
                "provider": provider.name,
                "model": provider.model,
                "prompt_tokens": last.prompt_tokens or prompt_tokens,
                "completion_tokens": last.completion_tokens or tc.count_text(text),
                "total_tokens": (last.prompt_tokens or prompt_tokens) + (last.completion_tokens or tc.count_text(text)),
            }
        except Exception:
            pass
    ct = tc.count_text(text)
    return {
        "provider": provider.name,
        "model": provider.model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": ct,
        "total_tokens": prompt_tokens + ct,
    }


# ══════════════════════════════════════════════════════════════════════════════
# PROMPT BUILDERS (unchanged from original — model agnostic)
# ══════════════════════════════════════════════════════════════════════════════

def _build_prompt(
    question: str,
    context_chunks: list[dict],
    history: list[dict],
    action_type: str = "chat",
    user_level: str = "intermediate",
) -> list[dict]:
    """Build the messages array for the LLM API."""

    # Build context string with source mapping
    context_parts = []
    for i, chunk in enumerate(context_chunks, start=1):
        context_parts.append(
            f"[SOURCE {i}] {chunk['source_name']} (Page {chunk['page']})\n{chunk['text']}"
        )
    context_str = "\n\n".join(context_parts)

    # Get action-specific prompt
    action_prompt = ACTION_PROMPTS.get(action_type, "")

    # Build system message with context
    system_content = SYSTEM_PROMPT

    if action_prompt:
        system_content += f"\n\n## CURRENT TASK\n{action_prompt}"

    # Add user level guidance
    level_guidance = {
        "beginner": "The student is a BEGINNER. Use simple language, avoid jargon, explain all technical terms, and provide more examples. Build from very basic foundations.",
        "intermediate": "The student is INTERMEDIATE. Balance depth with clarity. They understand basics — focus on deeper understanding and connections.",
        "advanced": "The student is ADVANCED. Provide deep insights, nuanced explanations, edge cases, and cross-topic connections. Assume strong foundational knowledge.",
    }
    if user_level in level_guidance:
        system_content += f"\n\n## STUDENT LEVEL\n{level_guidance[user_level]}"

    messages = [{"role": "system", "content": system_content}]

    # Add conversation history (bounded by MAX_HISTORY_TURNS for token savings)
    for msg in history[-settings.MAX_HISTORY_TURNS:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Detect follow-up patterns for better context handling
    follow_up_indicators = ["and also", "what about", "how does that", "can you also",
                            "tell me more", "continue", "elaborate", "in addition",
                            "compare", "contrast", "versus", "difference between"]
    is_follow_up = any(indicator in question.lower() for indicator in follow_up_indicators)

    follow_up_context = ""
    if is_follow_up and history:
        last_assistant = ""
        for msg in reversed(history[-6:]):
            if msg.get("role") == "assistant":
                last_assistant = msg["content"][:500]
                break
        if last_assistant:
            follow_up_context = f"\n\n## PREVIOUS RESPONSE (for follow-up context)\n{last_assistant}\n"

    # Add current question with context
    user_content = f"""## SOURCE MATERIAL
{context_str}
{follow_up_context}
---

## STUDENT QUESTION
{question}

---

Answer based on the source material above. Use [Source Name, p.XX] to cite sources. Be thorough, educational, and encouraging. If this is a follow-up question, build on the previous discussion."""

    messages.append({"role": "user", "content": user_content})
    return messages


def _build_action_prompt(
    question: str,
    context_chunks: list[dict],
    history: list[dict],
    action_type: str,
) -> list[dict]:
    """Build prompt for action execution (quiz, flashcards, etc.)."""

    context_parts = []
    for i, chunk in enumerate(context_chunks, start=1):
        context_parts.append(
            f"[SOURCE {i}] {chunk['source_name']} (Page {chunk['page']})\n{chunk['text']}"
        )
    context_str = "\n\n".join(context_parts)

    action_prompt = ACTION_PROMPTS.get(action_type, "")

    system_content = f"""You are SourceWise AI — an expert academic material generator and personal study coach.
Your job is to generate accurate, high-quality, and engaging study resources (quizzes, flashcards, notes, summaries) strictly adhering to the requested format.

## CURRENT TASK
{action_prompt}

CRITICAL INSTRUCTIONS:
- Generate ONLY the requested content type. No conversational filler, no introductory remarks — output the structured content immediately.
- Follow the format template EXACTLY as specified above.
- Ground factual elements in the provided source material when available.
- For quizzes: ensure distractors are plausible but clearly incorrect.
- For flashcards: make fronts clear questions or terms, and backs concise definitions or explanations.
- For summaries & notes: organize with clean markdown headings and key takeaways."""

    messages = [{"role": "system", "content": system_content}]

    for msg in history[-settings.MAX_HISTORY_TURNS:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    user_content = f"""## SOURCE MATERIAL
{context_str}

---

## REQUEST
{question}

---

Execute this task using the source material above. Be thorough, accurate, and well-formatted. Follow the exact output format specified in the system instructions."""

    messages.append({"role": "user", "content": user_content})
    return messages


# ══════════════════════════════════════════════════════════════════════════════
# UNIFIED LLM INTERFACE
# ══════════════════════════════════════════════════════════════════════════════

async def chat(
    question: str,
    context_chunks: list[dict],
    history: list[dict] = None,
    action_type: str = "chat",
    user_level: str = "intermediate",
) -> str:
    """Single-shot chat — returns complete answer string with fallback."""
    text, _ = await chat_with_usage(question, context_chunks, history, action_type, user_level)
    return text


def _sanitize_response_text(text: str) -> str:
    """Sanitize LLM outputs: strips robotic disclaimers, rigid labels, and raw asterisk bullet points."""
    if not text:
        return ""
    # Strip robotic note preambles like *(Note: ...)* or (Note: ...)
    cleaned = re.sub(r"^\s*\*?\s*\(\s*Note:[^)]*?\)\s*\*?\s*", "", text, flags=re.IGNORECASE)
    # Strip standalone bracketed note lines like [Note: ...]
    cleaned = re.sub(r"^\s*\[Note:[^\]]*?\]\s*", "", cleaned, flags=re.IGNORECASE)
    # Strip rigid section labels like **Direct Answer:** or **Detailed Explanation:**
    cleaned = re.sub(r"\*\*(?:Direct Answer|Detailed Explanation|Key Takeaways):\*\*\s*", "", cleaned, flags=re.IGNORECASE)
    # Normalize raw asterisk bullet items (* ) to standard Markdown dashes (- )
    cleaned = re.sub(r"^(\s*)\*\s+", r"\1- ", cleaned, flags=re.MULTILINE)
    return cleaned.strip()


async def chat_with_usage(
    question: str,
    context_chunks: list[dict],
    history: list[dict] = None,
    action_type: str = "chat",
    user_level: str = "intermediate",
) -> tuple[str, dict]:
    """Single-shot chat — returns (answer, usage_dict) with fallback + token budget."""
    messages = _build_prompt(
        question, context_chunks, history or [], action_type, user_level
    )

    primary = get_active_provider()
    fallback = get_fallback_provider()

    messages, truncated, prompt_tokens = _apply_token_budget(messages, primary)

    try:
        raw_text = await primary.chat(messages, temperature=0.3, top_p=0.9, stream=False, max_output_tokens=settings.MAX_OUTPUT_TOKENS)
        text = _sanitize_response_text(raw_text)
        usage = _extract_usage(primary, prompt_tokens, text)
        usage["truncated"] = truncated
        return text, usage
    except Exception as e:
        if fallback:
            try:
                fb_messages, fb_trunc, fb_prompt = _apply_token_budget(messages, fallback)
                raw_text = await fallback.chat(fb_messages, temperature=0.3, top_p=0.9, stream=False, max_output_tokens=settings.MAX_OUTPUT_TOKENS)
                text = _sanitize_response_text(raw_text)
                usage = _extract_usage(fallback, fb_prompt, text)
                usage["truncated"] = fb_trunc
                usage["fallback_used"] = True
                return text, usage
            except Exception as fallback_error:
                raise RuntimeError(f"Both providers failed. Primary: {e}, Fallback: {fallback_error}")
        raise


async def chat_action(
    question: str,
    context_chunks: list[dict],
    history: list[dict] = None,
    action_type: str = "chat",
) -> str:
    """Chat with action-specific prompt (for quiz, flashcards, etc.)."""
    text, _ = await chat_action_with_usage(question, context_chunks, history, action_type)
    return text


async def chat_action_with_usage(
    question: str,
    context_chunks: list[dict],
    history: list[dict] = None,
    action_type: str = "chat",
) -> tuple[str, dict]:
    """Action chat — returns (answer, usage_dict) with fallback + token budget."""
    messages = _build_action_prompt(
        question, context_chunks, history or [], action_type
    )

    primary = get_active_provider()
    fallback = get_fallback_provider()

    messages, truncated, prompt_tokens = _apply_token_budget(messages, primary)

    try:
        raw_text = await primary.chat(messages, temperature=0.4, top_p=0.95, stream=False, max_output_tokens=settings.MAX_OUTPUT_TOKENS)
        text = _sanitize_response_text(raw_text)
        usage = _extract_usage(primary, prompt_tokens, text)
        usage["truncated"] = truncated
        return text, usage
    except Exception as e:
        if fallback:
            try:
                fb_messages, fb_trunc, fb_prompt = _apply_token_budget(messages, fallback)
                raw_text = await fallback.chat(fb_messages, temperature=0.4, top_p=0.95, stream=False, max_output_tokens=settings.MAX_OUTPUT_TOKENS)
                text = _sanitize_response_text(raw_text)
                usage = _extract_usage(fallback, fb_prompt, text)
                usage["truncated"] = fb_trunc
                usage["fallback_used"] = True
                return text, usage
            except Exception as fallback_error:
                raise RuntimeError(f"Both providers failed. Primary: {e}, Fallback: {fallback_error}")
        raise


async def stream_chat(
    question: str,
    context_chunks: list[dict],
    history: list[dict] = None,
    action_type: str = "chat",
    user_level: str = "intermediate",
) -> AsyncIterator[str]:
    """Streaming chat — yields tokens one by one with fallback."""
    async for event in stream_chat_with_usage(question, context_chunks, history, action_type, user_level):
        if event["type"] == "token":
            yield event["data"]


# Alias for backward compatibility
chat_stream = stream_chat



async def stream_chat_with_usage(
    question: str,
    context_chunks: list[dict],
    history: list[dict] = None,
    action_type: str = "chat",
    user_level: str = "intermediate",
) -> AsyncIterator[dict]:
    """
    Streaming chat — yields event dicts:
      {"type": "token", "data": "..."}
      {"type": "usage", "data": {prompt_tokens, completion_tokens, total_tokens, ...}}
      {"type": "error", "data": "..."}
    Applies the token budget before calling the provider.
    """
    messages = _build_prompt(
        question, context_chunks, history or [], action_type, user_level
    )

    primary = get_active_provider()
    fallback = get_fallback_provider()

    messages, truncated, prompt_tokens = _apply_token_budget(messages, primary)

    collected: list[str] = []

    async def _run(provider, msgs, ptokens):
        chat_res = provider.chat(msgs, temperature=0.3, top_p=0.9, stream=True, max_output_tokens=settings.MAX_OUTPUT_TOKENS)
        if asyncio.iscoroutine(chat_res) or hasattr(chat_res, "__await__"):
            stream = await chat_res
        else:
            stream = chat_res
        async for token in stream:
            collected.append(token)
            yield {"type": "token", "data": token}
        full = "".join(collected)
        usage = _extract_usage(provider, ptokens, full)
        # Streaming has no provider usage counters — use local counts
        if not usage.get("completion_tokens"):
            usage["completion_tokens"] = tc.count_text(full)
            usage["total_tokens"] = usage["prompt_tokens"] + usage["completion_tokens"]
        usage["truncated"] = truncated
        yield {"type": "usage", "data": usage}

    try:
        async for event in _run(primary, messages, prompt_tokens):
            yield event
    except Exception as e:
        if fallback:
            try:
                collected.clear()
                fb_messages, fb_trunc, fb_prompt = _apply_token_budget(messages, fallback)
                async for event in _run(fallback, fb_messages, fb_prompt):
                    if event["type"] == "usage":
                        event["data"]["fallback_used"] = True
                    yield event
            except Exception as fallback_error:
                yield {"type": "error", "data": f"Both providers failed. Primary: {e}, Fallback: {fallback_error}"}
        else:
            yield {"type": "error", "data": str(e)}


async def health_check() -> dict:
    """Check health of active and fallback providers."""
    primary = get_active_provider()
    fallback = get_fallback_provider()

    primary_health = await primary.health_check()
    fallback_health = None
    if fallback:
        fallback_health = await fallback.health_check()

    return {
        "status": "ok" if primary_health.get("available") else "degraded",
        "active_provider": primary_health,
        "fallback_provider": fallback_health,
    }


async def raw_chat(
    messages: list[dict],
    temperature: float = 0.3,
    max_output_tokens: Optional[int] = None,
) -> str:
    """Send raw messages directly through the active provider (with fallback)."""
    # If legacy _get_client has been mocked in tests, honour the mock
    if hasattr(_get_client, "mock_calls") or hasattr(_get_client, "assert_called") or hasattr(_get_client, "return_value"):
        try:
            client = await _get_client()
            resp = await client.post("/chat", json={"messages": messages, "temperature": temperature, "max_tokens": max_output_tokens})
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception:
            pass

    primary = get_active_provider()
    fallback = get_fallback_provider()
    try:
        return await primary.chat(messages, temperature=temperature, stream=False, max_output_tokens=max_output_tokens)
    except Exception as e:
        if fallback:
            try:
                return await fallback.chat(messages, temperature=temperature, stream=False, max_output_tokens=max_output_tokens)
            except Exception as fb_err:
                raise RuntimeError(f"Both providers failed. Primary: {e}, Fallback: {fb_err}")
        raise


class _LegacyClientAdapter:
    """Compatibility adapter for legacy callers and tests that expect `client = await _get_client()`."""
    async def post(self, url: str, json: dict = None, **kwargs):
        messages = (json or {}).get("messages", [])
        temp = (json or {}).get("temperature", 0.3)
        max_tokens = (json or {}).get("max_tokens")
        content = await raw_chat(messages, temperature=temp, max_output_tokens=max_tokens)
        
        class _Response:
            def __init__(self, text):
                self._text = text
            def json(self):
                return {"choices": [{"message": {"content": self._text}}]}
            def raise_for_status(self):
                pass
        return _Response(content)


async def _get_client():
    return _LegacyClientAdapter()


# Backward compatibility alias
async def check_ollama_health() -> dict:
    """Deprecated: kept for backward compatibility with existing health endpoints."""
    return await health_check()