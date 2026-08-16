const http = require('http');

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    console.log(`[Mock LLM] ${req.method} ${req.url}`);
    try {
      const parsed = JSON.parse(body);
      console.log('[Mock LLM] Received messages:', JSON.stringify(parsed.messages, null, 2));
    } catch {}

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Hello! Here is an example schema for a blog collection in Solarch:\n\n```json\n{\n  "name": "posts",\n  "type": "base",\n  "fields": [\n    { "name": "title", "type": "text", "required": true },\n    { "name": "content", "type": "editor" },\n    { "name": "tags", "type": "json" }\n  ]\n}\n```\n\nYou can create this via the Collections page or API.'
          }
        }
      ]
    }));
  });
});

server.listen(11435, '127.0.0.1', () => {
  console.log('Mock LLM server listening on http://127.0.0.1:11435');
});
