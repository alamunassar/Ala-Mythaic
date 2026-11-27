import React, { useMemo, useState } from 'react';
import {
  X,
  AlertTriangle,
  Check,
  FileUp,
  Loader2,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import type { DataProvenance, EquipmentCategory, EquipmentSpec } from '../types/mithaq';
import { detectSimulatedMarkers, getCategoryLabel } from '../engine/engineeringEngine';
import { useI18n } from '../i18n/I18nContext';
import { fmt } from '../i18n/translations';
import { safeFetchJson } from '../utils/api';
import {
  CATEGORY_FIELD_DEFINITIONS,
  filterUnreadableFieldsByCategory,
  getCategoryFieldLabel,
  localizeCategoryFieldText,
  sanitizeSpecFieldsByCategory,
} from '../utils/categorySpecs';
import { localizeDemoUncertainField } from '../utils/demoLocalization';
import {
  extractTrackedFieldValues,
  resolveManualEditProvenance,
} from '../utils/equipmentProtection';

interface EquipmentFormModalProps {
  mode: 'PROMISED' | 'INSTALLED';
  initialSpec?: EquipmentSpec;
  defaultCategory?: EquipmentCategory;
  defaultOpenDatasheet?: boolean;
  projectIsDemo?: boolean;
  onSave: (spec: EquipmentSpec) => void;
  onClose: () => void;
}

function toNumOrNull(val: string): number | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStrOrNull(val: string): string | null {
  const trimmed = val.trim();
  return trimmed ? trimmed : null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const commaIdx = dataUrl.indexOf(',');
      resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    reader.onerror = () => reject(new Error('Failed to read datasheet file.'));
    reader.readAsDataURL(file);
  });
}

export function EquipmentFormModal({
  mode,
  initialSpec,
  defaultCategory = 'PV_MODULE',
  defaultOpenDatasheet = false,
  projectIsDemo = false,
  onSave,
  onClose,
}: EquipmentFormModalProps) {
  const { lang, tr: t } = useI18n();
  const [category, setCategory] = useState<EquipmentCategory>(
    initialSpec?.category ?? defaultCategory,
  );
  const [manufacturer, setManufacturer] = useState(initialSpec?.manufacturer ?? '');
  const [model, setModel] = useState(initialSpec?.model ?? '');
  const [quantity, setQuantity] = useState(
    initialSpec?.quantity !== null && initialSpec?.quantity !== undefined
      ? String(initialSpec.quantity)
      : '',
  );
  const [ratedPowerW, setRatedPowerW] = useState(
    initialSpec?.ratedPowerW !== null && initialSpec?.ratedPowerW !== undefined
      ? String(initialSpec.ratedPowerW)
      : '',
  );
  const [capacityKwh, setCapacityKwh] = useState(
    initialSpec?.capacityKwh !== null && initialSpec?.capacityKwh !== undefined
      ? String(initialSpec.capacityKwh)
      : '',
  );
  const [nominalVoltageV, setNominalVoltageV] = useState(
    initialSpec?.nominalVoltageV !== null && initialSpec?.nominalVoltageV !== undefined
      ? String(initialSpec.nominalVoltageV)
      : '',
  );
  const [vocV, setVocV] = useState(
    initialSpec?.vocV !== null && initialSpec?.vocV !== undefined ? String(initialSpec.vocV) : '',
  );
  const [vmpV, setVmpV] = useState(
    initialSpec?.vmpV !== null && initialSpec?.vmpV !== undefined ? String(initialSpec.vmpV) : '',
  );
  const [iscA, setIscA] = useState(
    initialSpec?.iscA !== null && initialSpec?.iscA !== undefined ? String(initialSpec.iscA) : '',
  );
  const [impA, setImpA] = useState(
    initialSpec?.impA !== null && initialSpec?.impA !== undefined ? String(initialSpec.impA) : '',
  );
  const [tempCoeff, setTempCoeff] = useState(
    initialSpec?.tempCoeffVocPctPerC !== null && initialSpec?.tempCoeffVocPctPerC !== undefined
      ? String(initialSpec.tempCoeffVocPctPerC)
      : '',
  );
  const [maxPvInputVoltageV, setMaxPvInputVoltageV] = useState(
    initialSpec?.maxPvInputVoltageV !== null && initialSpec?.maxPvInputVoltageV !== undefined
      ? String(initialSpec.maxPvInputVoltageV)
      : '',
  );
  const [mpptMinV, setMpptMinV] = useState(
    initialSpec?.mpptMinV !== null && initialSpec?.mpptMinV !== undefined
      ? String(initialSpec.mpptMinV)
      : '',
  );
  const [mpptMaxV, setMpptMaxV] = useState(
    initialSpec?.mpptMaxV !== null && initialSpec?.mpptMaxV !== undefined
      ? String(initialSpec.mpptMaxV)
      : '',
  );
  const [maxPvOperatingCurrentA, setMaxPvOperatingCurrentA] = useState(
    initialSpec?.maxPvOperatingCurrentA !== null &&
      initialSpec?.maxPvOperatingCurrentA !== undefined
      ? String(initialSpec.maxPvOperatingCurrentA)
      : '',
  );
  const [maxPvShortCircuitCurrentA, setMaxPvShortCircuitCurrentA] = useState(
    initialSpec?.maxPvShortCircuitCurrentA !== null &&
      initialSpec?.maxPvShortCircuitCurrentA !== undefined
      ? String(initialSpec.maxPvShortCircuitCurrentA)
      : '',
  );
  const [minBatteryVoltageV, setMinBatteryVoltageV] = useState(
    initialSpec?.minBatteryVoltageV !== null && initialSpec?.minBatteryVoltageV !== undefined
      ? String(initialSpec.minBatteryVoltageV)
      : '',
  );
  const [maxBatteryVoltageV, setMaxBatteryVoltageV] = useState(
    initialSpec?.maxBatteryVoltageV !== null && initialSpec?.maxBatteryVoltageV !== undefined
      ? String(initialSpec.maxBatteryVoltageV)
      : '',
  );
  const [serialNumber, setSerialNumber] = useState(initialSpec?.serialNumber ?? '');
  const [additionalSpecs, setAdditionalSpecs] = useState(initialSpec?.additionalSpecs ?? '');
  const initialIsSimulated = initialSpec
    ? detectSimulatedMarkers(initialSpec, projectIsDemo, lang).length > 0
    : projectIsDemo;
  const [verifiedByUser, setVerifiedByUser] = useState<boolean>(
    initialSpec && !initialIsSimulated ? Boolean(initialSpec.verifiedByUser) : false,
  );
  const [datasheetFileName, setDatasheetFileName] = useState<string | undefined>(
    initialSpec?.datasheetFileName,
  );
  const [fieldProvenance, setFieldProvenance] = useState<Partial<Record<string, DataProvenance>>>(
    initialSpec?.fieldProvenance ?? {},
  );
  const [baselineValues, setBaselineValues] = useState<Record<string, unknown>>(() =>
    extractTrackedFieldValues(initialSpec),
  );
  const [userConfirmedVerifyAfterEdit, setUserConfirmedVerifyAfterEdit] = useState(false);

  // Datasheet supplementation UI state
  const [showDatasheetPanel, setShowDatasheetPanel] = useState(defaultOpenDatasheet);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [datasheetRawText, setDatasheetRawText] = useState('');
  const [datasheetLoading, setDatasheetLoading] = useState(false);
  const [datasheetError, setDatasheetError] = useState<string | null>(null);
  const [datasheetSuccess, setDatasheetSuccess] = useState<string | null>(null);

  // Original AI extraction visibility
  const [showOriginalAi, setShowOriginalAi] = useState(Boolean(initialSpec?.originalAiExtraction));

  const originalSnapshot = initialSpec?.originalAiExtraction;

  const filteredUnreadable = useMemo(
    () => filterUnreadableFieldsByCategory(category, initialSpec?.unreadableFields ?? []),
    [category, initialSpec?.unreadableFields],
  );

  const simulatedReasons = useMemo(
    () =>
      detectSimulatedMarkers(
        {
          id: initialSpec?.id,
          provenance: initialSpec?.provenance,
          manufacturer: toStrOrNull(manufacturer),
          model: toStrOrNull(model),
          serialNumber: toStrOrNull(serialNumber),
          additionalSpecs: additionalSpecs.trim() || undefined,
          datasheetFileName,
        },
        projectIsDemo,
        lang,
      ),
    [
      initialSpec?.id,
      initialSpec?.provenance,
      manufacturer,
      model,
      serialNumber,
      additionalSpecs,
      datasheetFileName,
      projectIsDemo,
      lang,
    ],
  );
  const isSimulatedRecord = simulatedReasons.length > 0;

  const handleExtractDatasheet = async () => {
    if (!datasheetFile && !datasheetRawText.trim()) return;
    setDatasheetLoading(true);
    setDatasheetError(null);
    setDatasheetSuccess(null);
    try {
      let base64Data: string | undefined;
      let mimeType: string | undefined;
      const fileName = datasheetFile?.name;

      if (datasheetFile) {
        base64Data = await fileToBase64(datasheetFile);
        mimeType = datasheetFile.type || 'application/pdf';
      }

      const result = await safeFetchJson<Record<string, unknown>>('/api/ai/extract-datasheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          fileName,
          mimeType,
          base64Data,
          rawText: datasheetRawText,
          manufacturerHint: toStrOrNull(manufacturer),
          modelHint: toStrOrNull(model),
        }),
      });

      if (!result.ok || !result.data) {
        setDatasheetError(result.error ?? t.modal.datasheetFailedErr);
        return;
      }

      const ds = sanitizeSpecFieldsByCategory(category, result.data);
      const filledFields: string[] = [];
      const nextFieldProv: Partial<Record<string, DataProvenance>> = { ...fieldProvenance };
      const nextBaseline: Record<string, unknown> = { ...baselineValues };

      const fillStr = (
        fieldKey: 'manufacturer' | 'model',
        current: string,
        setter: (v: string) => void,
        val: unknown,
      ) => {
        if (!current.trim() && typeof val === 'string' && val.trim()) {
          const trimmed = val.trim();
          setter(trimmed);
          filledFields.push(getCategoryFieldLabel(category, fieldKey, lang));
          nextFieldProv[fieldKey] = 'DATASHEET_VERIFIED';
          nextBaseline[fieldKey] = trimmed;
        }
      };
      const fillNum = (
        fieldKey:
          | 'ratedPowerW'
          | 'capacityKwh'
          | 'nominalVoltageV'
          | 'vocV'
          | 'vmpV'
          | 'iscA'
          | 'impA'
          | 'tempCoeffVocPctPerC'
          | 'maxPvInputVoltageV'
          | 'mpptMinV'
          | 'mpptMaxV'
          | 'maxPvOperatingCurrentA'
          | 'maxPvShortCircuitCurrentA'
          | 'minBatteryVoltageV'
          | 'maxBatteryVoltageV',
        current: string,
        setter: (v: string) => void,
        val: unknown,
      ) => {
        if (!current.trim() && typeof val === 'number' && Number.isFinite(val)) {
          setter(String(val));
          filledFields.push(getCategoryFieldLabel(category, fieldKey, lang));
          nextFieldProv[fieldKey] = 'DATASHEET_VERIFIED';
          nextBaseline[fieldKey] = val;
        }
      };

      fillStr('manufacturer', manufacturer, setManufacturer, ds.manufacturer);
      fillStr('model', model, setModel, ds.model);

      if (category === 'PV_MODULE') {
        fillNum('ratedPowerW', ratedPowerW, setRatedPowerW, ds.ratedPowerW);
        fillNum('vocV', vocV, setVocV, ds.vocV);
        fillNum('vmpV', vmpV, setVmpV, ds.vmpV);
        fillNum('iscA', iscA, setIscA, ds.iscA);
        fillNum('impA', impA, setImpA, ds.impA);
        fillNum('tempCoeffVocPctPerC', tempCoeff, setTempCoeff, ds.tempCoeffVocPctPerC);
      } else if (category === 'INVERTER') {
        fillNum('ratedPowerW', ratedPowerW, setRatedPowerW, ds.ratedPowerW);
        fillNum('nominalVoltageV', nominalVoltageV, setNominalVoltageV, ds.nominalVoltageV);
        fillNum(
          'minBatteryVoltageV',
          minBatteryVoltageV,
          setMinBatteryVoltageV,
          ds.minBatteryVoltageV,
        );
        fillNum(
          'maxBatteryVoltageV',
          maxBatteryVoltageV,
          setMaxBatteryVoltageV,
          ds.maxBatteryVoltageV,
        );
        fillNum(
          'maxPvInputVoltageV',
          maxPvInputVoltageV,
          setMaxPvInputVoltageV,
          ds.maxPvInputVoltageV,
        );
        fillNum(
          'maxPvOperatingCurrentA',
          maxPvOperatingCurrentA,
          setMaxPvOperatingCurrentA,
          ds.maxPvOperatingCurrentA,
        );
        fillNum(
          'maxPvShortCircuitCurrentA',
          maxPvShortCircuitCurrentA,
          setMaxPvShortCircuitCurrentA,
          ds.maxPvShortCircuitCurrentA,
        );
        fillNum('mpptMinV', mpptMinV, setMpptMinV, ds.mpptMinV);
        fillNum('mpptMaxV', mpptMaxV, setMpptMaxV, ds.mpptMaxV);
      } else if (category === 'BATTERY') {
        fillNum('nominalVoltageV', nominalVoltageV, setNominalVoltageV, ds.nominalVoltageV);
        fillNum(
          'minBatteryVoltageV',
          minBatteryVoltageV,
          setMinBatteryVoltageV,
          ds.minBatteryVoltageV,
        );
        fillNum(
          'maxBatteryVoltageV',
          maxBatteryVoltageV,
          setMaxBatteryVoltageV,
          ds.maxBatteryVoltageV,
        );
        fillNum('capacityKwh', capacityKwh, setCapacityKwh, ds.capacityKwh);
      }

      if (typeof ds.additionalSpecs === 'string' && ds.additionalSpecs.trim()) {
        if (!additionalSpecs.trim()) {
          const trimmedNotes = ds.additionalSpecs.trim();
          setAdditionalSpecs(trimmedNotes);
          filledFields.push(getCategoryFieldLabel(category, 'additionalSpecs', lang));
          nextFieldProv['additionalSpecs'] = 'DATASHEET_VERIFIED';
          nextBaseline['additionalSpecs'] = trimmedNotes;
        }
      }

      setFieldProvenance(nextFieldProv);
      setBaselineValues(nextBaseline);

      if (fileName) {
        setDatasheetFileName(fileName);
      } else if (!datasheetFileName) {
        setDatasheetFileName(t.modal.pastedDatasheetText);
      }

      if (filledFields.length > 0) {
        setDatasheetSuccess(
          fmt(t.modal.datasheetSupplemented, {
            count: filledFields.length,
            fields: filledFields.join(' · '),
          }),
        );
      } else {
        setDatasheetSuccess(t.modal.datasheetNoNewFields);
      }
    } catch (err) {
      setDatasheetError(err instanceof Error ? err.message : t.modal.datasheetReadErr);
    } finally {
      setDatasheetLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawValues: Record<string, unknown> = {
      manufacturer: toStrOrNull(manufacturer),
      model: toStrOrNull(model),
      ratedPowerW: toNumOrNull(ratedPowerW),
      capacityKwh: toNumOrNull(capacityKwh),
      nominalVoltageV: toNumOrNull(nominalVoltageV),
      vocV: toNumOrNull(vocV),
      vmpV: toNumOrNull(vmpV),
      iscA: toNumOrNull(iscA),
      impA: toNumOrNull(impA),
      tempCoeffVocPctPerC: toNumOrNull(tempCoeff),
      maxPvInputVoltageV: toNumOrNull(maxPvInputVoltageV),
      mpptMinV: toNumOrNull(mpptMinV),
      mpptMaxV: toNumOrNull(mpptMaxV),
      maxPvOperatingCurrentA: toNumOrNull(maxPvOperatingCurrentA),
      maxPvShortCircuitCurrentA: toNumOrNull(maxPvShortCircuitCurrentA),
      minBatteryVoltageV: toNumOrNull(minBatteryVoltageV),
      maxBatteryVoltageV: toNumOrNull(maxBatteryVoltageV),
      serialNumber: toStrOrNull(serialNumber),
      additionalSpecs: additionalSpecs.trim() || null,
    };

    const sanitized = sanitizeSpecFieldsByCategory(category, rawValues);

    // Filter unreadableFields to only those category fields that are still missing/null
    const allowedDefs = CATEGORY_FIELD_DEFINITIONS[category];
    const remainingUnreadable = filteredUnreadable.filter((label) => {
      const matchingDef = allowedDefs.find(
        (d) =>
          d.label.toLowerCase() === label.toLowerCase() ||
          label.toLowerCase().includes(d.key.toLowerCase()),
      );
      if (!matchingDef) return true;
      const val = sanitized[matchingDef.key];
      return val === null || val === undefined || val === '';
    });

    const parsedQty = toNumOrNull(quantity);
    const provenanceResolution = resolveManualEditProvenance({
      initialSpec,
      baselineValues,
      nextValues: sanitized,
      nextQuantity: parsedQty,
      workingFieldProvenance: fieldProvenance,
      datasheetFileName,
      verifiedByUser: !isSimulatedRecord && verifiedByUser,
      isSimulatedRecord,
      projectIsDemo,
    });

    const editedWithoutReverify =
      !isSimulatedRecord &&
      provenanceResolution.manuallyEditedFields.length > 0 &&
      Boolean(initialSpec?.verifiedByUser) &&
      !userConfirmedVerifyAfterEdit;

    const finalProvenance = editedWithoutReverify
      ? resolveManualEditProvenance({
          initialSpec,
          baselineValues,
          nextValues: sanitized,
          nextQuantity: parsedQty,
          workingFieldProvenance: fieldProvenance,
          datasheetFileName,
          verifiedByUser: false,
          isSimulatedRecord,
          projectIsDemo,
        })
      : provenanceResolution;

    const spec: EquipmentSpec = {
      id: initialSpec?.id ?? `eq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      manufacturer: (sanitized.manufacturer as string | null) ?? null,
      model: (sanitized.model as string | null) ?? null,
      quantity: parsedQty,
      ratedPowerW: (sanitized.ratedPowerW as number | null) ?? null,
      capacityKwh: (sanitized.capacityKwh as number | null) ?? null,
      nominalVoltageV: (sanitized.nominalVoltageV as number | null) ?? null,
      vocV: (sanitized.vocV as number | null) ?? null,
      vmpV: (sanitized.vmpV as number | null) ?? null,
      iscA: (sanitized.iscA as number | null) ?? null,
      impA: (sanitized.impA as number | null) ?? null,
      tempCoeffVocPctPerC: (sanitized.tempCoeffVocPctPerC as number | null) ?? null,
      maxPvInputVoltageV: (sanitized.maxPvInputVoltageV as number | null) ?? null,
      mpptMinV: (sanitized.mpptMinV as number | null) ?? null,
      mpptMaxV: (sanitized.mpptMaxV as number | null) ?? null,
      maxPvOperatingCurrentA: (sanitized.maxPvOperatingCurrentA as number | null) ?? null,
      maxPvShortCircuitCurrentA: (sanitized.maxPvShortCircuitCurrentA as number | null) ?? null,
      minBatteryVoltageV: (sanitized.minBatteryVoltageV as number | null) ?? null,
      maxBatteryVoltageV: (sanitized.maxBatteryVoltageV as number | null) ?? null,
      serialNumber: (sanitized.serialNumber as string | null) ?? null,
      additionalSpecs: (sanitized.additionalSpecs as string | null) ?? undefined,
      provenance: finalProvenance.provenance,
      fieldProvenance: finalProvenance.fieldProvenance,
      uncertainFields: finalProvenance.verifiedByUser ? [] : initialSpec?.uncertainFields ?? [],
      unreadableFields: remainingUnreadable,
      sourceFileName: initialSpec?.sourceFileName,
      sourceImagePreview: initialSpec?.sourceImagePreview,
      datasheetFileName,
      originalAiExtraction: initialSpec?.originalAiExtraction,
      verifiedByUser: finalProvenance.verifiedByUser,
    };
    onSave(spec);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {initialSpec ? t.modal.reviewEdit : t.modal.add} —{' '}
              {mode === 'PROMISED' ? t.modal.promisedTitle : t.modal.installedTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.modal.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
            aria-label={t.modal.closeAria}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {isSimulatedRecord && (
            <div className="bg-amber-50 border border-amber-300 rounded-md p-3 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">{t.modal.simDetectedTitle}</div>
                <p className="text-[11px] text-amber-900">
                  {fmt(t.modal.simDetectedBody, { reasons: simulatedReasons.join(' · ') })}
                </p>
              </div>
            </div>
          )}

          {(initialSpec?.uncertainFields.length || filteredUnreadable.length) ? (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                {initialSpec?.uncertainFields && initialSpec.uncertainFields.length > 0 && (
                  <p>
                    <span className="font-semibold">{t.modal.uncertainFieldsLabel}</span>{' '}
                    {initialSpec.uncertainFields
                      .map((f) => localizeDemoUncertainField(f, lang))
                      .join(' · ')}
                  </p>
                )}
                {filteredUnreadable.length > 0 && (
                  <p>
                    <span className="font-semibold">
                      {fmt(t.modal.missingUnreadableLabel, {
                        category: getCategoryLabel(category, lang),
                      })}
                    </span>{' '}
                    {filteredUnreadable
                      .map((item) => localizeCategoryFieldText(category, item, lang))
                      .join(' · ')}
                  </p>
                )}
                <p className="text-[11px] text-amber-800">{t.modal.manualOrDatasheetHint}</p>
              </div>
            </div>
          ) : null}

          {/* Original AI Nameplate Extraction Snapshot (Always Preserved) */}
          {originalSnapshot && (
            <div className="border border-slate-200 rounded-md bg-slate-50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowOriginalAi((v) => !v)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  {t.modal.origAiTitle}
                </span>
                {showOriginalAi ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
              {showOriginalAi && (
                <div className="px-3.5 pb-3 pt-1 border-t border-slate-200 space-y-2 text-xs">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span>
                      {t.modal.categoryLabel} {getCategoryLabel(originalSnapshot.category, lang)}
                    </span>
                    {originalSnapshot.sourceFileName && (
                      <span>
                        {t.modal.photoLabel}{' '}
                        <span dir="ltr" className="font-mono inline-block">
                          {originalSnapshot.sourceFileName}
                        </span>
                      </span>
                    )}
                    <span>
                      {t.modal.readAtLabel}{' '}
                      <span dir="ltr" className="inline-block font-mono">
                        {new Date(originalSnapshot.extractedAt).toLocaleString()}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                    {CATEGORY_FIELD_DEFINITIONS[originalSnapshot.category]
                      .filter((d) => d.key !== 'additionalSpecs')
                      .map((def) => {
                        const rawVal =
                          originalSnapshot.fields[
                            def.key as keyof typeof originalSnapshot.fields
                          ];
                        const hasOrig = rawVal !== null && rawVal !== undefined && rawVal !== '';
                        return (
                          <div
                            key={def.key}
                            className="bg-white border border-slate-200 rounded px-2 py-1.5"
                          >
                            <div className="text-[10px] font-sans text-slate-500">
                              {getCategoryFieldLabel(originalSnapshot.category, def.key, lang)}
                            </div>
                            <div
                              dir={hasOrig ? 'ltr' : undefined}
                              className="text-slate-900 font-medium break-words text-start"
                            >
                              {hasOrig
                                ? `${rawVal}${def.unit ? ` ${def.unit}` : ''}`
                                : t.common.notReadable}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {originalSnapshot.confidenceNotes && (
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold">{t.modal.aiNotesLabel}</span>{' '}
                      {originalSnapshot.confidenceNotes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Supplement Missing Specs from Datasheet */}
          {mode === 'INSTALLED' && (
            <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDatasheetPanel((v) => !v)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100"
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  {t.modal.uploadDatasheetToggle}
                  {datasheetFileName && (
                    <span dir="ltr" className="font-normal text-emerald-700 inline-block">
                      · {datasheetFileName}
                    </span>
                  )}
                </span>
                {showDatasheetPanel ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {showDatasheetPanel && (
                <div className="p-3.5 border-t border-slate-200 space-y-3 text-xs">
                  <p className="text-slate-600">
                    {fmt(t.modal.datasheetIntro, {
                      category: getCategoryLabel(category, lang),
                    })}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer whitespace-nowrap">
                      <FileUp className="w-3.5 h-3.5" />
                      {datasheetFile ? datasheetFile.name : t.modal.chooseDatasheetFile}
                      <input
                        type="file"
                        accept=".pdf,.txt,.csv,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => setDatasheetFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={datasheetLoading || (!datasheetFile && !datasheetRawText.trim())}
                      onClick={handleExtractDatasheet}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                    >
                      {datasheetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {datasheetLoading
                        ? t.modal.extractingDatasheet
                        : t.modal.extractDatasheetBtn}
                    </button>
                  </div>
                  <textarea
                    dir="ltr"
                    rows={2}
                    value={datasheetRawText}
                    onChange={(e) => setDatasheetRawText(e.target.value)}
                    placeholder={t.modal.datasheetTextPlaceholder}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                  />
                  {datasheetError && (
                    <div className="bg-red-50 border border-red-200 text-red-900 px-2.5 py-2 rounded">
                      {datasheetError}
                    </div>
                  )}
                  {datasheetSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-2.5 py-2 rounded">
                      {datasheetSuccess}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.modal.categoryLabel.replace(':', '')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="PV_MODULE">{getCategoryLabel('PV_MODULE', lang)}</option>
                <option value="INVERTER">{getCategoryLabel('INVERTER', lang)}</option>
                <option value="BATTERY">{getCategoryLabel('BATTERY', lang)}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.modal.quantityLabel}
              </label>
              <input
                dir="ltr"
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={t.modal.quantityPlaceholder}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.modal.mfgLabel}
              </label>
              <input
                dir="auto"
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder={t.modal.mfgPlaceholder}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.modal.modelLabel}
              </label>
              <input
                dir="ltr"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t.modal.modelPlaceholder}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {category === 'PV_MODULE' && (
            <div className="pt-3 border-t border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">
                {t.modal.pvSectionTitle}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('PV_MODULE', 'ratedPowerW', lang)} (W)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={ratedPowerW}
                    onChange={(e) => setRatedPowerW(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('PV_MODULE', 'vocV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={vocV}
                    onChange={(e) => setVocV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('PV_MODULE', 'vmpV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={vmpV}
                    onChange={(e) => setVmpV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('PV_MODULE', 'iscA', lang)} (A)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={iscA}
                    onChange={(e) => setIscA(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('PV_MODULE', 'impA', lang)} (A)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={impA}
                    onChange={(e) => setImpA(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('PV_MODULE', 'tempCoeffVocPctPerC', lang)} (%/°C)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={tempCoeff}
                    onChange={(e) => setTempCoeff(e.target.value)}
                    placeholder="-0.28"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {category === 'INVERTER' && (
            <div className="pt-3 border-t border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">
                {t.modal.invSectionTitle}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('INVERTER', 'ratedPowerW', lang)} (W)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={ratedPowerW}
                    onChange={(e) => setRatedPowerW(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('INVERTER', 'maxPvInputVoltageV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={maxPvInputVoltageV}
                    onChange={(e) => setMaxPvInputVoltageV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('INVERTER', 'maxPvOperatingCurrentA', lang)} (A)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={maxPvOperatingCurrentA}
                    onChange={(e) => setMaxPvOperatingCurrentA(e.target.value)}
                    placeholder="22"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('INVERTER', 'maxPvShortCircuitCurrentA', lang)} (A)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={maxPvShortCircuitCurrentA}
                    onChange={(e) => setMaxPvShortCircuitCurrentA(e.target.value)}
                    placeholder="26"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('INVERTER', 'mpptMinV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={mpptMinV}
                    onChange={(e) => setMpptMinV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('INVERTER', 'mpptMaxV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={mpptMaxV}
                    onChange={(e) => setMpptMaxV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('INVERTER', 'nominalVoltageV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={nominalVoltageV}
                    onChange={(e) => setNominalVoltageV(e.target.value)}
                    placeholder="48"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('INVERTER', 'minBatteryVoltageV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={minBatteryVoltageV}
                    onChange={(e) => setMinBatteryVoltageV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('INVERTER', 'maxBatteryVoltageV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={maxBatteryVoltageV}
                    onChange={(e) => setMaxBatteryVoltageV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {category === 'BATTERY' && (
            <div className="pt-3 border-t border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">
                {t.modal.battSectionTitle}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('BATTERY', 'capacityKwh', lang)} (kWh)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={capacityKwh}
                    onChange={(e) => setCapacityKwh(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('BATTERY', 'nominalVoltageV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={nominalVoltageV}
                    onChange={(e) => setNominalVoltageV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('BATTERY', 'minBatteryVoltageV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={minBatteryVoltageV}
                    onChange={(e) => setMinBatteryVoltageV(e.target.value)}
                    placeholder="44.5"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('BATTERY', 'maxBatteryVoltageV', lang)} (V)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={maxBatteryVoltageV}
                    onChange={(e) => setMaxBatteryVoltageV(e.target.value)}
                    placeholder="53.5"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {getCategoryFieldLabel('BATTERY', 'ratedPowerW', lang)} (W)
                  </label>
                  <input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={ratedPowerW}
                    onChange={(e) => setRatedPowerW(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mode === 'INSTALLED' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.modal.serialLabel}
                </label>
                <input
                  dir="ltr"
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
            )}
            <div className={mode === 'INSTALLED' ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.modal.notesLabel}
              </label>
              <input
                dir="auto"
                type="text"
                value={additionalSpecs}
                onChange={(e) => setAdditionalSpecs(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <label
              className={`inline-flex items-center gap-2 text-xs font-medium ${
                isSimulatedRecord ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={!isSimulatedRecord && verifiedByUser}
                disabled={isSimulatedRecord}
                onChange={(e) => {
                  setVerifiedByUser(e.target.checked);
                  setUserConfirmedVerifyAfterEdit(e.target.checked);
                }}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-50"
              />
              <span>
                {isSimulatedRecord ? t.modal.verifyDisabledSim : t.modal.verifyCheckboxLabel}
              </span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                {t.modal.saveBtn}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
