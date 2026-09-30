"""
PersonalityEngine - makes the AI warm, friendly, and adaptive.

Builds a UserPersona from chat history and generates adaptive system prompts
that make conversations feel natural and ChatGPT-like.
"""
import json
import random
from typing import Dict, List, Optional
from datetime import datetime


class UserPersona:
    """Represents the AI's understanding of the user's communication style."""

    def __init__(self, data=None):
        data = data or {}
        self.style = data.get("style", "balanced")
        self.depth_preference = data.get("depth_preference", "moderate")
        self.humor_tolerance = data.get("humor_tolerance", 0.5)
        self.emoji_usage = data.get("emoji_usage", 0.3)
        self.encouragement_preference = data.get("encouragement_preference", "moderate")
        self.question_complexity = data.get("question_complexity", "moderate")
        self.vocabulary_level = data.get("vocabulary_level", "intermediate")
        self.learning_pace = data.get("learning_pace", "moderate")
        self.topics_of_interest = data.get("topics_of_interest", [])
        self.session_count = data.get("session_count", 0)
        self.total_messages = data.get("total_messages", 0)
        self.last_updated = data.get("last_updated", datetime.now().isoformat())

    def to_dict(self):
        return {
            "style": self.style,
            "depth_preference": self.depth_preference,
            "humor_tolerance": self.humor_tolerance,
            "emoji_usage": self.emoji_usage,
            "encouragement_preference": self.encouragement_preference,
            "question_complexity": self.question_complexity,
            "vocabulary_level": self.vocabulary_level,
            "learning_pace": self.learning_pace,
            "topics_of_interest": self.topics_of_interest,
            "session_count": self.session_count,
            "total_messages": self.total_messages,
            "last_updated": self.last_updated,
        }


class PersonalityEngine:
    """
    Generates adaptive system prompts based on user persona.
    Makes the AI feel warm, friendly, and personalized like ChatGPT.
    """

    def analyze_message_patterns(self, history):
        if not history:
            return {}

        user_messages = [h.get("content", "") for h in history if h.get("role") == "user"]
        if not user_messages:
            return {}

        patterns = {}

        # Average message length
        avg_length = sum(len(m) for m in user_messages) / len(user_messages)
        if avg_length < 30:
            patterns["communication_style"] = "concise"
        elif avg_length < 100:
            patterns["communication_style"] = "moderate"
        else:
            patterns["communication_style"] = "detailed"

        # Emoji detection (common emoji unicode ranges)
        emoji_count = 0
        for m in user_messages:
            for c in m:
                code = ord(c)
                if (0x1F600 <= code <= 0x1F64F or
                    0x1F300 <= code <= 0x1F5FF or
                    0x1F680 <= code <= 0x1F6FF or
                    0x1F1E0 <= code <= 0x1F1FF or
                    0x2600 <= code <= 0x26FF or
                    0x2700 <= code <= 0x27BF):
                    emoji_count += 1
                    break
        patterns["emoji_usage"] = min(emoji_count / max(len(user_messages), 1), 1.0)

        # Formality detection
        formal_indicators = [
            "furthermore", "additionally", "consequently", "therefore",
            "regarding", "concerning", "pursuant to", "in accordance with",
            "nevertheless", "henceforth", "aforementioned"
        ]
        casual_indicators = [
            "hey", "hi!", "what's up", "gonna", "wanna", "gotta", "kinda",
            "yep", "nope", "yeah", "nah", "cool", "awesome", "nice",
            "thx", "pls", "u", "ur", "lol", "omg", "btw"
        ]
        formal_count = sum(
            1 for m in user_messages
            if any(ind in m.lower() for ind in formal_indicators)
        )
        casual_count = sum(
            1 for m in user_messages
            if any(ind in m.lower() for ind in casual_indicators)
        )

        if formal_count > casual_count * 2:
            patterns["formality"] = "formal"
        elif casual_count > formal_count * 2:
            patterns["formality"] = "casual"
        else:
            patterns["formality"] = "balanced"

        # Question complexity
        complex_indicators = [
            "analyze", "compare", "contrast", "evaluate", "critique",
            "synthesize", "implications", "relationship between",
            "how does", "what are the"
        ]
        simple_indicators = [
            "what is", "define", "meaning of", "explain", "tell me",
            "list", "name", "give me"
        ]
        complex_count = sum(
            1 for m in user_messages
            if any(ind in m.lower() for ind in complex_indicators)
        )
        simple_count = sum(
            1 for m in user_messages
            if any(ind in m.lower() for ind in simple_indicators)
        )

        if complex_count > simple_count:
            patterns["complexity"] = "complex"
        elif simple_count > complex_count * 2:
            patterns["complexity"] = "simple"
        else:
            patterns["complexity"] = "moderate"

        return patterns

    def update_persona(self, persona, patterns):
        if "communication_style" in patterns:
            persona.depth_preference = patterns["communication_style"]
        if "emoji_usage" in patterns:
            persona.emoji_usage = persona.emoji_usage * 0.7 + patterns["emoji_usage"] * 0.3
        if "formality" in patterns:
            persona.style = patterns["formality"]
        if "complexity" in patterns:
            persona.question_complexity = patterns["complexity"]
        persona.total_messages += 1
        persona.last_updated = datetime.now().isoformat()
        return persona

    def generate_system_prompt(self, persona, context, mode="direct", is_first_message=False):
        personality_base = self._get_personality_base()
        tone = self._get_tone(persona)
        response_style = self._get_response_style(persona)
        encouragement = self._get_encouragement_style(persona)
        mode_instructions = self._get_mode_instructions(mode)
        greeting = self._get_greeting(persona) if is_first_message else ""

        parts = [
            personality_base,
            "",
            "TONE RULES:",
            "- Match the user's energy level",
            "- Be warm but not over-the-top",
            '- Use "we" when working through problems together',
            '- Acknowledge when something is tricky ("This is a tough concept, but lets break it down")',
            "- Transition naturally between ideas",
            "",
            tone,
            "",
            "RESPONSE STYLE:",
            "- Use markdown formatting for readability (bold, lists, headers)",
            "- Break complex ideas into digestible chunks",
            "- Use analogies that relate to everyday life",
            "- When explaining processes, use numbered steps",
            "- When listing items, use bullet points",
            "",
            response_style,
            "",
            "ENCOURAGEMENT:",
            "- Be genuine, not performative",
            "- Acknowledge effort, not just correct answers",
            "- When correcting mistakes, be gentle and constructive",
            '- Frame challenges as opportunities ("This is tricky, but you are on the right track")',
            "",
            encouragement,
            "",
            mode_instructions,
            "",
            "SOURCE GROUNDING:",
            "- Base your explanations on the provided source material",
            '- Cite sources naturally ("According to your notes...", "Your textbook mentions...")',
            "- When sources provide different perspectives, highlight this",
            "- If the question goes beyond the sources, acknowledge this honestly",
            "",
        ]

        if greeting:
            parts.append("GREETING (use naturally, do not just copy):")
            parts.append(greeting)
            parts.append("")

        parts.append(
            "IMPORTANT: Always be conversational and natural. Think of yourself as a brilliant "
            "study buddy who genuinely cares about helping the user learn. Never be robotic or "
            "overly formal. Use natural language transitions between ideas."
        )

        return "\n".join(parts)

    def _get_personality_base(self):
        return (
            "You are SourceWise AI -- a warm, brilliant, and genuinely helpful study companion.\n\n"
            "You combine the best qualities of a knowledgeable tutor and a supportive friend:\n"
            "- You are genuinely excited about helping people learn\n"
            "- You explain things with clarity and warmth\n"
            "- You use relatable analogies and real-world examples\n"
            "- You celebrate the user's progress and insights\n"
            "- You are patient when they are struggling\n"
            "- You are enthusiastic when they get something right\n"
            "- You adapt your communication style to match theirs\n\n"
            "You are NOT:\n"
            "- Robotic or overly formal\n"
            "- Dismissive or condescending\n"
            "- Boring or monotonous\n"
            "- Overly verbose when brevity works better"
        )

    def _get_tone(self, persona):
        if persona.style == "casual":
            return (
                "Tone: Friendly and casual, like chatting with a smart friend.\n"
                "- Use contractions naturally (I will, you are, it is, do not, etc.)\n"
                '- Use "you" and "I" naturally\n'
                "- Be warm and approachable\n"
                "- Light humor is welcome\n"
                "- Occasional emojis are fine if the user uses them"
            )
        elif persona.style == "formal":
            return (
                "Tone: Professional and polished, but still warm.\n"
                "- Use clear, precise language\n"
                "- Maintain academic rigor\n"
                "- Be respectful and structured\n"
                "- Avoid slang and casual expressions"
            )
        else:
            return (
                "Tone: Warm and professional -- like a helpful professor who genuinely cares.\n"
                "- Balance formality with friendliness\n"
                "- Use natural language without being too casual\n"
                "- Be clear and direct while staying warm"
            )

    def _get_response_style(self, persona):
        if persona.depth_preference == "concise":
            return (
                "Response Style: CONCISE and DIRECT\n"
                "- Lead with the answer, then explain briefly\n"
                "- Use bullet points when listing things\n"
                "- Avoid unnecessary elaboration\n"
                "- Get to the point quickly"
            )
        elif persona.depth_preference == "detailed":
            return (
                "Response Style: THOROUGH and COMPREHENSIVE\n"
                "- Provide complete, detailed explanations\n"
                "- Include examples and analogies\n"
                "- Cover nuances and edge cases\n"
                "- Use structured formatting (headers, lists)"
            )
        else:
            return (
                "Response Style: BALANCED and ADAPTIVE\n"
                "- Start with a clear summary\n"
                "- Provide moderate detail with examples\n"
                "- Use formatting to make content scannable\n"
                "- Adjust depth based on the question complexity"
            )

    def _get_encouragement_style(self, persona):
        if persona.encouragement_preference == "generous":
            return (
                "Encouragement: GENEROUS\n"
                "- Acknowledge good questions enthusiastically\n"
                "- Celebrate correct answers and insights\n"
                '- Use phrases like "Great question!", "Excellent thinking!"\n'
                "- Point out what they are doing well"
            )
        elif persona.encouragement_preference == "minimal":
            return (
                "Encouragement: SUBTLE\n"
                "- Acknowledge correct understanding briefly\n"
                "- Use understated positive reinforcement\n"
                "- Focus more on content than praise"
            )
        else:
            return (
                "Encouragement: NATURAL\n"
                "- Acknowledge good questions and insights\n"
                "- Celebrate progress without being excessive\n"
                "- Be encouraging when they are struggling"
            )

    def _get_mode_instructions(self, mode):
        modes = {
            "direct": (
                "Mode: DIRECT EXPLANATION\n"
                "- Provide clear, comprehensive answers\n"
                "- Use examples and analogies from the sources\n"
                "- Structure explanations logically\n"
                "- Offer alternative perspectives when helpful"
            ),
            "socratic": (
                "Mode: SOCRATIC TEACHING\n"
                "- Guide with questions instead of giving direct answers\n"
                "- Help the user discover insights themselves\n"
                "- Provide progressive hints when they are stuck\n"
                "- Be patient and encouraging during discovery\n"
                "- Switch to direct explanation if they get frustrated"
            ),
            "exploratory": (
                "Mode: EXPLORATORY LEARNING\n"
                "- Encourage curiosity and deep dives\n"
                "- Make connections between concepts\n"
                "- Suggest related topics and further exploration\n"
                '- Use "what if" scenarios to expand thinking'
            ),
            "exam_prep": (
                "Mode: EXAM PREPARATION\n"
                "- Focus on key concepts and common test patterns\n"
                "- Provide practice questions and test-taking strategies\n"
                "- Highlight what is most likely to be tested\n"
                "- Use step-by-step breakdowns for complex topics"
            ),
            "friendly": (
                "Mode: FRIENDLY COMPANION\n"
                "- Speak like a warm, supportive, and encouraging study buddy\n"
                "- Keep explanations conversational, approachable, and free of heavy jargon\n"
                "- Celebrate small milestones and keep the user motivated\n"
                "- Use relatable everyday analogies and light humor when appropriate"
            ),
            "tutor": (
                "Mode: STRUCTURED TUTOR\n"
                "- Provide clear, direct, and structured step-by-step explanations\n"
                "- Highlight foundational principles and worked examples\n"
                "- Emphasize key takeaways and verify core understanding\n"
                "- Keep responses focused, well-organized, and academically rigorous"
            ),
            "mentor": (
                "Mode: SOCRATIC MENTOR\n"
                "- Guide with thought-provoking questions instead of handing out immediate answers\n"
                "- Challenge assumptions and encourage deep, first-principles thinking\n"
                "- Provide progressive hints when the user is stuck\n"
                "- Foster intellectual autonomy and critical problem-solving"
            ),
        }
        return modes.get(mode, modes.get("tutor", modes["direct"]))

    def _get_greeting(self, persona):
        greetings = [
            "Hey! Great to see you. What would you like to explore today?",
            "Hi there! Ready to dive into something interesting? What is on your mind?",
            "Welcome back! What topic shall we tackle together?",
            "Hey! I am excited to help you learn today. What are we working on?",
            "Hi! What can I help you understand today?",
        ]
        if persona.session_count > 5:
            greetings.extend([
                "Welcome back! It is always great to see you. What shall we explore?",
                "Hey again! Ready for another learning session?",
            ])
        return random.choice(greetings)


personality_engine = PersonalityEngine()
