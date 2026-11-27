import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, FileText, RotateCcw, Upload, AlertCircle } from 'lucide-react';
import {
  comparePromisedVsInstalled,
  computeAuditSummary,
  projectContainsSimulatedData,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
import { useI18n } from '../i18n/I18nContext';
import { fmt } from '../i18n/translations';
import type { SolarProject } from '../types/mithaq';
import { safeFetchJson } from '../utils/api';
import { downloadProjectPdfReport } from '../utils/pdfReport';
import { StatusIndicator } from './StatusBadge';

export function ReportsView({ project }: { project: SolarProject }) {
  const { lang, tr: t } = useI18n();
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const comparisons = comparePromisedVsInstalled(project, lang);
  const checks = runEngineeringValidation(project, lang);
  const summary = computeAuditSummary(comparisons, checks, lang);
  const hasSimulated = projectContainsSimulatedData(project);

  const handleGenerate = () => {
    const id = downloadProjectPdfReport(project, lang);
    setLastReportId(id);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t.reports.stepTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.reports.stepSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            {t.reports.downloadBtn}
          </button>
        </div>

        {lastReportId && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-4 py-3 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              {fmt(t.reports.downloadedSuccess, {
                reportId: lastReportId,
                projectId: project.id,
              })}
            </span>
          </div>
        )}

        {/* Report Dossier Preview */}
        <div className="mt-6 border border-slate-200 rounded-lg p-6 bg-slate-50 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-500">{t.reports.previewLabel}</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {project.customerName}{' '}
                <span dir="ltr" className="font-mono text-base font-semibold">
                  ({project.id})
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {project.location} · {t.systemTypes[project.systemType] ?? project.systemType} ·{' '}
                {t.dashboard.installedPrefix}{' '}
                <span dir="ltr" className="font-mono">
                  {project.installationDate}
                </span>
              </div>
            </div>
            <StatusIndicator status={summary.overallStatus} />
          </div>

          {hasSimulated && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded font-medium">
              {t.reports.simBanner}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white border border-slate-200 rounded p-4 space-y-2">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                {t.reports.sectionsTitle}
              </div>
              <ul className="space-y-1 text-slate-600">
                {t.reports.sectionsList.map((sec, idx) => (
                  <li key={idx}>{sec}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded p-4 space-y-2">
              <div className="font-semibold text-slate-900">{t.reports.snapshotTitle}</div>
              <div className="grid grid-cols-2 gap-y-1.5 font-mono tabular-nums text-slate-700">
                <span className="font-sans">{t.reports.snapMatchPct}</span>
                <span dir="ltr" className="font-semibold text-end">
                  {summary.equipmentMatchPct !== null
                    ? `${summary.equipmentMatchPct}% (${summary.matchedParameters}/${summary.totalComparedParameters})`
                    : 'N/A'}
                </span>
                <span className="font-sans">{t.reports.snapEligibleCats}</span>
                <span dir="ltr" className="font-semibold text-end">
                  {summary.eligibleCategories}
                </span>
                <span className="font-sans">{t.reports.snapMatchedParams}</span>
                <span dir="ltr" className="font-semibold text-end text-emerald-700">
                  {summary.matchedParameters}
                </span>
                <span className="font-sans">{t.reports.snapMismatchedParams}</span>
                <span dir="ltr" className="font-semibold text-end text-red-700">
                  {summary.mismatchedParameters}
                </span>
                <span className="font-sans">{t.reports.snapWarnInsuffParams}</span>
                <span dir="ltr" className="font-semibold text-end">
                  {summary.warningParameters} / {summary.notVerifiedParameters}
                </span>
                <span className="font-sans">{t.reports.snapUnquotedUndocCats}</span>
                <span dir="ltr" className="font-semibold text-end">
                  {summary.unquotedInstalledCategories.length} /{' '}
                  {summary.missingInstalledCategories.length}
                </span>
                <span className="font-sans">{t.reports.snapCatDiscrepancies}</span>
                <span dir="ltr" className="font-semibold text-end">
                  {summary.discrepancies}
                </span>
                <span className="font-sans">{t.reports.snapPassedChecks}</span>
                <span dir="ltr" className="font-semibold text-end">
                  {summary.passedChecks} ({summary.verifiedPassChecks}V / {summary.simulatedPassChecks}S /{' '}
                  {summary.unverifiedPassChecks}U)
                </span>
                <span className="font-sans">{t.reports.snapFailedChecks}</span>
                <span dir="ltr" className="font-semibold text-end text-red-700">
                  {summary.failedChecks}
                </span>
                <span className="font-sans">{t.reports.snapInsufficientChecks}</span>
                <span dir="ltr" className="font-semibold text-end">
                  {summary.insufficientDataChecks}
                </span>
                <span className="font-sans">{t.reports.snapFieldMeas}</span>
                <span dir="ltr" className="font-semibold text-end">
                  {project.fieldMeasurements.length}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                {t.reports.formulaPrefix}{' '}
                <span dir="ltr" className="inline-block font-mono">
                  {summary.equipmentMatchFormula}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingsViewProps {
  projects: SolarProject[];
  onImportProjects: (imported: SolarProject[]) => void;
  onResetDemo: () => void;
}

export function SettingsView({
  projects,
  onImportProjects,
  onResetDemo,
}: SettingsViewProps) {
  const { tr: t } = useI18n();
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    safeFetchJson<{ aiConfigured?: boolean }>('/api/health').then((r) => {
      setAiConfigured(Boolean(r.ok && r.data?.aiConfigured));
    });
  }, []);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MITHAQ_Lab_Projects_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(t.settings.exportedMsg);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '[]'));
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          onImportProjects(parsed as SolarProject[]);
          setStatusMessage(fmt(t.settings.importedMsg, { count: parsed.length }));
        } else {
          setStatusMessage(t.settings.invalidBackupMsg);
        }
      } catch {
        setStatusMessage(t.settings.parseFailMsg);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{t.settings.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.settings.subtitle}</p>
        </div>

        {statusMessage && (
          <div className="bg-slate-100 border border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-md">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-200 rounded-md p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">{t.settings.aiCardTitle}</div>
            <div className="flex items-center gap-2 text-xs">
              {aiConfigured === null ? (
                <span className="text-slate-500">{t.settings.checkingServer}</span>
              ) : aiConfigured ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {t.settings.aiActive}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-800 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {t.settings.aiInactive}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{t.settings.aiOfflineNote}</p>
          </div>

          <div className="border border-slate-200 rounded-md p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900">{t.settings.backupCardTitle}</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5" />
                {t.settings.exportJsonBtn}
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {t.settings.importJsonBtn}
                <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
              </label>

              <button
                type="button"
                onClick={() => {
                  onResetDemo();
                  setStatusMessage(t.settings.demoRestoredMsg);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t.settings.restoreDemoBtn}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">{t.settings.governanceTitle}</span>{' '}
          {t.settings.governanceBody}
        </div>
      </div>
    </div>
  );
}
