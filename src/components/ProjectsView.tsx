import React, { useState } from 'react';
import { FolderPlus, Play, RotateCcw, Trash2, ArrowRight } from 'lucide-react';
import { DEMO_SCENARIOS, type DemoScenarioId } from '../data/demoProject';
import {
  comparePromisedVsInstalled,
  computeAuditSummary,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
import { useI18n } from '../i18n/I18nContext';
import { fmt } from '../i18n/translations';
import type { AppSection, SolarProject, SystemType } from '../types/mithaq';
import { generateProjectId } from '../utils/storage';
import { StatusIndicator } from './StatusBadge';

interface ProjectsViewProps {
  projects: SolarProject[];
  activeProjectId: string;
  onSelectProject: (id: string, navigateTo?: AppSection) => void;
  onCreateProject: (project: SolarProject) => void;
  onDeleteProject: (id: string) => void;
  onResetDemo: () => void;
  onLoadScenario: (scenarioId: DemoScenarioId) => void;
}

export function ProjectsView({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onResetDemo,
  onLoadScenario,
}: ProjectsViewProps) {
  const { lang, tr } = useI18n();
  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const [installationDate, setInstallationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [systemType, setSystemType] = useState<SystemType>('Hybrid (PV + Battery)');
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !location.trim() || !installationDate) {
      setFormError(tr.projects.validationRequiredError);
      return;
    }
    setFormError(null);
    const now = new Date().toISOString();
    const newProject: SolarProject = {
      id: generateProjectId(),
      customerName: customerName.trim(),
      location: location.trim(),
      installationDate,
      systemType,
      createdAt: now,
      updatedAt: now,
      isDemo: false,
      promisedEquipment: [],
      installedEquipment: [],
      arrayConfig: {
        modulesPerString: null,
        parallelStrings: null,
        minAmbientTempC: null,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
      fieldMeasurements: [],
    };
    onCreateProject(newProject);
    setCustomerName('');
    setLocation('');
  };

  return (
    <div className="space-y-6">
      {/* Create New Solar Audit Project */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{tr.projects.stepTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{tr.projects.stepSubtitle}</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="pt-4 space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2 rounded-md">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {tr.projects.customerLabel}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={tr.projects.customerPlaceholder}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {tr.projects.locationLabel}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={tr.projects.locationPlaceholder}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {tr.projects.dateLabel}
              </label>
              <input
                type="date"
                dir="ltr"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {tr.projects.systemTypeLabel}
              </label>
              <select
                value={systemType}
                onChange={(e) => setSystemType(e.target.value as SystemType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Hybrid (PV + Battery)">
                  {tr.systemTypes['Hybrid (PV + Battery)']}
                </option>
                <option value="Grid-Tied">{tr.systemTypes['Grid-Tied']}</option>
                <option value="Off-Grid">{tr.systemTypes['Off-Grid']}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              {tr.projects.createBtn}
            </button>
          </div>
        </form>
      </div>

      {/* Demonstration Scenarios (SIMULATED) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                {tr.scenarios.sectionTitle}
              </h3>
              <span
                dir="ltr"
                className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-amber-100 text-amber-900 border border-amber-300"
              >
                {tr.common.simBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{tr.scenarios.sectionSubtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_SCENARIOS.map((scenario) => {
            const exists = projects.some((p) => p.id === scenario.projectId && p.isDemo);
            const isCurrent = activeProjectId === scenario.projectId;
            const scText = tr.scenarios.items[scenario.id];
            return (
              <div
                key={scenario.id}
                className={`border rounded-lg p-4 flex flex-col justify-between gap-3 ${
                  isCurrent ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span dir="ltr" className="font-mono text-[11px] font-semibold text-slate-500">
                      {scenario.projectId}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                      {scText.expectedBadge}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{scText.title}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{scText.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onLoadScenario(scenario.id)}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                    isCurrent
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {exists ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {exists ? tr.scenarios.resetOpenBtn : tr.scenarios.loadBtn}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Existing Projects Register */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {fmt(tr.projects.registerTitle, { count: projects.length })}
            </h3>
            <p className="text-xs text-slate-500">{tr.projects.registerSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onResetDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {tr.projects.restoreDemoBtn}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">{tr.projects.colProjectId}</th>
                <th className="py-3 px-4">{tr.projects.colCustomerLocation}</th>
                <th className="py-3 px-4">{tr.projects.colTopology}</th>
                <th className="py-3 px-4">{tr.projects.colDate}</th>
                <th className="py-3 px-4">{tr.projects.colAuditStatus}</th>
                <th className="py-3 px-4 text-end">{tr.projects.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {projects.map((p) => {
                const comps = comparePromisedVsInstalled(p, lang);
                const chks = runEngineeringValidation(p, lang);
                const sum = computeAuditSummary(comps, chks);
                const isActive = p.id === activeProjectId;

                return (
                  <tr key={p.id} className={isActive ? 'bg-slate-50' : 'hover:bg-slate-50/70'}>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                      <span dir="ltr">{p.id}</span>
                      {p.isDemo && (
                        <div className="text-[11px] font-sans font-medium text-amber-700 mt-0.5">
                          {tr.projects.simulatedDemoBadge}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{p.customerName}</div>
                      <div className="text-xs text-slate-500">{p.location}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {tr.systemTypes[p.systemType]}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      <span dir="ltr">{p.installationDate}</span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={sum.overallStatus} />
                    </td>
                    <td className="py-3 px-4 text-end whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectProject(p.id, 'dashboard')}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                            isActive
                              ? 'bg-slate-900 text-white'
                              : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isActive ? tr.common.active : tr.common.open}
                          <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteProject(p.id)}
                            className="p-1.5 text-slate-500 hover:text-red-700 rounded hover:bg-red-50"
                            aria-label={fmt(tr.projects.deleteProjectAria, { id: p.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
