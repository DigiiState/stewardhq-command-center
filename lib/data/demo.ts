export type Business = {
  slug: string;
  name: string;
  shortName: string;
  status: "ACTIVE" | "BUILD" | "WATCH";
  health: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  revenue: string;
  metricLabel: string;
  metricValue: string;
  alerts: number;
};

export const businesses: Business[] = [
  {
    slug: "baltimore-village",
    name: "Baltimore Village",
    shortName: "Baltimore Village",
    status: "ACTIVE",
    health: 92,
    priority: "HIGH",
    description: "Traditional property management operations, leasing, maintenance, owner relations and tenant operations.",
    revenue: "$—",
    metricLabel: "Managed Doors",
    metricValue: "—",
    alerts: 1,
  },
  {
    slug: "mycolivingpm",
    name: "MyCoLivingPM",
    shortName: "MyCoLivingPM",
    status: "ACTIVE",
    health: 87,
    priority: "HIGH",
    description: "Specialist co-living and PadSplit setup and management business.",
    revenue: "$—",
    metricLabel: "Owner Pipeline",
    metricValue: "27",
    alerts: 0,
  },
  {
    slug: "real-estate-acquisitions",
    name: "Real Estate Acquisitions",
    shortName: "Real Estate",
    status: "ACTIVE",
    health: 84,
    priority: "HIGH",
    description: "Baltimore acquisition, underwriting, renovation, refinance and long-term hold pipeline.",
    revenue: "Portfolio",
    metricLabel: "Deals in Review",
    metricValue: "7",
    alerts: 2,
  },
  {
    slug: "baltimore-rental-compliance",
    name: "Baltimore Rental Compliance",
    shortName: "Rental Compliance",
    status: "ACTIVE",
    health: 89,
    priority: "MEDIUM",
    description: "Local rental licensing, lead compliance, violations, inspections and receivership rescue services.",
    revenue: "$—",
    metricLabel: "Open Cases",
    metricValue: "—",
    alerts: 0,
  },
  {
    slug: "complilandlord",
    name: "CompliLandlord",
    shortName: "CompliLandlord",
    status: "BUILD",
    health: 68,
    priority: "MEDIUM",
    description: "Scalable rental compliance SaaS and regulation intelligence platform.",
    revenue: "$—",
    metricLabel: "Build Stage",
    metricValue: "V1",
    alerts: 3,
  },
  {
    slug: "digiistate",
    name: "DigiiState",
    shortName: "DigiiState",
    status: "ACTIVE",
    health: 71,
    priority: "HIGH",
    description: "Digital deeds, local lead-generation sites, rankings, lead routing and recurring digital asset revenue.",
    revenue: "$—",
    metricLabel: "Markets",
    metricValue: "—",
    alerts: 2,
  },
  {
    slug: "rentbase",
    name: "RentBase",
    shortName: "RentBase",
    status: "ACTIVE",
    health: 76,
    priority: "HIGH",
    description: "AI-first property management operating system and system of intelligence.",
    revenue: "$—",
    metricLabel: "AI Agents",
    metricValue: "14",
    alerts: 1,
  },
  {
    slug: "bizlee",
    name: "Bizlee",
    shortName: "Bizlee",
    status: "ACTIVE",
    health: 81,
    priority: "MEDIUM",
    description: "Online business opportunity intelligence venture and autonomous research team.",
    revenue: "$—",
    metricLabel: "Opportunities",
    metricValue: "—",
    alerts: 0,
  },
];

export const priorities = [
  { id: 1, business: "Real Estate", title: "Clifton financing decision", detail: "Re-run hold/refi structure and confirm refinance guardrails.", severity: "high" },
  { id: 2, business: "MyCoLivingPM", title: "Owner acquisition campaign", detail: "Campaign package is ready for executive review before outreach.", severity: "medium" },
  { id: 3, business: "DigiiState", title: "Production verification", detail: "Two P1 technical items need final verification before live deployment.", severity: "high" },
];

export const approvals = [
  { id: "APR-1028", business: "Baltimore Village", title: "HVAC replacement", amount: "$2,850", risk: "HIGH", recommendation: "APPROVE", reason: "Emergency repair; 3 bids received; selected qualified bid is below average." },
  { id: "APR-1029", business: "MyCoLivingPM", title: "Owner acquisition campaign", amount: "$500 budget", risk: "MEDIUM", recommendation: "REVIEW", reason: "Campaign assets complete. Approval required before any paid spend or owner outreach." },
  { id: "APR-1030", business: "DigiiState", title: "Deploy technical patch", amount: "$0", risk: "LOW", recommendation: "DEPLOY", reason: "Technical QA passed in staging; production deployment remains approval-gated." },
];

export const agents = [
  { name: "Maintenance Agent", business: "Baltimore Village", platform: "Accio", status: "Working", task: "3 maintenance work orders", authority: 2 },
  { name: "Lead Research Agent", business: "MyCoLivingPM", platform: "Accio", status: "Working", task: "Baltimore owner research", authority: 1 },
  { name: "Property Researcher", business: "Real Estate", platform: "Accio", status: "Working", task: "Clifton comps and rent validation", authority: 1 },
  { name: "Claude CTO", business: "DigiiState", platform: "Claude", status: "Attention", task: "P1 production audit", authority: 2 },
  { name: "Executive Strategy AI", business: "Portfolio", platform: "OpenAI", status: "Ready", task: "Portfolio reasoning and routing", authority: 2 },
  { name: "Compliance Agent", business: "Rental Compliance", platform: "Accio", status: "Ready", task: "License and violation checks", authority: 1 },
  { name: "Owner Onboarding Agent", business: "MyCoLivingPM", platform: "Accio", status: "Ready", task: "Awaiting approved owner records", authority: 2 },
  { name: "RentBase QA", business: "RentBase", platform: "Claude", status: "Working", task: "Integration health review", authority: 2 },
];

export function getBusiness(slug: string) {
  return businesses.find((business) => business.slug === slug);
}
