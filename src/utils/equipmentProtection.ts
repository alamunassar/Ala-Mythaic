import {
  getFieldProvenance,
  normalizeProvenance,
  resolveEquipmentProvenance,
} from '../engine/engineeringEngine.ts';
import type {
  DataProvenance,
  EquipmentCategory,
  EquipmentSpec,
} from '../types/mithaq.ts';
import { getTranslations, ltr, type Language } from '../i18n/translations.ts';
import {
  CATEGORY_FIELD_DEFINITIONS,
  filterUnreadableFieldsByCategory,
  getCategoryFieldLabel,
  type SpecFieldKey,
} from './categorySpecs.ts';

export type TrackedEquipmentFieldKey = SpecFieldKey | 'quantity';

export const TRACKED_EQUIPMENT_FIELDS: readonly TrackedEquipmentFieldKey[] = [
  'manufacturer',
  'model',
  'quantity',
  'ratedPowerW',
  'capacityKwh',
  'nominalVoltageV',
  'vocV',
  'vmpV',
  'iscA',
  'impA',
  'tempCoeffVocPctPerC',
  'maxPvInputVoltageV',
  'mpptMinV',
  'mpptMaxV',
  'maxPvOperatingCurrentA',
  'maxPvShortCircuitCurrentA',
  'minBatteryVoltageV',
  'maxBatteryVoltageV',
  'serialNumber',
  'additionalSpecs',
];

export function isProtectedVerifiedRecord(
  spec: EquipmentSpec | undefined | null,
  projectIsDemo = false,
): boolean {
  if (!spec) return false;
  const recordProv = resolveEquipmentProvenance(spec, projectIsDemo);
  if (recordProv === 'USER_VERIFIED' || recordProv === 'DATASHEET_VERIFIED') {
    return true;
  }
  return Object.values(spec.fieldProvenance ?? {}).some((fp) => {
    const norm = normalizeProvenance(fp);
    return norm === 'USER_VERIFIED' || norm === 'DATASHEET_VERIFIED';
  });
}

function isEmptySpecValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'number') return !Number.isFinite(value);
  return false;
}

function formatDiffValue(value: unknown, unit?: string, lang: Language = 'en'): string {
  const tr = getTranslations(lang);
  if (isEmptySpecValue(value)) return tr.common.missing;
  if (!unit) return String(value);
  const localizedUnit = unit === 'units' ? tr.common.units : unit;
  if (lang === 'ar') {
    return unit === 'units' ? `${ltr(String(value))} ${localizedUnit}` : ltr(`${value} ${unit}`);
  }
  return `${value} ${localizedUnit}`;
}

function areFieldValuesEqual(a: unknown, b: unknown): boolean {
  const emptyA = isEmptySpecValue(a);
  const emptyB = isEmptySpecValue(b);
  if (emptyA && emptyB) return true;
  if (emptyA !== emptyB) return false;
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b;
  }
  return String(a).trim() === String(b).trim();
}

export interface ExtractionFieldDiff {
  key: TrackedEquipmentFieldKey;
  label: string;
  existingValue: string;
  proposedValue: string;
}

export interface ExtractionConflict {
  category: EquipmentCategory;
  existing: EquipmentSpec;
  proposed: EquipmentSpec;
  changedFields: ExtractionFieldDiff[];
}

export interface ExtractionMergePlan {
  nextEquipment: EquipmentSpec[];
  autoAppliedCategories: EquipmentCategory[];
  preservedUnchangedCategories: EquipmentCategory[];
  conflicts: ExtractionConflict[];
}

export function computeExtractionFieldDiffs(
  existing: EquipmentSpec,
  proposed: EquipmentSpec,
  lang: Language = 'en',
): ExtractionFieldDiff[] {
  const tr = getTranslations(lang);
  const diffs: ExtractionFieldDiff[] = [];

  if (!areFieldValuesEqual(existing.quantity, proposed.quantity)) {
    diffs.push({
      key: 'quantity',
      label: tr.modal.quantityLabel,
      existingValue: formatDiffValue(existing.quantity, 'units', lang),
      proposedValue: formatDiffValue(proposed.quantity, 'units', lang),
    });
  }

  for (const def of CATEGORY_FIELD_DEFINITIONS[existing.category]) {
    const existingVal = existing[def.key as keyof EquipmentSpec];
    const proposedVal = proposed[def.key as keyof EquipmentSpec];
    if (!areFieldValuesEqual(existingVal, proposedVal)) {
      diffs.push({
        key: def.key,
        label: getCategoryFieldLabel(existing.category, def.key, lang),
        existingValue: formatDiffValue(existingVal, def.unit, lang),
        proposedValue: formatDiffValue(proposedVal, def.unit, lang),
      });
    }
  }

  return diffs;
}

export function planEquipmentExtractionMerge(
  existing: EquipmentSpec[],
  incoming: EquipmentSpec[],
  projectIsDemo = false,
  lang: Language = 'en',
): ExtractionMergePlan {
  // Deduplicate incoming specs per category (keep latest extracted entry per category)
  const incomingByCategory = new Map<EquipmentCategory, EquipmentSpec>();
  for (const item of incoming) {
    incomingByCategory.set(item.category, item);
  }

  const nextByCategory = new Map<EquipmentCategory, EquipmentSpec>();
  for (const item of existing) {
    if (!nextByCategory.has(item.category)) {
      nextByCategory.set(item.category, item);
    }
  }

  const autoAppliedCategories: EquipmentCategory[] = [];
  const preservedUnchangedCategories: EquipmentCategory[] = [];
  const conflicts: ExtractionConflict[] = [];

  for (const [category, proposed] of incomingByCategory.entries()) {
    const existingRecord = nextByCategory.get(category);
    if (!existingRecord) {
      nextByCategory.set(category, proposed);
      autoAppliedCategories.push(category);
      continue;
    }

    if (isProtectedVerifiedRecord(existingRecord, projectIsDemo)) {
      conflicts.push({
        category,
        existing: existingRecord,
        proposed,
        changedFields: computeExtractionFieldDiffs(existingRecord, proposed, lang),
      });
      continue;
    }

    nextByCategory.set(category, proposed);
    autoAppliedCategories.push(category);
  }

  for (const item of existing) {
    if (!incomingByCategory.has(item.category)) {
      preservedUnchangedCategories.push(item.category);
    }
  }

  return {
    nextEquipment: Array.from(nextByCategory.values()),
    autoAppliedCategories,
    preservedUnchangedCategories,
    conflicts,
  };
}

export function resolveConflictKeepExisting(
  existingList: EquipmentSpec[],
  _conflict: ExtractionConflict,
): EquipmentSpec[] {
  return existingList;
}

export function resolveConflictFillMissingOnly(
  existingList: EquipmentSpec[],
  conflict: ExtractionConflict,
  projectIsDemo = false,
): EquipmentSpec[] {
  const { existing, proposed, category } = conflict;
  const merged: EquipmentSpec = {
    ...existing,
    fieldProvenance: { ...(existing.fieldProvenance ?? {}) },
  };
  const nextFieldProv = merged.fieldProvenance!;

  const fillFieldIfMissing = (key: TrackedEquipmentFieldKey) => {
    const curVal = merged[key as keyof EquipmentSpec];
    const propVal = proposed[key as keyof EquipmentSpec];
    if (isEmptySpecValue(curVal) && !isEmptySpecValue(propVal)) {
      (merged as unknown as Record<string, unknown>)[key] = propVal;
      if (!projectIsDemo && resolveEquipmentProvenance(existing, projectIsDemo) !== 'SIMULATED') {
        nextFieldProv[key] = 'AI_EXTRACTED';
      }
    }
  };

  fillFieldIfMissing('quantity');
  for (const def of CATEGORY_FIELD_DEFINITIONS[category]) {
    fillFieldIfMissing(def.key);
  }

  if (!merged.sourceImagePreview && proposed.sourceImagePreview) {
    merged.sourceImagePreview = proposed.sourceImagePreview;
  }
  if (!merged.originalAiExtraction && proposed.originalAiExtraction) {
    merged.originalAiExtraction = proposed.originalAiExtraction;
  }

  const allowedDefs = CATEGORY_FIELD_DEFINITIONS[category];
  merged.unreadableFields = filterUnreadableFieldsByCategory(
    category,
    merged.unreadableFields,
  ).filter((label) => {
    const matchingDef = allowedDefs.find(
      (d) =>
        d.label.toLowerCase() === label.toLowerCase() ||
        label.toLowerCase().includes(d.key.toLowerCase()),
    );
    if (!matchingDef) return true;
    return isEmptySpecValue(merged[matchingDef.key as keyof EquipmentSpec]);
  });

  const withoutCategory = existingList.filter((e) => e.category !== category);
  return [...withoutCategory, merged];
}

export function resolveConflictReplaceWithProposed(
  existingList: EquipmentSpec[],
  conflict: ExtractionConflict,
): EquipmentSpec[] {
  const withoutCategory = existingList.filter((e) => e.category !== conflict.category);
  return [...withoutCategory, conflict.proposed];
}

export interface ManualEditProvenanceInput {
  initialSpec?: EquipmentSpec;
  baselineValues: Record<string, unknown>;
  nextValues: Record<string, unknown>;
  nextQuantity: number | null;
  workingFieldProvenance: Partial<Record<string, DataProvenance>>;
  datasheetFileName?: string;
  verifiedByUser: boolean;
  isSimulatedRecord: boolean;
  projectIsDemo?: boolean;
}

export interface ManualEditProvenanceResult {
  provenance: DataProvenance;
  fieldProvenance: Partial<Record<string, DataProvenance>>;
  verifiedByUser: boolean;
  manuallyEditedFields: TrackedEquipmentFieldKey[];
}

export function extractTrackedFieldValues(
  spec?: Partial<EquipmentSpec> | null,
): Record<TrackedEquipmentFieldKey, unknown> {
  return {
    manufacturer: spec?.manufacturer ?? null,
    model: spec?.model ?? null,
    quantity: spec?.quantity ?? null,
    ratedPowerW: spec?.ratedPowerW ?? null,
    capacityKwh: spec?.capacityKwh ?? null,
    nominalVoltageV: spec?.nominalVoltageV ?? null,
    vocV: spec?.vocV ?? null,
    vmpV: spec?.vmpV ?? null,
    iscA: spec?.iscA ?? null,
    impA: spec?.impA ?? null,
    tempCoeffVocPctPerC: spec?.tempCoeffVocPctPerC ?? null,
    maxPvInputVoltageV: spec?.maxPvInputVoltageV ?? null,
    mpptMinV: spec?.mpptMinV ?? null,
    mpptMaxV: spec?.mpptMaxV ?? null,
    maxPvOperatingCurrentA: spec?.maxPvOperatingCurrentA ?? null,
    maxPvShortCircuitCurrentA: spec?.maxPvShortCircuitCurrentA ?? null,
    minBatteryVoltageV: spec?.minBatteryVoltageV ?? null,
    maxBatteryVoltageV: spec?.maxBatteryVoltageV ?? null,
    serialNumber: spec?.serialNumber ?? null,
    additionalSpecs: spec?.additionalSpecs ?? null,
  };
}

export function resolveManualEditProvenance(
  input: ManualEditProvenanceInput,
): ManualEditProvenanceResult {
  const {
    initialSpec,
    baselineValues,
    nextValues,
    nextQuantity,
    workingFieldProvenance,
    datasheetFileName,
    verifiedByUser,
    isSimulatedRecord,
    projectIsDemo = false,
  } = input;

  if (isSimulatedRecord) {
    return {
      provenance: 'SIMULATED',
      fieldProvenance: {},
      verifiedByUser: false,
      manuallyEditedFields: [],
    };
  }

  const effectiveNextValues: Record<string, unknown> = {
    ...nextValues,
    quantity: nextQuantity,
  };

  const manuallyEditedFields: TrackedEquipmentFieldKey[] = [];
  for (const key of TRACKED_EQUIPMENT_FIELDS) {
    if (!areFieldValuesEqual(baselineValues[key], effectiveNextValues[key])) {
      manuallyEditedFields.push(key);
    }
  }

  const editedSet = new Set<string>(manuallyEditedFields);
  const nextFieldProvenance: Partial<Record<string, DataProvenance>> = {
    ...workingFieldProvenance,
  };

  if (verifiedByUser) {
    // Explicit user verification: preserve DATASHEET_VERIFIED overrides on unedited datasheet fields,
    // clear stale MANUAL_ENTRY overrides so fields resolve as USER_VERIFIED.
    for (const key of TRACKED_EQUIPMENT_FIELDS) {
      if (isEmptySpecValue(effectiveNextValues[key])) {
        delete nextFieldProvenance[key];
      } else if (editedSet.has(key)) {
        nextFieldProvenance[key] = 'USER_VERIFIED';
      } else if (nextFieldProvenance[key] === 'MANUAL_ENTRY') {
        delete nextFieldProvenance[key];
      }
    }
    return {
      provenance: 'USER_VERIFIED',
      fieldProvenance: nextFieldProvenance,
      verifiedByUser: true,
      manuallyEditedFields,
    };
  }

  // Not verifiedByUser: mark edited fields as MANUAL_ENTRY and preserve unedited fields' provenance
  const baselineRecordProv: DataProvenance = initialSpec
    ? resolveEquipmentProvenance(initialSpec, projectIsDemo)
    : 'MANUAL_ENTRY';

  // Determine record-level provenance WITHOUT falsely marking an edited record USER_VERIFIED
  let resolvedRecordProvenance: DataProvenance;
  if (!initialSpec) {
    const anyPopulated = TRACKED_EQUIPMENT_FIELDS.some(
      (k) => !isEmptySpecValue(effectiveNextValues[k]),
    );
    const anyManual =
      manuallyEditedFields.some((k) => !isEmptySpecValue(effectiveNextValues[k])) ||
      !datasheetFileName;
    resolvedRecordProvenance =
      datasheetFileName && anyPopulated && !anyManual ? 'DATASHEET_VERIFIED' : 'MANUAL_ENTRY';
  } else if (baselineRecordProv === 'AI_EXTRACTED') {
    resolvedRecordProvenance = 'AI_EXTRACTED';
  } else if (baselineRecordProv === 'DATASHEET_VERIFIED') {
    resolvedRecordProvenance =
      manuallyEditedFields.length > 0 ? 'MANUAL_ENTRY' : 'DATASHEET_VERIFIED';
  } else if (baselineRecordProv === 'USER_VERIFIED') {
    // Either user unchecked verifiedByUser or edited fields without re-confirming
    resolvedRecordProvenance = 'MANUAL_ENTRY';
  } else {
    resolvedRecordProvenance = 'MANUAL_ENTRY';
  }

  for (const key of TRACKED_EQUIPMENT_FIELDS) {
    const currentVal = effectiveNextValues[key];
    if (isEmptySpecValue(currentVal)) {
      delete nextFieldProvenance[key];
      continue;
    }

    if (editedSet.has(key)) {
      nextFieldProvenance[key] = 'MANUAL_ENTRY';
      continue;
    }

    // Unedited populated field: preserve existing field provenance or materialize initial record provenance
    if (!nextFieldProvenance[key] && initialSpec) {
      const priorFieldProv = getFieldProvenance(initialSpec, key, projectIsDemo);
      if (priorFieldProv !== resolvedRecordProvenance) {
        nextFieldProvenance[key] = priorFieldProv;
      }
    }
  }

  return {
    provenance: resolvedRecordProvenance,
    fieldProvenance: nextFieldProvenance,
    verifiedByUser: false,
    manuallyEditedFields,
  };
}
