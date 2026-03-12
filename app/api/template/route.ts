import { NextResponse } from "next/server";
import type { ClientProfile } from "@/lib/template-schema";
// Using raw fetch instead of SDK to avoid env var precedence issues

const SYSTEM_PROMPT = `You are an AI integration consultant who creates comprehensive AI rollout master plans for companies adopting Claude Enterprise.

You will receive a client profile and must generate a complete AI Integration Master Plan document in Markdown format.

The plan MUST follow this exact structure (adapted from a proven template used for manufacturing companies):

# AI Integration Master Plan — {Company Name}
## Version 1.0 | {Date}

### Executive Summary
- Company overview and AI adoption goals
- Total use cases identified
- Phased timeline overview

### Company Profile
- Industry, size, current tech stack
- ERP/systems landscape
- Current AI usage (if any)

### Architecture Recommendations
- Number of recommended Claude Projects (functional, not department-level)
- Why functional grouping > department grouping
- Skills strategy (workspace-level, referenced in project instructions)
- Productization path (internal pilot → API agents)

### 4-Tier Phased Rollout
For each tier:
- **Tier 1: Quick Wins** (Week 1-4): Use cases needing only Project instructions + knowledge files
- **Tier 2: Cowork Skills** (Month 2-3): Use cases needing Cowork desktop with file generation skills
- **Tier 3: System Integration** (Month 3-6): Use cases needing API/MCP connectors to existing systems
- **Tier 4: Advanced AI** (Month 6+): Use cases needing external AI tools, custom ML, or complex integrations

### Department Use Case Mapping
For each department, create a table:
| # | Use Case | Tier | Skill/Approach | Notes |

Be specific and realistic. Include 4-12 use cases per department based on industry patterns.

### Recommended Projects
Table of functional project groupings (aim for 12-20 projects):
| # | Project Name | Department | Key Use Cases | Tier | Core Skills |

### Custom Skills to Build
Table of skills that need custom development:
| # | Skill Name | Input | Output | Dependency |

### Critical Dependencies & Blockers
Numbered list of honest blockers and risks with recommendations.

### Implementation Budget Considerations
High-level guidance on licensing, development effort, and timeline.

### Next Steps
Concrete action items for getting started.

IMPORTANT RULES:
- Be specific to the client's industry, not generic
- Generate realistic, actionable use cases (not vague AI-washing)
- Be honest about limitations and blockers
- Use the exact tier system (T1-T4) consistently
- Include skill references where Claude's existing skills apply (sales:draft-outreach, marketing:seo-audit, operations:vendor-management, pptx, xlsx, docx, pdf, etc.)
- Flag anything that needs custom ERP/system integration honestly
- Keep the document professional and suitable for executive review`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body: { client: ClientProfile } = await request.json();
  const c = body.client;

  if (!c.companyName || !c.industry || c.departments.length === 0) {
    return NextResponse.json(
      { error: "Company name, industry, and at least one department are required." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Generate a complete AI Integration Master Plan for:

Company: ${c.companyName}
Industry: ${c.industry}
Employees: ${c.employeeCount || "Not specified"}
Current ERP/Systems: ${c.erp || "Not specified"}
Departments: ${c.departments.join(", ")}
Key Pain Points: ${c.painPoints || "General efficiency improvements"}
Budget Level: ${c.budget || "Not specified"}
Desired Timeline: ${c.timeline || "6 months"}
Existing AI Usage: ${c.existingAI || "None"}
Claude Plan: ${c.claudePlan || "Enterprise"}

Generate the full master plan document in Markdown.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: errBody }, { status: res.status });
    }

    const data = await res.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
    if (!textBlock) {
      return NextResponse.json({ error: "No text response" }, { status: 500 });
    }

    return NextResponse.json({ markdown: textBlock.text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Template error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
