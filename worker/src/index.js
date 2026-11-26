/* Meu Quarto 3D: links curtos de visualização.
   POST /s     corpo = quarto compactado (o mesmo texto do link longo, começando com "y")  →  {"id":"Ab3xYz"}
   GET  /s/:id →  o quarto compactado, para o site abrir
   O código vem do conteúdo (SHA-256): o mesmo quarto sempre gera o mesmo link. */
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // sem 0/O, 1/l/I, para não confundir
const MAX = 60000; // um quarto bem cheio fica bem abaixo disso
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

async function codeFor(text, len = 6) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  let s = '';
  for (let i = 0; i < len; i++) s += CHARS[h[i] % CHARS.length];
  return s;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (req.method === 'POST' && url.pathname === '/s') {
      const body = (await req.text()).trim();
      if (body.length > MAX || !/^[yx][A-Za-z0-9_-]{10,}$/.test(body)) return json({ erro: 'Esse conteúdo não é um quarto do Meu Quarto 3D.' }, 400);
      // se, por azar, o código já for de outro quarto, tenta um maior
      for (let len = 6; len <= 10; len++) {
        const id = await codeFor(body, len);
        const cur = await env.QUARTOS.get(id);
        if (cur === body) return json({ id });
        if (cur === null) {
          await env.QUARTOS.put(id, body, { metadata: { t: Date.now() } });
          return json({ id });
        }
      }
      return json({ erro: 'Não consegui criar o código. Tente de novo.' }, 500);
    }

    const m = /^\/s\/([A-Za-z0-9]{4,12})$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const v = await env.QUARTOS.get(m[1]);
      if (v === null) return json({ erro: 'Link não encontrado.' }, 404);
      return new Response(v, { headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }

    return json({ servico: 'Meu Quarto 3D · links curtos', site: 'https://ort4vi0.github.io/meu-quarto-3d/' });
  },
};
