import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { setupTables } from "@/lib/db-setup";
import { generateDashboardHTML } from "@/lib/dashboard-template";
import type { DashboardData } from "@/lib/schema";

const PRINTERS_HOUST_DATA: DashboardData = {
  companyName: "The Printers Houst Pvt. Ltd.",
  companyShort: "Printers Houst",
  subtitle: "Claude Enterprise deployment across 7 departments with 49 use cases. Phased rollout from quick wins to advanced AI integrations.",
  totalUseCases: 49,
  totalDepartments: 7,
  totalPhases: 4,
  quickWins: 14,
  customSkillsCount: 11,
  timeline: "~6mo",
  architectureRec: 'Instead of 7 department-level Projects, use ~18 functional Projects grouped by workflow cluster. Many departments have use cases with very different context needs (e.g., Marketing\'s "Offer Creation" needs a pricing database while "SEO Workflow" needs web search). Splitting by function gives each Project a focused instruction set and relevant knowledge files. <strong>V2 adds 3 new use cases:</strong> Auto Sales Follow-Up, Outbound Enquiry Generation (both Marketing), and AI Travel Desk (Servicing).',
  tiers: [
    { name: "Tier 1", label: "Quick Wins", timeline: "Week 1-4", count: 14, description: "Claude.ai Projects only. Instructions + knowledge files. Email writers, JD creation, ERP coding help, Excel assistance, configuration suggestions." },
    { name: "Tier 2", label: "Cowork Skills", timeline: "Month 2-3", count: 14, description: "Cowork desktop for power users. File generation (PPTX, XLSX, DOCX, PDF), web search, vendor research, BOM generation, troubleshooting." },
    { name: "Tier 3", label: "ERP Integration", timeline: "Month 3-6", count: 14, description: "Custom MCP connector for your ERP. Unlocks: CRM auto-update, shortage ID, invoicing, Chase Dashboard, reorder alerts, outbound pipeline." },
    { name: "Tier 4", label: "Advanced AI", timeline: "Month 6+", count: 7, description: "External AI tools. AutoCAD scripting, AI image/video generation, IoT predictive maintenance, ad platform APIs, Travel API integration." },
  ],
  departments: [
    {
      name: "Marketing & Sales",
      useCases: [
        { name: "Offer Creation with Pricing", description: "Generates professional, branded sales offers and quotations with accurate pricing, payment terms, delivery schedules, and technical specifications based on the customer's requirements and your pricing model. Reduces offer creation from 4-5 hours to 30 minutes (85% faster) with same-day turnaround on quotes instead of 3-5 days.", tier: "t2", complexity: "beginner", skill: "sales:create-an-asset + docx/pdf", skillStatus: "exists", skillNotes: "Needs pricing DB as knowledge file" },
        { name: "Instant Price Generator", description: "A real-time pricing engine that calculates the exact price for any machine configuration. The salesperson selects base model, add-ons, and options, and gets an instant price without waiting for the accounts or production team. Eliminates back-and-forth between sales and accounts, enabling confident negotiation on customer calls in real-time.", tier: "t1", complexity: "beginner", skill: "—", skillStatus: "custom", skillNotes: "Calculator logic in instructions + spreadsheet" },
        { name: "Configuration Suggestor", description: "When a customer describes what they want to print (e.g., food packaging labels, newspaper supplements), this skill recommends the optimal machine configuration including model, colour count, speed, substrate handling, and finishing options. Reduces technical consultation time from 2-3 hours to 15 minutes and prevents costly mismatches.", tier: "t1", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Product recommendation engine skill needed" },
        { name: "Report Writer + CRM Update", description: "Generates sales reports (daily, weekly, monthly) from CRM data and automatically logs call notes, meeting outcomes, and deal updates into the CRM after each customer interaction. Reduces report writing from 3-4 hours/week to 15 minutes and keeps CRM always up-to-date, eliminating end-of-week data entry.", tier: "t3", complexity: "intermediate", skill: "sales:pipeline-review", skillStatus: "partial", skillNotes: "Needs CRM MCP connector for custom ERP" },
        { name: "Presentation Generation", description: "Creates professional sales presentations, product demos, and customer-facing slide decks tailored to the specific customer, industry, and machine being proposed. Includes ROI slides with the customer's own numbers. Reduces presentation creation from 4-6 hours to 30 minutes with consistent brand messaging across all salespeople.", tier: "t2", complexity: "beginner", skill: "pptx", skillStatus: "exists", skillNotes: "Works with company template" },
        { name: "Auto Email Writing", description: "Drafts professional sales emails for every stage of the sales cycle: cold outreach, follow-ups, objection handling, quote transmittals, and post-sale communication. Reduces email writing from 15 minutes per email to 2 minutes with consistent professional communication. Sales team can handle 20% more prospects.", tier: "t1", complexity: "beginner", skill: "sales:draft-outreach", skillStatus: "exists", skillNotes: "Customize tone for company voice" },
        { name: "SEO Workflow", description: "A structured workflow for creating and optimising website content to rank higher in search engines for keywords related to your printing machines. Includes keyword research, content creation, meta tag writing, and performance tracking. Expected 30-50% increase in organic traffic over 6 months with 4x faster content production.", tier: "t2", complexity: "beginner", skill: "marketing:seo-audit", skillStatus: "exists", skillNotes: "Add domain-specific keywords" },
        { name: "Meta & Google Ad Management", description: "Assists with creating, managing, and optimising paid advertising campaigns on Google Ads and Meta (Facebook/Instagram). Generates ad copy variants, audience targeting recommendations, budget allocation across platforms, and weekly performance analysis. Reduces ad creation from 2-3 hours per campaign to 30 minutes with 15-25% lower cost per lead.", tier: "t3", complexity: "intermediate", skill: "marketing:campaign-plan", skillStatus: "partial", skillNotes: "Strategy + copy only, no platform integration" },
        { name: "Image & Video Generation", description: "Creates marketing visuals including product images, social media graphics, brochure layouts, and short promotional videos using AI image and video generation tools (DALL-E, Midjourney, Runway). Visual content creation 80% faster than traditional design with always-fresh social media content and professional visuals without expensive photo shoots.", tier: "t4", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Requires DALL-E / Midjourney / Runway" },
        { name: "Order Projections from Pipeline", description: "Analyses the sales pipeline and CRM data to generate quarterly order projections by machine model with confidence levels (high/medium/low). This critical forecast feeds directly to the production department for capacity planning, component procurement, and resource allocation. Improves forecast accuracy 15-25% over gut-feel estimates and reduces emergency component purchases by 30-50%.", tier: "t3", complexity: "intermediate", skill: "sales:forecast", skillStatus: "partial", skillNotes: "Needs CRM data feed" },
        { name: "Auto Sales Follow-Up Workflow", description: "An automated sales follow-up system that integrates with your CRM or Excel lead tracker to ensure no prospect falls through the cracks. Monitors the lead pipeline, identifies leads due for follow-up based on configurable rules (hot leads: 2 days, warm: 5, cold: 14), drafts personalised follow-up emails, and maintains a rolling follow-up dashboard. Increases follow-up compliance from 40-60% to 95%+.", tier: "t3", complexity: "intermediate", skill: "sales:pipeline-review + sales:draft-outreach", skillStatus: "exists", skillNotes: "Needs CRM/Excel MCP connector for auto-tracking" },
        { name: "Outbound Enquiry Generation", description: "A complete AI-powered outbound sales pipeline that finds potential clients, qualifies them, and executes personalised cold outreach at scale. Three stages: (1) Prospect Discovery — scans IndiaMart, trade directories, LinkedIn to find companies matching your ICP, (2) Lead Qualification — researches each prospect's current equipment, company size, and pain points, (3) Personalised Outreach — generates tailored cold emails and call scripts. Scales prospect discovery from 2-3 leads/week (manual) to 30-50 qualified leads/week.", tier: "t3", complexity: "intermediate", skill: "sales:account-research + sales:draft-outreach", skillStatus: "partial", skillNotes: "Prospect discovery via web search; needs IndiaMart/LinkedIn data" },
      ],
    },
    {
      name: "Design",
      useCases: [
        { name: "AutoCAD Design Modification", description: "Assists designers in modifying existing machine designs and creating new variations based on customer order specifications. Integrates with AutoCAD through scripting (AutoLISP/Python) to automate repetitive drawing tasks. Reduces design modification time 30-50% on standard modifications with fewer errors through automated dimension calculations.", tier: "t4", complexity: "advanced", skill: "—", skillStatus: "custom", skillNotes: "Claude generates scripts, can't run AutoCAD" },
        { name: "New Design Acceleration", description: "Accelerates creation of entirely new machine designs by generating initial specifications, component selections, and design layouts based on performance requirements and existing design patterns. Reduces concept-to-specification time from 2-3 weeks to 3-5 days with better initial designs through pattern analysis of past successes.", tier: "t4", complexity: "advanced", skill: "—", skillStatus: "custom", skillNotes: "Needs external CAD AI tools" },
        { name: "BOM Generation", description: "Automatically generates a complete Bill of Materials (BOM) from the confirmed order specification and design drawings. Categorised by sub-assembly (frame, electrical, mechanical, hydraulic) with part numbers, descriptions, quantities, unit costs, and supplier recommendations. Critical workflow that feeds into supply chain procurement and the Chase Follow-Up Dashboard. Reduces BOM creation from 4-6 hours to 30-45 minutes (85-90% faster).", tier: "t2", complexity: "intermediate", skill: "xlsx", skillStatus: "partial", skillNotes: "Custom skill with component library needed" },
        { name: "Site Layout Drawing", description: "Generates a site layout drawing showing the machine placement within the customer's facility, including floor plan positioning, electrical requirements (power supply, cable routing), compressed air connections, and access clearances. Reduces site drawing creation from 1-2 days to 2-3 hours with standardised professional output for every customer.", tier: "t4", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Needs AutoCAD / drawing templates" },
        { name: "Email Writer", description: "Drafts professional technical emails for the design team including design clarifications to customers, technical queries to suppliers, internal handoff communications to production, and design change notifications. Reduces email writing time 70-80% with clear technical language appropriate for the audience.", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Just needs design-context instructions" },
      ],
    },
    {
      name: "Supply Chain",
      useCases: [
        { name: "Vendor Finder", description: "Finds potential vendors based on technical specifications, material requirements, quality certifications (ISO, etc.), and delivery capabilities. Searches existing vendor database plus discovers new suppliers through web research. Reduces vendor search from 2-4 hours to 20 minutes with 5-15% cost reduction through competitive alternatives.", tier: "t2", complexity: "beginner", skill: "operations:vendor-management", skillStatus: "exists", skillNotes: "+ web search for new vendors" },
        { name: "RFQ Generation", description: "Automatically generates professional Request for Quotation documents for vendors, including detailed technical specifications from the BOM, quantity requirements, delivery schedule, quality and testing requirements, payment terms, and evaluation criteria. Reduces RFQ creation from 1-2 hours to 10 minutes per vendor with standardised format ensuring consistent vendor comparison.", tier: "t2", complexity: "beginner", skill: "docx / pdf", skillStatus: "partial", skillNotes: "Custom RFQ template needed" },
        { name: "PO Creation", description: "Creates purchase orders from approved vendor quotations, including all commercial terms, delivery schedules with milestone dates, quality requirements, inspection criteria, and PO register entry for tracking. Reduces PO creation from 30-45 minutes to 5 minutes with zero errors in commercial terms.", tier: "t3", complexity: "beginner", skill: "docx / pdf", skillStatus: "partial", skillNotes: "Needs ERP for PO numbering" },
        { name: "Shortage Identification", description: "Compares the BOM requirements against current ERP inventory levels and outstanding purchase orders to automatically generate a shortage list showing exactly what needs to be procured for each machine order. Categorised by urgency (critical path vs. buffer items) with estimated procurement cost and recommended order dates based on lead times. Reduces hours of manual checking to minutes.", tier: "t3", complexity: "intermediate", skill: "xlsx", skillStatus: "partial", skillNotes: "Needs ERP MCP for inventory data" },
        { name: "Cost Analysis & Vendor Reports", description: "Generates comprehensive supply chain reports for management review including weekly/monthly procurement status, vendor performance scorecard, cost variance analysis, delivery performance summary, and risk alerts with recommendations. Reduces report preparation from 4-6 hours/week to 30 minutes with real-time visibility for management.", tier: "t2", complexity: "beginner", skill: "operations:vendor-review", skillStatus: "exists", skillNotes: "Works with uploaded data" },
        { name: "Email Writer & Follow-Up", description: "Drafts professional procurement emails including vendor negotiations, delivery follow-ups, quality issue communications, payment discussions, and internal coordination emails. Reduces email writing time 70-80% with appropriate technical and commercial language.", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Simple instructions" },
        { name: "Min Reorder Level Alerts", description: "Monitors inventory levels of selected critical items in the ERP system and automatically generates alerts when stock falls below the minimum reorder level. Generates purchase requisitions with recommended order quantity (based on economic order quantity) and expected stockout date if not reordered. Goal: zero stockouts on critical items.", tier: "t3", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "ERP connector + scheduled task" },
        { name: "Chase Follow-Up Dashboard", description: "The most critical supply chain workflow. After the Design department generates a BOM for a confirmed order, the system automatically creates a master procurement dashboard. Each machine order gets its own shortage tracking tab. Items are assigned to vendors and each vendor is assigned to a purchaser. Each purchaser receives a daily Excel with items to procure. End-of-day updates flow back to the master dashboard showing percentage completion for each machine. Colour-coded: Red (not ordered), Yellow (ordered/in-transit), Green (received).", tier: "t3", complexity: "advanced", skill: "xlsx (partial)", skillStatus: "custom", skillNotes: "Complex: ERP + scheduling + multi-user" },
      ],
    },
    {
      name: "Production & Maintenance",
      useCases: [
        { name: "Predictive Maintenance", description: "Monitors CNC machines and factory infrastructure (compressors, HVAC, electrical systems) to predict maintenance needs based on operating hours, sensor data, and historical failure patterns. Generates predictive maintenance schedules (next 30/60/90 days), work orders with parts lists, health scores per machine, and replacement part ordering alerts ahead of predicted failure. Reduces unplanned downtime 35-45% and maintenance costs 25-30%.", tier: "t4", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Start rule-based, evolve to ML" },
        { name: "Email Writer", description: "Drafts emails for the production team including supplier communications about component issues, internal coordination with design and supply chain, customer updates on delivery status, and quality issue notifications. Reduces email writing time 70-80% with clear technical communication.", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Simple instructions" },
        { name: "Production Review Presentations", description: "Creates presentations for production reviews, management meetings, quality reviews, and process improvement proposals. Includes production metrics (output, yield, downtime, quality), timeline tracking, visual dashboards, and comparison with targets and benchmarks. Reduces presentation creation from 3-4 hours to 30 minutes with consistent data-driven production reviews.", tier: "t2", complexity: "beginner", skill: "pptx", skillStatus: "exists", skillNotes: "Works with production data input" },
        { name: "Forward Stock Projections", description: "Takes the order projections from the Marketing and Sales department and translates them into component stock requirements. Identifies what needs to be procured in advance for projected (not yet confirmed) orders, including long-lead item procurement recommendations and budget estimates. Enables proactive procurement and reduces emergency purchases for long-lead items by 30-50%.", tier: "t3", complexity: "intermediate", skill: "xlsx", skillStatus: "partial", skillNotes: "Needs ERP + sales pipeline data" },
      ],
    },
    {
      name: "Accounts",
      useCases: [
        { name: "Invoice Generation", description: "Automatically generates professional invoices from confirmed orders and delivery milestones. Pulls data from the ERP/order system and creates GST-compliant invoices with HSN/SAC codes, linked to order number and PO reference, and auto-filed in the accounting system. Reduces invoice creation from 20-30 minutes to 2-3 minutes with zero errors in tax calculations.", tier: "t3", complexity: "intermediate", skill: "pdf / docx", skillStatus: "partial", skillNotes: "Needs ERP integration" },
        { name: "MIS Reports", description: "Automatically generates Management Information System reports including P&L summaries, revenue and profitability analysis, receivables aging and collections status, payables schedule and cash flow forecast, and key financial ratios and trend analysis. Reduces MIS preparation from 8-10 hours/month to 30 minutes with always-current financial data for management and early warning on cash flow issues.", tier: "t3", complexity: "intermediate", skill: "xlsx", skillStatus: "partial", skillNotes: "Needs ERP data feed" },
        { name: "Email Writer", description: "Drafts professional financial emails including payment reminders, vendor payment communications, customer invoice transmittals, audit queries, and internal finance communications. Reduces email writing time 70-80% with appropriate financial and commercial language. Consistent collection communication improves cash flow.", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Simple instructions" },
        { name: "Financial Presentations", description: "Creates financial presentations for board meetings, management reviews, and investor discussions with professional charts (revenue trends, margin analysis, cash flow), comparison tables (budget vs. actual, YoY), and executive summary slides. Reduces presentation creation from 4-6 hours to 30 minutes.", tier: "t2", complexity: "beginner", skill: "pptx", skillStatus: "exists", skillNotes: "Works with financial data input" },
        { name: "AI Excel Assistant", description: "An intelligent assistant that helps the accounts team with complex Excel tasks including formula creation (e.g., GST calculation by HSN code across multiple tax slabs), pivot table setup, data cleaning, VLOOKUP/INDEX-MATCH problems, VBA macro creation, and financial modelling. Complex Excel tasks completed 80% faster with team upskilled on advanced techniques.", tier: "t1", complexity: "beginner", skill: "xlsx", skillStatus: "exists", skillNotes: "Excellent immediate match" },
      ],
    },
    {
      name: "HR & IT",
      useCases: [
        { name: "Job Description Writer", description: "Generates detailed, role-specific job descriptions tailored to your printing machine manufacturing context. Includes responsibilities, qualifications, skills, certifications needed, reporting structure, interview question suggestions, and salary benchmarking guidance. Reduces JD creation from 2-3 hours to 15 minutes with better candidate quality through clearer descriptions.", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Manufacturing context in instructions" },
        { name: "Job Posting to Portals", description: "Takes the generated job description and automatically posts it to LinkedIn, Naukri.com, and Indeed with platform-optimised formatting, SEO-optimised keywords for each platform, application tracking links, and post performance tracking. Reduces job posting from 1-2 hours across platforms to 10 minutes with wider candidate reach.", tier: "t3", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Needs platform APIs" },
        { name: "Salary Sheet Maker", description: "Generates monthly salary sheets with all components (basic, HRA, DA, PF, ESI, professional tax, TDS) calculated correctly. Handles variable components like overtime, incentives, bonuses, and deductions (loans, advances, LOP). Outputs complete salary sheet (Excel), individual pay slips, PF/ESI contribution summaries, TDS calculation, and bank transfer file (NEFT format). Reduces salary processing from 2-3 days to 2-3 hours with zero calculation errors.", tier: "t2", complexity: "intermediate", skill: "xlsx", skillStatus: "exists", skillNotes: "Custom template with PF/ESI/TDS logic" },
        { name: "ERP Coding Assistant", description: "An AI coding assistant that helps your IT team with ERP customisation, module development, report creation, and integration coding. Generates code (Python, SQL, ABAP, JavaScript), database queries and stored procedures, API integration code, custom report templates, and testing scripts. ERP development 50-70% faster for routine customisations with faster response to business requests.", tier: "t1", complexity: "intermediate", skill: "Built-in coding", skillStatus: "builtin", skillNotes: "Add ERP schema as knowledge" },
        { name: "Email Writer", description: "Drafts professional emails for HR (offer letters, rejection letters, policy announcements, employee communications) and IT (system maintenance notices, security alerts, user guides). Reduces email writing time 70-80% with appropriate tone for the context and consistent professional communication.", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Simple instructions" },
        { name: "KRA/KPI Generator", description: "Generates comprehensive Key Result Areas (KRAs) and Key Performance Indicators (KPIs) for every role in the company. Creates 4-6 KRAs with detailed descriptions aligned to company goals, 2-4 measurable KPIs per KRA with targets and measurement methods, weightage distribution (totalling 100%), rating scale, and formatted appraisal template. Supports annual appraisal cycles, probation reviews, and promotion assessments. Reduces KRA/KPI creation from 3-4 hours per role to 20 minutes (90% faster).", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Manufacturing KRA templates in instructions" },
      ],
    },
    {
      name: "Servicing",
      useCases: [
        { name: "AI Troubleshooting Assistant", description: "A comprehensive troubleshooting assistant that helps service technicians diagnose and resolve customer machine issues. Analyses symptoms, references technical manuals and service bulletins, checks service history for the specific machine, and provides step-by-step resolution guidance with probable root causes ranked by likelihood, repair instructions with tools and parts needed, estimated repair time, and preventive recommendations. Reduces diagnosis time from 2-3 hours to 20-30 minutes (70-85% faster) with 15-25% improvement in first-time fix rate.", tier: "t2", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Technical manual knowledge base skill" },
        { name: "Service Email Writer", description: "Drafts professional service emails including customer status updates, service visit confirmations, parts ordering communications, warranty claim correspondence, and service report transmittals. Uses empathetic tone for issue communications and professional tone for reports. Reduces email writing time 70-80% with consistent customer communication that builds trust.", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Simple instructions" },
        { name: "AI Travel Desk", description: "An AI-powered travel booking and coordination workflow for your servicing team. When service engineers need to travel to customer sites for installation, commissioning, or breakdown support, this handles finding the best travel options (flights, trains, hotels), generating itineraries, booking confirmations, expense estimates, and travel policy compliance checks. Reduces travel planning from 2-3 hours to 15 minutes per trip (90% faster) with 10-20% cost savings through optimised booking and policy compliance.", tier: "t4", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Needs Travel API MCP connector" },
      ],
    },
  ],
  projects: [
    { number: 1, name: "Sales Proposals & Pricing", department: "Marketing & Sales", description: "Offer creation, instant pricing, configuration suggestions", useCaseRefs: "#1, #2, #3", knowledge: "Pricing database, product catalog, machine specs", skills: "sales:create-an-asset, docx, pdf", tier: "T1-T2" },
    { number: 2, name: "Sales Communications", department: "Marketing & Sales", description: "Email drafting, presentation generation, CRM reporting", useCaseRefs: "#4, #5, #6", knowledge: "Brand guide, email templates, past decks", skills: "sales:draft-outreach, pptx", tier: "T1-T3" },
    { number: 3, name: "Digital Marketing", department: "Marketing & Sales", description: "SEO, ad campaigns, content creation, image/video generation", useCaseRefs: "#7, #8, #9", knowledge: "Brand guidelines, keyword lists, competitor URLs", skills: "marketing:seo-audit, marketing:campaign-plan", tier: "T2-T4" },
    { number: 4, name: "Sales Forecasting & Pipeline", department: "Marketing & Sales", description: "Order projections, pipeline analysis, production planning feed", useCaseRefs: "#10", knowledge: "Historical win rates, seasonal patterns, pipeline exports", skills: "sales:forecast, xlsx", tier: "T3" },
    { number: 5, name: "Sales Follow-Up & Outbound", department: "Marketing & Sales", description: "Automated follow-up tracking, outbound prospect discovery, cold outreach", useCaseRefs: "#11, #12", knowledge: "Lead tracker/CRM exports, ICP, product catalog", skills: "sales:pipeline-review, sales:account-research", tier: "T3" },
    { number: 6, name: "Engineering Design & CAD", department: "Design", description: "AutoCAD scripting, new design concepts, site layouts", useCaseRefs: "#1, #2, #4", knowledge: "Design standards, AutoLISP examples, component databases", skills: "coding-first-principles", tier: "T4" },
    { number: 7, name: "BOM & Design Documentation", department: "Design", description: "BOM generation from orders, design emails, handoff docs", useCaseRefs: "#3, #5", knowledge: "Component library with part numbers/costs", skills: "xlsx, docx", tier: "T1-T2" },
    { number: 8, name: "Vendor Management & Procurement Docs", department: "Supply Chain", description: "Vendor search, RFQs, POs, cost analysis, vendor performance", useCaseRefs: "#1, #2, #3, #5, #6", knowledge: "Approved vendor list, RFQ/PO templates", skills: "operations:vendor-management, docx, pdf", tier: "T2-T3" },
    { number: 9, name: "Inventory & Procurement Tracking", department: "Supply Chain", description: "Shortage identification, reorder alerts, Chase Follow-Up Dashboard", useCaseRefs: "#4, #7, #8", knowledge: "Inventory policies, lead times, reorder levels", skills: "xlsx + custom ERP MCP + scheduled tasks", tier: "T3" },
    { number: 10, name: "Production Planning & Reporting", department: "Production & Maintenance", description: "Review presentations, stock projections, production emails", useCaseRefs: "#2, #3, #4", knowledge: "Production targets, BOM templates per model", skills: "pptx, xlsx", tier: "T1-T3" },
    { number: 11, name: "Maintenance Management", department: "Production & Maintenance", description: "Predictive maintenance scheduling, health scoring, alerts", useCaseRefs: "#1", knowledge: "Machine manuals, historical failure data", skills: "Custom (start rule-based)", tier: "T4" },
    { number: 12, name: "Financial Operations", department: "Accounts", description: "Invoice generation, MIS reports, collections emails", useCaseRefs: "#1, #2, #3", knowledge: "GST rules, HSN/SAC codes, invoice templates", skills: "pdf, xlsx + ERP MCP", tier: "T1-T3" },
    { number: 13, name: "Financial Analysis & Presentations", department: "Accounts", description: "Financial decks, Excel assistance, board presentations", useCaseRefs: "#4, #5", knowledge: "Financial templates, chart formats", skills: "pptx, xlsx", tier: "T1-T2" },
    { number: 14, name: "Recruitment & Talent", department: "HR & IT", description: "JD writing, portal postings, interview prep", useCaseRefs: "#1, #2", knowledge: "Role templates, salary benchmarks", skills: "docx", tier: "T1-T3" },
    { number: 15, name: "Payroll & HR Operations", department: "HR & IT", description: "Salary processing, KRA/KPI creation, HR emails", useCaseRefs: "#3, #5, #6", knowledge: "Salary structures, PF/ESI/TDS rules", skills: "xlsx", tier: "T1-T2" },
    { number: 16, name: "ERP Development Assistant", department: "HR & IT", description: "Code generation, query writing, API integration", useCaseRefs: "#4", knowledge: "ERP schema, database structure, API docs", skills: "Built-in coding", tier: "T1" },
    { number: 17, name: "Service & Troubleshooting", department: "Servicing", description: "AI-guided diagnostics, repair instructions, service communications", useCaseRefs: "#1, #2", knowledge: "Technical manuals, service bulletins, parts catalog", skills: "Custom troubleshooting skill", tier: "T2" },
    { number: 18, name: "AI Travel Desk", department: "Servicing", description: "Engineer travel booking, itinerary generation, expense tracking", useCaseRefs: "#3", knowledge: "Travel policy, preferred vendors, expense templates", skills: "Custom Travel Desk + Travel API MCP", tier: "T4" },
  ],
  gaps: [
    { id: "gap-1", label: "BLOCKER 1", title: "Custom ERP Integration", description: '14 of 49 use cases (29%) require reading/writing data from your custom ERP. This needs a custom MCP server built specifically for your ERP\'s API. Estimated 2-4 weeks of developer time. <strong>Recommendation:</strong> Prioritize as a dedicated dev sprint in Month 2-3.' },
    { id: "gap-2", label: "BLOCKER 2", title: "AutoCAD / CAD Integration", description: "3 Design use cases assume direct AutoCAD modification. Claude generates AutoLISP/Python scripts but can't run AutoCAD itself. This is a human-in-the-loop workflow (50-70% time savings), not full automation. The plan's framing may set unrealistic expectations." },
    { id: "gap-3", label: "BLOCKER 3", title: "Chase Follow-Up Dashboard", description: 'The plan\'s flagship workflow is also the most technically demanding. Requires: ERP MCP connector, scheduled tasks, multi-user input, persistent dashboard. <strong>Recommendation:</strong> Build as a lightweight web app that Claude helps populate, not a pure Claude skill.' },
    { id: "gap-4", label: "RISK 4", title: "Skills \u2260 Project Feature", description: 'Skills work in Cowork (desktop) and are workspace-level, not project-scoped. You can\'t attach specific skills to a specific project. <strong>Recommendation:</strong> Reference skills in each project\'s instructions.' },
    { id: "gap-5", label: "RISK 5", title: "Image/Video Generation", description: "DALL-E, Midjourney, and Runway are separate subscriptions and workflows. Claude can help with prompting and strategy, but actual generation happens externally. Budget separately." },
    { id: "gap-6", label: "RISK 6", title: "Travel API Integration (V2)", description: "AI Travel Desk needs flight/hotel booking APIs. No existing MCP connector covers this. Start with itinerary suggestions and expense templates before full booking automation." },
    { id: "gap-7", label: "RISK 7", title: "Productization Path", description: 'Current Projects + Skills approach works for internal pilot but won\'t scale to a product. <strong>Recommendation:</strong> Validate which use cases deliver real ROI internally, then rebuild the top 10-15 as API agents using Claude API + Agent SDK.' },
  ],
  customSkills: [
    { name: "Pricing Calculator", tag: "Custom", description: "Machine configuration to instant price with margin analysis. Needs pricing master spreadsheet." },
    { name: "Configuration Suggestor", tag: "Custom", description: "Print requirements to optimal machine recommendation. Needs product knowledge base." },
    { name: "BOM Generator", tag: "Custom", description: "Order spec to structured BOM with part numbers, quantities, costs." },
    { name: "RFQ Template Builder", tag: "Custom", description: "Component specs to formatted RFQ document for vendors." },
    { name: "Chase Dashboard Builder", tag: "Custom", description: "BOM to procurement tracking dashboard. Most complex — may need web app." },
    { name: "Indian Payroll Processor", tag: "Custom", description: "Attendance + salary to pay slips with PF, ESI, TDS, NEFT file." },
    { name: "Troubleshooting Assistant", tag: "Custom", description: "Symptoms to ranked root causes + step-by-step diagnostics." },
    { name: "Reorder Alert System", tag: "Custom", description: "Inventory monitoring with threshold alerts. Needs ERP + scheduled tasks." },
    { name: "Outbound Enquiry Pipeline", tag: "V2", description: "Prospect discovery from IndiaMart/trade directories to qualified leads." },
    { name: "Travel Desk Coordinator", tag: "V2", description: "Service engineer travel booking, itinerary, expense reports." },
    { name: "Offer Generator", tag: "LIVE", description: "Machine spec to professional offer PDF with calculated pricing and domestic/international T&C. First working demo." },
  ],
  epics: [
    { id: "e1", name: "Project Setup & Enterprise Config", department: "Infrastructure", tier: "t1", column: "progress", items: ["Provision Claude Enterprise accounts for all departments", "Create 18 functional Projects with instructions", "Upload knowledge files per project", "Set up Cowork desktop for power users", "Draft project instruction templates"] },
    { id: "e2", name: "T1: Email Writers (All Depts)", department: "All Departments", tier: "t1", column: "backlog", items: ["Configure Marketing email project", "Configure Design email templates", "Configure Supply Chain email context", "Configure Production email workflows", "Configure Accounts email templates", "Configure HR email context", "Configure Servicing email templates", "Test outputs with department leads"] },
    { id: "e3", name: "T1: Pricing & Configuration", department: "Marketing & Sales", tier: "t1", column: "progress", items: ["Upload pricing master spreadsheet", "Build Offer Generator (Claude → branded PDF)", "Write Pricing Calculator skill instructions", "Write Configuration Suggestor skill instructions", "Upload product knowledge base", "Test with 10 real customer scenarios"] },
    { id: "e4", name: "T1: Excel & Finance Tools", department: "Accounts / HR", tier: "t1", column: "backlog", items: ["Deploy Excel AI Assistant for Accounts", "Upload financial KPI templates", "Deploy KRA/KPI Generator for HR", "Configure JD Writer project", "Test with department leads"] },
    { id: "e5", name: "T1: ERP Coding Assistant", department: "HR & IT", tier: "t1", column: "backlog", items: ["Upload ERP schema documentation", "Upload existing code samples", "Upload API documentation", "Configure coding project instructions", "Test with IT team on real queries"] },
    { id: "e6", name: "T2: Presentation Skills Rollout", department: "Mktg / Prod / Acct", tier: "t2", column: "backlog", items: ["Install pptx skill for power users", "Create company slide templates", "Configure Sales Presentation project", "Configure Production Review project", "Configure Financial Presentations project", "Train department leads on Cowork"] },
    { id: "e7", name: "T2: Document Generation Skills", department: "Supply Chain / Design", tier: "t2", column: "backlog", items: ["Build RFQ Template Builder skill", "Build BOM Generator skill", "Upload component library for BOM", "Upload vendor list for RFQs", "Configure Vendor Management project", "Test outputs against real orders"] },
    { id: "e8", name: "T2: SEO & Digital Marketing", department: "Marketing", tier: "t2", column: "backlog", items: ["Configure SEO Workflow with domain keywords", "Deploy marketing:seo-audit skill", "Set up campaign planning project", "Upload competitor keyword data", "Test with marketing team"] },
    { id: "e9", name: "T2: Troubleshooting Assistant", department: "Servicing", tier: "t2", column: "backlog", items: ["Collect and digitize technical manuals", "Build Troubleshooting Assistant skill", "Upload service bulletins and past issues", "Upload parts catalog", "Test with 20 real service scenarios"] },
    { id: "e10", name: "T2: Indian Payroll Processor", department: "HR", tier: "t2", column: "backlog", items: ["Build Indian Payroll Processor skill", "Configure PF/ESI/TDS statutory rates", "Upload salary structures", "Test with sample attendance data", "Validate NEFT file output format"] },
    { id: "e11", name: "T3: Custom ERP MCP Connector", department: "IT (Infrastructure)", tier: "t3", column: "blocked", items: ["Document ERP API endpoints", "Design MCP server architecture", "Build read-only MCP connector (Phase 1)", "Add write capabilities (Phase 2)", "Security audit and access controls", "Deploy and test with pilot use case", "Roll out to all T3 projects"] },
    { id: "e12", name: "T3: Sales Pipeline & Forecasting", department: "Marketing & Sales", tier: "t3", column: "backlog", items: ["Connect CRM data via ERP MCP", "Configure Report Writer + CRM Update", "Configure Order Projections project", "Deploy sales:forecast with real data", "Test pipeline review accuracy"] },
    { id: "e13", name: "T3: Sales Follow-Up & Outbound (V2)", department: "Marketing & Sales", tier: "t3", column: "backlog", items: ["Build CRM-triggered follow-up workflow", "Build Outbound Enquiry Pipeline skill", "Research IndiaMart/LinkedIn data access", "Configure lead qualification criteria", "Test with 50 real prospects", "Deploy personalized outreach sequences"] },
    { id: "e14", name: "T3: Supply Chain ERP Workflows", department: "Supply Chain", tier: "t3", column: "backlog", items: ["Connect inventory data via ERP MCP", "Deploy PO Creation with auto-numbering", "Deploy Shortage Identification workflow", "Build Reorder Alert System skill", "Configure scheduled task for daily alerts", "Build Chase Follow-Up Dashboard"] },
    { id: "e15", name: "T3: Financial ERP Integration", department: "Accounts", tier: "t3", column: "backlog", items: ["Connect ERP financial data via MCP", "Deploy Invoice Generation", "Deploy MIS Reports with live data", "Test GST/HSN code accuracy", "Validate against manual invoices"] },
    { id: "e16", name: "T3: Ad Platform & Job Portals", department: "Marketing / HR", tier: "t3", column: "backlog", items: ["Research Meta/Google Ads API access", "Build ad strategy + copy workflow", "Research job portal automation", "Deploy browser automation for postings", "Test and refine"] },
    { id: "e17", name: "T4: AutoCAD & Design AI", department: "Design", tier: "t4", column: "backlog", items: ["Build AutoLISP script generation templates", "Test with real design tasks", "Evaluate CAD AI tools (Zoo, Fusion)", "Deploy human-in-the-loop workflow", "Train designers on script review"] },
    { id: "e18", name: "T4: Image & Video Generation", department: "Marketing", tier: "t4", column: "backlog", items: ["Evaluate DALL-E/Midjourney", "Evaluate Runway for video", "Build prompt templates for product marketing", "Integrate into marketing workflow", "Budget for subscriptions"] },
    { id: "e19", name: "T4: Predictive Maintenance", department: "Production", tier: "t4", column: "backlog", items: ["Audit machine monitoring capabilities", "Design rule-based scheduling", "Build maintenance prediction skill", "Plan IoT sensor integration roadmap", "Deploy for top 5 critical machines"] },
    { id: "e20", name: "T4: AI Travel Desk (V2)", department: "Servicing", tier: "t4", column: "backlog", items: ["Research corporate travel APIs", "Build Travel Desk Coordinator skill", "Start with itinerary + expense templates", "Build Travel API MCP connector", "Deploy full booking automation", "Integrate expense report generation"] },
  ],
};

const SKILLS = [
  { slug: "pricing-calculator", name: "Pricing Calculator", category: "sales", department: "Marketing & Sales", tier: "t1", description: "Machine configuration to instant price with margin analysis. Needs pricing master spreadsheet." },
  { slug: "configuration-suggestor", name: "Configuration Suggestor", category: "sales", department: "Marketing & Sales", tier: "t1", description: "Print requirements to optimal machine recommendation. Needs product knowledge base." },
  { slug: "bom-generator", name: "BOM Generator", category: "engineering", department: "Design", tier: "t2", description: "Order spec to structured BOM with part numbers, quantities, costs." },
  { slug: "rfq-template-builder", name: "RFQ Template Builder", category: "operations", department: "Supply Chain", tier: "t2", description: "Component specs to formatted RFQ document for vendors." },
  { slug: "chase-dashboard-builder", name: "Chase Dashboard Builder", category: "operations", department: "Supply Chain", tier: "t3", description: "BOM to procurement tracking dashboard. Most complex — may need web app." },
  { slug: "indian-payroll-processor", name: "Indian Payroll Processor", category: "hr", department: "HR & IT", tier: "t2", description: "Attendance + salary to pay slips with PF, ESI, TDS, NEFT file." },
  { slug: "troubleshooting-assistant", name: "Troubleshooting Assistant", category: "servicing", department: "Servicing", tier: "t2", description: "Symptoms to ranked root causes + step-by-step diagnostics." },
  { slug: "reorder-alert-system", name: "Reorder Alert System", category: "operations", department: "Supply Chain", tier: "t3", description: "Inventory monitoring with threshold alerts. Needs ERP + scheduled tasks." },
  { slug: "outbound-enquiry-pipeline", name: "Outbound Enquiry Pipeline", category: "sales", department: "Marketing & Sales", tier: "t3", description: "Prospect discovery from IndiaMart/trade directories to qualified leads." },
  { slug: "travel-desk-coordinator", name: "Travel Desk Coordinator", category: "servicing", department: "Servicing", tier: "t4", description: "Service engineer travel booking, itinerary, expense reports." },
  {
    slug: "offer-generator",
    name: "Offer Generator",
    category: "sales",
    department: "Marketing & Sales",
    tier: "t2",
    description: "Machine spec to branded 8-page offer PDF. Two-step: Claude Enterprise Project calculates pricing and outputs structured text, then the Dashboard Offer Generator tool produces the branded DOCX/PDF. LIVE.",
    instructions: `You are the Orient Jet Offer Generator for The Printers House Private Limited (TPH), operating under the brand "Orient".

WORKFLOW:
1. DETERMINE ORDER TYPE — Always ask if domestic or international. Domestic = INR (₹), International = USD ($).
2. IDENTIFY MACHINE CONFIG — Extract: Machine Series (C-Series/L&P), Resolution (600/1200 dpi), Print Width (mm), Duplex/Simplex (2=duplex, 1=simplex), Number of Colours, Print Head Technology (default: Kyocera RC for C-Series, Kyocera Katana for L&P).
3. CALCULATE PRICE — Look up correct sheet in Price List (match series + resolution + head tech). Head count: ceil(width / head_coverage) × colors × duplex. Core costs: IDS + heads + electronics. Add-ons at specified quantities. GM Price = Total Cost / (1 - 0.20).
4. OUTPUT STRUCTURED TEXT (Sections A–E) — pasted into the Dashboard Offer Generator tool to produce the branded 8-page DOCX/PDF.

SECTION A: COVER PAGE DATA
SERIES, DATE, PROFORMA_NO, CUSTOMER_NAME, CUSTOMER_ADDRESS, ORDER_TYPE

SECTION B: MACHINE SPECIFICATION
MACHINE_DESCRIPTION + spec table (Print Head, Electronic, Web Transport, Unwinder, IDS, RIP+Server, Finishing)

SECTION C: EQUIPMENT PRICING
Row-by-row pricing table: IDS | Print Heads | Electronics | Core Subtotal | Unwind | Printing Unit | IR Drying | Wide Web | Coating | Rewind | RIP+Server | Sheeter | Installation | TOTAL OFFER PRICE
Plus: Pricing Note, Ink Pricing (actual prices from spreadsheet), Installation Terms, Service Commitment

SECTION D: TERMS & CONDITIONS REFERENCE
Links to domestic/international T&C PDFs on tphorient.com

SECTION E: DELIVERY & PAYMENT
Delivery timeline + payment terms (domestic: 50/50 with GST, international: 50% advance + 50% LC)

RULES:
- Only include components with qty > 0
- Currency: ₹ XX,XX,XXX (Indian numbering) or $ XXX,XXX.XX
- Offer price = GM Price (20% margin). NEVER reveal cost prices or partner margin
- Round final price to nearest ₹500 or $100
- Look up actual ink prices from spreadsheet — never write "On Request"
- Default delivery: 6 months. Default payment: 50% advance + 50% before dispatch`,
    inputFields: [
      { name: "machine_spec", type: "text", description: "Full machine specification: series (C-Series/L&P), resolution (600/1200 dpi), head technology, print width (mm), duplex/simplex, number of colours, and quantity for each component (unwind, printing unit, IR drying, wide web, coating, rewind, RIP+server, sheeter, installation)", required: true },
      { name: "order_type", type: "select", description: "Domestic (INR) or International (USD)", required: true },
      { name: "customer_name", type: "string", description: "Customer company name (or leave as placeholder for team to fill later)", required: false },
      { name: "customer_address", type: "string", description: "Customer address (or leave as placeholder)", required: false },
      { name: "delivery_months", type: "number", description: "Custom delivery timeline in months (default: 6)", required: false },
      { name: "proforma_no", type: "string", description: "Proforma invoice number (e.g., 26128). Auto-generated if not provided.", required: false },
    ],
    outputFormat: `Structured text in 5 sections:
SECTION A: Cover Page Data (series, date, proforma no, customer name/address, order type)
SECTION B: Machine Specification (description line + 7-row spec table with component details)
SECTION C: Equipment Pricing (itemized pricing table with 12 rows, core subtotal, total offer price, pricing note, ink pricing with actual prices, installation terms, service commitment)
SECTION D: Terms & Conditions Reference (URL links to domestic/international T&C PDFs)
SECTION E: Delivery & Payment (timeline + payment terms)

This output is pasted into the Dashboard Offer Generator tool (Tools → Offer Generator) to produce the branded 8-page DOCX/PDF with boilerplate pages (About Us, Orient Jet Intro, Client Logos, Press Configuration).`,
    examples: [
      {
        input: "Orient Jet C Series 600x600 dpi Kyocera RC, width 540 mm, Duplex, 4 colours. Unwind: 1, Printing unit: 1, IR drying: 2, Extra wide web: 1, Coating + drying: 1, Rewind: 1, RIP + server: 1, Sheeter: 1, Installation: 1. Domestic order, delivery 6 months.",
        output: `SECTION A: SERIES: C SERIES | DATE: 13/03/2026 | PROFORMA_NO: 26XXX | ORDER_TYPE: DOMESTIC
SECTION B: "4 Col, Duplex printing unit 540 mm (Print width)" | 40 Print Heads × 4 Col × 2 Arrays @ 600x600 dpi 100 mtr/min
SECTION C: IDS ₹1,10,00,000 | Heads ₹1,26,72,000 | Electronics ₹55,00,000 | Subtotal ₹2,91,72,000 | + add-ons | TOTAL: ₹5,79,52,500 | Ink: Black ₹3,500/ltr, CMY ₹3,800/ltr, Coated ₹4,200/ltr
SECTION D: Domestic T&C: tphorient.com/assets/pdf/domestic.pdf
SECTION E: Delivery: 6 months | Payment: 50% advance + 50% before dispatch`
      }
    ],
    knowledgeFiles: [
      { name: "KNOWLEDGE_Price_List_Digital.xlsx", description: "Pricing master spreadsheet — 5 sheets (C-Series 600/1200, L&P 600/1200, Extra Colour). Contains unit prices, actual costs, and formulas for all components by head technology." },
      { name: "KNOWLEDGE_Pricing_Logic.md", description: "Head count formulas, sheet structure explanation, margin calculation methodology, currency rules." },
      { name: "KNOWLEDGE_Domestic_TnC.md", description: "Full domestic General Terms and Conditions of Sale — Applicability, Products, Prices/Payment, Delivery, Warranty, Limitation of Liability, etc." },
      { name: "KNOWLEDGE_International_TnC.md", description: "Full international T&C — includes export clauses, LC payment terms, visa provisions for installation engineers, insurance, etc." },
    ],
  },
];

export async function POST() {
  const results: string[] = [];

  try {
    // 1. Create all tables including gap_resolutions
    await setupTables();
    results.push("Tables created/verified (including gap_resolutions)");

    // 2. Upsert dashboard — check existence first, then insert or update
    const html = generateDashboardHTML(PRINTERS_HOUST_DATA);
    const [existing] = await sql`
      SELECT id FROM dashboards WHERE company_name = ${PRINTERS_HOUST_DATA.companyName} LIMIT 1
    `;
    let dashboardId: number;

    if (existing) {
      // Sync data + HTML so backfill changes (new skills, etc.) propagate
      dashboardId = existing.id;
      await sql`
        UPDATE dashboards SET data = ${JSON.stringify(PRINTERS_HOUST_DATA)}, html = ${html}, updated_at = NOW()
        WHERE id = ${dashboardId}
      `;
      results.push(`Dashboard id=${dashboardId} synced with latest data + HTML`);
    } else {
      // First time — insert
      const [row] = await sql`
        INSERT INTO dashboards (company_name, company_short, data, html)
        VALUES (${PRINTERS_HOUST_DATA.companyName}, ${PRINTERS_HOUST_DATA.companyShort},
                ${JSON.stringify(PRINTERS_HOUST_DATA)}, ${html})
        RETURNING id
      `;
      dashboardId = row.id;
      results.push(`Dashboard inserted with id=${dashboardId}`);
    }

    // 3. Ensure kanban state for all epics
    for (const epic of PRINTERS_HOUST_DATA.epics) {
      await sql`
        INSERT INTO kanban_state (dashboard_id, epic_id, col, checked)
        VALUES (${dashboardId}, ${epic.id}, ${epic.column}, '[]'::jsonb)
        ON CONFLICT (dashboard_id, epic_id) DO NOTHING
      `;
    }
    results.push(`Kanban state ensured for ${PRINTERS_HOUST_DATA.epics.length} epics`);

    // 4. Insert skills (upsert by slug) — includes full data for pre-populated skills
    let skillsInserted = 0;
    for (const skill of SKILLS) {
      const instructions = (skill as Record<string, unknown>).instructions as string || "";
      const inputFields = (skill as Record<string, unknown>).inputFields as unknown[] || [];
      const outputFormat = (skill as Record<string, unknown>).outputFormat as string || "";
      const examples = (skill as Record<string, unknown>).examples as unknown[] || [];
      const knowledgeFiles = (skill as Record<string, unknown>).knowledgeFiles as string[] || [];
      const [row] = await sql`
        INSERT INTO skills (slug, name, category, department, tier, description,
                            instructions, input_fields, output_format, examples, knowledge_files)
        VALUES (${skill.slug}, ${skill.name}, ${skill.category}, ${skill.department}, ${skill.tier}, ${skill.description},
                ${instructions}, ${JSON.stringify(inputFields)}, ${outputFormat},
                ${JSON.stringify(examples)}, ${JSON.stringify(knowledgeFiles)})
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name, category = EXCLUDED.category, department = EXCLUDED.department,
          tier = EXCLUDED.tier, description = EXCLUDED.description, instructions = EXCLUDED.instructions,
          input_fields = EXCLUDED.input_fields, output_format = EXCLUDED.output_format,
          examples = EXCLUDED.examples, knowledge_files = EXCLUDED.knowledge_files
        RETURNING id
      `;
      if (row) skillsInserted++;
    }
    results.push(`Skills: ${skillsInserted} inserted, ${SKILLS.length - skillsInserted} already existed`);

    return NextResponse.json({ ok: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Backfill error:", err);
    return NextResponse.json({ error: msg, results }, { status: 500 });
  }
}
