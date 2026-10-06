export type CommissionStatus = 'pending' | 'invoiced' | 'received' | 'paid_out';

export interface CommissionInfo {
  supplier_commission_pct: number;
  supplier_commission_amount: number;
  agent_commission_pct: number;
  agent_commission_amount: number;
  status: CommissionStatus;
  notes: string;
  updatedAt?: string;
}

export const DEFAULT_COMMISSION: CommissionInfo = {
  supplier_commission_pct: 0,
  supplier_commission_amount: 0,
  agent_commission_pct: 0,
  agent_commission_amount: 0,
  status: 'pending',
  notes: '',
};

export function computeCommission(
  grandTotalMinor: number,
  supplierPct: number,
  agentPct: number,
): Pick<CommissionInfo, 'supplier_commission_amount' | 'agent_commission_amount'> {
  const supplier = Math.round((grandTotalMinor * (supplierPct || 0)) / 100);
  const agent = Math.round((supplier * (agentPct || 0)) / 100);
  return { supplier_commission_amount: supplier, agent_commission_amount: agent };
}
