import { AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  formatInputConfidence,
  projectContainsSimulatedData,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
import { useI18n } from '../i18n/I18nContext';
import { fmt } from '../i18n/translations';
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
  const { lang, tr: t } = useI18n();
  const checks = runEngineeringValidation(project, lang);
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
            <span className="font-semibold">{t.common.simDataBannerTitle}</span>{' '}
            {fmt(t.common.simDataBannerBody, { customer: project.customerName })}
          </span>
        </div>
      )}
      {/* Array Topology Configuration */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t.validation.stepTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.validation.stepSubtitle}</p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md shrink-0">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            {t.validation.deterministicBadge}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.validation.nsLabel}
            </label>
            <input
              dir="ltr"
              type="number"
              min="1"
              value={cfg.modulesPerString ?? ''}
              onChange={(e) => updateConfig({ modulesPerString: parseNullableInt(e.target.value) })}
              placeholder="8"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.validation.npLabel}
            </label>
            <input
              dir="ltr"
              type="number"
              min="1"
              value={cfg.parallelStrings ?? ''}
              onChange={(e) => updateConfig({ parallelStrings: parseNullableInt(e.target.value) })}
              placeholder="2"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.validation.tminLabel}
            </label>
            <input
              dir="ltr"
              type="number"
              step="any"
              value={cfg.minAmbientTempC ?? ''}
              onChange={(e) => updateConfig({ minAmbientTempC: parseNullableInt(e.target.value) })}
              placeholder="0 / -5"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Outcome vs. Input Confidence Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-700 space-y-1">
        <div className="font-semibold text-slate-900">{t.validation.legendTitle}</div>
        <p className="leading-relaxed">{t.validation.legendBody}</p>
      </div>

      {/* Deterministic Check Results */}
      <div className="space-y-4">
        {checks.map((ck) => (
          <div key={ck.id} className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{ck.title}</h3>
                <div className="text-xs font-mono text-slate-600 mt-1">
                  {t.validation.formulaLabel}{' '}
                  <span dir="ltr" className="text-slate-900 font-medium inline-block">
                    {ck.formula}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1.5">
                  {t.validation.qualifiedLabel}{' '}
                  <span className="font-mono font-semibold text-slate-900">
                    {ck.qualifiedResult}
                  </span>
                  {ck.status === 'FAIL' && (
                    <span className="text-slate-500">
                      {' '}
                      ({t.validation.confidenceInlineLabel}{' '}
                      {formatInputConfidence(ck.inputConfidence, lang)})
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
                  {t.validation.tracedInputsTitle}
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-start border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-3 text-start">{t.validation.colParameter}</th>
                        <th className="py-2 px-3 text-start">{t.validation.colSymbol}</th>
                        <th className="py-2 px-3 text-start">{t.validation.colValue}</th>
                        <th className="py-2 px-3 text-start">{t.validation.colInputRole}</th>
                        <th className="py-2 px-3 text-start">{t.validation.colProvenance}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {ck.inputs.map((inp) => (
                        <tr key={inp.symbol}>
                          <td className="py-2 px-3 text-slate-800 font-medium">{inp.label}</td>
                          <td dir="ltr" className="py-2 px-3 font-mono text-slate-600 text-start">
                            {inp.symbol}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums">
                            {inp.value !== null ? (
                              <span dir="ltr" className="text-slate-900 font-semibold inline-block">
                                {inp.value} {inp.unit}
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold">{t.common.missing}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            {inp.inputRole === 'EQUIPMENT_SPEC'
                              ? t.validation.roleEquipSpec
                              : t.validation.roleArrayConfig}
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
                  <div className="text-xs text-slate-500">{t.validation.calcResultLabel}</div>
                  <div
                    dir="ltr"
                    className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 w-fit"
                  >
                    {ck.calculatedValue !== null
                      ? `${ck.calculatedValue} ${ck.calculatedUnit}`
                      : t.common.notComputed}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
                    {ck.limitLabel}:{' '}
                    <span dir="ltr" className="font-semibold inline-block">
                      {ck.limitValue}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed pt-2 border-t border-slate-200">
                  {ck.explanation}
                </div>

                {ck.missingInputs.length > 0 && (
                  <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
                    <span className="font-semibold">{t.validation.missingInputsLabel}</span>{' '}
                    <span dir="ltr" className="inline-block">
                      {ck.missingInputs.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 text-xs text-slate-700">
        <span className="font-semibold">{t.common.verificationBoundaryTitle}</span>{' '}
        {t.common.verificationBoundaryBody}
      </div>
    </div>
  );
}
