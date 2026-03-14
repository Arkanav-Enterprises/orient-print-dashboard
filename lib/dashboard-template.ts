import type { DashboardData } from "./schema";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateDashboardHTML(data: DashboardData): string {
  const tierCounts = [0, 0, 0, 0];
  const skillCounts = { exists: 0, partial: 0, builtin: 0, custom: 0 };
  const complexityCounts = { beginner: 0, intermediate: 0, advanced: 0 };
  const deptShortNames: Record<string, string> = {};

  const tierSkillMatrix = [
    { exists: 0, builtin: 0, partial: 0, custom: 0 },
    { exists: 0, builtin: 0, partial: 0, custom: 0 },
    { exists: 0, builtin: 0, partial: 0, custom: 0 },
    { exists: 0, builtin: 0, partial: 0, custom: 0 },
  ];
  let readyCount = 0;
  let needsWorkCount = 0;

  data.departments.forEach((dept, i) => {
    const short = dept.name.length > 6 ? dept.name.split(/[\s&]/)[0].slice(0, 4) : dept.name;
    deptShortNames[dept.name] = short;
    dept.useCases.forEach((uc) => {
      const tierIdx = parseInt(uc.tier[1]) - 1;
      if (tierIdx >= 0 && tierIdx < 4) {
        tierCounts[tierIdx]++;
        tierSkillMatrix[tierIdx][uc.skillStatus]++;
      }
      skillCounts[uc.skillStatus]++;
      complexityCounts[uc.complexity]++;
      if (uc.skillStatus === "exists" || uc.skillStatus === "builtin") {
        readyCount++;
      } else {
        needsWorkCount++;
      }
    });
  });

  const blockerGaps = data.gaps.filter(g => g.label.toUpperCase().includes("BLOCKER"));
  const blockedEpics = data.epics.filter(e => e.column === "blocked");

  const deptCardsHtml = data.departments
    .map(
      (dept) => `
          <div class="dept-card">
            <div class="dept-header"><span class="dept-name">${escapeHtml(dept.name)}</span><span class="dept-count">${dept.useCases.length} use cases</span></div>
            ${dept.useCases
              .map(
                (uc) => `<div class="use-case" data-tier="${uc.tier}"><div class="tier-dot ${uc.tier}"></div><span class="uc-name">${escapeHtml(uc.name)}</span><span class="uc-complexity ${uc.complexity}">${uc.complexity.charAt(0).toUpperCase() + uc.complexity.slice(1)}</span></div>`
              )
              .join("\n")}
          </div>`
    )
    .join("\n");

  const skillRowsHtml = data.departments
    .flatMap((dept) =>
      dept.useCases.map(
        (uc) =>
          `<tr data-status="${uc.skillStatus}"><td>${escapeHtml(deptShortNames[dept.name] || dept.name)}</td><td>${escapeHtml(uc.name)}</td><td>${escapeHtml(uc.skill)}</td><td><span class="badge ${uc.skillStatus}">${({ exists: "Match", partial: "Partial", builtin: "Built-in", custom: "Custom" })[uc.skillStatus]}</span></td><td>${escapeHtml(uc.skillNotes)}</td></tr>`
      )
    )
    .join("\n");

  const knowledgeTooltips: Record<string, string> = {
    "pricing database": "Complete pricing spreadsheet with machine configurations, component costs, margin percentages, and discount tiers. Excel or CSV format preferred.",
    "product catalog": "Full product catalog with model names, specifications, available configurations, and high-res images. PDF or structured document.",
    "machine specs": "Technical specification sheets for each machine model — dimensions, print speeds, resolution options, media compatibility, and power requirements.",
    "brand guide": "Brand guidelines PDF including logos (all formats), color palette (hex/RGB), typography rules, tone of voice, and usage examples.",
    "brand guidelines": "Brand guidelines PDF including logos (all formats), color palette (hex/RGB), typography rules, tone of voice, and usage examples.",
    "email templates": "5-10 real email examples currently used by the team — sales outreach, follow-ups, quotes, internal comms. Shows current tone and format.",
    "past decks": "3-5 recent PowerPoint/Keynote presentations used for sales pitches, reviews, or reporting. Needed to match existing style and structure.",
    "keyword lists": "Target SEO keywords and search terms your team tracks. Include search volume and rankings if available. Spreadsheet format.",
    "competitor urls": "List of 5-10 competitor websites with specific product/service pages to monitor for SEO benchmarking and content gap analysis.",
    "historical win rates": "Past 12-24 months of deal data — won/lost, deal size, sales cycle length, by product line. CRM export or spreadsheet.",
    "seasonal patterns": "Monthly/quarterly revenue data showing seasonal trends. At least 2 years of history for pattern recognition.",
    "pipeline exports": "Current sales pipeline export from your CRM — deal stage, value, expected close date, probability. CSV or Excel.",
    "lead tracker/crm exports": "Current lead tracking spreadsheet or CRM export with contact info, deal status, last interaction, and notes.",
    "icp": "Ideal Customer Profile document — target industries, company size, geography, job titles, pain points, and buying triggers.",
    "design standards": "Engineering design standards document — tolerances, material specs, naming conventions, approval workflows.",
    "autolisp examples": "Sample AutoLISP or Python scripts currently used for CAD automation. Shows existing patterns and naming conventions.",
    "component databases": "Component/parts database with part numbers, dimensions, materials, and supplier info. Excel or database export.",
    "component library with part numbers/costs": "Complete parts list with part numbers, descriptions, unit costs, preferred suppliers, and lead times. Excel format.",
    "approved vendor list": "Master vendor list with contact info, materials/services supplied, payment terms, rating/performance history.",
    "rfq/po templates": "Current RFQ and Purchase Order templates (Word/Excel) showing your standard format, terms, and required fields.",
    "inventory policies": "Inventory management policies — min/max levels, reorder points, safety stock rules, ABC classification.",
    "lead times": "Supplier lead time data by component/material — average, minimum, and maximum delivery times.",
    "reorder levels": "Current reorder point settings per SKU/component with historical consumption rates.",
    "production targets": "Monthly/weekly production targets by product line — units, capacity utilization, shift schedules.",
    "bom templates per model": "Bill of Materials templates for each machine model showing assembly hierarchy, part quantities, and sub-assemblies.",
    "machine manuals": "OEM machine manuals, maintenance guides, and troubleshooting flowcharts. PDF format.",
    "historical failure data": "Maintenance logs showing past breakdowns — machine, failure type, root cause, downtime, repair action. Spreadsheet.",
    "gst rules": "GST rate schedule applicable to your products/services, including HSN/SAC code mappings and exemptions.",
    "hsn/sac codes": "Complete HSN/SAC code mapping for all products and services with applicable GST rates.",
    "invoice templates": "Current invoice templates (Word/Excel/PDF) showing your standard format, numbering, and required fields.",
    "financial templates": "Financial report templates — P&L, balance sheet, cash flow formats currently used for board/management reporting.",
    "chart formats": "Preferred chart styles and formatting for financial presentations — colors, chart types, data label conventions.",
    "role templates": "Job description templates for common roles, including standard sections, qualifications format, and company boilerplate.",
    "salary benchmarks": "Salary data by role/level — current pay bands, market benchmarks, benefits structure. Confidential spreadsheet.",
    "salary structures": "Employee salary structure — basic, HRA, allowances, deductions breakdown. Template or sample pay slip.",
    "pf/esi/tds rules": "Current PF, ESI, and TDS calculation rules, exemption limits, and employer contribution rates for the latest fiscal year.",
    "erp schema": "Database schema documentation — table names, column definitions, relationships, and key stored procedures.",
    "database structure": "ER diagram or schema export showing tables, primary/foreign keys, and data types used in your ERP system.",
    "api docs": "API documentation for your ERP system — endpoints, authentication, request/response formats, rate limits.",
    "technical manuals": "Machine service manuals with troubleshooting trees, wiring diagrams, and maintenance procedures. PDF or digital format.",
    "service bulletins": "Recent service bulletins, technical advisories, and known-issue reports issued by OEM or your service team.",
    "parts catalog": "Spare parts catalog with part numbers, descriptions, compatibility (which machines), pricing, and availability status.",
    "travel policy": "Company travel policy document — booking rules, per diem rates, approval workflow, preferred airlines/hotels, expense limits.",
    "preferred vendors": "List of preferred travel vendors — airlines, hotels, cab services with corporate rates and booking contacts.",
    "expense templates": "Current expense report template (Excel/PDF) showing required fields, categories, approval signatures, and reimbursement rules.",
  };

  function getKnowledgeTooltip(item: string): string {
    const key = item.toLowerCase().trim();
    if (knowledgeTooltips[key]) return knowledgeTooltips[key];
    // Fuzzy match: check if any key is contained in the item or vice versa
    for (const [k, v] of Object.entries(knowledgeTooltips)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return "Upload the relevant document, spreadsheet, or reference material for this knowledge area.";
  }

  const projectsHtml = data.projects
    .map(
      (p) => {
        const relatedEpics = data.epics.filter(e => e.department === p.department);
        const tierKey = p.tier.toLowerCase().replace(/[^t1-4]/g, "").slice(0, 2) || "t1";
        const epicListHtml = relatedEpics.length > 0
          ? relatedEpics.map(e => {
              const colLabels: Record<string, string> = { backlog: "Backlog", progress: "In Progress", blocked: "Blocked", done: "Done" };
              const colColors: Record<string, string> = { backlog: "var(--text-quaternary)", progress: "var(--blue)", blocked: "var(--orange)", done: "var(--green)" };
              return `<div class="proj-epic"><span class="proj-epic-name">${escapeHtml(e.name)}</span><span class="proj-epic-status" style="color:${colColors[e.column] || "var(--text-tertiary)"}">${colLabels[e.column] || e.column}</span><span class="proj-epic-tasks">${e.items.length} tasks</span></div>`;
            }).join("")
          : `<div class="proj-no-epics">No linked epics yet</div>`;
        const knowledgeItems = p.knowledge.split(",").map(s => s.trim()).filter(Boolean);
        const knowledgeChecklistHtml = knowledgeItems.map((item, idx) => {
          const tooltip = escapeHtml(getKnowledgeTooltip(item));
          return `<div class="proj-doc-check" id="projDocCheck-${p.number}-${idx}"><span class="proj-doc-check-icon">&#9675;</span><span class="proj-doc-check-text">${escapeHtml(item)}</span><span class="proj-doc-tip" tabindex="0">&#9432;<span class="proj-doc-tip-text">${tooltip}</span></span></div>`;
        }).join("");
        return `
          <div class="project-item" data-project="${p.number}" onclick="toggleProject(this)">
            <div class="proj-header">
              <div class="proj-header-left">
                <span class="proj-dept-badge">${escapeHtml(p.department)}</span>
                <span class="proj-tier-badge ${tierKey}">${escapeHtml(p.tier)}</span>
              </div>
              <span class="proj-chevron">&#9654;</span>
            </div>
            <div class="proj-name">${p.number}. ${escapeHtml(p.name)}</div>
            <div class="proj-desc">${escapeHtml(p.description)}</div>
            <div class="proj-detail">
              <div class="proj-detail-grid">
                <div class="proj-detail-section">
                  <div class="proj-detail-label">Use Cases</div>
                  <div class="proj-detail-value">${escapeHtml(p.useCaseRefs)}</div>
                </div>
                <div class="proj-detail-section">
                  <div class="proj-detail-label">Skills</div>
                  <div class="proj-detail-value">${escapeHtml(p.skills)}</div>
                </div>
                <div class="proj-detail-section">
                  <div class="proj-detail-label">Tier</div>
                  <div class="proj-detail-value">${escapeHtml(p.tier)}</div>
                </div>
              </div>
              <div class="proj-docs-section" onclick="event.stopPropagation()">
                <div class="proj-detail-label">Required Documents <span class="proj-doc-counter" id="projDocCounter-${p.number}"></span></div>
                <div class="proj-docs-checklist">${knowledgeChecklistHtml}</div>
                <div class="proj-docs-dropzone" id="projDocsDropzone-${p.number}" onclick="document.getElementById('projDocsInput-${p.number}').click()">
                  <div class="proj-docs-dropzone-text">Drop files here or click to upload</div>
                  <input type="file" id="projDocsInput-${p.number}" multiple style="display:none" onchange="uploadProjectDocs(${p.number}, this.files)">
                </div>
                <div class="proj-docs-list" id="projDocsList-${p.number}"></div>
              </div>
              <div class="proj-epics-section">
                <div class="proj-detail-label">Related Epics on Roadmap</div>
                <div class="proj-epics-list">${epicListHtml}</div>
              </div>
              <div class="proj-actions">
                <button class="proj-roadmap-btn" onclick="event.stopPropagation();goToPage('kanban')">View on Roadmap Board &rarr;</button>
              </div>
            </div>
          </div>`;
      }
    )
    .join("\n");

  const gapsJson = JSON.stringify(
    data.gaps.map((g, i) => ({
      id: g.id || ("gap-" + (i + 1)),
      label: g.label,
      title: g.title,
      description: g.description,
    }))
  );

  const customSkillsHtml = data.customSkills
    .map(
      (s) => `
            <div class="skill-card"><div class="skill-name">${escapeHtml(s.name)}</div><div class="skill-tag">${escapeHtml(s.tag)}</div><div class="skill-desc">${escapeHtml(s.description)}</div></div>`
    )
    .join("\n");

  const epicsJson = JSON.stringify(
    data.epics.map((e) => ({
      id: e.id,
      name: e.name,
      dept: e.department,
      tier: e.tier,
      col: e.column,
      items: e.items,
    }))
  );

  // Build skill creator seed data from custom skills + custom use cases
  const skillCreatorSeeds: { name: string; slug: string; description: string; department: string; tier: string; category: string }[] = [];
  const seenNames = new Set<string>();
  data.customSkills?.forEach((cs) => {
    const slug = cs.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    skillCreatorSeeds.push({ name: cs.name, slug, description: cs.description, department: "", tier: "t2", category: "custom" });
    seenNames.add(cs.name.toLowerCase());
  });
  data.departments?.forEach((dept) => {
    dept.useCases?.forEach((uc) => {
      if (uc.skillStatus === "custom" && !seenNames.has(uc.name.toLowerCase())) {
        const slug = uc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        skillCreatorSeeds.push({ name: uc.name, slug, description: uc.skillNotes || "", department: dept.name, tier: uc.tier, category: "custom" });
        seenNames.add(uc.name.toLowerCase());
      }
    });
  });
  const skillCreatorSeedsJson = JSON.stringify(skillCreatorSeeds);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Integration Rollout — ${escapeHtml(data.companyName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #000; --bg-card: #0a0a0a; --bg-card-hover: #111; --bg-elevated: #111;
    --border: #222; --border-light: #1a1a1a; --border-hover: #333;
    --text-primary: #ededed; --text-secondary: #888; --text-tertiary: #666; --text-quaternary: #444;
    --accent: #0070f3; --accent-hover: #0060df; --accent-light: rgba(0,112,243,0.1);
    --success: #0070f3; --green: #22c55e; --blue: #3b82f6; --orange: #f97316;
    --purple: #a855f7; --red: #ef4444; --yellow: #eab308; --cyan: #06b6d4; --pink: #f43f5e;
    --radius: 8px; --radius-sm: 6px; --radius-lg: 12px;
    --sidebar-width: 240px; --header-height: 64px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text-primary); font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .app { display: flex; min-height: 100vh; }
  .sidebar { width: var(--sidebar-width); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; background: var(--bg); }
  .sidebar-header { height: var(--header-height); display: flex; align-items: center; padding: 0 20px; border-bottom: 1px solid var(--border); gap: 10px; }
  .sidebar-logo { width: 28px; height: 28px; background: var(--text-primary); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: var(--bg); flex-shrink: 0; }
  .sidebar-title { font-size: 14px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-nav { flex: 1; padding: 12px 8px; overflow-y: auto; }
  .nav-section-label { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 12px 6px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--radius-sm); cursor: pointer; color: var(--text-secondary); font-size: 13px; font-weight: 500; transition: all 0.15s; user-select: none; }
  .nav-item:hover { background: var(--bg-card-hover); color: var(--text-primary); }
  .nav-item.active { background: var(--bg-elevated); color: var(--text-primary); }
  .nav-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; opacity: 0.7; }
  .nav-item.active .nav-icon { opacity: 1; }
  .nav-badge { margin-left: auto; font-size: 11px; color: var(--text-tertiary); background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 10px; }
  .sidebar-footer { padding: 12px 16px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-quaternary); }
  .main-area { flex: 1; margin-left: var(--sidebar-width); min-height: 100vh; }
  .topbar { height: var(--header-height); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 32px; gap: 16px; position: sticky; top: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(12px); z-index: 50; }
  .topbar-breadcrumb { font-size: 13px; color: var(--text-tertiary); display: flex; align-items: center; gap: 6px; }
  .topbar-breadcrumb span { color: var(--text-secondary); }
  .search-box { margin-left: auto; display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 12px; width: 260px; transition: border-color 0.15s; }
  .search-box:focus-within { border-color: var(--border-hover); }
  .search-box input { background: none; border: none; outline: none; color: var(--text-primary); font-size: 13px; font-family: inherit; width: 100%; }
  .search-box input::placeholder { color: var(--text-quaternary); }
  .search-icon { color: var(--text-quaternary); font-size: 14px; flex-shrink: 0; }
  .search-kbd { font-size: 10px; color: var(--text-quaternary); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; flex-shrink: 0; }
  .content { padding: 32px; max-width: 1200px; }
  .page { display: none; } .page.active { display: block; }
  .page-header { margin-bottom: 32px; }
  .page-title { font-size: 24px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; letter-spacing: -0.3px; }
  .page-desc { font-size: 14px; color: var(--text-secondary); max-width: 640px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 32px; }
  .kpi-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: border-color 0.15s; }
  .kpi-card:hover { border-color: var(--border-hover); }
  .kpi-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
  .kpi-value { font-size: 32px; font-weight: 700; color: var(--text-primary); letter-spacing: -1px; line-height: 1; }
  .kpi-sub { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .section-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
  .timeline-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
  .timeline-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; position: relative; overflow: hidden; transition: border-color 0.15s; }
  .timeline-card:hover { border-color: var(--border-hover); }
  .timeline-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
  .timeline-card.t1::before { background: var(--green); } .timeline-card.t2::before { background: var(--blue); }
  .timeline-card.t3::before { background: var(--orange); } .timeline-card.t4::before { background: var(--purple); }
  .tc-tier { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
  .t1 .tc-tier { color: var(--green); } .t2 .tc-tier { color: var(--blue); }
  .t3 .tc-tier { color: var(--orange); } .t4 .tc-tier { color: var(--purple); }
  .tc-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
  .tc-time { font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; }
  .tc-count { font-size: 28px; font-weight: 700; color: var(--text-primary); letter-spacing: -1px; }
  .tc-count-label { font-size: 12px; color: var(--text-secondary); }
  .tc-desc { font-size: 12px; color: var(--text-tertiary); margin-top: 12px; line-height: 1.6; }
  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
  .chart-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; }
  .chart-card h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 20px; }
  .donut-wrap { display: flex; align-items: center; gap: 28px; }
  .donut-legend { display: flex; flex-direction: column; gap: 10px; }
  .dl-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
  .dl-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
  .dl-count { color: var(--text-tertiary); font-size: 12px; }
  canvas { max-width: 100%; }
  .rec-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 32px; border-left: 3px solid var(--accent); }
  .rec-box h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
  .rec-box p { font-size: 13px; color: var(--text-secondary); line-height: 1.7; }
  .rec-box p strong { color: var(--text-primary); }
  .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
  .dept-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: border-color 0.15s; }
  .dept-card:hover { border-color: var(--border-hover); }
  .dept-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
  .dept-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
  .dept-count { font-size: 11px; color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 3px 10px; border-radius: 20px; }
  .use-case { padding: 8px 0; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 10px; }
  .use-case:last-child { border-bottom: none; }
  .tier-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .tier-dot.t1 { background: var(--green); } .tier-dot.t2 { background: var(--blue); }
  .tier-dot.t3 { background: var(--orange); } .tier-dot.t4 { background: var(--purple); }
  .uc-name { font-size: 13px; color: var(--text-secondary); flex: 1; }
  .uc-complexity { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
  .uc-complexity.beginner { background: rgba(34,197,94,0.1); color: var(--green); }
  .uc-complexity.intermediate { background: rgba(249,115,22,0.1); color: var(--orange); }
  .uc-complexity.advanced { background: rgba(239,68,68,0.1); color: var(--red); }
  .legend { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
  .filter-bar { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
  .filter-pill { font-size: 12px; padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .filter-pill:hover { border-color: var(--border-hover); color: var(--text-primary); }
  .filter-pill.active { background: var(--text-primary); color: var(--bg); border-color: var(--text-primary); }
  .table-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .skills-table { width: 100%; border-collapse: collapse; }
  .skills-table th { text-align: left; font-size: 12px; font-weight: 500; color: var(--text-secondary); padding: 12px 16px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02); }
  .skills-table td { padding: 10px 16px; border-bottom: 1px solid var(--border-light); font-size: 13px; color: var(--text-secondary); }
  .skills-table tr:last-child td { border-bottom: none; }
  .skills-table tr:hover td { background: rgba(255,255,255,0.02); }
  .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
  .badge.exists { background: rgba(34,197,94,0.1); color: var(--green); }
  .badge.partial { background: rgba(234,179,8,0.1); color: var(--yellow); }
  .badge.custom { background: rgba(239,68,68,0.1); color: var(--red); }
  .badge.builtin { background: rgba(59,130,246,0.1); color: var(--blue); }
  .project-list { display: flex; flex-direction: column; gap: 8px; }
  .project-item { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: border-color 0.15s, background 0.15s; cursor: pointer; }
  .project-item:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
  .proj-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .proj-header-left { display: flex; align-items: center; gap: 8px; }
  .proj-dept-badge { font-size: 11px; color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .proj-tier-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
  .proj-tier-badge.t1 { background: rgba(34,197,94,0.1); color: var(--green); }
  .proj-tier-badge.t2 { background: rgba(59,130,246,0.1); color: var(--blue); }
  .proj-tier-badge.t3 { background: rgba(249,115,22,0.1); color: var(--orange); }
  .proj-tier-badge.t4 { background: rgba(168,85,247,0.1); color: var(--purple); }
  .proj-chevron { color: var(--text-quaternary); font-size: 12px; transition: transform 0.2s; }
  .project-item.expanded .proj-chevron { transform: rotate(90deg); }
  .proj-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
  .proj-desc { font-size: 13px; color: var(--text-tertiary); margin-bottom: 0; }
  .proj-detail { display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
  .project-item.expanded .proj-detail { display: block; }
  .proj-detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
  .proj-detail-label { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .proj-detail-value { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
  .proj-epics-section { margin-bottom: 16px; }
  .proj-epics-list { display: flex; flex-direction: column; gap: 6px; }
  .proj-epic { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: var(--bg); border: 1px solid var(--border-light); border-radius: var(--radius-sm); }
  .proj-epic-name { font-size: 13px; color: var(--text-primary); flex: 1; }
  .proj-epic-status { font-size: 11px; font-weight: 600; }
  .proj-epic-tasks { font-size: 11px; color: var(--text-tertiary); }
  .proj-no-epics { font-size: 12px; color: var(--text-quaternary); padding: 8px 0; }
  .proj-actions { display: flex; gap: 8px; }
  .proj-roadmap-btn { padding: 8px 16px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--accent); background: transparent; color: var(--accent); transition: all 0.15s; font-family: inherit; }
  .proj-roadmap-btn:hover { background: var(--accent-light); }
  .proj-docs-section { margin-bottom: 16px; padding: 16px; background: var(--bg); border: 1px solid var(--border-light); border-radius: var(--radius); }
  .proj-doc-counter { font-size: 11px; color: var(--text-tertiary); font-weight: 400; text-transform: none; letter-spacing: 0; }
  .proj-docs-checklist { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .proj-doc-check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
  .proj-doc-check-icon { font-size: 14px; color: var(--text-quaternary); flex-shrink: 0; }
  .proj-doc-check.matched .proj-doc-check-icon { color: var(--green); }
  .proj-doc-check.matched .proj-doc-check-text { color: var(--text-tertiary); text-decoration: line-through; }
  .proj-doc-tip { position: relative; color: var(--text-quaternary); font-size: 14px; cursor: help; margin-left: 4px; flex-shrink: 0; }
  .proj-doc-tip-text { display: none; position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 12px; color: var(--text-secondary); line-height: 1.5; width: 280px; z-index: 200; box-shadow: 0 4px 16px rgba(0,0,0,0.5); pointer-events: none; }
  .proj-doc-tip:hover .proj-doc-tip-text, .proj-doc-tip:focus .proj-doc-tip-text { display: block; }
  .proj-docs-dropzone { border: 1px dashed var(--border); border-radius: var(--radius-sm); padding: 16px; text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
  .proj-docs-dropzone:hover, .proj-docs-dropzone.drag-over { border-color: var(--accent); background: var(--accent-light); }
  .proj-docs-dropzone-text { font-size: 12px; color: var(--text-quaternary); }
  .proj-docs-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
  .proj-doc-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-sm); }
  .proj-doc-icon { color: var(--accent); font-size: 14px; flex-shrink: 0; }
  .proj-doc-name { font-size: 13px; color: var(--text-secondary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .proj-doc-date { font-size: 11px; color: var(--text-quaternary); flex-shrink: 0; }
  .proj-doc-btn { background: none; border: none; cursor: pointer; font-size: 12px; padding: 4px 8px; border-radius: 4px; transition: background 0.15s; font-family: inherit; }
  .proj-doc-dl { color: var(--accent); }
  .proj-doc-dl:hover { background: var(--accent-light); }
  .proj-doc-del { color: var(--red); }
  .proj-doc-del:hover { background: rgba(239,68,68,0.1); }
  .gap-list { display: flex; flex-direction: column; gap: 8px; }
  .gap-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; border-left: 3px solid var(--red); cursor: pointer; transition: border-color 0.2s, background 0.15s; }
  .gap-card:hover { background: var(--bg-card-hover); }
  .gap-card.status-in_progress { border-left-color: var(--orange); }
  .gap-card.status-resolved { border-left-color: var(--green); }
  .gap-card .gap-header { display: flex; align-items: center; gap: 8px; }
  .gap-card .gap-number { font-size: 11px; color: var(--text-quaternary); font-weight: 600; margin-bottom: 4px; }
  .gap-card .gap-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
  .gap-card .gap-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.7; }
  .gap-card .gap-desc strong { color: var(--text-primary); }
  .gap-status-pill { font-size: 10px; font-weight: 600; text-transform: uppercase; padding: 2px 8px; border-radius: 10px; letter-spacing: 0.5px; }
  .gap-status-pill.open { background: rgba(239,68,68,0.15); color: #ef4444; }
  .gap-status-pill.in_progress { background: rgba(249,115,22,0.15); color: #f97316; }
  .gap-status-pill.resolved { background: rgba(34,197,94,0.15); color: #22c55e; }
  .gap-chevron { margin-left: auto; color: var(--text-quaternary); transition: transform 0.2s; font-size: 12px; }
  .gap-card.expanded .gap-chevron { transform: rotate(90deg); }
  .gap-form { display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
  .gap-card.expanded .gap-form { display: block; }
  .gap-form-row { margin-bottom: 12px; }
  .gap-form-label { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .gap-form-input { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; color: var(--text-primary); font-size: 13px; font-family: inherit; resize: vertical; }
  .gap-form-input:focus { outline: none; border-color: var(--accent); }
  .gap-form-input::placeholder { color: var(--text-quaternary); }
  .gap-linked-skills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .gap-skill-pill { display: inline-flex; align-items: center; gap: 4px; background: var(--accent-light); color: var(--accent); font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 10px; cursor: pointer; }
  .gap-skill-pill .pill-remove { font-size: 14px; cursor: pointer; opacity: 0.7; }
  .gap-skill-pill .pill-remove:hover { opacity: 1; }
  .gap-skill-pill .pill-name { cursor: pointer; }
  .gap-skill-pill .pill-name:hover { text-decoration: underline; }
  .gap-actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
  .gap-btn { padding: 6px 14px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary); transition: all 0.15s; }
  .gap-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
  .gap-btn-orange { border-color: var(--orange); color: var(--orange); }
  .gap-btn-orange:hover { background: rgba(249,115,22,0.1); }
  .gap-btn-green { border-color: var(--green); color: var(--green); }
  .gap-btn-green:hover { background: rgba(34,197,94,0.1); }
  .gap-btn-accent { border-color: var(--accent); color: var(--accent); }
  .gap-btn-accent:hover { background: var(--accent-light); }
  .gap-link-dropdown { position: relative; display: inline-block; }
  .gap-link-menu { display: none; position: absolute; bottom: 100%; left: 0; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); max-height: 200px; overflow-y: auto; min-width: 220px; z-index: 100; margin-bottom: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
  .gap-link-menu.open { display: block; }
  .gap-link-menu-item { padding: 8px 12px; font-size: 12px; color: var(--text-secondary); cursor: pointer; }
  .gap-link-menu-item:hover { background: var(--bg-card-hover); color: var(--text-primary); }
  .gap-progress-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 12px; color: var(--text-tertiary); }
  .gap-progress-track { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .gap-progress-fill { height: 100%; background: var(--green); border-radius: 2px; transition: width 0.3s; }
  .skills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; margin-top: 24px; }
  .skill-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
  .skill-card .skill-name { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
  .skill-card .skill-tag { font-size: 10px; color: var(--orange); font-weight: 500; }
  .skill-card .skill-desc { font-size: 12px; color: var(--text-tertiary); margin-top: 8px; line-height: 1.5; }
  .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; min-height: 500px; }
  .kanban-col { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; min-height: 400px; transition: border-color 0.15s; }
  .kanban-col.drag-over { border-color: var(--accent); background: var(--accent-light); }
  .kanban-col-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
  .kanban-col-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }
  .col-backlog .kanban-col-title { color: var(--text-tertiary); }
  .col-progress .kanban-col-title { color: var(--blue); }
  .col-blocked .kanban-col-title { color: var(--orange); }
  .col-done .kanban-col-title { color: var(--green); }
  .kanban-col-count { font-size: 11px; color: var(--text-tertiary); background: rgba(255,255,255,0.04); padding: 2px 8px; border-radius: 10px; font-weight: 500; }
  .epic-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 8px; cursor: grab; transition: all 0.15s; }
  .epic-card:hover { border-color: var(--border-hover); background: rgba(255,255,255,0.05); }
  .epic-card.dragging { opacity: 0.4; cursor: grabbing; }
  .epic-card .epic-tier { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .epic-card .epic-tier.t1 { color: var(--green); } .epic-card .epic-tier.t2 { color: var(--blue); }
  .epic-card .epic-tier.t3 { color: var(--orange); } .epic-card .epic-tier.t4 { color: var(--purple); }
  .epic-card .epic-name { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
  .epic-card .epic-dept { font-size: 11px; color: var(--text-tertiary); margin-bottom: 8px; }
  .epic-card .epic-items { list-style: none; padding: 0; margin: 0; display: none; }
  .epic-card.expanded .epic-items { display: block; }
  .epic-card .epic-items li { font-size: 11px; color: var(--text-tertiary); padding: 4px 0 4px 12px; border-left: 2px solid var(--border); margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
  .item-check { width: 14px; height: 14px; border: 1px solid var(--border-hover); border-radius: 3px; flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; transition: all 0.15s; }
  .item-check.checked { background: var(--green); border-color: var(--green); color: #fff; }
  .checked-item { color: var(--text-quaternary) !important; text-decoration: line-through; }
  .epic-toggle { font-size: 11px; color: var(--text-tertiary); cursor: pointer; margin-top: 6px; user-select: none; transition: color 0.15s; }
  .epic-toggle:hover { color: var(--text-secondary); }
  .epic-progress { height: 2px; background: var(--border); border-radius: 1px; margin-top: 8px; overflow: hidden; }
  .epic-progress-fill { height: 100%; border-radius: 1px; transition: width 0.3s; }
  .col-backlog .epic-progress-fill { background: var(--text-quaternary); }
  .col-progress .epic-progress-fill { background: var(--blue); }
  .col-blocked .epic-progress-fill { background: var(--orange); }
  .col-done .epic-progress-fill { background: var(--green); }
  .kanban-legend { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
  .kanban-legend-label { font-size: 12px; color: var(--text-quaternary); }
  .kanban-legend-item { font-size: 12px; display: flex; align-items: center; gap: 4px; color: var(--text-secondary); }
  .kanban-legend-dot { width: 8px; height: 8px; border-radius: 2px; }
  .progress-bar-wrap { margin-bottom: 32px; }
  .progress-bar-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .progress-bar-label { font-size: 13px; color: var(--text-secondary); }
  .progress-bar-pct { font-size: 13px; color: var(--text-primary); font-weight: 600; }
  .progress-bar-track { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; display: flex; }
  .progress-bar-fill { height: 100%; transition: width 0.5s; }
  .search-match { display: none; } .search-match.visible { display: block; margin-bottom: 24px; }
  .search-match-title { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
  .search-result { padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 6px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 10px; }
  .search-result:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
  .search-result .sr-name { font-size: 13px; color: var(--text-primary); }
  .search-result .sr-meta { font-size: 11px; color: var(--text-tertiary); margin-left: auto; }
  /* Overview: Readiness Strip */
  .readiness-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
  .readiness-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; cursor: pointer; transition: border-color 0.15s, background 0.15s; position: relative; border-left: 3px solid var(--border); }
  .readiness-card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
  .readiness-card.rc-green { border-left-color: var(--green); }
  .readiness-card.rc-amber { border-left-color: var(--orange); }
  .readiness-card.rc-red { border-left-color: var(--red); }
  .readiness-count { font-size: 36px; font-weight: 700; letter-spacing: -1px; line-height: 1; margin-bottom: 4px; }
  .rc-green .readiness-count { color: var(--green); }
  .rc-amber .readiness-count { color: var(--orange); }
  .rc-red .readiness-count { color: var(--red); }
  .readiness-label { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
  .readiness-sub { font-size: 12px; color: var(--text-tertiary); }
  .readiness-arrow { position: absolute; top: 24px; right: 20px; color: var(--text-quaternary); font-size: 16px; transition: transform 0.15s; }
  .readiness-card:hover .readiness-arrow { transform: translateX(3px); color: var(--text-secondary); }

  /* Overview: Skill × Tier Matrix */
  .skill-tier-matrix { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 32px; }
  .skill-tier-matrix h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 20px; }
  .matrix-legend { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .matrix-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
  .matrix-legend-dot { width: 10px; height: 10px; border-radius: 3px; }
  .matrix-row { display: flex; align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid var(--border-light); cursor: pointer; transition: background 0.15s; border-radius: var(--radius-sm); }
  .matrix-row:last-child { border-bottom: none; }
  .matrix-row:hover { background: var(--bg-card-hover); }
  .matrix-label { width: 140px; flex-shrink: 0; font-size: 13px; font-weight: 500; color: var(--text-secondary); }
  .matrix-bar { flex: 1; display: flex; height: 24px; border-radius: 4px; overflow: hidden; background: var(--border-light); }
  .matrix-segment { height: 100%; transition: flex 0.3s; min-width: 0; }
  .matrix-segment.seg-exists { background: var(--green); }
  .matrix-segment.seg-builtin { background: var(--blue); }
  .matrix-segment.seg-partial { background: var(--yellow); }
  .matrix-segment.seg-custom { background: var(--red); }
  .matrix-fraction { width: 80px; flex-shrink: 0; text-align: right; font-size: 13px; color: var(--text-secondary); font-weight: 500; }
  .matrix-fraction strong { color: var(--text-primary); }

  /* Overview: Tier readiness pill */
  .tc-readiness { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 10px; margin-top: 10px; }
  .tc-readiness.ready-high { background: rgba(34,197,94,0.15); color: var(--green); }
  .tc-readiness.ready-mid { background: rgba(234,179,8,0.15); color: var(--yellow); }
  .tc-readiness.ready-low { background: rgba(239,68,68,0.15); color: var(--red); }

  /* Overview: Action Items */
  .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px; }
  .action-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .action-card h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }
  .action-list { display: flex; flex-direction: column; gap: 8px; }
  .action-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s; }
  .action-item:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
  .action-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
  .action-icon.ai-red { background: rgba(239,68,68,0.15); color: var(--red); }
  .action-icon.ai-orange { background: rgba(249,115,22,0.15); color: var(--orange); }
  .action-icon.ai-blue { background: rgba(59,130,246,0.15); color: var(--blue); }
  .action-text { font-size: 13px; color: var(--text-secondary); flex: 1; }
  .action-text strong { color: var(--text-primary); font-weight: 500; }
  .action-arrow { color: var(--text-quaternary); font-size: 14px; }
  .action-empty { font-size: 13px; color: var(--text-tertiary); padding: 10px 0; }
  .arch-toggle-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
  .arch-toggle-header h3 { margin-bottom: 0; }
  .arch-toggle-chevron { color: var(--text-quaternary); transition: transform 0.2s; font-size: 14px; }
  .arch-toggle-body { display: none; margin-top: 16px; }
  .arch-toggle-body.open { display: block; }
  .arch-toggle-body p { font-size: 13px; color: var(--text-secondary); line-height: 1.7; }
  .arch-toggle-body p strong { color: var(--text-primary); }

  @media (max-width: 1100px) { .timeline-grid { grid-template-columns: repeat(2, 1fr); } .kanban-board { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 800px) { .sidebar { display: none; } .main-area { margin-left: 0; } .content { padding: 20px; } .timeline-grid { grid-template-columns: 1fr; } .charts-grid { grid-template-columns: 1fr; } .kanban-board { grid-template-columns: 1fr; } .dept-grid { grid-template-columns: 1fr; } .kpi-grid { grid-template-columns: repeat(2, 1fr); } .readiness-strip { grid-template-columns: 1fr; } .action-grid { grid-template-columns: 1fr; } .matrix-label { width: 100px; } .proj-detail-grid { grid-template-columns: 1fr; } }

  /* Skill Creator */
  .sc-layout { display: flex; gap: 0; min-height: 600px; }
  .sc-list { width: 220px; border-right: 1px solid var(--border); flex-shrink: 0; }
  .sc-list-header { padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .sc-list-header h4 { font-size: 12px; font-weight: 600; color: var(--text-primary); }
  .sc-list-items { padding: 4px; max-height: 500px; overflow-y: auto; }
  .sc-list-item { padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; color: var(--text-secondary); transition: all 0.15s; margin-bottom: 2px; }
  .sc-list-item:hover { background: var(--bg-card-hover); color: var(--text-primary); }
  .sc-list-item.sc-active { background: var(--bg-elevated); color: var(--text-primary); }
  .sc-list-item .sc-item-sub { font-size: 10px; color: var(--text-quaternary); margin-top: 2px; }
  .sc-editor { flex: 1; padding: 20px; overflow-y: auto; max-height: 700px; }
  .sc-preview { width: 340px; border-left: 1px solid var(--border); display: flex; flex-direction: column; }
  .sc-preview-header { padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .sc-preview-header h4 { font-size: 12px; font-weight: 600; color: var(--text-primary); }
  .sc-preview pre { flex: 1; padding: 12px; font-size: 11px; line-height: 1.6; color: var(--text-tertiary); font-family: 'SF Mono', Monaco, Consolas, monospace; overflow: auto; white-space: pre-wrap; word-break: break-word; max-height: 600px; }
  .sc-section { margin-bottom: 20px; }
  .sc-section h5 { font-size: 11px; font-weight: 600; color: var(--text-quaternary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .sc-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .sc-input { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 10px; font-size: 12px; color: var(--text-primary); font-family: inherit; width: 100%; outline: none; transition: border-color 0.15s; }
  .sc-input:focus { border-color: var(--border-hover); }
  .sc-input[readonly] { color: var(--text-quaternary); background: var(--bg); }
  .sc-textarea { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 12px; color: var(--text-primary); font-family: 'SF Mono', Monaco, Consolas, monospace; width: 100%; outline: none; resize: vertical; transition: border-color 0.15s; min-height: 100px; }
  .sc-textarea:focus { border-color: var(--border-hover); }
  .sc-select { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 10px; font-size: 12px; color: var(--text-primary); font-family: inherit; outline: none; }
  .sc-btn { font-size: 11px; padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; font-family: inherit; transition: all 0.15s; }
  .sc-btn:hover { border-color: var(--border-hover); color: var(--text-primary); }
  .sc-btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .sc-btn-primary:hover { background: var(--accent-hover); }
  .sc-btn-sm { font-size: 10px; padding: 2px 6px; }
  .sc-field-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
  .sc-field-row .sc-input { flex: 1; }
  .sc-field-row .sc-select { width: 80px; }
  .sc-remove { color: var(--text-quaternary); cursor: pointer; font-size: 12px; width: 20px; text-align: center; }
  .sc-remove:hover { color: var(--red); }
  .sc-example-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 8px; }
  .sc-example-card textarea { width: 100%; min-height: 50px; }
  .sc-label { font-size: 10px; color: var(--text-quaternary); margin-bottom: 4px; display: block; }
  .sc-empty { color: var(--text-quaternary); font-size: 12px; text-align: center; padding: 40px 20px; }
  .sc-actions { display: flex; gap: 6px; padding: 12px; border-top: 1px solid var(--border); }
</style>
</head>
<body>
<div class="app">
  <nav class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">${escapeHtml(data.companyShort[0])}</div>
      <div class="sidebar-title">${escapeHtml(data.companyShort)}</div>
    </div>
    <div class="sidebar-nav">
      <div class="nav-section-label">Dashboard</div>
      <div class="nav-item active" onclick="navigate('overview')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/></svg></span>
        Overview
      </div>
      <div class="nav-item" onclick="navigate('departments')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
        Departments
        <span class="nav-badge">${data.totalDepartments}</span>
      </div>
      <div class="nav-item" onclick="navigate('skills')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
        Skill Mapping
        <span class="nav-badge">${data.totalUseCases}</span>
      </div>
      <div class="nav-section-label">Planning</div>
      <div class="nav-item" onclick="navigate('projects')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5"/><path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
        Projects
        <span class="nav-badge">${data.projects.length}</span>
      </div>
      <div class="nav-item" onclick="navigate('kanban')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="4" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="2" width="4" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="2" width="4" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/></svg></span>
        Roadmap Board
      </div>
      <div class="nav-section-label">Analysis</div>
      <div class="nav-item" onclick="navigate('gaps')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l7 13H1L8 1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6v3M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
        Gaps & Risks
        <span class="nav-badge" id="gapNavBadge">${data.gaps.length}</span>
      </div>
      <div class="nav-section-label">Tools</div>
      <div class="nav-item" onclick="navigate('skillcreator')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 2L14 4L8 10H6V8L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 14h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
        Skill Creator
        <span class="nav-badge">${skillCreatorSeeds.length}</span>
      </div>
      <div class="nav-item" onclick="navigate('offergenerator')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9H3V2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 9h4M6 11.5h2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
        Offer Generator
        <span class="nav-badge" id="offerBadge" style="background:var(--green);color:#000;font-weight:700;font-size:9px;">LIVE</span>
      </div>
      <div class="nav-section-label">Manage</div>
      <div class="nav-item" onclick="navigate('settings')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></span>
        Settings
      </div>
    </div>
    <div class="sidebar-footer">AI Integration Rollout<br>Generated Dashboard</div>
  </nav>

  <div class="main-area">
    <div class="topbar">
      <div class="topbar-breadcrumb">AI Rollout <span>/</span> <span id="breadcrumb">Overview</span></div>
      <div class="search-box">
        <span class="search-icon">&#x1F50D;</span>
        <input type="text" placeholder="Search use cases, skills..." id="searchInput" oninput="handleSearch(this.value)">
        <span class="search-kbd">/</span>
      </div>
    </div>
    <div class="content">
      <div class="search-match" id="searchResults">
        <div class="search-match-title" id="searchCount"></div>
        <div id="searchList"></div>
      </div>

      <!-- OVERVIEW -->
      <div id="overview" class="page active">
        <div class="page-header">
          <div class="page-title">AI Integration Rollout</div>
          <div class="page-desc">${escapeHtml(data.subtitle)} &mdash; ${data.totalUseCases} use cases across ${data.totalDepartments} departments, ${escapeHtml(data.timeline)} timeline.</div>
        </div>

        <!-- Section 1: Readiness Strip -->
        <div class="readiness-strip">
          <div class="readiness-card rc-green" onclick="goToPage('skills')">
            <div class="readiness-count">${readyCount}</div>
            <div class="readiness-label">Ready to Deploy</div>
            <div class="readiness-sub">Existing or built-in skills</div>
            <div class="readiness-arrow">&rarr;</div>
          </div>
          <div class="readiness-card rc-amber" onclick="goToPage('skills')">
            <div class="readiness-count">${needsWorkCount}</div>
            <div class="readiness-label">Needs Work</div>
            <div class="readiness-sub">${data.customSkillsCount} custom builds required</div>
            <div class="readiness-arrow">&rarr;</div>
          </div>
          <div class="readiness-card rc-red" onclick="goToPage('gaps')">
            <div class="readiness-count">${data.gaps.length}</div>
            <div class="readiness-label">Blockers &amp; Risks</div>
            <div class="readiness-sub">Unresolved items</div>
            <div class="readiness-arrow">&rarr;</div>
          </div>
        </div>

        <!-- Section 2: Skill × Tier Matrix -->
        <div class="skill-tier-matrix">
          <h3>Skill Readiness by Tier</h3>
          <div class="matrix-legend">
            <div class="matrix-legend-item"><div class="matrix-legend-dot" style="background:var(--green)"></div>Existing</div>
            <div class="matrix-legend-item"><div class="matrix-legend-dot" style="background:var(--blue)"></div>Built-in</div>
            <div class="matrix-legend-item"><div class="matrix-legend-dot" style="background:var(--yellow)"></div>Partial</div>
            <div class="matrix-legend-item"><div class="matrix-legend-dot" style="background:var(--red)"></div>Custom</div>
          </div>
          ${data.tiers.map((t, i) => {
            const m = tierSkillMatrix[i];
            const total = m.exists + m.builtin + m.partial + m.custom;
            const ready = m.exists + m.builtin;
            return `<div class="matrix-row" onclick="goToPage('departments');setTimeout(function(){var b=document.querySelector('#deptFilterBar .filter-pill[onclick*=\\'t${i + 1}\\']');if(b)b.click();},50)">
            <div class="matrix-label">${escapeHtml(t.name)}: ${escapeHtml(t.label)}</div>
            <div class="matrix-bar">
              ${m.exists ? `<div class="matrix-segment seg-exists" style="flex:${m.exists}"></div>` : ""}
              ${m.builtin ? `<div class="matrix-segment seg-builtin" style="flex:${m.builtin}"></div>` : ""}
              ${m.partial ? `<div class="matrix-segment seg-partial" style="flex:${m.partial}"></div>` : ""}
              ${m.custom ? `<div class="matrix-segment seg-custom" style="flex:${m.custom}"></div>` : ""}
            </div>
            <div class="matrix-fraction"><strong>${ready}</strong>/${total} ready</div>
          </div>`;
          }).join("")}
        </div>

        <!-- Section 3: Phased Rollout Timeline -->
        <div class="section-header"><div class="section-title">Phased Rollout Timeline</div></div>
        <div class="timeline-grid">
          ${data.tiers
            .map(
              (t, i) => {
                const m = tierSkillMatrix[i];
                const total = m.exists + m.builtin + m.partial + m.custom;
                const ready = m.exists + m.builtin;
                const pct = total > 0 ? Math.round((ready / total) * 100) : 0;
                const readyClass = pct >= 75 ? "ready-high" : pct >= 25 ? "ready-mid" : "ready-low";
                return `
          <div class="timeline-card t${i + 1}">
            <div class="tc-tier">${escapeHtml(t.name)}</div>
            <div class="tc-title">${escapeHtml(t.label)}</div>
            <div class="tc-time">${escapeHtml(t.timeline)}</div>
            <div class="tc-count">${t.count}</div>
            <div class="tc-count-label">use cases</div>
            <div class="tc-readiness ${readyClass}">${ready}/${total} skills ready</div>
            <div class="tc-desc">${escapeHtml(t.description)}</div>
          </div>`;
              }
            )
            .join("")}
        </div>

        <!-- Section 4: Action Items -->
        <div class="action-grid">
          <div class="action-card">
            <h3>Next Steps</h3>
            <div class="action-list">
              ${blockerGaps.length > 0 ? blockerGaps.map(g => `<div class="action-item" onclick="goToPage('gaps')"><div class="action-icon ai-red">!</div><div class="action-text"><strong>Blocker:</strong> ${escapeHtml(g.title)}</div><div class="action-arrow">&rarr;</div></div>`).join("") : ""}
              ${data.customSkills.length > 0 ? data.customSkills.slice(0, 5).map(s => `<div class="action-item" onclick="goToPage('skillcreator')"><div class="action-icon ai-orange">+</div><div class="action-text"><strong>Build:</strong> ${escapeHtml(s.name)}</div><div class="action-arrow">&rarr;</div></div>`).join("") : ""}
              ${blockedEpics.length > 0 ? blockedEpics.map(e => `<div class="action-item" onclick="goToPage('kanban')"><div class="action-icon ai-blue">&#x25A0;</div><div class="action-text"><strong>Blocked:</strong> ${escapeHtml(e.name)}</div><div class="action-arrow">&rarr;</div></div>`).join("") : ""}
              ${blockerGaps.length === 0 && data.customSkills.length === 0 && blockedEpics.length === 0 ? `<div class="action-empty">No outstanding action items.</div>` : ""}
            </div>
          </div>
          <div class="action-card">
            <div class="arch-toggle-header" onclick="toggleArchNote()">
              <h3>Architecture Note</h3>
              <span class="arch-toggle-chevron" id="archChevron">&#9654;</span>
            </div>
            <div class="arch-toggle-body" id="archBody">
              <p>${data.architectureRec}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- DEPARTMENTS -->
      <div id="departments" class="page">
        <div class="page-header">
          <div class="page-title">By Department</div>
          <div class="page-desc">${data.totalUseCases} use cases across ${data.totalDepartments} departments, color-coded by deployment tier.</div>
        </div>
        <div class="filter-bar" id="deptFilterBar">
          <button class="filter-pill active" onclick="filterDept('all', this)">All</button>
          <button class="filter-pill" onclick="filterDept('t1', this)">T1: Quick Wins</button>
          <button class="filter-pill" onclick="filterDept('t2', this)">T2: Cowork</button>
          <button class="filter-pill" onclick="filterDept('t3', this)">T3: ERP</button>
          <button class="filter-pill" onclick="filterDept('t4', this)">T4: Advanced</button>
        </div>
        <div class="legend">
          <div class="legend-item"><div class="legend-dot" style="background:var(--green)"></div>T1: Quick Win</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--blue)"></div>T2: Cowork Skill</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--orange)"></div>T3: ERP Integration</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--purple)"></div>T4: External AI</div>
        </div>
        <div class="dept-grid" id="deptGrid">
          ${deptCardsHtml}
        </div>
      </div>

      <!-- SKILLS -->
      <div id="skills" class="page">
        <div class="page-header">
          <div class="page-title">Skill Mapping</div>
          <div class="page-desc">Mapping each use case to existing skills, partial matches, and gaps requiring custom development.</div>
        </div>
        <div class="filter-bar" id="skillFilterBar">
          <button class="filter-pill active" onclick="filterSkills('all', this)">All</button>
          <button class="filter-pill" onclick="filterSkills('exists', this)">Match</button>
          <button class="filter-pill" onclick="filterSkills('partial', this)">Partial</button>
          <button class="filter-pill" onclick="filterSkills('builtin', this)">Built-in</button>
          <button class="filter-pill" onclick="filterSkills('custom', this)">Custom Build</button>
        </div>
        <div class="table-wrap">
          <table class="skills-table" id="skillsTable">
            <thead><tr><th>Dept</th><th>Use Case</th><th>Existing Skill</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              ${skillRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- PROJECTS -->
      <div id="projects" class="page">
        <div class="page-header">
          <div class="page-title">Recommended Projects</div>
          <div class="page-desc">Functional Projects grouped by workflow cluster.</div>
        </div>
        <div class="project-list">
          ${projectsHtml}
        </div>
      </div>

      <!-- GAPS -->
      <div id="gaps" class="page">
        <div class="page-header">
          <div class="page-title">Gaps & Risks</div>
          <div class="page-desc">Assessment of what the plan assumes vs. what's currently possible.</div>
        </div>
        <div class="gap-progress-bar">
          <span id="gapProgressLabel">0 / 0 resolved</span>
          <div class="gap-progress-track"><div class="gap-progress-fill" id="gapProgressFill" style="width:0%"></div></div>
        </div>
        <div class="gap-list" id="gapList">
        </div>
        <div style="margin-top:32px">
          <div class="section-header"><div class="section-title">${data.customSkillsCount} Custom Skills Required</div></div>
          <div class="skills-grid">
            ${customSkillsHtml}
          </div>
        </div>
      </div>

      <!-- KANBAN -->
      <div id="kanban" class="page">
        <div class="page-header">
          <div class="page-title">Roadmap Board</div>
          <div class="page-desc">Drag epics between columns to track rollout progress. Click to expand sub-tasks.</div>
        </div>
        <div class="kanban-legend">
          <span class="kanban-legend-label">Tier:</span>
          <span class="kanban-legend-item"><span class="kanban-legend-dot" style="background:var(--green)"></span> T1</span>
          <span class="kanban-legend-item"><span class="kanban-legend-dot" style="background:var(--blue)"></span> T2</span>
          <span class="kanban-legend-item"><span class="kanban-legend-dot" style="background:var(--orange)"></span> T3</span>
          <span class="kanban-legend-item"><span class="kanban-legend-dot" style="background:var(--purple)"></span> T4</span>
        </div>
        <div class="filter-bar" id="kanbanFilterBar">
          <button class="filter-pill active" onclick="filterKanban('all', this)">All Tiers</button>
          <button class="filter-pill" onclick="filterKanban('t1', this)">T1</button>
          <button class="filter-pill" onclick="filterKanban('t2', this)">T2</button>
          <button class="filter-pill" onclick="filterKanban('t3', this)">T3</button>
          <button class="filter-pill" onclick="filterKanban('t4', this)">T4</button>
        </div>
        <div class="kanban-board" id="kanbanBoard">
          <div class="kanban-col col-backlog" data-col="backlog"><div class="kanban-col-header"><span class="kanban-col-title">Backlog</span><span class="kanban-col-count" data-count></span></div><div class="kanban-cards" data-drop></div></div>
          <div class="kanban-col col-progress" data-col="progress"><div class="kanban-col-header"><span class="kanban-col-title">In Progress</span><span class="kanban-col-count" data-count></span></div><div class="kanban-cards" data-drop></div></div>
          <div class="kanban-col col-blocked" data-col="blocked"><div class="kanban-col-header"><span class="kanban-col-title">Blocked</span><span class="kanban-col-count" data-count></span></div><div class="kanban-cards" data-drop></div></div>
          <div class="kanban-col col-done" data-col="done"><div class="kanban-col-header"><span class="kanban-col-title">Done</span><span class="kanban-col-count" data-count></span></div><div class="kanban-cards" data-drop></div></div>
        </div>
      </div>

      <!-- SKILL CREATOR -->
      <div id="skillcreator" class="page">
        <div class="page-header">
          <div class="page-title">Skill Creator</div>
          <div class="page-desc">Build Claude-compatible skill definitions in YAML format. Pre-populated from custom skills identified in this rollout.</div>
        </div>
        <div class="sc-layout" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);">
          <div class="sc-list">
            <div class="sc-list-header">
              <h4>Skills</h4>
              <button class="sc-btn sc-btn-sm" onclick="scAddSkill()">+ New</button>
            </div>
            <div class="sc-list-items" id="scListItems"></div>
            <div class="sc-actions">
              <button class="sc-btn" style="flex:1" onclick="scDownloadAll()">Download All</button>
            </div>
          </div>
          <div class="sc-editor" id="scEditor">
            <div class="sc-empty">Select a skill from the list or create a new one</div>
          </div>
          <div class="sc-preview">
            <div class="sc-preview-header">
              <h4>YAML Preview</h4>
              <button class="sc-btn sc-btn-sm" onclick="scCopyYaml()">Copy</button>
            </div>
            <pre id="scYamlPreview">Select a skill to see its YAML output</pre>
          </div>
        </div>
      </div>

      <!-- OFFER GENERATOR -->
      <div id="offergenerator" class="page">
        <div class="page-header">
          <div class="page-title">Offer Generator</div>
          <div class="page-desc">Upload the Sections A–E output from the Claude Enterprise Pricing Project to generate a branded offer PDF.</div>
        </div>
        <style>
          @keyframes offerSpin { to { transform: rotate(360deg); } }
          .offer-spinner { display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:offerSpin 0.6s linear infinite;vertical-align:middle;margin-right:8px; }
        </style>
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          <!-- Upload + Generate -->
          <div style="flex:1;min-width:320px;max-width:480px;display:flex;flex-direction:column;gap:16px;">
            <div id="offerDropzone" style="border:2px dashed var(--border);border-radius:var(--radius);padding:32px;text-align:center;cursor:pointer;transition:border-color 0.2s,background 0.2s;" onclick="document.getElementById('offerFileInput').click()">
              <input type="file" id="offerFileInput" accept=".docx,.txt,.md" style="display:none" onchange="offerFileSelected(this)">
              <div id="offerDropIdle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5" style="margin:0 auto 8px;display:block;opacity:0.5"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <div style="font-size:13px;font-weight:500;color:var(--text)">Drop a .docx file here or click to upload</div>
                <div style="font-size:11px;color:var(--muted);margin-top:4px">.docx (from Claude artifact) or .txt</div>
              </div>
              <div id="offerDropProcessing" style="display:none">
                <div style="margin:0 auto 8px;"><span class="offer-spinner"></span></div>
                <div style="font-size:13px;font-weight:500;color:var(--blue)">Generating branded offer...</div>
                <div id="offerFileName" style="font-size:11px;color:var(--muted);margin-top:4px"></div>
              </div>
            </div>
            <div id="offerError" style="background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#fca5a5;display:none"></div>
            <div id="offerDownload" style="display:none">
              <a id="offerDownloadLink" style="display:inline-flex;align-items:center;gap:6px;background:var(--green);color:#000;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;text-decoration:none;transition:opacity 0.2s;" download>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2v8M4 7l3 3 3-3"/><path d="M2 11h10"/></svg>
                <span id="offerDownloadName">Download</span>
              </a>
              <button onclick="document.getElementById('offerFileInput').click()" style="margin-left:8px;padding:10px 16px;background:var(--bg-card);color:var(--text);border:1px solid var(--border);border-radius:8px;font-size:12px;cursor:pointer;">Generate Another</button>
            </div>
          </div>
          <!-- History -->
          <div style="flex:2;min-width:320px;">
            <h3 style="font-size:13px;font-weight:600;color:var(--text);margin:0 0 12px;">Recent Offers</h3>
            <div id="offerHistory" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
              <div style="padding:24px;text-align:center;font-size:12px;color:var(--muted)">No offers generated yet</div>
            </div>
          </div>
        </div>
        <!-- PDF Preview Modal -->
        <div id="pdfPreviewModal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);" onclick="if(event.target===this)closePdfPreview()">
          <div style="position:absolute;inset:24px;display:flex;flex-direction:column;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);">
              <span id="pdfPreviewTitle" style="font-size:13px;font-weight:600;color:var(--text);"></span>
              <div style="display:flex;gap:8px;align-items:center;">
                <a id="pdfPreviewDownload" download style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:var(--green);color:#000;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 2v8M4 7l3 3 3-3"/><path d="M2 11h10"/></svg>
                  Download
                </a>
                <button onclick="closePdfPreview()" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;padding:6px 10px;font-size:11px;">Close</button>
              </div>
            </div>
            <iframe id="pdfPreviewFrame" style="flex:1;border:none;background:#525659;"></iframe>
          </div>
        </div>
      </div>

      <!-- SETTINGS -->
      <div id="settings" class="page">
        <div class="page-header">
          <div class="page-title">Settings</div>
          <div class="page-desc">Manage this dashboard — rename, export, or delete.</div>
        </div>
        <div style="max-width:560px;display:flex;flex-direction:column;gap:24px;">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;">
            <h3 style="font-size:13px;font-weight:600;color:var(--text);margin:0 0 16px;">General</h3>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:11px;color:var(--muted);margin-bottom:4px;">Company Name</label>
              <input id="settingsName" style="width:100%;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;" />
            </div>
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:11px;color:var(--muted);margin-bottom:4px;">Short Name</label>
              <input id="settingsShort" style="width:100%;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;" />
            </div>
            <button id="settingsSaveBtn" onclick="settingsSave()" style="display:none;padding:8px 16px;background:var(--text);color:var(--bg);border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Save Changes</button>
            <span id="settingsSaveMsg" style="display:none;font-size:12px;color:var(--green);margin-left:8px;">Saved!</span>
          </div>
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;">
            <h3 style="font-size:13px;font-weight:600;color:var(--text);margin:0 0 8px;">Info</h3>
            <div style="font-size:12px;color:var(--muted);line-height:1.8;">
              <div>Dashboard ID: <span style="color:var(--text);" id="settingsId"></span></div>
              <div>Created: <span style="color:var(--text);" id="settingsCreated"></span></div>
            </div>
          </div>
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;">
            <h3 style="font-size:13px;font-weight:600;color:var(--text);margin:0 0 12px;">Export</h3>
            <a id="settingsDownload" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:12px;text-decoration:none;cursor:pointer;transition:color .2s;" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--muted)'" download>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2v8M4 7l3 3 3-3"/><path d="M2 11h10"/></svg>
              Download as .html
            </a>
          </div>
          <div style="background:var(--bg-card);border:1px solid rgba(220,38,38,0.2);border-radius:var(--radius);padding:20px;">
            <h3 style="font-size:13px;font-weight:600;color:#ef4444;margin:0 0 12px;">Danger Zone</h3>
            <button id="settingsDeleteBtn" onclick="settingsConfirmDelete()" style="padding:8px 14px;background:transparent;border:1px solid rgba(220,38,38,0.3);border-radius:8px;color:#ef4444;font-size:12px;cursor:pointer;transition:background .2s;">Delete Dashboard</button>
            <div id="settingsDeleteConfirm" style="display:none;margin-top:12px;padding:12px;background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.2);border-radius:8px;">
              <p style="font-size:12px;color:#fca5a5;margin:0 0 12px;">This will permanently delete this dashboard and all associated data. This cannot be undone.</p>
              <div style="display:flex;gap:8px;">
                <button onclick="settingsDelete()" style="padding:8px 14px;background:#dc2626;border:none;border-radius:8px;color:white;font-size:12px;font-weight:600;cursor:pointer;">Yes, Delete</button>
                <button onclick="document.getElementById('settingsDeleteConfirm').style.display='none'" style="padding:8px 14px;background:transparent;border:none;color:var(--muted);font-size:12px;cursor:pointer;">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>

<script>
let currentPage = 'overview';
function navigate(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  event.currentTarget.classList.add('active');
  currentPage = id;
  const names = { overview:'Overview', departments:'Departments', skills:'Skill Mapping', projects:'Projects', kanban:'Roadmap Board', gaps:'Gaps & Risks', skillcreator:'Skill Creator', offergenerator:'Offer Generator', settings:'Settings' };
  document.getElementById('breadcrumb').textContent = names[id] || id;
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').classList.remove('visible');
}

function goToPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  var pageEl = document.getElementById(id);
  if (pageEl) pageEl.classList.add('active');
  var navEl = document.querySelector('.nav-item[onclick="navigate(\\'' + id + '\\')"]');
  if (navEl) navEl.classList.add('active');
  currentPage = id;
  var names = { overview:'Overview', departments:'Departments', skills:'Skill Mapping', projects:'Projects', kanban:'Roadmap Board', gaps:'Gaps & Risks', skillcreator:'Skill Creator', offergenerator:'Offer Generator', settings:'Settings' };
  document.getElementById('breadcrumb').textContent = names[id] || id;
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').classList.remove('visible');
}

function toggleArchNote() {
  var body = document.getElementById('archBody');
  var chevron = document.getElementById('archChevron');
  body.classList.toggle('open');
  chevron.style.transform = body.classList.contains('open') ? 'rotate(90deg)' : '';
}

function toggleProject(el) {
  var wasExpanded = el.classList.contains('expanded');
  el.classList.toggle('expanded');
  if (!wasExpanded) {
    var pn = el.dataset.project;
    if (pn) loadProjectDocs(parseInt(pn));
  }
}

// ====== PROJECT DOCUMENTS ======
var DOC_DASHBOARD_ID = GAP_DASHBOARD_ID;

function loadProjectDocs(projectNumber) {
  fetch('/api/documents?dashboardId=' + DOC_DASHBOARD_ID + '&projectNumber=' + projectNumber)
    .then(function(r) { return r.json(); })
    .then(function(docs) {
      var listEl = document.getElementById('projDocsList-' + projectNumber);
      var counterEl = document.getElementById('projDocCounter-' + projectNumber);
      if (!listEl) return;
      if (docs.length === 0) {
        listEl.innerHTML = '';
        if (counterEl) counterEl.textContent = '(0 uploaded)';
      } else {
        if (counterEl) counterEl.textContent = '(' + docs.length + ' uploaded)';
        listEl.innerHTML = docs.map(function(d) {
          var date = new Date(d.uploaded_at).toLocaleDateString();
          return '<div class="proj-doc-row">' +
            '<span class="proj-doc-icon">&#128196;</span>' +
            '<span class="proj-doc-name">' + d.filename + '</span>' +
            '<span class="proj-doc-date">' + date + '</span>' +
            '<button class="proj-doc-btn proj-doc-dl" onclick="event.stopPropagation();downloadProjectDoc(' + d.id + ')">Download</button>' +
            '<button class="proj-doc-btn proj-doc-del" onclick="event.stopPropagation();deleteProjectDoc(' + d.id + ',' + projectNumber + ')">Delete</button>' +
            '</div>';
        }).join('');
      }
      // Cross-reference filenames to checklist items
      var filenames = docs.map(function(d) { return d.filename.toLowerCase(); });
      var checks = document.querySelectorAll('[id^="projDocCheck-' + projectNumber + '-"]');
      checks.forEach(function(check) {
        var text = check.querySelector('.proj-doc-check-text')?.textContent?.toLowerCase() || '';
        var words = text.split(/\s+/).filter(function(w) { return w.length > 2; });
        var matched = filenames.some(function(fn) {
          return words.some(function(w) { return fn.includes(w); });
        });
        if (matched) {
          check.classList.add('matched');
          check.querySelector('.proj-doc-check-icon').innerHTML = '&#10003;';
        } else {
          check.classList.remove('matched');
          check.querySelector('.proj-doc-check-icon').innerHTML = '&#9675;';
        }
      });
    })
    .catch(function(err) { console.error('Failed to load docs:', err); });
}

function uploadProjectDocs(projectNumber, files) {
  if (!files || files.length === 0) return;
  var uploads = Array.from(files).map(function(file) {
    var fd = new FormData();
    fd.append('dashboardId', String(DOC_DASHBOARD_ID));
    fd.append('projectNumber', String(projectNumber));
    fd.append('file', file);
    return fetch('/api/documents', { method: 'POST', body: fd }).then(function(r) { return r.json(); });
  });
  Promise.all(uploads).then(function() {
    loadProjectDocs(projectNumber);
    var input = document.getElementById('projDocsInput-' + projectNumber);
    if (input) input.value = '';
  });
}

function downloadProjectDoc(docId) {
  window.open('/api/documents/' + docId + '/download', '_blank');
}

function deleteProjectDoc(docId, projectNumber) {
  fetch('/api/documents/' + docId, { method: 'DELETE' })
    .then(function() { loadProjectDocs(projectNumber); });
}

// Set up drag-and-drop for all project dropzones
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.proj-docs-dropzone').forEach(function(zone) {
    zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', function() { zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', function(e) {
      e.preventDefault(); e.stopPropagation();
      zone.classList.remove('drag-over');
      var card = zone.closest('.project-item');
      var pn = card ? parseInt(card.dataset.project) : 0;
      if (pn && e.dataTransfer.files.length) uploadProjectDocs(pn, e.dataTransfer.files);
    });
  });
});

const SEARCH_DATA = [];
document.querySelectorAll('.use-case .uc-name').forEach(el => {
  const dept = el.closest('.dept-card')?.querySelector('.dept-name')?.textContent || '';
  SEARCH_DATA.push({ name: el.textContent, type: 'Use Case', dept, page: 'departments' });
});
document.querySelectorAll('.skills-table tbody tr').forEach(tr => {
  const cells = tr.querySelectorAll('td');
  if (cells.length >= 2) SEARCH_DATA.push({ name: cells[1].textContent, type: 'Skill', dept: cells[0].textContent, page: 'skills' });
});
document.querySelectorAll('.proj-name').forEach(el => {
  SEARCH_DATA.push({ name: el.textContent, type: 'Project', dept: '', page: 'projects' });
});

function handleSearch(q) {
  const results = document.getElementById('searchResults');
  const list = document.getElementById('searchList');
  const count = document.getElementById('searchCount');
  if (!q.trim()) { results.classList.remove('visible'); return; }
  const query = q.toLowerCase();
  const matches = SEARCH_DATA.filter(d => d.name.toLowerCase().includes(query) || d.dept.toLowerCase().includes(query));
  if (matches.length === 0) { results.classList.add('visible'); count.textContent = 'No results found'; list.innerHTML = ''; return; }
  results.classList.add('visible');
  count.textContent = matches.length + ' result' + (matches.length !== 1 ? 's' : '');
  list.innerHTML = matches.slice(0, 10).map(m =>
    '<div class="search-result" onclick="goToResult(\\'' + m.page + '\\')">' +
    '<div class="tier-dot ' + (m.type === 'Use Case' ? 't2' : m.type === 'Skill' ? 't1' : 't3') + '"></div>' +
    '<span class="sr-name">' + m.name + '</span>' +
    '<span class="sr-meta">' + m.type + (m.dept ? ' \\u00b7 ' + m.dept : '') + '</span></div>'
  ).join('');
}
function goToResult(page) {
  const navItem = document.querySelector('.nav-item[onclick="navigate(\\'' + page + '\\')"]');
  if (navItem) navItem.click();
}
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); document.getElementById('searchInput').focus(); }
  if (e.key === 'Escape') { document.getElementById('searchInput').blur(); document.getElementById('searchInput').value = ''; document.getElementById('searchResults').classList.remove('visible'); }
});

function filterDept(tier, btn) {
  document.querySelectorAll('#deptFilterBar .filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#deptGrid .use-case').forEach(uc => { uc.style.display = (tier === 'all' || uc.dataset.tier === tier) ? '' : 'none'; });
}
function filterSkills(status, btn) {
  document.querySelectorAll('#skillFilterBar .filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#skillsTable tbody tr').forEach(tr => { tr.style.display = (status === 'all' || tr.dataset.status === status) ? '' : 'none'; });
}
let kanbanFilter = 'all';
function filterKanban(tier, btn) {
  document.querySelectorAll('#kanbanFilterBar .filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  kanbanFilter = tier;
  renderKanban();
}

function drawDonut(canvasId, data, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 160;
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);
  const cx = size/2, cy = size/2, outerR = 70, innerR = 46;
  const total = data.reduce((a, b) => a + b, 0);
  let startAngle = -Math.PI / 2;
  const gap = 0.03;
  data.forEach((val, i) => {
    const sliceAngle = (val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle + gap, startAngle + sliceAngle - gap);
    ctx.arc(cx, cy, innerR, startAngle + sliceAngle - gap, startAngle + gap, true);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    startAngle += sliceAngle;
  });
  ctx.fillStyle = '#ededed';
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy - 6);
  ctx.fillStyle = '#666';
  ctx.font = '500 10px Inter, sans-serif';
  ctx.fillText('TOTAL', cx, cy + 10);
}

const EPICS = ${epicsJson};

function renderKanban() {
  const cols = { backlog:[], progress:[], blocked:[], done:[] };
  const filtered = kanbanFilter === 'all' ? EPICS : EPICS.filter(e => e.tier === kanbanFilter);
  filtered.forEach(e => cols[e.col]?.push(e));
  Object.keys(cols).forEach(colKey => {
    const colEl = document.querySelector('[data-col="' + colKey + '"] [data-drop]');
    const countEl = document.querySelector('[data-col="' + colKey + '"] [data-count]');
    if (!colEl) return;
    colEl.innerHTML = '';
    countEl.textContent = cols[colKey].length;
    cols[colKey].forEach(epic => {
      const checked = epic.items.filter((_, i) => epic.checked && epic.checked[i]).length;
      const total = epic.items.length;
      const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
      const card = document.createElement('div');
      card.className = 'epic-card'; card.draggable = true; card.dataset.id = epic.id;
      const itemsHtml = epic.items.map((item, i) => {
        const isChecked = epic.checked && epic.checked[i];
        return '<li class="' + (isChecked ? 'checked-item' : '') + '"><span class="item-check ' + (isChecked ? 'checked' : '') + '" data-epic="' + epic.id + '" data-idx="' + i + '">' + (isChecked ? '&#10003;' : '') + '</span>' + item + '</li>';
      }).join('');
      card.innerHTML = '<div class="epic-tier ' + epic.tier + '">' + epic.tier.toUpperCase() + ' &middot; ' + epic.dept + '</div><div class="epic-name">' + epic.name + '</div><div class="epic-dept">' + checked + '/' + total + ' tasks</div><ul class="epic-items">' + itemsHtml + '</ul><div class="epic-toggle" onclick="toggleEpic(this)">Show ' + total + ' tasks</div><div class="epic-progress"><div class="epic-progress-fill" style="width:' + pct + '%"></div></div>';
      card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', epic.id); card.classList.add('dragging'); });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      colEl.appendChild(card);
    });
  });
  updateProgress();
}

function toggleEpic(el) {
  const card = el.closest('.epic-card');
  card.classList.toggle('expanded');
  const total = card.querySelectorAll('.epic-items li').length;
  el.textContent = card.classList.contains('expanded') ? 'Hide tasks' : 'Show ' + total + ' tasks';
}

function updateProgress() {
  let totalChecked = 0, totalItems = 0;
  let tierChecked = { t1:0, t2:0, t3:0, t4:0 };
  let tierTotal = { t1:0, t2:0, t3:0, t4:0 };
  EPICS.forEach(e => {
    const t = e.items.length;
    const c = e.checked ? e.checked.filter(Boolean).length : 0;
    totalItems += t; totalChecked += c;
    tierTotal[e.tier] += t; tierChecked[e.tier] += c;
  });
  const pct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;
  const pctEl = document.getElementById('overallPct');
  if (pctEl) pctEl.textContent = pct + '%';
  ['T1','T2','T3','T4'].forEach(t => {
    const key = t.toLowerCase();
    const w = totalItems > 0 ? (tierChecked[key] / totalItems) * 100 : 0;
    const el = document.getElementById('progress' + t);
    if (el) el.style.width = w + '%';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-drop]').forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.closest('.kanban-col').classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.closest('.kanban-col').classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.closest('.kanban-col').classList.remove('drag-over');
      const epicId = e.dataTransfer.getData('text/plain');
      const newCol = zone.closest('.kanban-col').dataset.col;
      const epic = EPICS.find(ep => ep.id === epicId);
      if (epic) { epic.col = newCol; saveState(); renderKanban(); }
    });
  });
  document.getElementById('kanbanBoard').addEventListener('click', e => {
    const check = e.target.closest('.item-check');
    if (!check) return;
    e.stopPropagation();
    const epicId = check.dataset.epic;
    const idx = parseInt(check.dataset.idx);
    const epic = EPICS.find(ep => ep.id === epicId);
    if (!epic.checked) epic.checked = new Array(epic.items.length).fill(false);
    epic.checked[idx] = !epic.checked[idx];
    saveState(); renderKanban();
  });
  loadState(); renderKanban();
});

function saveState() {
  const state = EPICS.map(e => ({ id:e.id, col:e.col, checked:e.checked || [] }));
  try { localStorage.setItem('kanban_state_gen', JSON.stringify(state)); } catch(e) {}
}
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('kanban_state_gen'));
    if (saved) saved.forEach(s => { const epic = EPICS.find(e => e.id === s.id); if (epic) { epic.col = s.col; epic.checked = s.checked; } });
  } catch(e) {}
}

// ====== GAP RESOLUTIONS ======
const GAPS = ${gapsJson};
const GAP_DASHBOARD_ID = 0;
var gapResolutions = {};
var gapExpandedId = null;

function loadGapResolutions() {
  // Load localStorage cache first for instant render
  try {
    var saved = JSON.parse(localStorage.getItem('gap_resolutions_gen'));
    if (saved) gapResolutions = saved;
  } catch(e) {}
  // Then fetch from DB (source of truth) and overwrite
  fetch('/api/gap-resolutions?dashboardId=' + GAP_DASHBOARD_ID)
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      if (Array.isArray(rows) && rows.length > 0) {
        var fromDb = {};
        rows.forEach(function(r) { fromDb[r.gapId] = r; });
        gapResolutions = fromDb;
        try { localStorage.setItem('gap_resolutions_gen', JSON.stringify(gapResolutions)); } catch(e) {}
        renderAllGaps();
      }
    })
    .catch(function() { /* DB unavailable, localStorage is fine */ });
}

function saveGapResolutions() {
  try { localStorage.setItem('gap_resolutions_gen', JSON.stringify(gapResolutions)); } catch(e) {}
}

function syncGapToDb(gapId) {
  var r = gapResolutions[gapId];
  if (!r) return;
  fetch('/api/gap-resolutions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dashboardId: GAP_DASHBOARD_ID,
      gapId: r.gapId || gapId,
      status: r.status,
      owner: r.owner,
      currentState: r.currentState,
      proposedSolution: r.proposedSolution,
      requiredData: r.requiredData,
      notes: r.notes,
      linkedSkillSlugs: r.linkedSkillSlugs
    })
  }).catch(function() { /* DB unavailable */ });
}

function getGapResolution(gapId) {
  return gapResolutions[gapId] || { gapId: gapId, status: 'open', owner: '', currentState: '', proposedSolution: '', requiredData: '', notes: '', linkedSkillSlugs: [] };
}

function toggleGapForm(gapId, event) {
  if (event) event.stopPropagation();
  gapExpandedId = gapExpandedId === gapId ? null : gapId;
  renderAllGaps();
}

var gapSyncTimers = {};
function debouncedSync(gapId) {
  clearTimeout(gapSyncTimers[gapId]);
  gapSyncTimers[gapId] = setTimeout(function() { syncGapToDb(gapId); }, 500);
}

function updateGapField(gapId, field, value) {
  var r = getGapResolution(gapId);
  r[field] = value;
  r.updatedAt = new Date().toISOString();
  if (r.status === 'open' && (r.owner || r.currentState || r.proposedSolution)) {
    r.status = 'in_progress';
  }
  gapResolutions[gapId] = r;
  saveGapResolutions();
  debouncedSync(gapId);
  renderAllGaps();
}

function setGapStatus(gapId, status) {
  var r = getGapResolution(gapId);
  r.status = status;
  r.updatedAt = new Date().toISOString();
  gapResolutions[gapId] = r;
  saveGapResolutions();
  syncGapToDb(gapId);
  renderAllGaps();
}

function linkSkillToGap(gapId, slug) {
  var r = getGapResolution(gapId);
  if (!r.linkedSkillSlugs) r.linkedSkillSlugs = [];
  if (r.linkedSkillSlugs.indexOf(slug) === -1) {
    r.linkedSkillSlugs.push(slug);
    r.updatedAt = new Date().toISOString();
    gapResolutions[gapId] = r;
    saveGapResolutions();
    syncGapToDb(gapId);
  }
  renderAllGaps();
}

function unlinkSkillFromGap(gapId, slug, event) {
  if (event) event.stopPropagation();
  var r = getGapResolution(gapId);
  r.linkedSkillSlugs = (r.linkedSkillSlugs || []).filter(function(s) { return s !== slug; });
  r.updatedAt = new Date().toISOString();
  gapResolutions[gapId] = r;
  saveGapResolutions();
  syncGapToDb(gapId);
  renderAllGaps();
}

function navigateToSkill(slug, event) {
  if (event) event.stopPropagation();
  var idx = scSkills.findIndex(function(s) { return s.slug === slug; });
  if (idx >= 0) {
    navigate('skillcreator');
    scSelect(idx);
  }
}

function createSkillFromGap(gapId, event) {
  if (event) event.stopPropagation();
  var gap = GAPS.find(function(g) { return g.id === gapId; });
  if (!gap) return;
  var r = getGapResolution(gapId);
  var desc = gap.description.replace(/<[^>]+>/g, '');
  var slug = gap.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Avoid duplicate slugs
  var base = slug;
  var counter = 1;
  while (scSkills.some(function(s) { return s.slug === slug; })) { slug = base + '-' + (++counter); }
  var tier = gap.label.indexOf('BLOCKER') >= 0 ? 't3' : 't2';
  var newSkill = {
    name: gap.title, slug: slug, description: desc, department: '', tier: tier,
    category: 'custom', instructions: r.proposedSolution || '',
    inputFields: [], outputFormat: '', examples: [], knowledgeFiles: []
  };
  scSkills.push(newSkill);
  scSave();
  linkSkillToGap(gapId, slug);
  navigate('skillcreator');
  scSelect(scSkills.length - 1);
}

function toggleLinkMenu(gapId, event) {
  if (event) event.stopPropagation();
  var menu = document.getElementById('linkMenu-' + gapId);
  if (menu) menu.classList.toggle('open');
}

function renderGapLinkedSkills(gapId) {
  var r = getGapResolution(gapId);
  var slugs = r.linkedSkillSlugs || [];
  if (slugs.length === 0) return '';
  return slugs.map(function(slug) {
    var skill = scSkills.find(function(s) { return s.slug === slug; });
    var name = skill ? skill.name : slug;
    return '<span class="gap-skill-pill"><span class="pill-name" onclick="navigateToSkill(\\'' + slug + '\\', event)">' + name + '</span><span class="pill-remove" onclick="unlinkSkillFromGap(\\'' + gapId + '\\',\\'' + slug + '\\', event)">\\u00d7</span></span>';
  }).join('');
}

function renderGapCard(gap) {
  var r = getGapResolution(gap.id);
  var isExpanded = gapExpandedId === gap.id;
  var statusClass = 'status-' + r.status;
  var linkedPills = renderGapLinkedSkills(gap.id);

  var availableSkills = scSkills.filter(function(s) {
    return (r.linkedSkillSlugs || []).indexOf(s.slug) === -1;
  });
  var menuItems = availableSkills.map(function(s) {
    return '<div class="gap-link-menu-item" onclick="linkSkillToGap(\\'' + gap.id + '\\',\\'' + s.slug + '\\'); toggleLinkMenu(\\'' + gap.id + '\\', event)">' + s.name + '</div>';
  }).join('');

  var html = '<div class="gap-card ' + statusClass + (isExpanded ? ' expanded' : '') + '" data-gap-id="' + gap.id + '">';
  html += '<div class="gap-header" onclick="toggleGapForm(\\'' + gap.id + '\\')">';
  html += '<div style="flex:1"><div class="gap-number">' + gap.label + ' <span class="gap-status-pill ' + r.status + '">' + r.status.replace('_', ' ') + '</span></div>';
  html += '<div class="gap-title">' + gap.title + '</div></div>';
  html += '<span class="gap-chevron">&#9654;</span></div>';
  html += '<div class="gap-desc">' + gap.description + '</div>';

  if (linkedPills) {
    html += '<div class="gap-linked-skills" style="margin-top:8px">' + linkedPills + '</div>';
  }

  html += '<div class="gap-form" onclick="event.stopPropagation()">';
  html += '<div class="gap-form-row"><div class="gap-form-label">Owner</div>';
  html += '<input class="gap-form-input" value="' + (r.owner || '').replace(/"/g,'&quot;') + '" placeholder="Who is responsible?" oninput="updateGapField(\\'' + gap.id + '\\',\\'owner\\',this.value)"></div>';
  html += '<div class="gap-form-row"><div class="gap-form-label">Current State</div>';
  html += '<textarea class="gap-form-input" rows="2" placeholder="What do we have today?" oninput="updateGapField(\\'' + gap.id + '\\',\\'currentState\\',this.value)">' + (r.currentState || '') + '</textarea></div>';
  html += '<div class="gap-form-row"><div class="gap-form-label">Proposed Solution</div>';
  html += '<textarea class="gap-form-input" rows="2" placeholder="How do we plan to resolve this?" oninput="updateGapField(\\'' + gap.id + '\\',\\'proposedSolution\\',this.value)">' + (r.proposedSolution || '') + '</textarea></div>';
  html += '<div class="gap-form-row"><div class="gap-form-label">Required Data</div>';
  html += '<textarea class="gap-form-input" rows="2" placeholder="What data or resources are needed?" oninput="updateGapField(\\'' + gap.id + '\\',\\'requiredData\\',this.value)">' + (r.requiredData || '') + '</textarea></div>';
  html += '<div class="gap-form-row"><div class="gap-form-label">Notes</div>';
  html += '<textarea class="gap-form-input" rows="2" placeholder="Additional context..." oninput="updateGapField(\\'' + gap.id + '\\',\\'notes\\',this.value)">' + (r.notes || '') + '</textarea></div>';

  html += '<div class="gap-form-row"><div class="gap-form-label">Linked Skills</div>';
  html += '<div class="gap-linked-skills">' + (linkedPills || '<span style="font-size:11px;color:var(--text-quaternary)">No skills linked</span>') + '</div></div>';

  html += '<div class="gap-actions">';
  html += '<div class="gap-link-dropdown"><button class="gap-btn gap-btn-accent" onclick="toggleLinkMenu(\\'' + gap.id + '\\', event)">Link Existing Skill \\u25be</button>';
  html += '<div class="gap-link-menu" id="linkMenu-' + gap.id + '">' + (menuItems || '<div class="gap-link-menu-item" style="color:var(--text-quaternary)">No skills available</div>') + '</div></div>';
  html += '<button class="gap-btn gap-btn-accent" onclick="createSkillFromGap(\\'' + gap.id + '\\', event)">Create Skill from Gap</button>';

  if (r.status !== 'in_progress') {
    html += '<button class="gap-btn gap-btn-orange" onclick="setGapStatus(\\'' + gap.id + '\\',\\'in_progress\\')">Mark In Progress</button>';
  }
  if (r.status !== 'resolved') {
    html += '<button class="gap-btn gap-btn-green" onclick="setGapStatus(\\'' + gap.id + '\\',\\'resolved\\')">Mark Resolved</button>';
  }
  if (r.status !== 'open') {
    html += '<button class="gap-btn" onclick="setGapStatus(\\'' + gap.id + '\\',\\'open\\')">Reopen</button>';
  }
  html += '</div></div></div>';
  return html;
}

function renderAllGaps() {
  var el = document.getElementById('gapList');
  if (!el) return;
  el.innerHTML = GAPS.map(renderGapCard).join('');
  updateGapProgress();
  // Close link menus on outside click
  document.addEventListener('click', function() {
    document.querySelectorAll('.gap-link-menu.open').forEach(function(m) { m.classList.remove('open'); });
  });
}

function updateGapProgress() {
  var resolved = 0;
  GAPS.forEach(function(g) { if (getGapResolution(g.id).status === 'resolved') resolved++; });
  var total = GAPS.length;
  var label = document.getElementById('gapProgressLabel');
  var fill = document.getElementById('gapProgressFill');
  var badge = document.getElementById('gapNavBadge');
  if (label) label.textContent = resolved + ' / ' + total + ' resolved';
  if (fill) fill.style.width = (total > 0 ? Math.round((resolved / total) * 100) : 0) + '%';
  if (badge) badge.textContent = resolved > 0 ? resolved + '/' + total : total;
}

// Gap init deferred until after skill creator loads (renderAllGaps references scSkills)

// ====== SKILL CREATOR ======
const SC_CATEGORIES = ['sales','marketing','operations','finance','hr','engineering','servicing','custom'];
const SC_SEEDS = ${skillCreatorSeedsJson};
let scSkills = SC_SEEDS.map(s => ({
  ...s,
  instructions: '',
  inputFields: [],
  outputFormat: '',
  examples: [],
  knowledgeFiles: []
}));
let scActiveIdx = null;

function scSave() {
  try { localStorage.setItem('sc_skills', JSON.stringify(scSkills)); } catch(e) {}
}

// Load saved skill data, merging in any new seeds
try {
  const saved = JSON.parse(localStorage.getItem('sc_skills'));
  if (saved && saved.length) {
    const savedSlugs = new Set(saved.map(function(s) { return s.slug; }));
    const newSeeds = scSkills.filter(function(s) { return !savedSlugs.has(s.slug); });
    scSkills = saved.concat(newSeeds);
    if (newSeeds.length) scSave();
  }
} catch(e) {}

function scRenderList() {
  const el = document.getElementById('scListItems');
  if (!el) return;
  el.innerHTML = scSkills.map((s, i) =>
    '<div class="sc-list-item' + (scActiveIdx === i ? ' sc-active' : '') + '" onclick="scSelect(' + i + ')">' +
    '<div style="font-weight:500">' + (s.name || 'Untitled') + '</div>' +
    '<div class="sc-item-sub">' + s.tier.toUpperCase() + ' · ' + s.category + '</div></div>'
  ).join('');
}

function scSelect(idx) {
  scActiveIdx = idx;
  scRenderList();
  scRenderEditor();
  scRenderYaml();
}

function scAddSkill() {
  scSkills.push({ name:'New Skill', slug:'new-skill', description:'', department:'', tier:'t2', category:'custom', instructions:'', inputFields:[], outputFormat:'', examples:[], knowledgeFiles:[] });
  scSave();
  scSelect(scSkills.length - 1);
}

function scDeleteSkill(idx) {
  if (idx < 0 || idx >= scSkills.length) return;
  if (!confirm('Delete "' + (scSkills[idx].name || 'Untitled') + '"?')) return;
  scSkills.splice(idx, 1);
  scSave();
  if (scSkills.length === 0) {
    scActiveIdx = null;
  } else if (scActiveIdx === idx) {
    scActiveIdx = Math.min(idx, scSkills.length - 1);
  } else if (scActiveIdx > idx) {
    scActiveIdx--;
  }
  scRenderList();
  scRenderEditor();
  scRenderYaml();
}

function scUpdateField(field, value) {
  if (scActiveIdx === null) return;
  scSkills[scActiveIdx][field] = value;
  if (field === 'name') scSkills[scActiveIdx].slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  scSave();
  scRenderYaml();
  if (field === 'name' || field === 'category' || field === 'tier') scRenderList();
}

function scRenderEditor() {
  const el = document.getElementById('scEditor');
  if (!el || scActiveIdx === null) { el.innerHTML = '<div class="sc-empty">Select a skill</div>'; return; }
  const s = scSkills[scActiveIdx];

  const fieldsHtml = s.inputFields.map((f, i) =>
    '<div class="sc-field-row">' +
    '<input class="sc-input" style="width:100px" value="' + (f.name||'') + '" placeholder="field_name" oninput="scUpdateInputField(' + i + ',\\'name\\',this.value)">' +
    '<select class="sc-select" onchange="scUpdateInputField(' + i + ',\\'type\\',this.value)">' +
    ['string','number','boolean','array','object'].map(t => '<option' + (f.type===t?' selected':'') + '>' + t + '</option>').join('') +
    '</select>' +
    '<input class="sc-input" value="' + (f.description||'').replace(/"/g,'&quot;') + '" placeholder="Description" oninput="scUpdateInputField(' + i + ',\\'description\\',this.value)">' +
    '<span class="sc-remove" onclick="scRemoveInputField(' + i + ')">&#215;</span>' +
    '</div>'
  ).join('');

  const examplesHtml = s.examples.map((ex, i) =>
    '<div class="sc-example-card">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="sc-label">Example ' + (i+1) + '</span><span class="sc-remove" onclick="scRemoveExample(' + i + ')">Remove</span></div>' +
    '<textarea class="sc-textarea" style="min-height:40px;margin-bottom:4px" placeholder="Input..." oninput="scUpdateExample(' + i + ',\\'input\\',this.value)">' + (ex.input||'') + '</textarea>' +
    '<textarea class="sc-textarea" style="min-height:40px" placeholder="Output..." oninput="scUpdateExample(' + i + ',\\'output\\',this.value)">' + (ex.output||'') + '</textarea>' +
    '</div>'
  ).join('');

  const kfHtml = s.knowledgeFiles.map((f, i) =>
    '<div class="sc-field-row">' +
    '<input class="sc-input" value="' + (f||'').replace(/"/g,'&quot;') + '" placeholder="e.g., pricing_master.xlsx" oninput="scUpdateKF(' + i + ',this.value)">' +
    '<span class="sc-remove" onclick="scRemoveKF(' + i + ')">&#215;</span></div>'
  ).join('');

  el.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
    '<h3 style="font-size:16px;font-weight:600;color:var(--text-primary)">' + (s.name || 'Untitled') + '</h3>' +
    '<div style="display:flex;gap:8px"><button class="sc-btn" style="background:#dc2626;color:white;border-color:#dc2626" onclick="scDeleteSkill(' + scActiveIdx + ')">Delete</button>' +
    '<button class="sc-btn sc-btn-primary" onclick="scDownloadOne()">Download .yaml</button></div></div>' +

    '<div class="sc-section"><h5>Basic Info</h5>' +
    '<div class="sc-row"><div style="flex:1"><span class="sc-label">Name</span><input class="sc-input" value="' + (s.name||'').replace(/"/g,'&quot;') + '" oninput="scUpdateField(\\'name\\',this.value)"></div>' +
    '<div style="flex:1"><span class="sc-label">Slug</span><input class="sc-input" value="' + s.slug + '" readonly></div></div>' +
    '<div class="sc-row">' +
    '<div style="flex:1"><span class="sc-label">Category</span><select class="sc-select" style="width:100%" onchange="scUpdateField(\\'category\\',this.value)">' + SC_CATEGORIES.map(c => '<option' + (s.category===c?' selected':'') + '>' + c + '</option>').join('') + '</select></div>' +
    '<div style="flex:1"><span class="sc-label">Department</span><input class="sc-input" value="' + (s.department||'').replace(/"/g,'&quot;') + '" oninput="scUpdateField(\\'department\\',this.value)"></div>' +
    '<div style="flex:1"><span class="sc-label">Tier</span><select class="sc-select" style="width:100%" onchange="scUpdateField(\\'tier\\',this.value)">' +
    '<option value="t1"' + (s.tier==='t1'?' selected':'') + '>T1</option><option value="t2"' + (s.tier==='t2'?' selected':'') + '>T2</option><option value="t3"' + (s.tier==='t3'?' selected':'') + '>T3</option><option value="t4"' + (s.tier==='t4'?' selected':'') + '>T4</option></select></div></div>' +
    '<span class="sc-label">Description</span><input class="sc-input" value="' + (s.description||'').replace(/"/g,'&quot;') + '" placeholder="One-line description" oninput="scUpdateField(\\'description\\',this.value)"></div>' +

    '<div class="sc-section"><h5>Instructions</h5>' +
    '<div style="font-size:11px;color:var(--text-quaternary);margin:-4px 0 8px">System prompt for Claude — describe the skill\\'s purpose, tone, constraints, and step-by-step behavior.</div>' +
    '<textarea class="sc-textarea" style="min-height:120px" placeholder="Detailed instructions for Claude..." oninput="scUpdateField(\\'instructions\\',this.value)">' + (s.instructions||'') + '</textarea></div>' +

    '<div class="sc-section"><h5>Input Fields <button class="sc-btn sc-btn-sm" style="margin-left:8px" onclick="scAddInputField()">+ Add</button></h5>' +
    '<div style="font-size:11px;color:var(--text-quaternary);margin:-4px 0 8px">Structured data the skill expects when invoked (e.g., order_text, part_number). Each field has a name, type, and description. These become the <code style="background:var(--border);padding:1px 4px;border-radius:3px">input_schema</code> in the YAML spec.</div>' +
    (fieldsHtml || '<div style="font-size:11px;color:var(--text-quaternary)">No input fields defined</div>') + '</div>' +

    '<div class="sc-section"><h5>Output Format</h5>' +
    '<div style="font-size:11px;color:var(--text-quaternary);margin:-4px 0 8px">Describe the expected output structure — e.g., "Markdown table with columns: Part, Qty, Unit Cost, Total".</div>' +
    '<textarea class="sc-textarea" style="min-height:60px" placeholder="Describe expected output format..." oninput="scUpdateField(\\'outputFormat\\',this.value)">' + (s.outputFormat||'') + '</textarea></div>' +

    '<div class="sc-section"><h5>Knowledge Files <button class="sc-btn sc-btn-sm" style="margin-left:8px" onclick="scAddKF()">+ Add</button></h5>' +
    '<div style="font-size:11px;color:var(--text-quaternary);margin:-4px 0 8px">Reference documents to upload to the Claude Project\\'s knowledge base (e.g., pricing_master.xlsx, product_catalog.csv). The skill creator records which files are needed — the operator uploads them during setup.</div>' +
    (kfHtml || '<div style="font-size:11px;color:var(--text-quaternary)">No files specified</div>') + '</div>' +

    '<div class="sc-section"><h5>Examples <button class="sc-btn sc-btn-sm" style="margin-left:8px" onclick="scAddExample()">+ Add</button></h5>' +
    '<div style="font-size:11px;color:var(--text-quaternary);margin:-4px 0 8px">Input/output pairs that demonstrate expected behavior (few-shot examples). The more precise and representative these are, the more consistent Claude\\'s output will be.</div>' +
    (examplesHtml || '<div style="font-size:11px;color:var(--text-quaternary)">No examples added</div>') + '</div>';
}

function scAddInputField() {
  if (scActiveIdx === null) return;
  scSkills[scActiveIdx].inputFields.push({ name:'', type:'string', description:'', required:true });
  scSave(); scRenderEditor(); scRenderYaml();
}
function scUpdateInputField(i, key, val) {
  if (scActiveIdx === null) return;
  scSkills[scActiveIdx].inputFields[i][key] = val;
  scSave(); scRenderYaml();
}
function scRemoveInputField(i) {
  if (scActiveIdx === null) return;
  scSkills[scActiveIdx].inputFields.splice(i, 1);
  scSave(); scRenderEditor(); scRenderYaml();
}
function scAddExample() {
  if (scActiveIdx === null) return;
  scSkills[scActiveIdx].examples.push({ input:'', output:'' });
  scSave(); scRenderEditor(); scRenderYaml();
}
function scUpdateExample(i, key, val) {
  if (scActiveIdx === null) return;
  scSkills[scActiveIdx].examples[i][key] = val;
  scSave(); scRenderYaml();
}
function scRemoveExample(i) {
  if (scActiveIdx === null) return;
  scSkills[scActiveIdx].examples.splice(i, 1);
  scSave(); scRenderEditor(); scRenderYaml();
}
function scAddKF() {
  if (scActiveIdx === null) return;
  scSkills[scActiveIdx].knowledgeFiles.push('');
  scSave(); scRenderEditor(); scRenderYaml();
}
function scUpdateKF(i, val) {
  if (scActiveIdx === null) return;
  scSkills[scActiveIdx].knowledgeFiles[i] = val;
  scSave(); scRenderYaml();
}
function scRemoveKF(i) {
  if (scActiveIdx === null) return;
  scSkills[scActiveIdx].knowledgeFiles.splice(i, 1);
  scSave(); scRenderEditor(); scRenderYaml();
}

function scBuildYaml(s) {
  let y = '# Claude Skill: ' + s.name + '\\n';
  y += '# Category: ' + s.category + '\\n';
  y += '# Department: ' + (s.department||'') + ' | Tier: ' + s.tier + '\\n\\n';
  y += 'name: ' + s.slug + '\\n';
  y += 'title: ' + s.name + '\\n';
  y += 'description: ' + s.description + '\\n\\n';
  if (s.instructions) {
    y += 'instructions: |\\n';
    s.instructions.split('\\n').forEach(function(line) { y += '  ' + line + '\\n'; });
    y += '\\n';
  }
  if (s.inputFields.length > 0) {
    y += 'input_schema:\\n  type: object\\n  properties:\\n';
    s.inputFields.forEach(function(f) {
      y += '    ' + (f.name || 'field') + ':\\n';
      y += '      type: ' + f.type + '\\n';
      if (f.description) y += '      description: ' + f.description + '\\n';
    });
    var req = s.inputFields.filter(function(f) { return f.required; }).map(function(f) { return f.name; });
    if (req.length) { y += '  required:\\n'; req.forEach(function(r) { y += '    - ' + r + '\\n'; }); }
    y += '\\n';
  }
  if (s.outputFormat) { y += 'output_format: ' + s.outputFormat + '\\n\\n'; }
  if (s.knowledgeFiles.length > 0) {
    y += 'knowledge_files:\\n';
    s.knowledgeFiles.forEach(function(f) { if (f) y += '  - ' + f + '\\n'; });
    y += '\\n';
  }
  if (s.examples.length > 0) {
    y += 'examples:\\n';
    s.examples.forEach(function(ex, i) {
      y += '  - name: Example ' + (i+1) + '\\n';
      if (ex.input) { y += '    input: |\\n'; ex.input.split('\\n').forEach(function(l) { y += '      ' + l + '\\n'; }); }
      if (ex.output) { y += '    output: |\\n'; ex.output.split('\\n').forEach(function(l) { y += '      ' + l + '\\n'; }); }
    });
    y += '\\n';
  }
  y += 'metadata:\\n  category: ' + s.category + '\\n  department: ' + (s.department||'') + '\\n  tier: ' + s.tier + '\\n';
  return y;
}

function scRenderYaml() {
  var pre = document.getElementById('scYamlPreview');
  if (!pre || scActiveIdx === null) return;
  pre.textContent = scBuildYaml(scSkills[scActiveIdx]);
}

function scCopyYaml() {
  if (scActiveIdx === null) return;
  navigator.clipboard.writeText(scBuildYaml(scSkills[scActiveIdx]));
}

function scDownloadOne() {
  if (scActiveIdx === null) return;
  var s = scSkills[scActiveIdx];
  var blob = new Blob([scBuildYaml(s)], {type:'text/yaml'});
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = (s.slug || 'skill') + '.yaml'; a.click(); URL.revokeObjectURL(a.href);
}

function scDownloadAll() {
  var all = scSkills.map(function(s) { return scBuildYaml(s); }).join('\\n---\\n\\n');
  var blob = new Blob([all], {type:'text/yaml'});
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'all-skills.yaml'; a.click(); URL.revokeObjectURL(a.href);
}

// Init skill creator list
scRenderList();

// Init gap resolutions (after scSkills is available)
loadGapResolutions();
renderAllGaps();

// ====== OFFER GENERATOR ======
const OFFER_DASHBOARD_ID = GAP_DASHBOARD_ID;
var offerFile = null;
var offerBusy = false;

// Drag and drop
var dz = document.getElementById('offerDropzone');
if (dz) {
  dz.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); dz.style.borderColor='var(--blue)'; dz.style.background='rgba(59,130,246,0.05)'; });
  dz.addEventListener('dragleave', function() { dz.style.borderColor='var(--border)'; dz.style.background=''; });
  dz.addEventListener('drop', function(e) {
    e.preventDefault(); e.stopPropagation(); dz.style.borderColor='var(--border)'; dz.style.background='';
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) offerFileSelected({ files: e.dataTransfer.files });
  });
}

function offerFileSelected(input) {
  var f = input.files && input.files[0];
  if (!f || offerBusy) return;
  offerFile = f;
  document.getElementById('offerFileInput').value = '';
  // Auto-generate immediately
  offerGenerate();
}

function offerGenerate() {
  if (!offerFile || offerBusy) return;
  offerBusy = true;

  // Show processing state
  document.getElementById('offerDropIdle').style.display = 'none';
  document.getElementById('offerDropProcessing').style.display = 'block';
  document.getElementById('offerFileName').textContent = offerFile.name;
  document.getElementById('offerDropzone').style.borderColor = 'var(--blue)';
  document.getElementById('offerDropzone').style.cursor = 'default';
  document.getElementById('offerError').style.display = 'none';
  document.getElementById('offerDownload').style.display = 'none';

  var fd = new FormData();
  fd.append('file', offerFile);

  fetch('/api/tools/offer-generator', { method: 'POST', body: fd })
    .then(function(res) {
      if (!res.ok) {
        return res.text().then(function(t) {
          try { var d = JSON.parse(t); throw new Error(d.error || 'Generation failed'); }
          catch(e) { if (e.message && e.message !== 'Generation failed') throw e; throw new Error('Server error (' + res.status + '). Check that template assets are deployed.'); }
        });
      }
      var meta = {
        customer: res.headers.get('X-Offer-Customer') || '',
        series: res.headers.get('X-Offer-Series') || '',
        proforma: res.headers.get('X-Offer-Proforma') || '',
        orderType: res.headers.get('X-Offer-Type') || '',
        total: parseFloat(res.headers.get('X-Offer-Total') || '0'),
        filename: res.headers.get('X-Offer-Filename') || 'Orient_Jet_Offer.pdf'
      };
      return res.blob().then(function(blob) { return { blob: blob, meta: meta }; });
    })
    .then(function(result) {
      var url = URL.createObjectURL(result.blob);
      var dl = document.getElementById('offerDownloadLink');
      dl.href = url; dl.download = result.meta.filename;
      document.getElementById('offerDownloadName').textContent = result.meta.filename;
      document.getElementById('offerDownload').style.display = 'block';

      // Show instant preview of generated PDF
      document.getElementById('pdfPreviewFrame').src = url;
      document.getElementById('pdfPreviewTitle').textContent = result.meta.filename;
      var pdl = document.getElementById('pdfPreviewDownload');
      pdl.href = url; pdl.download = result.meta.filename;
      document.getElementById('pdfPreviewModal').style.display = 'block';
      document.body.style.overflow = 'hidden';

      // Save to offers table (include PDF as base64)
      if (OFFER_DASHBOARD_ID > 0) {
        var reader = new FileReader();
        reader.onload = function() {
          var base64 = reader.result.toString().split(',')[1] || '';
          fetch('/api/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dashboardId: OFFER_DASHBOARD_ID,
              customerName: result.meta.customer,
              series: result.meta.series,
              proformaNo: result.meta.proforma,
              orderType: result.meta.orderType,
              totalPrice: result.meta.total,
              filename: result.meta.filename,
              pdfBase64: base64
            })
          }).then(function() { offerLoadHistory(); }).catch(function() {});
        };
        reader.readAsDataURL(result.blob);
      }

      offerResetDropzone();
    })
    .catch(function(err) {
      document.getElementById('offerError').textContent = err.message || 'Something went wrong. Please try again.';
      document.getElementById('offerError').style.display = 'block';
      offerResetDropzone();
    });
}

function offerResetDropzone() {
  offerBusy = false;
  offerFile = null;
  document.getElementById('offerDropIdle').style.display = 'block';
  document.getElementById('offerDropProcessing').style.display = 'none';
  document.getElementById('offerDropzone').style.borderColor = 'var(--border)';
  document.getElementById('offerDropzone').style.cursor = 'pointer';
}

function offerLoadHistory() {
  var el = document.getElementById('offerHistory');
  if (!el || OFFER_DASHBOARD_ID <= 0) {
    if (el) el.innerHTML = '<div style="padding:24px;text-align:center;font-size:12px;color:var(--muted)">Save a dashboard first to track offer history</div>';
    return;
  }
  fetch('/api/offers?dashboardId=' + OFFER_DASHBOARD_ID)
    .then(function(r) {
      if (!r.ok) throw new Error('API error');
      return r.json();
    })
    .then(function(rows) {
      if (!Array.isArray(rows) || rows.length === 0) {
        el.innerHTML = '<div style="padding:24px;text-align:center;font-size:12px;color:var(--muted)">No offers generated yet</div>';
        return;
      }
      var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
        '<tr style="border-bottom:1px solid var(--border);"><th style="text-align:left;padding:8px 12px;color:var(--muted);font-weight:500;">Customer</th><th style="text-align:left;padding:8px 12px;color:var(--muted);font-weight:500;">Series</th><th style="text-align:left;padding:8px 12px;color:var(--muted);font-weight:500;">Proforma</th><th style="text-align:right;padding:8px 12px;color:var(--muted);font-weight:500;">Total</th><th style="text-align:right;padding:8px 12px;color:var(--muted);font-weight:500;">Date</th><th style="padding:8px 12px;width:80px;"></th></tr>';
      rows.forEach(function(r) {
        var d = new Date(r.created_at);
        var dateStr = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
        var total = r.total_price > 0 ? (r.order_type === 'INTERNATIONAL' ? '$' : '\u20B9') + Number(r.total_price).toLocaleString('en-IN') : '\u2014';
        var actions = '';
        if (r.has_pdf) {
          actions += '<span onclick="event.stopPropagation();offerPreview(' + r.id + ',\\'' + (r.filename || '').replace(/'/g, '') + '\\')" title="Preview PDF" style="color:var(--blue);cursor:pointer;margin-right:8px;font-size:14px;">\\u25B6</span>';
          actions += '<a href="/api/offers/' + r.id + '/pdf?dl=1" onclick="event.stopPropagation()" title="Download PDF" style="color:var(--blue);text-decoration:none;margin-right:8px;font-size:14px;cursor:pointer;">\\u2913</a>';
        }
        actions += '<span onclick="event.stopPropagation();offerDelete(' + r.id + ')" title="Delete" style="color:var(--muted);cursor:pointer;font-size:14px;opacity:0.6;transition:opacity 0.2s;" onmouseover="this.style.opacity=1;this.style.color=\\'#ef4444\\'" onmouseout="this.style.opacity=0.6;this.style.color=\\'var(--muted)\\'">\\u2715</span>';
        var rowClick = r.has_pdf ? ' onclick="offerPreview(' + r.id + ',\\'' + (r.filename || '').replace(/'/g, '') + '\\')" style="border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\\'rgba(255,255,255,0.03)\\'" onmouseout="this.style.background=\\'\\'"' : ' style="border-bottom:1px solid var(--border);"';
        html += '<tr' + rowClick + '>' +
          '<td style="padding:8px 12px;color:var(--text);">' + (r.customer_name || '\u2014') + '</td>' +
          '<td style="padding:8px 12px;color:var(--muted);">' + (r.series || '\u2014') + '</td>' +
          '<td style="padding:8px 12px;color:var(--muted);">' + (r.proforma_no || '\u2014') + '</td>' +
          '<td style="padding:8px 12px;text-align:right;color:var(--text);font-weight:500;">' + total + '</td>' +
          '<td style="padding:8px 12px;text-align:right;color:var(--muted);">' + dateStr + '</td>' +
          '<td style="padding:8px 12px;text-align:right;">' + actions + '</td></tr>';
      });
      html += '</table>';
      el.innerHTML = html;
    })
    .catch(function() {
      el.innerHTML = '<div style="padding:24px;text-align:center;font-size:12px;color:var(--muted)">No offers generated yet</div>';
    });
}
offerLoadHistory();

function offerPreview(id, filename) {
  var url = '/api/offers/' + id + '/pdf';
  document.getElementById('pdfPreviewFrame').src = url;
  document.getElementById('pdfPreviewTitle').textContent = filename || 'Offer Preview';
  var dl = document.getElementById('pdfPreviewDownload');
  dl.href = url + '?dl=1';
  dl.download = filename || 'Offer.pdf';
  document.getElementById('pdfPreviewModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closePdfPreview() {
  document.getElementById('pdfPreviewModal').style.display = 'none';
  document.getElementById('pdfPreviewFrame').src = '';
  document.body.style.overflow = '';
}

function offerDelete(id) {
  if (!confirm('Delete this offer?')) return;
  fetch('/api/offers/' + id, { method: 'DELETE' })
    .then(function(r) { if (!r.ok) throw new Error('Delete failed'); return r.json(); })
    .then(function() { offerLoadHistory(); })
    .catch(function(err) { alert(err.message || 'Could not delete offer'); });
}

// ====== SETTINGS ======
const SETTINGS_DASHBOARD_ID = GAP_DASHBOARD_ID;
var settingsOrigName = '${data.companyName.replace(/'/g, "\\'")}';
var settingsOrigShort = '${(data.companyShort || '').replace(/'/g, "\\'")}';

function settingsInit() {
  document.getElementById('settingsName').value = settingsOrigName;
  document.getElementById('settingsShort').value = settingsOrigShort;
  document.getElementById('settingsId').textContent = SETTINGS_DASHBOARD_ID;

  // Fetch fresh metadata
  if (SETTINGS_DASHBOARD_ID > 0) {
    fetch('/api/dashboards/' + SETTINGS_DASHBOARD_ID)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        settingsOrigName = d.company_name;
        settingsOrigShort = d.company_short || '';
        document.getElementById('settingsName').value = settingsOrigName;
        document.getElementById('settingsShort').value = settingsOrigShort;
        document.getElementById('settingsCreated').textContent = new Date(d.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        document.getElementById('settingsDownload').href = '/api/dashboards/' + SETTINGS_DASHBOARD_ID + '/html';
      }).catch(() => {});
  }

  // Show save button on change
  ['settingsName', 'settingsShort'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
      const changed = document.getElementById('settingsName').value !== settingsOrigName || document.getElementById('settingsShort').value !== settingsOrigShort;
      document.getElementById('settingsSaveBtn').style.display = changed ? 'inline-block' : 'none';
      document.getElementById('settingsSaveMsg').style.display = 'none';
    });
  });
}

function settingsSave() {
  const name = document.getElementById('settingsName').value.trim();
  const short = document.getElementById('settingsShort').value.trim();
  if (!name) { alert('Company name is required'); return; }
  if (SETTINGS_DASHBOARD_ID <= 0) { alert('Cannot rename static dashboard'); return; }

  document.getElementById('settingsSaveBtn').textContent = 'Saving...';
  fetch('/api/dashboards/' + SETTINGS_DASHBOARD_ID, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName: name, companyShort: short })
  }).then(r => r.json()).then(d => {
    if (d.error) { alert(d.error); return; }
    settingsOrigName = name;
    settingsOrigShort = short;
    document.getElementById('settingsSaveBtn').style.display = 'none';
    document.getElementById('settingsSaveBtn').textContent = 'Save Changes';
    document.getElementById('settingsSaveMsg').style.display = 'inline';
    // Update sidebar company name
    var sn = document.querySelector('.sidebar-company');
    if (sn) sn.textContent = short || name;
    setTimeout(() => { document.getElementById('settingsSaveMsg').style.display = 'none'; }, 2000);
  }).catch(() => alert('Failed to save'));
}

function settingsConfirmDelete() {
  document.getElementById('settingsDeleteConfirm').style.display = 'block';
}

function settingsDelete() {
  if (SETTINGS_DASHBOARD_ID <= 0) { alert('Cannot delete static dashboard'); return; }
  fetch('/api/dashboards/' + SETTINGS_DASHBOARD_ID, { method: 'DELETE' })
    .then(r => r.json()).then(d => {
      if (d.ok) window.top.location.href = '/';
      else alert(d.error || 'Failed to delete');
    }).catch(() => alert('Failed to delete'));
}

settingsInit();
</script>
</body>
</html>`;
}
