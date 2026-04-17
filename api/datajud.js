// api/datajud.js
// Serverless function (Vercel) que proxifica chamadas ao DataJud do CNJ,
// resolvendo o problema de CORS pro navegador.
//
// Uso do cliente (HTML):
//   POST /api/datajud?tribunal=trt23
//   Body: { "query": { "match": { "numeroProcesso": "00010017020255230101" }}, "size": 1 }
//
// A chave pública do DataJud fica aqui (não precisa expor no HTML).

const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY
  || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

const BASE = 'https://api-publica.datajud.cnj.jus.br/api_publica_';

// Lista de aliases válidos pra evitar SSRF (Server-Side Request Forgery)
const TRIBUNAIS_VALIDOS = new Set([
  // TRTs 1-24
  'trt1','trt2','trt3','trt4','trt5','trt6','trt7','trt8','trt9','trt10',
  'trt11','trt12','trt13','trt14','trt15','trt16','trt17','trt18','trt19','trt20',
  'trt21','trt22','trt23','trt24',
  // TST
  'tst',
  // TRFs
  'trf1','trf2','trf3','trf4','trf5','trf6',
  // TJs (todas as UFs)
  'tjac','tjal','tjap','tjam','tjba','tjce','tjdft','tjes','tjgo','tjma',
  'tjmt','tjms','tjmg','tjpa','tjpb','tjpr','tjpe','tjpi','tjrj','tjrn',
  'tjrs','tjro','tjrr','tjsc','tjsp','tjse','tjto',
  // STJ
  'stj'
]);

export default async function handler(req, res) {
  // CORS: permite do mesmo domínio OU qualquer (pra dev local)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Pré-flight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const tribunal = (req.query.tribunal || '').toLowerCase().trim();
  if (!tribunal) {
    return res.status(400).json({ error: 'Missing ?tribunal parameter (ex: trt23)' });
  }
  if (!TRIBUNAIS_VALIDOS.has(tribunal)) {
    return res.status(400).json({ error: `Tribunal "${tribunal}" inválido` });
  }

  const targetUrl = `${BASE}${tribunal}/_search`;

  try {
    const djResp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'APIKey ' + DATAJUD_API_KEY,
      },
      body: JSON.stringify(req.body || {}),
    });

    const text = await djResp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { rawResponse: text }; }

    return res.status(djResp.status).json(data);
  } catch (err) {
    console.error('[DataJud proxy]', err);
    return res.status(502).json({
      error: 'Erro ao contactar DataJud: ' + (err.message || String(err))
    });
  }
}
