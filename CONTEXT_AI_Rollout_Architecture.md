# Context: AI Integration Rollout Architecture for Printers Houst
## Created: March 12, 2026 | Updated: March 12, 2026 (V2)

## What This Is
Architecture analysis and implementation plan for deploying Claude Enterprise across 7 departments (49 use cases) at The Printers Houst Pvt. Ltd. Based on the AI Integration Master Plan V2 prepared for Rishab Kohli, Director.

## V2 Changes (3 new use cases added)
1. **Marketing #11: Auto Sales Follow-Up Workflow** — CRM-triggered follow-up sequences with personalized emails/WhatsApp. Tier: T3 (needs CRM MCP connector).
2. **Marketing #12: Outbound Enquiry Generation Workflow** — Prospect discovery from IndiaMart/trade directories, lead qualification, outreach. Tier: T3 (needs web scraping + CRM).
3. **Servicing #3: AI Travel Desk** — Service engineer travel booking, itinerary optimization, expense reports. Tier: T4 (needs Travel API MCP connector).

## Key Decisions Made

### Architecture: ~17 Functional Projects (not 7 department-level)
- Original proposal: 1 project per department
- Recommendation: Split into functional clusters because use cases within the same department often need very different context (pricing DB vs SEO keywords vs CRM data)
- Skills are workspace-level, not project-scoped — reference them in project instructions

### 4-Tier Phased Rollout
- **T1 (Week 1-4):** 14 use cases — Project instructions + knowledge files only
- **T2 (Month 2-3):** 14 use cases — Cowork desktop with skills (PPTX, XLSX, DOCX, PDF)
- **T3 (Month 3-6):** 14 use cases — Requires custom ERP MCP connector
- **T4 (Month 6+):** 7 use cases — External AI tools (AutoCAD, image gen, IoT, Travel APIs)

### Critical Dependencies
1. Custom ERP MCP connector (blocks 14 use cases / 29%)
2. 10 custom skills need to be built
3. AutoCAD integration is script-generation, not direct automation
4. Chase Follow-Up Dashboard likely needs a web app, not just a Claude skill
5. Travel API integration needed for AI Travel Desk (new in V2)

### Productization Path
- Current approach (Projects + Skills) = good for internal pilot
- For productization → migrate to Claude API + Agent SDK
- Use pilot to validate which use cases deliver real value first

## Files
- `AI_Integration_Master_Plan_FINAL.pages` — Original V1 master plan document
- `AI_Integration_Master_Plan_V2.docx` — Updated V2 master plan (49 use cases)
- `AI_Integration_Summary_Presentation.pptx` — 14-slide stakeholder presentation (matches V2)
- `AI_Rollout_Dashboard.html` — Interactive stakeholder visualization (updated for V2)
- This file — Architecture context for future sessions

## Custom ERP Note
The company uses a custom ERP (not Tally/SAP/Odoo). MCP connector needs to be purpose-built for their API.

## 10 Custom Skills Required
1. Pricing Calculator — Machine config → instant price
2. Configuration Suggestor — Print requirement → machine recommendation
3. BOM Generator — Order spec → structured BOM
4. RFQ Template Builder — Specs → formatted RFQ document
5. Chase Dashboard Builder — BOM → procurement tracking (may need web app)
6. Indian Payroll Processor — Attendance → pay slips with PF/ESI/TDS
7. Troubleshooting Assistant — Symptoms → diagnosis from technical manuals
8. Reorder Alert System — Inventory monitoring with threshold alerts
9. Outbound Enquiry Pipeline (V2) — Prospect discovery → qualified leads → outreach
10. Travel Desk Coordinator (V2) — Travel booking, itinerary, expense reports
