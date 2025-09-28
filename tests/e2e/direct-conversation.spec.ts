import { expect, test } from './fixtures/test-fixtures';

/**
 * Direct Conversation API tests
 * Validates creation idempotency, validation errors and auth enforcement.
 */

test.describe('Direct Conversations', () => {
  test('should create a direct conversation (201) then return existing on repeat (200)', async ({ page, authenticatedUser }) => {
    // Create a second user to converse with
    const otherEmail = `other_${Date.now()}@example.com`;
    const otherPassword = 'password123';
    const registerResp = await page.request.post('http://localhost:3000/api/auth/register', {
      data: { username: `other_${Date.now()}`, email: otherEmail, password: otherPassword }
    });
    // 201 or 409 ok (already exists if test re-run)
    expect([201,409]).toContain(registerResp.status());

    const loginResp = await page.request.post('http://localhost:3000/api/auth/login', { data: { email: otherEmail, password: otherPassword } });
    expect(loginResp.status()).toBe(200);
    const otherData = await loginResp.json();
    const otherUserId = otherData.user?.id || otherData.user?._id || otherData.user?.userId;
    expect(otherUserId).toBeTruthy();

    // First creation
    const createResp = await page.request.post('http://localhost:3000/api/messages/conversations/direct', {
      data: { participantId: otherUserId },
      headers: { Authorization: `Bearer ${authenticatedUser.token}` }
    });
    expect([200,201]).toContain(createResp.status());
    const firstConv = await createResp.json();
    expect(firstConv.type).toBe('direct');
    expect(firstConv.participants.length).toBe(2);

    // Second attempt should return same conversation (status 200 typically)
    const repeatResp = await page.request.post('http://localhost:3000/api/messages/conversations/direct', {
      data: { participantId: otherUserId },
      headers: { Authorization: `Bearer ${authenticatedUser.token}` }
    });
    expect([200,201]).toContain(repeatResp.status());
    const secondConv = await repeatResp.json();
    expect(secondConv._id).toBe(firstConv._id);
  });

  test('should reject missing participantId (400)', async ({ page, authenticatedUser }) => {
    const resp = await page.request.post('http://localhost:3000/api/messages/conversations/direct', {
      data: { },
      headers: { Authorization: `Bearer ${authenticatedUser.token}` }
    });
    expect(resp.status()).toBe(400);
  });

  test('should reject conversation with self (400)', async ({ page, authenticatedUser }) => {
    // Decode JWT to extract actual user id so backend self-check triggers
    const decode = (jwt: string) => {
      const parts = jwt.split('.');
      if (parts.length < 2) throw new Error('Invalid JWT format');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return payload;
    };
    const payload = decode(authenticatedUser.token);
    const possibleUserId = payload.userId || payload.id || payload.sub; // accommodate different token shapes
    expect(possibleUserId).toBeTruthy();

    const selfResp = await page.request.post('http://localhost:3000/api/messages/conversations/direct', {
      data: { participantId: possibleUserId },
      headers: { Authorization: `Bearer ${authenticatedUser.token}` }
    });
    // Must be rejected (400). If somehow 200/201 it's a logic bug that should surface
    expect(selfResp.status(), `Expected 400 when creating conversation with self userId=${possibleUserId}, got ${selfResp.status()}`).toBe(400);
  });

  test('should enforce auth (401)', async ({ page }) => {
    const resp = await page.request.post('http://localhost:3000/api/messages/conversations/direct', {
      data: { participantId: 'some-user' }
    });
    expect(resp.status()).toBe(401);
  });
});
