import { createHash, timingSafeEqual } from 'node:crypto';

const AGENTS = ['Aria', 'Alex', 'Astyria', 'Aurelius'];
const digest = (text) => createHash('sha256').update(text).digest();

export function gptActionsSchema(origin) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('GPT_ACTIONS_PUBLIC_URL must be an HTTPS origin without a path.');
  }
  if (/^ais-(dev|pre)-.*\.run\.app$/i.test(url.hostname)) {
    throw new Error('AI Studio preview URLs require browser cookies. Use a deployed public HTTPS origin.');
  }
  const result = (properties) => ({
    description: 'JSON response',
    content: { 'application/json': { schema: { type: 'object', properties } } },
  });
  const errors = Object.fromEntries([400, 401, 429, 502, 503, 504].map((code) => [String(code), result({ error: { type: 'string' } })]));
  return {
    openapi: '3.1.0',
    info: { title: 'BastillaOS agents', version: '1.0.0', description: 'Consult BastillaOS AI agents for analysis, planning and code suggestions.' },
    servers: [{ url: url.origin }],
    security: [{ bearerAuth: [] }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } }, schemas: {} },
    paths: {
      '/api/gpt-actions/status': { get: {
        operationId: 'getBastillaAIStatus', summary: 'Check configured AI providers; this is not an inference health test.',
        responses: { '200': result({ configured: { type: 'boolean' }, providers: { type: 'array', items: { type: 'string' } }, agents: { type: 'array', items: { type: 'string' } } }), ...errors },
      } },
      '/api/gpt-actions/message': { post: {
        operationId: 'askBastillaAgent', summary: 'Ask Aria or another BastillaOS agent for analysis or proposed code.',
        description: 'Stateless consultation. Supply necessary context in message. Does not run commands, change files or grant access to the host.',
        'x-openai-isConsequential': false,
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', additionalProperties: false, required: ['message'], properties: {
            agent: { type: 'string', enum: AGENTS, default: 'Aria' },
            message: { type: 'string', minLength: 1, maxLength: 12000 },
          },
        } } } },
        responses: { '200': result({ success: { type: 'boolean' }, agent: { type: 'string' }, reply: { type: 'string' }, engine: { type: 'string' }, truncated: { type: 'boolean' } }), ...errors },
      } },
    },
  };
}

// Dependencies are injected so this API never enters the terminal/auto-execution chat path.
export function registerGptActions(app, { chat, providers, env = process.env, timeoutMs = 40000 }) {
  const token = (env.GPT_ACTIONS_TOKEN || '').trim();
  let schema;
  try { schema = gptActionsSchema((env.GPT_ACTIONS_PUBLIC_URL || '').trim()); } catch {}
  let active = 0;
  app.get('/api/gpt-actions/setup', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const current = providers();
    return res.json({
      publicUrlConfigured: Boolean(schema),
      tokenConfigured: token.length >= 32,
      providerConfigured: current.length > 0,
      publicOrigin: schema?.servers[0].url ?? null,
      schemaUrl: schema ? `${schema.servers[0].url}/api/gpt-actions/openapi.json` : null,
      providers: current,
      agents: AGENTS,
      readyForExternalTest: Boolean(schema && token.length >= 32 && current.length),
      externalConnectionVerified: false,
    });
  });
  const authorize = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (token.length < 32 || !schema) return res.status(503).json({ error: 'Configure GPT_ACTIONS_TOKEN (32+ characters) and GPT_ACTIONS_PUBLIC_URL (HTTPS origin).' });
    const supplied = req.get('authorization') || '';
    if (!timingSafeEqual(digest(supplied), digest(`Bearer ${token}`))) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'Invalid API token.' });
    }
    next();
  };
  app.get('/api/gpt-actions/openapi.json', (_req, res) => {
    if (!schema) return res.status(503).json({ error: 'Set GPT_ACTIONS_PUBLIC_URL to the public HTTPS origin.' });
    return res.json(schema);
  });
  app.get('/api/gpt-actions/status', authorize, (_req, res) => {
    const current = providers();
    return res.json({ configured: current.length > 0, providers: current, agents: AGENTS });
  });
  app.post('/api/gpt-actions/message', authorize, async (req, res) => {
    const body = req.body;
    if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some((key) => !['message', 'agent'].includes(key)) || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 12000 || !AGENTS.includes(body.agent ?? 'Aria')) {
      return res.status(400).json({ error: 'Supply message (1–12000 characters) and an optional supported agent.' });
    }
    if (!providers().length) return res.status(503).json({ error: 'No AI provider configured.' });
    if (active >= 2) return res.status(429).json({ error: 'Two requests are already running. Retry later.' });
    active++;
    const controller = new AbortController();
    let timer;
    try {
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, timeoutMs);
      });
      const agent = body.agent ?? 'Aria';
      const result = await Promise.race([chat(agent, body.message.trim(), controller.signal), deadline]);
      if (!result || typeof result.text !== 'string' || !result.text.trim()) throw new Error('empty reply');
      return res.json({ success: true, agent, reply: result.text.slice(0, 12000), engine: `${result.provider}:${result.model}`, truncated: result.text.length > 12000 });
    } catch {
      return res.status(controller.signal.aborted ? 504 : 502).json({ error: controller.signal.aborted ? 'AI request timed out. It was not retried.' : 'AI provider failed. Check server logs/configuration.' });
    } finally {
      clearTimeout(timer);
      active--;
    }
  });
}

