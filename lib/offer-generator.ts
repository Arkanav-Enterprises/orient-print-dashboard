/**
 * Offer Generator — parse Claude Enterprise structured output and build branded PDF.
 *
 * Uses pdf-lib to generate cover + pricing pages, then merges with template
 * PDF boilerplate pages. Matches the Python generate_branded_offer.py output.
 */

import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFImage, degrees } from "pdf-lib";

// A4 in points
const PAGE_W = 595.27;
const PAGE_H = 841.89;

const ASSETS_BASE = path.join(process.cwd(), "Offer_Generator_Project", "template_assets");

// ── Types ──────────────────────────────────────────────────────────

interface Specification {
  name: string;
  details: string[];
}

interface PricingItem {
  description: string;
  price: number;
}

interface InkPrice {
  description: string;
  price: number;
}

export interface OfferData {
  series: string;
  date: string;
  proforma_no: string;
  customer_name: string;
  customer_address: string;
  order_type: string;
  machine_description: string;
  specifications: Specification[];
  pricing_items: PricingItem[];
  pricing_note: string;
  ink_prices: InkPrice[];
  installation_terms: string;
  service_commitment: string;
  currency: string;
  total_price?: number;
}

// ── Currency formatting ────────────────────────────────────────────

function fmtINR(amount: number): string {
  if (!amount) return "";
  const s = Math.round(amount).toString();
  // Use "Rs." instead of ₹ — standard PDF fonts (WinAnsi) can't encode U+20B9
  if (s.length <= 3) return `Rs. ${s}`;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `Rs. ${parts.join(",")},${last3}`;
}

function fmtUSD(amount: number): string {
  if (!amount) return "";
  return `$ ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(amount: number, currency: string): string {
  return currency === "USD" ? fmtUSD(amount) : fmtINR(amount);
}

// ── Text parser ────────────────────────────────────────────────────

function parseAmount(s: string): number {
  if (!s) return 0;
  s = s.replace(/[₹$\s,*]/g, "");
  if (!s || s === "-") return 0;
  return s.includes(".") ? parseFloat(s) : parseInt(s, 10);
}

export function parseClaudeOutput(text: string): OfferData {
  const data: OfferData = {
    series: "C SERIES",
    date: "",
    proforma_no: "",
    customer_name: "[Customer Name]",
    customer_address: "[Address]",
    order_type: "DOMESTIC",
    machine_description: "",
    specifications: [],
    pricing_items: [],
    pricing_note: "",
    ink_prices: [],
    installation_terms: "",
    service_commitment: "",
    currency: "INR",
  };

  // Section A: Cover
  const coverRe = /SECTION\s*A[\s\S]*?```\s*([\s\S]*?)```/i;
  const coverBlock = text.match(coverRe);
  if (coverBlock) {
    const b = coverBlock[1];
    const m = (k: string) => {
      const r = b.match(new RegExp(`${k}\\s*:\\s*(.+)`, "i"));
      return r ? r[1].trim() : "";
    };
    data.series = m("SERIES") || data.series;
    data.date = m("DATE");
    data.proforma_no = m("PROFORMA_NO");
    data.customer_name = m("CUSTOMER_NAME") || data.customer_name;
    data.customer_address = m("CUSTOMER_ADDRESS") || data.customer_address;
    data.order_type = m("ORDER_TYPE") || data.order_type;
  } else {
    // Fallback: try without code fences
    const m = (k: string) => {
      const r = text.match(new RegExp(`${k}\\s*:\\s*(.+)`, "i"));
      return r ? r[1].trim() : "";
    };
    data.series = m("SERIES") || data.series;
    data.date = m("DATE") || data.date;
    data.proforma_no = m("PROFORMA_NO") || data.proforma_no;
    data.customer_name = m("CUSTOMER_NAME") || data.customer_name;
    data.customer_address = m("CUSTOMER_ADDRESS") || data.customer_address;
    data.order_type = m("ORDER_TYPE") || data.order_type;
  }
  data.currency = data.order_type.toUpperCase().includes("INTERNATIONAL") ? "USD" : "INR";

  // Section B: Machine Spec
  const descMatch = text.match(/MACHINE_DESCRIPTION\s*:\s*"?([^"\n]+)"?/i);
  if (descMatch) data.machine_description = descMatch[1].trim();

  const sectionB = text.match(/SECTION\s*B[\s\S]*?(?=SECTION\s*C|$)/i);
  if (sectionB) {
    const rows = [...sectionB[0].matchAll(/\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/g)];
    for (const [, name, details] of rows) {
      const n = name.trim();
      if (n.toLowerCase() === "component" || n.match(/^-+$/)) continue;
      data.specifications.push({
        name: n,
        details: details
          .trim()
          .split(";")
          .map((d: string) => d.trim())
          .filter(Boolean),
      });
    }
  }

  // Section C: Pricing
  const sectionC = text.match(/SECTION\s*C[\s\S]*?(?=SECTION\s*D|$)/i);
  if (sectionC) {
    const c = sectionC[0];
    const rows = [...c.matchAll(/\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/g)];
    for (const [, sr, desc, , amt] of rows) {
      const d = desc.trim().replace(/\*\*/g, "");
      const a = amt.trim().replace(/\*\*/g, "");
      if (d.toLowerCase().includes("particulars") || sr.trim().match(/^-+$/) || d.match(/^-+$/)) continue;
      if (d.toLowerCase().includes("subtotal")) continue;
      if (d.toUpperCase().includes("TOTAL OFFER PRICE")) {
        data.total_price = parseAmount(a);
        continue;
      }
      const price = parseAmount(a);
      if (price > 0) data.pricing_items.push({ description: d, price });
    }

    // Pricing note
    const noteMatch = c.match(/Pricing\s*Note\s*:\s*\*{0,2}\s*(.*?)\s*\*{0,2}\s*(?:\n|$)/i);
    if (noteMatch) data.pricing_note = noteMatch[1].trim().replace(/^\*/, "").trim();

    // Ink pricing
    const inkPatterns: [RegExp, string][] = [
      [/Uncoated\s+Media\s+per\s+ltr\s+for\s+Black\s*:?\s*([₹$]\s*[\d,]+)/i, "Uncoated Media per ltr for Black"],
      [/Uncoated\s+Media\s+per\s+ltr\s+for\s+Cyan.*?Yellow\s*:?\s*([₹$]\s*[\d,]+)/i, "Uncoated Media per ltr for Cyan, Magenta, Yellow"],
      [/Coated\s+Media\s+HD\s+Ink\s+per\s+ltr\s*:?\s*([₹$]\s*[\d,]+)/i, "Coated Media HD Ink per ltr"],
    ];
    for (const [pat, desc] of inkPatterns) {
      const match = c.match(pat);
      if (match) data.ink_prices.push({ description: desc, price: parseAmount(match[1]) });
    }

    // Installation terms
    const installMatch = c.match(new RegExp("(Installation\\s*:\\s*By\\s+Factory.*?Engineers\\.)", "is"));
    if (installMatch) data.installation_terms = installMatch[1].trim();
  }

  // Service commitment
  const svcMatch = text.match(new RegExp("(We\\s+commit\\s+to\\s+providing\\s+exceptional\\s+service.*?cost\\.)", "is"));
  if (svcMatch) data.service_commitment = svcMatch[1].trim();

  return data;
}

// ── PDF builder ─────────────────────────────────────────────────────

function tryReadFile(filePath: string): Uint8Array | null {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

// Colors as rgb() for pdf-lib
const RED = rgb(0.831, 0.169, 0.169);    // #D42B2B
const GREY_DARK = rgb(0.333, 0.333, 0.333); // #555555
const GREY_MED = rgb(0.467, 0.467, 0.467);  // #777777
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const LINK_BLUE = rgb(0, 0.4, 0.8);      // #0066CC
const LIGHT_GREY = rgb(0.867, 0.867, 0.867); // #DDDDDD
const DOT_GREY = rgb(0.667, 0.667, 0.667);  // #AAAAAA

/** Replace characters that WinAnsi (standard PDF fonts) can't encode */
function sanitize(text: string): string {
  return text
    .replace(/₹/g, "Rs.")
    .replace(/[❖◆◇♦♢]/g, "*")
    // Strip any remaining non-WinAnsi chars (keep ASCII + Latin-1 Supplement)
    .replace(/[^\x00-\xFF]/g, "");
}

/** Approximate text width using font metrics (pdf-lib's widthOfTextAtSize) */
function textWidth(font: PDFFont, text: string, size: number): number {
  return font.widthOfTextAtSize(text, size);
}

/** Word-wrap text to fit within maxWidth, returns array of lines */
function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (textWidth(font, test, size) < maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function embedImageSafe(
  doc: PDFDocument,
  filePath: string,
  type: "png" | "jpg"
): Promise<PDFImage | null> {
  const bytes = tryReadFile(filePath);
  if (!bytes) return null;
  return type === "png" ? doc.embedPng(bytes) : doc.embedJpg(bytes);
}

function drawCoverPage(
  page: PDFPage,
  data: OfferData,
  fonts: { regular: PDFFont; bold: PDFFont; boldItalic: PDFFont },
  logoImage: PDFImage | null
) {
  const { regular, bold, boldItalic } = fonts;

  // Top-left decorative bars
  page.drawRectangle({ x: 45, y: PAGE_H - 80, width: 6, height: 60, color: GREY_DARK });
  page.drawRectangle({ x: 53, y: PAGE_H - 75, width: 6, height: 50, color: RED });

  // Date and Proforma number
  let y = PAGE_H - 130;
  page.drawText(`Date : ${data.date}`, { x: 120, y, font: regular, size: 10, color: BLACK });
  page.drawText(`Proforma Invoice No. : ${data.proforma_no}`, { x: 120, y: y - 16, font: regular, size: 10, color: BLACK });

  // "Proposal for" heading
  y = PAGE_H - 310;
  page.drawText("Proposal for", { x: 100, y, font: regular, size: 24, color: GREY_MED });

  // OrientJet logo
  if (logoImage) {
    page.drawImage(logoImage, { x: 80, y: y - 80, width: 300, height: 43 });
  }

  // Series name + "Digital Inkjet Press"
  const ySeries = y - 110;
  const seriesText = data.series;
  page.drawText(seriesText, { x: 80, y: ySeries, font: bold, size: 20, color: RED });
  const seriesWidth = textWidth(bold, seriesText + " ", 20);
  page.drawText("Digital Inkjet Press", { x: 80 + seriesWidth, y: ySeries, font: boldItalic, size: 20, color: GREY_DARK });

  // "Proposal for:-" and customer
  const yCust = PAGE_H - 560;
  page.drawText("Proposal for:-", { x: 100, y: yCust, font: bold, size: 12, color: BLACK });
  page.drawText(`M/s. ${data.customer_name}`, { x: 100, y: yCust - 22, font: bold, size: 12, color: BLACK });

  if (data.customer_address) {
    const addrLines = data.customer_address.split("\n").slice(0, 3);
    for (let i = 0; i < addrLines.length; i++) {
      page.drawText(addrLines[i], { x: 100, y: yCust - 42 - i * 14, font: regular, size: 9, color: GREY_DARK });
    }
  }

  // Bottom-right decorative triangle
  page.drawRectangle({ x: PAGE_W - 100, y: 0, width: 100, height: 120, color: LIGHT_GREY });

  // Red diagonal lines at bottom-right
  page.drawLine({ start: { x: PAGE_W - 50, y: 15 }, end: { x: PAGE_W - 15, y: 70 }, color: RED, thickness: 2 });
  page.drawLine({ start: { x: PAGE_W - 40, y: 10 }, end: { x: PAGE_W - 5, y: 65 }, color: RED, thickness: 2 });
  page.drawLine({ start: { x: PAGE_W - 30, y: 5 }, end: { x: PAGE_W + 5, y: 60 }, color: RED, thickness: 2 });
}

function drawPricingPage(
  page: PDFPage,
  data: OfferData,
  fonts: { regular: PDFFont; bold: PDFFont },
  images: {
    pricingBg: PDFImage | null;
    specTitle: PDFImage | null;
    pricingTitle: PDFImage | null;
  }
) {
  const { regular, bold } = fonts;
  const RIGHT_MARGIN = PAGE_W - 100;

  // Background image (includes T&C sidebar + Thank You graphic)
  if (images.pricingBg) {
    page.drawImage(images.pricingBg, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
  }

  // Dot grid decoration at top-right
  const dotStartX = PAGE_W - 85;
  const dotStartY = PAGE_H - 15;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 10; col++) {
      page.drawCircle({
        x: dotStartX + col * 8,
        y: dotStartY - row * 8,
        size: 1.8,
        color: DOT_GREY,
      });
    }
  }

  // "Machine Specification" title image
  if (images.specTitle) {
    page.drawImage(images.specTitle, { x: 55, y: PAGE_H - 75, width: 190, height: 52 });
  }

  // Machine description
  let y = PAGE_H - 100;
  page.drawText(data.machine_description || "", { x: 160, y, font: bold, size: 10, color: BLACK });
  y -= 22;

  // Spec bullets
  for (const spec of data.specifications) {
    if (y < 120) break;

    // Diamond marker drawn as a small rotated square (standard fonts lack ❖/♦)
    const dSize = 2.5;
    const dX = 168, dY = y + 3;
    page.drawRectangle({
      x: dX - dSize, y: dY - dSize,
      width: dSize * 2, height: dSize * 2,
      color: RED,
      rotate: degrees(45),
    });

    // Spec name (bold + underline)
    const nameWidth = textWidth(bold, spec.name, 8);
    page.drawText(spec.name, { x: 180, y, font: bold, size: 8, color: BLACK });
    page.drawLine({
      start: { x: 180, y: y - 1.5 },
      end: { x: 180 + nameWidth, y: y - 1.5 },
      color: BLACK,
      thickness: 0.5,
    });

    y -= 12;
    for (const detail of spec.details) {
      page.drawText(detail, { x: 185, y, font: regular, size: 7, color: GREY_DARK });
      y -= 10;
    }
    y -= 4;
  }

  // ── Equipment Pricing section ──
  let pricingY = Math.min(y - 30, PAGE_H * 0.40);

  // Equipment Pricing title image (right-aligned)
  if (images.pricingTitle) {
    page.drawImage(images.pricingTitle, { x: PAGE_W - 260, y: pricingY + 5, width: 190, height: 55 });
  }
  pricingY -= 20;

  // Pricing lines
  for (const item of data.pricing_items) {
    page.drawText(item.description, { x: 100, y: pricingY, font: bold, size: 9, color: BLACK });
    if (item.price > 0) {
      const priceStr = fmtPrice(item.price, data.currency);
      const priceW = textWidth(bold, priceStr, 9);
      page.drawText(priceStr, { x: RIGHT_MARGIN - priceW, y: pricingY, font: bold, size: 9, color: BLACK });
    }
    pricingY -= 15;
  }

  // Pricing note
  if (data.pricing_note) {
    page.drawText(data.pricing_note, { x: 100, y: pricingY, font: bold, size: 8, color: BLACK });
    pricingY -= 20;
  }

  // Ink pricing
  if (data.ink_prices.length > 0) {
    pricingY -= 5;
    page.drawText("Ink Price :-", { x: 100, y: pricingY, font: bold, size: 9, color: BLACK });
    pricingY -= 16;
    for (const ink of data.ink_prices) {
      page.drawText(ink.description, { x: 100, y: pricingY, font: regular, size: 8.5, color: BLACK });
      const inkStr = fmtPrice(ink.price, data.currency);
      const inkW = textWidth(regular, inkStr, 8.5);
      page.drawText(inkStr, { x: RIGHT_MARGIN - inkW, y: pricingY, font: regular, size: 8.5, color: BLACK });
      pricingY -= 14;
    }
  }

  // Installation terms (word-wrapped)
  if (data.installation_terms) {
    pricingY -= 10;
    const lines = wrapText(bold, data.installation_terms, 8, PAGE_W - 200);
    for (const line of lines.slice(0, 3)) {
      page.drawText(line, { x: 100, y: pricingY, font: bold, size: 8, color: BLACK });
      pricingY -= 12;
    }
  }

  // Service commitment (word-wrapped)
  if (data.service_commitment) {
    pricingY -= 8;
    const lines = wrapText(bold, data.service_commitment, 8, PAGE_W - 200);
    for (const line of lines.slice(0, 2)) {
      page.drawText(line, { x: 100, y: pricingY, font: bold, size: 8, color: BLACK });
      pricingY -= 12;
    }
  }

  // T&C links
  pricingY -= 10;
  page.drawText("General Terms and Conditions", { x: 100, y: pricingY, font: bold, size: 8, color: BLACK });
  const gtcW = textWidth(bold, "General Terms and Conditions ", 8);
  page.drawText("are applicable as published on", { x: 100 + gtcW, y: pricingY, font: regular, size: 7.5, color: BLACK });
  pricingY -= 12;
  page.drawText("www.tphorient.com", { x: 100, y: pricingY, font: regular, size: 7.5, color: LINK_BLUE });
  const siteW = textWidth(regular, "www.tphorient.com ", 7.5);
  page.drawText("website on the following link", { x: 100 + siteW, y: pricingY, font: regular, size: 7.5, color: BLACK });
  pricingY -= 12;
  page.drawText("https://tphorient.com/assets/pdf/domestic.pdf", { x: 100, y: pricingY, font: regular, size: 7, color: LINK_BLUE });
  const domW = textWidth(regular, "https://tphorient.com/assets/pdf/domestic.pdf ", 7);
  page.drawText("for any orders in India and on the", { x: 100 + domW, y: pricingY, font: regular, size: 7, color: BLACK });
  pricingY -= 12;
  page.drawText("following link ", { x: 100, y: pricingY, font: regular, size: 7, color: BLACK });
  const flW = textWidth(regular, "following link ", 7);
  page.drawText("https://tphorient.com/assets/pdf/International.pdf", { x: 100 + flW, y: pricingY, font: regular, size: 7, color: LINK_BLUE });
  const intW = textWidth(regular, "https://tphorient.com/assets/pdf/International.pdf ", 7);
  page.drawText("for any orders outside of India.", { x: 100 + flW + intW, y: pricingY, font: regular, size: 7, color: BLACK });
}

export async function generateOfferPdf(rawData: OfferData): Promise<Uint8Array> {
  // Sanitize all text fields for WinAnsi encoding (standard PDF fonts)
  const data: OfferData = {
    ...rawData,
    series: sanitize(rawData.series),
    date: sanitize(rawData.date),
    proforma_no: sanitize(rawData.proforma_no),
    customer_name: sanitize(rawData.customer_name),
    customer_address: sanitize(rawData.customer_address),
    machine_description: sanitize(rawData.machine_description),
    pricing_note: sanitize(rawData.pricing_note),
    installation_terms: sanitize(rawData.installation_terms),
    service_commitment: sanitize(rawData.service_commitment),
    specifications: rawData.specifications.map(s => ({
      name: sanitize(s.name),
      details: s.details.map(sanitize),
    })),
    pricing_items: rawData.pricing_items.map(p => ({
      description: sanitize(p.description),
      price: p.price,
    })),
    ink_prices: rawData.ink_prices.map(i => ({
      description: sanitize(i.description),
      price: i.price,
    })),
  };

  // Determine series → template path
  const isLP = data.series.toUpperCase().includes("L&P") || data.series.toUpperCase().includes("L & P");
  const seriesDir = isLP ? "lp_series" : "cseries";
  const templatePath = isLP
    ? path.join(ASSETS_BASE, "lp_series", "24080A_template.pdf")
    : path.join(ASSETS_BASE, "cseries", "25126_template.pdf");

  // Load template PDF for boilerplate pages
  const templateBytes = fs.readFileSync(templatePath);
  const templateDoc = await PDFDocument.load(templateBytes);
  const templatePageCount = templateDoc.getPageCount();

  // Create output PDF
  const pdfDoc = await PDFDocument.create();

  // Embed fonts
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const boldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  // Embed images for cover
  const brandDir = path.join(ASSETS_BASE, seriesDir);
  const logoImage = await embedImageSafe(pdfDoc, path.join(brandDir, "image6.png"), "png");

  // Embed images for pricing page
  const pricingBg = await embedImageSafe(pdfDoc, path.join(brandDir, "image18.jpg"), "jpg");
  const specTitle = await embedImageSafe(pdfDoc, path.join(brandDir, "image16.jpeg"), "jpg");
  const pricingTitle = await embedImageSafe(pdfDoc, path.join(brandDir, "image19.jpeg"), "jpg");

  // Page 1: Cover
  const coverPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawCoverPage(coverPage, data, { regular, bold, boldItalic }, logoImage);

  // Pages 2 through N-1: Boilerplate from template (skip first and last page)
  const boilerplateEnd = Math.min(templatePageCount - 1, templatePageCount);
  if (templatePageCount > 2) {
    const boilerplateIndices = Array.from(
      { length: boilerplateEnd - 1 },
      (_, i) => i + 1
    );
    const copiedPages = await pdfDoc.copyPages(templateDoc, boilerplateIndices);
    for (const copied of copiedPages) {
      pdfDoc.addPage(copied);
    }
  }

  // Last page: Machine Spec + Pricing
  const pricingPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawPricingPage(pricingPage, data, { regular, bold }, { pricingBg, specTitle, pricingTitle });

  return pdfDoc.save();
}
