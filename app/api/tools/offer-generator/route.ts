import { NextResponse } from "next/server";
import { parseClaudeOutput, generateOfferDocx } from "@/lib/offer-generator";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const data = parseClaudeOutput(text);

    if (data.pricing_items.length === 0 && data.specifications.length === 0) {
      return NextResponse.json(
        { error: "Could not parse any pricing or specification data from the input. Make sure it contains Sections A–E." },
        { status: 400 }
      );
    }

    const buffer = await generateOfferDocx(data);

    // Build filename from customer name + series
    const safeName = (data.customer_name || "Offer")
      .replace(/[[\]]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `Orient_Jet_${safeName}_${data.series.replace(/\s+/g, "_")}.docx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Offer generation error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
