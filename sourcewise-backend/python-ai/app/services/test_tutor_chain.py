"""
Unit tests for TutorChain service.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.tutor_chain import (
    TutorChain,
    TutoringMode,
    TutorResponse,
    MasteryLevel
)


@pytest.fixture
def tutor_chain():
    """Create TutorChain instance for testing"""
    return TutorChain()


@pytest.fixture
def mock_chunks():
    """Mock vector store chunks"""
    return [
        {
            "chunk_id": "chunk1",
            "source_id": "source1",
            "source_name": "Test Source",
            "text": "This is a test chunk about machine learning concepts.",
            "page": 1
        },
        {
            "chunk_id": "chunk2",
            "source_id": "source1",
            "source_name": "Test Source",
            "text": "Neural networks are a key component of deep learning.",
            "page": 2
        }
    ]


@pytest.mark.asyncio
async def test_tutor_chain_initialization(tutor_chain):
    """Test TutorChain initializes with all required engines"""
    assert tutor_chain.explanation_engine is not None
    assert tutor_chain.socratic_engine is not None
    assert tutor_chain.practice_generator is not None
    assert tutor_chain._conversation_contexts == {}


@pytest.mark.asyncio
async def test_explain_direct_mode(tutor_chain, mock_chunks):
    """Test explain method in direct mode"""
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch.object(tutor_chain.explanation_engine, 'generate_analogy', 
                         return_value="Machine learning is like teaching a child..."):
            with patch.object(tutor_chain.explanation_engine, 'generate_example',
                            return_value="For example, image recognition..."):
                with patch.object(tutor_chain.explanation_engine, 'generate_stepwise',
                                return_value="Step 1: Collect data..."):
                    
                    response = await tutor_chain.explain(
                        question="What is machine learning?",
                        source_ids=["source1"],
                        mode=TutoringMode.DIRECT
                    )
                    
                    assert isinstance(response, TutorResponse)
                    assert response.main_explanation is not None
                    assert response.strategy_used == "analogy"
                    assert len(response.alternative_explanations) == 2
                    assert len(response.citations) > 0
                    assert response.confidence > 0


@pytest.mark.asyncio
async def test_explain_socratic_mode(tutor_chain, mock_chunks):
    """Test explain method in Socratic mode"""
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch.object(tutor_chain.socratic_engine, 'generate_guiding_question',
                         return_value="What do you think are the key components of learning?"):
            
            response = await tutor_chain.explain(
                question="What is machine learning?",
                source_ids=["source1"],
                mode=TutoringMode.SOCRATIC
            )
            
            assert isinstance(response, TutorResponse)
            assert response.strategy_used == "socratic"
            assert "key components" in response.main_explanation.lower()
            assert len(response.alternative_explanations) == 0  # No alternatives in Socratic mode


@pytest.mark.asyncio
async def test_explain_exam_prep_mode(tutor_chain, mock_chunks):
    """Test explain method in exam prep mode"""
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch.object(tutor_chain.explanation_engine, 'generate_stepwise',
                         return_value="Step 1: Understand the problem..."):
            with patch.object(tutor_chain.explanation_engine, 'generate_analogy',
                            return_value="It's like..."):
                with patch.object(tutor_chain.explanation_engine, 'generate_example',
                                return_value="For example..."):
                    
                    response = await tutor_chain.explain(
                        question="How does backpropagation work?",
                        source_ids=["source1"],
                        mode=TutoringMode.EXAM_PREP
                    )
                    
                    assert response.strategy_used == "stepwise"
                    assert len(response.practice_suggestions) == 3  # Exam prep suggests multiple


@pytest.mark.asyncio
async def test_explain_no_content(tutor_chain):
    """Test explain method when no relevant content is found"""
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=[]):
        response = await tutor_chain.explain(
            question="What is quantum computing?",
            source_ids=["source1"]
        )
        
        assert response.confidence == 0.0
        assert "couldn't find" in response.main_explanation.lower()
        assert len(response.citations) == 0


@pytest.mark.asyncio
async def test_context_management(tutor_chain):
    """Test conversation context management"""
    session_id = "test_session_123"
    
    # Initially no context
    assert tutor_chain.get_context(session_id) is None
    
    # Update context
    tutor_chain._update_context(session_id, "What is AI?", [])
    context = tutor_chain.get_context(session_id)
    
    assert context is not None
    assert context["turn_count"] == 1
    assert context["last_question"] == "What is AI?"
    
    # Update again
    tutor_chain._update_context(session_id, "How does it work?", [])
    context = tutor_chain.get_context(session_id)
    assert context["turn_count"] == 2
    
    # Clear context
    tutor_chain.clear_context(session_id)
    assert tutor_chain.get_context(session_id) is None


@pytest.mark.asyncio
async def test_user_mastery_level_extraction(tutor_chain):
    """Test extraction of user mastery level from profile"""
    # No profile
    level = tutor_chain._get_user_mastery_level(None)
    assert level == MasteryLevel.NOVICE
    
    # Profile with mastery level
    profile = {"mastery_level": "proficient"}
    level = tutor_chain._get_user_mastery_level(profile)
    assert level == MasteryLevel.PROFICIENT
    
    # Profile with invalid level
    profile = {"mastery_level": "invalid"}
    level = tutor_chain._get_user_mastery_level(profile)
    assert level == MasteryLevel.NOVICE


def test_build_citations(tutor_chain, mock_chunks):
    """Test citation building from chunks"""
    citations = tutor_chain._build_citations(mock_chunks)
    
    assert len(citations) == 2
    assert citations[0].id == 1
    assert citations[0].source_name == "Test Source"
    assert citations[0].page == 1
    assert len(citations[0].text) <= 283  # 280 + "..."


def test_calculate_confidence(tutor_chain):
    """Test confidence calculation"""
    # No chunks
    assert tutor_chain._calculate_confidence([]) == 0.0
    
    # Few chunks
    chunks = [{"id": i} for i in range(2)]
    assert tutor_chain._calculate_confidence(chunks) == 0.6
    
    # Moderate chunks
    chunks = [{"id": i} for i in range(4)]
    assert tutor_chain._calculate_confidence(chunks) == 0.75
    
    # Many chunks
    chunks = [{"id": i} for i in range(6)]
    assert tutor_chain._calculate_confidence(chunks) == 0.9


def test_extract_main_concept(tutor_chain):
    """Test main concept extraction from question"""
    concept = tutor_chain._extract_main_concept("What is machine learning?")
    assert "machine learning" in concept.lower()
    
    concept = tutor_chain._extract_main_concept("How does neural network work?")
    assert "neural network" in concept.lower()


@pytest.mark.asyncio
async def test_stream_explain(tutor_chain, mock_chunks):
    """Test streaming explain method"""
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch.object(tutor_chain.explanation_engine, 'generate_analogy',
                         return_value="Machine learning is like..."):
            with patch.object(tutor_chain.explanation_engine, 'generate_example',
                            return_value="For example..."):
                with patch.object(tutor_chain.explanation_engine, 'generate_stepwise',
                                return_value="Step 1..."):
                    
                    events = []
                    async for event in tutor_chain.stream_explain(
                        question="What is AI?",
                        source_ids=["source1"]
                    ):
                        events.append(event)
                    
                    # Check event types
                    event_types = [e["type"] for e in events]
                    assert "citations" in event_types
                    assert "token" in event_types
                    assert "alternatives" in event_types
                    assert "related" in event_types
                    assert "practice" in event_types
                    assert "done" in event_types


@pytest.mark.asyncio
async def test_socratic_frustration_detection(tutor_chain, mock_chunks):
    """Test that Socratic mode detects frustration and provides hints"""
    # Create history with confusion signals to trigger frustration detection
    history = [
        {"role": "assistant", "content": "What do you think?"},
        {"role": "user", "content": "I don't understand"},
        {"role": "assistant", "content": "Consider this..."},
        {"role": "user", "content": "Still confused"}
    ]
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch.object(tutor_chain.socratic_engine, 'generate_hint',
                         return_value="Here's a hint: think about...") as mock_hint:
            with patch.object(tutor_chain.socratic_engine, 'generate_guiding_question',
                            return_value="What do you think about...") as mock_question:
                
                response = await tutor_chain.explain(
                    question="What is machine learning?",
                    source_ids=["source1"],
                    mode=TutoringMode.SOCRATIC,
                    history=history
                )
                
                # Should call generate_hint due to frustration detection (2 confusion phrases)
                mock_hint.assert_called_once()
                assert "hint" in response.main_explanation.lower()


@pytest.mark.asyncio
async def test_socratic_explicit_direct_request(tutor_chain, mock_chunks):
    """Test that Socratic mode switches to direct when user explicitly requests"""
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch.object(tutor_chain.explanation_engine, 'generate_analogy',
                         return_value="Machine learning is like teaching a child...") as mock_direct:
            
            response = await tutor_chain.explain(
                question="Just tell me what machine learning is",
                source_ids=["source1"],
                mode=TutoringMode.SOCRATIC
            )
            
            # Should switch to direct explanation
            mock_direct.assert_called_once()
            assert "direct answer" in response.main_explanation.lower()
            assert "teaching a child" in response.main_explanation.lower()


@pytest.mark.asyncio
async def test_socratic_high_frustration_switches_to_direct(tutor_chain, mock_chunks):
    """Test that high frustration level switches to direct explanation"""
    # Create history with strong frustration signals
    history = [
        {"role": "assistant", "content": "What do you think?"},
        {"role": "user", "content": "I don't understand"},
        {"role": "assistant", "content": "Consider this..."},
        {"role": "user", "content": "Still confused"},
        {"role": "user", "content": "I'm lost"},
        {"role": "user", "content": "This doesn't make sense"}
    ]
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": "Machine learning is a field of AI that..."}}]
            }
            mock_response.raise_for_status = MagicMock()
            mock_post = AsyncMock(return_value=mock_response)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            response = await tutor_chain.explain(
                question="What is machine learning?",
                source_ids=["source1"],
                mode=TutoringMode.SOCRATIC,
                history=history,
                session_id="test_session"
            )
            
            # Should switch to direct due to high frustration
            assert "struggling" in response.main_explanation.lower() or \
                   "direct explanation" in response.main_explanation.lower()


@pytest.mark.asyncio
async def test_socratic_progressive_hints(tutor_chain, mock_chunks):
    """Test progressive hint system with moderate frustration"""
    # Moderate frustration: 2 confusion signals
    history = [
        {"role": "assistant", "content": "What do you think?"},
        {"role": "user", "content": "I don't understand"},
        {"role": "assistant", "content": "Consider..."},
        {"role": "user", "content": "Still not clear"}
    ]
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch.object(tutor_chain.socratic_engine, 'generate_hint',
                         return_value="Here's a moderate hint...") as mock_hint:
            
            response = await tutor_chain.explain(
                question="What is machine learning?",
                source_ids=["source1"],
                mode=TutoringMode.SOCRATIC,
                history=history
            )
            
            # Should provide progressive hint
            mock_hint.assert_called_once()
            # Check hint level is appropriate (should be 2-4)
            call_args = mock_hint.call_args
            # Access positional args: call_args[0] or keyword args: call_args[1]
            if len(call_args[0]) >= 3:
                hint_level = call_args[0][2]  # Third positional argument
            else:
                hint_level = call_args.kwargs.get('hint_level', call_args[1].get('hint_level'))
            assert 2 <= hint_level <= 5


@pytest.mark.asyncio
async def test_socratic_no_frustration_guiding_question(tutor_chain, mock_chunks):
    """Test that no frustration leads to guiding question"""
    history = [
        {"role": "assistant", "content": "What do you think?"},
        {"role": "user", "content": "I think it involves algorithms"}
    ]
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch.object(tutor_chain.socratic_engine, 'generate_guiding_question',
                         return_value="What kind of algorithms do you think are used?") as mock_question:
            
            response = await tutor_chain.explain(
                question="What is machine learning?",
                source_ids=["source1"],
                mode=TutoringMode.SOCRATIC,
                history=history
            )
            
            # Should generate guiding question
            mock_question.assert_called_once()
            assert "algorithms" in response.main_explanation.lower()


@pytest.mark.asyncio
async def test_detect_explicit_direct_request_variations(tutor_chain):
    """Test detection of various explicit direct request phrases"""
    direct_requests = [
        "Just tell me the answer",
        "Can you just give me the answer?",
        "Stop asking questions and explain",
        "I need a direct answer please",
        "I don't have time for questions, just tell me",
        "Please just explain it directly",
        "Enough questions, what is it?"
    ]
    
    for request in direct_requests:
        assert tutor_chain._detect_explicit_direct_request(request), \
            f"Failed to detect: {request}"
    
    # Test non-direct requests
    non_direct = [
        "What is machine learning?",
        "Can you help me understand?",
        "I have a question about this"
    ]
    
    for request in non_direct:
        assert not tutor_chain._detect_explicit_direct_request(request), \
            f"False positive for: {request}"


def test_detect_frustration_level_no_history(tutor_chain):
    """Test frustration detection with no history"""
    level = tutor_chain._detect_frustration_level([], None)
    assert level == 0


def test_detect_frustration_level_confusion_phrases(tutor_chain):
    """Test frustration detection with confusion phrases"""
    history = [
        {"role": "user", "content": "I don't understand this"},
        {"role": "assistant", "content": "Let me explain..."},
        {"role": "user", "content": "I'm still confused"}
    ]
    
    level = tutor_chain._detect_frustration_level(history, None)
    assert level >= 2  # Should detect confusion


def test_detect_frustration_level_consecutive_user_messages(tutor_chain):
    """Test frustration detection with consecutive user messages"""
    history = [
        {"role": "user", "content": "What is this?"},
        {"role": "user", "content": "Hello?"},
        {"role": "user", "content": "Anyone there?"}
    ]
    
    level = tutor_chain._detect_frustration_level(history, None)
    assert level >= 2  # Should detect consecutive messages


def test_detect_frustration_level_short_frustrated_responses(tutor_chain):
    """Test frustration detection with short frustrated responses"""
    history = [
        {"role": "assistant", "content": "What do you think?"},
        {"role": "user", "content": "what?"},
        {"role": "assistant", "content": "Consider..."},
        {"role": "user", "content": "huh?"}
    ]
    
    level = tutor_chain._detect_frustration_level(history, None)
    assert level >= 1  # Should detect short frustrated responses


def test_detect_frustration_level_high_turn_count(tutor_chain):
    """Test frustration detection with high turn count in session"""
    history = [
        {"role": "user", "content": "Question 1"},
        {"role": "assistant", "content": "Answer 1"}
    ]
    
    # Create session context with high turn count
    session_id = "test_session"
    tutor_chain._conversation_contexts[session_id] = {
        "turn_count": 8,
        "current_topic": "test"
    }
    
    level = tutor_chain._detect_frustration_level(history, session_id)
    assert level >= 1  # Should detect high turn count


def test_get_socratic_difficulty_no_profile(tutor_chain):
    """Test Socratic difficulty with no user profile"""
    difficulty = tutor_chain._get_socratic_difficulty(None)
    assert difficulty == 3  # Default moderate


def test_get_socratic_difficulty_by_mastery_level(tutor_chain):
    """Test Socratic difficulty based on mastery level"""
    # Novice user
    profile = {"mastery_level": "novice"}
    difficulty = tutor_chain._get_socratic_difficulty(profile)
    assert difficulty == 2  # Easier for novices
    
    # Proficient user
    profile = {"mastery_level": "proficient"}
    difficulty = tutor_chain._get_socratic_difficulty(profile)
    assert difficulty == 4  # Harder for proficient
    
    # Mastery user
    profile = {"mastery_level": "mastery"}
    difficulty = tutor_chain._get_socratic_difficulty(profile)
    assert difficulty == 5  # Hardest for masters


def test_get_socratic_difficulty_with_hint_preference(tutor_chain):
    """Test Socratic difficulty adjusted by hint preference"""
    # Generous hints - easier questions
    profile = {
        "mastery_level": "developing",
        "preferences": {"hintPreference": "generous"}
    }
    difficulty = tutor_chain._get_socratic_difficulty(profile)
    assert difficulty == 2  # 3 - 1 = 2
    
    # Minimal hints - harder questions
    profile = {
        "mastery_level": "developing",
        "preferences": {"hintPreference": "minimal"}
    }
    difficulty = tutor_chain._get_socratic_difficulty(profile)
    assert difficulty == 4  # 3 + 1 = 4


@pytest.mark.asyncio
async def test_socratic_mode_with_user_profile_preferences(tutor_chain, mock_chunks):
    """Test Socratic mode respects user profile preferences"""
    user_profile = {
        "mastery_level": "proficient",
        "preferences": {
            "hintPreference": "minimal"
        }
    }
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch.object(tutor_chain.socratic_engine, 'generate_guiding_question',
                         return_value="A challenging question...") as mock_question:
            
            response = await tutor_chain.explain(
                question="What is machine learning?",
                source_ids=["source1"],
                mode=TutoringMode.SOCRATIC,
                user_profile=user_profile
            )
            
            # Should call with higher difficulty due to proficient + minimal hints
            mock_question.assert_called_once()
            call_args = mock_question.call_args
            # Access positional args or keyword args
            if len(call_args[0]) >= 3:
                difficulty = call_args[0][2]  # Third positional argument
            else:
                difficulty = call_args.kwargs.get('difficulty', call_args[1].get('difficulty'))
            assert difficulty >= 4  # Should be challenging


@pytest.mark.asyncio
async def test_cross_source_synthesis(tutor_chain):
    """Test cross-source synthesis in context building"""
    # Create chunks from multiple sources
    multi_source_chunks = [
        {
            "chunk_id": "chunk1",
            "source_id": "source1",
            "source_name": "Book A",
            "text": "Machine learning uses algorithms to learn patterns.",
            "page": 1
        },
        {
            "chunk_id": "chunk2",
            "source_id": "source2",
            "source_name": "Book B",
            "text": "Neural networks are inspired by biological neurons.",
            "page": 5
        },
        {
            "chunk_id": "chunk3",
            "source_id": "source1",
            "source_name": "Book A",
            "text": "Supervised learning requires labeled data.",
            "page": 2
        }
    ]
    
    context = tutor_chain._build_context_from_chunks_with_synthesis(multi_source_chunks)
    
    # Should group by source and indicate multiple sources
    assert "multiple sources" in context.lower()
    assert "Book A" in context
    assert "Book B" in context
    assert "===" in context  # Source separator


@pytest.mark.asyncio
async def test_advanced_concept_identification(tutor_chain, mock_chunks):
    """Test advanced concept identification using ConceptExtractor"""
    from app.services.concept_extractor import Concept, ConceptLink
    
    mock_concepts = [
        Concept("Machine Learning", "A field of AI", "source1", 0.9),
        Concept("Neural Networks", "Computing systems", "source1", 0.85)
    ]
    
    mock_links = [
        ConceptLink(
            "Machine Learning",
            "Deep Learning",
            "extends",
            ["source1"],
            0.8
        )
    ]
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch('app.services.concept_extractor.extract_concepts', 
                   return_value=mock_concepts):
            with patch('app.services.concept_extractor.find_related_concepts',
                      return_value=mock_links):
                with patch.object(tutor_chain.explanation_engine, 'generate_analogy',
                                return_value="ML is like..."):
                    with patch.object(tutor_chain.explanation_engine, 'generate_example',
                                    return_value="For example..."):
                        with patch.object(tutor_chain.explanation_engine, 'generate_stepwise',
                                        return_value="Step 1..."):
                            
                            response = await tutor_chain.explain(
                                question="What is machine learning?",
                                source_ids=["source1"]
                            )
                            
                            # Should have related concepts from ConceptExtractor
                            assert len(response.related_concepts) > 0
                            # Check if Deep Learning is in related concepts
                            concept_names = [c.concept for c in response.related_concepts]
                            assert "Deep Learning" in concept_names


@pytest.mark.asyncio
async def test_prerequisite_checking(tutor_chain, mock_chunks):
    """Test prerequisite checking using KnowledgeGraphBuilder"""
    from app.services.knowledge_graph_builder import ConceptGraph
    from app.services.concept_extractor import Concept
    
    # Create a mock concept graph with prerequisites
    mock_graph = ConceptGraph()
    mock_graph.concepts = {
        "Neural Networks": {
            "name": "Neural Networks",
            "description": "Computing systems",
            "source_ids": ["source1"],
            "prerequisites": ["Linear Algebra", "Calculus"],
            "related": []
        },
        "Linear Algebra": {
            "name": "Linear Algebra",
            "description": "Math foundation",
            "source_ids": ["source1"],
            "prerequisites": [],
            "related": []
        }
    }
    
    # User profile with limited knowledge
    user_profile = {
        "concept_mastery": [
            {"concept": "Python Programming", "level": "proficient"}
        ]
    }
    
    mock_concepts = [Concept("Neural Networks", "Computing systems", "source1", 0.9)]
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        # Patch at the tutor_chain module level where build_graph is imported
        with patch('app.services.tutor_chain.build_graph', return_value=mock_graph):
            with patch('app.services.tutor_chain.detect_knowledge_gaps',
                      return_value=["Linear Algebra", "Calculus"]):
                # Patch extract_concepts at the module level where it's imported in _check_prerequisites
                with patch('app.services.concept_extractor.extract_concepts',
                          return_value=mock_concepts):
                    with patch.object(tutor_chain.explanation_engine, 'generate_analogy',
                                    return_value="Neural networks are like..."):
                        with patch.object(tutor_chain.explanation_engine, 'generate_example',
                                        return_value="For example..."):
                            with patch.object(tutor_chain.explanation_engine, 'generate_stepwise',
                                            return_value="Step 1..."):
                                
                                response = await tutor_chain.explain(
                                    question="How do neural networks work?",
                                    source_ids=["source1"],
                                    user_profile=user_profile
                                )
                                
                                # Should identify missing prerequisites
                                assert response.prerequisite_check is not None
                                assert "Linear Algebra" in response.prerequisite_check or \
                                       "Calculus" in response.prerequisite_check


@pytest.mark.asyncio
async def test_prerequisite_checking_with_no_gaps(tutor_chain, mock_chunks):
    """Test prerequisite checking when user has all prerequisites"""
    from app.services.knowledge_graph_builder import ConceptGraph
    
    mock_graph = ConceptGraph()
    mock_graph.concepts = {
        "Neural Networks": {
            "name": "Neural Networks",
            "description": "Computing systems",
            "source_ids": ["source1"],
            "prerequisites": ["Linear Algebra"],
            "related": []
        }
    }
    
    # User profile with all prerequisites
    user_profile = {
        "concept_mastery": [
            {"concept": "Linear Algebra", "level": "proficient"},
            {"concept": "Calculus", "level": "mastery"}
        ]
    }
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=mock_chunks):
        with patch('app.services.concept_extractor.extract_concepts') as mock_extract:
            from app.services.concept_extractor import Concept
            mock_extract.return_value = [
                Concept("Neural Networks", "Computing systems", "source1", 0.9)
            ]
            
            with patch('app.services.knowledge_graph_builder.build_graph',
                      return_value=mock_graph):
                with patch('app.services.knowledge_graph_builder.detect_knowledge_gaps',
                          return_value=[]):  # No gaps
                    with patch.object(tutor_chain.explanation_engine, 'generate_analogy',
                                    return_value="Neural networks are like..."):
                        with patch.object(tutor_chain.explanation_engine, 'generate_example',
                                        return_value="For example..."):
                            with patch.object(tutor_chain.explanation_engine, 'generate_stepwise',
                                            return_value="Step 1..."):
                                
                                response = await tutor_chain.explain(
                                    question="How do neural networks work?",
                                    source_ids=["source1"],
                                    user_profile=user_profile
                                )
                                
                                # Should have no prerequisite gaps
                                assert response.prerequisite_check is None or \
                                       len(response.prerequisite_check) == 0


def test_build_context_with_single_source(tutor_chain, mock_chunks):
    """Test context building with single source"""
    context = tutor_chain._build_context_from_chunks_with_synthesis(mock_chunks)
    
    # Single source should use standard format
    assert "Test Source" in context
    assert "p.1" in context or "p.2" in context
    # Should not have multiple source indicators
    assert "multiple sources" not in context.lower()



@pytest.mark.asyncio
async def test_cross_source_synthesis_metadata(tutor_chain):
    """Test cross-source synthesis metadata generation"""
    # Create chunks from multiple sources
    multi_source_chunks = [
        {
            "chunk_id": "chunk1",
            "source_id": "source1",
            "source_name": "Book A",
            "text": "Machine learning uses algorithms to learn from data.",
            "page": 1
        },
        {
            "chunk_id": "chunk2",
            "source_id": "source2",
            "source_name": "Book B",
            "text": "Machine learning is a subset of artificial intelligence.",
            "page": 5
        }
    ]
    
    with patch('httpx.AsyncClient') as mock_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": """COMPLEMENTARY: YES
CONTRADICTORY: NO
SUMMARY: Both sources provide complementary information about machine learning."""
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
        
        synthesis = await tutor_chain._analyze_cross_source_synthesis(
            multi_source_chunks,
            "What is machine learning?"
        )
        
        assert synthesis is not None
        assert len(synthesis.sources_used) == 2
        assert "Book A" in synthesis.sources_used
        assert "Book B" in synthesis.sources_used
        assert synthesis.has_complementary_info is True
        assert synthesis.has_contradictory_info is False
        assert synthesis.synthesis_notes is not None


@pytest.mark.asyncio
async def test_cross_source_synthesis_contradictory(tutor_chain):
    """Test detection of contradictory information across sources"""
    multi_source_chunks = [
        {
            "chunk_id": "chunk1",
            "source_id": "source1",
            "source_name": "Source A",
            "text": "The optimal learning rate is 0.01.",
            "page": 1
        },
        {
            "chunk_id": "chunk2",
            "source_id": "source2",
            "source_name": "Source B",
            "text": "The optimal learning rate is 0.001.",
            "page": 3
        }
    ]
    
    with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": """COMPLEMENTARY: NO
CONTRADICTORY: YES
SUMMARY: Sources disagree on the optimal learning rate value."""
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post = AsyncMock(return_value=mock_response)
        mock_client_instance = MagicMock()
        mock_client_instance.post = mock_post
        mock_get_client.return_value = mock_client_instance
        
        synthesis = await tutor_chain._analyze_cross_source_synthesis(
            multi_source_chunks,
            "What is the optimal learning rate?"
        )
        
        assert synthesis is not None
        assert synthesis.has_complementary_info is False
        assert synthesis.has_contradictory_info is True
        assert "disagree" in synthesis.synthesis_notes.lower()


@pytest.mark.asyncio
async def test_cross_source_synthesis_single_source(tutor_chain):
    """Test that single source returns None for synthesis"""
    single_source_chunks = [
        {
            "chunk_id": "chunk1",
            "source_id": "source1",
            "source_name": "Book A",
            "text": "Machine learning uses algorithms.",
            "page": 1
        }
    ]
    
    synthesis = await tutor_chain._analyze_cross_source_synthesis(
        single_source_chunks,
        "What is machine learning?"
    )
    
    assert synthesis is None


@pytest.mark.asyncio
async def test_cross_source_synthesis_in_explain(tutor_chain):
    """Test that explain() includes cross-source synthesis metadata"""
    multi_source_chunks = [
        {
            "chunk_id": "chunk1",
            "source_id": "source1",
            "source_name": "Book A",
            "text": "Machine learning uses algorithms to learn patterns.",
            "page": 1
        },
        {
            "chunk_id": "chunk2",
            "source_id": "source2",
            "source_name": "Book B",
            "text": "Neural networks are a type of machine learning model.",
            "page": 5
        }
    ]
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=multi_source_chunks):
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{
                    "message": {
                        "content": """COMPLEMENTARY: YES
CONTRADICTORY: NO
SUMMARY: Sources provide complementary perspectives on machine learning."""
                    }
                }]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
            
            with patch.object(tutor_chain.explanation_engine, 'generate_analogy',
                            return_value="Machine learning is like teaching a child..."):
                with patch.object(tutor_chain.explanation_engine, 'generate_example',
                                return_value="For example..."):
                    with patch.object(tutor_chain.explanation_engine, 'generate_stepwise',
                                    return_value="Step 1..."):
                        
                        response = await tutor_chain.explain(
                            question="What is machine learning?",
                            source_ids=["source1", "source2"]
                        )
                        
                        # Should include synthesis metadata
                        assert response.cross_source_synthesis is not None
                        assert len(response.cross_source_synthesis.sources_used) == 2
                        assert response.cross_source_synthesis.has_complementary_info is True


@pytest.mark.asyncio
async def test_cross_source_synthesis_enhances_context(tutor_chain):
    """Test that synthesis metadata enhances the explanation context"""
    multi_source_chunks = [
        {
            "chunk_id": "chunk1",
            "source_id": "source1",
            "source_name": "Book A",
            "text": "Machine learning uses algorithms.",
            "page": 1
        },
        {
            "chunk_id": "chunk2",
            "source_id": "source2",
            "source_name": "Book B",
            "text": "Machine learning requires data.",
            "page": 3
        }
    ]
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=multi_source_chunks):
        with patch('app.services.llm._get_client', new_callable=AsyncMock) as mock_get_client:
            # Response for synthesis analysis call
            synthesis_response = MagicMock()
            synthesis_response.json.return_value = {
                "choices": [{
                    "message": {
                        "content": """COMPLEMENTARY: YES
CONTRADICTORY: NO
SUMMARY: Sources provide complementary information."""
                    }
                }]
            }
            synthesis_response.raise_for_status = MagicMock()
            
            # Response for all other LLM calls
            explanation_response = MagicMock()
            explanation_response.json.return_value = {
                "choices": [{"message": {"content": "Machine learning is a field of AI that uses algorithms to learn from data."}}]
            }
            explanation_response.raise_for_status = MagicMock()
            
            call_count = [0]
            async def post_handler(*args, **kwargs):
                call_count[0] += 1
                if call_count[0] == 1:
                    return synthesis_response
                return explanation_response
            
            mock_post = AsyncMock(side_effect=post_handler)
            mock_client_instance = MagicMock()
            mock_client_instance.post = mock_post
            mock_get_client.return_value = mock_client_instance
            
            response = await tutor_chain.explain(
                question="What is machine learning?",
                source_ids=["source1", "source2"]
            )
            
            # Verify synthesis instructions were included in the LLM call context
            second_call_args = mock_client_instance.post.call_args_list[1]
            messages = second_call_args[1]['json']['messages']
            system_content = messages[0]['content']
            user_content = messages[1]['content']
            
            assert "CROSS-SOURCE SYNTHESIS" in system_content or \
                   "CROSS-SOURCE SYNTHESIS" in user_content


@pytest.mark.asyncio
async def test_cross_source_synthesis_error_handling(tutor_chain):
    """Test that synthesis analysis handles errors gracefully"""
    multi_source_chunks = [
        {
            "chunk_id": "chunk1",
            "source_id": "source1",
            "source_name": "Book A",
            "text": "Machine learning uses algorithms.",
            "page": 1
        },
        {
            "chunk_id": "chunk2",
            "source_id": "source2",
            "source_name": "Book B",
            "text": "Neural networks are powerful.",
            "page": 3
        }
    ]
    
    with patch('httpx.AsyncClient') as mock_client:
        # Simulate HTTP error
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            side_effect=Exception("HTTP error")
        )
        
        synthesis = await tutor_chain._analyze_cross_source_synthesis(
            multi_source_chunks,
            "What is machine learning?"
        )
        
        # Should return basic synthesis info even on error
        assert synthesis is not None
        assert len(synthesis.sources_used) == 2
        assert synthesis.has_complementary_info is True  # Default assumption
        assert synthesis.has_contradictory_info is False


@pytest.mark.asyncio
async def test_stream_explain_includes_synthesis(tutor_chain):
    """Test that stream_explain emits synthesis metadata"""
    multi_source_chunks = [
        {
            "chunk_id": "chunk1",
            "source_id": "source1",
            "source_name": "Book A",
            "text": "Machine learning uses algorithms.",
            "page": 1
        },
        {
            "chunk_id": "chunk2",
            "source_id": "source2",
            "source_name": "Book B",
            "text": "Machine learning requires data.",
            "page": 3
        }
    ]
    
    with patch('app.services.tutor_chain.vector_store.query_chunks', return_value=multi_source_chunks):
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{
                    "message": {
                        "content": """COMPLEMENTARY: YES
CONTRADICTORY: NO
SUMMARY: Sources complement each other."""
                    }
                }]
            }
            mock_response.raise_for_status = MagicMock()
            
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
            
            with patch.object(tutor_chain.explanation_engine, 'generate_analogy',
                            return_value="Machine learning is like..."):
                with patch.object(tutor_chain.explanation_engine, 'generate_example',
                                return_value="For example..."):
                    with patch.object(tutor_chain.explanation_engine, 'generate_stepwise',
                                    return_value="Step 1..."):
                        
                        events = []
                        async for event in tutor_chain.stream_explain(
                            question="What is machine learning?",
                            source_ids=["source1", "source2"]
                        ):
                            events.append(event)
                        
                        # Check that synthesis event is emitted
                        event_types = [e["type"] for e in events]
                        assert "synthesis" in event_types
                        
                        # Find synthesis event and verify data
                        synthesis_event = next(e for e in events if e["type"] == "synthesis")
                        assert synthesis_event["data"]["sources_used"] == ["Book A", "Book B"]
                        assert synthesis_event["data"]["has_complementary_info"] is True
