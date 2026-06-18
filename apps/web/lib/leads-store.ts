export type LeadStatus = "new" | "contacted" | "interested" | "converted" | "not_interested";

export interface LeadRecord {
  id: string;
  visitCount: number;
  firstVisitAt: string;
  lastVisitAt: string;
  pageVisited?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  status: LeadStatus;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  selectedPlanInterest?: string;
  notes?: string;
}

const globalLeads = globalThis as typeof globalThis & { crushermitraLeads?: LeadRecord[] };

export function listLeads(): LeadRecord[] {
  return [...getLeads()].sort((a, b) => b.lastVisitAt.localeCompare(a.lastVisitAt));
}

export function createLead(input: Omit<LeadRecord, "firstVisitAt" | "id" | "lastVisitAt" | "status" | "visitCount">): LeadRecord {
  const now = new Date().toISOString();
  const lead: LeadRecord = {
    ...input,
    id: crypto.randomUUID(),
    visitCount: 1,
    firstVisitAt: now,
    lastVisitAt: now,
    status: "new"
  };
  getLeads().push(lead);
  return lead;
}

export function updateLead(id: string, patch: Partial<Pick<LeadRecord, "notes" | "status">>): LeadRecord | null {
  const lead = getLeads().find((item) => item.id === id);
  if (!lead) return null;
  if (patch.status) lead.status = patch.status;
  if (patch.notes !== undefined) lead.notes = patch.notes;
  lead.lastVisitAt = new Date().toISOString();
  return lead;
}

export function deleteLead(id: string): boolean {
  const leads = getLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return false;
  leads.splice(index, 1);
  return true;
}

function getLeads(): LeadRecord[] {
  globalLeads.crushermitraLeads ??= [];
  return globalLeads.crushermitraLeads;
}
