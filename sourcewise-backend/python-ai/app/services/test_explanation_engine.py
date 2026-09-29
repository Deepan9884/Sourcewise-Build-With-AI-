"""
Unit tests for ExplanationEngine service.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.explanation_engine import ExplanationEngine, MasteryLevel


@pytest.fixture
def engine():
    """Create ExplanationEngine instance for testing"""
    return ExplanationEngine()


@pytest.fixture
def sample_context():
    """Sample source context for testing"""
    return """Photosynthesis is the process by which plants convert light energy into chemical energy.
It occurs in chloroplasts and requires sunlight, water, and carbon dioxide.
The process produces glucose and oxygen as outputs."""


@pytest.fixture
def mock_llm_response():
    """Mock LLM API response"""
    return {
        "choices": [
            {
                "message": {
                    "content": "This is a generated explanation from the LLM."
                }
            }
        ]
    }


class TestGenerateAnalogy:
    """Tests for generate_analogy method"""

    @pytest.mark.asyncio
    async def test_generate_analogy_novice_level(self, engine, sample_context, mock_llm_response):
        """Test analogy generation for novice level"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = mock_llm_response
            mock_response.raise_for_status = MagicMock()
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            result = await engine.generate_analogy(
                concept="photosynthesis",
                context=sample_context,
                user_level=MasteryLevel.NOVICE
            )
            
            assert isinstance(result, str)
            assert len(result) > 0
            assert result == "This is a generated explanation from the LLM."

    @pytest.mark.asyncio
    async def test_generate_analogy_includes_complexity_guidance(self, engine, sample_context):
        """Test that analogy prompt includes appropriate complexity guidance"""
        with patch.object(engine, '_generate_with_llm', new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = "Analogy explanation"
            
            await engine.generate_analogy(
                concept="photosynthesis",
                context=sample_context,
                user_level=MasteryLevel.MASTERY
            )
            
            # Verify the prompt was built with the concept
            call_args = mock_gen.call_args
            prompt = call_args[0][0]
            assert "photosynthesis" in prompt.lower()
            assert "analogy" in prompt.lower()


class TestGenerateExample:
    """Tests for generate_example method"""

    @pytest.mark.asyncio
    async def test_generate_example_basic(self, engine, sample_context, mock_llm_response):
        """Test example generation"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = mock_llm_response
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await engine.generate_example(
                concept="photosynthesis",
                context=sample_context,
                user_level=MasteryLevel.DEVELOPING
            )
            
            assert isinstance(result, str)
            assert len(result) > 0

    @pytest.mark.asyncio
    async def test_generate_example_prompt_structure(self, engine, sample_context):
        """Test that example prompt has correct structure"""
        with patch.object(engine, '_generate_with_llm', new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = "Example explanation"
            
            await engine.generate_example(
                concept="mitosis",
                context=sample_context,
                user_level=MasteryLevel.PROFICIENT
            )
            
            call_args = mock_gen.call_args
            prompt = call_args[0][0]
            assert "mitosis" in prompt.lower()
            assert "example" in prompt.lower()


class TestGenerateStepwise:
    """Tests for generate_stepwise method"""

    @pytest.mark.asyncio
    async def test_generate_stepwise_basic(self, engine, sample_context, mock_llm_response):
        """Test step-by-step generation"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = mock_llm_response
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await engine.generate_stepwise(
                concept="photosynthesis",
                context=sample_context,
                user_level=MasteryLevel.NOVICE
            )
            
            assert isinstance(result, str)
            assert len(result) > 0

    @pytest.mark.asyncio
    async def test_generate_stepwise_prompt_mentions_steps(self, engine, sample_context):
        """Test that stepwise prompt mentions step-by-step approach"""
        with patch.object(engine, '_generate_with_llm', new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = "Step-by-step explanation"
            
            await engine.generate_stepwise(
                concept="cell division",
                context=sample_context,
                user_level=MasteryLevel.DEVELOPING
            )
            
            call_args = mock_gen.call_args
            prompt = call_args[0][0]
            assert "step" in prompt.lower()
            assert "cell division" in prompt.lower()


class TestAdaptComplexity:
    """Tests for adapt_complexity method"""

    @pytest.mark.asyncio
    async def test_adapt_complexity_to_novice(self, engine, mock_llm_response):
        """Test adapting explanation for novice level"""
        original = "Photosynthesis involves light-dependent and light-independent reactions."
        
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": "Photosynthesis is how plants make food using sunlight."
                        }
                    }
                ]
            }
            mock_response.raise_for_status = MagicMock()
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await engine.adapt_complexity(
                explanation=original,
                user_level=MasteryLevel.NOVICE,
                concept="photosynthesis"
            )
            
            assert isinstance(result, str)
            assert len(result) > 0

    @pytest.mark.asyncio
    async def test_adapt_complexity_to_mastery(self, engine, mock_llm_response):
        """Test adapting explanation for mastery level"""
        original = "Plants make food from sunlight."
        
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [
                    {
                        "message": {
                            "content": "Advanced explanation with technical details."
                        }
                    }
                ]
            }
            mock_response.raise_for_status = MagicMock()
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await engine.adapt_complexity(
                explanation=original,
                user_level=MasteryLevel.MASTERY,
                concept="photosynthesis"
            )
            
            assert isinstance(result, str)
            assert len(result) > 0


class TestComplexityGuidance:
    """Tests for complexity guidance helper"""

    def test_get_complexity_guidance_all_levels(self, engine):
        """Test that complexity guidance exists for all mastery levels"""
        for level in MasteryLevel:
            guidance = engine._get_complexity_guidance(level)
            assert isinstance(guidance, str)
            assert len(guidance) > 0

    def test_novice_guidance_mentions_simplicity(self, engine):
        """Test that novice guidance emphasizes simplicity"""
        guidance = engine._get_complexity_guidance(MasteryLevel.NOVICE)
        assert "simple" in guidance.lower() or "jargon" in guidance.lower()

    def test_mastery_guidance_mentions_depth(self, engine):
        """Test that mastery guidance emphasizes depth"""
        guidance = engine._get_complexity_guidance(MasteryLevel.MASTERY)
        assert "deep" in guidance.lower() or "advanced" in guidance.lower()


class TestPromptBuilding:
    """Tests for prompt building methods"""

    def test_build_analogy_prompt_structure(self, engine, sample_context):
        """Test analogy prompt has required elements"""
        prompt = engine._build_analogy_prompt(
            concept="test concept",
            context=sample_context,
            user_level=MasteryLevel.NOVICE
        )
        
        assert "test concept" in prompt
        assert "analogy" in prompt.lower()
        assert isinstance(prompt, str)

    def test_build_example_prompt_structure(self, engine, sample_context):
        """Test example prompt has required elements"""
        prompt = engine._build_example_prompt(
            concept="test concept",
            context=sample_context,
            user_level=MasteryLevel.DEVELOPING
        )
        
        assert "test concept" in prompt
        assert "example" in prompt.lower()
        assert isinstance(prompt, str)

    def test_build_stepwise_prompt_structure(self, engine, sample_context):
        """Test stepwise prompt has required elements"""
        prompt = engine._build_stepwise_prompt(
            concept="test concept",
            context=sample_context,
            user_level=MasteryLevel.PROFICIENT
        )
        
        assert "test concept" in prompt
        assert "step" in prompt.lower()
        assert isinstance(prompt, str)

    def test_build_complexity_adaptation_prompt(self, engine):
        """Test complexity adaptation prompt structure"""
        prompt = engine._build_complexity_adaptation_prompt(
            explanation="Original explanation",
            user_level=MasteryLevel.NOVICE,
            concept="test concept"
        )
        
        assert "Original explanation" in prompt
        assert "test concept" in prompt
        assert isinstance(prompt, str)


class TestEdgeCases:
    """Tests for edge cases and error handling"""

    @pytest.mark.asyncio
    async def test_empty_context_handling(self, engine, mock_llm_response):
        """Test handling of empty context"""
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = mock_llm_response
            mock_response.raise_for_status = MagicMock()
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            result = await engine.generate_analogy(
                concept="test",
                context="",
                user_level=MasteryLevel.NOVICE
            )
            
            assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_long_concept_name(self, engine, sample_context, mock_llm_response):
        """Test handling of very long concept names"""
        long_concept = "This is a very long concept name " * 10
        
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = mock_llm_response
            mock_response.raise_for_status = MagicMock()
            
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            result = await engine.generate_example(
                concept=long_concept,
                context=sample_context,
                user_level=MasteryLevel.NOVICE
            )
            
            assert isinstance(result, str)
