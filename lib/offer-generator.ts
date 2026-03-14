/**
 * Offer Generator — parse structured output and build branded PDF.
 *
 * Uses pdf-lib to generate cover + spec + pricing pages, then merges with
 * template PDF boilerplate pages.
 *
 * Key design decisions:
 * - Specs and pricing flow across multiple pages (no truncation)
 * - All text is word-wrapped to prevent overflow into adjacent columns
 * - Parsing warns on missing content so failures are visible
 * - WinAnsi sanitization logs stripped characters for debugging
 */

import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFImage, degrees } from "pdf-lib";

// A4 in points
const PAGE_W = 595.27;
const PAGE_H = 841.89;

// Minimum Y before we overflow to a new page (bottom margin)
const PAGE_BOTTOM = 80;

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

export interface ParseWarnings {
  missing: string[];
  stripped: string[];
}

// ── Currency formatting ────────────────────────────────────────────

function fmtINR(amount: number): string {
  if (!amount) return "";
  const s = Math.round(amount).toString();
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
  s = s.replace(/[₹$Rs.\s,*]/g, "");
  if (!s || s === "-") return 0;
  return s.includes(".") ? parseFloat(s) : parseInt(s, 10);
}

/** Normalize text: collapse whitespace, trim lines, remove zero-width chars */
function normalizeText(text: string): string {
  return text
    .replace(/\u200B/g, "")       // zero-width space
    .replace(/\u00A0/g, " ")      // non-breaking space → regular space
    .replace(/\r\n/g, "\n")       // CRLF → LF
    .replace(/[ \t]+/g, " ")      // collapse horizontal whitespace
    .replace(/\n{3,}/g, "\n\n");  // max 2 consecutive newlines
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

  // Normalize before any parsing
  text = normalizeText(text);

  const hasSections = /SECTION\s*[AB]/i.test(text);

  if (hasSections) {
    parseSectioned(text, data);
  } else {
    parseDirectFormat(text, data);
  }

  data.currency = data.order_type.toUpperCase().includes("INTERNATIONAL") ? "USD" : "INR";

  // Installation terms — flexible matching
  const installMatch = text.match(/(Installation\s*:?\s*By\s+Factory[\s\S]*?Engineers\.)/i);
  if (installMatch) data.installation_terms = installMatch[1].replace(/\s+/g, " ").trim();

  const svcMatch = text.match(/(We\s+commit\s+to\s+providing\s+exceptional\s+service[\s\S]*?cost\.)/i);
  if (svcMatch) data.service_commitment = svcMatch[1].replace(/\s+/g, " ").trim();

  return data;
}

/** Audit parsed data and return warnings for missing fields */
export function auditParsedData(data: OfferData): ParseWarnings {
  const warnings: ParseWarnings = { missing: [], stripped: [] };

  if (data.specifications.length === 0) warnings.missing.push("specifications (no machine specs found)");
  if (data.pricing_items.length === 0) warnings.missing.push("pricing_items (no equipment pricing found)");
  if (!data.total_price) warnings.missing.push("total_price (no total offer price found)");
  if (!data.machine_description) warnings.missing.push("machine_description");
  if (!data.date) warnings.missing.push("date");
  if (!data.proforma_no) warnings.missing.push("proforma_no");
  if (data.customer_name === "[Customer Name]") warnings.missing.push("customer_name (using placeholder)");
  if (data.ink_prices.length === 0) warnings.missing.push("ink_prices (no ink pricing found)");
  if (!data.installation_terms) warnings.missing.push("installation_terms");

  for (const w of warnings.missing) {
    console.warn(`[Offer Parser] Missing: ${w}`);
  }

  return warnings;
}

// ── Format 1: Claude Enterprise structured output with SECTION markers ──

function parseSectioned(text: string, data: OfferData) {
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

  // Machine description
  const descMatch = text.match(/MACHINE_DESCRIPTION\s*:\s*"?([^"\n]+)"?/i);
  if (descMatch) data.machine_description = descMatch[1].trim();

  // Section B: Specs (pipe-delimited table)
  const sectionB = text.match(/SECTION\s*B[\s\S]*?(?=SECTION\s*C|$)/i);
  if (sectionB) {
    const rows = [...sectionB[0].matchAll(/\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/g)];
    for (const [, name, details] of rows) {
      const n = name.trim();
      if (n.toLowerCase() === "component" || n.match(/^-+$/)) continue;
      data.specifications.push({
        name: n,
        details: details.trim().split(";").map((d: string) => d.trim()).filter(Boolean),
      });
    }
  }

  // Section C: Pricing (pipe-delimited table)
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

    const noteMatch = c.match(/Pricing\s*Note\s*:\s*\*{0,2}\s*(.*?)\s*\*{0,2}\s*(?:\n|$)/i);
    if (noteMatch) data.pricing_note = noteMatch[1].trim().replace(/^\*/, "").trim();

    parseInkPrices(c, data);
  }
}

// ── Format 2: Direct DOCX offer (no SECTION markers) ──

function parseDirectFormat(text: string, data: OfferData) {
  // Series detection — flexible matching
  if (/L\s*[&+]\s*P/i.test(text)) data.series = "L&P SERIES";
  else if (/C[\s-]*Series/i.test(text)) data.series = "C SERIES";

  // Cover fields — handle "Key:\nValue", "Key: Value", and "Key:\n Value"
  const nlVal = (key: string): string => {
    const re = new RegExp(`(?:^|\\n)\\s*${key}\\s*:?\\s*\\n?\\s*(.+)`, "im");
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };
  data.date = nlVal("Date") || data.date;
  data.proforma_no = nlVal("Proforma(?:\\s+Invoice)?\\s*(?:No\\.?)?") || nlVal("Proforma\\s*No") || data.proforma_no;
  data.customer_name = nlVal("Customer(?:\\s*Name)?") || data.customer_name;
  data.customer_address = nlVal("Address") || data.customer_address;
  data.order_type = nlVal("Order\\s*Type") || data.order_type;

  // Machine description — line after "MACHINE SPECIFICATION" heading
  const specSection = text.match(/MACHINE\s+SPECIFICATION[S]?\s*\n+\s*(.+)/i);
  if (specSection) data.machine_description = specSection[1].trim();

  // Specifications — block between MACHINE SPECIFICATION and EQUIPMENT PRICING
  const specBlock = text.match(/MACHINE\s+SPECIFICATION[S]?[\s\S]*?(?=EQUIPMENT\s+PRICING|PRICING|$)/i);
  if (specBlock) {
    parseSpecsFromPlainText(specBlock[0], data);
  }

  // Pricing — block between EQUIPMENT PRICING and INK PRICING (or other endings)
  const pricingBlock = text.match(/(?:EQUIPMENT\s+)?PRICING[\s\S]*?(?=INK\s+PRIC|INSTALLATION|GENERAL\s+TERMS|$)/i);
  if (pricingBlock) {
    parsePricingFromPlainText(pricingBlock[0], data);
  }

  // Pricing note — line starting with * after TOTAL
  const noteMatch = text.match(/TOTAL\s+OFFER\s+PRICE[\s\S]*?\n\s*(\*[^\n]+)/i);
  if (noteMatch) data.pricing_note = noteMatch[1].trim();

  // Ink pricing
  parseInkPrices(text, data);
}

/** Parse specs from plain text — improved with looser component matching */
function parseSpecsFromPlainText(block: string, data: OfferData) {
  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
  // Skip header lines
  const startIdx = lines.findIndex(l => /^Component[s]?$/i.test(l));
  const detailsIdx = lines.findIndex((l, i) => i > startIdx && /^Details?$/i.test(l));
  const begin = detailsIdx >= 0 ? detailsIdx + 1 : (startIdx >= 0 ? startIdx + 1 : 2);

  // Component names that mark spec boundaries — expanded list
  const COMPONENT_NAMES = [
    "PRINT HEAD", "PRINTHEAD",
    "ELECTRONIC", "ELECTRONICS",
    "WEB TRANSPORT", "WEB GUIDE",
    "UNWINDER", "UNWIND",
    "REWINDER", "REWIND UNIT", "REWIND",
    "INK DELIVERY", "INK SYSTEM", "INK SUPPLY",
    "RIP + SERVER", "RIP SERVER", "RIP",
    "COATING + DRYING", "COATING", "COATER",
    "DRYING", "DRYER",
    "SHEETER", "SHEET CUTTER",
    "INLINE", "IN-LINE",
    "FINISHING", "LAMINATION", "LAMINATOR",
    "POST-COATING", "POST COATING",
    "CORONA", "CORONA TREATMENT",
    "UV", "UV CURING",
    "SERVER", "COMPUTER",
  ];

  function isComponentName(line: string): boolean {
    const upper = line.toUpperCase();
    // Direct match against known names
    if (COMPONENT_NAMES.some(c => upper.startsWith(c))) return true;
    // Heuristic: ALL CAPS line that isn't a number or header
    if (upper === line && line.length > 3 && line.length < 50 && !/^\d+$/.test(line) && !/^(SR|NO|QTY|AMOUNT|PARTICULARS|TOTAL|EQUIPMENT|MACHINE)/i.test(line)) {
      return true;
    }
    return false;
  }

  let currentSpec: Specification | null = null;
  for (let i = begin; i < lines.length; i++) {
    const line = lines[i];
    if (isComponentName(line)) {
      if (currentSpec) data.specifications.push(currentSpec);
      currentSpec = { name: line, details: [] };
    } else if (currentSpec) {
      currentSpec.details.push(line);
    }
  }
  if (currentSpec) data.specifications.push(currentSpec);
}

/** Parse pricing from plain text — improved with inline amount detection */
function parsePricingFromPlainText(block: string, data: OfferData) {
  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

  // Find TOTAL line first
  for (let i = 0; i < lines.length; i++) {
    if (/TOTAL\s+OFFER\s+PRICE/i.test(lines[i])) {
      // Amount could be on same line or next line
      const sameLine = lines[i].match(/[₹$]\s*[\d,]+|Rs\.?\s*[\d,]+/);
      if (sameLine) {
        data.total_price = parseAmount(sameLine[0]);
      } else {
        const nextLine = lines[i + 1] || "";
        const amt = nextLine.match(/[₹$]\s*[\d,]+|Rs\.?\s*[\d,]+/);
        if (amt) data.total_price = parseAmount(amt[0]);
      }
      break;
    }
  }

  // Strategy 1: Look for lines with currency amounts, walk backwards for description
  const amountRe = /^[₹$]\s*[\d,]+|^Rs\.?\s*[\d,]+/;
  for (let i = 0; i < lines.length; i++) {
    if (amountRe.test(lines[i]) && !/TOTAL/i.test(lines[i - 2] || "") && !/TOTAL/i.test(lines[i - 1] || "")) {
      const price = parseAmount(lines[i]);
      let desc = "";
      for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
        const l = lines[j];
        if (!l.match(/^\d+$/) && !amountRe.test(l) && !l.match(/^(Sr|Particulars|Qty|Amount|No\.?|Unit)/i)) {
          desc = l;
          break;
        }
      }
      if (desc && price > 0) {
        data.pricing_items.push({ description: desc, price });
      }
    }
  }

  // Strategy 2: Handle inline "Description ... ₹Amount" on same line
  if (data.pricing_items.length === 0) {
    const inlineRe = /^(.+?)\s+[₹$]\s*([\d,]+)\s*$/;
    const inlineRsRe = /^(.+?)\s+Rs\.?\s*([\d,]+)\s*$/;
    for (const line of lines) {
      if (/TOTAL|SUBTOTAL|HEADER|PARTICULARS/i.test(line)) continue;
      const m = line.match(inlineRe) || line.match(inlineRsRe);
      if (m) {
        const desc = m[1].trim().replace(/^\d+\.\s*/, ""); // strip leading "1. "
        const price = parseAmount(m[2]);
        if (desc && price > 0) {
          data.pricing_items.push({ description: desc, price });
        }
      }
    }
  }

  // Strategy 3: Tab/multi-space separated "Sr  Description  Qty  Amount"
  if (data.pricing_items.length === 0) {
    for (const line of lines) {
      if (/TOTAL|SUBTOTAL|HEADER|PARTICULARS|^Sr\b|^No\b/i.test(line)) continue;
      // Look for lines with at least 2 segments separated by 2+ spaces
      const segments = line.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
      if (segments.length >= 3) {
        const lastSeg = segments[segments.length - 1];
        const price = parseAmount(lastSeg);
        if (price > 0) {
          // Description is typically the second segment (first is Sr number)
          const desc = segments.length >= 4 ? segments[1] : segments[0];
          data.pricing_items.push({ description: desc, price });
        }
      }
    }
  }
}

/** Parse ink prices — improved with more patterns */
function parseInkPrices(text: string, data: OfferData) {
  if (data.ink_prices.length > 0) return;

  // Strategy 1: Specific regex patterns
  const inkPatterns: [RegExp, string][] = [
    [/Uncoated\s+Media[\s\S]{0,100}?Black(?:\s+Ink)?[\s\S]{0,50}?([₹$]\s*[\d,]+|Rs\.?\s*[\d,]+)/i, "Uncoated Media per ltr for Black"],
    [/Uncoated\s+Media[\s\S]{0,100}?(?:Cyan|CMY|Colour)[\s\S]{0,80}?([₹$]\s*[\d,]+|Rs\.?\s*[\d,]+)/i, "Uncoated Media per ltr for Cyan, Magenta, Yellow"],
    [/Coated\s+Media[\s\S]{0,100}?(?:HD\s+)?Ink[\s\S]{0,50}?([₹$]\s*[\d,]+|Rs\.?\s*[\d,]+)/i, "Coated Media HD Ink per ltr"],
  ];
  for (const [pat, desc] of inkPatterns) {
    const match = text.match(pat);
    if (match) data.ink_prices.push({ description: desc, price: parseAmount(match[1]) });
  }

  // Strategy 2: Find INK PRICING section and parse line-by-line
  if (data.ink_prices.length === 0) {
    const inkSection = text.match(/INK\s+PRIC(?:ING|E)[\s\S]*?(?=INSTALLATION|GENERAL\s+TERMS|SERVICE|$)/i);
    if (inkSection) {
      const lines = inkSection[0].split("\n").map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (/^INK\s+PRIC/i.test(line)) continue;
        const m = line.match(/^(.+?)\s+[₹$]\s*([\d,]+)/) || line.match(/^(.+?)\s+Rs\.?\s*([\d,]+)/);
        if (m) {
          const desc = m[1].trim();
          const price = parseAmount(m[2]);
          if (price > 0) data.ink_prices.push({ description: desc, price });
        }
      }
    }
  }
}

// ── PDF builder ─────────────────────────────────────────────────────

function tryReadFile(filePath: string): Uint8Array | null {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

// Colors
const RED = rgb(0.831, 0.169, 0.169);       // #D42B2B
const GREY_DARK = rgb(0.333, 0.333, 0.333); // #555555
const GREY_MED = rgb(0.467, 0.467, 0.467);  // #777777
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const LINK_BLUE = rgb(0, 0.4, 0.8);         // #0066CC
const LIGHT_GREY = rgb(0.867, 0.867, 0.867); // #DDDDDD
const DOT_GREY = rgb(0.667, 0.667, 0.667);  // #AAAAAA

/** Replace characters that WinAnsi (standard PDF fonts) can't encode */
function sanitize(text: string): string {
  let result = text
    .replace(/₹/g, "Rs.")
    .replace(/[❖◆◇♦♢]/g, "*")
    .replace(/[–—]/g, "-")        // em/en dash → hyphen
    .replace(/['']/g, "'")        // smart quotes → straight
    .replace(/[""]/g, '"');       // smart double quotes → straight

  // Strip remaining non-WinAnsi chars and log what was removed
  const stripped = result.match(/[^\x00-\xFF]/g);
  if (stripped && stripped.length > 0) {
    const unique = [...new Set(stripped)];
    console.warn(`[Offer PDF] Stripped non-WinAnsi characters: ${unique.map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase()}`).join(", ")}`);
  }
  result = result.replace(/[^\x00-\xFF]/g, "");

  return result;
}

function textWidth(font: PDFFont, text: string, size: number): number {
  return font.widthOfTextAtSize(text, size);
}

/** Word-wrap text to fit within maxWidth */
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

// ── Cover page ─────────────────────────────────────────────────────

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

  if (logoImage) {
    page.drawImage(logoImage, { x: 80, y: y - 80, width: 300, height: 43 });
  }

  // Series name + "Digital Inkjet Press"
  const ySeries = y - 110;
  page.drawText(data.series, { x: 80, y: ySeries, font: bold, size: 20, color: RED });
  const seriesWidth = textWidth(bold, data.series + " ", 20);
  page.drawText("Digital Inkjet Press", { x: 80 + seriesWidth, y: ySeries, font: boldItalic, size: 20, color: GREY_DARK });

  // Customer
  const yCust = PAGE_H - 560;
  page.drawText("Proposal for:-", { x: 100, y: yCust, font: bold, size: 12, color: BLACK });
  page.drawText(`M/s. ${data.customer_name}`, { x: 100, y: yCust - 22, font: bold, size: 12, color: BLACK });

  if (data.customer_address) {
    const addrLines = data.customer_address.split("\n").slice(0, 3);
    for (let i = 0; i < addrLines.length; i++) {
      page.drawText(addrLines[i], { x: 100, y: yCust - 42 - i * 14, font: regular, size: 9, color: GREY_DARK });
    }
  }

  // Bottom-right decoration
  page.drawRectangle({ x: PAGE_W - 100, y: 0, width: 100, height: 120, color: LIGHT_GREY });
  page.drawLine({ start: { x: PAGE_W - 50, y: 15 }, end: { x: PAGE_W - 15, y: 70 }, color: RED, thickness: 2 });
  page.drawLine({ start: { x: PAGE_W - 40, y: 10 }, end: { x: PAGE_W - 5, y: 65 }, color: RED, thickness: 2 });
  page.drawLine({ start: { x: PAGE_W - 30, y: 5 }, end: { x: PAGE_W + 5, y: 60 }, color: RED, thickness: 2 });
}

// ── Spec + Pricing pages (multi-page) ──────────────────────────────

/**
 * Draw machine specs and pricing across as many pages as needed.
 * Returns the pages created so they can be added to the document.
 */
function drawSpecAndPricing(
  pdfDoc: PDFDocument,
  data: OfferData,
  fonts: { regular: PDFFont; bold: PDFFont },
  images: {
    pricingBg: PDFImage | null;
    specTitle: PDFImage | null;
    pricingTitle: PDFImage | null;
  }
): PDFPage[] {
  const { regular, bold } = fonts;
  const RIGHT_MARGIN = PAGE_W - 100;
  const CONTENT_WIDTH = RIGHT_MARGIN - 100; // text area between margins
  const DESC_MAX_WIDTH = CONTENT_WIDTH - 120; // leave room for price column
  const pages: PDFPage[] = [];

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  // Draw background on first page
  if (images.pricingBg) {
    page.drawImage(images.pricingBg, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
  }

  // Dot grid decoration
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

  // Helper: create overflow page
  function newPage(): PDFPage {
    const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    // Overflow pages get background too (for consistent look)
    if (images.pricingBg) {
      p.drawImage(images.pricingBg, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    }
    return p;
  }

  // ── Machine Specification title ──
  if (images.specTitle) {
    page.drawImage(images.specTitle, { x: 55, y: PAGE_H - 75, width: 190, height: 52 });
  }

  // Machine description (wrapped)
  let y = PAGE_H - 100;
  if (data.machine_description) {
    const descLines = wrapText(bold, data.machine_description, 10, CONTENT_WIDTH - 60);
    for (const line of descLines) {
      page.drawText(line, { x: 160, y, font: bold, size: 10, color: BLACK });
      y -= 14;
    }
    y -= 8;
  }

  // ── Spec bullets (with page overflow) ──
  for (const spec of data.specifications) {
    // Estimate height: name line + detail lines
    const detailHeight = spec.details.length * 10 + 16;
    if (y - detailHeight < PAGE_BOTTOM) {
      page = newPage();
      y = PAGE_H - 60;
    }

    // Diamond marker
    const dSize = 2.5;
    page.drawRectangle({
      x: 168 - dSize, y: y + 3 - dSize,
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
      if (y < PAGE_BOTTOM) {
        page = newPage();
        y = PAGE_H - 60;
      }
      // Wrap long detail lines
      const detailLines = wrapText(regular, detail, 7, CONTENT_WIDTH - 85);
      for (const dl of detailLines) {
        page.drawText(dl, { x: 185, y, font: regular, size: 7, color: GREY_DARK });
        y -= 10;
        if (y < PAGE_BOTTOM) {
          page = newPage();
          y = PAGE_H - 60;
        }
      }
    }
    y -= 4;
  }

  // ── Equipment Pricing section ──
  // Add spacing before pricing
  y -= 30;
  if (y < PAGE_BOTTOM + 100) {
    page = newPage();
    y = PAGE_H - 60;
  }

  // Equipment Pricing title image
  if (images.pricingTitle) {
    page.drawImage(images.pricingTitle, { x: PAGE_W - 260, y: y + 5, width: 190, height: 55 });
  }
  y -= 20;

  // Pricing lines (with wrapping and overflow)
  for (const item of data.pricing_items) {
    // Wrap description to prevent collision with price column
    const descLines = wrapText(bold, item.description, 9, DESC_MAX_WIDTH);
    const lineHeight = descLines.length * 13;

    if (y - lineHeight < PAGE_BOTTOM) {
      page = newPage();
      y = PAGE_H - 60;
    }

    // Draw description lines
    for (let i = 0; i < descLines.length; i++) {
      page.drawText(descLines[i], { x: 100, y, font: bold, size: 9, color: BLACK });
      if (i < descLines.length - 1) y -= 13;
    }

    // Draw price right-aligned on the first description line's Y
    if (item.price > 0) {
      const priceStr = fmtPrice(item.price, data.currency);
      const priceW = textWidth(bold, priceStr, 9);
      // Price on same line as first desc line (go back up)
      const priceY = y + (descLines.length - 1) * 13;
      page.drawText(priceStr, { x: RIGHT_MARGIN - priceW, y: priceY, font: bold, size: 9, color: BLACK });
    }

    y -= 15;
  }

  // Total price line
  if (data.total_price) {
    if (y < PAGE_BOTTOM + 20) {
      page = newPage();
      y = PAGE_H - 60;
    }
    y -= 5;
    page.drawLine({
      start: { x: 100, y: y + 8 },
      end: { x: RIGHT_MARGIN, y: y + 8 },
      color: BLACK,
      thickness: 0.5,
    });
    page.drawText("TOTAL OFFER PRICE", { x: 100, y, font: bold, size: 10, color: BLACK });
    const totalStr = fmtPrice(data.total_price, data.currency);
    const totalW = textWidth(bold, totalStr, 10);
    page.drawText(totalStr, { x: RIGHT_MARGIN - totalW, y, font: bold, size: 10, color: BLACK });
    page.drawLine({
      start: { x: 100, y: y - 4 },
      end: { x: RIGHT_MARGIN, y: y - 4 },
      color: BLACK,
      thickness: 0.5,
    });
    y -= 20;
  }

  // Pricing note
  if (data.pricing_note) {
    if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
    const noteLines = wrapText(bold, data.pricing_note, 8, CONTENT_WIDTH);
    for (const line of noteLines) {
      page.drawText(line, { x: 100, y, font: bold, size: 8, color: BLACK });
      y -= 12;
    }
    y -= 8;
  }

  // Ink pricing
  if (data.ink_prices.length > 0) {
    if (y < PAGE_BOTTOM + 60) { page = newPage(); y = PAGE_H - 60; }
    y -= 5;
    page.drawText("Ink Price :-", { x: 100, y, font: bold, size: 9, color: BLACK });
    y -= 16;
    for (const ink of data.ink_prices) {
      if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
      // Wrap ink description
      const inkDescLines = wrapText(regular, ink.description, 8.5, DESC_MAX_WIDTH);
      for (let i = 0; i < inkDescLines.length; i++) {
        page.drawText(inkDescLines[i], { x: 100, y, font: regular, size: 8.5, color: BLACK });
        if (i < inkDescLines.length - 1) y -= 12;
      }
      const inkStr = fmtPrice(ink.price, data.currency);
      const inkW = textWidth(regular, inkStr, 8.5);
      page.drawText(inkStr, { x: RIGHT_MARGIN - inkW, y: y + (inkDescLines.length - 1) * 12, font: regular, size: 8.5, color: BLACK });
      y -= 14;
    }
  }

  // Installation terms (wrapped)
  if (data.installation_terms) {
    if (y < PAGE_BOTTOM + 40) { page = newPage(); y = PAGE_H - 60; }
    y -= 10;
    const lines = wrapText(bold, data.installation_terms, 8, CONTENT_WIDTH);
    for (const line of lines) {
      if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
      page.drawText(line, { x: 100, y, font: bold, size: 8, color: BLACK });
      y -= 12;
    }
  }

  // Service commitment (wrapped)
  if (data.service_commitment) {
    if (y < PAGE_BOTTOM + 30) { page = newPage(); y = PAGE_H - 60; }
    y -= 8;
    const lines = wrapText(bold, data.service_commitment, 8, CONTENT_WIDTH);
    for (const line of lines) {
      if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
      page.drawText(line, { x: 100, y, font: bold, size: 8, color: BLACK });
      y -= 12;
    }
  }

  // T&C links
  if (y < PAGE_BOTTOM + 60) { page = newPage(); y = PAGE_H - 60; }
  y -= 10;
  page.drawText("General Terms and Conditions", { x: 100, y, font: bold, size: 8, color: BLACK });
  const gtcW = textWidth(bold, "General Terms and Conditions ", 8);
  page.drawText("are applicable as published on", { x: 100 + gtcW, y, font: regular, size: 7.5, color: BLACK });
  y -= 12;
  page.drawText("www.tphorient.com", { x: 100, y, font: regular, size: 7.5, color: LINK_BLUE });
  const siteW = textWidth(regular, "www.tphorient.com ", 7.5);
  page.drawText("website on the following link", { x: 100 + siteW, y, font: regular, size: 7.5, color: BLACK });
  y -= 12;
  page.drawText("https://tphorient.com/assets/pdf/domestic.pdf", { x: 100, y, font: regular, size: 7, color: LINK_BLUE });
  const domW = textWidth(regular, "https://tphorient.com/assets/pdf/domestic.pdf ", 7);
  page.drawText("for any orders in India and on the", { x: 100 + domW, y, font: regular, size: 7, color: BLACK });
  y -= 12;
  page.drawText("following link ", { x: 100, y, font: regular, size: 7, color: BLACK });
  const flW = textWidth(regular, "following link ", 7);
  page.drawText("https://tphorient.com/assets/pdf/International.pdf", { x: 100 + flW, y, font: regular, size: 7, color: LINK_BLUE });
  const intW = textWidth(regular, "https://tphorient.com/assets/pdf/International.pdf ", 7);
  page.drawText("for any orders outside of India.", { x: 100 + flW + intW, y, font: regular, size: 7, color: BLACK });

  return pages;
}

// ── Main PDF generator ─────────────────────────────────────────────

export async function generateOfferPdf(rawData: OfferData): Promise<Uint8Array> {
  // Audit parsed data before building PDF
  const warnings = auditParsedData(rawData);
  if (warnings.missing.length > 0) {
    console.warn(`[Offer PDF] ${warnings.missing.length} missing field(s) — PDF may be incomplete`);
  }

  // Sanitize all text fields for WinAnsi encoding
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

  // Embed images
  const brandDir = path.join(ASSETS_BASE, seriesDir);
  const logoImage = await embedImageSafe(pdfDoc, path.join(brandDir, "image6.png"), "png");
  const pricingBg = await embedImageSafe(pdfDoc, path.join(brandDir, "image18.jpg"), "jpg");
  const specTitle = await embedImageSafe(pdfDoc, path.join(brandDir, "image16.jpeg"), "jpg");
  const pricingTitle = await embedImageSafe(pdfDoc, path.join(brandDir, "image19.jpeg"), "jpg");

  // Page 1: Cover
  const coverPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawCoverPage(coverPage, data, { regular, bold, boldItalic }, logoImage);

  // Pages 2 through N-1: Boilerplate from template (skip first and last page)
  if (templatePageCount > 2) {
    const boilerplateIndices = Array.from(
      { length: templatePageCount - 2 },
      (_, i) => i + 1
    );
    const copiedPages = await pdfDoc.copyPages(templateDoc, boilerplateIndices);
    for (const copied of copiedPages) {
      pdfDoc.addPage(copied);
    }
  }

  // Spec + Pricing pages (as many as needed)
  drawSpecAndPricing(pdfDoc, data, { regular, bold }, { pricingBg, specTitle, pricingTitle });

  return pdfDoc.save();
}
