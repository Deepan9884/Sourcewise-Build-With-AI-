"""
Puzzles router — generates and verifies study puzzle games.
All endpoints require X-Internal-Key auth (gated by verify_internal_key).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any

from app.utils.internal_auth import verify_internal_key
from app.utils.logging import get_logger
from app.agents.base import AgentContext
from app.agents.puzzle_agent import puzzle_agent

logger = get_logger("sourcewise.puzzles")
router = APIRouter()


class GenerateRequest(BaseModel):
    puzzle_type: str
    source_ids: List[str] = []
    topic: str = "key concepts"
    difficulty: str = "study"
    count: int = 10
    user_id: Optional[str] = "anonymous"


class VerifyRequest(BaseModel):
    puzzle_type: str
    puzzle_data: dict
    user_answer: Any


class HintRequest(BaseModel):
    puzzle_type: str
    puzzle_data: dict
    hint_target: Any = None


VALID_TYPES = {"word_search", "match_pairs", "rapid_fire", "memory_flip", "anagram", "cloze"}


@router.post("/generate")
async def generate_puzzle(req: GenerateRequest):
    """Generate a study puzzle from source material."""
    if req.puzzle_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid puzzle_type. Must be one of: {', '.join(VALID_TYPES)}")

    context = AgentContext(
        user_id=req.user_id or "anonymous",
        source_ids=req.source_ids,
    )

    logger.info("puzzle.generate", extra={
        "puzzle_type": req.puzzle_type,
        "topic": req.topic,
        "source_count": len(req.source_ids),
    })

    result = await puzzle_agent.execute(
        context,
        puzzle_type=req.puzzle_type,
        topic=req.topic,
        count=req.count,
        difficulty=req.difficulty,
    )

    if not result.success:
        raise HTTPException(status_code=500, detail=result.message)

    return {
        "success": True,
        "puzzle_type": req.puzzle_type,
        "topic": req.topic,
        "data": result.data,
        "message": result.message,
    }


@router.post("/verify")
async def verify_answer(req: VerifyRequest):
    """Verify a completed puzzle submission and return score."""
    pt = req.puzzle_type
    pd = req.puzzle_data
    ua = req.user_answer  # shape varies by type

    if pt == "word_search":
        # ua = list of found word strings
        words = pd.get("words", [])
        found_terms = set(str(w).upper() for w in (ua or []))
        correct = [w for w in words if w.get("word", "").upper() in found_terms]
        score = len(correct)
        max_score = len(words)
        return {"correct": score == max_score, "score": score, "max_score": max_score,
                "details": [{"word": w["word"], "found": w["word"].upper() in found_terms} for w in words]}

    elif pt == "match_pairs":
        # ua = {term_id: definition_id}
        terms = pd.get("terms", [])
        defs = {d["id"]: d["term_id"] for d in pd.get("definitions", [])}
        user_map = ua or {}
        correct = sum(1 for tid, did in user_map.items() if defs.get(did) == tid)
        max_score = len(terms)
        return {"correct": correct == max_score, "score": correct, "max_score": max_score}

    elif pt == "rapid_fire":
        # ua = {question_index: selected_index}
        questions = pd.get("questions", [])
        user_answers = ua or {}
        correct = sum(
            1 for i, q in enumerate(questions)
            if str(user_answers.get(i)) == str(q.get("correct_index"))
        )
        max_score = len(questions)
        return {"correct": correct == max_score, "score": correct, "max_score": max_score,
                "details": [{"term": q["term"], "correct": str(user_answers.get(i)) == str(q.get("correct_index"))} for i, q in enumerate(questions)]}

    elif pt == "memory_flip":
        # ua = number of flips taken
        pair_count = pd.get("pair_count", 8)
        flips = int(ua or 0)
        score = max(0, 100 - max(0, flips - pair_count) * 5)
        return {"correct": True, "score": score, "max_score": 100}

    elif pt == "anagram":
        # ua = {index: guessed_term}
        anagrams = pd.get("anagrams", [])
        user_answers = ua or {}
        correct = sum(
            1 for i, a in enumerate(anagrams)
            if str(user_answers.get(i, "")).upper().strip() == a.get("term", "").upper()
        )
        max_score = len(anagrams)
        return {"correct": correct == max_score, "score": correct, "max_score": max_score}

    elif pt == "cloze":
        # ua = {blank_index: chosen_answer}
        blanks = pd.get("blanks", [])
        user_answers = ua or {}
        correct = sum(
            1 for b in blanks
            if str(user_answers.get(str(b["index"]), "")).lower().strip() == b.get("answer", "").lower().strip()
        )
        max_score = len(blanks)
        return {"correct": correct == max_score, "score": correct, "max_score": max_score,
                "details": [{"index": b["index"], "answer": b["answer"],
                             "user": user_answers.get(str(b["index"]), ""),
                             "correct": str(user_answers.get(str(b["index"]), "")).lower().strip() == b.get("answer", "").lower().strip()}
                            for b in blanks]}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown puzzle type: {pt}")


@router.post("/hint")
async def get_hint(req: HintRequest):
    """Return a hint for the current puzzle state. Costs 5 XP."""
    pt = req.puzzle_type
    pd = req.puzzle_data
    target = req.hint_target

    if pt == "word_search":
        # Reveal first letter + direction for target word
        words = pd.get("words", [])
        word_data = next((w for w in words if w.get("word") == target), None)
        if word_data:
            positions = word_data.get("positions", [])
            first = positions[0] if positions else {}
            return {"hint": f"Starts at row {first.get('row', 0)}, column {first.get('col', 0)}, direction: {word_data.get('direction', '?')}", "xp_cost": 5}
        return {"hint": "Word not found in puzzle data", "xp_cost": 0}

    elif pt == "anagram":
        # Reveal first 2 letters of the target word
        anagrams = pd.get("anagrams", [])
        idx = int(target) if target is not None else 0
        if 0 <= idx < len(anagrams):
            term = anagrams[idx].get("term", "")
            return {"hint": f"Starts with: {term[:2]}", "xp_cost": 5}
        return {"hint": "No hint available", "xp_cost": 0}

    elif pt == "cloze":
        # Reveal first letter of blank
        blanks = pd.get("blanks", [])
        idx = int(target) if target is not None else 0
        blank = next((b for b in blanks if b.get("index") == idx), None)
        if blank:
            ans = blank.get("answer", "")
            return {"hint": f"Starts with: {ans[0].upper() if ans else '?'} ({len(ans)} letters)", "xp_cost": 5}
        return {"hint": "No hint available", "xp_cost": 0}

    else:
        return {"hint": "No hint available for this puzzle type", "xp_cost": 0}
