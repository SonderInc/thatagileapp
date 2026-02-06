/**
 * Netlify Function: suggest execution order for tasks (or user stories) using an LLM.
 * POST: JSON { storyDescription?: string, tasks: { id: string, title: string, description?: string }[] }
 *       or for features: { featureDescription?: string, stories: { id: string, title: string, description?: string }[] }
 * Returns: { orderedIds: string[] }
 * Requires: OPENAI_API_KEY (server-side env).
 */

interface HandlerEvent {
  httpMethod: string;
  body: string | null;
  headers?: Record<string, string | undefined>;
}

interface TaskInput {
  id: string;
  title: string;
  description?: string;
}

interface RequestBody {
  storyDescription?: string;
  featureDescription?: string;
  tasks?: TaskInput[];
  stories?: TaskInput[];
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
    return jsonResponse(503, { error: 'Sequence suggestion not configured (OPENAI_API_KEY)' });
  }

  let body: RequestBody;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const tasks = body.tasks ?? body.stories ?? [];
  const contextDesc = body.storyDescription ?? body.featureDescription ?? '';
  const itemLabel = body.stories ? 'user story' : 'task';

  if (tasks.length < 2) {
    return jsonResponse(200, { orderedIds: tasks.map((t) => t.id) });
  }

  const list = tasks
    .map(
      (t) =>
        `- id: ${t.id}, title: ${t.title}${t.description ? `, description: ${t.description.slice(0, 200)}` : ''}`
    )
    .join('\n');

  const prompt = `You are an agile coach. Given the following ${itemLabel} context and list of ${itemLabel}s, suggest the best execution order (e.g. dependencies, logical flow). Reply with ONLY a JSON array of the ${itemLabel} ids in order, no other text. Example: ["id1","id2","id3"]

Context: ${contextDesc.slice(0, 1500)}

${itemLabel}s:
${list}

JSON array of ids in suggested order:`;

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
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return jsonResponse(502, { error: `LLM error: ${res.status} ${errText.slice(0, 200)}` });
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    const idsFromLlm = content.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
    const validIds = new Set(tasks.map((t) => t.id));
    const orderedIds = idsFromLlm.filter((id) => validIds.has(id));
    const appended = tasks.map((t) => t.id).filter((id) => !orderedIds.includes(id));
    const result = [...orderedIds, ...appended];

    return jsonResponse(200, { orderedIds: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { error: `Sequence suggestion failed: ${message}` });
  }
};
