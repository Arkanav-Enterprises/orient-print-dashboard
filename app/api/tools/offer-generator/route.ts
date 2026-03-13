import { NextResponse } from "next/server";
import { parseClaudeOutput, generateOfferPdf } from "@/lib/offer-generator";
import JSZip from "jszip";

// Extract plain text from a .docx file buffer
async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) throw new Error("Could not read document.xml from .docx");
  return docXml
    .replace(/<w:br[^>]*\/>/gi, "\n")
    .replace(/<w:p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(request: Request) {
  try {
    let text: string;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      if (file.name.endsWith(".docx")) {
        const buf = await file.arrayBuffer();
        text = await extractTextFromDocx(buf);
      } else if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        text = await file.text();
      } else {
        return NextResponse.json({ error: "Unsupported file type. Upload .docx or .txt" }, { status: 400 });
      }
    } else {
      // JSON body fallback
      const body = await request.json();
      text = body.text;
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "No text content found in file" }, { status: 400 });
    }

    const data = parseClaudeOutput(text);

    if (data.pricing_items.length === 0 && data.specifications.length === 0) {
      return NextResponse.json(
        { error: "Could not parse pricing or specification data. Make sure the file contains Sections A\u2013E." },
        { status: 400 }
      );
    }

    const pdfBytes = await generateOfferPdf(data);

    // Build filename
    const safeName = (data.customer_name || "Offer")
      .replace(/[[\]]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `Orient_Jet_${safeName}_${data.series.replace(/\s+/g, "_")}.pdf`;

    // Return parsed metadata as JSON headers so the client can save to offers table
    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Offer-Customer": data.customer_name || "",
        "X-Offer-Series": data.series || "",
        "X-Offer-Proforma": data.proforma_no || "",
        "X-Offer-Type": data.order_type || "",
        "X-Offer-Total": String(data.total_price || 0),
        "X-Offer-Filename": filename,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Offer generation error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
