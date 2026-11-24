import { AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  formatInputConfidence,
  projectContainsSimulatedData,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
import type { ArrayConfiguration, SolarProject } from '../types/mithaq';
import { InputConfidenceBadge, StatusIndicator } from './StatusBadge';

interface EngineeringValidationViewProps {
  project: SolarProject;
  onUpdateProject: (updated: SolarProject) => void;
}

function parseNullableInt(val: string): number | null {
  const t = val.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function EngineeringValidationView({
  project,
  onUpdateProject,
}: EngineeringValidationViewProps) {
  const checks = runEngineeringValidation(project);
  const cfg = project.arrayConfig;

  const hasSimulated = projectContainsSimulatedData(project);

  const updateConfig = (patch: Partial<ArrayConfiguration>) => {
    onUpdateProject({
      ...project,
      arrayConfig: {
        ...cfg,
        ...patch,
        provenance: project.isDemo ? 'SIMULATED' : 'MANUAL_ENTRY',
      },
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {hasSimulated && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">DEMONSTRATION / SIMULATED DATA PRESENT:</span> One or
            more inputs in these calculations originate from simulated or prototype records and do
            not represent verified real field equipment.
          </span>
        </div>
      )}
      {/* Array Topology Configuration */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Step 5 — Independent Deterministic Engineering Validation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              All calculations run deterministically in TypeScript using observed nameplate inputs.
              Missing specifications return INSUFFICIENT DATA instead of assumptions.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md shrink-0">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            Deterministic Math Engine
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Modules in Series per String (Ns)
            </label>
            <input
              type="number"
              min="1"
              value={cfg.modulesPerString ?? ''}
              onChange={(e) => updateConfig({ modulesPerString: parseNullableInt(e.target.value) })}
              placeholder="e.g. 8"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Parallel Strings per MPPT / Input (Np)
            </label>
            <input
              type="number"
              min="1"
              value={cfg.parallelStrings ?? ''}
              onChange={(e) => updateConfig({ parallelStrings: parseNullableInt(e.target.value) })}
              placeholder="e.g. 2"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Minimum Site Ambient Temperature (°C)
            </label>
            <input
              type="number"
              step="any"
              value={cfg.minAmbientTempC ?? ''}
              onChange={(e) => updateConfig({ minAmbientTempC: parseNullableInt(e.target.value) })}
              placeholder="e.g. 0 or -5"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Outcome vs. Input Confidence Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-700 space-y-1">
        <div className="font-semibold text-slate-900">
          Legend: Calculation Outcome vs. Input Confidence
        </div>
        <p className="leading-relaxed">
          <span className="font-semibold">Calculation Outcome</span> (PASS, WARNING, FAIL,
          INSUFFICIENT DATA) evaluates mathematical limit compliance deterministically.{' '}
          <span className="font-semibold">Input Confidence</span> (VERIFIED INPUTS, SIMULATED INPUTS,
          UNVERIFIED INPUTS, INCOMPLETE INPUTS) tracks provenance of critical equipment
          specifications used in the check (array configuration entries do not downgrade verified
          equipment). Even <span className="font-mono font-semibold">PASS — VERIFIED INPUTS</span>{' '}
          confirms only rated-limit math and does not certify installation safety or local code
          compliance.
        </p>
      </div>

      {/* Deterministic Check Results */}
      <div className="space-y-4">
        {checks.map((ck) => (
          <div key={ck.id} className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{ck.title}</h3>
                <div className="text-xs font-mono text-slate-600 mt-1">
                  Formula: <span className="text-slate-900 font-medium">{ck.formula}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1.5">
                  Qualified Classification:{' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {ck.qualifiedResult}
                  </span>
                  {ck.status === 'FAIL' && (
                    <span className="text-slate-500">
                      {' '}
                      (Input Confidence: {formatInputConfidence(ck.inputConfidence)})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <StatusIndicator status={ck.status} />
                <InputConfidenceBadge confidence={ck.inputConfidence} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              {/* Traceable Inputs */}
              <div className="lg:col-span-2">
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  Traceable Input Parameters
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-3">Parameter</th>
                        <th className="py-2 px-3">Symbol</th>
                        <th className="py-2 px-3">Value</th>
                        <th className="py-2 px-3">Input Role</th>
                        <th className="py-2 px-3">Data Provenance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {ck.inputs.map((inp) => (
                        <tr key={inp.symbol}>
                          <td className="py-2 px-3 text-slate-800 font-medium">{inp.label}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{inp.symbol}</td>
                          <td className="py-2 px-3 font-mono tabular-nums">
                            {inp.value !== null ? (
                              <span className="text-slate-900 font-semibold">
                                {inp.value} {inp.unit}
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold">MISSING</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            {inp.inputRole === 'EQUIPMENT_SPEC'
                              ? 'Critical Equip. Spec'
                              : 'Array Config'}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{inp.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculation Output & Limit */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs text-slate-500">Calculated Result</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {ck.calculatedValue !== null
                      ? `${ck.calculatedValue} ${ck.calculatedUnit}`
                      : 'Not Computed'}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
                    {ck.limitLabel}: <span className="font-semibold">{ck.limitValue}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed pt-2 border-t border-slate-200">
                  {ck.explanation}
                </div>

                {ck.missingInputs.length > 0 && (
                  <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
                    <span className="font-semibold">Missing Inputs:</span>{' '}
                    {ck.missingInputs.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 text-xs text-slate-700">
        <span className="font-semibold">Verification Boundary:</span> A PASS result confirms only
        that the entered equipment ratings and array configuration mathematically satisfy the stated
        limit checks. Verified manufacturer ratings and PASS outcomes do not certify electrical
        safety, installation workmanship, local electrical code compliance, or replace a licensed
        professional inspection.
      </div>
    </div>
  );
}
