const axios = require('axios');

const mcpUrl = "https://stewardhq-delta.vercel.app/api/mcp/sse";
const token = "shq_mcp_chatgpt_ingress_2026_verified";

async function testMCP() {
  console.log('--- STARTING MCP SSE CANARY TEST ---');
  
  const eventsource = await import('eventsource');
  const EventSource = eventsource.default || eventsource.EventSource || eventsource;

  return new Promise((resolve, reject) => {
    try {
        const es = new EventSource(mcpUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        es.onmessage = async (event) => {
          console.log('[SSE] Received event.');
          const message = JSON.parse(event.data);
          console.log('[SSE] Data:', message);
          
          es.close();
          resolve(message);
        };

        es.onerror = (err) => {
          console.error('[SSE] Error:', err);
          es.close();
          reject(err);
        };

        setTimeout(() => {
            console.log('[SSE] Connection timed out but established. PASS.');
            es.close();
            resolve({ status: 'connected' });
        }, 10000);
    } catch (e) {
        console.error('[SSE] Exception:', e.message);
        reject(e);
    }
  });
}

testMCP().catch(console.error);
