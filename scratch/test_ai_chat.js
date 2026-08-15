async function test() {
  const loginRes = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin', password: 'admin123456' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const settingsRes = await fetch('http://127.0.0.1:8090/api/settings', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const settingsData = await settingsRes.json();
  console.log('Current AI Settings:', settingsData.ai);

  console.log('\n--- Sending /api/ai/chat request with messages array ---');
  const chatRes = await fetch('http://127.0.0.1:8090/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Generate a blog collection with tags and author' }
      ]
    }),
  });
  console.log('HTTP Status:', chatRes.status);
  const chatData = await chatRes.json();
  console.log('Chat Response:', JSON.stringify(chatData, null, 2));
}

test().catch(console.error);
