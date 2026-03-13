#!/usr/bin/env node
/**
 * Orient Jet Branded Offer — DOCX Generator
 *
 * Generates a branded proposal DOCX matching the real offer template format.
 * Converts to PDF via LibreOffice.
 *
 * Usage:
 *   node generate_offer_docx.js input.txt                # Parse + generate DOCX + PDF
 *   node generate_offer_docx.js input.txt -o output       # Custom output name (no extension)
 *   node generate_offer_docx.js input.txt --docx-only     # Skip PDF conversion
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, PageBreak, SectionType,
  BorderStyle, WidthType, ShadingType, TabStopType, TabStopPosition,
  HeadingLevel, ExternalHyperlink, VerticalAlign
} = require("docx");

// ── PATHS (relative to this script) ─────────────────────────────
const SCRIPT_DIR = __dirname;
const ASSETS_DIR = path.join(SCRIPT_DIR, "template_assets", "boilerplate_pages");
const BRAND_DIR = path.join(SCRIPT_DIR, "template_assets", "cseries");

// A4 in DXA: 11906 x 16838
const A4_W = 11906;
const A4_H = 16838;

// ── CURRENCY FORMATTING ────────────────────────────────────────────
function fmtINR(amount) {
  if (!amount || amount === 0) return "";
  const s = Math.round(amount).toString();
  if (s.length <= 3) return `\u20B9 ${s}`;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  const parts = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `\u20B9 ${parts.join(",")},${last3}`;
}

function fmtUSD(amount) {
  if (!amount || amount === 0) return "";
  return `$ ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(amount, currency) {
  return currency === "USD" ? fmtUSD(amount) : fmtINR(amount);
}

// ── TEXT PARSER ─────────────────────────────────────────────────────
function parseAmount(s) {
  if (!s) return 0;
  s = s.replace(/[₹$\s,*]/g, "");
  if (!s || s === "-") return 0;
  return s.includes(".") ? parseFloat(s) : parseInt(s, 10);
}

function parseClaudeOutput(text) {
  const data = {
    series: "C SERIES", date: "", proforma_no: "", customer_name: "[Customer Name]",
    customer_address: "[Address]", order_type: "DOMESTIC", machine_description: "",
    specifications: [], pricing_items: [], pricing_note: "", ink_prices: [],
    installation_terms: "", service_commitment: "", currency: "INR"
  };

  // Section A: Cover
  const tick3 = "\x60\x60\x60";
  const coverRe = new RegExp("SECTION\\s*A[\\s\\S]*?" + tick3 + "\\s*([\\s\\S]*?)" + tick3, "i");
  const coverBlock = text.match(coverRe);
  if (coverBlock) {
    const b = coverBlock[1];
    const m = (k) => { const r = b.match(new RegExp(`${k}\\s*:\\s*(.+)`, "i")); return r ? r[1].trim() : ""; };
    data.series = m("SERIES") || data.series;
    data.date = m("DATE");
    data.proforma_no = m("PROFORMA_NO");
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
        details: details.trim().split(";").map(d => d.trim()).filter(Boolean)
      });
    }
  }

  // Section C: Pricing
  const sectionC = text.match(/SECTION\s*C[\s\S]*?(?=SECTION\s*D|$)/i);
  if (sectionC) {
    const c = sectionC[0];
    const rows = [...c.matchAll(/\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/g)];
    for (const [, sr, desc, qty, amt] of rows) {
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
    const inkPatterns = [
      [/Uncoated\s+Media\s+per\s+ltr\s+for\s+Black\s*:?\s*([₹$]\s*[\d,]+)/i, "Uncoated Media per ltr for Black"],
      [/Uncoated\s+Media\s+per\s+ltr\s+for\s+Cyan.*?Yellow\s*:?\s*([₹$]\s*[\d,]+)/i, "Uncoated Media per ltr for Cyan, Magenta, Yellow"],
      [/Coated\s+Media\s+HD\s+Ink\s+per\s+ltr\s*:?\s*([₹$]\s*[\d,]+)/i, "Coated Media HD Ink per ltr"]
    ];
    for (const [pat, desc] of inkPatterns) {
      const m = c.match(pat);
      if (m) data.ink_prices.push({ description: desc, price: parseAmount(m[1]) });
    }

    // Installation terms
    const installMatch = c.match(/(Installation\s*:\s*By\s+Factory.*?Engineers\.)/is);
    if (installMatch) data.installation_terms = installMatch[1].trim();

  }

  // Service commitment (full text search)
  const svcMatch = text.match(/(We\s+commit\s+to\s+providing\s+exceptional\s+service.*?cost\.)/is);
  if (svcMatch) data.service_commitment = svcMatch[1].trim();

  return data;
}

// ── DOCUMENT BUILDER ───────────────────────────────────────────────
function buildCoverSection(data) {
  const children = [];

  // Top spacing
  children.push(new Paragraph({ spacing: { before: 600 }, children: [] }));

  // Date and Proforma
  children.push(new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: `Date : ${data.date}`, font: "Arial", size: 20, color: "333333" })]
  }));
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: `Proforma Invoice No. : ${data.proforma_no}`, font: "Arial", size: 20, color: "333333" })]
  }));

  // Large spacing before "Proposal for"
  children.push(new Paragraph({ spacing: { before: 2400 }, children: [] }));

  // "Proposal for" heading
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: "Proposal for", font: "Arial", size: 48, color: "777777" })]
  }));

  // OrientJet logo
  const logoPath = path.join(BRAND_DIR, "image6.png");
  if (fs.existsSync(logoPath)) {
    children.push(new Paragraph({
      spacing: { after: 100 },
      children: [new ImageRun({
        type: "png",
        data: fs.readFileSync(logoPath),
        transformation: { width: 380, height: 54 },
        altText: { title: "OrientJet Logo", description: "OrientJet C-Series Logo", name: "logo" }
      })]
    }));
  }

  // Series name
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: data.series + " ", font: "Arial", size: 40, bold: true, color: "D42B2B" }),
      new TextRun({ text: "Digital Inkjet Press", font: "Arial", size: 40, bold: true, italics: true, color: "555555" })
    ]
  }));

  // Large spacing before customer
  children.push(new Paragraph({ spacing: { before: 2400 }, children: [] }));

  // "Proposal for:-"
  children.push(new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: "Proposal for:-", font: "Arial", size: 24, bold: true, color: "000000" })]
  }));

  // Customer name
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: `M/s. ${data.customer_name}`, font: "Arial", size: 24, bold: true, color: "000000" })]
  }));

  // Customer address
  if (data.customer_address) {
    const addrLines = data.customer_address.split("\n");
    for (const line of addrLines.slice(0, 3)) {
      children.push(new Paragraph({
        spacing: { after: 30 },
        children: [new TextRun({ text: line, font: "Arial", size: 18, color: "555555" })]
      }));
    }
  }

  return {
    properties: {
      page: {
        size: { width: A4_W, height: A4_H },
        margin: { top: 720, right: 1080, bottom: 720, left: 1440 }
      }
    },
    children
  };
}

function buildBoilerplateSection(pageNum) {
  const imgPath = path.join(ASSETS_DIR, `page_${pageNum}.png`);
  if (!fs.existsSync(imgPath)) {
    return {
      properties: {
        page: {
          size: { width: A4_W, height: A4_H },
          margin: { top: 0, right: 0, bottom: 0, left: 0 }
        }
      },
      children: [new Paragraph({ children: [new TextRun({ text: `[Boilerplate page ${pageNum}]`, font: "Arial", size: 24 })] })]
    };
  }

  // A4 at ~96dpi for DOCX rendering: ~794 x 1123 pixels
  // But we want high res image, so use actual image dimensions scaled to A4
  return {
    properties: {
      page: {
        size: { width: A4_W, height: A4_H },
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      }
    },
    children: [
      new Paragraph({
        children: [new ImageRun({
          type: "png",
          data: fs.readFileSync(imgPath),
          transformation: { width: 595, height: 842 }, // A4 in points
          altText: { title: `Page ${pageNum}`, description: `Boilerplate page ${pageNum}`, name: `page${pageNum}` }
        })]
      })
    ]
  };
}

function buildPricingSection(data) {
  const children = [];
  const RED = "D42B2B";
  const GREY = "555555";

  // "Machine Specification" title
  const specTitlePath = path.join(BRAND_DIR, "image16.jpeg");
  if (fs.existsSync(specTitlePath)) {
    children.push(new Paragraph({
      spacing: { after: 200 },
      children: [new ImageRun({
        type: "jpg",
        data: fs.readFileSync(specTitlePath),
        transformation: { width: 220, height: 60 },
        altText: { title: "Machine Specification", description: "Machine Specification Title", name: "specTitle" }
      })]
    }));
  } else {
    children.push(new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: "Machine Specification", font: "Arial", size: 36, bold: true, color: GREY })]
    }));
  }

  // Machine description
  children.push(new Paragraph({
    spacing: { after: 200 },
    indent: { left: 1440 },
    children: [new TextRun({ text: data.machine_description, font: "Arial", size: 20, bold: true })]
  }));

  // Spec bullets
  for (const spec of data.specifications) {
    // Spec name with diamond bullet
    children.push(new Paragraph({
      spacing: { before: 120, after: 40 },
      indent: { left: 1800 },
      children: [
        new TextRun({ text: "\u2756 ", font: "Arial", size: 14, color: RED }),
        new TextRun({ text: spec.name, font: "Arial", size: 16, bold: true, underline: {} })
      ]
    }));

    // Spec details
    for (const detail of spec.details) {
      children.push(new Paragraph({
        spacing: { after: 20 },
        indent: { left: 2160 },
        children: [new TextRun({ text: detail, font: "Arial", size: 14, color: GREY })]
      }));
    }
  }

  // Spacing before pricing
  children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));

  // "Equipment Pricing" title
  const pricingTitlePath = path.join(BRAND_DIR, "image19.jpeg");
  if (fs.existsSync(pricingTitlePath)) {
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [new ImageRun({
        type: "jpg",
        data: fs.readFileSync(pricingTitlePath),
        transformation: { width: 200, height: 55 },
        altText: { title: "Equipment Pricing", description: "Equipment Pricing Title", name: "pricingTitle" }
      })]
    }));
  } else {
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [new TextRun({ text: "Equipment Pricing", font: "Arial", size: 36, bold: true, color: GREY })]
    }));
  }

  // Pricing lines
  for (const item of data.pricing_items) {
    children.push(new Paragraph({
      spacing: { after: 60 },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [
        new TextRun({ text: item.description, font: "Arial", size: 18, bold: true }),
        new TextRun({ text: `\t${fmtPrice(item.price, data.currency)}`, font: "Arial", size: 18, bold: true })
      ]
    }));
  }

  // Total line
  if (data.total_price) {
    children.push(new Paragraph({
      spacing: { before: 80, after: 80 },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "000000" } },
      children: [
        new TextRun({ text: "TOTAL OFFER PRICE", font: "Arial", size: 20, bold: true }),
        new TextRun({ text: `\t${fmtPrice(data.total_price, data.currency)}`, font: "Arial", size: 20, bold: true })
      ]
    }));
  }

  // Pricing note
  if (data.pricing_note) {
    children.push(new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: `*${data.pricing_note}`, font: "Arial", size: 16, bold: true })]
    }));
  }

  // Ink pricing
  if (data.ink_prices.length > 0) {
    children.push(new Paragraph({
      spacing: { before: 100, after: 80 },
      children: [new TextRun({ text: "Ink Price :-", font: "Arial", size: 18, bold: true })]
    }));
    for (const ink of data.ink_prices) {
      children.push(new Paragraph({
        spacing: { after: 40 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: ink.description, font: "Arial", size: 17 }),
          new TextRun({ text: `\t${fmtPrice(ink.price, data.currency)}`, font: "Arial", size: 17 })
        ]
      }));
    }
  }

  // Installation terms
  if (data.installation_terms) {
    children.push(new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [new TextRun({ text: data.installation_terms, font: "Arial", size: 16, bold: true })]
    }));
  }

  // Service commitment
  if (data.service_commitment) {
    children.push(new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [new TextRun({ text: data.service_commitment, font: "Arial", size: 16, bold: true })]
    }));
  }

  // T&C reference
  children.push(new Paragraph({
    spacing: { before: 200, after: 40 },
    children: [
      new TextRun({ text: "General Terms and Conditions ", font: "Arial", size: 16, bold: true }),
      new TextRun({ text: "are applicable as published on", font: "Arial", size: 15 })
    ]
  }));
  children.push(new Paragraph({
    spacing: { after: 40 },
    children: [
      new ExternalHyperlink({
        children: [new TextRun({ text: "www.tphorient.com", font: "Arial", size: 14, color: "0066CC", underline: {} })],
        link: "https://www.tphorient.com"
      }),
      new TextRun({ text: " website on the following link", font: "Arial", size: 14 })
    ]
  }));
  children.push(new Paragraph({
    spacing: { after: 40 },
    children: [
      new ExternalHyperlink({
        children: [new TextRun({ text: "https://tphorient.com/assets/pdf/domestic.pdf", font: "Arial", size: 14, color: "0066CC", underline: {} })],
        link: "https://tphorient.com/assets/pdf/domestic.pdf"
      }),
      new TextRun({ text: " for orders in India", font: "Arial", size: 14 })
    ]
  }));
  children.push(new Paragraph({
    spacing: { after: 40 },
    children: [
      new ExternalHyperlink({
        children: [new TextRun({ text: "https://tphorient.com/assets/pdf/International.pdf", font: "Arial", size: 14, color: "0066CC", underline: {} })],
        link: "https://tphorient.com/assets/pdf/International.pdf"
      }),
      new TextRun({ text: " for orders outside of India.", font: "Arial", size: 14 })
    ]
  }));

  // Thank You
  children.push(new Paragraph({ spacing: { before: 600 }, children: [] }));
  children.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: "THANK YOU", font: "Arial", size: 48, bold: true, color: "DDDDDD" })]
  }));

  return {
    properties: {
      page: {
        size: { width: A4_W, height: A4_H },
        margin: { top: 720, right: 1080, bottom: 720, left: 1080 }
      }
    },
    children
  };
}

async function generateOffer(data, outputBase) {
  const sections = [
    buildCoverSection(data),
    buildBoilerplateSection(2),  // About Us
    buildBoilerplateSection(3),  // Orient Jet intro
    buildBoilerplateSection(4),  // Client logos
    buildBoilerplateSection(5),  // C-Series schematic
    buildBoilerplateSection(6),  // Tech specs 1
    buildBoilerplateSection(7),  // Tech specs 2
    buildPricingSection(data),
  ];

  const doc = new Document({ sections });
  const buffer = await Packer.toBuffer(doc);

  const docxPath = outputBase + ".docx";
  fs.writeFileSync(docxPath, buffer);
  console.log(`DOCX generated: ${docxPath}`);

  return docxPath;
}

function convertToPDF(docxPath) {
  const dir = path.dirname(docxPath);
  // Try multiple paths for the soffice wrapper
  // Locate the soffice wrapper script (Cowork sessions mount skills at varying paths)
  let sofficeScript = null;
  const candidatePaths = [
    // Standard Cowork skills location pattern
    ...(() => {
      try {
        const sessionDir = execSync("echo /sessions/*/mnt/.skills/skills/docx/scripts/office/soffice.py", { timeout: 2000 }).toString().trim();
        return sessionDir.includes("*") ? [] : [sessionDir];
      } catch (e) { return []; }
    })(),
    path.resolve(SCRIPT_DIR, "..", "..", ".skills", "skills", "docx", "scripts", "office", "soffice.py"),
    path.resolve(SCRIPT_DIR, "..", ".skills", "skills", "docx", "scripts", "office", "soffice.py"),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) { sofficeScript = p; break; }
  }

  let converted = false;

  // Try soffice.py wrapper first (handles sandboxed environments)
  if (sofficeScript) {
    try {
      execSync(`python3 "${sofficeScript}" --headless --convert-to pdf "${docxPath}"`, {
        timeout: 60000, stdio: "pipe"
      });
      converted = true;
    } catch (e) { /* try fallback */ }
  }

  // Fallback: direct soffice command
  if (!converted) {
    try {
      execSync(`soffice --headless --convert-to pdf "${docxPath}" --outdir "${dir}"`, {
        timeout: 60000, stdio: "pipe"
      });
      converted = true;
    } catch (e) {
      console.error("PDF conversion failed. Open the .docx file in Word and export to PDF.");
      return null;
    }
  }

  const pdfPath = docxPath.replace(/\.docx$/, ".pdf");
  if (fs.existsSync(pdfPath)) {
    console.log(`PDF generated: ${pdfPath}`);
    return pdfPath;
  }
  return null;
}

// ── CLI ────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Orient Jet Offer Generator — DOCX + PDF

Usage:
  node generate_offer_docx.js input.txt              # Generate DOCX + PDF
  node generate_offer_docx.js input.txt -o MyOffer    # Custom output name
  node generate_offer_docx.js input.txt --docx-only   # DOCX only, no PDF

Input: Structured text output (Sections A-E) from the Claude Enterprise Project.
`);
    process.exit(0);
  }

  const inputPath = args[0];
  const docxOnly = args.includes("--docx-only");

  let outputBase;
  const oIdx = args.indexOf("-o");
  if (oIdx !== -1 && args[oIdx + 1]) {
    outputBase = args[oIdx + 1].replace(/\.(docx|pdf)$/, "");
  } else {
    outputBase = inputPath.replace(/\.(txt|md)$/, "") + "_Offer";
  }

  // Read and parse
  const text = fs.readFileSync(inputPath, "utf-8");
  const data = parseClaudeOutput(text);

  console.log(`\nParsed offer data:`);
  console.log(`  Series: ${data.series}`);
  console.log(`  Customer: ${data.customer_name}`);
  console.log(`  Currency: ${data.currency}`);
  console.log(`  Specs: ${data.specifications.length} sections`);
  console.log(`  Pricing: ${data.pricing_items.length} line items`);
  if (data.total_price) console.log(`  Total: ${fmtPrice(data.total_price, data.currency)}`);

  // Generate DOCX
  const docxPath = await generateOffer(data, outputBase);

  // Convert to PDF
  if (!docxOnly) {
    console.log("\nConverting to PDF...");
    convertToPDF(docxPath);
  }
}

main().catch(console.error);
