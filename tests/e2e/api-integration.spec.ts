import { expect, test } from './fixtures/test-fixtures';

test.describe('API Integration Tests', () => {
  test.describe('Authentication API', () => {
    test('should authenticate via API', async ({ page }) => {
      // Direct API authentication test
      const response = await page.request.post('http://localhost:3000/api/auth/login', {
        data: {
          email: 'testuser1@example.com',
          password: 'password123'
        }
      });
      
      expect(response.status()).toBe(200);
      const responseData = await response.json();
      expect(responseData.token).toBeDefined();
      expect(responseData.user).toBeDefined();
    });

    test('should reject invalid credentials via API', async ({ page }) => {
      const response = await page.request.post('http://localhost:3000/api/auth/login', {
        data: {
          email: 'invalid@example.com',
          password: 'wrongpassword'
        }
      });
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Message API', () => {
    test('should send message via API', async ({ page, authenticatedUser }) => {
      // First get a room ID (assuming General room exists)
      const roomsResponse = await page.request.get('http://localhost:3000/api/rooms', {
        headers: {
          'Authorization': `Bearer ${authenticatedUser.token}`
        }
      });
      
      expect(roomsResponse.status()).toBe(200);
      const rooms = await roomsResponse.json();
      const generalRoom = rooms.find((room: any) => room.name === 'General');
      expect(generalRoom).toBeDefined();
      
      // Send message to the room
      const messageContent = `API test message - ${Date.now()}`;
      const messageResponse = await page.request.post(`http://localhost:3000/api/rooms/${generalRoom.id}/messages`, {
        data: {
          content: messageContent
        },
        headers: {
          'Authorization': `Bearer ${authenticatedUser.token}`
        }
      });
      
      expect(messageResponse.status()).toBe(201);
      const messageData = await messageResponse.json();
      expect(messageData.content).toBe(messageContent);
      expect(messageData.userId).toBeDefined();
    });

    test('should get message history via API', async ({ page, authenticatedUser }) => {
      const roomsResponse = await page.request.get('http://localhost:3000/api/rooms', {
        headers: {
          'Authorization': `Bearer ${authenticatedUser.token}`
        }
      });
      
      const rooms = await roomsResponse.json();
      const generalRoom = rooms.find((room: any) => room.name === 'General');
      
      const messagesResponse = await page.request.get(`http://localhost:3000/api/rooms/${generalRoom.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${authenticatedUser.token}`
        }
      });
      
      expect(messagesResponse.status()).toBe(200);
      const messages = await messagesResponse.json();
      expect(Array.isArray(messages)).toBeTruthy();
    });
  });

  test.describe('Room API', () => {
    test('should create room via API', async ({ page, authenticatedUser }) => {
      const roomData = {
        name: `API Test Room - ${Date.now()}`,
        description: 'Room created via API test',
        private: false
      };
      
      const response = await page.request.post('http://localhost:3000/api/rooms', {
        data: roomData,
        headers: {
          'Authorization': `Bearer ${authenticatedUser.token}`
        }
      });
      
      expect(response.status()).toBe(201);
      const createdRoom = await response.json();
      expect(createdRoom.name).toBe(roomData.name);
      expect(createdRoom.description).toBe(roomData.description);
    });

    test('should get rooms list via API', async ({ page, authenticatedUser }) => {
      const response = await page.request.get('http://localhost:3000/api/rooms', {
        headers: {
          'Authorization': `Bearer ${authenticatedUser.token}`
        }
      });
      
      expect(response.status()).toBe(200);
      const rooms = await response.json();
      expect(Array.isArray(rooms)).toBeTruthy();
      expect(rooms.length).toBeGreaterThan(0);
    });
  });

  test.describe('File Upload API', () => {
    test('should upload file via API', async ({ page, authenticatedUser }) => {
      // Create a test file content
      const fileContent = 'Test file content for API upload';
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: 'text/plain' });
      formData.append('file', blob, 'test-file.txt');
      
      const response = await page.request.post('http://localhost:3000/api/files/upload', {
        multipart: {
          file: {
            name: 'test-file.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(fileContent)
          }
        },
        headers: {
          'Authorization': `Bearer ${authenticatedUser.token}`
        }
      });
      
      expect(response.status()).toBe(201);
      const uploadedFile = await response.json();
      expect(uploadedFile.filename).toBeDefined();
      expect(uploadedFile.url).toBeDefined();
    });
  });

  test.describe('User API', () => {
    test('should get user profile via API', async ({ page, authenticatedUser }) => {
      const response = await page.request.get('http://localhost:3000/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${authenticatedUser.token}`
        }
      });
      
      expect(response.status()).toBe(200);
      const profile = await response.json();
      expect(profile.email).toBe(authenticatedUser.email);
      expect(profile.username).toBe(authenticatedUser.username);
    });

    test('should update user profile via API', async ({ page, authenticatedUser }) => {
      const updateData = {
        displayName: `Updated Display Name - ${Date.now()}`,
        bio: 'Updated bio from API test'
      };
      
      const response = await page.request.put('http://localhost:3000/api/users/profile', {
        data: updateData,
        headers: {
          'Authorization': `Bearer ${authenticatedUser.token}`
        }
      });
      
      expect(response.status()).toBe(200);
      const updatedProfile = await response.json();
      expect(updatedProfile.displayName).toBe(updateData.displayName);
      expect(updatedProfile.bio).toBe(updateData.bio);
    });
  });
});