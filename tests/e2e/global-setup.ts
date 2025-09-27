import { chromium, FullConfig } from '@playwright/test';
import { apiRequest } from './utils/api-helpers';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🚀 Starting global setup...');

  // Wait for services to be ready
  await waitForServices();
  
  // Setup test data
  await setupTestUsers();
  await setupTestRooms();

  await browser.close();
  
  console.log('✅ Global setup completed');
}

async function waitForServices() {
  const services = [
    { name: 'API Gateway', url: 'http://localhost:3000/health' },
    { name: 'User Service', url: 'http://localhost:3001/health' },
    { name: 'Message Service', url: 'http://localhost:3002/health' },
    { name: 'File Service', url: 'http://localhost:3003/health' },
    { name: 'Notification Service', url: 'http://localhost:3004/health' },
    { name: 'Presence Service', url: 'http://localhost:3005/health' },
    { name: 'Frontend', url: 'http://localhost:3006' },
  ];

  console.log('⏳ Waiting for services to be ready...');
  
  for (const service of services) {
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        await apiRequest('GET', service.url);
        console.log(`✅ ${service.name} is ready`);
        break;
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          console.log(`❌ ${service.name} failed to start after ${maxAttempts} attempts`);
          throw new Error(`Service ${service.name} not ready`);
        }
        console.log(`⏳ Waiting for ${service.name}... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

async function setupTestUsers() {
  console.log('👥 Setting up test users...');
  
  const testUsers = [
    { username: 'testuser1', email: 'testuser1@example.com', password: 'password123' },
    { username: 'testuser2', email: 'testuser2@example.com', password: 'password123' },
    { username: 'adminuser', email: 'admin@example.com', password: 'admin123' },
  ];

  for (const user of testUsers) {
    try {
      await apiRequest('POST', 'http://localhost:3000/api/auth/register', user);
      console.log(`✅ Created test user: ${user.username}`);
    } catch (error: any) {
      if (error?.response?.status === 409) {
        console.log(`ℹ️ Test user ${user.username} already exists`);
      } else {
        console.log(`⚠️ Failed to create test user ${user.username}:`, error.message);
      }
    }
  }
}

async function setupTestRooms() {
  console.log('🏠 Setting up test chat rooms...');
  
  // Login as admin to create rooms
  try {
    const loginResponse = await apiRequest('POST', 'http://localhost:3000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    const testRooms = [
      { name: 'General', description: 'General discussion room' },
      { name: 'Testing', description: 'Room for testing purposes' },
      { name: 'Private Test', description: 'Private test room', private: true },
    ];

    for (const room of testRooms) {
      try {
        await apiRequest('POST', 'http://localhost:3000/api/rooms', room, {
          'Authorization': `Bearer ${token}`
        });
        console.log(`✅ Created test room: ${room.name}`);
      } catch (error: any) {
        if (error?.response?.status === 409) {
          console.log(`ℹ️ Test room ${room.name} already exists`);
        } else {
          console.log(`⚠️ Failed to create test room ${room.name}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Failed to setup test rooms:', error);
  }
}

export default globalSetup;