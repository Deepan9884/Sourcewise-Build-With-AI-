"""
Unit tests for embedder service.

Tests embed_texts, embed_single, and get_model functions.
All external dependencies (SentenceTransformer) are mocked.
"""
import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from app.services import embedder


@pytest.fixture(autouse=True)
def reset_model():
    """Reset the cached _model between tests so each test starts fresh"""
    embedder._model = None
    yield
    embedder._model = None


class TestGetModel:
    """Tests for get_model function"""

    def test_model_loaded_on_first_call(self):
        """get_model should load the model on first call"""
        with patch('app.services.embedder.SentenceTransformer') as MockST:
            mock_instance = MagicMock()
            MockST.return_value = mock_instance
            model = embedder.get_model()
            MockST.assert_called_once()
            assert model == mock_instance

    def test_model_cached_on_subsequent_calls(self):
        """get_model should return cached instance on second call"""
        with patch('app.services.embedder.SentenceTransformer') as MockST:
            mock_instance = MagicMock()
            MockST.return_value = mock_instance
            model1 = embedder.get_model()
            model2 = embedder.get_model()
            MockST.assert_called_once()
            assert model1 is model2

    def test_model_none_before_load(self):
        """_model should be None before get_model is called"""
        assert embedder._model is None


class TestEmbedTexts:
    """Tests for embed_texts function"""

    @pytest.fixture(autouse=True)
    def mock_model(self):
        with patch('app.services.embedder.SentenceTransformer') as MockST:
            mock_instance = MagicMock()
            def encode_side_effect(texts, **kwargs):
                return np.array([[0.1 + i, 0.2 + i, 0.3 + i] for i in range(len(texts))])
            mock_instance.encode.side_effect = encode_side_effect
            MockST.return_value = mock_instance
            yield

    def test_embed_texts_returns_list_of_lists(self):
        """embed_texts should return list of float lists"""
        result = embedder.embed_texts(["hello", "world"])
        assert isinstance(result, list)
        assert len(result) == 2
        assert all(isinstance(v, list) for v in result)
        assert all(isinstance(x, float) for v in result for x in v)

    def test_embed_texts_single_text(self):
        """embed_texts with one text should return one vector"""
        result = embedder.embed_texts(["single text"])
        assert len(result) == 1

    def test_embed_texts_empty_list(self):
        """embed_texts with empty list should return empty list"""
        with patch('app.services.embedder.SentenceTransformer') as MockST:
            mock_instance = MagicMock()
            mock_instance.encode.return_value = np.array([])
            MockST.return_value = mock_instance
            result = embedder.embed_texts([])
            assert result == []

    def test_embed_texts_dimension(self):
        """Each embedding vector should have the expected dimension"""
        result = embedder.embed_texts(["text"])
        assert len(result[0]) == 3


class TestEmbedSingle:
    """Tests for embed_single function"""

    @pytest.fixture(autouse=True)
    def mock_model(self):
        with patch('app.services.embedder.SentenceTransformer') as MockST:
            mock_instance = MagicMock()
            mock_instance.encode.return_value = np.array([[0.7, 0.8, 0.9]])
            MockST.return_value = mock_instance
            yield

    def test_embed_single_returns_float_list(self):
        """embed_single should return a list of floats"""
        result = embedder.embed_single("test text")
        assert isinstance(result, list)
        assert len(result) > 0
        assert all(isinstance(x, float) for x in result)

    def test_embed_single_calls_embed_texts(self):
        """embed_single should delegate to embed_texts"""
        with patch('app.services.embedder.embed_texts') as mock_et:
            mock_et.return_value = [[0.1, 0.2]]
            result = embedder.embed_single("text")
            mock_et.assert_called_once_with(["text"])
            assert result == [0.1, 0.2]
