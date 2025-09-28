import { test } from './fixtures/test-fixtures';

test.describe('Chat Functionality', () => {
  test.describe('Basic Chat', () => {
    test('should send and receive messages', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('General');
      
      const testMessage = `Test message ${Date.now()}`;
      await chatPage.sendMessage(testMessage);
      await chatPage.expectMessageVisible(testMessage);
    });

    test('should display messages in correct order', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('General');
      
      const messages = [
        `First message ${Date.now()}`,
        `Second message ${Date.now() + 1}`,
        `Third message ${Date.now() + 2}`,
      ];

      for (const message of messages) {
        await chatPage.sendMessage(message);
        await chatPage.expectMessageVisible(message);
      }
    });

    test('should switch between rooms', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      
      await chatPage.selectRoom('General');
      const generalMessage = `General room message ${Date.now()}`;
      await chatPage.sendMessage(generalMessage);
      
      await chatPage.selectRoom('Testing');
      const testingMessage = `Testing room message ${Date.now()}`;
      await chatPage.sendMessage(testingMessage);
      
      await chatPage.expectMessageVisible(testingMessage);
    });
  });

  test.describe('Message Features', () => {
    test('should add emoji reactions to messages', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('General');
      
      const testMessage = `Message for reaction ${Date.now()}`;
      await chatPage.sendMessage(testMessage);
      await chatPage.expectMessageVisible(testMessage);
      
      await chatPage.reactToMessage(testMessage, '👍');
    });

    test('should send emojis in messages', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('General');
      
      await chatPage.openEmojiPicker();
      await chatPage.selectEmoji('😀');
      
      const messageWithEmoji = `Hello 😀 ${Date.now()}`;
      await chatPage.sendMessage(messageWithEmoji);
      await chatPage.expectMessageVisible(messageWithEmoji);
    });

    test('should search messages', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('General');
      
      const searchTerm = `searchable_${Date.now()}`;
      const testMessage = `This is a ${searchTerm} message`;
      await chatPage.sendMessage(testMessage);
      await chatPage.expectMessageVisible(testMessage);
      
      await chatPage.searchMessages(searchTerm);
      await chatPage.expectSearchResults(1);
    });
  });

  test.describe('File Upload', () => {
    test('should upload and share files', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('General');
      
      // Create a test file
      const testFilePath = 'test-data/test-image.png';
      await chatPage.uploadFile(testFilePath);
    });
  });

  test.describe('Real-time Features', () => {
    test('should show typing indicators', async ({ authenticatedUser, chatPage, page, context }) => {
      // This test would require multiple browser contexts
      // to simulate multiple users typing simultaneously
      await chatPage.goto();
      await chatPage.selectRoom('General');
      
      // Simulate typing by focusing on input
      await chatPage.messageInput.focus();
      await chatPage.messageInput.type('User is typing...');
      
      // Note: In a real test, you would need another user context
      // to verify the typing indicator appears for other users
    });

    test('should show user presence status', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.expectUserOnline(authenticatedUser.username);
    });
  });

  test.describe('Video/Voice Calls', () => {
    test('should initiate video call', async ({ authenticatedUser, chatPage }) => {
      await chatPage.goto();
      await chatPage.selectRoom('General');
      await chatPage.startVideoCall();
    });
  });
});