import React, { useState } from 'react';
import { FolderPlus, RotateCcw, Trash2, ArrowRight } from 'lucide-react';
import {
  comparePromisedVsInstalled,
  computeAuditSummary,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
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
}

export function ProjectsView({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onResetDemo,
}: ProjectsViewProps) {
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
      setFormError('Customer name, project location, and installation date are required.');
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
            <h2 className="text-lg font-semibold text-slate-900">
              Step 1 — Create Solar Verification Project
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign a unique audit ID and initialize customer, location, and topology metadata.
            </p>
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
                Customer / Facility Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Al-Manar Medical Clinic"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Project Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Amman, District 4"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Installation Date
              </label>
              <input
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">System Type</label>
              <select
                value={systemType}
                onChange={(e) => setSystemType(e.target.value as SystemType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Hybrid (PV + Battery)">Hybrid (PV + Battery)</option>
                <option value="Grid-Tied">Grid-Tied</option>
                <option value="Off-Grid">Off-Grid</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Create Project & Start Inspection
            </button>
          </div>
        </form>
      </div>

      {/* Existing Projects Register */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Verification Projects Register ({projects.length})
            </h3>
            <p className="text-xs text-slate-500">
              Persisted locally in your browser across page reloads.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Demo Project
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Project ID</th>
                <th className="py-3 px-4">Customer & Location</th>
                <th className="py-3 px-4">Topology</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Audit Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {projects.map((p) => {
                const comps = comparePromisedVsInstalled(p);
                const chks = runEngineeringValidation(p);
                const sum = computeAuditSummary(comps, chks);
                const isActive = p.id === activeProjectId;

                return (
                  <tr
                    key={p.id}
                    className={isActive ? 'bg-slate-50' : 'hover:bg-slate-50/70'}
                  >
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {p.id}
                      {p.isDemo && (
                        <div className="text-[11px] font-sans font-medium text-amber-700 mt-0.5">
                          Simulated Demo
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{p.customerName}</div>
                      <div className="text-xs text-slate-500">{p.location}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {p.systemType}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {p.installationDate}
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={sum.overallStatus} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
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
                          {isActive ? 'Active' : 'Open'}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteProject(p.id)}
                            className="p-1.5 text-slate-500 hover:text-red-700 rounded hover:bg-red-50"
                            aria-label={`Delete project ${p.id}`}
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
