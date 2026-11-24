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
import {
  CATEGORY_LABELS,
  detectSimulatedMarkers,
  normalizeProvenance,
} from '../engine/engineeringEngine';
import { safeFetchJson } from '../utils/api';
import {
  CATEGORY_FIELD_DEFINITIONS,
  filterUnreadableFieldsByCategory,
  sanitizeSpecFieldsByCategory,
} from '../utils/categorySpecs';

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
    ? detectSimulatedMarkers(initialSpec, projectIsDemo).length > 0
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
      let fileName = datasheetFile?.name;

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
        setDatasheetError(
          result.error ??
            'Datasheet extraction failed. Enter missing specifications manually below.',
        );
        return;
      }

      const ds = sanitizeSpecFieldsByCategory(category, result.data);
      const filledFields: string[] = [];
      const nextFieldProv: Partial<Record<string, DataProvenance>> = { ...fieldProvenance };

      const fillStr = (
        fieldKey: string,
        current: string,
        setter: (v: string) => void,
        val: unknown,
        label: string,
      ) => {
        if (!current.trim() && typeof val === 'string' && val.trim()) {
          setter(val.trim());
          filledFields.push(label);
          nextFieldProv[fieldKey] = 'DATASHEET_VERIFIED';
        }
      };
      const fillNum = (
        fieldKey: string,
        current: string,
        setter: (v: string) => void,
        val: unknown,
        label: string,
      ) => {
        if (!current.trim() && typeof val === 'number' && Number.isFinite(val)) {
          setter(String(val));
          filledFields.push(label);
          nextFieldProv[fieldKey] = 'DATASHEET_VERIFIED';
        }
      };

      fillStr('manufacturer', manufacturer, setManufacturer, ds.manufacturer, 'Manufacturer');
      fillStr('model', model, setModel, ds.model, 'Model');

      if (category === 'PV_MODULE') {
        fillNum('ratedPowerW', ratedPowerW, setRatedPowerW, ds.ratedPowerW, 'Rated Power (W)');
        fillNum('vocV', vocV, setVocV, ds.vocV, 'Voc (V)');
        fillNum('vmpV', vmpV, setVmpV, ds.vmpV, 'Vmp (V)');
        fillNum('iscA', iscA, setIscA, ds.iscA, 'Isc (A)');
        fillNum('impA', impA, setImpA, ds.impA, 'Imp (A)');
        fillNum(
          'tempCoeffVocPctPerC',
          tempCoeff,
          setTempCoeff,
          ds.tempCoeffVocPctPerC,
          'Temp. Coeff of Voc',
        );
      } else if (category === 'INVERTER') {
        fillNum('ratedPowerW', ratedPowerW, setRatedPowerW, ds.ratedPowerW, 'Rated Power (W)');
        fillNum(
          'nominalVoltageV',
          nominalVoltageV,
          setNominalVoltageV,
          ds.nominalVoltageV,
          'Nominal Battery Voltage',
        );
        fillNum(
          'minBatteryVoltageV',
          minBatteryVoltageV,
          setMinBatteryVoltageV,
          ds.minBatteryVoltageV,
          'Min Battery Voltage',
        );
        fillNum(
          'maxBatteryVoltageV',
          maxBatteryVoltageV,
          setMaxBatteryVoltageV,
          ds.maxBatteryVoltageV,
          'Max Battery Voltage',
        );
        fillNum(
          'maxPvInputVoltageV',
          maxPvInputVoltageV,
          setMaxPvInputVoltageV,
          ds.maxPvInputVoltageV,
          'Max PV Input Voltage',
        );
        fillNum(
          'maxPvOperatingCurrentA',
          maxPvOperatingCurrentA,
          setMaxPvOperatingCurrentA,
          ds.maxPvOperatingCurrentA,
          'Max PV Operating Current',
        );
        fillNum(
          'maxPvShortCircuitCurrentA',
          maxPvShortCircuitCurrentA,
          setMaxPvShortCircuitCurrentA,
          ds.maxPvShortCircuitCurrentA,
          'Max PV Short-Circuit Current',
        );
        fillNum('mpptMinV', mpptMinV, setMpptMinV, ds.mpptMinV, 'MPPT Min Voltage');
        fillNum('mpptMaxV', mpptMaxV, setMpptMaxV, ds.mpptMaxV, 'MPPT Max Voltage');
      } else if (category === 'BATTERY') {
        fillNum(
          'nominalVoltageV',
          nominalVoltageV,
          setNominalVoltageV,
          ds.nominalVoltageV,
          'Nominal Voltage',
        );
        fillNum(
          'minBatteryVoltageV',
          minBatteryVoltageV,
          setMinBatteryVoltageV,
          ds.minBatteryVoltageV,
          'Min Operating Voltage',
        );
        fillNum(
          'maxBatteryVoltageV',
          maxBatteryVoltageV,
          setMaxBatteryVoltageV,
          ds.maxBatteryVoltageV,
          'Max Operating Voltage',
        );
        fillNum('capacityKwh', capacityKwh, setCapacityKwh, ds.capacityKwh, 'Capacity (kWh)');
      }

      if (typeof ds.additionalSpecs === 'string' && ds.additionalSpecs.trim()) {
        if (!additionalSpecs.trim()) {
          setAdditionalSpecs(ds.additionalSpecs.trim());
          filledFields.push('Additional Specs');
        }
      }

      setFieldProvenance(nextFieldProv);

      if (fileName) {
        setDatasheetFileName(fileName);
      } else if (!datasheetFileName) {
        setDatasheetFileName('Pasted Datasheet Text');
      }

      if (filledFields.length > 0) {
        setDatasheetSuccess(
          `Supplemented ${filledFields.length} missing field(s) from datasheet: ${filledFields.join(', ')}. Original AI nameplate read remains preserved.`,
        );
      } else {
        setDatasheetSuccess(
          'Datasheet parsed, and all missing fields either were not explicitly listed in the datasheet or are already populated.',
        );
      }
    } catch (err) {
      setDatasheetError(
        err instanceof Error ? err.message : 'Unable to read datasheet document.',
      );
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
        (d) => d.label.toLowerCase() === label.toLowerCase() || label.toLowerCase().includes(d.key.toLowerCase()),
      );
      if (!matchingDef) return true;
      const val = sanitized[matchingDef.key];
      return val === null || val === undefined || val === '';
    });

    const effectiveVerified = isSimulatedRecord ? false : verifiedByUser;
    const baseProvenance: DataProvenance = isSimulatedRecord
      ? 'SIMULATED'
      : effectiveVerified
        ? 'USER_VERIFIED'
        : datasheetFileName && !initialSpec?.originalAiExtraction
          ? 'DATASHEET_VERIFIED'
          : initialSpec
            ? normalizeProvenance(initialSpec.provenance)
            : 'MANUAL_ENTRY';

    const resolvedProvenance: DataProvenance =
      !isSimulatedRecord &&
      baseProvenance === 'USER_VERIFIED' &&
      !effectiveVerified
        ? 'MANUAL_ENTRY'
        : baseProvenance;

    const spec: EquipmentSpec = {
      id: initialSpec?.id ?? `eq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      manufacturer: (sanitized.manufacturer as string | null) ?? null,
      model: (sanitized.model as string | null) ?? null,
      quantity: toNumOrNull(quantity),
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
      provenance: resolvedProvenance,
      fieldProvenance,
      uncertainFields: effectiveVerified ? [] : initialSpec?.uncertainFields ?? [],
      unreadableFields: remainingUnreadable,
      sourceFileName: initialSpec?.sourceFileName,
      sourceImagePreview: initialSpec?.sourceImagePreview,
      datasheetFileName,
      originalAiExtraction: initialSpec?.originalAiExtraction,
      verifiedByUser: effectiveVerified,
    };
    onSave(spec);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {initialSpec ? 'Review & Edit' : 'Add'}{' '}
              {mode === 'PROMISED' ? 'Promised Quotation Equipment' : 'Installed Nameplate Equipment'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Leave blank if unknown. MITHAQ-Lab never assumes missing technical parameters.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {isSimulatedRecord && (
            <div className="bg-amber-50 border border-amber-300 rounded-md p-3 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">
                  SIMULATED / PROTOTYPE DATA DETECTED — CANNOT BE MARKED AS VERIFIED REAL EQUIPMENT
                </div>
                <p className="text-[11px] text-amber-900">
                  {simulatedReasons.join('. ')}. This record is locked to{' '}
                  <span className="font-mono font-semibold">SIMULATED</span> provenance.
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
                    <span className="font-semibold">Uncertain extraction fields:</span>{' '}
                    {initialSpec.uncertainFields.join(', ')}
                  </p>
                )}
                {filteredUnreadable.length > 0 && (
                  <p>
                    <span className="font-semibold">
                      Missing / unreadable on {CATEGORY_LABELS[category]} nameplate:
                    </span>{' '}
                    {filteredUnreadable.join(', ')}
                  </p>
                )}
                <p className="text-[11px] text-amber-800">
                  Enter any verified values manually below or upload the manufacturer datasheet.
                </p>
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
                  Original AI Nameplate Extraction (Preserved Read-Only Reference)
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
                    <span>Category: {CATEGORY_LABELS[originalSnapshot.category]}</span>
                    {originalSnapshot.sourceFileName && (
                      <span>Photo: {originalSnapshot.sourceFileName}</span>
                    )}
                    <span>Read at: {new Date(originalSnapshot.extractedAt).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                    {CATEGORY_FIELD_DEFINITIONS[originalSnapshot.category]
                      .filter((d) => d.key !== 'additionalSpecs')
                      .map((def) => {
                        const rawVal =
                          originalSnapshot.fields[
                            def.key as keyof typeof originalSnapshot.fields
                          ];
                        return (
                          <div
                            key={def.key}
                            className="bg-white border border-slate-200 rounded px-2 py-1.5"
                          >
                            <div className="text-[10px] font-sans text-slate-500">{def.label}</div>
                            <div className="text-slate-900 font-medium truncate">
                              {rawVal !== null && rawVal !== undefined && rawVal !== ''
                                ? `${rawVal}${def.unit ? ` ${def.unit}` : ''}`
                                : 'Not readable'}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {originalSnapshot.confidenceNotes && (
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold">AI Label Notes:</span>{' '}
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
                  Upload Manufacturer Datasheet for Missing Specs (Optional)
                  {datasheetFileName && (
                    <span className="font-normal text-emerald-700">· {datasheetFileName}</span>
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
                    Upload the official {CATEGORY_LABELS[category]} datasheet (PDF, image, TXT, CSV)
                    or paste datasheet text to fill only missing specifications without overwriting
                    your original AI nameplate read.
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer whitespace-nowrap">
                      <FileUp className="w-3.5 h-3.5" />
                      {datasheetFile ? datasheetFile.name : 'Choose Datasheet File'}
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
                        ? 'Extracting Datasheet...'
                        : 'Extract Missing Specs from Datasheet'}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={datasheetRawText}
                    onChange={(e) => setDatasheetRawText(e.target.value)}
                    placeholder="Or paste datasheet specification table excerpt here..."
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
                Equipment Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="PV_MODULE">{CATEGORY_LABELS.PV_MODULE}</option>
                <option value="INVERTER">{CATEGORY_LABELS.INVERTER}</option>
                <option value="BATTERY">{CATEGORY_LABELS.BATTERY}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Quantity (Units)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 16"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Jinko Solar Co., Ltd."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Model Designation</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. JKM540M-72HL4-V"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {category === 'PV_MODULE' && (
            <div className="pt-3 border-t border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">
                Solar PV Module Electrical Specifications (STC)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Rated Power Pmax (W)</label>
                  <input
                    type="number"
                    step="any"
                    value={ratedPowerW}
                    onChange={(e) => setRatedPowerW(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Voc (V)</label>
                  <input
                    type="number"
                    step="any"
                    value={vocV}
                    onChange={(e) => setVocV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Vmp (V)</label>
                  <input
                    type="number"
                    step="any"
                    value={vmpV}
                    onChange={(e) => setVmpV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Isc (A)</label>
                  <input
                    type="number"
                    step="any"
                    value={iscA}
                    onChange={(e) => setIscA(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Imp (A)</label>
                  <input
                    type="number"
                    step="any"
                    value={impA}
                    onChange={(e) => setImpA(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Voc Temp Coeff (%/°C)</label>
                  <input
                    type="number"
                    step="any"
                    value={tempCoeff}
                    onChange={(e) => setTempCoeff(e.target.value)}
                    placeholder="e.g. -0.28"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {category === 'INVERTER' && (
            <div className="pt-3 border-t border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">
                Inverter Electrical Limits & Battery Bus
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Rated Power (W)</label>
                  <input
                    type="number"
                    step="any"
                    value={ratedPowerW}
                    onChange={(e) => setRatedPowerW(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Max PV Input Voltage (V)</label>
                  <input
                    type="number"
                    step="any"
                    value={maxPvInputVoltageV}
                    onChange={(e) => setMaxPvInputVoltageV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Max PV Operating Current (Imp, A)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={maxPvOperatingCurrentA}
                    onChange={(e) => setMaxPvOperatingCurrentA(e.target.value)}
                    placeholder="e.g. 22"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Max PV Short-Circuit Current (Isc, A)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={maxPvShortCircuitCurrentA}
                    onChange={(e) => setMaxPvShortCircuitCurrentA(e.target.value)}
                    placeholder="e.g. 26"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">MPPT Min Voltage (V)</label>
                  <input
                    type="number"
                    step="any"
                    value={mpptMinV}
                    onChange={(e) => setMpptMinV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">MPPT Max Voltage (V)</label>
                  <input
                    type="number"
                    step="any"
                    value={mpptMaxV}
                    onChange={(e) => setMpptMaxV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Nominal Battery Voltage (V)</label>
                  <input
                    type="number"
                    step="any"
                    value={nominalVoltageV}
                    onChange={(e) => setNominalVoltageV(e.target.value)}
                    placeholder="e.g. 48"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Minimum Battery Voltage (V)</label>
                  <input
                    type="number"
                    step="any"
                    value={minBatteryVoltageV}
                    onChange={(e) => setMinBatteryVoltageV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Maximum Battery Voltage (V)</label>
                  <input
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
                Battery Storage Specifications
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Capacity (kWh)</label>
                  <input
                    type="number"
                    step="any"
                    value={capacityKwh}
                    onChange={(e) => setCapacityKwh(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Nominal Voltage (V)</label>
                  <input
                    type="number"
                    step="any"
                    value={nominalVoltageV}
                    onChange={(e) => setNominalVoltageV(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Min Operating Voltage (V)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={minBatteryVoltageV}
                    onChange={(e) => setMinBatteryVoltageV(e.target.value)}
                    placeholder="e.g. 44.5"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    Max Operating Voltage (V)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={maxBatteryVoltageV}
                    onChange={(e) => setMaxBatteryVoltageV(e.target.value)}
                    placeholder="e.g. 53.5"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Max Power (W, optional)</label>
                  <input
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
                  Observed Serial Number (Optional)
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
            )}
            <div className={mode === 'INSTALLED' ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Technical Notes / Additional Markings
              </label>
              <input
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
                onChange={(e) => setVerifiedByUser(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-50"
              />
              <span>
                {isSimulatedRecord
                  ? 'Verification disabled for simulated/demo data'
                  : 'Confirmed against genuine source document or physical nameplate (USER_VERIFIED)'}
              </span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                Save Equipment Record
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
