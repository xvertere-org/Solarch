async function configure() {
  const loginRes = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin', password: 'admin123456' }),
  });
  const loginData = await loginRes.json();
  console.log('Login result:', loginData.token ? 'Success' : loginData);

  const token = loginData.token;

  const patchRes = await fetch('http://127.0.0.1:8090/api/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      ai: {
        enabled: true,
        provider: 'custom',
        apiKey: 'test-mock-key',
        model: 'gpt-4o-mini',
        baseURL: 'http://127.0.0.1:11435',
        maxTokens: 2048,
        temperature: 0.2,
      },
    }),
  });
  const patchData = await patchRes.json();
  console.log('Settings updated:', patchData.ai);
}

configure().catch(console.error);
