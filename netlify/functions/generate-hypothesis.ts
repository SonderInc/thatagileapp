/**
 * Netlify Function: generate Epic Hypothesis Statement using OpenAI Structured Outputs.
 * POST: JSON { epicName?: string | null, epicOwner?: string | null, notes?: string | null }
 * Returns: hypothesis object (funnelEntryDate forced to today MM/DD/YYYY, elevatorPitch, businessOutcomes, etc.)
 * Requires: OPENAI_API_KEY (server-side env).
 */

interface HandlerEvent {
  httpMethod: string;
  body: string | null;
  headers?: Record<string, string | undefined>;
}

interface RequestBody {
  epicName?: string | null;
  epicOwner?: string | null;
  notes?: string | null;
}

const HYPOTHESIS_JSON_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    funnelEntryDate: { type: 'string' },
    epicName: { type: 'string' },
    epicOwner: { type: 'string' },
    hypothesisStatement: { type: 'string' },
    elevatorPitch: {
      type: 'object' as const,
      additionalProperties: false,
      properties: {
        forCustomers: { type: 'string' },
        who: { type: 'string' },
        theSolution: { type: 'string' },
        isA: { type: 'string' },
        thatProvidesValue: { type: 'string' },
        unlike: { type: 'string' },
        ourSolution: { type: 'string' },
      },
      required: ['forCustomers', 'who', 'theSolution', 'isA', 'thatProvidesValue', 'unlike', 'ourSolution'],
    },
    businessOutcomes: {
      type: 'array' as const,
      items: { type: 'string' },
      minItems: 3,
      maxItems: 8,
    },
  },
  required: ['funnelEntryDate', 'epicName', 'epicOwner', 'hypothesisStatement', 'elevatorPitch', 'businessOutcomes'],
};

function formatTodayMMDDYYYY(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>
): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(503, { error: 'Hypothesis generation not configured (OPENAI_API_KEY)' });
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const epicName = body.epicName?.trim() || 'AI Story Point Guide';
  const epicOwner = body.epicOwner?.trim() ?? '';
  const notes = body.notes?.trim() ?? '';

  const prompt = `You are an agile coach for thatagileapp.com. Generate a concise Epic Hypothesis Statement in SAFe/Lean-friendly language. No markdown, no fluff, no extra commentary.

Epic name (or theme): ${epicName}
${epicOwner ? `Epic owner: ${epicOwner}` : ''}
${notes ? `Context or notes:\n${notes.slice(0, 2000)}` : ''}

Return JSON that strictly matches the schema. Rules:
- elevatorPitch: Value statement. For [customers] / who [do something] / the [solution] / is a [how] / that [value] / unlike [alternative] / our solution [why better]. Each field is a short phrase only.
- businessOutcomes: 3 to 8 measurable outcomes (percentages or clear directional metrics; realistic, not hyperbolic).
- hypothesisStatement: One concise sentence summarizing the hypothesis.
- funnelEntryDate: Use today in MM/DD/YYYY format (will be overwritten server-side).
- epicName and epicOwner: Use the provided values or defaults.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'hypothesis_response',
            strict: true,
            schema: HYPOTHESIS_JSON_SCHEMA,
          },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return jsonResponse(502, { error: `LLM error: ${res.status} ${errText.slice(0, 300)}` });
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    let out: Record<string, unknown>;
    try {
      out = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return jsonResponse(502, { error: 'Invalid JSON from model' });
    }

    out.funnelEntryDate = formatTodayMMDDYYYY();
    if (Array.isArray(out.businessOutcomes)) {
      if (out.businessOutcomes.length < 3) {
        while ((out.businessOutcomes as string[]).length < 3) {
          (out.businessOutcomes as string[]).push('Measurable outcome to be defined.');
        }
      } else if ((out.businessOutcomes as string[]).length > 8) {
        out.businessOutcomes = (out.businessOutcomes as string[]).slice(0, 8);
      }
    }

    return jsonResponse(200, out);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { error: `Hypothesis generation failed: ${message}` });
  }
};
