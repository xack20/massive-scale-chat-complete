import axios, { AxiosResponse } from 'axios';

// The API Gateway (auth, rooms, etc.) runs on port 3000 by default. The frontend UI runs on 3006.
// Earlier we pointed this helper to 3006 which caused 404s (Next.js app does not serve /api/auth/*).
// Prefer explicit API_BASE_URL, fall back to API_GATEWAY_URL, then generic BASE_URL, and finally 3000.
const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL
  || process.env.API_GATEWAY_URL
  || process.env.BASE_URL
  || DEFAULT_API_BASE_URL;

export interface ApiResponse {
  data: any;
  status: number;
  statusText: string;
}

/**
 * Make API requests with proper error handling
 */
export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  headers?: Record<string, string>
): Promise<ApiResponse> {
  try {
    const response: AxiosResponse = await axios({
      method,
      url,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 10000, // 10 seconds
    });

    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error: any) {
    if (error.response) {
      // Server responded with error status
      return {
        data: error.response.data,
        status: error.response.status,
        statusText: error.response.statusText,
      };
    } else {
      // Network error or timeout
      throw error;
    }
  }
}

/**
 * Login user and return token
 */
export async function loginUser(email: string, password: string): Promise<string> {
  const url = `${API_BASE_URL}/api/auth/login`;
  const response = await apiRequest('POST', url, { email, password });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status} ${response.statusText} (url=${url})`);
  }

  return response.data.token;
}

/**
 * Register a new user
 */
export async function registerUser(username: string, email: string, password: string) {
  const url = `${API_BASE_URL}/api/auth/register`;
  const response = await apiRequest('POST', url, { username, email, password });

  if (response.status !== 201 && response.status !== 409) {
    throw new Error(`Registration failed: ${response.status} ${response.statusText} (url=${url})`);
  }

  return response.data;
}

/**
 * Create a chat room
 */
export async function createRoom(name: string, description: string, token: string, isPrivate = false) {
  const response = await apiRequest('POST', `${API_BASE_URL}/api/rooms`, {
    name,
    description,
    private: isPrivate,
  }, {
    'Authorization': `Bearer ${token}`,
  });

  if (response.status !== 201) {
    throw new Error(`Room creation failed: ${response.statusText}`);
  }

  return response.data;
}

/**
 * Send a message to a room
 */
export async function sendMessage(roomId: string, content: string, token: string) {
  const response = await apiRequest('POST', `${API_BASE_URL}/api/rooms/${roomId}/messages`, {
    content,
  }, {
    'Authorization': `Bearer ${token}`,
  });

  if (response.status !== 201) {
    throw new Error(`Message sending failed: ${response.statusText}`);
  }

  return response.data;
}