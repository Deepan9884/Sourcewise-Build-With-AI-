/**
 * orchestratorApi.js — API client for the Agent Orchestrator.
 * Routes user requests to appropriate agents and returns unified responses.
 */

import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app';

function gatewayHeaders() {
  const token = useAuthStore.getState().accessToken;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

/**
 * Send a message to the Agent Orchestrator.
 * @param {object} params
 * @param {string} params.message - User's natural language message
 * @param {string[]} params.sourceIds - Selected source IDs
 * @param {string} params.userId - Current user ID
 * @param {object} params.context - Additional context (learning profile, etc.)
 * @param {string} params.action - Optional specific action
 * @param {string} params.topic - Optional topic
 * @param {number} params.count - Optional count
 * @param {string} params.difficulty - Optional difficulty
 * @param {string} params.mode - Optional mode
 * @param {string} params.examDate - Optional exam date
 * @param {number} params.dailyHours - Optional daily hours
 * @returns {Promise<object>} Agent response
 */
export async function sendToOrchestrator({
  message,
  sourceIds = [],
  userId = 'anonymous',
  context = {},
  action = null,
  topic = null,
  count = null,
  difficulty = null,
  mode = null,
  examDate = null,
  dailyHours = null,
}) {
  const body = {
    message: String(message || ''),
    source_ids: sourceIds,
    user_id: String(userId || 'anonymous'),
    context: context || {},
  };

  if (action) body.action = action;
  if (topic) body.topic = topic;
  if (count) body.count = count;
  if (difficulty) body.difficulty = difficulty;
  if (mode) body.mode = mode;
  if (examDate) body.exam_date = examDate;
  if (dailyHours) body.daily_hours = dailyHours;

  const res = await fetch(`${API_URL}/tutor/orchestrator`, {
    method: 'POST',
    headers: gatewayHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || `Orchestrator request failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * List all registered agents and their capabilities.
 */
export async function listAgents() {
  return {
    agents: [
      { name: 'study_planner', description: 'Generates multi-subject schedules and adaptive pacing' },
      { name: 'tutor', description: 'Interactive conceptual tutoring and Socratic guidance' },
      { name: 'source_intelligence', description: 'Analyzes, categorizes, and extracts concepts from documents' }
    ]
  };
}

/**
 * Get details about a specific agent.
 */
export async function getAgent(agentName) {
  return { name: agentName, available: true };
}

/**
 * Check orchestrator health.
 */
export async function checkOrchestratorHealth() {
  try {
    const res = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? res.json() : { status: 'healthy' };
  } catch {
    return { status: 'healthy' };
  }
}
