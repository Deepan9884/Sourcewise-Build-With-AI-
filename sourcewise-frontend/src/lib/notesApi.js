const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getAuthHeader(token) {
  if (!token) {
    const raw = localStorage.getItem('sourcewise_auth');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        token = parsed.state?.accessToken || parsed.accessToken;
      } catch (e) {
        // ignore
      }
    }
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch all notes stored in cloud storage for the current user
 */
export async function fetchCloudNotes(token) {
  const res = await fetch(`${API_URL}/notes`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch cloud notes (${res.status})`);
  }

  return await res.json();
}

/**
 * Fetch a single note by ID
 */
export async function fetchCloudNoteById(id, token) {
  const res = await fetch(`${API_URL}/notes/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch note (${res.status})`);
  }

  return await res.json();
}

/**
 * Save a new note to cloud storage
 */
export async function saveCloudNote(payload, token) {
  const res = await fetch(`${API_URL}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to save note to cloud storage (${res.status})`);
  }

  return await res.json();
}

/**
 * Update an existing note in cloud storage ("change that")
 */
export async function updateCloudNote(id, payload, token) {
  const res = await fetch(`${API_URL}/notes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update note in cloud storage (${res.status})`);
  }

  return await res.json();
}

/**
 * Delete a note from cloud storage
 */
export async function deleteCloudNote(id, token) {
  const res = await fetch(`${API_URL}/notes/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete note (${res.status})`);
  }

  return await res.json();
}
