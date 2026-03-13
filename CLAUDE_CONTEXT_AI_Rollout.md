# Claude Context: AI Integration Rollout — The Printers Houst Pvt. Ltd.
## Last Updated: March 13, 2026 (V2.2 — Branded Offer PDF Generator complete)

> **Purpose**: Drop this file into any Claude Project or Cowork session to give Claude full context on the AI rollout. It covers architecture decisions, use case mappings, dependencies, and current status.

---

## Company Profile
- **Company**: The Printers Houst Private Limited
- **Industry**: Commercial/Industrial Printing Equipment Manufacturing
- **Director**: Rishab Kohli
- **ERP**: Custom-built (not Tally/SAP/Odoo) — MCP connector must be purpose-built
- **Claude Plan**: Enterprise (all employees get accounts)

---

## Architecture Decisions

### Structure: ~18 Functional Projects (not 7 department-level)
The original proposal was 1 Project per department. We recommend splitting into **18 functional Projects** grouped by workflow cluster. Reason: use cases within the same department often need very different context windows. For example, Marketing's "Offer Creation" needs a pricing database while "SEO Workflow" needs web search and keyword data — these shouldn't share the same Project instructions.

### Skills Are Workspace-Level
Skills (Cowork desktop) cannot be "attached to" a specific Project. They're available across all Projects for that user. Reference skills in each Project's system instructions (e.g., "Use the pptx skill to generate presentations"). This is a workaround, not a limitation — it works well in practice.

### Productization Path
- **Phase 1 (Now)**: Claude Enterprise Projects + Cowork Skills → internal pilot
- **Phase 2 (Later)**: Claude API + Agent SDK → productized solution for other printing companies
- Validate which use cases deliver real ROI internally before rebuilding as API agents

---

## 4-Tier Phased Rollout

| Tier | Use Cases | Timeline | What's Needed |
|------|-----------|----------|---------------|
| **T1: Quick Wins** | 14 | Week 1-4 | Project instructions + knowledge files only |
| **T2: Cowork Skills** | 14 | Month 2-3 | Cowork desktop with PPTX/XLSX/DOCX/PDF skills |
| **T3: ERP Integration** | 14 | Month 3-6 | Custom ERP MCP connector (dev sprint) |
| **T4: Advanced AI** | 7 | Month 6+ | AutoCAD scripting, image gen, IoT, Travel APIs |

---

## Complete Use Case Mapping by Department

### 1. Marketing & Sales (12 use cases)

| # | Use Case | Tier | Skill / Approach | Notes |
|---|----------|------|-----------------|-------|
| 1 | Offer Creation with Pricing | T2 | sales:create-an-asset + docx/pdf | Needs pricing DB as knowledge file |
| 2 | Instant Price Generator | T1 | Custom Pricing Calculator skill | Calculator logic in instructions |
| 3 | Configuration Suggestor | T1 | Custom skill | Product recommendation engine |
| 4 | Report Writer + CRM Update | T3 | sales:pipeline-review (partial) | Needs CRM/ERP MCP connector |
| 5 | Presentation Generation | T2 | pptx skill | Works with company template |
| 6 | Auto Email Writing | T1 | sales:draft-outreach | Needs company tone customization |
| 7 | SEO Workflow | T2 | marketing:seo-audit | Needs domain-specific keywords |
| 8 | Meta/Google Ad Management | T3 | marketing:campaign-plan (strategy only) | No ad platform API integration |
| 9 | Image & Video Generation | T4 | External (DALL-E/Midjourney/Runway) | Separate subscriptions needed |
| 10 | Order Projections | T3 | sales:forecast (partial) | Needs ERP data feed |
| 11 | Auto Sales Follow-Up (V2) | T3 | sales:pipeline-review + sales:draft-outreach | CRM-triggered follow-up sequences |
| 12 | Outbound Enquiry Generation (V2) | T3 | sales:account-research + sales:draft-outreach (partial) | Needs IndiaMart/LinkedIn data; custom Outbound Enquiry Pipeline skill |

### 2. Design (5 use cases)

| # | Use Case | Tier | Skill / Approach | Notes |
|---|----------|------|-----------------|-------|
| 1 | AutoCAD Design Modification | T4 | Script generation (not direct CAD) | Claude generates AutoLISP/Python scripts; designer runs in AutoCAD |
| 2 | New Design Acceleration | T4 | External CAD AI tools | Zoo, Autodesk Fusion |
| 3 | BOM Generation | T2 | xlsx + custom BOM Generator skill | Needs component library |
| 4 | Site Layout Drawing | T4 | External drawing tools | AutoCAD required |
| 5 | Email Writer | T1 | Built-in capability | Design-context instructions |

### 3. Supply Chain (8 use cases)

| # | Use Case | Tier | Skill / Approach | Notes |
|---|----------|------|-----------------|-------|
| 1 | Vendor Finder | T2 | operations:vendor-management + web search | Good match |
| 2 | RFQ Generation | T2 | docx/pdf + custom RFQ Template Builder | Custom template |
| 3 | PO Creation | T3 | docx/pdf | Needs ERP for PO numbering |
| 4 | Shortage Identification | T3 | xlsx (partial) | Needs ERP MCP for inventory data |
| 5 | Cost Analysis & Vendor Reports | T2 | operations:vendor-review | Good match with uploaded data |
| 6 | Email Writer | T1 | Built-in capability | Simple instructions |
| 7 | Min Reorder Alerts | T3 | Custom Reorder Alert System | ERP connector + scheduled tasks |
| 8 | Chase Follow-Up Dashboard | T3 | xlsx (partial) | Most complex use case — likely needs web app approach |

### 4. Production & Maintenance (4 use cases)

| # | Use Case | Tier | Skill / Approach | Notes |
|---|----------|------|-----------------|-------|
| 1 | Predictive Maintenance | T4 | Custom (start rule-based) | IoT sensor integration eventually |
| 2 | Email Writer | T1 | Built-in capability | Simple instructions |
| 3 | Production Review Presentations | T2 | pptx skill | Works well with production data |
| 4 | Forward Stock Projections | T3 | xlsx | Needs ERP + sales pipeline data |

### 5. Accounts (5 use cases)

| # | Use Case | Tier | Skill / Approach | Notes |
|---|----------|------|-----------------|-------|
| 1 | Invoice Generation | T3 | pdf/docx | Needs ERP integration for auto-population |
| 2 | MIS Reports | T3 | xlsx | Needs ERP data feed |
| 3 | Email Writer | T1 | Built-in capability | Simple instructions |
| 4 | Financial Presentations | T2 | pptx skill | Works with financial data input |
| 5 | Excel AI Assistant | T1 | xlsx skill | Excellent match — deploy immediately |

### 6. HR & IT (6 use cases)

| # | Use Case | Tier | Skill / Approach | Notes |
|---|----------|------|-----------------|-------|
| 1 | Job Description Writer | T1 | Adapt product-management:feature-spec | Manufacturing JD context |
| 2 | Job Posting to Portals | T3 | Browser automation needed | Platform APIs |
| 3 | Salary Sheet Maker | T2 | xlsx + custom Indian Payroll Processor | PF, ESI, TDS logic |
| 4 | ERP Coding Assistant | T1 | Built-in coding capability | ERP schema in project knowledge |
| 5 | Email Writer | T1 | Built-in capability | Simple instructions |
| 6 | KRA/KPI Generator | T1 | Adapt product-management:metrics-tracking | Manufacturing context |

### 7. Servicing (3 use cases)

| # | Use Case | Tier | Skill / Approach | Notes |
|---|----------|------|-----------------|-------|
| 1 | AI Troubleshooting Assistant | T2 | Custom Troubleshooting skill | Technical manual knowledge base |
| 2 | Service Email Writer | T1 | Built-in capability | Simple instructions |
| 3 | AI Travel Desk (V2) | T4 | Custom Travel Desk Coordinator | Needs Travel API MCP (flights, hotels, expenses) |

---

## 18 Recommended Projects

| # | Project Name | Department | Key Use Cases | Tier | Core Skills |
|---|-------------|------------|---------------|------|-------------|
| 1 | Sales Proposals & Pricing | Marketing | #1, #2, #3 | T1-T2 | sales:create-an-asset, Custom Pricing Calculator |
| 2 | Sales Communications | Marketing | #4, #6 | T1-T3 | sales:draft-outreach, sales:pipeline-review |
| 3 | Digital Marketing | Marketing | #7, #8, #9 | T2-T4 | marketing:seo-audit, marketing:campaign-plan |
| 4 | Sales Forecasting & Pipeline | Marketing | #10 | T3 | sales:forecast, xlsx |
| 5 | Sales Follow-Up & Outbound | Marketing | #11, #12 | T3 | sales:pipeline-review, sales:account-research |
| 6 | Engineering Design & CAD | Design | #1, #2, #4 | T4 | coding-first-principles (script gen) |
| 7 | BOM & Design Documentation | Design | #3, #5 | T1-T2 | xlsx, docx |
| 8 | Vendor Management & Procurement | Supply Chain | #1, #2, #3, #5, #6 | T2-T3 | operations:vendor-management, docx, pdf |
| 9 | Inventory & Procurement Tracking | Supply Chain | #4, #7, #8 | T3 | xlsx + ERP MCP + scheduled tasks |
| 10 | Production Planning & Reporting | Production | #2, #3, #4 | T1-T3 | pptx, xlsx |
| 11 | Maintenance Management | Production | #1 | T4 | Custom (rule-based start) |
| 12 | Financial Operations | Accounts | #1, #2, #3 | T1-T3 | pdf, xlsx + ERP MCP |
| 13 | Financial Analysis & Presentations | Accounts | #4, #5 | T1-T2 | pptx, xlsx |
| 14 | Recruitment & Talent | HR & IT | #1, #2 | T1-T3 | docx |
| 15 | Payroll & HR Operations | HR & IT | #3, #5, #6 | T1-T2 | xlsx |
| 16 | ERP Development Assistant | HR & IT | #4 | T1 | Built-in coding |
| 17 | Service & Troubleshooting | Servicing | #1, #2 | T2 | Custom Troubleshooting skill |
| 18 | AI Travel Desk | Servicing | #3 | T4 | Custom Travel Desk + Travel API MCP |

---

## 11 Custom Skills to Build

| # | Skill Name | Input | Output | Dependency |
|---|-----------|-------|--------|------------|
| 1 | Pricing Calculator | Machine configuration | Instant price with margin analysis | Pricing master spreadsheet |
| 2 | Configuration Suggestor | Print requirements | Optimal machine recommendation | Product knowledge base |
| 3 | BOM Generator | Order spec | Structured BOM with parts/costs | Component library |
| 4 | RFQ Template Builder | Component specs | Formatted RFQ document | Vendor list |
| 5 | Chase Dashboard Builder | BOM data | Procurement tracking dashboard | ERP MCP (may need web app) |
| 6 | Indian Payroll Processor | Attendance + salary structure | Pay slips with PF/ESI/TDS/NEFT | Statutory rate tables |
| 7 | Troubleshooting Assistant | Symptoms | Ranked root causes + diagnostics | Technical manuals |
| 8 | Reorder Alert System | Inventory levels | Threshold alerts + reorder suggestions | ERP MCP + scheduled tasks |
| 9 | Outbound Enquiry Pipeline (V2) | Target criteria | Qualified leads → outreach sequences | IndiaMart/trade directory access |
| 10 | Travel Desk Coordinator (V2) | Service visit details | Itinerary + booking + expense report | Travel API MCP |
| 11 | **Offer Generator** ✅ LIVE | Machine spec + domestic/intl flag | Professional offer PDF with pricing + T&C | Pricing master spreadsheet + T&C PDFs |

---

## Critical Dependencies & Blockers

1. **Custom ERP MCP Connector** — Blocks 14 of 49 use cases (29%). This is a development project (2-4 weeks), not configuration. Must be purpose-built for company's custom ERP API. Prioritize in Month 2-3.

2. **AutoCAD Integration** — Claude generates scripts (AutoLISP/Python), designer runs them in AutoCAD. Human-in-the-loop, not fully automated. Still 50-70% time savings but the plan may set unrealistic expectations.

3. **Chase Follow-Up Dashboard** — Most technically demanding use case. Requires ERP MCP + scheduled tasks + multi-user input + persistent state. Recommend building as a lightweight web app that Claude helps populate.

4. **Skills ≠ Project Feature** — Skills are workspace-level in Cowork, not project-scoped. Reference them in project instructions. This works, just set expectations correctly.

5. **Image/Video Generation** — External tools (DALL-E, Midjourney, Runway). Separate subscriptions and workflows. Budget separately.

6. **Travel API Integration (V2)** — AI Travel Desk needs flight/hotel booking APIs. No existing MCP connector. Start with itinerary suggestions and expense templates before full booking automation.

7. **Productization** — Projects + Skills is good for internal pilot but won't scale to a product. Need Claude API + Agent SDK for that. Use pilot to validate ROI first.

---

## Offer Generator — First Working Demo (March 13, 2026)

The first skill to go live. Located at `Offer_Generator_Project/`. This is a Claude Enterprise Project demo showing how a team member enters a machine spec and gets a calculated offer with correct pricing and T&C.

### Workflow (Two-Step)

1. **Claude Enterprise Project** ("OrientPrint – Sales Proposals & Pricing") — User enters a machine spec prompt. Claude calculates pricing from the master spreadsheet and generates structured output with cover data, machine specifications, and equipment pricing.

2. **Branded PDF Generator** (`generate_branded_offer.py`) — Takes the Claude output and produces an 8-page branded PDF matching the real offer template format:
   - Page 1: Cover page (generated — date, proforma no., series, customer name)
   - Pages 2-4: About Us, Orient Jet Intro, Client Logos (boilerplate from template PDF)
   - Pages 5-7: C-Series schematic + Press Configuration details with photos (boilerplate)
   - Page 8: Machine Specification + Equipment Pricing (generated — specs, pricing, ink prices, T&C links, Thank You graphic)

### Project Files

**For Claude Enterprise Project:**
- `PROJECT_INSTRUCTIONS.md` — System prompt (paste as project instructions)
- `KNOWLEDGE_Pricing_Logic.md` — Head count formulas, margin calculations, sheet structure
- `KNOWLEDGE_Price_List_Digital.xlsx` — Pricing master (5 sheets: C-Series 600/1200, L&P 600/1200, Extra Colour)
- `KNOWLEDGE_Domestic_TnC.md` — Full domestic General Terms and Conditions of Sale
- `KNOWLEDGE_International_TnC.md` — Full international T&C (includes export clauses, LC payment, visa provisions)

**For Branded PDF Generation:**
- `generate_branded_offer.py` — ReportLab + pypdf script that generates branded PDFs
- `template_assets/cseries/` — Brand images extracted from real offer docx files (Machine Specification title, Equipment Pricing title, page backgrounds with decorative elements, Thank You graphic)
- `DEMO_Branded_Offer.pdf` — 8-page branded output matching real offer format
- `DEMO_Offer_Output.pdf` — Earlier simple pricing output (superseded by branded version)

**Template PDFs (boilerplate source):** The generator extracts pages 2-7 from an existing offer PDF (e.g., `25126_OrientJet C-SERIES...pdf`) as boilerplate. These contain the About Us page, Orient Jet intro with Technical Support, Client logos, and the full C-Series press configuration with schematic drawings and component photos. For L&P Series, it uses `24080A_OrientJet L&P Series...pdf`.

### Pricing Model
- Core costs: IDS boards + print heads + electronics (scale with width/colors/duplex)
- Add-ons: Unwind, printing unit, IR drying, wide web, coating, rewind, RIP, sheeter, misc, installation
- Head count formula: `ceil(width_mm / head_coverage_mm) × colors × duplex_factor`
- Offer price = Total Cost / (1 - 0.20) — 20% gross margin
- Never reveal internal costs or partner margin (10%) to customer

### Next.js Dashboard Integration
- Added to backfill data as skill #11 with full pre-populated instructions, input fields, output format, examples, and knowledge file references
- Shows in Skill Creator with "LIVE" tag
- Category: sales, Department: Marketing & Sales, Tier: T2

---

## Source Files
- `AI_Integration_Master_Plan_FINAL.pages` — Original V1 master plan
- `AI_Integration_Master_Plan_V2.docx` — Updated V2 (49 use cases)
- `AI_Integration_Summary_Presentation.pptx` — 14-slide stakeholder deck (matches V2)
- `AI_Rollout_Dashboard.html` — Static HTML dashboard (legacy, replaced by Next.js app)
- `Offer_Generator_Project/` — Full offer generator project (knowledge files + branded PDF generator + template assets)
- This file — Shareable context for any Claude session
