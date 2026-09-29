"""
Unit tests for chunker service.

Tests the chunk_pages function which splits page text into
overlapping chunks with metadata. No LLM calls — pure logic.
"""
import pytest
from unittest.mock import patch
from app.services.chunker import chunk_pages


class TestChunkPages:
    """Tests for chunk_pages function"""

    def test_basic_chunk_structure(self):
        """Each chunk must have all required metadata keys"""
        pages = [{"page": 1, "text": "A " * 400}]
        result = chunk_pages(pages, source_id="src_1", source_name="Test")

        assert len(result) > 0
        for chunk in result:
            assert "chunk_id" in chunk
            assert "text" in chunk
            assert "source_id" in chunk
            assert "source_name" in chunk
            assert "page" in chunk

    def test_source_metadata_preserved(self):
        """source_id and source_name must be passed through to every chunk"""
        pages = [{"page": 1, "text": "B " * 400}]
        result = chunk_pages(pages, source_id="src_abc", source_name="My Source")

        for chunk in result:
            assert chunk["source_id"] == "src_abc"
            assert chunk["source_name"] == "My Source"

    def test_page_number_correct(self):
        """Each chunk must carry the correct page number"""
        pages = [
            {"page": 1, "text": "C " * 400},
            {"page": 2, "text": "D " * 400},
        ]
        result = chunk_pages(pages, source_id="src_1", source_name="Test")

        page_1_chunks = [c for c in result if c["page"] == 1]
        page_2_chunks = [c for c in result if c["page"] == 2]
        assert len(page_1_chunks) > 0
        assert len(page_2_chunks) > 0

    def test_empty_pages_returns_empty(self):
        """Empty page list should return empty list"""
        result = chunk_pages([], source_id="src_1", source_name="Test")
        assert result == []

    def test_empty_text_produces_no_chunks(self):
        """Page with empty text should produce no chunks"""
        pages = [{"page": 1, "text": ""}]
        result = chunk_pages(pages, source_id="src_1", source_name="Test")
        assert result == []

    def test_short_fragments_skipped(self):
        """Text fragments under 30 characters must be skipped"""
        pages = [{"page": 1, "text": "Short fragment!"}]
        result = chunk_pages(pages, source_id="src_1", source_name="Test")
        assert result == []

    def test_chunk_id_unique(self):
        """Every chunk_id must be unique across pages"""
        pages = [
            {"page": 1, "text": "E " * 400},
            {"page": 2, "text": "F " * 400},
        ]
        result = chunk_pages(pages, source_id="src_1", source_name="Test")

        chunk_ids = [c["chunk_id"] for c in result]
        assert len(chunk_ids) == len(set(chunk_ids))

    def test_chunk_text_stripped(self):
        """Chunk text must not have leading/trailing whitespace"""
        pages = [{"page": 1, "text": "   G " * 300}]
        result = chunk_pages(pages, source_id="src_1", source_name="Test")

        for chunk in result:
            assert chunk["text"] == chunk["text"].strip()

    def test_large_text_split_into_multiple_chunks(self):
        """Very long text should produce multiple chunks"""
        text = "H " * 2000
        pages = [{"page": 1, "text": text}]
        result = chunk_pages(pages, source_id="src_1", source_name="Test")

        assert len(result) >= 2

    def test_all_bytes_readable_ascii(self):
        """Every chunk must contain only printable ASCII characters"""
        pages = [{"page": 1, "text": "I " * 400}]
        result = chunk_pages(pages, source_id="src_1", source_name="Test")

        for chunk in result:
            assert chunk["text"].isprintable()
