import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, FileText, RotateCcw, Upload, AlertCircle } from 'lucide-react';
import {
  comparePromisedVsInstalled,
  computeAuditSummary,
  projectContainsSimulatedData,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
import type { SolarProject } from '../types/mithaq';
import { safeFetchJson } from '../utils/api';
import { downloadProjectPdfReport } from '../utils/pdfReport';
import { StatusIndicator } from './StatusBadge';

export function ReportsView({ project }: { project: SolarProject }) {
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const comparisons = comparePromisedVsInstalled(project);
  const checks = runEngineeringValidation(project);
  const summary = computeAuditSummary(comparisons, checks);
  const hasSimulated = projectContainsSimulatedData(project);

  const handleGenerate = () => {
    const id = downloadProjectPdfReport(project);
    setLastReportId(id);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Step 8 — Professional PDF Engineering Audit Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generates a complete downloadable PDF report offline directly in your browser—no AI or
              external service required.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            Download PDF Audit Report
          </button>
        </div>

        {lastReportId && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-4 py-3 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              PDF Report <span className="font-mono font-semibold">{lastReportId}</span> downloaded
              successfully for project <span className="font-mono">{project.id}</span>.
            </span>
          </div>
        )}

        {/* Report Dossier Preview */}
        <div className="mt-6 border border-slate-200 rounded-lg p-6 bg-slate-50 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-500">REPORT DOSSIER PREVIEW</div>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {project.customerName} ({project.id})
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {project.location} · {project.systemType} · Installed {project.installationDate}
              </div>
            </div>
            <StatusIndicator status={summary.overallStatus} />
          </div>

          {hasSimulated && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded font-medium">
              Report Header Stamp: DEMONSTRATION / SIMULATED DATA PRESENT — CONTAINS NON-REAL OR
              PROTOTYPE RECORDS
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white border border-slate-200 rounded p-4 space-y-2">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                Included Report Sections
              </div>
              <ul className="space-y-1 text-slate-600">
                <li>1. Project & Customer Metadata + Unique Report ID</li>
                <li>2. Promised vs. Installed Equipment Comparison Matrix</li>
                <li>3. Equipment Register with Data Provenance Tags</li>
                <li>4. Deterministic Engineering Formulas, Inputs & Results</li>
                <li>5. Technician Manual Field Measurements Log</li>
                <li>6. Separated Discrepancies, Missing Data & Scope Notice</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded p-4 space-y-2">
              <div className="font-semibold text-slate-900">Report Metrics Snapshot</div>
              <div className="grid grid-cols-2 gap-y-1.5 font-mono tabular-nums text-slate-700">
                <span>Equipment Match %:</span>
                <span className="font-semibold text-right">
                  {summary.equipmentMatchPct !== null
                    ? `${summary.equipmentMatchPct}% (${summary.matchedParameters}/${summary.totalComparedParameters})`
                    : 'N/A'}
                </span>
                <span>Eligible Categories:</span>
                <span className="font-semibold text-right">{summary.eligibleCategories}</span>
                <span>Matching Parameters:</span>
                <span className="font-semibold text-right text-emerald-700">
                  {summary.matchedParameters}
                </span>
                <span>Mismatching Parameters:</span>
                <span className="font-semibold text-right text-red-700">
                  {summary.mismatchedParameters}
                </span>
                <span>Warning / Insufficient Data:</span>
                <span className="font-semibold text-right">
                  {summary.warningParameters} / {summary.notVerifiedParameters}
                </span>
                <span>Unquoted / Undocumented Cats:</span>
                <span className="font-semibold text-right">
                  {summary.unquotedInstalledCategories.length} /{' '}
                  {summary.missingInstalledCategories.length}
                </span>
                <span>Passed Eng. Checks (V / S / U):</span>
                <span className="font-semibold text-right">
                  {summary.passedChecks} ({summary.verifiedPassChecks}V / {summary.simulatedPassChecks}S /{' '}
                  {summary.unverifiedPassChecks}U)
                </span>
                <span>Failed Eng. Checks:</span>
                <span className="font-semibold text-right text-red-700">
                  {summary.failedChecks}
                </span>
                <span>Insufficient Data Checks:</span>
                <span className="font-semibold text-right">{summary.insufficientDataChecks}</span>
                <span>Field Measurements:</span>
                <span className="font-semibold text-right">{project.fieldMeasurements.length}</span>
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                Formula: {summary.equipmentMatchFormula}
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
    setStatusMessage('Exported local project archive as JSON.');
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
          setStatusMessage(`Imported ${parsed.length} project(s) into local workspace.`);
        } else {
          setStatusMessage('Invalid MITHAQ-Lab project backup JSON.');
        }
      } catch {
        setStatusMessage('Failed to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Platform Settings & Storage Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage local project archives, demonstration data, and server-side AI extraction
            readiness.
          </p>
        </div>

        {statusMessage && (
          <div className="bg-slate-100 border border-slate-300 text-slate-900 text-xs px-3 py-2 rounded-md">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-200 rounded-md p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900">
              Server-Side Gemini Document & Vision Extraction
            </div>
            <div className="flex items-center gap-2 text-xs">
              {aiConfigured === null ? (
                <span className="text-slate-500">Checking server configuration...</span>
              ) : aiConfigured ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Server Gemini API key active (used for quotation & nameplate extraction)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-800 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  Gemini API key not configured in environment — manual entry & offline calculation
                  remain fully operational
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Comparison logic, deterministic engineering calculations, local storage, and PDF
              report generation operate independently of AI connectivity.
            </p>
          </div>

          <div className="border border-slate-200 rounded-md p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900">
              Local Project Data Backup & Demo Reset
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export Projects JSON
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Import Projects JSON
                <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
              </label>

              <button
                type="button"
                onClick={() => {
                  onResetDemo();
                  setStatusMessage('Simulated demonstration project restored.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Demo Project
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">Engineering Governance Principles:</span>{' '}
          MITHAQ-Lab never invents missing manufacturer specifications, never replaces deterministic
          mathematical formulas with AI estimates, never automatically declares electrical safety, and
          never accuses suppliers of fraud based on equipment discrepancies.
        </div>
      </div>
    </div>
  );
}
