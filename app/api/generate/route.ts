import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DASHBOARD_JSON_SCHEMA } from "@/lib/schema";

const SYSTEM_PROMPT = `You are a document analyzer that extracts structured data from AI integration/rollout plans.

Given a document about an AI integration plan for a company, extract ALL information into the exact JSON schema provided.

Key extraction rules:
- Extract every use case mentioned, with its department, tier (t1=quick wins/easy, t2=needs tools/skills, t3=needs integration/API, t4=advanced/external), complexity, and skill mapping
- Group use cases into departments as described in the document
- Create project groupings (functional clusters of related use cases)
- Identify gaps, risks, and blockers honestly. Give each gap a stable id like "gap-1", "gap-2", etc.
- Identify custom skills that need to be built
- Create epics for a kanban board (group related implementation work)
- For epics, assign initial columns: most go to "backlog", active work to "progress", blocked items to "blocked"
- companyShort should be 1-2 words suitable for a sidebar header
- architectureRec can contain <strong> tags for emphasis
- gap descriptions can contain <strong> tags for emphasis

Return ONLY valid JSON matching the schema. No markdown, no code fences, no explanation.`;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured in .env.local" },
      { status: 500 }
    );
  }

  let body: { text: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.text || body.text.trim().length < 50) {
    return NextResponse.json(
      { error: "Document text too short. Provide at least 50 characters." },
      { status: 400 }
    );
  }

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: `Analyze this document and extract structured data matching this JSON schema:\n\n${JSON.stringify(DASHBOARD_JSON_SCHEMA, null, 2)}\n\n--- DOCUMENT START ---\n${body.text}\n--- DOCUMENT END ---\n\nReturn ONLY the JSON object.`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    let jsonText = textBlock.text.trim();
    // Strip markdown code fences if present
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const data = JSON.parse(jsonText);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("authentication") || message.includes("api_key")) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    if (message.includes("rate_limit")) {
      return NextResponse.json(
        { error: "Rate limited. Try again in a moment." },
        { status: 429 }
      );
    }
    console.error("Generate error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
