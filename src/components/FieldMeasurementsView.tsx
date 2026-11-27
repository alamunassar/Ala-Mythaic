import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { runEngineeringValidation } from '../engine/engineeringEngine';
import { useI18n } from '../i18n/I18nContext';
import { fmt, ltr, TRANSLATIONS } from '../i18n/translations';
import type { FieldMeasurement, SolarProject } from '../types/mithaq';
import {
  localizeDemoMeasurementNotes,
  localizeDemoMeasurementParam,
  localizeDemoMeasurementTech,
} from '../utils/demoLocalization';

interface FieldMeasurementsViewProps {
  project: SolarProject;
  onUpdateProject: (updated: SolarProject) => void;
}

export function FieldMeasurementsView({
  project,
  onUpdateProject,
}: FieldMeasurementsViewProps) {
  const { lang, tr: t } = useI18n();
  const presets = t.measurements.presets;
  const [presetIdx, setPresetIdx] = useState(0);
  const [parameter, setParameter] = useState(() => presets[0].label);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(() => presets[0].unit);
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().slice(0, 16));
  const [technicianName, setTechnicianName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const enMatchIdx = TRANSLATIONS.en.measurements.presets.findIndex((p) => p.label === parameter);
    const arMatchIdx = TRANSLATIONS.ar.measurements.presets.findIndex((p) => p.label === parameter);
    const idx = enMatchIdx >= 0 ? enMatchIdx : arMatchIdx >= 0 ? arMatchIdx : presetIdx;
    if (presets[idx]) {
      setPresetIdx(idx);
      setParameter(presets[idx].label);
      setUnit(presets[idx].unit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const checks = runEngineeringValidation(project, lang);
  const calcVoc = checks.find((c) => c.id === 'check-pv-voc-stc')?.calculatedValue;
  const calcIsc = checks.find((c) => c.id === 'check-pv-shortcircuit-current')?.calculatedValue;
  const calcImp = checks.find((c) => c.id === 'check-pv-operating-current')?.calculatedValue;

  const handleParamChange = (val: string) => {
    setParameter(val);
    const idx = presets.findIndex((p) => p.label === val);
    if (idx >= 0) {
      setPresetIdx(idx);
      setUnit(presets[idx].unit);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(value);
    if (!parameter.trim() || !value.trim() || !Number.isFinite(numeric)) {
      setError(t.measurements.errInvalidValue);
      return;
    }
    if (!technicianName.trim()) {
      setError(t.measurements.errTechRequired);
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
            <h2 className="text-lg font-semibold text-slate-900">{t.measurements.stepTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.measurements.stepSubtitle}</p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md shrink-0">
            <ClipboardCheck className="w-4 h-4 text-slate-700" />
            {t.measurements.telemetryBadge}
          </div>
        </div>

        {(calcVoc !== null || calcIsc !== null || calcImp !== null) && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700 flex flex-wrap gap-4 font-mono tabular-nums">
            <span>{t.measurements.calcRefLabel}</span>
            {calcVoc !== null && (
              <span>
                {fmt(t.measurements.calcRefVoc, {
                  val: lang === 'ar' ? ltr(`${calcVoc} V`) : `${calcVoc} V`,
                })}
              </span>
            )}
            {calcImp !== null && (
              <span>
                {fmt(t.measurements.calcRefImp, {
                  val: lang === 'ar' ? ltr(`${calcImp} A`) : `${calcImp} A`,
                })}
              </span>
            )}
            {calcIsc !== null && (
              <span>
                {fmt(t.measurements.calcRefIsc, {
                  val: lang === 'ar' ? ltr(`${calcIsc} A`) : `${calcIsc} A`,
                })}
              </span>
            )}
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
                {t.measurements.paramLabel}
              </label>
              <select
                value={parameter}
                onChange={(e) => handleParamChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {presets.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.measurements.valueLabel}
              </label>
              <div dir="ltr" className="flex">
                <input
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="388.4"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-l-md"
                />
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-16 px-2 py-2 text-sm font-mono text-center border-y border-r border-slate-300 rounded-r-md bg-slate-50"
                  aria-label={t.measurements.unitAria}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.measurements.dateTimeLabel}
              </label>
              <input
                dir="ltr"
                type="datetime-local"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.measurements.techNameLabel}
              </label>
              <input
                dir="auto"
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder={t.measurements.techNamePlaceholder}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.measurements.notesLabel}
              </label>
              <input
                dir="auto"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.measurements.notesPlaceholder}
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
              {t.measurements.logBtn}
            </button>
          </div>
        </form>
      </div>

      {/* Logged Measurements Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">
            {fmt(t.measurements.tableTitle, { count: project.fieldMeasurements.length })}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4 text-start">{t.measurements.colParam}</th>
                <th className="py-2.5 px-4 text-start">{t.measurements.colReading}</th>
                <th className="py-2.5 px-4 text-start">{t.measurements.colSourceType}</th>
                <th className="py-2.5 px-4 text-start">{t.measurements.colTimestamp}</th>
                <th className="py-2.5 px-4 text-start">{t.measurements.colTechnician}</th>
                <th className="py-2.5 px-4 text-start">{t.measurements.colNotes}</th>
                <th className="py-2.5 px-4 text-end">{t.measurements.colAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {project.fieldMeasurements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    {t.measurements.emptyRow}
                  </td>
                </tr>
              ) : (
                project.fieldMeasurements.map((m) => {
                  const displayParam = localizeDemoMeasurementParam(m.parameter, lang);
                  const displayTech = localizeDemoMeasurementTech(m.technicianName, lang);
                  const displayNotes = m.notes ? localizeDemoMeasurementNotes(m.notes, lang) : '';
                  return (
                    <tr key={m.id}>
                      <td dir="auto" className="py-3 px-4 font-medium text-slate-900">
                        {displayParam}
                      </td>
                      <td
                        dir="ltr"
                        className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap text-start"
                      >
                        {m.value} {m.unit}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {m.isSimulated ? (
                          <span className="text-amber-800 font-medium">
                            {t.measurements.simulatedReading}
                          </span>
                        ) : (
                          <span className="text-slate-700 font-medium">
                            {t.measurements.manualEntry}
                          </span>
                        )}
                      </td>
                      <td
                        dir="ltr"
                        className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap text-start"
                      >
                        {m.measuredAt.replace('T', ' ')}
                      </td>
                      <td dir="auto" className="py-3 px-4 text-slate-800 whitespace-nowrap">
                        {displayTech}
                      </td>
                      <td dir="auto" className="py-3 px-4 text-slate-600">
                        {displayNotes || '—'}
                      </td>
                    <td className="py-3 px-4 text-end">
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="p-1 text-slate-400 hover:text-red-700"
                        aria-label={t.measurements.deleteAria}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
