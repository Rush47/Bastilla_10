#!/usr/bin/env node
// Read-only BastillaOS API reachability diagnostics; never sends credentials to an AI Studio editor URL.
const raw = process.env.BASTILLA_PUBLIC_API_URL || process.argv[2];
if (!raw) {
  console.error('Usage: BASTILLA_PUBLIC_API_URL=https://your-deployment.example node scripts/check-bastilla-api.mjs');
  process.exit(2);
}
let origin;
try {
  const url = new URL(raw);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) {
    throw Error('HTTPS is required except for localhost');
  }
  if (url.username || url.password || url.search || url.hash) throw Error('Do not put credentials or query strings in the URL');
  if (url.hostname === 'aistudio.google.com') throw Error('AI Studio editor URL is not a deployed BastillaOS API endpoint');
  origin = url.origin;
} catch (error) {
  console.error('Invalid BastillaOS API URL:', error.message);
  process.exit(2);
}
const checks = [
  ['/api/system/metrics', d => typeof d.cpuCores === 'number'],
  ['/api/ai/status', d => typeof d.protocol === 'string'],
  ['/api/agents/background/status', d => d.monitoring === true && !!d.agents],
  ['/api/ollama/models', d => typeof d.connected === 'boolean'],
  ['/api/vm-gemini-4/status', d => !!d && typeof d === 'object'],
];
let failures = 0;
for (const [path, valid] of checks) {
  try {
    const response = await fetch(origin + path, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' }, redirect: 'error' });
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw Error('not JSON (possibly login or preview page)');
    const data = await response.json();
    if (!valid(data) || (response.status !== 200 && !(path === '/api/ollama/models' && response.status === 503 && data.connected === false))) {
      throw Error('unexpected HTTP ' + response.status + ' or invalid API response');
    }
    const extra = path === '/api/ollama/models' ? (data.connected ? 'online' : 'offline') : '';
    console.log('PASS', path, 'HTTP', response.status, extra);
  } catch (error) {
    failures++;
    console.log('FAIL', path, error.message);
  }
}
console.log(failures ? 'API connection NOT confirmed' : 'API endpoints reachable (not proof of ChatGPT integration)');
process.exitCode = failures ? 1 : 0;
