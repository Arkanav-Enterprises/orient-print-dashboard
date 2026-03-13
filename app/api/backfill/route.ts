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
        { name: "Offer Creation with Pricing", tier: "t2", complexity: "beginner", skill: "sales:create-an-asset + docx/pdf", skillStatus: "exists", skillNotes: "Needs pricing DB as knowledge file" },
        { name: "Instant Price Generator", tier: "t1", complexity: "beginner", skill: "—", skillStatus: "custom", skillNotes: "Calculator logic in instructions + spreadsheet" },
        { name: "Configuration Suggestor", tier: "t1", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Product recommendation engine skill needed" },
        { name: "Report Writer + CRM Update", tier: "t3", complexity: "intermediate", skill: "sales:pipeline-review", skillStatus: "partial", skillNotes: "Needs CRM MCP connector for custom ERP" },
        { name: "Presentation Generation", tier: "t2", complexity: "beginner", skill: "pptx", skillStatus: "exists", skillNotes: "Works with company template" },
        { name: "Auto Email Writing", tier: "t1", complexity: "beginner", skill: "sales:draft-outreach", skillStatus: "exists", skillNotes: "Customize tone for company voice" },
        { name: "SEO Workflow", tier: "t2", complexity: "beginner", skill: "marketing:seo-audit", skillStatus: "exists", skillNotes: "Add domain-specific keywords" },
        { name: "Meta & Google Ad Management", tier: "t3", complexity: "intermediate", skill: "marketing:campaign-plan", skillStatus: "partial", skillNotes: "Strategy + copy only, no platform integration" },
        { name: "Image & Video Generation", tier: "t4", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Requires DALL-E / Midjourney / Runway" },
        { name: "Order Projections from Pipeline", tier: "t3", complexity: "intermediate", skill: "sales:forecast", skillStatus: "partial", skillNotes: "Needs CRM data feed" },
        { name: "Auto Sales Follow-Up Workflow", tier: "t3", complexity: "intermediate", skill: "sales:pipeline-review + sales:draft-outreach", skillStatus: "exists", skillNotes: "Needs CRM/Excel MCP connector for auto-tracking" },
        { name: "Outbound Enquiry Generation", tier: "t3", complexity: "intermediate", skill: "sales:account-research + sales:draft-outreach", skillStatus: "partial", skillNotes: "Prospect discovery via web search; needs IndiaMart/LinkedIn data" },
      ],
    },
    {
      name: "Design",
      useCases: [
        { name: "AutoCAD Design Modification", tier: "t4", complexity: "advanced", skill: "—", skillStatus: "custom", skillNotes: "Claude generates scripts, can't run AutoCAD" },
        { name: "New Design Acceleration", tier: "t4", complexity: "advanced", skill: "—", skillStatus: "custom", skillNotes: "Needs external CAD AI tools" },
        { name: "BOM Generation", tier: "t2", complexity: "intermediate", skill: "xlsx", skillStatus: "partial", skillNotes: "Custom skill with component library needed" },
        { name: "Site Layout Drawing", tier: "t4", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Needs AutoCAD / drawing templates" },
        { name: "Email Writer", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Just needs design-context instructions" },
      ],
    },
    {
      name: "Supply Chain",
      useCases: [
        { name: "Vendor Finder", tier: "t2", complexity: "beginner", skill: "operations:vendor-management", skillStatus: "exists", skillNotes: "+ web search for new vendors" },
        { name: "RFQ Generation", tier: "t2", complexity: "beginner", skill: "docx / pdf", skillStatus: "partial", skillNotes: "Custom RFQ template needed" },
        { name: "PO Creation", tier: "t3", complexity: "beginner", skill: "docx / pdf", skillStatus: "partial", skillNotes: "Needs ERP for PO numbering" },
        { name: "Shortage Identification", tier: "t3", complexity: "intermediate", skill: "xlsx", skillStatus: "partial", skillNotes: "Needs ERP MCP for inventory data" },
        { name: "Cost Analysis & Vendor Reports", tier: "t2", complexity: "beginner", skill: "operations:vendor-review", skillStatus: "exists", skillNotes: "Works with uploaded data" },
        { name: "Email Writer & Follow-Up", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Simple instructions" },
        { name: "Min Reorder Level Alerts", tier: "t3", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "ERP connector + scheduled task" },
        { name: "Chase Follow-Up Dashboard", tier: "t3", complexity: "advanced", skill: "xlsx (partial)", skillStatus: "custom", skillNotes: "Complex: ERP + scheduling + multi-user" },
      ],
    },
    {
      name: "Production & Maintenance",
      useCases: [
        { name: "Predictive Maintenance", tier: "t4", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Start rule-based, evolve to ML" },
        { name: "Email Writer", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Simple instructions" },
        { name: "Production Review Presentations", tier: "t2", complexity: "beginner", skill: "pptx", skillStatus: "exists", skillNotes: "Works with production data input" },
        { name: "Forward Stock Projections", tier: "t3", complexity: "intermediate", skill: "xlsx", skillStatus: "partial", skillNotes: "Needs ERP + sales pipeline data" },
      ],
    },
    {
      name: "Accounts",
      useCases: [
        { name: "Invoice Generation", tier: "t3", complexity: "intermediate", skill: "pdf / docx", skillStatus: "partial", skillNotes: "Needs ERP integration" },
        { name: "MIS Reports", tier: "t3", complexity: "intermediate", skill: "xlsx", skillStatus: "partial", skillNotes: "Needs ERP data feed" },
        { name: "Email Writer", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Simple instructions" },
        { name: "Financial Presentations", tier: "t2", complexity: "beginner", skill: "pptx", skillStatus: "exists", skillNotes: "Works with financial data input" },
        { name: "AI Excel Assistant", tier: "t1", complexity: "beginner", skill: "xlsx", skillStatus: "exists", skillNotes: "Excellent immediate match" },
      ],
    },
    {
      name: "HR & IT",
      useCases: [
        { name: "Job Description Writer", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Manufacturing context in instructions" },
        { name: "Job Posting to Portals", tier: "t3", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Needs platform APIs" },
        { name: "Salary Sheet Maker", tier: "t2", complexity: "intermediate", skill: "xlsx", skillStatus: "exists", skillNotes: "Custom template with PF/ESI/TDS logic" },
        { name: "ERP Coding Assistant", tier: "t1", complexity: "intermediate", skill: "Built-in coding", skillStatus: "builtin", skillNotes: "Add ERP schema as knowledge" },
        { name: "Email Writer", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Simple instructions" },
        { name: "KRA/KPI Generator", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Manufacturing KRA templates in instructions" },
      ],
    },
    {
      name: "Servicing",
      useCases: [
        { name: "AI Troubleshooting Assistant", tier: "t2", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Technical manual knowledge base skill" },
        { name: "Service Email Writer", tier: "t1", complexity: "beginner", skill: "Built-in", skillStatus: "builtin", skillNotes: "Simple instructions" },
        { name: "AI Travel Desk", tier: "t4", complexity: "intermediate", skill: "—", skillStatus: "custom", skillNotes: "Needs Travel API MCP connector" },
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
    { id: "e3", name: "T1: Pricing & Configuration", department: "Marketing & Sales", tier: "t1", column: "backlog", items: ["Upload pricing master spreadsheet", "Write Pricing Calculator skill instructions", "Write Configuration Suggestor skill instructions", "Upload product knowledge base", "Test with 10 real customer scenarios"] },
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
