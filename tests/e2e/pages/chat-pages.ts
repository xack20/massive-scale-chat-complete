import { expect, Page } from '@playwright/test';

export class ChatPage {
  constructor(private readonly _page: Page) {}

  // Expose underlying page for advanced scenarios (e.g., CDP, viewport changes)
  get page() { return this._page; }

  // Selectors
  get sidebar() { return this.page.locator('[data-testid="chat-sidebar"]'); }
  get roomsList() { return this.page.locator('[data-testid="rooms-list"]'); }
  get messagesList() { return this.page.locator('[data-testid="messages-list"]'); }
  get messageInput() { return this.page.locator('[data-testid="message-input"]'); }
  get sendButton() { return this.page.locator('[data-testid="send-button"]'); }
  get userMenu() { return this.page.locator('[data-testid="user-menu"]'); }
  get onlineUsers() { return this.page.locator('[data-testid="online-users"]'); }
  get typingIndicator() { return this.page.locator('[data-testid="typing-indicator"]'); }
  get emojiButton() { return this.page.locator('[data-testid="emoji-button"]'); }
  get fileUploadButton() { return this.page.locator('[data-testid="file-upload-button"]'); }

  // Actions
  async goto() {
  await this.page.goto('/chat');
  await expect(this.sidebar).toBeVisible();
  }

  async selectRoom(roomName: string) {
    await this.roomsList.locator(`text="${roomName}"`).click();
    await expect(this.page.locator(`[data-testid="current-room-name"]:has-text("${roomName}")`)).toBeVisible();
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.sendButton.click();
    await expect(this.messageInput).toHaveValue('');
  }

  async expectMessageVisible(message: string) {
    await expect(this.messagesList.locator(`text="${message}"`)).toBeVisible();
  }

  async expectTypingIndicator(username: string) {
    await expect(this.typingIndicator.locator(`text="${username} is typing"`)).toBeVisible();
  }

  async expectUserOnline(username: string) {
    await expect(this.onlineUsers.locator(`text="${username}"`)).toBeVisible();
  }

  async openEmojiPicker() {
    await this.emojiButton.click();
    await expect(this.page.locator('[data-testid="emoji-picker"]')).toBeVisible();
  }

  async selectEmoji(emoji: string) {
    await this.page.locator(`[data-emoji="${emoji}"]`).click();
  }

  async reactToMessage(messageText: string, emoji: string) {
    const message = this.messagesList.locator(`text="${messageText}"`).first();
    await message.hover();
    await message.locator('[data-testid="react-button"]').click();
    await this.selectEmoji(emoji);
  }

  async uploadFile(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await expect(this.page.locator('[data-testid="file-upload-preview"]')).toBeVisible();
  }

  async startVideoCall() {
    await this.page.locator('[data-testid="video-call-button"]').click();
    await expect(this.page.locator('[data-testid="video-call-modal"]')).toBeVisible();
  }

  async searchMessages(query: string) {
    await this.page.locator('[data-testid="search-input"]').fill(query);
    await this.page.locator('[data-testid="search-button"]').click();
  }

  async expectSearchResults(count: number) {
    await expect(this.page.locator('[data-testid="search-results"]')).toContainText(`${count} results`);
  }

  async logout() {
    await this.userMenu.click();
    await this.page.locator('[data-testid="logout-button"]').click();
    await expect(this.page).toHaveURL(/\/login/);
  }
}

export class RoomManagePage {
  constructor(private readonly page: Page) {}

  // Selectors
  get createRoomButton() { return this.page.locator('[data-testid="create-room-button"]'); }
  get roomNameInput() { return this.page.locator('[data-testid="room-name-input"]'); }
  get roomDescriptionInput() { return this.page.locator('[data-testid="room-description-input"]'); }
  get privateRoomCheckbox() { return this.page.locator('[data-testid="private-room-checkbox"]'); }
  get saveRoomButton() { return this.page.locator('[data-testid="save-room-button"]'); }
  get roomSettingsButton() { return this.page.locator('[data-testid="room-settings-button"]'); }

  // Actions
  async createRoom(name: string, description: string, isPrivate = false) {
    await this.createRoomButton.click();
    await this.roomNameInput.fill(name);
    await this.roomDescriptionInput.fill(description);
    
    if (isPrivate) {
      await this.privateRoomCheckbox.check();
    }
    
    await this.saveRoomButton.click();
    await expect(this.page.locator(`text="${name}"`)).toBeVisible();
  }

  async expectRoomCreated(roomName: string) {
    await expect(this.page.locator(`[data-testid="rooms-list"] >> text="${roomName}"`)).toBeVisible();
  }
}