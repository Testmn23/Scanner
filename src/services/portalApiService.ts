import { useAuth } from '@/composables/useAuth';

const API_BASE_URL = '/api'; // Assuming your API is served from the same domain under /api

// Interfaces for expected API responses (can be expanded)
interface ApiKey {
  apiKey: string;
  description: string;
  status: 'active' | 'inactive' | 'revoked';
  credits: number;
  usageCount: number;
  createdAt: string | null; // ISO string
  lastUsedAt: string | null; // ISO string
  scopes: string[];
}

interface ApiKeyCreationResponse {
  message: string;
  apiKey: string;
  description: string;
  credits: number;
  status: string;
}

interface UsageSummaryResponse {
  totalActiveKeys: number;
  totalCreditsRemaining: number;
  totalUsageCountAllTime: number;
  recentUsageCountLast30Days: number;
}

interface UsageLog {
  logId: string;
  apiKey: string;
  timestamp: string | null; // ISO string
  endpoint: string;
  status: string;
  creditsConsumed: number;
  ipAddress?: string;
  userAgent?: string;
}

interface UsageHistoryResponse {
  logs: UsageLog[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// Helper to make authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const { getIdToken } = useAuth();
  const token = await getIdToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData)) { // Don't set Content-Type for FormData
      headers.append('Content-Type', 'application/json');
  }


  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON, use status text
      errorData = { error: response.statusText || 'An unknown error occurred' };
    }
    console.error(`API Error ${response.status} for ${url}:`, errorData);
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
  return response;
}

// API Key Management Functions
export async function createApiKey(description?: string): Promise<ApiKeyCreationResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/apikeys`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
  return response.json();
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/apikeys`);
  return response.json();
}

export async function updateApiKey(
  apiKey: string,
  updates: { description?: string; status?: 'active' | 'inactive' }
): Promise<ApiKey> {
  const response = await fetchWithAuth(`${API_BASE_URL}/apikeys/${apiKey}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return response.json();
}

export async function revokeApiKey(apiKey: string): Promise<{ message: string }> {
  const response = await fetchWithAuth(`${API_BASE_URL}/apikeys/${apiKey}`, {
    method: 'DELETE',
  });
  return response.json();
}

// Usage Statistics Functions
export async function getUsageSummary(): Promise<UsageSummaryResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/usage/summary`);
  return response.json();
}

export async function getUsageHistory(params: {
  apiKeyId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<UsageHistoryResponse> {
  const queryParams = new URLSearchParams();
  if (params.apiKeyId) queryParams.append('apiKeyId', params.apiKeyId);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const response = await fetchWithAuth(`${API_BASE_URL}/usage/history?${queryParams.toString()}`);
  return response.json();
}

// User Profile Management
interface UserProfileResponse {
  message: string;
  uid: string;
  email: string;
  displayName: string;
}

export async function updateUserDisplayName(displayName: string): Promise<UserProfileResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/users/me/displayname`, {
    method: 'PUT',
    body: JSON.stringify({ displayName }),
  });
  return response.json();
}
