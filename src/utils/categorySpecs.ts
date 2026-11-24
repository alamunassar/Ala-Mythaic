import type { EquipmentCategory, EquipmentSpec, OriginalAiExtractionSnapshot } from '../types/mithaq';

export type SpecFieldKey =
  | 'manufacturer'
  | 'model'
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
  | 'maxBatteryVoltageV'
  | 'serialNumber'
  | 'additionalSpecs';

export interface CategoryFieldDefinition {
  key: SpecFieldKey;
  label: string;
  unit?: string;
  aliases: string[];
}

export const CATEGORY_FIELD_DEFINITIONS: Record<EquipmentCategory, CategoryFieldDefinition[]> = {
  PV_MODULE: [
    { key: 'manufacturer', label: 'Manufacturer', aliases: ['manufacturer', 'brand', 'maker'] },
    { key: 'model', label: 'Model', aliases: ['model', 'model number', 'part number'] },
    { key: 'ratedPowerW', label: 'Rated Power (Pmax)', unit: 'W', aliases: ['ratedpowerw', 'pmax', 'rated power', 'wattage', 'max power'] },
    { key: 'vocV', label: 'Open-Circuit Voltage (Voc)', unit: 'V', aliases: ['vocv', 'voc', 'open circuit voltage', 'open-circuit voltage'] },
    { key: 'vmpV', label: 'Max Power Voltage (Vmp)', unit: 'V', aliases: ['vmpv', 'vmp', 'vmpp', 'max power voltage'] },
    { key: 'iscA', label: 'Short-Circuit Current (Isc)', unit: 'A', aliases: ['isca', 'isc', 'short circuit current', 'short-circuit current'] },
    { key: 'impA', label: 'Max Power Current (Imp)', unit: 'A', aliases: ['impa', 'imp', 'impp', 'max power current'] },
    {
      key: 'tempCoeffVocPctPerC',
      label: 'Temp. Coefficient of Voc',
      unit: '%/°C',
      aliases: ['tempcoeffvocpctperc', 'temp coeff', 'temperature coefficient', 'voc temp', 'beta voc'],
    },
    { key: 'serialNumber', label: 'Serial Number', aliases: ['serialnumber', 'serial', 's/n'] },
    { key: 'additionalSpecs', label: 'Additional Module Specs', aliases: ['additionalspecs', 'additional specs'] },
  ],
  INVERTER: [
    { key: 'manufacturer', label: 'Manufacturer', aliases: ['manufacturer', 'brand', 'maker'] },
    { key: 'model', label: 'Model', aliases: ['model', 'model number'] },
    { key: 'ratedPowerW', label: 'Rated Power', unit: 'W', aliases: ['ratedpowerw', 'rated power', 'ac power', 'output power'] },
    { key: 'nominalVoltageV', label: 'Nominal Battery Voltage', unit: 'V', aliases: ['nominalvoltagev', 'nominal battery voltage', 'battery nominal', 'dc bus voltage'] },
    { key: 'minBatteryVoltageV', label: 'Minimum Battery Voltage', unit: 'V', aliases: ['minbatteryvoltagev', 'minimum battery voltage', 'min battery voltage', 'battery min'] },
    { key: 'maxBatteryVoltageV', label: 'Maximum Battery Voltage', unit: 'V', aliases: ['maxbatteryvoltagev', 'maximum battery voltage', 'max battery voltage', 'battery max'] },
    { key: 'maxPvInputVoltageV', label: 'Maximum PV Input Voltage', unit: 'V', aliases: ['maxpvinputvoltagev', 'max pv input voltage', 'maximum pv input voltage', 'vdc max', 'max pv voltage'] },
    { key: 'maxPvOperatingCurrentA', label: 'Maximum PV Operating Current', unit: 'A', aliases: ['maxpvoperatingcurrenta', 'max pv operating current', 'maximum pv operating current', 'mppt current', 'operating current'] },
    { key: 'maxPvShortCircuitCurrentA', label: 'Maximum PV Short-Circuit Current', unit: 'A', aliases: ['maxpvshortcircuitcurrenta', 'max pv short-circuit current', 'maximum pv short-circuit current', 'max pv isc', 'short circuit current'] },
    { key: 'mpptMinV', label: 'MPPT Minimum Voltage', unit: 'V', aliases: ['mpptminv', 'mppt min', 'mppt minimum'] },
    { key: 'mpptMaxV', label: 'MPPT Maximum Voltage', unit: 'V', aliases: ['mpptmaxv', 'mppt max', 'mppt maximum'] },
    { key: 'serialNumber', label: 'Serial Number', aliases: ['serialnumber', 'serial', 's/n'] },
    { key: 'additionalSpecs', label: 'Additional Inverter Specs', aliases: ['additionalspecs', 'additional specs'] },
  ],
  BATTERY: [
    { key: 'manufacturer', label: 'Manufacturer', aliases: ['manufacturer', 'brand', 'maker'] },
    { key: 'model', label: 'Model', aliases: ['model', 'model number'] },
    { key: 'nominalVoltageV', label: 'Nominal Voltage', unit: 'V', aliases: ['nominalvoltagev', 'nominal voltage'] },
    { key: 'minBatteryVoltageV', label: 'Minimum Operating Voltage', unit: 'V', aliases: ['minbatteryvoltagev', 'minimum operating voltage', 'min operating voltage', 'discharge cut-off', 'min voltage'] },
    { key: 'maxBatteryVoltageV', label: 'Maximum Operating Voltage', unit: 'V', aliases: ['maxbatteryvoltagev', 'maximum operating voltage', 'max operating voltage', 'charge voltage', 'max voltage'] },
    { key: 'capacityKwh', label: 'Capacity', unit: 'kWh', aliases: ['capacitykwh', 'capacity', 'kwh', 'energy'] },
    { key: 'ratedPowerW', label: 'Rated Power (optional)', unit: 'W', aliases: ['ratedpowerw', 'rated power', 'max power'] },
    { key: 'serialNumber', label: 'Serial Number', aliases: ['serialnumber', 'serial', 's/n'] },
    { key: 'additionalSpecs', label: 'Additional Battery Specs', aliases: ['additionalspecs', 'additional specs'] },
  ],
};

const ALL_SPEC_KEYS: SpecFieldKey[] = [
  'manufacturer',
  'model',
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

const CROSS_CATEGORY_BLOCKLIST: Record<EquipmentCategory, string[]> = {
  PV_MODULE: [
    'capacitykwh',
    'capacity',
    'kwh',
    'nominalvoltage',
    'battery',
    'mppt',
    'maxpvinputvoltage',
    'maxpvoperatingcurrent',
    'maxpvshortcircuitcurrent',
    'minbatteryvoltage',
    'maxbatteryvoltage',
    'operating voltage range',
  ],
  INVERTER: [
    'capacitykwh',
    'kwh',
    'vocv',
    'vmpv',
    'isca',
    'impa',
    'tempcoeff',
    'temperature coefficient',
    'module voc',
    'module vmp',
  ],
  BATTERY: [
    'vocv',
    'vmpv',
    'isca',
    'impa',
    'tempcoeff',
    'temperature coefficient',
    'mppt',
    'maxpvinputvoltage',
    'maxpvoperatingcurrent',
    'maxpvshortcircuitcurrent',
    'pv input',
    'ratedpowerw',
  ],
};

export function getAllowedFieldKeys(category: EquipmentCategory): Set<SpecFieldKey> {
  return new Set(CATEGORY_FIELD_DEFINITIONS[category].map((d) => d.key));
}

export function filterUnreadableFieldsByCategory(
  category: EquipmentCategory,
  rawFields: unknown,
): string[] {
  if (!Array.isArray(rawFields)) return [];
  const blocklist = CROSS_CATEGORY_BLOCKLIST[category];
  const allowedDefs = CATEGORY_FIELD_DEFINITIONS[category];

  const cleaned: string[] = [];
  for (const item of rawFields) {
    const text = String(item ?? '').trim();
    if (!text) continue;
    const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Reject if it clearly refers to another category's forbidden field
    const matchesBlocklist = blocklist.some((blocked) => {
      const normBlocked = blocked.toLowerCase().replace(/[^a-z0-9]/g, '');
      // Avoid blocking "shortcircuitcurrent" for INVERTER when it's explicitly "maxpvshortcircuitcurrent"
      if (category === 'INVERTER' && (normBlocked === 'isca' || normBlocked === 'impa')) {
        return normalized === normBlocked || normalized === 'moduleisc' || normalized === 'moduleimp';
      }
      return normalized === normBlocked || (normBlocked.length >= 4 && normalized.includes(normBlocked));
    });

    if (matchesBlocklist) continue;

    // Normalize known field keys to clean human labels if exact key match
    const exactDef = allowedDefs.find(
      (d) => d.key.toLowerCase() === normalized || d.aliases.some((a) => a.replace(/[^a-z0-9]/g, '') === normalized),
    );
    const label = exactDef ? exactDef.label : text;
    if (!cleaned.includes(label)) {
      cleaned.push(label);
    }
  }
  return cleaned;
}

export function sanitizeSpecFieldsByCategory<T extends Record<string, unknown>>(
  category: EquipmentCategory,
  raw: T,
): T {
  const allowed = getAllowedFieldKeys(category);
  const next: Record<string, unknown> = { ...raw, category };

  for (const key of ALL_SPEC_KEYS) {
    if (!allowed.has(key)) {
      next[key] = null;
    }
  }

  if ('unreadableFields' in raw) {
    next.unreadableFields = filterUnreadableFieldsByCategory(category, raw.unreadableFields);
  }

  return next as T;
}

export const REQUIRED_OR_KEY_FIELDS: Record<EquipmentCategory, SpecFieldKey[]> = {
  PV_MODULE: [
    'manufacturer',
    'model',
    'ratedPowerW',
    'vocV',
    'vmpV',
    'iscA',
    'impA',
    'tempCoeffVocPctPerC',
  ],
  INVERTER: [
    'manufacturer',
    'model',
    'ratedPowerW',
    'nominalVoltageV',
    'minBatteryVoltageV',
    'maxBatteryVoltageV',
    'maxPvInputVoltageV',
    'maxPvOperatingCurrentA',
    'maxPvShortCircuitCurrentA',
    'mpptMinV',
    'mpptMaxV',
  ],
  BATTERY: [
    'manufacturer',
    'model',
    'nominalVoltageV',
    'minBatteryVoltageV',
    'maxBatteryVoltageV',
    'capacityKwh',
  ],
};

export function getMissingCategoryFields(spec: EquipmentSpec): CategoryFieldDefinition[] {
  const defs = CATEGORY_FIELD_DEFINITIONS[spec.category];
  const keySet = new Set(REQUIRED_OR_KEY_FIELDS[spec.category]);
  return defs.filter((def) => {
    if (!keySet.has(def.key)) return false;
    const val = spec[def.key as keyof EquipmentSpec];
    return val === null || val === undefined || (typeof val === 'string' && val.trim() === '');
  });
}

export function createOriginalAiSnapshot(
  category: EquipmentCategory,
  raw: Record<string, unknown>,
  fileName?: string,
): OriginalAiExtractionSnapshot {
  const sanitized = sanitizeSpecFieldsByCategory(category, raw);
  const strOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;
  const numOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

  return {
    extractedAt: new Date().toISOString(),
    category,
    sourceFileName: fileName,
    confidenceNotes: strOrNull(sanitized.confidenceNotes) ?? undefined,
    unreadableFields: Array.isArray(sanitized.unreadableFields)
      ? (sanitized.unreadableFields as string[])
      : [],
    fields: {
      manufacturer: strOrNull(sanitized.manufacturer),
      model: strOrNull(sanitized.model),
      ratedPowerW: numOrNull(sanitized.ratedPowerW),
      capacityKwh: numOrNull(sanitized.capacityKwh),
      nominalVoltageV: numOrNull(sanitized.nominalVoltageV),
      vocV: numOrNull(sanitized.vocV),
      vmpV: numOrNull(sanitized.vmpV),
      iscA: numOrNull(sanitized.iscA),
      impA: numOrNull(sanitized.impA),
      tempCoeffVocPctPerC: numOrNull(sanitized.tempCoeffVocPctPerC),
      maxPvInputVoltageV: numOrNull(sanitized.maxPvInputVoltageV),
      mpptMinV: numOrNull(sanitized.mpptMinV),
      mpptMaxV: numOrNull(sanitized.mpptMaxV),
      maxPvOperatingCurrentA: numOrNull(sanitized.maxPvOperatingCurrentA),
      maxPvShortCircuitCurrentA: numOrNull(sanitized.maxPvShortCircuitCurrentA),
      minBatteryVoltageV: numOrNull(sanitized.minBatteryVoltageV),
      maxBatteryVoltageV: numOrNull(sanitized.maxBatteryVoltageV),
      serialNumber: strOrNull(sanitized.serialNumber),
      additionalSpecs: strOrNull(sanitized.additionalSpecs),
    },
  };
}
