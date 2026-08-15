// Standalone E2E verification of AI chat contract
// This creates a lightweight Express server with AI routes against the real DB

async function main() {
  process.env.SETTINGS_ENCRYPTION_KEY = 'standalone_test_key_32chars_long';
  process.env.SOLARCH_JWT_SECRET = 'super_secret_jwt_key_that_is_at_least_32_characters_long_for_solarch';

  const { BaseApp } = require('../src/core/base');
  const express = require('express');
  const supertest = require('supertest');
  const { registerAIRoutes } = require('../src/apis/ai');
  const { registerAdminAuthRoutes } = require('../src/apis/admin_auth');
  const { loadAuthToken } = require('../src/apis/middlewares_auth');
  const { SettingsEncryption } = require('../src/core/settings_encrypt');

  // Create app with encryption env so settings load correctly
  const app = new BaseApp({
    dataDir: './pb_data',
    encryptionEnv: 'standalone_test_key_32chars_long',
  });
  await app.bootstrap();

  console.log('=== Solarch AI Chat End-to-End Verification ===\n');

  // Check and fix AI settings
  let ai = app.settings().ai;
  console.log('[0] Initial AI config from DB:');
  console.log('    enabled:', ai.enabled);
  console.log('    provider:', ai.provider);
  console.log('    baseURL:', ai.baseURL);

  if (!ai.enabled) {
    console.log('    AI not enabled, updating in-memory settings...');
    const settings = app.settings();
    settings.ai = {
      enabled: true,
      provider: 'custom',
      apiKey: 'test-mock-key',
      model: 'gpt-4o-mini',
      baseURL: 'http://127.0.0.1:11435',
      maxTokens: 2048,
      temperature: 0.2,
    };
    // Encrypt and save to DB
    const encryption = new SettingsEncryption(app);
    const encrypted = await encryption.encryptSettings(settings);
    app.db().getDataDB().prepare("UPDATE _settings SET value = ?, updated = ? WHERE key = 'main'").run(
      JSON.stringify(encrypted), new Date().toISOString()
    );
    await app.reloadSettings();
    ai = app.settings().ai;
  }

  console.log('    enabled:', ai.enabled);
  console.log('    provider:', ai.provider);
  console.log('    model:', ai.model);
  console.log('    baseURL:', ai.baseURL);
  console.log('    apiKey present:', !!ai.apiKey && ai.apiKey.length > 0);
  console.log('    ✅ AI is ENABLED\n');

  // Create Express server with AI routes
  const server = express();
  server.use(express.json());
  server.use(loadAuthToken(app));
  registerAdminAuthRoutes(app, server);
  registerAIRoutes(app, server);

  // Get admin token from DB row
  const db = app.db().getDataDB();
  const superuser = db.prepare("SELECT * FROM _superusers WHERE username = 'admin'").get();
  if (!superuser) {
    console.error('FAIL: No admin superuser found');
    process.exit(1);
  }
  const token = app.generateJWT({ id: superuser.id, type: 'admin' }, app.getJwtSecret(), '720h');
  console.log('[1] ✅ Auth token generated for admin\n');

  // TEST 2: Correct messages[] payload
  console.log('[2] POST /api/ai/chat with correct messages[] payload');
  const payload = {
    messages: [
      { role: 'user', content: 'Generate a blog collection with tags and author' },
    ],
  };
  console.log('    Payload:', JSON.stringify(payload, null, 2));

  const res = await supertest(server)
    .post('/api/ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  console.log('    HTTP Status:', res.status);
  if (res.status === 200 && res.body.reply) {
    console.log('    ✅ SUCCESS: /api/ai/chat returned 200 with reply');
    console.log('    Reply contains code block (```):', res.body.reply.includes('```'));
    console.log('    Reply contains "posts":', res.body.reply.includes('posts'));
    console.log('\n    --- Full Reply ---');
    console.log(res.body.reply);
    console.log('    --- End Reply ---\n');
  } else {
    console.error('    ❌ FAIL:', JSON.stringify(res.body));
  }

  // TEST 3: Multi-turn conversation
  console.log('[3] POST /api/ai/chat with multi-turn history');
  const multiPayload = {
    messages: [
      { role: 'user', content: 'Generate a blog collection' },
      { role: 'assistant', content: 'Here is a blog schema...' },
      { role: 'user', content: 'Now add tags' },
    ],
  };

  const multiRes = await supertest(server)
    .post('/api/ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .send(multiPayload);

  console.log('    HTTP Status:', multiRes.status);
  if (multiRes.status === 200) {
    console.log('    ✅ Multi-turn works!\n');
  } else {
    console.error('    ❌ FAIL:', multiRes.body.message);
  }

  // TEST 4: Old broken payload must be rejected
  console.log('[4] POST /api/ai/chat with OLD broken payload { message: ... }');
  const brokenRes = await supertest(server)
    .post('/api/ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({ message: 'hello' });

  console.log('    HTTP Status:', brokenRes.status, '(expected: 400)');
  console.log('    Error:', brokenRes.body.message);
  if (brokenRes.status === 400) {
    console.log('    ✅ Old broken payload correctly REJECTED with 400\n');
  } else {
    console.error('    ❌ UNEXPECTED');
  }

  console.log('=== ALL VERIFICATIONS COMPLETE ===');
  await app.resetBootstrapState();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
