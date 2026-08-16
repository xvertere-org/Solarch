// End-to-end verification of the AI chat contract fix
// Tests: login → GET /api/settings → POST /api/ai/chat with messages[] → verify reply

async function verify() {
  console.log('=== Solarch AI Chat End-to-End Verification ===\n');

  // Step 1: Login
  const loginRes = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin', password: 'admin123456' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error('FAIL: Login failed:', loginData);
    return;
  }
  const token = loginData.token;
  console.log('[1] ✅ Login: SUCCESS (token obtained)');

  // Step 2: Check settings
  const settingsRes = await fetch('http://127.0.0.1:8090/api/settings', {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const settings = await settingsRes.json();
  console.log('[2] GET /api/settings → AI config:');
  console.log('    enabled:', settings.ai?.enabled);
  console.log('    provider:', settings.ai?.provider);
  console.log('    model:', settings.ai?.model);
  console.log('    baseURL:', settings.ai?.baseURL);
  console.log('    apiKey:', settings.ai?.apiKey, '(should be masked ********)');

  if (!settings.ai?.enabled) {
    console.error('\nFAIL: AI is not enabled in settings. The DB update may not have been reloaded.');
    return;
  }
  console.log('    ✅ AI is ENABLED\n');

  // Step 3: Send POST /api/ai/chat with correct messages[] contract
  const chatPayload = {
    messages: [
      { role: 'user', content: 'Generate a blog collection with tags and author' },
    ],
  };

  console.log('[3] POST /api/ai/chat');
  console.log('    Request payload:', JSON.stringify(chatPayload, null, 4));

  const chatRes = await fetch('http://127.0.0.1:8090/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify(chatPayload),
  });

  console.log('    HTTP Status:', chatRes.status);
  const chatBody = await chatRes.json();

  if (chatRes.status === 200 && chatBody.reply) {
    console.log('    ✅ Response received successfully!');
    console.log('    Reply preview (first 300 chars):');
    console.log('    ---');
    console.log('   ', chatBody.reply.substring(0, 300));
    console.log('    ---');
    console.log('    Contains code block:', chatBody.reply.includes('```'));
    console.log('    Contains "posts":', chatBody.reply.includes('posts'));
  } else {
    console.error('    ❌ FAIL:', JSON.stringify(chatBody));
  }

  // Step 4: Test multi-turn conversation
  console.log('\n[4] POST /api/ai/chat (multi-turn with history)');
  const multiPayload = {
    messages: [
      { role: 'user', content: 'Generate a blog collection' },
      { role: 'assistant', content: 'Here is a blog collection schema...' },
      { role: 'user', content: 'Now add an author relation field' },
    ],
  };
  console.log('    Request payload:', JSON.stringify(multiPayload, null, 4));

  const multiRes = await fetch('http://127.0.0.1:8090/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify(multiPayload),
  });

  console.log('    HTTP Status:', multiRes.status);
  const multiBody = await multiRes.json();
  if (multiRes.status === 200 && multiBody.reply) {
    console.log('    ✅ Multi-turn conversation works!');
    console.log('    Reply preview:', multiBody.reply.substring(0, 200));
  } else {
    console.error('    ❌ FAIL:', JSON.stringify(multiBody));
  }

  // Step 5: Verify old broken payload STILL FAILS (confirming backend contract)
  console.log('\n[5] POST /api/ai/chat (old broken payload { message: ... })');
  const brokenPayload = { message: 'Generate a blog collection' };
  const brokenRes = await fetch('http://127.0.0.1:8090/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify(brokenPayload),
  });
  console.log('    HTTP Status:', brokenRes.status, '(should be 400)');
  const brokenBody = await brokenRes.json();
  console.log('    Response:', brokenBody.message);
  if (brokenRes.status === 400) {
    console.log('    ✅ Old broken payload correctly rejected with 400!');
  } else {
    console.error('    ❌ UNEXPECTED: Old payload did not get 400');
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
}

verify().catch(console.error);
