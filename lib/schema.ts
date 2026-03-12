export interface UseCase {
  name: string;
  tier: "t1" | "t2" | "t3" | "t4";
  complexity: "beginner" | "intermediate" | "advanced";
  skill: string;
  skillStatus: "exists" | "partial" | "builtin" | "custom";
  skillNotes: string;
}

export interface Department {
  name: string;
  useCases: UseCase[];
}

export interface Project {
  number: number;
  name: string;
  department: string;
  description: string;
  useCaseRefs: string;
  knowledge: string;
  skills: string;
  tier: string;
}

export interface Gap {
  id: string;
  label: string;
  title: string;
  description: string;
}

export interface CustomSkill {
  name: string;
  tag: string;
  description: string;
}

export interface Epic {
  id: string;
  name: string;
  department: string;
  tier: "t1" | "t2" | "t3" | "t4";
  column: "backlog" | "progress" | "blocked" | "done";
  items: string[];
}

export interface TierSummary {
  name: string;
  label: string;
  timeline: string;
  count: number;
  description: string;
}

export interface DashboardData {
  companyName: string;
  companyShort: string;
  subtitle: string;
  totalUseCases: number;
  totalDepartments: number;
  totalPhases: number;
  quickWins: number;
  customSkillsCount: number;
  timeline: string;
  architectureRec: string;
  tiers: TierSummary[];
  departments: Department[];
  projects: Project[];
  gaps: Gap[];
  customSkills: CustomSkill[];
  epics: Epic[];
}

export const DASHBOARD_JSON_SCHEMA = {
  type: "object",
  properties: {
    companyName: { type: "string", description: "Full company name" },
    companyShort: { type: "string", description: "Short name for sidebar (1-2 words)" },
    subtitle: { type: "string", description: "One-line description of the rollout" },
    totalUseCases: { type: "number" },
    totalDepartments: { type: "number" },
    totalPhases: { type: "number" },
    quickWins: { type: "number", description: "Number of Tier 1 use cases" },
    customSkillsCount: { type: "number" },
    timeline: { type: "string", description: "e.g. ~6mo" },
    architectureRec: { type: "string", description: "HTML-safe paragraph with architecture recommendation. Use <strong> for emphasis." },
    tiers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "e.g. Tier 1" },
          label: { type: "string", description: "e.g. Quick Wins" },
          timeline: { type: "string", description: "e.g. Week 1-4" },
          count: { type: "number" },
          description: { type: "string" },
        },
        required: ["name", "label", "timeline", "count", "description"],
      },
    },
    departments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          useCases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                tier: { type: "string", enum: ["t1", "t2", "t3", "t4"] },
                complexity: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                skill: { type: "string", description: "Matching skill name or — if none" },
                skillStatus: { type: "string", enum: ["exists", "partial", "builtin", "custom"] },
                skillNotes: { type: "string" },
              },
              required: ["name", "tier", "complexity", "skill", "skillStatus", "skillNotes"],
            },
          },
        },
        required: ["name", "useCases"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          number: { type: "number" },
          name: { type: "string" },
          department: { type: "string" },
          description: { type: "string" },
          useCaseRefs: { type: "string", description: "e.g. #1, #2, #3" },
          knowledge: { type: "string" },
          skills: { type: "string" },
          tier: { type: "string" },
        },
        required: ["number", "name", "department", "description", "useCaseRefs", "knowledge", "skills", "tier"],
      },
    },
    gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Stable unique ID like gap-1, gap-2, etc." },
          label: { type: "string", description: "e.g. BLOCKER 1 or RISK 4" },
          title: { type: "string" },
          description: { type: "string", description: "HTML-safe with <strong> for emphasis" },
        },
        required: ["id", "label", "title", "description"],
      },
    },
    customSkills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          tag: { type: "string", description: "e.g. Custom or V2" },
          description: { type: "string" },
        },
        required: ["name", "tag", "description"],
      },
    },
    epics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique ID like e1, e2..." },
          name: { type: "string" },
          department: { type: "string" },
          tier: { type: "string", enum: ["t1", "t2", "t3", "t4"] },
          column: { type: "string", enum: ["backlog", "progress", "blocked", "done"], description: "Initial kanban column" },
          items: { type: "array", items: { type: "string" }, description: "Sub-tasks for this epic" },
        },
        required: ["id", "name", "department", "tier", "column", "items"],
      },
    },
  },
  required: [
    "companyName", "companyShort", "subtitle", "totalUseCases", "totalDepartments",
    "totalPhases", "quickWins", "customSkillsCount", "timeline", "architectureRec",
    "tiers", "departments", "projects", "gaps", "customSkills", "epics",
  ],
};
