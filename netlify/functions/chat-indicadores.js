// Netlify Function: chat-indicadores
// Recibe pregunta + datos de indicadores, llama a Claude API, devuelve respuesta

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key no configurada' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido' }) };
  }

  const { pregunta, contexto } = body;
  if (!pregunta) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Pregunta requerida' }) };
  }

  const systemPrompt = `Eres un asistente operativo de la empresa de transporte CROSSLOG.
Tenés acceso a los datos históricos de viajes, unidades, clientes y distribución.
Respondé en español, de forma concisa y orientada a la toma de decisiones.
Cuando hagas comparaciones numéricas, sé específico con los datos disponibles.
Si no hay datos suficientes para responder con certeza, indicalo claramente.
Fecha actual: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}.

DATOS DISPONIBLES:
${contexto}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: pregunta }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[chat-indicadores] Claude error:', err);
      return { statusCode: 502, body: JSON.stringify({ error: 'Error al consultar Claude' }) };
    }

    const data = await response.json();
    const respuesta = data.content?.[0]?.text || 'Sin respuesta';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respuesta }),
    };
  } catch (err) {
    console.error('[chat-indicadores] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) };
  }
};
