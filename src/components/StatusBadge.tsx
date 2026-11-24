import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck, XCircle } from 'lucide-react';
import { formatInputConfidence } from '../engine/engineeringEngine';
import type {
  ComparisonStatus,
  EngineeringCheckStatus,
  InputConfidenceLevel,
  OverallAuditStatus,
} from '../types/mithaq';

type AnyStatus = ComparisonStatus | EngineeringCheckStatus | OverallAuditStatus;

export function StatusIndicator({ status }: { status: AnyStatus }) {
  const base =
    'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold tracking-tight rounded border whitespace-nowrap shrink-0';

  switch (status) {
    case 'MATCH':
    case 'PASS':
    case 'VERIFIED MATCH':
      return (
        <span className={`${base} bg-emerald-50 text-emerald-800 border-emerald-200`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'WARNING':
    case 'DISCREPANCIES FOUND':
      return (
        <span className={`${base} bg-amber-50 text-amber-800 border-amber-200`}>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'MISMATCH':
    case 'FAIL':
    case 'ACTION REQUIRED':
      return (
        <span className={`${base} bg-red-50 text-red-800 border-red-200`}>
          <XCircle className="w-3.5 h-3.5 text-red-700 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'NOT VERIFIED':
    case 'INSUFFICIENT DATA':
    case 'INCOMPLETE DATA':
    default:
      return (
        <span className={`${base} bg-slate-100 text-slate-700 border-slate-300`}>
          <HelpCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>{status}</span>
        </span>
      );
  }
}

export function InputConfidenceBadge({ confidence }: { confidence: InputConfidenceLevel }) {
  const base =
    'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold tracking-tight rounded border whitespace-nowrap shrink-0';
  const label = formatInputConfidence(confidence);

  switch (confidence) {
    case 'VERIFIED_INPUTS':
      return (
        <span className={`${base} bg-emerald-50/70 text-emerald-900 border-emerald-300`}>
          <ShieldCheck className="w-3 h-3 text-emerald-700 shrink-0" />
          <span>{label}</span>
        </span>
      );
    case 'SIMULATED_INPUTS':
      return (
        <span className={`${base} bg-amber-50 text-amber-900 border-amber-300`}>
          <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
          <span>{label}</span>
        </span>
      );
    case 'UNVERIFIED_INPUTS':
      return (
        <span className={`${base} bg-orange-50 text-orange-900 border-orange-300`}>
          <AlertTriangle className="w-3 h-3 text-orange-700 shrink-0" />
          <span>{label}</span>
        </span>
      );
    case 'INCOMPLETE_INPUTS':
    default:
      return (
        <span className={`${base} bg-slate-100 text-slate-700 border-slate-300`}>
          <HelpCircle className="w-3 h-3 text-slate-600 shrink-0" />
          <span>{label}</span>
        </span>
      );
  }
}
