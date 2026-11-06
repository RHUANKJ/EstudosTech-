const {createServer} = require('node:http');
const {existsSync, readFileSync, readdirSync} = require('node:fs');
const {readFile} = require('node:fs/promises');
const {join} = require('node:path');

const HOST = '127.0.0.1';
const MAX_BODY = 20 * 1024 * 1024;
const MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']);

function json(res, status, data) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(data));
}

function error(res, status, message) {
  json(res, status, {error: {message}});
}

async function readPayload(req) {
  if (Number(req.headers['content-length']) > MAX_BODY) return null;
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({destroyOnReturn: false})) {
    size += chunk.length;
    if (size > MAX_BODY) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function createPosseServer({apiKey = '', callClaude = fetch} = {}) {
  const mode = apiKey ? 'ready' : 'unconfigured';
  const index = readFileSync(join(__dirname, 'index.html'), 'utf8').replace(
    '<meta charset="utf-8">',
    `<meta charset="utf-8"><meta name="posse-server" content="${mode}">`,
  );
  const biblioteca = join(__dirname, 'biblioteca-local');
  const catalogo = join(biblioteca, 'catalogo.js');
  const js = 'text/javascript; charset=utf-8';
  const assets = new Map([
    ['/editais.js', {tipo: js, dados: readFileSync(join(__dirname, 'editais.js'))}],
    ['/sw.js', {tipo: js, dados: readFileSync(join(__dirname, 'sw.js'))}],
    ['/icon.svg', {tipo: 'image/svg+xml', dados: readFileSync(join(__dirname, 'icon.svg'))}],
    ['/manifest.webmanifest', {tipo: 'application/manifest+json', dados: readFileSync(join(__dirname, 'manifest.webmanifest'))}],
    ['/biblioteca-local/catalogo.js', {tipo: js, dados: existsSync(catalogo) ? readFileSync(catalogo) : ''}],
  ]);
  const pdfs = new Map();
  if (existsSync(biblioteca)) {
    for (const item of readdirSync(biblioteca, {withFileTypes: true})) {
      if (item.isFile() && /\.pdf$/i.test(item.name)) {
        pdfs.set(`/biblioteca-local/${encodeURIComponent(item.name)}`, join(biblioteca, item.name));
      }
    }
  }
  let inFlight = false;
  let calls = [];

  const server = createServer({requestTimeout: 30_000}, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const host = `${HOST}:${server.address().port}`;
    if (req.headers.host !== host) return error(res, 403, 'Abra o Posse pelo endereço exibido no terminal.');

    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html' || assets.has(req.url))) {
      const asset = assets.get(req.url);
      res.writeHead(200, {'Content-Type': asset?.tipo ?? 'text/html; charset=utf-8'});
      return res.end(asset?.dados ?? index);
    }
    if (req.method === 'GET' && pdfs.has(req.url)) {
      try {
        const pdf = await readFile(pdfs.get(req.url));
        res.writeHead(200, {'Content-Type': 'application/pdf', 'Content-Length': pdf.length});
        return res.end(pdf);
      } catch {
        return error(res, 404, 'PDF indisponível.');
      }
    }
    if (req.url !== '/api/claude') return error(res, 404, 'Rota inexistente.');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return error(res, 405, 'Use POST para chamar a IA.');
    }
    if (req.headers.origin !== `http://${host}`) return error(res, 403, 'Origem não autorizada.');
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
      return error(res, 415, 'Envie a solicitação em JSON.');
    }
    if (!apiKey) return error(res, 503, 'Configure ANTHROPIC_API_KEY e reinicie o Posse.');
    if (inFlight) return error(res, 429, 'Já há uma análise em andamento.');

    inFlight = true;
    const cancel = new AbortController();
    const abort = () => cancel.abort();
    res.once('close', abort);
    try {
      const raw = await readPayload(req);
      if (raw === null) {
        res.setHeader('Connection', 'close');
        return error(res, 413, 'A solicitação excedeu 20 MB. Envie menos PDFs por vez.');
      }
      let input;
      try { input = JSON.parse(raw); }
      catch { return error(res, 400, 'JSON inválido.'); }
      const {model, max_tokens, system, messages, web} = input ?? {};
      if (!MODELS.has(model) || !Number.isInteger(max_tokens) || max_tokens < 1 || max_tokens > 32_000 ||
          typeof system !== 'string' || !Array.isArray(messages) || !messages.length || typeof web !== 'boolean') {
        return error(res, 400, 'Parâmetros inválidos para a IA.');
      }

      const now = Date.now();
      calls = calls.filter(time => now - time < 60_000);
      if (calls.length >= 12) {
        res.setHeader('Retry-After', Math.ceil((calls[0] + 60_000 - now) / 1000));
        return error(res, 429, 'Limite de solicitações atingido. Aguarde um minuto.');
      }
      calls.push(now);
      const body = {model, max_tokens, system, messages, output_config: {effort: 'medium'}};
      const headers = {'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2026-10-21'};
      if (model !== 'claude-haiku-5-5') {
        headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
        body.fallbacks = 'default';
      }
      if (web) body.tools = [{type: 'web_search_20260209', name: 'web_search', max_uses: 10}];
      const timeout = AbortSignal.timeout(180_000);
      const upstream = await callClaude('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers, body: JSON.stringify(body), redirect: 'error',
        signal: AbortSignal.any([timeout, cancel.signal]),
      });
      const result = await upstream.json();
      json(res, upstream.status, result);
    } catch (err) {
      if (res.destroyed) return;
      if (err.name === 'TimeoutError') return error(res, 504, 'O Claude demorou para responder. Tente novamente.');
      error(res, 502, 'Falha na comunicação com o Claude.');
    } finally {
      res.off('close', abort);
      inFlight = false;
    }
  });
  return server;
}

if (require.main === module) {
  const port = Number(process.env.POSSE_PORT || 8787);
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const server = createPosseServer({apiKey});
  server.listen(port, HOST, () => {
    console.log(`Posse em http://${HOST}:${server.address().port}`);
    if (!apiKey) console.log('Para ativar a IA, configure ANTHROPIC_API_KEY e reinicie o servidor.');
  });
}

module.exports = {createPosseServer};
