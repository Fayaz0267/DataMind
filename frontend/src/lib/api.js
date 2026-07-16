import axios from 'axios';
import { auth } from './firebase';
import { getCachedResult, setCachedResult, getSessionId as getCacheSessionId } from './queryCache';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: BASE_URL, timeout: 60000 });

// Auto-attach Firebase token
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

let _sessionId = null;

export const getSessionId = () => {
  if (!_sessionId) {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('dm_session_id') : null;
    _sessionId = saved || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (typeof window !== 'undefined') sessionStorage.setItem('dm_session_id', _sessionId);
  }
  return _sessionId;
};

export const resetSession = () => {
  _sessionId = null;
  if (typeof window !== 'undefined') sessionStorage.removeItem('dm_session_id');
};

export const uploadCSV = async (file) => {
  const sessionId = getSessionId();
  const uid       = auth.currentUser?.uid || '';
  const fd        = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/upload', fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'x-session-id': sessionId,
      'x-user-uid':   uid,
    },
  });
  return data;
};

export const submitQuery = async (query, history = []) => {
  const sessionId = getSessionId();
  const uid       = auth.currentUser?.uid || '';

  // ── Check cache first ──
  const cached = getCachedResult(sessionId, query);
  if (cached) {
    console.log('[Cache] HIT:', query.slice(0, 40));
    return { ...cached, _fromCache: true };
  }

  const { data } = await api.post('/api/query', {
    query,
    sessionId,
    uid,
    history: history.slice(-4).map(h => ({ role: h.role, content: h.query || h.content })),
  });

  // ── Cache successful results ──
  if (data.success && data.canAnswer !== false) {
    setCachedResult(sessionId, query, data);
    console.log('[Cache] SET:', query.slice(0, 40));
  }

  return data;
};

export const getErrorMessage = (error) => {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.error || error.response?.data?.message || '';
    if (msg) return msg;
    if (error.code === 'ECONNREFUSED') return 'Cannot connect to backend. Is the server running on port 4000?';
    if (error.code === 'ETIMEDOUT')    return 'Request timed out. Try a simpler query.';
    return `Server error ${error.response?.status || ''}`.trim();
  }
  return error?.message || 'Something went wrong.';
};

export const isSessionError = (msg) =>
  msg && (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('not found'));

export default api;