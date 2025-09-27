import { Page } from '@playwright/test';

export class WebSocketHelper {
  constructor(private page: Page) {}

  async connectToWebSocket(url: string, token?: string) {
    return await this.page.evaluate(({ url, token }) => {
      return new Promise((resolve, reject) => {
        const socket = new WebSocket(url);
        
        socket.onopen = () => {
          if (token) {
            socket.send(JSON.stringify({ type: 'auth', token }));
          }
          resolve(socket);
        };
        
        socket.onerror = (error) => {
          reject(error);
        };
        
        // Store socket reference for later use
        (window as any).testWebSocket = socket;
      });
    }, { url, token });
  }

  async sendWebSocketMessage(message: any) {
    return await this.page.evaluate((message) => {
      const socket = (window as any).testWebSocket;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        return true;
      }
      return false;
    }, message);
  }

  async waitForWebSocketMessage(predicate: (message: any) => boolean, timeout = 5000) {
    return await this.page.evaluate(
      ({ predicate, timeout }) => {
        return new Promise((resolve, reject) => {
          const socket = (window as any).testWebSocket;
          if (!socket) {
            reject(new Error('WebSocket not connected'));
            return;
          }

          const timer = setTimeout(() => {
            reject(new Error('WebSocket message timeout'));
          }, timeout);

          const messageHandler = (event: MessageEvent) => {
            try {
              const message = JSON.parse(event.data);
              if (predicate(message)) {
                clearTimeout(timer);
                socket.removeEventListener('message', messageHandler);
                resolve(message);
              }
            } catch (error) {
              // Ignore parse errors
            }
          };

          socket.addEventListener('message', messageHandler);
        });
      },
      { predicate: predicate.toString(), timeout }
    );
  }

  async closeWebSocket() {
    return await this.page.evaluate(() => {
      const socket = (window as any).testWebSocket;
      if (socket) {
        socket.close();
        delete (window as any).testWebSocket;
        return true;
      }
      return false;
    });
  }
}

export class DatabaseHelper {
  /**
   * Execute database queries for test data setup/cleanup
   */
  static async cleanupTestData() {
    // This would connect to your test database and clean up test data
    // Implementation depends on your database setup
    console.log('Cleaning up test data...');
  }

  static async seedTestData() {
    // This would populate your test database with required test data
    console.log('Seeding test data...');
  }

  static async resetUserData(email: string) {
    // Reset specific user data for testing
    console.log(`Resetting data for user: ${email}`);
  }
}

export class FileHelper {
  /**
   * Create test files for upload testing
   */
  static createTestImage(width = 100, height = 100): Buffer {
    // Create a simple test image (you'd use a proper image library in real implementation)
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Draw a simple pattern
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, width/2, height/2);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(width/2, 0, width/2, height/2);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(0, height/2, width/2, height/2);
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(width/2, height/2, width/2, height/2);
    
    return Buffer.from(canvas.toDataURL().split(',')[1], 'base64');
  }

  static createTestDocument(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
  }

  static getTestFilePath(filename: string): string {
    return `test-data/${filename}`;
  }
}

export class NetworkHelper {
  constructor(private page: Page) {}

  async interceptNetworkRequests(urlPattern: string, mockResponse?: any) {
    await this.page.route(urlPattern, async (route) => {
      if (mockResponse) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockResponse),
        });
      } else {
        await route.continue();
      }
    });
  }

  async simulateNetworkError(urlPattern: string) {
    await this.page.route(urlPattern, async (route) => {
      await route.abort('failed');
    });
  }

  async logNetworkRequests() {
    this.page.on('request', request => {
      console.log(`→ ${request.method()} ${request.url()}`);
    });
    
    this.page.on('response', response => {
      console.log(`← ${response.status()} ${response.url()}`);
    });
  }
}

export class PerformanceHelper {
  constructor(private page: Page) {}

  async measurePageLoadTime(): Promise<number> {
    const performanceMetrics = await this.page.evaluate(() => {
      const perfTiming = performance.timing;
      return {
        loadTime: perfTiming.loadEventEnd - perfTiming.navigationStart,
        domReadyTime: perfTiming.domContentLoadedEventEnd - perfTiming.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      };
    });
    
    console.log('Performance metrics:', performanceMetrics);
    return performanceMetrics.loadTime;
  }

  async measureMemoryUsage() {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        };
      }
      return null;
    });
  }
}

export class LocalStorageHelper {
  constructor(private page: Page) {}

  async setItem(key: string, value: string) {
    await this.page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key, value }
    );
  }

  async getItem(key: string): Promise<string | null> {
    return await this.page.evaluate(
      (key) => localStorage.getItem(key),
      key
    );
  }

  async clear() {
    await this.page.evaluate(() => localStorage.clear());
  }

  async removeItem(key: string) {
    await this.page.evaluate(
      (key) => localStorage.removeItem(key),
      key
    );
  }
}

export class CookieHelper {
  constructor(private page: Page) {}

  async setCookie(name: string, value: string, options?: any) {
    await this.page.context().addCookies([{
      name,
      value,
      domain: 'localhost',
      path: '/',
      ...options,
    }]);
  }

  async getCookie(name: string) {
    const cookies = await this.page.context().cookies();
    return cookies.find(cookie => cookie.name === name);
  }

  async clearCookies() {
    await this.page.context().clearCookies();
  }
}