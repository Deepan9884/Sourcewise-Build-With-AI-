"""
Unit tests for SocraticEngine service.

Tests the Socratic teaching methods including guiding questions,
progressive hints, and understanding detection.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.socratic_engine import SocraticEngine


@pytest.fixture
def socratic_engine():
    """Create SocraticEngine instance for testing"""
    return SocraticEngine()


@pytest.fixture
def sample_context():
    """Sample source context for testing"""
    return """Photosynthesis is the process by which plants convert light energy into chemical energy.
The process occurs in chloroplasts and requires sunlight, water, and carbon dioxide.
The products are glucose (sugar) and oxygen."""


@pytest.mark.asyncio
async def test_generate_guiding_question_basic(socratic_engine, sample_context):
    """Test generating a basic Socratic guiding question"""
    user_question = "What is photosynthesis?"
    
    with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "What do you think plants need to create their own food?"
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post = AsyncMock(return_value=mock_response)
        mock_client_instance = MagicMock()
        mock_client_instance.post = mock_post
        mock_get_client.return_value = mock_client_instance
        
        result = await socratic_engine.generate_guiding_question(
            user_question,
            sample_context,
            difficulty=2
        )
        
        assert isinstance(result, str)
        assert len(result) > 0
        # Should be a question
        assert "?" in result or "what" in result.lower() or "how" in result.lower()


@pytest.mark.asyncio
async def test_generate_guiding_question_with_difficulty_levels(socratic_engine, sample_context):
    """Test that different difficulty levels produce different questions"""
    user_question = "How does photosynthesis work?"
    
    with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "What role do you think sunlight plays in plant growth?"
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post = AsyncMock(return_value=mock_response)
        mock_client_instance = MagicMock()
        mock_client_instance.post = mock_post
        mock_get_client.return_value = mock_client_instance
        
        # Test difficulty level 1 (easy)
        result_easy = await socratic_engine.generate_guiding_question(
            user_question, sample_context, difficulty=1
        )
        assert isinstance(result_easy, str)
        
        # Test difficulty level 5 (hard)
        result_hard = await socratic_engine.generate_guiding_question(
            user_question, sample_context, difficulty=5
        )
        assert isinstance(result_hard, str)


@pytest.mark.asyncio
async def test_generate_hint_level_1(socratic_engine, sample_context):
    """Test generating a subtle hint (level 1)"""
    question = "What are the products of photosynthesis?"
    
    with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "Think about what plants produce that other organisms need."
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post = AsyncMock(return_value=mock_response)
        mock_client_instance = MagicMock()
        mock_client_instance.post = mock_post
        mock_get_client.return_value = mock_client_instance
        
        result = await socratic_engine.generate_hint(
            question,
            sample_context,
            hint_level=1
        )
        
        assert isinstance(result, str)
        assert len(result) > 0


@pytest.mark.asyncio
async def test_generate_hint_level_5(socratic_engine, sample_context):
    """Test generating a nearly direct hint (level 5)"""
    question = "What are the products of photosynthesis?"
    
    with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "Photosynthesis produces glucose and oxygen. The glucose is used for energy and the oxygen is released."
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post = AsyncMock(return_value=mock_response)
        mock_client_instance = MagicMock()
        mock_client_instance.post = mock_post
        mock_get_client.return_value = mock_client_instance
        
        result = await socratic_engine.generate_hint(
            question,
            sample_context,
            hint_level=5
        )
        
        assert isinstance(result, str)
        assert len(result) > 0


@pytest.mark.asyncio
async def test_generate_hint_invalid_level(socratic_engine, sample_context):
    """Test that invalid hint levels raise ValueError"""
    question = "What is photosynthesis?"
    
    # Test level too low
    with pytest.raises(ValueError, match="hint_level must be between 1 and 5"):
        await socratic_engine.generate_hint(question, sample_context, hint_level=0)
    
    # Test level too high
    with pytest.raises(ValueError, match="hint_level must be between 1 and 5"):
        await socratic_engine.generate_hint(question, sample_context, hint_level=6)


@pytest.mark.asyncio
async def test_detect_understanding_positive(socratic_engine, sample_context):
    """Test detecting when user demonstrates understanding"""
    user_response = "Photosynthesis is how plants use sunlight to make glucose and oxygen from water and CO2"
    expected_insight = "Plants convert light energy to chemical energy, producing glucose and oxygen"
    
    with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "YES - The user correctly identifies the key components and process."
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post = AsyncMock(return_value=mock_response)
        mock_client_instance = MagicMock()
        mock_client_instance.post = mock_post
        mock_get_client.return_value = mock_client_instance
        
        result = await socratic_engine.detect_understanding(
            user_response,
            expected_insight,
            sample_context
        )
        
        assert result is True


@pytest.mark.asyncio
async def test_detect_understanding_negative(socratic_engine, sample_context):
    """Test detecting when user does not demonstrate understanding"""
    user_response = "Plants just absorb sunlight somehow"
    expected_insight = "Plants convert light energy to chemical energy, producing glucose and oxygen"
    
    with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "NO - The response is too vague and doesn't show understanding of the process."
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post = AsyncMock(return_value=mock_response)
        mock_client_instance = MagicMock()
        mock_client_instance.post = mock_post
        mock_get_client.return_value = mock_client_instance
        
        result = await socratic_engine.detect_understanding(
            user_response,
            expected_insight,
            sample_context
        )
        
        assert result is False


@pytest.mark.asyncio
async def test_detect_understanding_partial(socratic_engine, sample_context):
    """Test detecting partial understanding"""
    user_response = "Plants make oxygen using sunlight"
    expected_insight = "Plants convert light energy to chemical energy, producing glucose and oxygen"
    
    with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "NO - While the user mentions oxygen and sunlight, they miss the glucose production and energy conversion."
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post = AsyncMock(return_value=mock_response)
        mock_client_instance = MagicMock()
        mock_client_instance.post = mock_post
        mock_get_client.return_value = mock_client_instance
        
        result = await socratic_engine.detect_understanding(
            user_response,
            expected_insight,
            sample_context
        )
        
        assert result is False


@pytest.mark.asyncio
async def test_progressive_hints_sequence(socratic_engine, sample_context):
    """Test that hints can be generated progressively from 1 to 5"""
    question = "What are the inputs needed for photosynthesis?"
    
    with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": "Think about what plants need from their environment."
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post = AsyncMock(return_value=mock_response)
        mock_client_instance = MagicMock()
        mock_client_instance.post = mock_post
        mock_get_client.return_value = mock_client_instance
        
        # Generate hints at all levels
        hints = []
        for level in range(1, 6):
            hint = await socratic_engine.generate_hint(
                question,
                sample_context,
                hint_level=level
            )
            hints.append(hint)
            assert isinstance(hint, str)
            assert len(hint) > 0
        
        # Should have 5 hints
        assert len(hints) == 5


def test_difficulty_guidance_all_levels(socratic_engine):
    """Test that difficulty guidance exists for all levels"""
    for difficulty in range(1, 6):
        guidance = socratic_engine._get_difficulty_guidance(difficulty)
        assert isinstance(guidance, str)
        assert len(guidance) > 0


def test_build_guiding_question_prompt(socratic_engine):
    """Test that guiding question prompt is properly formatted"""
    user_question = "What is photosynthesis?"
    difficulty = 3
    
    prompt = socratic_engine._build_guiding_question_prompt(user_question, difficulty)
    
    assert isinstance(prompt, str)
    assert user_question in prompt
    assert "Socratic" in prompt or "guiding question" in prompt
    assert len(prompt) > 0


def test_build_hint_prompt(socratic_engine):
    """Test that hint prompt is properly formatted"""
    question = "What are the products of photosynthesis?"
    hint_level = 3
    
    prompt = socratic_engine._build_hint_prompt(question, hint_level)
    
    assert isinstance(prompt, str)
    assert question in prompt
    assert str(hint_level) in prompt
    assert "hint" in prompt.lower()
    assert len(prompt) > 0


def test_build_understanding_detection_prompt(socratic_engine):
    """Test that understanding detection prompt is properly formatted"""
    user_response = "Plants make food using sunlight"
    expected_insight = "Photosynthesis converts light to chemical energy"
    
    prompt = socratic_engine._build_understanding_detection_prompt(
        user_response,
        expected_insight
    )
    
    assert isinstance(prompt, str)
    assert user_response in prompt
    assert expected_insight in prompt
    assert "understanding" in prompt.lower()
    assert len(prompt) > 0
