import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { SkillDefinition } from "@/lib/skill-yaml";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body: { skill: SkillDefinition; companyContext: string } =
    await request.json();

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: `You are an expert at writing Claude skill definitions. Given a skill name and description, generate detailed instructions, input schema, output format, example inputs/outputs, and suggested knowledge files.

The skill will be used inside Claude's Cowork desktop app. Write instructions that are clear, specific, and actionable for Claude to follow.

Return ONLY valid JSON with these fields:
- instructions (string): Detailed multi-paragraph instructions for Claude
- inputFields (array): [{name, type, description, required}]
- outputFormat (string): Description of expected output
- examples (array): [{input, output}] with 2-3 realistic examples
- knowledgeFiles (array of strings): Suggested files to upload

Do NOT include the skill name, slug, category, department, or tier — those are already set.`,
      messages: [
        {
          role: "user",
          content: `Skill: "${body.skill.name}"
Description: "${body.skill.description}"
Category: ${body.skill.category}
Department: ${body.skill.department}
Tier: ${body.skill.tier}
${body.companyContext ? `\nCompany context: ${body.companyContext}` : ""}

Generate the enriched skill definition JSON.`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response" },
        { status: 500 }
      );
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const enriched = JSON.parse(jsonText);
    return NextResponse.json(enriched);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Enrich skill error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
