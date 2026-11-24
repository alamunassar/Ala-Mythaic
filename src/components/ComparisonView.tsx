import { AlertTriangle, ArrowRight, Info } from 'lucide-react';
import {
  buildMissingDataReport,
  comparePromisedVsInstalled,
  computeAuditSummary,
  projectContainsSimulatedData,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
import type { AppSection, SolarProject } from '../types/mithaq';
import { StatusIndicator } from './StatusBadge';

interface ComparisonViewProps {
  project: SolarProject;
  onNavigate: (section: AppSection) => void;
}

export function ComparisonView({ project, onNavigate }: ComparisonViewProps) {
  const comparisons = comparePromisedVsInstalled(project);
  const checks = runEngineeringValidation(project);
  const summary = computeAuditSummary(comparisons, checks);
  const missingReport = buildMissingDataReport(project, comparisons, checks);
  const hasSimulated = projectContainsSimulatedData(project);

  return (
    <div className="space-y-6">
      {hasSimulated && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">DEMONSTRATION / SIMULATED DATA PRESENT:</span> One or
            more equipment records in this comparison contain simulated or prototype data and are
            not verified real equipment.
          </span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Step 4 — Promised vs. Installed Equipment Comparison
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Objective parameter-by-parameter comparison between contractual quotation promises and
              observed site nameplates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('validation')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Engineering Validation
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4 text-xs">
          <div>
            <div className="text-slate-500">Equipment Spec Match %</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {summary.equipmentMatchPct !== null ? `${summary.equipmentMatchPct}%` : 'N/A'}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              {summary.eligibleCategories > 0
                ? `${summary.matchedParameters}/${summary.totalComparedParameters} eligible parameters across ${summary.eligibleCategories} eligible category(s)`
                : 'No eligible promised-vs-installed comparison items'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">{summary.equipmentMatchFormula}</div>
          </div>

          <div>
            <div className="text-slate-500">Eligible Parameter Breakdown</div>
            <div className="font-mono tabular-nums text-slate-900 font-semibold mt-1">
              {summary.matchedParameters} Matching · {summary.mismatchedParameters} Mismatching
            </div>
            <div className="font-mono tabular-nums text-slate-600 mt-0.5">
              {summary.warningParameters} Warning · {summary.notVerifiedParameters} Insufficient Data
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Categories: {summary.confirmedMatches} Match · {summary.discrepancies} Mismatch ·{' '}
              {summary.warnings} Warning
            </div>
          </div>

          <div>
            <div className="text-slate-500">Excluded Coverage Gaps</div>
            <div className="mt-1 space-y-1 text-slate-700">
              <div>
                <span className="font-semibold">Installed, absent from quotation:</span>{' '}
                {summary.unquotedInstalledCategories.length > 0
                  ? summary.unquotedInstalledCategories.join(', ')
                  : 'None'}
              </div>
              <div>
                <span className="font-semibold">Promised, not documented installed:</span>{' '}
                {summary.missingInstalledCategories.length > 0
                  ? summary.missingInstalledCategories.join(', ')
                  : 'None'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700 flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            Equipment discrepancies highlight differences between contractual documentation and
            installed equipment nameplates for engineering review. Missing parameters are reported
            separately from discrepancies and never counted as matches. Discrepancies alone do not
            establish supplier fraud.
          </span>
        </div>
      </div>

      {comparisons.map((comp) => (
        <div
          key={comp.category}
          className="bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">{comp.label}</h3>
                {comp.eligibility !== 'ELIGIBLE' && (
                  <span className="text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    Excluded from Match % ({comp.eligibility})
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Promised: <span className="text-slate-800 font-medium">{comp.promisedSummary}</span>{' '}
                · Installed:{' '}
                <span className="text-slate-800 font-medium">{comp.installedSummary}</span>
              </div>
            </div>
            <StatusIndicator status={comp.status} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Compared Specification</th>
                  <th className="py-2.5 px-4">Promised (Quotation)</th>
                  <th className="py-2.5 px-4">Observed (Installed Nameplate)</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {comp.differences.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-5 px-4 text-center text-slate-500">
                      No quotation or nameplate records entered for this category.
                    </td>
                  </tr>
                ) : (
                  comp.differences.map((diff, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {diff.field}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                        {diff.promised}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                        {diff.installed}
                      </td>
                      <td className="py-3 px-4">
                        <StatusIndicator status={diff.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-600">{diff.note}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {comp.missingFields.length > 0 && (
            <div className="px-6 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-900">
              <span className="font-semibold">Missing / Unverified Information:</span>{' '}
              {comp.missingFields.join(' · ')}
            </div>
          )}
        </div>
      ))}

      {(missingReport.recordGaps.unquotedInstalled.length > 0 ||
        missingReport.recordGaps.missingInstalled.length > 0 ||
        missingReport.missingParameters.length > 0 ||
        missingReport.blockedChecks.length > 0) && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-slate-900">
            Structured Missing Data Summary (Separated from Discrepancies)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
              <div className="font-semibold text-slate-800">A. Equipment Record Gaps</div>
              {missingReport.recordGaps.unquotedInstalled.length === 0 &&
              missingReport.recordGaps.missingInstalled.length === 0 &&
              missingReport.recordGaps.unverifiedAiRecords.length === 0 ? (
                <div className="text-slate-500">No record coverage gaps.</div>
              ) : (
                <ul className="space-y-1 text-slate-700 list-disc pl-4">
                  {missingReport.recordGaps.unquotedInstalled.map((g, i) => (
                    <li key={`uq-${i}`}>Installed without quotation: {g}</li>
                  ))}
                  {missingReport.recordGaps.missingInstalled.map((g, i) => (
                    <li key={`mi-${i}`}>Promised, not documented: {g}</li>
                  ))}
                  {missingReport.recordGaps.unverifiedAiRecords.map((g, i) => (
                    <li key={`uv-${i}`}>Unverified record: {g}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
              <div className="font-semibold text-slate-800">
                B. Missing Technical Parameters ({missingReport.missingParameters.length})
              </div>
              {missingReport.missingParameters.length === 0 ? (
                <div className="text-slate-500">All required technical parameters present.</div>
              ) : (
                <ul className="space-y-1.5 text-slate-700 list-disc pl-4">
                  {missingReport.missingParameters.map((mp) => (
                    <li key={mp.key}>
                      <span className="font-medium text-slate-900">{mp.parameter}</span>
                      {mp.blockedChecks.length > 0 && (
                        <div className="text-[11px] text-amber-800">
                          Blocks: {mp.blockedChecks.join('; ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
              <div className="font-semibold text-slate-800">
                C. Engineering Checks Blocked ({missingReport.blockedChecks.length})
              </div>
              {missingReport.blockedChecks.length === 0 ? (
                <div className="text-slate-500">No engineering checks blocked.</div>
              ) : (
                <ul className="space-y-1.5 text-slate-700 list-disc pl-4">
                  {missingReport.blockedChecks.map((bc) => (
                    <li key={bc.checkId}>
                      <span className="font-medium text-slate-900">{bc.title}</span>
                      <div className="text-[11px] text-slate-600">
                        Needs: {bc.missingInputs.join(', ')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
