export interface ClientProfile {
  companyName: string;
  industry: string;
  employeeCount: string;
  erp: string;
  departments: string[];
  painPoints: string;
  budget: string;
  timeline: string;
  existingAI: string;
  claudePlan: string;
}

export const DEFAULT_CLIENT: ClientProfile = {
  companyName: "",
  industry: "",
  employeeCount: "",
  erp: "",
  departments: [],
  painPoints: "",
  budget: "",
  timeline: "",
  existingAI: "",
  claudePlan: "Enterprise",
};

export const COMMON_DEPARTMENTS = [
  "Sales & Marketing",
  "Design / Engineering",
  "Supply Chain / Procurement",
  "Production / Manufacturing",
  "Finance / Accounts",
  "HR / Admin",
  "IT / Technology",
  "Customer Service / Support",
  "Legal / Compliance",
  "Operations",
  "R&D",
  "Quality Assurance",
  "Logistics / Warehousing",
];

export const INDUSTRY_PRESETS: Record<
  string,
  { departments: string[]; painPoints: string }
> = {
  Manufacturing: {
    departments: [
      "Sales & Marketing",
      "Design / Engineering",
      "Supply Chain / Procurement",
      "Production / Manufacturing",
      "Finance / Accounts",
      "HR / Admin",
      "IT / Technology",
      "Customer Service / Support",
    ],
    painPoints:
      "Manual quoting, BOM errors, vendor management overhead, production scheduling, inventory tracking, maintenance downtime",
  },
  "Professional Services": {
    departments: [
      "Sales & Marketing",
      "Finance / Accounts",
      "HR / Admin",
      "IT / Technology",
      "Operations",
      "Legal / Compliance",
      "Customer Service / Support",
    ],
    painPoints:
      "Proposal writing, time tracking, resource allocation, client reporting, knowledge management, compliance documentation",
  },
  Retail: {
    departments: [
      "Sales & Marketing",
      "Supply Chain / Procurement",
      "Finance / Accounts",
      "HR / Admin",
      "IT / Technology",
      "Logistics / Warehousing",
      "Customer Service / Support",
    ],
    painPoints:
      "Inventory forecasting, pricing optimization, vendor negotiations, customer support volume, seasonal planning, omnichannel coordination",
  },
  Healthcare: {
    departments: [
      "Operations",
      "Finance / Accounts",
      "HR / Admin",
      "IT / Technology",
      "Quality Assurance",
      "Legal / Compliance",
      "Customer Service / Support",
    ],
    painPoints:
      "Documentation burden, compliance tracking, scheduling, patient communication, claims processing, staff training",
  },
  Technology: {
    departments: [
      "Sales & Marketing",
      "R&D",
      "Finance / Accounts",
      "HR / Admin",
      "IT / Technology",
      "Customer Service / Support",
      "Legal / Compliance",
    ],
    painPoints:
      "Documentation, code review throughput, customer onboarding, technical support, proposal generation, competitive analysis",
  },
};
