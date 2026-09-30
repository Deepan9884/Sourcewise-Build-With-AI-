import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.intent_parser import parse_intent, ActionType
from app.services.action_executor import ActionExecutor


@pytest.mark.asyncio
async def test_parse_intent_task_queries():
    # User's exact prompt from request
    query_1 = "what are all the task pending here like list today's task"
    intent_1 = await parse_intent(query_1)
    assert intent_1.action == ActionType.LIST_TASKS

    # Variations of task inquiries
    query_2 = "list today's task"
    intent_2 = await parse_intent(query_2)
    assert intent_2.action == ActionType.LIST_TASKS

    query_3 = "what are my pending tasks?"
    intent_3 = await parse_intent(query_3)
    assert intent_3.action == ActionType.LIST_TASKS

    query_4 = "what should I study next?"
    intent_4 = await parse_intent(query_4)
    assert intent_4.action == ActionType.RECOMMEND_STUDY

    query_5 = "mark electromagnetism as done"
    intent_5 = await parse_intent(query_5)
    assert intent_5.action == ActionType.COMPLETE_TASK

    query_6 = "how is my study pace?"
    intent_6 = await parse_intent(query_6)
    assert intent_6.action == ActionType.PACING_STATUS


@pytest.mark.asyncio
async def test_action_executor_list_tasks():
    executor = ActionExecutor()
    intent = await parse_intent("list today's task")

    personal_context = {
        "user": {"name": "Deepan"},
        "today_date": "2026-09-30",
        "day_of_week": "Wednesday",
        "today_tasks": [
            {
                "id": "slot-1",
                "subject": "Physics",
                "topic": "Electromagnetism",
                "start_time": "10:00",
                "end_time": "11:00",
                "duration_minutes": 60,
                "status": "pending",
                "is_completed": False,
            },
            {
                "id": "slot-2",
                "subject": "Calculus",
                "topic": "Integration by Parts",
                "start_time": "14:00",
                "end_time": "15:00",
                "duration_minutes": 60,
                "status": "completed",
                "is_completed": True,
            },
        ],
        "overdue_tasks": [
            {
                "id": "slot-old",
                "subject": "Chemistry",
                "topic": "Organic Synthesis",
                "date": "2026-09-29",
                "status": "pending",
            }
        ],
    }

    result = await executor.execute(intent, source_ids=[], user_id="user-123", personal_context=personal_context)
    assert result.type == "tasks"
    assert "Electromagnetism" in result.message
    assert "Physics" in result.message
    assert result.data["pending_count"] == 2  # 1 today + 1 overdue
    assert result.data["completed_count"] == 1
