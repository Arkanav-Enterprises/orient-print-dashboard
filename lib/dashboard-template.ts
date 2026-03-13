import type { DashboardData } from "./schema";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateDashboardHTML(data: DashboardData): string {
  const tierCounts = [0, 0, 0, 0];
  const deptCounts: number[] = [];
  const skillCounts = { exists: 0, partial: 0, builtin: 0, custom: 0 };
  const complexityCounts = { beginner: 0, intermediate: 0, advanced: 0 };
  const deptShortNames: Record<string, string> = {};

  data.departments.forEach((dept, i) => {
    deptCounts[i] = dept.useCases.length;
    const short = dept.name.length > 6 ? dept.name.split(/[\s&]/)[0].slice(0, 4) : dept.name;
    deptShortNames[dept.name] = short;
    dept.useCases.forEach((uc) => {
      const tierIdx = parseInt(uc.tier[1]) - 1;
      if (tierIdx >= 0 && tierIdx < 4) tierCounts[tierIdx]++;
      skillCounts[uc.skillStatus]++;
      complexityCounts[uc.complexity]++;
    });
  });

  const deptColors = ["#0070f3", "#3b82f6", "#f97316", "#22c55e", "#f43f5e", "#06b6d4", "#eab308"];

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

  const projectsHtml = data.projects
    .map(
      (p) => `
          <div class="project-item">
            <div class="proj-top"><span class="proj-dept-badge">${escapeHtml(p.department)}</span></div>
            <div class="proj-name">${p.number}. ${escapeHtml(p.name)}</div>
            <div class="proj-desc">${escapeHtml(p.description)}</div>
            <div class="proj-meta">
              <div class="proj-meta-item"><strong>Use Cases:</strong> ${escapeHtml(p.useCaseRefs)}</div>
              <div class="proj-meta-item"><strong>Knowledge:</strong> ${escapeHtml(p.knowledge)}</div>
              <div class="proj-meta-item"><strong>Skills:</strong> ${escapeHtml(p.skills)}</div>
              <div class="proj-meta-item"><strong>Tier:</strong> ${escapeHtml(p.tier)}</div>
            </div>
          </div>`
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

  const deptChartData = `[${deptCounts.join(",")}]`;
  const deptChartColors = `[${deptColors.slice(0, data.departments.length).map((c) => `'${c}'`).join(",")}]`;

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
  .project-item { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: border-color 0.15s; }
  .project-item:hover { border-color: var(--border-hover); }
  .proj-top { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .proj-dept-badge { font-size: 11px; color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .proj-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
  .proj-desc { font-size: 13px; color: var(--text-tertiary); margin-bottom: 12px; }
  .proj-meta { display: flex; gap: 16px; flex-wrap: wrap; }
  .proj-meta-item { font-size: 12px; color: var(--text-tertiary); }
  .proj-meta-item strong { color: var(--text-secondary); font-weight: 500; }
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
  @media (max-width: 1100px) { .timeline-grid { grid-template-columns: repeat(2, 1fr); } .kanban-board { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 800px) { .sidebar { display: none; } .main-area { margin-left: 0; } .content { padding: 20px; } .timeline-grid { grid-template-columns: 1fr; } .charts-grid { grid-template-columns: 1fr; } .kanban-board { grid-template-columns: 1fr; } .dept-grid { grid-template-columns: 1fr; } .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

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
      <div class="nav-section-label">Manage</div>
      <div class="nav-item" onclick="navigate('settings')">
        <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M13.5 8a5.5 5.5 0 01-.3 1.8l1.3.8-.9 1.5-1.4-.5a5.5 5.5 0 01-1.5 1l.2 1.5H9.1l.2-1.5a5.5 5.5 0 01-1.5-1l-1.4.5-.9-1.5 1.3-.8A5.5 5.5 0 016.5 8c0-.6.1-1.2.3-1.8L5.5 5.4l.9-1.5 1.4.5a5.5 5.5 0 011.5-1L9.1 1.9h1.8l-.2 1.5a5.5 5.5 0 011.5 1l1.4-.5.9 1.5-1.3.8c.2.6.3 1.2.3 1.8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></span>
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
          <div class="page-desc">${escapeHtml(data.subtitle)}</div>
        </div>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-label">Total Use Cases</div><div class="kpi-value">${data.totalUseCases}</div></div>
          <div class="kpi-card"><div class="kpi-label">Departments</div><div class="kpi-value">${data.totalDepartments}</div></div>
          <div class="kpi-card"><div class="kpi-label">Rollout Phases</div><div class="kpi-value">${data.totalPhases}</div></div>
          <div class="kpi-card"><div class="kpi-label">Quick Wins (T1)</div><div class="kpi-value">${data.quickWins}</div><div class="kpi-sub">Ready to deploy</div></div>
          <div class="kpi-card"><div class="kpi-label">Custom Skills</div><div class="kpi-value">${data.customSkillsCount}</div><div class="kpi-sub">To be built</div></div>
          <div class="kpi-card"><div class="kpi-label">Timeline</div><div class="kpi-value">${escapeHtml(data.timeline)}</div><div class="kpi-sub">Full deployment</div></div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-header">
            <span class="progress-bar-label">Overall Rollout Progress</span>
            <span class="progress-bar-pct" id="overallPct">0%</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" id="progressT1" style="width:0;background:var(--green)"></div>
            <div class="progress-bar-fill" id="progressT2" style="width:0;background:var(--blue)"></div>
            <div class="progress-bar-fill" id="progressT3" style="width:0;background:var(--orange)"></div>
            <div class="progress-bar-fill" id="progressT4" style="width:0;background:var(--purple)"></div>
          </div>
        </div>
        <div class="rec-box">
          <h3>Architecture Recommendation</h3>
          <p>${data.architectureRec}</p>
        </div>
        <div class="section-header"><div class="section-title">Phased Rollout Timeline</div></div>
        <div class="timeline-grid">
          ${data.tiers
            .map(
              (t, i) => `
          <div class="timeline-card t${i + 1}">
            <div class="tc-tier">${escapeHtml(t.name)}</div>
            <div class="tc-title">${escapeHtml(t.label)}</div>
            <div class="tc-time">${escapeHtml(t.timeline)}</div>
            <div class="tc-count">${t.count}</div>
            <div class="tc-count-label">use cases</div>
            <div class="tc-desc">${escapeHtml(t.description)}</div>
          </div>`
            )
            .join("")}
        </div>
        <div class="charts-grid">
          <div class="chart-card">
            <h3>Use Cases by Tier</h3>
            <div class="donut-wrap">
              <canvas id="tierChart" width="160" height="160"></canvas>
              <div class="donut-legend">
                ${data.tiers.map((t, i) => `<div class="dl-item"><div class="dl-dot" style="background:${["var(--green)", "var(--blue)", "var(--orange)", "var(--purple)"][i]}"></div>${escapeHtml(t.name)}: ${escapeHtml(t.label)} <span class="dl-count">(${t.count})</span></div>`).join("")}
              </div>
            </div>
          </div>
          <div class="chart-card">
            <h3>Use Cases by Department</h3>
            <div class="donut-wrap">
              <canvas id="deptChart" width="160" height="160"></canvas>
              <div class="donut-legend">
                ${data.departments.map((d, i) => `<div class="dl-item"><div class="dl-dot" style="background:${deptColors[i % deptColors.length]}"></div>${escapeHtml(d.name)} <span class="dl-count">(${d.useCases.length})</span></div>`).join("")}
              </div>
            </div>
          </div>
        </div>
        <div class="charts-grid">
          <div class="chart-card">
            <h3>Skill Coverage</h3>
            <div class="donut-wrap">
              <canvas id="skillChart" width="160" height="160"></canvas>
              <div class="donut-legend">
                <div class="dl-item"><div class="dl-dot" style="background:var(--green)"></div>Existing Match <span class="dl-count">(${skillCounts.exists})</span></div>
                <div class="dl-item"><div class="dl-dot" style="background:var(--yellow)"></div>Partial / Adapt <span class="dl-count">(${skillCounts.partial})</span></div>
                <div class="dl-item"><div class="dl-dot" style="background:var(--blue)"></div>Built-in <span class="dl-count">(${skillCounts.builtin})</span></div>
                <div class="dl-item"><div class="dl-dot" style="background:var(--red)"></div>Custom Build <span class="dl-count">(${skillCounts.custom})</span></div>
              </div>
            </div>
          </div>
          <div class="chart-card">
            <h3>Complexity Distribution</h3>
            <div class="donut-wrap">
              <canvas id="complexChart" width="160" height="160"></canvas>
              <div class="donut-legend">
                <div class="dl-item"><div class="dl-dot" style="background:var(--green)"></div>Beginner <span class="dl-count">(${complexityCounts.beginner})</span></div>
                <div class="dl-item"><div class="dl-dot" style="background:var(--orange)"></div>Intermediate <span class="dl-count">(${complexityCounts.intermediate})</span></div>
                <div class="dl-item"><div class="dl-dot" style="background:var(--red)"></div>Advanced <span class="dl-count">(${complexityCounts.advanced})</span></div>
              </div>
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
  const names = { overview:'Overview', departments:'Departments', skills:'Skill Mapping', projects:'Projects', kanban:'Roadmap Board', gaps:'Gaps & Risks', skillcreator:'Skill Creator', settings:'Settings' };
  document.getElementById('breadcrumb').textContent = names[id] || id;
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').classList.remove('visible');
}

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

drawDonut('tierChart', [${tierCounts.join(",")}], ['#22c55e', '#3b82f6', '#f97316', '#a855f7']);
drawDonut('deptChart', ${deptChartData}, ${deptChartColors});
drawDonut('skillChart', [${skillCounts.exists}, ${skillCounts.partial}, ${skillCounts.builtin}, ${skillCounts.custom}], ['#22c55e', '#eab308', '#3b82f6', '#ef4444']);
drawDonut('complexChart', [${complexityCounts.beginner}, ${complexityCounts.intermediate}, ${complexityCounts.advanced}], ['#22c55e', '#f97316', '#ef4444']);

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

// Load saved skill data
try {
  const saved = JSON.parse(localStorage.getItem('sc_skills'));
  if (saved && saved.length) scSkills = saved;
} catch(e) {}

function scSave() {
  try { localStorage.setItem('sc_skills', JSON.stringify(scSkills)); } catch(e) {}
}

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
