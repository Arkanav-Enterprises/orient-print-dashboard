/**
 * Offer Generator — parse DOCX/Claude output and build branded PDF.
 *
 * Flow: DOCX upload → JSZip text extraction → parseClaudeOutput() → generateOfferPdf()
 *
 * Key design decisions:
 * - Specs and pricing flow across multiple pages (no truncation)
 * - All text is word-wrapped to prevent column overflow
 * - Ink prices support "[Price on request]" text values
 * - Delivery/payment terms parsed and rendered
 * - GST shown as separate line in pricing
 * - Machine subtitle shown on cover page
 * - Content audit warns on missing fields
 */

import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFImage, degrees } from "pdf-lib";

// A4 in points
const PAGE_W = 595.27;
const PAGE_H = 841.89;
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
  price_text: string; // "[Price on request]" or formatted amount
}

export interface OfferData {
  series: string;
  date: string;
  proforma_no: string;
  customer_name: string;
  customer_address: string;
  order_type: string;
  machine_description: string;
  machine_subtitle: string;       // "4 Colour Duplex | 540 mm Print Width\n600×600 dpi | Kyocera RC"
  specifications: Specification[];
  pricing_items: PricingItem[];
  pricing_note: string;
  ink_prices: InkPrice[];
  ink_note: string;               // "Additional GST @18% applicable on ink pricing"
  installation_terms: string;
  service_commitment: string;
  delivery_terms: string;         // "4 months from the date of advance payment received."
  payment_terms: string[];        // ["50% advance...", "Balance 50%..."]
  price_validity: string;         // "Prices valid for 30 days from the date of this offer"
  gst_rate: string;               // "18%"
  gst_amount: number;
  currency: string;
  total_price?: number;
  general_terms: string;          // Full General Terms and Conditions of Sale text
  warranty_statement: string;     // Full LIMITED WARRANTY STATEMENT text
  thank_you: string;              // Thank You closing text
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
  // Strip currency symbols, spaces, commas — but only from amount strings
  s = s.replace(/[₹$\s,*]/g, "").replace(/^Rs\.?/i, "");
  if (!s || s === "-") return 0;
  return s.includes(".") ? parseFloat(s) : parseInt(s, 10);
}

function normalizeText(text: string): string {
  return text
    .replace(/\u200B/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
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
    machine_subtitle: "",
    specifications: [],
    pricing_items: [],
    pricing_note: "",
    ink_prices: [],
    ink_note: "",
    installation_terms: "",
    service_commitment: "",
    delivery_terms: "",
    payment_terms: [],
    price_validity: "",
    gst_rate: "",
    gst_amount: 0,
    currency: "INR",
    general_terms: "",
    warranty_statement: "",
    thank_you: "",
  };

  text = normalizeText(text);

  const hasSections = /SECTION\s*[AB]/i.test(text);

  if (hasSections) {
    parseSectioned(text, data);
  } else {
    parseDirectFormat(text, data);
  }

  data.currency = data.order_type.toUpperCase().includes("INTERNATIONAL") ? "USD" : "INR";

  // Installation terms — match the full paragraph, not just until "Engineers."
  const installMatch = text.match(/\nInstallation\s*\n([\s\S]*?)(?=\nService\s+Commitment|\nGeneral\s+Terms|$)/i);
  if (installMatch) {
    data.installation_terms = installMatch[1].replace(/\s+/g, " ").trim();
  } else {
    // Fallback: old pattern
    const fallback = text.match(/(Installation\s*:?\s*By\s+Factory[\s\S]*?(?:buyer|provided by the buyer)\.)/i);
    if (fallback) data.installation_terms = fallback[1].replace(/\s+/g, " ").trim();
  }

  const svcMatch = text.match(/(We\s+commit\s+to\s+providing\s+exceptional\s+service[\s\S]*?cost\.)/i);
  if (svcMatch) data.service_commitment = svcMatch[1].replace(/\s+/g, " ").trim();

  // General Terms and Conditions of Sale — full legal text
  // Stop at "APPLICABILITY This LIMITED WARRANTY" which is the WARRANTY section boundary
  const gtcMatch = text.match(/GENERAL\s+TERMS\s+AND\s+CONDITIONS\s+OF\s+SALE[\s\S]*?(?=APPLICABILITY\s+This\s+LIMITED\s+WARRANTY|\nTHANK\s+YOU|$)/i);
  if (gtcMatch) {
    data.general_terms = gtcMatch[0].trim();
  }

  // LIMITED WARRANTY STATEMENT (starts with "APPLICABILITY This LIMITED WARRANTY...")
  const warMatch = text.match(/APPLICABILITY\s+This\s+LIMITED\s+WARRANTY\s+STATEMENT[\s\S]*?(?=\nTHANK\s+YOU|$)/i);
  if (warMatch) {
    data.warranty_statement = warMatch[0].trim();
  }

  // Thank You closing
  const thankMatch = text.match(/THANK\s+YOU[\s\S]*$/i);
  if (thankMatch) {
    data.thank_you = thankMatch[0].trim();
  }

  // Compute total if not found explicitly: sum of pricing items + GST
  if (!data.total_price && data.pricing_items.length > 0) {
    const itemTotal = data.pricing_items.reduce((sum, p) => sum + p.price, 0);
    data.total_price = itemTotal + data.gst_amount;
  }

  return data;
}

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
  if (!data.delivery_terms) warnings.missing.push("delivery_terms");
  if (data.payment_terms.length === 0) warnings.missing.push("payment_terms");

  for (const w of warnings.missing) {
    console.warn(`[Offer Parser] Missing: ${w}`);
  }

  return warnings;
}

// ── Format 1: Claude Enterprise structured output with SECTION markers ──

function parseSectioned(text: string, data: OfferData) {
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

  const descMatch = text.match(/MACHINE_DESCRIPTION\s*:\s*"?([^"\n]+)"?/i);
  if (descMatch) data.machine_description = descMatch[1].trim();

  // Section B: Specs
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

    const noteMatch = c.match(/Pricing\s*Note\s*:\s*\*{0,2}\s*(.*?)\s*\*{0,2}\s*(?:\n|$)/i);
    if (noteMatch) data.pricing_note = noteMatch[1].trim().replace(/^\*/, "").trim();

    parseInkPrices(c, data);
  }

  // Section E: Delivery & Payment
  const sectionE = text.match(/SECTION\s*E[\s\S]*?(?=---|$)/i);
  if (sectionE) {
    parseDeliveryPayment(sectionE[0], data);
  }
}

// ── Format 2: Direct DOCX offer (no SECTION markers) ──

function parseDirectFormat(text: string, data: OfferData) {
  // Series detection — check C-Series first (more specific),
  // L&P requires word boundary to avoid matching "label & packaging"
  if (/C[\s-]*Series/i.test(text)) data.series = "C SERIES";
  else if (/\bL\s*[&+]\s*P\b/i.test(text)) data.series = "L&P SERIES";

  // Cover fields
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

  // Machine subtitle — lines between "COMMERCIAL OFFER" and "Date:"
  const subtitleMatch = text.match(/COMMERCIAL\s+OFFER\s*\n+([\s\S]*?)(?=\n\s*Date)/i);
  if (subtitleMatch) {
    data.machine_subtitle = subtitleMatch[1].trim();
  }

  // Price validity — "Prices valid for 30 days..."
  const validityMatch = text.match(/Prices?\s+valid\s+for\s+[^\n]+/i);
  if (validityMatch) data.price_validity = validityMatch[0].trim();

  // Machine description — line after "MACHINE SPECIFICATION" heading
  const specSection = text.match(/MACHINE\s+SPECIFICATION[S]?\s*\n+\s*(.+)/i);
  if (specSection) data.machine_description = specSection[1].trim();

  // Specifications — block between MACHINE SPECIFICATION and EQUIPMENT PRICING
  const specBlock = text.match(/MACHINE\s+SPECIFICATION[S]?[\s\S]*?(?=\nEQUIPMENT\s+PRICING|\nPRICING|$)/i);
  if (specBlock) {
    parseSpecsFromPlainText(specBlock[0], data);
  }

  // CRITICAL FIX: Pricing block regex — stop at "\nInk" on its own line,
  // NOT at "Installation" which appears mid-line in "Includes: ...Installation"
  const pricingBlock = text.match(/EQUIPMENT\s+PRICING[\s\S]*?(?=\nInk\s+Pric|\nTERMS|\nGENERAL\s+TERMS|$)/i);
  if (pricingBlock) {
    parsePricingFromPlainText(pricingBlock[0], data);
  }

  // Pricing note — line starting with * in the pricing block
  const noteMatch = text.match(/EQUIPMENT\s+PRICING[\s\S]*?(\*Ex\s+Works[^\n]*)/i);
  if (noteMatch) data.pricing_note = noteMatch[1].trim();

  // Ink pricing
  parseInkPrices(text, data);

  // Terms, Delivery & Payment section
  const termsBlock = text.match(/TERMS,?\s*DELIVERY[\s\S]*?(?=\nGENERAL\s+TERMS\s+AND\s+CONDITIONS\s+OF\s+SALE|$)/i);
  if (termsBlock) {
    parseDeliveryPayment(termsBlock[0], data);
  }
}

// ── Spec parser ────────────────────────────────────────────────────

/** Parse specs from ❖-delimited format (DOCX Machine Specification section) */
function parseSpecsFromPlainText(block: string, data: OfferData) {
  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

  // Check for ❖ markers first (DOCX format uses these)
  const hasMarkers = lines.some(l => l.startsWith("❖") || l.startsWith("*"));

  if (hasMarkers) {
    let currentSpec: Specification | null = null;
    for (const line of lines) {
      if (line.startsWith("❖") || (line.startsWith("*") && line.startsWith("* ") && /[A-Z]{3,}/.test(line))) {
        if (currentSpec) data.specifications.push(currentSpec);
        const name = line.replace(/^[❖*]\s*/, "").trim();
        currentSpec = { name, details: [] };
      } else if (currentSpec && !line.match(/^MACHINE\s+SPECIFICATION/i)) {
        currentSpec.details.push(line.replace(/^[—-]\s*/, ""));
      }
    }
    if (currentSpec) data.specifications.push(currentSpec);
    return;
  }

  // Fallback: Component name header detection
  const startIdx = lines.findIndex(l => /^Component[s]?$/i.test(l));
  const detailsIdx = lines.findIndex((l, i) => i > startIdx && /^Details?$/i.test(l));
  const begin = detailsIdx >= 0 ? detailsIdx + 1 : (startIdx >= 0 ? startIdx + 1 : 2);

  const COMPONENT_NAMES = [
    "PRINT HEAD", "PRINTHEAD", "ELECTRONIC", "ELECTRONICS",
    "WEB TRANSPORT", "WEB GUIDE", "UNWINDER", "UNWIND",
    "REWINDER", "REWIND UNIT", "REWIND", "INK DELIVERY", "INK SYSTEM",
    "RIP + SERVER", "RIP SERVER", "RIP", "COATING + DRYING", "COATING",
    "DRYING", "DRYER", "SHEETER", "SHEET CUTTER", "INLINE", "IN-LINE",
    "FINISHING", "LAMINATION", "POST-COATING", "POST COATING",
    "CORONA", "UV", "UV CURING", "SERVER", "COMPUTER",
  ];

  function isComponentName(line: string): boolean {
    const upper = line.toUpperCase();
    if (COMPONENT_NAMES.some(c => upper.startsWith(c))) return true;
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

// ── Pricing parser ─────────────────────────────────────────────────

function parsePricingFromPlainText(block: string, data: OfferData) {
  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
  const amountRe = /^[₹$]\s*[\d,]+|^Rs\.?\s*[\d,]+/;

  // Find TOTAL OFFER PRICE
  for (let i = 0; i < lines.length; i++) {
    if (/TOTAL\s+OFFER\s+PRICE/i.test(lines[i])) {
      const sameLine = lines[i].match(/[₹$]\s*[\d,]+|Rs\.?\s*[\d,]+/);
      if (sameLine) {
        data.total_price = parseAmount(sameLine[0]);
      } else {
        for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
          const amt = lines[j].match(/[₹$]\s*[\d,]+|Rs\.?\s*[\d,]+/);
          if (amt) { data.total_price = parseAmount(amt[0]); break; }
        }
      }
      break;
    }
  }

  // Parse GST line — "Additional GST @18%" followed by amount
  for (let i = 0; i < lines.length; i++) {
    const gstMatch = lines[i].match(/(?:Additional\s+)?GST\s*@?\s*(\d+%?)/i);
    if (gstMatch) {
      data.gst_rate = gstMatch[1].includes("%") ? gstMatch[1] : gstMatch[1] + "%";
      // Amount on same line or next line
      const sameAmt = lines[i].match(/[₹$]\s*[\d,]+|Rs\.?\s*[\d,]+/);
      if (sameAmt) {
        data.gst_amount = parseAmount(sameAmt[0]);
      } else if (i + 1 < lines.length) {
        const nextAmt = lines[i + 1].match(/[₹$]\s*[\d,]+|Rs\.?\s*[\d,]+/);
        if (nextAmt) data.gst_amount = parseAmount(nextAmt[0]);
      }
    }
  }

  // Strategy 1: Walk backwards from amount lines to find descriptions
  for (let i = 0; i < lines.length; i++) {
    if (!amountRe.test(lines[i])) continue;

    // Skip if this is the GST amount or TOTAL
    const prevLines = [lines[i - 1] || "", lines[i - 2] || ""];
    if (prevLines.some(l => /TOTAL|GST/i.test(l))) continue;
    // Also skip if the current amount was already captured as GST
    const price = parseAmount(lines[i]);
    if (price === data.gst_amount && data.gst_amount > 0) continue;

    // Walk back to find description (skip headers, numbers, amounts)
    let descParts: string[] = [];
    for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
      const l = lines[j];
      if (amountRe.test(l)) break; // hit another amount — stop
      if (/^(Sr|Particulars|Qty|Amount|No\.?|EQUIPMENT\s+PRICING)/i.test(l)) break;
      if (l.match(/^\d+$/) && l.length <= 2) continue; // skip serial numbers
      if (/^Amount\s*\([₹$]/i.test(l)) continue; // skip "Amount (₹)" header
      descParts.unshift(l);
    }

    const desc = descParts.join(" | ");
    if (desc && price > 0) {
      data.pricing_items.push({ description: desc, price });
    }
  }

  // Strategy 2: Inline "Description ... ₹Amount"
  if (data.pricing_items.length === 0) {
    const inlineRe = /^(.+?)\s+[₹$]\s*([\d,]+)\s*$/;
    const inlineRsRe = /^(.+?)\s+Rs\.?\s*([\d,]+)\s*$/;
    for (const line of lines) {
      if (/TOTAL|SUBTOTAL|PARTICULARS|GST/i.test(line)) continue;
      const m = line.match(inlineRe) || line.match(inlineRsRe);
      if (m) {
        const desc = m[1].trim().replace(/^\d+\.\s*/, "");
        const price = parseAmount(m[2]);
        if (desc && price > 0) data.pricing_items.push({ description: desc, price });
      }
    }
  }
}

// ── Ink price parser ───────────────────────────────────────────────

function parseInkPrices(text: string, data: OfferData) {
  if (data.ink_prices.length > 0) return;

  // Find the Ink Pricing section
  const inkSection = text.match(/Ink\s+Pric(?:ing|e)[\s\S]*?(?=\nTERMS|\nINSTALLATION|\nGENERAL|\nAdditional\s+GST|$)/i);
  if (!inkSection) return;

  const lines = inkSection[0].split("\n").map(l => l.trim()).filter(Boolean);

  // Check for ink note (GST on ink)
  for (const line of lines) {
    if (/Additional\s+GST.*ink/i.test(line)) {
      data.ink_note = line;
    }
  }

  // Parse ink items — look for description lines followed by price or "[Price on request]"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip headers
    if (/^Ink\s+(Pricing|Type|Price)/i.test(line)) continue;
    if (/^Price\s+per/i.test(line)) continue;
    if (/^Additional\s+GST/i.test(line)) continue;

    // Check if this is an ink description (Aqueous Ink, UV Ink, etc.)
    if (/Ink|Black|Cyan|Magenta|Yellow|CMY|Coated|Uncoated/i.test(line) && !/^Ink\s+Type/i.test(line)) {
      // Next non-empty line should be the price or "[Price on request]"
      const nextLine = (lines[i + 1] || "").trim();

      const amtMatch = nextLine.match(/[₹$]\s*[\d,]+|Rs\.?\s*[\d,]+/);
      if (amtMatch) {
        data.ink_prices.push({
          description: line,
          price: parseAmount(amtMatch[0]),
          price_text: amtMatch[0].trim(),
        });
        i++; // skip the price line
      } else if (/price\s+on\s+request/i.test(nextLine) || nextLine.startsWith("[")) {
        data.ink_prices.push({
          description: line,
          price: 0,
          price_text: nextLine.replace(/[[\]]/g, "").trim() || "Price on request",
        });
        i++;
      } else {
        // Price might be on same line
        const inlineAmt = line.match(/(.+?)\s+([₹$]\s*[\d,]+|Rs\.?\s*[\d,]+)\s*$/);
        if (inlineAmt) {
          data.ink_prices.push({
            description: inlineAmt[1].trim(),
            price: parseAmount(inlineAmt[2]),
            price_text: inlineAmt[2].trim(),
          });
        }
      }
    }
  }

  // Fallback: regex-based extraction
  if (data.ink_prices.length === 0) {
    const patterns: [RegExp, string][] = [
      [/Black(?:\s+Ink)?[\s\S]{0,50}?([₹$]\s*[\d,]+|Rs\.?\s*[\d,]+)/i, "Black Ink per ltr"],
      [/(?:Cyan|CMY|Colour)[\s\S]{0,80}?([₹$]\s*[\d,]+|Rs\.?\s*[\d,]+)/i, "Cyan, Magenta, Yellow per ltr"],
      [/Coated[\s\S]{0,100}?Ink[\s\S]{0,50}?([₹$]\s*[\d,]+|Rs\.?\s*[\d,]+)/i, "Coated Media HD Ink per ltr"],
    ];
    for (const [pat, desc] of patterns) {
      const match = text.match(pat);
      if (match) data.ink_prices.push({ description: desc, price: parseAmount(match[1]), price_text: match[1] });
    }
  }
}

// ── Delivery & Payment parser ──────────────────────────────────────

function parseDeliveryPayment(block: string, data: OfferData) {
  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Delivery terms — line after "Delivery" heading
    if (/^Delivery$/i.test(line) && i + 1 < lines.length) {
      data.delivery_terms = lines[i + 1];
    }

    // Payment terms — bullet lines after "Payment Terms" heading
    if (/^Payment\s+Terms$/i.test(line)) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith("•") || lines[j].startsWith("-") || lines[j].startsWith("*")) {
          data.payment_terms.push(lines[j].replace(/^[•\-*]\s*/, ""));
        } else if (data.payment_terms.length > 0) {
          break; // end of bullet list
        }
      }
    }

    // SECTION E format: "DELIVERY:" and "PAYMENT TERMS:"
    if (/^DELIVERY\s*:/i.test(line)) {
      const val = line.replace(/^DELIVERY\s*:\s*/i, "").trim();
      data.delivery_terms = val || (lines[i + 1] || "");
    }
    if (/^PAYMENT\s+TERMS\s*:/i.test(line)) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith("-") || lines[j].startsWith("*") || lines[j].startsWith("•")) {
          data.payment_terms.push(lines[j].replace(/^[-*•]\s*/, ""));
        } else if (data.payment_terms.length > 0) {
          break;
        }
      }
    }
  }
}

// ── PDF builder ─────────────────────────────────────────────────────

function tryReadFile(filePath: string): Uint8Array | null {
  try { return fs.readFileSync(filePath); }
  catch { return null; }
}

const RED = rgb(0.831, 0.169, 0.169);
const GREY_DARK = rgb(0.333, 0.333, 0.333);
const GREY_MED = rgb(0.467, 0.467, 0.467);
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const LINK_BLUE = rgb(0, 0.4, 0.8);
const DARK_BLUE = rgb(0, 0.2, 0.4);
const LIGHT_GREY = rgb(0.867, 0.867, 0.867);
const DOT_GREY = rgb(0.667, 0.667, 0.667);

function sanitize(text: string): string {
  let result = text
    .replace(/₹/g, "Rs.")
    .replace(/[❖◆◇♦♢]/g, "*")
    .replace(/[\u2013\u2014]/g, "-")     // en-dash, em-dash
    .replace(/[\u2018\u2019\u201B]/g, "'")  // curly single quotes
    .replace(/[\u201C\u201D\u201E]/g, '"')  // curly double quotes
    .replace(/\u2026/g, "...")            // ellipsis
    .replace(/\u00A0/g, " ");            // non-breaking space

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

async function embedImageSafe(doc: PDFDocument, filePath: string, type: "png" | "jpg"): Promise<PDFImage | null> {
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

  page.drawRectangle({ x: 45, y: PAGE_H - 80, width: 6, height: 60, color: GREY_DARK });
  page.drawRectangle({ x: 53, y: PAGE_H - 75, width: 6, height: 50, color: RED });

  let y = PAGE_H - 130;
  page.drawText(`Date : ${data.date}`, { x: 120, y, font: regular, size: 10, color: BLACK });
  page.drawText(`Proforma Invoice No. : ${data.proforma_no}`, { x: 120, y: y - 16, font: regular, size: 10, color: BLACK });

  y = PAGE_H - 310;
  page.drawText("Proposal for", { x: 100, y, font: regular, size: 24, color: GREY_MED });

  if (logoImage) {
    page.drawImage(logoImage, { x: 80, y: y - 80, width: 300, height: 43 });
  }

  const ySeries = y - 110;
  page.drawText(data.series, { x: 80, y: ySeries, font: bold, size: 20, color: RED });
  const seriesWidth = textWidth(bold, data.series + " ", 20);
  page.drawText("Digital Inkjet Press", { x: 80 + seriesWidth, y: ySeries, font: boldItalic, size: 20, color: GREY_DARK });

  // Machine subtitle below series name
  if (data.machine_subtitle) {
    const subtitleLines = data.machine_subtitle.split("\n").map(s => s.trim()).filter(Boolean);
    let ySub = ySeries - 28;
    for (const line of subtitleLines.slice(0, 3)) {
      page.drawText(line, { x: 80, y: ySub, font: regular, size: 10, color: GREY_DARK });
      ySub -= 14;
    }
  }

  const yCust = PAGE_H - 560;
  page.drawText("Proposal for:-", { x: 100, y: yCust, font: bold, size: 12, color: BLACK });
  page.drawText(`M/s. ${data.customer_name}`, { x: 100, y: yCust - 22, font: bold, size: 12, color: BLACK });

  if (data.customer_address) {
    const addrLines = data.customer_address.split("\n").slice(0, 3);
    for (let i = 0; i < addrLines.length; i++) {
      page.drawText(addrLines[i], { x: 100, y: yCust - 42 - i * 14, font: regular, size: 9, color: GREY_DARK });
    }
  }

  // Price validity notice
  if (data.price_validity) {
    page.drawText(data.price_validity, { x: 100, y: yCust - 90, font: regular, size: 8, color: RED });
  }

  page.drawRectangle({ x: PAGE_W - 100, y: 0, width: 100, height: 120, color: LIGHT_GREY });
  page.drawLine({ start: { x: PAGE_W - 50, y: 15 }, end: { x: PAGE_W - 15, y: 70 }, color: RED, thickness: 2 });
  page.drawLine({ start: { x: PAGE_W - 40, y: 10 }, end: { x: PAGE_W - 5, y: 65 }, color: RED, thickness: 2 });
  page.drawLine({ start: { x: PAGE_W - 30, y: 5 }, end: { x: PAGE_W + 5, y: 60 }, color: RED, thickness: 2 });
}

// ── Spec + Pricing pages (multi-page) ──────────────────────────────

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
  const CONTENT_WIDTH = RIGHT_MARGIN - 100;
  const DESC_MAX_WIDTH = CONTENT_WIDTH - 120;
  const pages: PDFPage[] = [];

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);

  if (images.pricingBg) {
    page.drawImage(images.pricingBg, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
  }

  // Dot grid
  const dotStartX = PAGE_W - 85;
  const dotStartY = PAGE_H - 15;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 10; col++) {
      page.drawCircle({ x: dotStartX + col * 8, y: dotStartY - row * 8, size: 1.8, color: DOT_GREY });
    }
  }

  function newPage(): PDFPage {
    const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    if (images.pricingBg) {
      p.drawImage(images.pricingBg, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    }
    return p;
  }

  // ── Machine Specification title ──
  if (images.specTitle) {
    page.drawImage(images.specTitle, { x: 55, y: PAGE_H - 75, width: 190, height: 52 });
  }

  let y = PAGE_H - 100;

  // Machine description (wrapped)
  if (data.machine_description) {
    const descLines = wrapText(bold, data.machine_description, 10, CONTENT_WIDTH - 60);
    for (const line of descLines) {
      page.drawText(line, { x: 160, y, font: bold, size: 10, color: BLACK });
      y -= 14;
    }
    y -= 8;
  }

  // ── Spec bullets ──
  for (const spec of data.specifications) {
    const detailHeight = spec.details.length * 10 + 16;
    if (y - detailHeight < PAGE_BOTTOM) {
      page = newPage();
      y = PAGE_H - 60;
    }

    const dSize = 2.5;
    page.drawRectangle({
      x: 168 - dSize, y: y + 3 - dSize,
      width: dSize * 2, height: dSize * 2,
      color: RED, rotate: degrees(45),
    });

    const nameWidth = textWidth(bold, spec.name, 8);
    page.drawText(spec.name, { x: 180, y, font: bold, size: 8, color: BLACK });
    page.drawLine({ start: { x: 180, y: y - 1.5 }, end: { x: 180 + nameWidth, y: y - 1.5 }, color: BLACK, thickness: 0.5 });
    y -= 12;

    for (const detail of spec.details) {
      if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
      const detailLines = wrapText(regular, detail, 7, CONTENT_WIDTH - 85);
      for (const dl of detailLines) {
        page.drawText(dl, { x: 185, y, font: regular, size: 7, color: GREY_DARK });
        y -= 10;
        if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
      }
    }
    y -= 4;
  }

  // ── Equipment Pricing ──
  y -= 30;
  if (y < PAGE_BOTTOM + 100) { page = newPage(); y = PAGE_H - 60; }

  if (images.pricingTitle) {
    page.drawImage(images.pricingTitle, { x: PAGE_W - 260, y: y + 5, width: 190, height: 55 });
  }
  y -= 20;

  // Pricing lines
  for (const item of data.pricing_items) {
    const descLines = wrapText(bold, item.description, 9, DESC_MAX_WIDTH);
    const lineHeight = descLines.length * 13;

    if (y - lineHeight < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }

    const firstLineY = y;
    for (let i = 0; i < descLines.length; i++) {
      page.drawText(descLines[i], { x: 100, y, font: bold, size: 9, color: BLACK });
      if (i < descLines.length - 1) y -= 13;
    }

    if (item.price > 0) {
      const priceStr = fmtPrice(item.price, data.currency);
      const priceW = textWidth(bold, priceStr, 9);
      page.drawText(priceStr, { x: RIGHT_MARGIN - priceW, y: firstLineY, font: bold, size: 9, color: BLACK });
    }
    y -= 15;
  }

  // GST line
  if (data.gst_amount > 0) {
    if (y < PAGE_BOTTOM + 20) { page = newPage(); y = PAGE_H - 60; }
    const gstDesc = `Additional GST @${data.gst_rate || "18%"}`;
    page.drawText(gstDesc, { x: 100, y, font: bold, size: 9, color: RED });
    const gstStr = fmtPrice(data.gst_amount, data.currency);
    const gstW = textWidth(bold, gstStr, 9);
    page.drawText(gstStr, { x: RIGHT_MARGIN - gstW, y, font: bold, size: 9, color: RED });
    y -= 15;
  }

  // Total price line
  if (data.total_price) {
    if (y < PAGE_BOTTOM + 20) { page = newPage(); y = PAGE_H - 60; }
    y -= 3;
    page.drawLine({ start: { x: 100, y: y + 8 }, end: { x: RIGHT_MARGIN, y: y + 8 }, color: BLACK, thickness: 0.5 });
    page.drawText("TOTAL OFFER PRICE", { x: 100, y, font: bold, size: 10, color: BLACK });
    const totalStr = fmtPrice(data.total_price, data.currency);
    const totalW = textWidth(bold, totalStr, 10);
    page.drawText(totalStr, { x: RIGHT_MARGIN - totalW, y, font: bold, size: 10, color: BLACK });
    page.drawLine({ start: { x: 100, y: y - 4 }, end: { x: RIGHT_MARGIN, y: y - 4 }, color: BLACK, thickness: 0.5 });
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

  // ── Ink Pricing ──
  if (data.ink_prices.length > 0) {
    if (y < PAGE_BOTTOM + 60) { page = newPage(); y = PAGE_H - 60; }
    y -= 5;
    page.drawText("Ink Price :-", { x: 100, y, font: bold, size: 9, color: BLACK });
    y -= 16;
    for (const ink of data.ink_prices) {
      if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
      const inkDescLines = wrapText(regular, ink.description, 8.5, DESC_MAX_WIDTH);
      const firstY = y;
      for (let i = 0; i < inkDescLines.length; i++) {
        page.drawText(inkDescLines[i], { x: 100, y, font: regular, size: 8.5, color: BLACK });
        if (i < inkDescLines.length - 1) y -= 12;
      }
      // Show price or "Price on request" text
      if (ink.price > 0) {
        const inkStr = fmtPrice(ink.price, data.currency);
        const inkW = textWidth(regular, inkStr, 8.5);
        page.drawText(inkStr, { x: RIGHT_MARGIN - inkW, y: firstY, font: regular, size: 8.5, color: BLACK });
      } else if (ink.price_text) {
        const txtW = textWidth(regular, ink.price_text, 8.5);
        page.drawText(ink.price_text, { x: RIGHT_MARGIN - txtW, y: firstY, font: regular, size: 8.5, color: GREY_MED });
      }
      y -= 14;
    }
    // Ink note
    if (data.ink_note) {
      page.drawText(data.ink_note, { x: 100, y, font: regular, size: 7, color: GREY_DARK });
      y -= 14;
    }
  }

  // ── Delivery & Payment Terms ──
  if (data.delivery_terms || data.payment_terms.length > 0) {
    if (y < PAGE_BOTTOM + 80) { page = newPage(); y = PAGE_H - 60; }
    y -= 15;

    if (data.delivery_terms) {
      page.drawText("Delivery:", { x: 100, y, font: bold, size: 8.5, color: BLACK });
      y -= 13;
      const deliveryLines = wrapText(regular, data.delivery_terms, 8, CONTENT_WIDTH);
      for (const line of deliveryLines) {
        page.drawText(line, { x: 100, y, font: regular, size: 8, color: BLACK });
        y -= 11;
      }
      y -= 6;
    }

    if (data.payment_terms.length > 0) {
      page.drawText("Payment Terms:", { x: 100, y, font: bold, size: 8.5, color: BLACK });
      y -= 13;
      for (const term of data.payment_terms) {
        if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
        const termLines = wrapText(regular, `- ${term}`, 8, CONTENT_WIDTH);
        for (const line of termLines) {
          page.drawText(line, { x: 100, y, font: regular, size: 8, color: BLACK });
          y -= 11;
        }
      }
      y -= 6;
    }
  }

  // ── Installation terms ──
  if (data.installation_terms) {
    if (y < PAGE_BOTTOM + 40) { page = newPage(); y = PAGE_H - 60; }
    y -= 10;
    page.drawText("Installation:", { x: 100, y, font: bold, size: 8.5, color: BLACK });
    y -= 13;
    const lines = wrapText(regular, data.installation_terms, 8, CONTENT_WIDTH);
    for (const line of lines) {
      if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
      page.drawText(line, { x: 100, y, font: regular, size: 8, color: BLACK });
      y -= 11;
    }
  }

  // ── Service commitment ──
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

  // ── T&C links ──
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

  // ── Full General Terms and Conditions of Sale ──
  if (data.general_terms) {
    page = newPage();
    y = PAGE_H - 60;

    // Render dense legal text paragraph by paragraph
    const paragraphs = data.general_terms.split(/\n\n+/);
    const TC_FONT_SIZE = 6.5;
    const TC_LINE_HEIGHT = 9;
    const TC_HEADING_SIZE = 10;

    for (let pi = 0; pi < paragraphs.length; pi++) {
      const para = paragraphs[pi].trim();
      if (!para) continue;

      // Detect heading lines (ALL CAPS, short)
      const isHeading = /^[A-Z\s&,]+$/.test(para) && para.length < 80;

      if (isHeading) {
        if (y < PAGE_BOTTOM + 30) { page = newPage(); y = PAGE_H - 60; }
        y -= 14;
        page.drawText(para, { x: 100, y, font: bold, size: TC_HEADING_SIZE, color: DARK_BLUE });
        y -= 6;
      } else {
        // Wrap and render paragraph as flowing text
        const lines = wrapText(regular, para.replace(/\s+/g, " "), TC_FONT_SIZE, CONTENT_WIDTH);
        for (const line of lines) {
          if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
          page.drawText(line, { x: 100, y, font: regular, size: TC_FONT_SIZE, color: BLACK });
          y -= TC_LINE_HEIGHT;
        }
        y -= 3; // paragraph spacing
      }
    }
  }

  // ── WARRANTY STATEMENT ──
  if (data.warranty_statement) {
    if (y < PAGE_BOTTOM + 40) { page = newPage(); y = PAGE_H - 60; }

    const paragraphs = data.warranty_statement.split(/\n\n+/);
    const TC_FONT_SIZE = 6.5;
    const TC_LINE_HEIGHT = 9;

    for (const para of paragraphs) {
      const text = para.trim();
      if (!text) continue;

      const isHeading = /^[A-Z\s&,]+$/.test(text) && text.length < 80;

      if (isHeading) {
        if (y < PAGE_BOTTOM + 30) { page = newPage(); y = PAGE_H - 60; }
        y -= 14;
        page.drawText(text, { x: 100, y, font: bold, size: 10, color: DARK_BLUE });
        y -= 6;
      } else {
        const lines = wrapText(regular, text.replace(/\s+/g, " "), TC_FONT_SIZE, CONTENT_WIDTH);
        for (const line of lines) {
          if (y < PAGE_BOTTOM) { page = newPage(); y = PAGE_H - 60; }
          page.drawText(line, { x: 100, y, font: regular, size: TC_FONT_SIZE, color: BLACK });
          y -= TC_LINE_HEIGHT;
        }
        y -= 3;
      }
    }
  }

  // ── Thank You page ──
  {
    page = newPage();
    y = PAGE_H - 200;

    page.drawText("THANK YOU", { x: 100, y, font: bold, size: 24, color: DARK_BLUE });
    y -= 40;
    page.drawText("We look forward to a successful partnership.", { x: 100, y, font: regular, size: 12, color: DARK_BLUE });
    y -= 50;
    page.drawText("THE PRINTERS HOUSE PRIVATE LIMITED", { x: 100, y, font: bold, size: 10, color: BLACK });
    y -= 16;
    page.drawText("22/1, Mathura Road, Ballabgarh, Sikri Industrial Area, Faridabad, Haryana - 121004", { x: 100, y, font: regular, size: 9, color: BLACK });
    y -= 14;
    page.drawText("www.tphorient.com", { x: 100, y, font: regular, size: 9, color: LINK_BLUE });
  }

  return pages;
}

// ── Main PDF generator ─────────────────────────────────────────────

export async function generateOfferPdf(rawData: OfferData): Promise<Uint8Array> {
  const warnings = auditParsedData(rawData);
  if (warnings.missing.length > 0) {
    console.warn(`[Offer PDF] ${warnings.missing.length} missing field(s) — PDF may be incomplete`);
  }

  const data: OfferData = {
    ...rawData,
    series: sanitize(rawData.series),
    date: sanitize(rawData.date),
    proforma_no: sanitize(rawData.proforma_no),
    customer_name: sanitize(rawData.customer_name),
    customer_address: sanitize(rawData.customer_address),
    machine_description: sanitize(rawData.machine_description),
    machine_subtitle: sanitize(rawData.machine_subtitle),
    pricing_note: sanitize(rawData.pricing_note),
    ink_note: sanitize(rawData.ink_note),
    installation_terms: sanitize(rawData.installation_terms),
    service_commitment: sanitize(rawData.service_commitment),
    delivery_terms: sanitize(rawData.delivery_terms),
    payment_terms: rawData.payment_terms.map(sanitize),
    price_validity: sanitize(rawData.price_validity),
    general_terms: sanitize(rawData.general_terms),
    warranty_statement: sanitize(rawData.warranty_statement),
    thank_you: sanitize(rawData.thank_you),
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
      price_text: sanitize(i.price_text),
    })),
  };

  const isLP = data.series.toUpperCase().includes("L&P") || data.series.toUpperCase().includes("L & P");
  const seriesDir = isLP ? "lp_series" : "cseries";
  const templatePath = isLP
    ? path.join(ASSETS_BASE, "lp_series", "24080A_template.pdf")
    : path.join(ASSETS_BASE, "cseries", "25126_template.pdf");

  const templateBytes = fs.readFileSync(templatePath);
  const templateDoc = await PDFDocument.load(templateBytes);
  const templatePageCount = templateDoc.getPageCount();

  const pdfDoc = await PDFDocument.create();

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const boldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const brandDir = path.join(ASSETS_BASE, seriesDir);
  const logoImage = await embedImageSafe(pdfDoc, path.join(brandDir, "image6.png"), "png");
  const pricingBg = await embedImageSafe(pdfDoc, path.join(brandDir, "image18.jpg"), "jpg");
  const specTitle = await embedImageSafe(pdfDoc, path.join(brandDir, "image16.jpeg"), "jpg");
  const pricingTitle = await embedImageSafe(pdfDoc, path.join(brandDir, "image19.jpeg"), "jpg");

  // Page 1: Cover
  const coverPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawCoverPage(coverPage, data, { regular, bold, boldItalic }, logoImage);

  // Boilerplate pages from template (skip first and last)
  if (templatePageCount > 2) {
    const indices = Array.from({ length: templatePageCount - 2 }, (_, i) => i + 1);
    const copiedPages = await pdfDoc.copyPages(templateDoc, indices);
    for (const copied of copiedPages) {
      pdfDoc.addPage(copied);
    }
  }

  // Spec + Pricing pages
  drawSpecAndPricing(pdfDoc, data, { regular, bold }, { pricingBg, specTitle, pricingTitle });

  return pdfDoc.save();
}
