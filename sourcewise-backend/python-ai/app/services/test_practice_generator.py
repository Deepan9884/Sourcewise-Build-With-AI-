"""
Unit tests for PracticeGenerator service.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 14.1, 14.2**
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.practice_generator import (
    PracticeGenerator,
    QuestionType,
    MultipleChoiceQuestion,
    ShortAnswerQuestion,
    ApplicationProblem,
    EvaluationResult
)
import json


@pytest.fixture
def generator():
    """Create PracticeGenerator instance for testing"""
    return PracticeGenerator()


@pytest.fixture
def sample_context():
    """Sample source context for testing"""
    return """Photosynthesis is the process by which plants convert light energy into chemical energy.
It occurs in chloroplasts and requires sunlight, water, and carbon dioxide.
The process produces glucose and oxygen as outputs.
The light-dependent reactions occur in the thylakoid membranes, while the Calvin cycle occurs in the stroma."""


@pytest.fixture
def mock_mcq_response():
    """Mock LLM response for MCQ generation"""
    return json.dumps({
        "question": "What are the main inputs required for photosynthesis?",
        "options": [
            "A) Sunlight, water, and carbon dioxide",
            "B) Glucose and oxygen",
            "C) Only sunlight",
            "D) Water and glucose"
        ],
        "correct_answer": "A) Sunlight, water, and carbon dioxide",
        "explanation": "The source material states that photosynthesis requires sunlight, water, and carbon dioxide.",
        "citation": "requires sunlight, water, and carbon dioxide"
    })


@pytest.fixture
def mock_short_answer_response():
    """Mock LLM response for short answer generation"""
    return json.dumps({
        "question": "Describe the process of photosynthesis and its main outputs.",
        "key_points": [
            "Converts light energy to chemical energy",
            "Occurs in chloroplasts",
            "Produces glucose and oxygen"
        ],
        "citation": "plants convert light energy into chemical energy"
    })


@pytest.fixture
def mock_application_response():
    """Mock LLM response for application problem generation"""
    return json.dumps({
        "scenario": "A farmer notices that plants in a shaded greenhouse are growing slower than those in full sunlight.",
        "question": "Using your knowledge of photosynthesis, explain why this is happening and suggest a solution.",
        "key_points": [
            "Photosynthesis requires sunlight",
            "Less light means less energy conversion",
            "Solution: increase light exposure or use artificial lighting"
        ],
        "citation": "requires sunlight"
    })


@pytest.fixture
def mock_evaluation_response():
    """Mock LLM response for answer evaluation"""
    return json.dumps({
        "is_correct": True,
        "score": 0.85,
        "feedback": "Good answer that covers most key points.",
        "correct_answer_explanation": "The complete answer should mention light energy conversion, chloroplasts, and the products.",
        "strengths": ["Mentioned energy conversion", "Identified the products"],
        "areas_for_improvement": ["Could mention chloroplasts", "Could be more specific about inputs"],
        "related_concepts": ["cellular respiration", "ATP production"],
        "suggested_review": ["Review the location of photosynthesis", "Study the inputs and outputs"]
    })


class TestGenerateMCQ:
    """Tests for generate_mcq method - Requirement 5.1, 5.2"""

    @pytest.mark.asyncio
    async def test_generate_mcq_basic(self, generator, sample_context, mock_mcq_response):
        """Test basic MCQ generation"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_mcq_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_mcq(
                concept="photosynthesis",
                context=sample_context,
                source_id="source_123",
                source_name="Biology Textbook",
                difficulty=3
            )
            
            assert isinstance(result, MultipleChoiceQuestion)
            assert result.concept == "photosynthesis"
            assert len(result.options) == 4
            assert result.correct_answer in result.options
            assert result.difficulty == 3
            assert "source_123" in result.source_ids

    @pytest.mark.asyncio
    async def test_generate_mcq_includes_citation(self, generator, sample_context, mock_mcq_response):
        """Test that MCQ includes source citations - Requirement 14.1"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_mcq_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_mcq(
                concept="photosynthesis",
                context=sample_context,
                source_id="source_123",
                source_name="Biology Textbook",
                difficulty=2
            )
            
            assert len(result.citations) > 0
            assert result.citations[0].source_id == "source_123"
            assert result.citations[0].source_name == "Biology Textbook"

    @pytest.mark.asyncio
    async def test_generate_mcq_different_difficulties(self, generator, sample_context, mock_mcq_response):
        """Test MCQ generation at different difficulty levels"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_mcq_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            for difficulty in [1, 3, 5]:
                result = await generator.generate_mcq(
                    concept="photosynthesis",
                    context=sample_context,
                    source_id="source_123",
                    source_name="Biology Textbook",
                    difficulty=difficulty
                )
                
                assert result.difficulty == difficulty

    @pytest.mark.asyncio
    async def test_generate_mcq_fallback_on_parse_error(self, generator, sample_context):
        """Test fallback behavior when JSON parsing fails"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": "Invalid JSON response"}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_mcq(
                concept="photosynthesis",
                context=sample_context,
                source_id="source_123",
                source_name="Biology Textbook",
                difficulty=3
            )
            
            # Should still return a valid MCQ object
            assert isinstance(result, MultipleChoiceQuestion)
            assert len(result.options) == 4


class TestGenerateShortAnswer:
    """Tests for generate_short_answer method - Requirement 5.1, 5.2"""

    @pytest.mark.asyncio
    async def test_generate_short_answer_basic(self, generator, sample_context, mock_short_answer_response):
        """Test basic short answer generation"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_short_answer_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_short_answer(
                concept="photosynthesis",
                context=sample_context,
                source_id="source_123",
                source_name="Biology Textbook",
                difficulty=3
            )
            
            assert isinstance(result, ShortAnswerQuestion)
            assert result.concept == "photosynthesis"
            assert len(result.key_points) > 0
            assert result.difficulty == 3

    @pytest.mark.asyncio
    async def test_generate_short_answer_includes_key_points(self, generator, sample_context, mock_short_answer_response):
        """Test that short answer includes key points for evaluation"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_short_answer_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_short_answer(
                concept="photosynthesis",
                context=sample_context,
                source_id="source_123",
                source_name="Biology Textbook",
                difficulty=3
            )
            
            assert len(result.key_points) >= 2
            assert all(isinstance(point, str) for point in result.key_points)

    @pytest.mark.asyncio
    async def test_generate_short_answer_grounded_in_sources(self, generator, sample_context, mock_short_answer_response):
        """Test that short answer is grounded in source material - Requirement 14.1, 14.2"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_short_answer_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_short_answer(
                concept="photosynthesis",
                context=sample_context,
                source_id="source_123",
                source_name="Biology Textbook",
                difficulty=3
            )
            
            assert len(result.citations) > 0
            assert result.source_ids == ["source_123"]


class TestGenerateApplication:
    """Tests for generate_application method - Requirement 5.1, 5.2"""

    @pytest.mark.asyncio
    async def test_generate_application_basic(self, generator, sample_context, mock_application_response):
        """Test basic application problem generation"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_application_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_application(
                concept="photosynthesis",
                context=sample_context,
                source_id="source_123",
                source_name="Biology Textbook",
                difficulty=4
            )
            
            assert isinstance(result, ApplicationProblem)
            assert result.concept == "photosynthesis"
            assert len(result.scenario) > 0
            assert len(result.question_text) > 0
            assert len(result.key_points) > 0

    @pytest.mark.asyncio
    async def test_generate_application_includes_scenario(self, generator, sample_context, mock_application_response):
        """Test that application problem includes realistic scenario"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_application_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_application(
                concept="photosynthesis",
                context=sample_context,
                source_id="source_123",
                source_name="Biology Textbook",
                difficulty=4
            )
            
            assert result.scenario != ""
            assert result.question_text != ""
            assert result.scenario != result.question_text

    @pytest.mark.asyncio
    async def test_generate_application_higher_difficulty(self, generator, sample_context, mock_application_response):
        """Test that application problems default to higher difficulty"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_application_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_application(
                concept="photosynthesis",
                context=sample_context,
                source_id="source_123",
                source_name="Biology Textbook"
            )
            
            # Default difficulty should be 4
            assert result.difficulty == 4


class TestEvaluateAnswer:
    """Tests for evaluate_answer method - Requirement 5.3, 5.4"""

    @pytest.mark.asyncio
    async def test_evaluate_answer_mcq_correct(self, generator, sample_context, mock_evaluation_response):
        """Test evaluation of correct MCQ answer"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_evaluation_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.evaluate_answer(
                question_text="What are the inputs for photosynthesis?",
                user_answer="A) Sunlight, water, and carbon dioxide",
                correct_answer="A) Sunlight, water, and carbon dioxide",
                question_type=QuestionType.MULTIPLE_CHOICE,
                context=sample_context,
                concept="photosynthesis"
            )
            
            assert isinstance(result, EvaluationResult)
            assert result.is_correct == True
            assert 0.0 <= result.score <= 1.0

    @pytest.mark.asyncio
    async def test_evaluate_answer_provides_detailed_feedback(self, generator, sample_context, mock_evaluation_response):
        """Test that evaluation provides detailed feedback - Requirement 5.3, 5.4"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_evaluation_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.evaluate_answer(
                question_text="Describe photosynthesis",
                user_answer="Plants use sunlight to make food",
                correct_answer="Key points: energy conversion, chloroplasts, glucose production",
                question_type=QuestionType.SHORT_ANSWER,
                context=sample_context,
                concept="photosynthesis"
            )
            
            assert len(result.feedback) > 0
            assert len(result.correct_answer_explanation) > 0
            assert isinstance(result.strengths, list)
            assert isinstance(result.areas_for_improvement, list)

    @pytest.mark.asyncio
    async def test_evaluate_answer_includes_suggestions(self, generator, sample_context, mock_evaluation_response):
        """Test that evaluation includes review suggestions - Requirement 5.4"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_evaluation_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.evaluate_answer(
                question_text="Describe photosynthesis",
                user_answer="Plants use sunlight",
                correct_answer="Key points: energy conversion, chloroplasts, glucose production",
                question_type=QuestionType.SHORT_ANSWER,
                context=sample_context,
                concept="photosynthesis"
            )
            
            assert isinstance(result.related_concepts, list)
            assert isinstance(result.suggested_review, list)

    @pytest.mark.asyncio
    async def test_evaluate_answer_fallback_on_parse_error(self, generator, sample_context):
        """Test fallback evaluation when JSON parsing fails"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": "Invalid JSON"}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.evaluate_answer(
                question_text="Test question",
                user_answer="Test answer",
                correct_answer="Correct answer",
                question_type=QuestionType.SHORT_ANSWER,
                context=sample_context,
                concept="test"
            )
            
            # Should still return a valid EvaluationResult
            assert isinstance(result, EvaluationResult)
            assert isinstance(result.is_correct, bool)
            assert 0.0 <= result.score <= 1.0


class TestPromptBuilding:
    """Tests for prompt building methods"""

    def test_build_mcq_prompt_structure(self, generator):
        """Test MCQ prompt has required elements"""
        prompt = generator._build_mcq_prompt(concept="test concept", difficulty=3)
        
        assert "test concept" in prompt
        assert "multiple choice" in prompt.lower()
        assert "JSON" in prompt
        assert isinstance(prompt, str)

    def test_build_short_answer_prompt_structure(self, generator):
        """Test short answer prompt has required elements"""
        prompt = generator._build_short_answer_prompt(concept="test concept", difficulty=3)
        
        assert "test concept" in prompt
        assert "short answer" in prompt.lower()
        assert "key_points" in prompt
        assert isinstance(prompt, str)

    def test_build_application_prompt_structure(self, generator):
        """Test application prompt has required elements"""
        prompt = generator._build_application_prompt(concept="test concept", difficulty=4)
        
        assert "test concept" in prompt
        assert "scenario" in prompt.lower()
        assert "application" in prompt.lower()
        assert isinstance(prompt, str)

    def test_build_evaluation_prompt_mcq(self, generator):
        """Test evaluation prompt for MCQ"""
        prompt = generator._build_evaluation_prompt(
            question_text="Test question",
            user_answer="A) Answer",
            correct_answer="A) Answer",
            question_type=QuestionType.MULTIPLE_CHOICE,
            concept="test"
        )
        
        assert "Test question" in prompt
        assert "A) Answer" in prompt
        assert isinstance(prompt, str)

    def test_build_evaluation_prompt_short_answer(self, generator):
        """Test evaluation prompt for short answer"""
        prompt = generator._build_evaluation_prompt(
            question_text="Test question",
            user_answer="User's answer",
            correct_answer="Key points",
            question_type=QuestionType.SHORT_ANSWER,
            concept="test"
        )
        
        assert "Test question" in prompt
        assert "User's answer" in prompt
        assert "Key points" in prompt
        assert isinstance(prompt, str)


class TestDifficultyLevels:
    """Tests for difficulty level handling"""

    def test_get_difficulty_description_all_levels(self, generator):
        """Test that difficulty descriptions exist for all levels"""
        for difficulty in range(1, 6):
            description = generator._get_difficulty_description(difficulty)
            assert isinstance(description, str)
            assert len(description) > 0

    def test_difficulty_1_is_basic(self, generator):
        """Test that difficulty 1 is described as basic"""
        description = generator._get_difficulty_description(1)
        assert "basic" in description.lower() or "recall" in description.lower()

    def test_difficulty_5_is_advanced(self, generator):
        """Test that difficulty 5 is described as advanced"""
        description = generator._get_difficulty_description(5)
        assert "advanced" in description.lower() or "critical" in description.lower()


class TestEdgeCases:
    """Tests for edge cases and error handling"""

    @pytest.mark.asyncio
    async def test_empty_context_handling(self, generator, mock_mcq_response):
        """Test handling of empty context"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_mcq_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_mcq(
                concept="test",
                context="",
                source_id="source_123",
                source_name="Test Source",
                difficulty=3
            )
            
            assert isinstance(result, MultipleChoiceQuestion)

    @pytest.mark.asyncio
    async def test_long_concept_name(self, generator, sample_context, mock_mcq_response):
        """Test handling of very long concept names"""
        long_concept = "This is a very long concept name " * 10
        
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": mock_mcq_response}}]
            }
            mock_response.raise_for_status = MagicMock()
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.generate_mcq(
                concept=long_concept,
                context=sample_context,
                source_id="source_123",
                source_name="Test Source",
                difficulty=3
            )
            
            assert isinstance(result, MultipleChoiceQuestion)

    @pytest.mark.asyncio
    async def test_empty_user_answer_evaluation(self, generator, sample_context):
        """Test evaluation of empty user answer"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": "Invalid JSON"}}]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await generator.evaluate_answer(
                question_text="Test question",
                user_answer="",
                correct_answer="Correct answer",
                question_type=QuestionType.SHORT_ANSWER,
                context=sample_context,
                concept="test"
            )
            
            assert isinstance(result, EvaluationResult)
            assert result.is_correct == False
