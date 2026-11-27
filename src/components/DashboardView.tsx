import { useState } from 'react';
import { ArrowRight, Download, FileText, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import {
  comparePromisedVsInstalled,
  computeAuditSummary,
  projectContainsSimulatedData,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
import { useI18n } from '../i18n/I18nContext';
import { fmt } from '../i18n/translations';
import type { AppSection, SolarProject } from '../types/mithaq';
import { safeFetchJson } from '../utils/api';
import { localizeDemoCustomerName, localizeDemoLocation } from '../utils/demoLocalization';
import { downloadProjectPdfReport } from '../utils/pdfReport';
import { InputConfidenceBadge, StatusIndicator } from './StatusBadge';

interface DashboardViewProps {
  project: SolarProject;
  onNavigate: (section: AppSection) => void;
  onUpdateProject: (updated: SolarProject) => void;
}

export function DashboardView({
  project,
  onNavigate,
  onUpdateProject,
}: DashboardViewProps) {
  const { lang, tr: t } = useI18n();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const comparisons = comparePromisedVsInstalled(project, lang);
  const checks = runEngineeringValidation(project, lang);
  const summary = computeAuditSummary(comparisons, checks, lang);

  const vocStcCheck = checks.find((c) => c.id === 'check-pv-voc-stc');
  const mpptCheck = checks.find((c) => c.id === 'check-mppt-window');
  const currentCheck =
    checks.find((c) => c.id === 'check-pv-shortcircuit-current' && c.status === 'FAIL') ??
    checks.find((c) => c.id === 'check-pv-operating-current' && c.status === 'FAIL') ??
    checks.find((c) => c.id === 'check-pv-shortcircuit-current');
  const installedInverter = project.installedEquipment.find((e) => e.category === 'INVERTER');

  const handleGenerateAiCommentary = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await safeFetchJson<{ commentary?: string }>('/api/ai/explain-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          projectSummary: {
            projectId: project.id,
            systemType: project.systemType,
            overallStatus: summary.overallStatus,
            equipmentMatchPct: summary.equipmentMatchPct,
            comparisons: comparisons.map((c) => ({
              category: c.label,
              status: c.status,
              differences: c.differences,
              missingFields: c.missingFields,
            })),
            engineeringChecks: checks.map((ck) => ({
              title: ck.title,
              status: ck.status,
              inputConfidence: ck.inputConfidence,
              qualifiedResult: ck.qualifiedResult,
              calculatedValue: ck.calculatedValue,
              unit: ck.calculatedUnit,
              limit: ck.limitValue,
              missingInputs: ck.missingInputs,
              explanation: ck.explanation,
            })),
          },
        }),
      });
      if (!result.ok || !result.data) {
        setAiError(result.error ?? t.dashboard.aiServerError);
        return;
      }
      onUpdateProject({
        ...project,
        aiAuditCommentary: result.data.commentary ?? '',
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setAiError(t.dashboard.aiNetworkError);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    const rptId = downloadProjectPdfReport(project, lang);
    setPdfNotice(fmt(t.dashboard.pdfGeneratedNotice, { reportId: rptId }));
  };

  const maxV = installedInverter?.maxPvInputVoltageV ?? 600;
  const mpptMin = installedInverter?.mpptMinV ?? null;
  const mpptMax = installedInverter?.mpptMaxV ?? null;
  const vocVal = vocStcCheck?.calculatedValue ?? null;
  const vmpVal = mpptCheck?.calculatedValue ?? null;

  const hasSimulated = projectContainsSimulatedData(project);
  const simulatedMeasCount = project.fieldMeasurements.filter((m) => m.isSimulated).length;
  const manualMeasCount = project.fieldMeasurements.length - simulatedMeasCount;
  const excludedCount =
    summary.unquotedInstalledCategories.length + summary.missingInstalledCategories.length;

  return (
    <div className="space-y-6">
      {hasSimulated && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                {project.isDemo ? t.common.simDataBannerDemoTitle : t.common.simDataBannerTitle}
              </span>{' '}
              {fmt(t.common.simDataBannerBody, {
                customer: localizeDemoCustomerName(project.customerName, lang),
              })}
            </div>
          </div>
          {project.isDemo && (
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs font-semibold text-amber-900 underline hover:text-amber-700 whitespace-nowrap shrink-0"
            >
              {t.common.createRealProject}
            </button>
          )}
        </div>
      )}

      {/* Hero Summary Row */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
              <span dir="ltr" className="font-mono font-medium text-slate-700">
                {project.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>{localizeDemoLocation(project.location, lang)}</span>
              <span aria-hidden="true">·</span>
              <span>{t.systemTypes[project.systemType] ?? project.systemType}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {t.dashboard.installedPrefix}{' '}
                <span dir="ltr" className="font-mono">
                  {project.installationDate}
                </span>
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {localizeDemoCustomerName(project.customerName, lang)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusIndicator status={summary.overallStatus} />
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {t.dashboard.exportPdfReport}
            </button>
          </div>
        </div>

        {pdfNotice && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-3 py-2 rounded-md">
            {pdfNotice}
          </div>
        )}

        {/* 4-column Audit KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 pt-5">
          <div>
            <div className="text-xs font-medium text-slate-500">{t.dashboard.kpiSpecMatchTitle}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span dir="ltr" className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                {summary.equipmentMatchPct !== null ? `${summary.equipmentMatchPct}%` : t.common.na}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                {summary.eligibleCategories > 0
                  ? fmt(t.dashboard.kpiSpecMatchSub, {
                      matched: summary.matchedParameters,
                      total: summary.totalComparedParameters,
                      cats: summary.eligibleCategories,
                    })
                  : t.dashboard.kpiSpecMatchZero}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
              {fmt(t.dashboard.kpiSpecMatchBreakdown, {
                mismatched: summary.mismatchedParameters,
                warning: summary.warningParameters,
                insufficient: summary.notVerifiedParameters,
              })}
              {excludedCount > 0 && fmt(t.dashboard.kpiExcludedSuffix, { count: excludedCount })}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">
              {t.dashboard.kpiDiscrepanciesTitle}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                dir="ltr"
                className={`text-3xl font-bold font-mono tabular-nums ${
                  summary.discrepancies > 0 ? 'text-red-700' : 'text-slate-900'
                }`}
              >
                {summary.discrepancies}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                {t.dashboard.kpiDiscrepanciesCategorySub}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
              {fmt(t.dashboard.kpiDiscrepanciesCategoryLine, {
                matches: summary.confirmedMatches,
                warnings: summary.warnings,
                notVerified: summary.notVerifiedCount,
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">{t.dashboard.kpiEngChecksTitle}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span dir="ltr" className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                {summary.passedChecks}/{checks.length}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                {fmt(t.dashboard.kpiEngChecksBreakdown, {
                  passed: summary.passedChecks,
                  warning: summary.warningChecks,
                  failed: summary.failedChecks,
                  insufficient: summary.insufficientDataChecks,
                })}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
              {fmt(t.dashboard.kpiEngChecksPassConfidence, {
                verified: summary.verifiedPassChecks,
                simulated: summary.simulatedPassChecks,
                unverified: summary.unverifiedPassChecks,
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500">{t.dashboard.kpiFieldMeasTitle}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span dir="ltr" className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                {project.fieldMeasurements.length}
              </span>
              <span className="text-xs text-slate-500">{t.dashboard.kpiFieldMeasManual}</span>
            </div>
            {project.fieldMeasurements.length > 0 && (
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                {fmt(t.dashboard.kpiFieldMeasBreakdown, {
                  manual: manualMeasCount,
                  simulated: simulatedMeasCount,
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Split: Equipment Comparison Summary & Engineering Envelope Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                {t.dashboard.compSummaryTitle}
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('comparison')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                {t.dashboard.fullMatrix}
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {comparisons.map((comp) => (
                <div key={comp.category} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-sm font-semibold text-slate-900">{comp.label}</span>
                    <StatusIndicator status={comp.status} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">{t.dashboard.promisedLabel}: </span>
                      <span className="text-slate-800 font-medium">{comp.promisedSummary}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t.dashboard.installedLabel}: </span>
                      <span className="text-slate-800 font-medium">{comp.installedSummary}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{t.dashboard.editInInspection}</span>
            <button
              type="button"
              onClick={() => onNavigate('new-inspection')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {t.dashboard.openInspection}
            </button>
          </div>
        </div>

        {/* Engineering Envelope Diagram */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                {t.dashboard.envelopeTitle}
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('validation')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                {t.dashboard.allCalculations}
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>

            {/* Clean Voltage Gauge (physical scale always LTR) */}
            <div className="mb-5">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600 mb-2">
                <span>{t.dashboard.voltageProfileLabel}</span>
                <span dir="ltr" className="font-mono tabular-nums">
                  {installedInverter?.maxPvInputVoltageV
                    ? fmt(t.dashboard.vdcMaxLabel, { val: installedInverter.maxPvInputVoltageV })
                    : t.dashboard.vdcMaxMissing}
                </span>
              </div>
              <div dir="ltr">
                <div className="w-full h-9 bg-slate-100 rounded border border-slate-200 relative overflow-hidden">
                  {mpptMin !== null && mpptMax !== null && maxV > 0 && (
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-100 border-x border-emerald-400"
                      style={{
                        left: `${Math.min(100, Math.max(0, (mpptMin / maxV) * 100))}%`,
                        width: `${Math.min(100, Math.max(2, ((mpptMax - mpptMin) / maxV) * 100))}%`,
                      }}
                      title={`MPPT Range: ${mpptMin}–${mpptMax} V`}
                    />
                  )}
                  {vmpVal !== null && maxV > 0 && (
                    <div
                      className="absolute top-1 bottom-1 w-1 bg-slate-900"
                      style={{ left: `${Math.min(99, Math.max(1, (vmpVal / maxV) * 100))}%` }}
                      title={`String Vmp: ${vmpVal} V`}
                    />
                  )}
                  {vocVal !== null && maxV > 0 && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 ${
                        vocStcCheck?.status === 'FAIL' ? 'bg-red-600' : 'bg-amber-600'
                      }`}
                      style={{ left: `${Math.min(99, Math.max(1, (vocVal / maxV) * 100))}%` }}
                      title={`String Voc (STC): ${vocVal} V`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-slate-500 mt-2 font-mono tabular-nums">
                  <span className="order-1">0 V</span>
                  <span className="order-3 sm:order-2 w-full sm:w-auto text-center">
                    Vmp: {vmpVal !== null ? `${vmpVal} V` : '—'} · Voc(STC):{' '}
                    {vocVal !== null ? `${vocVal} V` : '—'}
                  </span>
                  <span className="order-2 sm:order-3">{maxV} V</span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {checks.slice(0, 5).map((ck) => (
                <div
                  key={ck.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-900 break-words leading-snug">
                      {ck.title}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5 break-words">
                      {ck.calculatedValue !== null
                        ? fmt(t.dashboard.limitPrefix, {
                            val: ck.calculatedValue,
                            unit: ck.calculatedUnit,
                            limit: ck.limitValue,
                          })
                        : fmt(t.dashboard.missingPrefix, { fields: ck.missingInputs.join('، ') })}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <StatusIndicator status={ck.status} />
                    <InputConfidenceBadge confidence={ck.inputConfidence} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-slate-500 leading-relaxed">
              {t.dashboard.envelopeLegend}
            </div>
          </div>

          {currentCheck?.status === 'FAIL' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-900">
              <span className="font-semibold">{t.dashboard.limitExceededAlert}</span>{' '}
              {currentCheck.explanation}
            </div>
          )}
        </div>
      </div>

      {/* AI Audit Commentary (Strictly Traceable Explanation) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t.dashboard.aiSummaryTitle}</h3>
            <p className="text-xs text-slate-500">{t.dashboard.aiSummarySubtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleGenerateAiCommentary}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {aiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {aiLoading ? t.dashboard.aiSummarizingBtn : t.dashboard.aiSummarizeBtn}
          </button>
        </div>

        {aiError && (
          <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-md">
            {aiError}
          </div>
        )}

        {project.aiAuditCommentary ? (
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-200 rounded-md p-4">
            {project.aiAuditCommentary}
          </div>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-2 py-2">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{t.dashboard.aiEmptyHint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
