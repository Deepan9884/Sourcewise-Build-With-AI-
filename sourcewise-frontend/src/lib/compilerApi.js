import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app';

const getAuthHeaders = () => {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch (e) {
    // Ignore error
  }
  return {};
};

/**
 * Fetch supported languages, compiler versions, and algorithm starter templates
 */
export async function getLanguages() {
  const response = await axios.get(`${API_URL}/compiler/languages`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

/**
 * Execute code via DeepCode compiler service
 */
export async function executeCode({ language, code, stdin = '', compiler = null }) {
  const response = await axios.post(
    `${API_URL}/compiler/execute`,
    {
      language,
      code,
      stdin,
      compiler,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      timeout: 25000,
    }
  );
  return response.data;
}

/**
 * Request AI analysis, bug-fixing, optimization, or test case generation
 */
export async function getAIAssist({ action = 'explain', language, code, error_output = '' }) {
  const response = await axios.post(
    `${API_URL}/compiler/ai-assist`,
    {
      action,
      language,
      code,
      error_output,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      timeout: 45000,
    }
  );
  return response.data;
}
