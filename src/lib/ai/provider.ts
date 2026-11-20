/**
 * One way to call a language model, whichever provider runs it.
 *
 * - Anthropic: set ANTHROPIC_API_KEY (and optionally ASSISTANT_MODEL).
 * - Any OpenAI-compatible server, which covers open-source models: set AI_BASE_URL and AI_MODEL, and AI_API_KEY
 *   when the server needs one. Examples: Ollama (http://localhost:11434/v1, model qwen3:14b or llama3.3),
 *   vLLM or LM Studio on your own machine, or hosted open models from Mistral, Groq or Together.
 *
 * AI_PROVIDER=openai or anthropic picks one when both are configured. The model never reaches the database
 * directly: it can only call the tools the caller defines, and every figure comes back from those tools.
 */
export type AiTool = { name: string; description: string; input_schema: Record<string, unknown> };
export type AiToolCall = { id: string; name: string; input: Record<string, unknown> };
export type AiTurn =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; toolCalls?: AiToolCall[] }
  | { role: "tool"; results: { id: string; content: string }[] };
export type AiReply = { ok: true; text: string; toolCalls: AiToolCall[] } | { ok: false; status: number };

export type AiConfig = { provider: "anthropic" | "openai"; model: string; baseUrl: string; key: string | null };

export function aiConfig(): AiConfig | null {
  const want = process.env.AI_PROVIDER;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openBase = process.env.AI_BASE_URL;
  if ((want === "openai" || (!anthropicKey && want !== "anthropic")) && openBase && process.env.AI_MODEL) {
    return { provider: "openai", model: process.env.AI_MODEL, baseUrl: openBase.replace(/\/$/, ""), key: process.env.AI_API_KEY || null };
  }
  if (anthropicKey) return { provider: "anthropic", model: process.env.ASSISTANT_MODEL ?? "claude-haiku-5-5", baseUrl: "https://api.anthropic.com/v1", key: anthropicKey };
  return null;
}

function toAnthropic(turns: AiTurn[]) {
  return turns.map((t) => {
    if (t.role === "user") return { role: "user", content: t.text };
    if (t.role === "tool") return { role: "user", content: t.results.map((r) => ({ type: "tool_result", tool_use_id: r.id, content: r.content })) };
    const blocks: unknown[] = [];
    if (t.text) blocks.push({ type: "text", text: t.text });
    for (const c of t.toolCalls ?? []) blocks.push({ type: "tool_use", id: c.id, name: c.name, input: c.input });
    return { role: "assistant", content: blocks.length ? blocks : t.text };
  });
}

function toOpenAi(system: string, turns: AiTurn[]) {
  const out: unknown[] = [{ role: "system", content: system }];
  for (const t of turns) {
    if (t.role === "user") out.push({ role: "user", content: t.text });
    else if (t.role === "tool") for (const r of t.results) out.push({ role: "tool", tool_call_id: r.id, content: r.content });
    else out.push({ role: "assistant", content: t.text || null, ...(t.toolCalls?.length ? { tool_calls: t.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.input) } })) } : {}) });
  }
  return out;
}

export async function aiChat({ system, turns, tools = [], maxTokens = 900, config = aiConfig(), fetchFn = fetch }: { system: string; turns: AiTurn[]; tools?: AiTool[]; maxTokens?: number; config?: AiConfig | null; fetchFn?: typeof fetch }): Promise<AiReply> {
  if (!config) return { ok: false, status: 0 };
  try {
    if (config.provider === "anthropic") {
      const res = await fetchFn(`${config.baseUrl}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": config.key!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: config.model, max_tokens: maxTokens, system, ...(tools.length ? { tools } : {}), messages: toAnthropic(turns) }),
      });
      if (!res.ok) return { ok: false, status: res.status };
      const body = (await res.json()) as { content: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[] };
      return { ok: true, text: body.content.filter((c) => c.type === "text").map((c) => c.text).join("\n").trim(), toolCalls: body.content.filter((c) => c.type === "tool_use").map((c) => ({ id: c.id!, name: c.name!, input: c.input ?? {} })) };
    }
    const res = await fetchFn(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(config.key ? { authorization: `Bearer ${config.key}` } : {}) },
      body: JSON.stringify({ model: config.model, max_tokens: maxTokens, temperature: 0.2, messages: toOpenAi(system, turns), ...(tools.length ? { tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } })), tool_choice: "auto" } : {}) }),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const body = (await res.json()) as { choices: { message: { content: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[] };
    const msg = body.choices?.[0]?.message;
    if (!msg) return { ok: false, status: 502 };
    const toolCalls = (msg.tool_calls ?? []).map((c, i) => {
      let input: Record<string, unknown> = {};
      try { input = JSON.parse(c.function.arguments || "{}"); } catch { /* A model that sends broken arguments gets an empty input. */ }
      return { id: c.id || `call_${i}`, name: c.function.name, input };
    });
    return { ok: true, text: (msg.content ?? "").trim(), toolCalls };
  } catch {
    return { ok: false, status: 503 };
  }
}
