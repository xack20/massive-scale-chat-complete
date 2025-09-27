import axios, { AxiosResponse } from 'axios';

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
  const response = await apiRequest('POST', 'http://localhost:3000/api/auth/login', {
    email,
    password,
  });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  return response.data.token;
}

/**
 * Register a new user
 */
export async function registerUser(username: string, email: string, password: string) {
  const response = await apiRequest('POST', 'http://localhost:3000/api/auth/register', {
    username,
    email,
    password,
  });

  if (response.status !== 201 && response.status !== 409) {
    throw new Error(`Registration failed: ${response.statusText}`);
  }

  return response.data;
}

/**
 * Create a chat room
 */
export async function createRoom(name: string, description: string, token: string, isPrivate = false) {
  const response = await apiRequest('POST', 'http://localhost:3000/api/rooms', {
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
  const response = await apiRequest('POST', `http://localhost:3000/api/rooms/${roomId}/messages`, {
    content,
  }, {
    'Authorization': `Bearer ${token}`,
  });

  if (response.status !== 201) {
    throw new Error(`Message sending failed: ${response.statusText}`);
  }

  return response.data;
}