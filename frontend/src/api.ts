import type {
  AvailabilityBlock,
  AvailabilityCreatePayload,
  GroupCreatePayload,
  GroupSession,
  HeatmapResponse,
  User,
} from './types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const TOKEN_KEY = 'timetomeet_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(includeJson = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
      return data.detail[0].msg;
    }
  } catch {
    return `Request failed with status ${res.status}`;
  }
  return `Request failed with status ${res.status}`;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const res = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    headers: authHeaders(false),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function fetchMyGroups(): Promise<GroupSession[]> {
  const res = await fetch(`${API_BASE_URL}/groups`, {
    headers: authHeaders(false),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function fetchGroup(groupId: string): Promise<GroupSession> {
  const res = await fetch(`${API_BASE_URL}/groups/${groupId}`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function createGroup(
  payload: GroupCreatePayload
): Promise<GroupSession> {
  const res = await fetch(`${API_BASE_URL}/groups`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function deleteGroup(groupId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
    method: 'DELETE',
    headers: authHeaders(false),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function updateGroupStatus(
  groupId: string,
  isClosed: boolean
): Promise<GroupSession> {
  const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify({ is_closed: isClosed }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function fetchGroupHeatmap(
  groupId: string
): Promise<HeatmapResponse> {
  const res = await fetch(`${API_BASE_URL}/groups/${groupId}/heatmap`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function fetchGroupAvailabilities(
  groupId: string
): Promise<AvailabilityBlock[]> {
  const res = await fetch(`${API_BASE_URL}/groups/${groupId}/availabilities`);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function saveAvailabilities(
  groupId: string,
  blocks: AvailabilityCreatePayload[],
  asGuest = false
): Promise<AvailabilityBlock[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!asGuest) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  const res = await fetch(`${API_BASE_URL}/groups/${groupId}/availabilities`, {
    method: 'POST',
    headers,
    body: JSON.stringify(blocks),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json();
}

export async function deleteMyAvailabilities(
  groupId: string,
  guestUserId?: string | null
): Promise<void> {
  const query = guestUserId ? `?guest_user_id=${guestUserId}` : '';
  const res = await fetch(
    `${API_BASE_URL}/groups/${groupId}/availabilities${query}`,
    {
      method: 'DELETE',
      headers: authHeaders(false),
    }
  );
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function removeParticipant(
  groupId: string,
  userId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/groups/${groupId}/participants/${userId}`,
    {
      method: 'DELETE',
      headers: authHeaders(false),
    }
  );
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function deleteAvailabilityWindow(
  groupId: string,
  availabilityId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/groups/${groupId}/availabilities/${availabilityId}`,
    {
      method: 'DELETE',
      headers: authHeaders(false),
    }
  );
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}
