import React, { useState } from 'react';
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { runEngineeringValidation } from '../engine/engineeringEngine';
import type { FieldMeasurement, SolarProject } from '../types/mithaq';

interface FieldMeasurementsViewProps {
  project: SolarProject;
  onUpdateProject: (updated: SolarProject) => void;
}

const PRESET_PARAMETERS = [
  { label: 'Measured PV String 1 Open-Circuit Voltage (Voc)', unit: 'V' },
  { label: 'Measured PV String 2 Open-Circuit Voltage (Voc)', unit: 'V' },
  { label: 'Measured Combined PV Input Current (I_pv)', unit: 'A' },
  { label: 'Measured Battery Bank DC Voltage', unit: 'V' },
  { label: 'Measured AC Output / Grid Voltage', unit: 'V' },
  { label: 'Measured Module Backsheet Temperature', unit: '°C' },
  { label: 'Measured Insulation Resistance', unit: 'MΩ' },
];

export function FieldMeasurementsView({
  project,
  onUpdateProject,
}: FieldMeasurementsViewProps) {
  const [parameter, setParameter] = useState(PRESET_PARAMETERS[0].label);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('V');
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().slice(0, 16));
  const [technicianName, setTechnicianName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const checks = runEngineeringValidation(project);
  const calcVoc = checks.find((c) => c.id === 'check-pv-voc-stc')?.calculatedValue;
  const calcIsc = checks.find((c) => c.id === 'check-pv-shortcircuit-current')?.calculatedValue;
  const calcImp = checks.find((c) => c.id === 'check-pv-operating-current')?.calculatedValue;

  const handleParamChange = (val: string) => {
    setParameter(val);
    const match = PRESET_PARAMETERS.find((p) => p.label === val);
    if (match) setUnit(match.unit);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(value);
    if (!parameter.trim() || !value.trim() || !Number.isFinite(numeric)) {
      setError('Enter a valid parameter name and numeric measurement value.');
      return;
    }
    if (!technicianName.trim()) {
      setError('Technician or inspector name is required for traceability.');
      return;
    }
    setError(null);

    const newItem: FieldMeasurement = {
      id: `meas-${Date.now()}`,
      parameter: parameter.trim(),
      value: numeric,
      unit: unit.trim() || 'V',
      measuredAt,
      technicianName: technicianName.trim(),
      notes: notes.trim(),
      isSimulated: false,
    };

    onUpdateProject({
      ...project,
      fieldMeasurements: [newItem, ...project.fieldMeasurements],
      updatedAt: new Date().toISOString(),
    });
    setValue('');
    setNotes('');
  };

  const handleDelete = (id: string) => {
    onUpdateProject({
      ...project,
      fieldMeasurements: project.fieldMeasurements.filter((m) => m.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Add Manual Measurement */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Step 6 — Technician Field Measurements (Manual Entry)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record on-site multimeter or clamp-meter readings. Field measurements are stored
              separately from calculated STC values and are never synthesized automatically.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md shrink-0">
            <ClipboardCheck className="w-4 h-4 text-slate-700" />
            Manual Site Telemetry Log
          </div>
        </div>

        {(calcVoc !== null || calcIsc !== null || calcImp !== null) && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700 flex flex-wrap gap-4 font-mono tabular-nums">
            <span>Calculated Reference (STC):</span>
            {calcVoc !== null && <span>String Voc = {calcVoc} V</span>}
            {calcImp !== null && <span>Parallel Imp = {calcImp} A</span>}
            {calcIsc !== null && <span>Parallel Isc = {calcIsc} A</span>}
          </div>
        )}

        <form onSubmit={handleAdd} className="pt-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Measurement Parameter
              </label>
              <select
                value={parameter}
                onChange={(e) => handleParamChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {PRESET_PARAMETERS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Measured Value
              </label>
              <div className="flex">
                <input
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. 388.4"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-l-md"
                />
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-16 px-2 py-2 text-sm font-mono text-center border-y border-r border-slate-300 rounded-r-md bg-slate-50"
                  aria-label="Measurement unit"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Measurement Date & Time
              </label>
              <input
                type="datetime-local"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Technician / Inspector Name
              </label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="e.g. Eng. Sara Al-Khatib"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Inspection Notes & Environmental Conditions
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Clear sky, irradiance ~890 W/m², Fluke 393FC clamp meter"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Field Measurement
            </button>
          </div>
        </form>
      </div>

      {/* Logged Measurements Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">
            Recorded Field Measurements ({project.fieldMeasurements.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4">Parameter</th>
                <th className="py-2.5 px-4">Measured Reading</th>
                <th className="py-2.5 px-4">Source Type</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Technician</th>
                <th className="py-2.5 px-4">Notes</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {project.fieldMeasurements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No field measurements recorded yet. Log your first site measurement above.
                  </td>
                </tr>
              ) : (
                project.fieldMeasurements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 px-4 font-medium text-slate-900">{m.parameter}</td>
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {m.value} {m.unit}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {m.isSimulated ? (
                        <span className="text-amber-800 font-medium">Simulated Demo Reading</span>
                      ) : (
                        <span className="text-slate-700 font-medium">Manual Field Entry</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {m.measuredAt.replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-800 whitespace-nowrap">
                      {m.technicianName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{m.notes || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="p-1 text-slate-400 hover:text-red-700"
                        aria-label="Delete field measurement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
