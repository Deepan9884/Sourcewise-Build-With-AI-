"""
Puzzle Agent - Generates interactive study puzzles from source material.

Supports 6 puzzle types:
  word_search  — Find hidden terms in a letter grid
  match_pairs  — Drag-connect terms to definitions
  rapid_fire   — Speed quiz with timer per question
  memory_flip  — Classic concentration card-flip game
  anagram      — Unscramble shuffled letters to reveal terms
  cloze        — Fill in blanked terms in real source passages
"""

import json
import random
import string
from typing import List, Dict, Any, Optional
from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.registry import registry
from app.services import vector_store, llm as llm_service


# ─── Grid directions for word search ──────────────────────────────────────────
DIRECTIONS = [(0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)]
DIRECTION_NAMES = ["E", "W", "S", "N", "SE", "SW", "NE", "NW"]


class PuzzleAgent(BaseAgent):
    """
    Generates interactive study puzzles from source material.

    All puzzles are grounded in the user's own uploaded sources via
    RAG retrieval, making every game session personalised to their notes.
    """

    def can_handle(self, intent: str) -> bool:
        return intent in [
            "puzzle", "word_search", "match_pairs", "rapid_fire",
            "memory_flip", "anagram", "cloze", "game",
        ]

    def get_capabilities(self) -> List[str]:
        return [
            "word_search_generation",
            "match_pairs_generation",
            "rapid_fire_generation",
            "memory_flip_generation",
            "anagram_generation",
            "cloze_generation",
        ]

    async def execute(self, context: AgentContext, **kwargs) -> AgentResult:
        puzzle_type = kwargs.get("puzzle_type", "word_search")
        topic = kwargs.get("topic", "key concepts")
        count = kwargs.get("count", 10)
        difficulty = kwargs.get("difficulty", "study")

        dispatch = {
            "word_search": self._gen_word_search,
            "match_pairs": self._gen_match_pairs,
            "rapid_fire": self._gen_rapid_fire,
            "memory_flip": self._gen_memory_flip,
            "anagram": self._gen_anagram,
            "cloze": self._gen_cloze,
        }

        fn = dispatch.get(puzzle_type)
        if not fn:
            return self._create_result(
                success=False, action="generate_puzzle",
                message=f"Unknown puzzle type: {puzzle_type}",
            )

        return await fn(context, topic=topic, count=count, difficulty=difficulty)

    # ──────────────────────────────────────────────────────────────────────────
    # Word Search
    # ──────────────────────────────────────────────────────────────────────────

    async def _gen_word_search(self, context: AgentContext, topic: str, count: int, difficulty: str) -> AgentResult:
        chunks = vector_store.query_chunks(
            question=f"key terms and vocabulary about {topic}",
            source_ids=context.source_ids,
            top_k=8,
        )
        context_text = "\n".join(c.get("text", "")[:400] for c in chunks[:6]) if chunks else ""

        prompt = f"""Extract {min(count, 15)} important single-word or hyphenated academic terms from this text about '{topic}'.
Return ONLY a JSON array. No markdown. No explanation.
Format: [{{"term": "MITOCHONDRIA", "definition": "Organelle that produces cellular energy (ATP)"}}]
Rules:
- Terms must be 4-15 characters, UPPERCASE, no spaces (use hyphen if needed: CELL-CYCLE)
- Prefer nouns and technical keywords
- Each definition: 1 concise sentence
- If source text is empty, invent 10 plausible terms for the topic

Source text:
{context_text[:1500]}

JSON array:"""

        raw = await llm_service.chat(question=prompt, context_chunks=chunks or [], history=[])
        words = self._parse_json(raw, [])

        # Fallback demo data
        if not words or len(words) < 5:
            words = self._fallback_word_search_terms(topic)

        # Sanitise: uppercase, no spaces, max 14 chars
        cleaned = []
        seen = set()
        for w in words:
            term = str(w.get("term", "")).upper().replace(" ", "-")[:14]
            if len(term) >= 3 and term not in seen:
                cleaned.append({"term": term, "definition": w.get("definition", "")})
                seen.add(term)

        grid_size = 15 if len(cleaned) >= 10 else 12
        grid, word_positions = self._build_word_search_grid(
            [w["term"] for w in cleaned], grid_size
        )

        # Merge positions back with definitions
        result_words = []
        for wp in word_positions:
            defn = next((w["definition"] for w in cleaned if w["term"] == wp["word"]), "")
            result_words.append({**wp, "definition": defn, "found": False})

        return self._create_result(
            success=True, action="word_search",
            data={"grid": grid, "words": result_words, "grid_size": grid_size, "topic": topic},
            message=f"Word search with {len(result_words)} terms about {topic}",
        )

    def _build_word_search_grid(self, words: List[str], size: int):
        grid = [["" for _ in range(size)] for _ in range(size)]
        placed = []

        sorted_words = sorted(words, key=len, reverse=True)

        for word in sorted_words:
            placed_word = False
            attempts = 0
            dirs_shuffled = DIRECTIONS[:]
            random.shuffle(dirs_shuffled)

            while not placed_word and attempts < 80:
                attempts += 1
                dr, dc = random.choice(dirs_shuffled)
                row = random.randint(0, size - 1)
                col = random.randint(0, size - 1)

                # Check if word fits
                end_r = row + dr * (len(word) - 1)
                end_c = col + dc * (len(word) - 1)
                if not (0 <= end_r < size and 0 <= end_c < size):
                    continue

                # Check collisions
                can_place = True
                for i, ch in enumerate(word):
                    gr, gc = row + dr * i, col + dc * i
                    if grid[gr][gc] != "" and grid[gr][gc] != ch:
                        can_place = False
                        break

                if can_place:
                    positions = []
                    for i, ch in enumerate(word):
                        gr, gc = row + dr * i, col + dc * i
                        grid[gr][gc] = ch
                        positions.append({"row": gr, "col": gc})
                    placed.append({"word": word, "positions": positions,
                                   "direction": DIRECTION_NAMES[DIRECTIONS.index((dr, dc))]})
                    placed_word = True

        # Fill empty cells with random letters
        vowels = "AEIOU"
        consonants = "BCDFGHJKLMNPQRSTVWXYZ"
        for r in range(size):
            for c in range(size):
                if grid[r][c] == "":
                    grid[r][c] = random.choice(vowels if random.random() < 0.3 else consonants)

        return grid, placed

    # ──────────────────────────────────────────────────────────────────────────
    # Match Pairs
    # ──────────────────────────────────────────────────────────────────────────

    async def _gen_match_pairs(self, context: AgentContext, topic: str, count: int, difficulty: str) -> AgentResult:
        chunks = vector_store.query_chunks(
            question=f"definitions and concepts about {topic}",
            source_ids=context.source_ids, top_k=6,
        )
        context_text = "\n".join(c.get("text", "")[:400] for c in chunks[:5]) if chunks else ""
        n = min(count, 10)

        prompt = f"""Generate {n} term-definition pairs for '{topic}'.
Return ONLY valid JSON. No markdown.
Format: [{{"id": "1", "term": "Photosynthesis", "definition": "Process by which plants convert light into glucose"}}]
Rules:
- Terms: 1-4 words, clear academic vocabulary
- Definitions: 10-20 words, precise and educational
- No duplicate terms

Source:
{context_text[:1500]}

JSON:"""

        raw = await llm_service.chat(question=prompt, context_chunks=chunks or [], history=[])
        pairs = self._parse_json(raw, [])
        if not pairs or len(pairs) < 4:
            pairs = self._fallback_pairs(topic, n)

        # Assign clean IDs
        for i, p in enumerate(pairs):
            p["id"] = str(i + 1)

        terms = [{"id": p["id"], "term": p["term"]} for p in pairs]
        definitions = [{"id": f"d{p['id']}", "definition": p["definition"], "term_id": p["id"]} for p in pairs]
        random.shuffle(terms)
        random.shuffle(definitions)

        return self._create_result(
            success=True, action="match_pairs",
            data={"terms": terms, "definitions": definitions, "pair_count": len(pairs), "topic": topic},
            message=f"Match pairs with {len(pairs)} pairs about {topic}",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Rapid Fire
    # ──────────────────────────────────────────────────────────────────────────

    async def _gen_rapid_fire(self, context: AgentContext, topic: str, count: int, difficulty: str) -> AgentResult:
        chunks = vector_store.query_chunks(
            question=f"quiz questions about {topic}",
            source_ids=context.source_ids, top_k=8,
        )
        context_text = "\n".join(c.get("text", "")[:350] for c in chunks[:6]) if chunks else ""
        n = min(count, 12)

        prompt = f"""Generate {n} rapid-fire quiz questions for '{topic}'.
Each: show a TERM, player picks the correct DEFINITION from 4 options.
Return ONLY valid JSON. No markdown.
Format: [{{"term": "ATP", "correct": "Energy currency of the cell", "distractors": ["Genetic blueprint", "Membrane protein", "Enzyme catalyst"], "concept": "Energy metabolism"}}]
Rules:
- Distractors: plausible but clearly wrong
- Terms: single concept, 1-4 words
- Correct: concise 5-15 word definition

Source:
{context_text[:1500]}

JSON:"""

        raw = await llm_service.chat(question=prompt, context_chunks=chunks or [], history=[])
        items = self._parse_json(raw, [])
        if not items or len(items) < 4:
            items = self._fallback_rapid_fire(topic, n)

        questions = []
        for item in items[:n]:
            options = [item.get("correct", "")] + item.get("distractors", [])[:3]
            random.shuffle(options)
            correct_index = options.index(item.get("correct", options[0]))
            questions.append({
                "term": item.get("term", ""),
                "options": options,
                "correct_index": correct_index,
                "concept": item.get("concept", topic),
            })

        return self._create_result(
            success=True, action="rapid_fire",
            data={"questions": questions, "total": len(questions), "topic": topic},
            message=f"Rapid fire with {len(questions)} questions about {topic}",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Memory Flip
    # ──────────────────────────────────────────────────────────────────────────

    async def _gen_memory_flip(self, context: AgentContext, topic: str, count: int, difficulty: str) -> AgentResult:
        # Reuse match pairs logic, reformat for cards
        result = await self._gen_match_pairs(context, topic=topic, count=min(count, 8), difficulty=difficulty)
        if not result.success:
            return result

        terms = result.data.get("terms", [])
        defs_map = {d["term_id"]: d["definition"] for d in result.data.get("definitions", [])}

        cards = []
        for t in terms:
            pair_id = t["id"]
            cards.append({"id": f"t{pair_id}", "pair_id": pair_id, "content": t["term"], "card_type": "term"})
            cards.append({"id": f"d{pair_id}", "pair_id": pair_id, "content": defs_map.get(pair_id, ""), "card_type": "definition"})

        random.shuffle(cards)

        return self._create_result(
            success=True, action="memory_flip",
            data={"cards": cards, "pair_count": len(terms), "topic": topic},
            message=f"Memory flip with {len(terms)} pairs about {topic}",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Anagram
    # ──────────────────────────────────────────────────────────────────────────

    async def _gen_anagram(self, context: AgentContext, topic: str, count: int, difficulty: str) -> AgentResult:
        chunks = vector_store.query_chunks(
            question=f"vocabulary terms for {topic}",
            source_ids=context.source_ids, top_k=6,
        )
        context_text = "\n".join(c.get("text", "")[:350] for c in chunks[:5]) if chunks else ""
        n = min(count, 10)

        prompt = f"""Extract {n} important single-word (or compound, no spaces) academic terms from this text about '{topic}'.
Return ONLY valid JSON. No markdown.
Format: [{{"term": "MITOSIS", "definition": "Cell division producing two identical daughter cells", "hint": "Type of cell division"}}]
Rules:
- Single word only (can use hyphen), 4-14 characters UPPERCASE
- Include a short 3-5 word hint different from definition

Source:
{context_text[:1200]}

JSON:"""

        raw = await llm_service.chat(question=prompt, context_chunks=chunks or [], history=[])
        items = self._parse_json(raw, [])
        if not items or len(items) < 4:
            items = self._fallback_anagrams(topic, n)

        anagrams = []
        for item in items[:n]:
            term = str(item.get("term", "")).upper().replace(" ", "")[:14]
            if len(term) < 3:
                continue
            scrambled = self._scramble(term)
            anagrams.append({
                "term": term,
                "scrambled": scrambled,
                "definition": item.get("definition", ""),
                "hint": item.get("hint", f"Related to {topic}"),
            })

        return self._create_result(
            success=True, action="anagram",
            data={"anagrams": anagrams, "total": len(anagrams), "topic": topic},
            message=f"Anagram puzzle with {len(anagrams)} terms about {topic}",
        )

    def _scramble(self, word: str) -> str:
        letters = list(word)
        for _ in range(10):  # Try up to 10 times to get a different order
            random.shuffle(letters)
            if "".join(letters) != word:
                break
        return "".join(letters)

    # ──────────────────────────────────────────────────────────────────────────
    # Cloze (Fill in the Blank)
    # ──────────────────────────────────────────────────────────────────────────

    async def _gen_cloze(self, context: AgentContext, topic: str, count: int, difficulty: str) -> AgentResult:
        chunks = vector_store.query_chunks(
            question=topic or "key concepts",
            source_ids=context.source_ids, top_k=5,
        )

        # Pick a real passage from chunks
        passage_source = ""
        if chunks:
            for chunk in chunks:
                text = chunk.get("text", "")
                if len(text) > 200:
                    passage_source = text[:800]
                    break

        if not passage_source:
            passage_source = f"This text covers key concepts in {topic}, including fundamental principles and their applications in real-world contexts."

        prompt = f"""Take this passage and blank out 5-7 key academic terms. Replace each with {{{{N}}}} where N is the blank index starting at 0.
Return ONLY valid JSON. No markdown.
Format: {{
  "passage": "The {{{{0}}}} is responsible for producing energy...",
  "blanks": [
    {{"index": 0, "answer": "mitochondria", "distractors": ["nucleus", "ribosome", "lysosome"]}}
  ]
}}
Rules:
- Only blank nouns/technical terms (not articles, prepositions)
- Distractors: 3 plausible but wrong alternatives from the same domain
- Blanks should be evenly spread through the passage

Passage:
{passage_source}

JSON:"""

        raw = await llm_service.chat(question=prompt, context_chunks=chunks or [], history=[])
        data = self._parse_json(raw, {})

        if not data or not data.get("blanks"):
            data = self._fallback_cloze(topic)

        # Shuffle distractors + correct into options
        for blank in data.get("blanks", []):
            options = [blank["answer"]] + blank.get("distractors", [])[:3]
            random.shuffle(options)
            blank["options"] = options

        return self._create_result(
            success=True, action="cloze",
            data={
                "passage": data.get("passage", passage_source),
                "blanks": data.get("blanks", []),
                "topic": topic,
            },
            message=f"Cloze puzzle with {len(data.get('blanks', []))} blanks about {topic}",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # JSON parsing helper
    # ──────────────────────────────────────────────────────────────────────────

    def _parse_json(self, text: str, default):
        """Extract and parse JSON from LLM response, gracefully."""
        import re
        if not text:
            return default
        # Try to find JSON block
        match = re.search(r'(\[.*\]|\{.*\})', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass
        try:
            return json.loads(text.strip())
        except Exception:
            return default

    # ──────────────────────────────────────────────────────────────────────────
    # Fallback demo data (when LLM returns bad JSON or sources are empty)
    # ──────────────────────────────────────────────────────────────────────────

    def _fallback_word_search_terms(self, topic: str):
        return [
            {"term": "PHOTOSYNTHESIS", "definition": "Process converting light energy to glucose"},
            {"term": "MITOCHONDRIA", "definition": "Cell organelle producing ATP energy"},
            {"term": "OSMOSIS", "definition": "Water movement across a semipermeable membrane"},
            {"term": "CHROMOSOME", "definition": "Structure containing DNA in a cell nucleus"},
            {"term": "RIBOSOME", "definition": "Organelle responsible for protein synthesis"},
            {"term": "ENZYME", "definition": "Biological catalyst that speeds up reactions"},
            {"term": "NUCLEUS", "definition": "Control center of the cell containing DNA"},
            {"term": "MEMBRANE", "definition": "Lipid bilayer surrounding cells and organelles"},
            {"term": "GLYCOLYSIS", "definition": "First stage of cellular respiration"},
            {"term": "PROTEIN", "definition": "Macromolecule made of amino acids"},
            {"term": "GLUCOSE", "definition": "Simple sugar used as cellular fuel"},
            {"term": "MUTATION", "definition": "Change in DNA sequence"},
        ]

    def _fallback_pairs(self, topic: str, n: int):
        pairs = [
            {"term": "Photosynthesis", "definition": "Process by which plants convert light into glucose using chlorophyll"},
            {"term": "Mitochondria", "definition": "Organelle known as the powerhouse of the cell, producing ATP"},
            {"term": "Osmosis", "definition": "Passive movement of water across a selectively permeable membrane"},
            {"term": "Natural Selection", "definition": "Evolutionary mechanism where better-adapted organisms survive and reproduce"},
            {"term": "DNA Replication", "definition": "Process of copying DNA before cell division"},
            {"term": "Enzyme", "definition": "Biological catalyst that lowers activation energy of reactions"},
            {"term": "Homeostasis", "definition": "Maintenance of stable internal conditions in organisms"},
            {"term": "Meiosis", "definition": "Cell division producing four haploid gametes"},
            {"term": "Allele", "definition": "Alternative form of a gene at a specific locus"},
            {"term": "Phenotype", "definition": "Observable physical characteristics of an organism"},
        ]
        return [{"id": str(i+1), **p} for i, p in enumerate(pairs[:n])]

    def _fallback_rapid_fire(self, topic: str, n: int):
        return [
            {"term": "Photosynthesis", "correct": "Converts light energy to glucose in plants", "distractors": ["Breaks down glucose for energy", "Moves water through roots", "Synthesises proteins in ribosomes"], "concept": "Plant biology"},
            {"term": "Mitosis", "correct": "Cell division producing two identical daughter cells", "distractors": ["Produces four haploid sex cells", "Process of DNA transcription", "Synthesis of ATP in mitochondria"], "concept": "Cell biology"},
            {"term": "Osmosis", "correct": "Water movement from low to high solute concentration", "distractors": ["Active transport against a gradient", "Protein movement through membranes", "Gas exchange in lungs"], "concept": "Cell biology"},
            {"term": "DNA", "correct": "Double helix molecule carrying genetic information", "distractors": ["Messenger molecule from nucleus to ribosome", "Energy storage molecule", "Structural protein in cell walls"], "concept": "Genetics"},
            {"term": "Enzyme", "correct": "Biological catalyst that speeds up chemical reactions", "distractors": ["Hormone signalling molecule", "Energy-storing lipid", "Structural carbohydrate"], "concept": "Biochemistry"},
            {"term": "Allele", "correct": "Alternative version of a gene at a specific locus", "distractors": ["Complete set of chromosomes", "Segment of mRNA", "Organelle membrane"], "concept": "Genetics"},
            {"term": "Phenotype", "correct": "Observable physical characteristics of an organism", "distractors": ["Complete genetic makeup", "Dominant gene expression only", "Chromosomal structure"], "concept": "Genetics"},
            {"term": "Homeostasis", "correct": "Maintenance of stable internal physiological conditions", "distractors": ["Production of hormones in glands", "Process of genetic mutation", "Energy transfer between organisms"], "concept": "Physiology"},
        ][:n]

    def _fallback_anagrams(self, topic: str, n: int):
        terms = ["MITOSIS", "OSMOSIS", "ENZYME", "PROTEIN", "GLUCOSE", "NUCLEUS", "MEMBRANE", "MUTATION", "ALLELE", "MEIOSIS"]
        defs = [
            "Cell division producing identical cells",
            "Water diffusion across a membrane",
            "Biological catalyst for reactions",
            "Macromolecule built from amino acids",
            "Simple sugar used as energy source",
            "Control center of the eukaryotic cell",
            "Lipid bilayer boundary of cells",
            "Change in the DNA nucleotide sequence",
            "Alternative form of a gene",
            "Cell division producing sex cells",
        ]
        hints = ["Type of cell division", "Type of diffusion", "Speeds up reactions", "Made of amino acids", "Energy molecule", "Contains DNA", "Surrounds cells", "DNA change", "Gene variant", "Produces gametes"]
        result = []
        for i, term in enumerate(terms[:n]):
            result.append({"term": term, "definition": defs[i], "hint": hints[i]})
        return result

    def _fallback_cloze(self, topic: str):
        return {
            "passage": "The {{0}} is the basic unit of life, containing a {{1}} that holds DNA. Energy is produced by the {{2}}, often called the powerhouse of the cell. The process of {{3}} allows plants to make their own food using sunlight. Cell division occurs through {{4}}, producing two identical daughter cells.",
            "blanks": [
                {"index": 0, "answer": "cell", "distractors": ["organ", "tissue", "organism"], "options": []},
                {"index": 1, "answer": "nucleus", "distractors": ["ribosome", "vacuole", "lysosome"], "options": []},
                {"index": 2, "answer": "mitochondria", "distractors": ["chloroplast", "golgi body", "endoplasmic reticulum"], "options": []},
                {"index": 3, "answer": "photosynthesis", "distractors": ["respiration", "osmosis", "diffusion"], "options": []},
                {"index": 4, "answer": "mitosis", "distractors": ["meiosis", "cytokinesis", "interphase"], "options": []},
            ]
        }


# Register
puzzle_agent = PuzzleAgent()
registry.register(
    puzzle_agent,
    intents=["puzzle", "word_search", "match_pairs", "rapid_fire", "memory_flip", "anagram", "cloze", "game"],
)
