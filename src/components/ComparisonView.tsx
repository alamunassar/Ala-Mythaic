import { AlertTriangle, ArrowRight, Info } from 'lucide-react';
import {
  buildMissingDataReport,
  comparePromisedVsInstalled,
  computeAuditSummary,
  projectContainsSimulatedData,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
import { useI18n } from '../i18n/I18nContext';
import { fmt } from '../i18n/translations';
import type { AppSection, SolarProject } from '../types/mithaq';
import { StatusIndicator } from './StatusBadge';

interface ComparisonViewProps {
  project: SolarProject;
  onNavigate: (section: AppSection) => void;
}

export function ComparisonView({ project, onNavigate }: ComparisonViewProps) {
  const { lang, tr: t } = useI18n();
  const comparisons = comparePromisedVsInstalled(project, lang);
  const checks = runEngineeringValidation(project, lang);
  const summary = computeAuditSummary(comparisons, checks, lang);
  const missingReport = buildMissingDataReport(project, comparisons, checks, lang);
  const hasSimulated = projectContainsSimulatedData(project);

  return (
    <div className="space-y-6">
      {hasSimulated && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">{t.common.simDataBannerTitle}</span>{' '}
            {fmt(t.common.simDataBannerBody, { customer: project.customerName })}
          </span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t.comparison.stepTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.comparison.stepSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('validation')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            {t.comparison.engValidationBtn}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4 text-xs">
          <div>
            <div className="text-slate-500">{t.comparison.specMatchTitle}</div>
            <div dir="ltr" className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5 w-fit">
              {summary.equipmentMatchPct !== null ? `${summary.equipmentMatchPct}%` : 'N/A'}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              {summary.eligibleCategories > 0
                ? fmt(t.comparison.eligibleSummary, {
                    matched: summary.matchedParameters,
                    total: summary.totalComparedParameters,
                    cats: summary.eligibleCategories,
                  })
                : t.comparison.noEligibleSummary}
            </div>
            <div dir="ltr" className="text-[10px] text-slate-500 mt-1 w-fit">
              {summary.equipmentMatchFormula}
            </div>
          </div>

          <div>
            <div className="text-slate-500">{t.comparison.paramBreakdownTitle}</div>
            <div className="font-mono tabular-nums text-slate-900 font-semibold mt-1">
              {fmt(t.comparison.paramLine1, {
                matched: summary.matchedParameters,
                mismatched: summary.mismatchedParameters,
              })}
            </div>
            <div className="font-mono tabular-nums text-slate-600 mt-0.5">
              {fmt(t.comparison.paramLine2, {
                warning: summary.warningParameters,
                insufficient: summary.notVerifiedParameters,
              })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {fmt(t.comparison.categoriesLine, {
                matches: summary.confirmedMatches,
                discrepancies: summary.discrepancies,
                warnings: summary.warnings,
              })}
            </div>
          </div>

          <div>
            <div className="text-slate-500">{t.comparison.excludedGapsTitle}</div>
            <div className="mt-1 space-y-1 text-slate-700">
              <div>
                <span className="font-semibold">{t.comparison.installedNoQuote}</span>{' '}
                {summary.unquotedInstalledCategories.length > 0
                  ? summary.unquotedInstalledCategories.join(' · ')
                  : t.common.none}
              </div>
              <div>
                <span className="font-semibold">{t.comparison.promisedNotInstalled}</span>{' '}
                {summary.missingInstalledCategories.length > 0
                  ? summary.missingInstalledCategories.join(' · ')
                  : t.common.none}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700 flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>{t.comparison.neutralityNotice}</span>
        </div>
      </div>

      {comparisons.map((comp) => (
        <div
          key={comp.category}
          className="bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">{comp.label}</h3>
                {comp.eligibility !== 'ELIGIBLE' && (
                  <span className="text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    {fmt(t.comparison.excludedBadge, { eligibility: comp.eligibility })}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {t.comparison.promisedLabel}{' '}
                <span className="text-slate-800 font-medium">{comp.promisedSummary}</span> ·{' '}
                {t.comparison.installedLabel}{' '}
                <span className="text-slate-800 font-medium">{comp.installedSummary}</span>
              </div>
            </div>
            <StatusIndicator status={comp.status} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4 text-start">{t.comparison.colComparedSpec}</th>
                  <th className="py-2.5 px-4 text-start">{t.comparison.colPromised}</th>
                  <th className="py-2.5 px-4 text-start">{t.comparison.colObserved}</th>
                  <th className="py-2.5 px-4 text-start">{t.comparison.colStatus}</th>
                  <th className="py-2.5 px-4 text-start">{t.comparison.colAuditNote}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {comp.differences.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-5 px-4 text-center text-slate-500">
                      {t.comparison.emptyCategoryRow}
                    </td>
                  </tr>
                ) : (
                  comp.differences.map((diff, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {diff.field}
                      </td>
                      <td dir="ltr" className="py-3 px-4 font-mono tabular-nums text-slate-800 text-start">
                        {diff.promised}
                      </td>
                      <td dir="ltr" className="py-3 px-4 font-mono tabular-nums text-slate-800 text-start">
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
              <span className="font-semibold">{t.comparison.missingUnverifiedPrefix}</span>{' '}
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
            {t.comparison.structuredMissingTitle}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
              <div className="font-semibold text-slate-800">{t.comparison.sectionATitle}</div>
              {missingReport.recordGaps.unquotedInstalled.length === 0 &&
              missingReport.recordGaps.missingInstalled.length === 0 &&
              missingReport.recordGaps.unverifiedAiRecords.length === 0 ? (
                <div className="text-slate-500">{t.comparison.sectionAEmpty}</div>
              ) : (
                <ul className="space-y-1 text-slate-700 list-disc ps-4">
                  {missingReport.recordGaps.unquotedInstalled.map((g, i) => (
                    <li key={`uq-${i}`}>{fmt(t.comparison.installedWithoutQuoteItem, { item: g })}</li>
                  ))}
                  {missingReport.recordGaps.missingInstalled.map((g, i) => (
                    <li key={`mi-${i}`}>{fmt(t.comparison.promisedNotDocItem, { item: g })}</li>
                  ))}
                  {missingReport.recordGaps.unverifiedAiRecords.map((g, i) => (
                    <li key={`uv-${i}`}>{fmt(t.comparison.unverifiedRecordItem, { item: g })}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
              <div className="font-semibold text-slate-800">
                {fmt(t.comparison.sectionBTitle, {
                  count: missingReport.missingParameters.length,
                })}
              </div>
              {missingReport.missingParameters.length === 0 ? (
                <div className="text-slate-500">{t.comparison.sectionBEmpty}</div>
              ) : (
                <ul className="space-y-1.5 text-slate-700 list-disc ps-4">
                  {missingReport.missingParameters.map((mp) => (
                    <li key={mp.key}>
                      <span className="font-medium text-slate-900">{mp.parameter}</span>
                      {mp.blockedChecks.length > 0 && (
                        <div className="text-[11px] text-amber-800">
                          {t.comparison.blocksPrefix} {mp.blockedChecks.join('؛ ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5">
              <div className="font-semibold text-slate-800">
                {fmt(t.comparison.sectionCTitle, {
                  count: missingReport.blockedChecks.length,
                })}
              </div>
              {missingReport.blockedChecks.length === 0 ? (
                <div className="text-slate-500">{t.comparison.sectionCEmpty}</div>
              ) : (
                <ul className="space-y-1.5 text-slate-700 list-disc ps-4">
                  {missingReport.blockedChecks.map((bc) => (
                    <li key={bc.checkId}>
                      <span className="font-medium text-slate-900">{bc.title}</span>
                      <div className="text-[11px] text-slate-600">
                        {t.comparison.needsPrefix} {bc.missingInputs.join(', ')}
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
