import { getTranslations, ltr, type Language } from '../i18n/translations';
import { localizeCategoryFieldText } from '../utils/categorySpecs';
import { localizeDemoManufacturer } from '../utils/demoLocalization';
import type {
  ArrayConfiguration,
  AuditSummary,
  ComparisonDifference,
  ComparisonEligibility,
  ComparisonStatus,
  DataProvenance,
  EngineeringCheckResult,
  EngineeringCheckStatus,
  EngineeringInputRole,
  EngineeringInputTrace,
  EquipmentCategory,
  EquipmentComparisonResult,
  EquipmentSpec,
  InputConfidenceLevel,
  MissingDataReport,
  MissingParameterEntry,
  SolarProject,
} from '../types/mithaq';

export const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  PV_MODULE: 'Solar PV Modules',
  INVERTER: 'Inverter',
  BATTERY: 'Battery Storage',
};

export function getCategoryLabel(category: EquipmentCategory, lang: Language = 'en'): string {
  return getTranslations(lang).categories[category];
}

const SIMULATED_TEXT_REGEX =
  /\b(SIMULATED(\s+DATA)?|DEMO(NSTRATION)?|PROTOTYPE|SYNTHETIC)\b/i;
const SIMULATED_MODEL_REGEX = /\bMD-10K-HYB\b/i;

export function normalizeProvenance(raw: string | null | undefined): DataProvenance {
  switch (raw) {
    case 'AI_EXTRACTED':
    case 'EXTRACTED_AI':
      return 'AI_EXTRACTED';
    case 'USER_VERIFIED':
      return 'USER_VERIFIED';
    case 'DATASHEET_VERIFIED':
      return 'DATASHEET_VERIFIED';
    case 'SIMULATED':
    case 'SIMULATED_DEMO':
      return 'SIMULATED';
    case 'MANUAL_ENTRY':
    case 'USER_ENTERED':
    default:
      return 'MANUAL_ENTRY';
  }
}

export function detectSimulatedMarkers(
  spec: Partial<EquipmentSpec> | undefined | null,
  projectIsDemo = false,
  lang: Language = 'en',
): string[] {
  const isAr = lang === 'ar';
  const t = <T>(en: T, ar: T): T => (isAr ? ar : en);
  const reasons: string[] = [];
  if (projectIsDemo) {
    reasons.push(
      t(
        'Project is flagged as a demonstration project',
        'المشروع مصنف كمشروع تجريبي بالمحاكاة',
      ),
    );
  }
  if (!spec) return reasons;

  if (spec.provenance === 'SIMULATED' || (spec.provenance as string) === 'SIMULATED_DEMO') {
    reasons.push(
      t(
        'Record provenance is marked SIMULATED',
        'مصدر السجل موسوم كبيانات محاكاة (SIMULATED)',
      ),
    );
  }
  if (typeof spec.id === 'string' && spec.id.startsWith('demo-')) {
    reasons.push(t('Demonstration record identifier', 'معرّف سجل تجريبي للمحاكاة'));
  }
  if (typeof spec.model === 'string' && SIMULATED_MODEL_REGEX.test(spec.model)) {
    const trimmedModel = spec.model.trim();
    reasons.push(
      t(
        `Model "${trimmedModel}" is a simulated demonstration model`,
        `الطراز "${isAr ? ltr(trimmedModel) : trimmedModel}" هو طراز محاكاة تجريبي`,
      ),
    );
  }

  const textFields: Array<{ enLabel: string; arLabel: string; value: string | null | undefined }> = [
    { enLabel: 'Technical notes', arLabel: 'الملاحظات الفنية', value: spec.additionalSpecs },
    { enLabel: 'Manufacturer', arLabel: 'الشركة المصنعة', value: spec.manufacturer },
    { enLabel: 'Model', arLabel: 'الطراز', value: spec.model },
    { enLabel: 'Serial number', arLabel: 'الرقم التسلسلي', value: spec.serialNumber },
    { enLabel: 'Datasheet reference', arLabel: 'مرجع النشرة الفنية', value: spec.datasheetFileName },
  ];

  for (const field of textFields) {
    if (typeof field.value === 'string' && SIMULATED_TEXT_REGEX.test(field.value)) {
      reasons.push(
        t(
          `${field.enLabel} contains simulated/demo/prototype marker`,
          `حقل ${field.arLabel} يحتوي على مؤشر محاكاة / تجريبي / نموذج أولي`,
        ),
      );
    }
  }

  return Array.from(new Set(reasons));
}

export function resolveEquipmentProvenance(
  spec: EquipmentSpec | undefined | null,
  projectIsDemo = false,
): DataProvenance {
  if (!spec) return 'MANUAL_ENTRY';
  if (detectSimulatedMarkers(spec, projectIsDemo).length > 0) {
    return 'SIMULATED';
  }
  const normalized = normalizeProvenance(spec.provenance);
  if (normalized === 'DATASHEET_VERIFIED') {
    return 'DATASHEET_VERIFIED';
  }
  if (normalized === 'USER_VERIFIED') {
    return spec.verifiedByUser ? 'USER_VERIFIED' : 'MANUAL_ENTRY';
  }
  if (normalized === 'AI_EXTRACTED') {
    return spec.verifiedByUser ? 'USER_VERIFIED' : 'AI_EXTRACTED';
  }
  // MANUAL_ENTRY: only becomes USER_VERIFIED if explicitly verified against a real document/nameplate
  return spec.verifiedByUser ? 'USER_VERIFIED' : 'MANUAL_ENTRY';
}

export function getFieldProvenance(
  spec: EquipmentSpec | undefined | null,
  fieldKey: string,
  projectIsDemo = false,
): DataProvenance {
  if (!spec) return 'MANUAL_ENTRY';
  const recordProv = resolveEquipmentProvenance(spec, projectIsDemo);
  if (recordProv === 'SIMULATED') return 'SIMULATED';
  const fieldOverride = spec.fieldProvenance?.[fieldKey];
  if (fieldOverride) {
    const norm = normalizeProvenance(fieldOverride);
    return norm === 'SIMULATED' ? 'SIMULATED' : norm;
  }
  return recordProv;
}

export function resolveArrayProvenance(
  config: ArrayConfiguration,
  projectIsDemo = false,
): DataProvenance {
  if (projectIsDemo) return 'SIMULATED';
  const norm = normalizeProvenance(config.provenance);
  return norm === 'SIMULATED' ? 'SIMULATED' : norm;
}

export function projectContainsSimulatedData(project: SolarProject): boolean {
  if (project.isDemo) return true;
  if (resolveArrayProvenance(project.arrayConfig, project.isDemo) === 'SIMULATED') return true;
  if (
    project.promisedEquipment.some(
      (eq) => resolveEquipmentProvenance(eq, project.isDemo) === 'SIMULATED',
    )
  ) {
    return true;
  }
  if (
    project.installedEquipment.some(
      (eq) => resolveEquipmentProvenance(eq, project.isDemo) === 'SIMULATED',
    )
  ) {
    return true;
  }
  if (
    project.fieldMeasurements.some(
      (m) =>
        Boolean(m.isSimulated) ||
        SIMULATED_TEXT_REGEX.test(m.notes ?? '') ||
        SIMULATED_TEXT_REGEX.test(m.parameter ?? ''),
    )
  ) {
    return true;
  }
  return false;
}

export function formatProvenance(p: DataProvenance | string, lang: Language = 'en'): string {
  const norm = normalizeProvenance(p);
  return getTranslations(lang).provenanceFull[norm];
}

export function shortProvenanceCode(p: DataProvenance | string): DataProvenance {
  return normalizeProvenance(p);
}

export function formatInputConfidence(
  level: InputConfidenceLevel,
  lang: Language = 'en',
): string {
  return getTranslations(lang).inputConfidence[level];
}

export function formatQualifiedResult(
  status: EngineeringCheckStatus,
  inputConfidence: InputConfidenceLevel,
  lang: Language = 'en',
): string {
  const tr = getTranslations(lang);
  if (status === 'INSUFFICIENT DATA') {
    return tr.statuses['INSUFFICIENT DATA'];
  }
  if (status === 'FAIL') {
    return tr.statuses.FAIL;
  }
  return `${tr.statuses[status]} — ${formatInputConfidence(inputConfidence, lang)}`;
}

export function resolveInputConfidence(
  status: EngineeringCheckStatus,
  inputs: EngineeringInputTrace[],
): InputConfidenceLevel {
  if (status === 'INSUFFICIENT DATA') {
    return 'INCOMPLETE_INPUTS';
  }

  // Evaluate critical equipment specifications actually used in the check,
  // plus flag if configuration inputs themselves were marked SIMULATED.
  const activeEquipmentInputs = inputs.filter(
    (i) => i.inputRole === 'EQUIPMENT_SPEC' && i.value !== null,
  );
  const anySimulated =
    activeEquipmentInputs.some((i) => i.provenance === 'SIMULATED') ||
    inputs.some((i) => i.provenance === 'SIMULATED');

  if (anySimulated) {
    return 'SIMULATED_INPUTS';
  }

  const anyUnverified = activeEquipmentInputs.some(
    (i) =>
      i.provenance === 'MANUAL_ENTRY' ||
      i.provenance === 'AI_EXTRACTED' ||
      i.provenance === 'MISSING',
  );

  if (anyUnverified) {
    return 'UNVERIFIED_INPUTS';
  }

  return 'VERIFIED_INPUTS';
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function formatNum(value: number | null | undefined, unit = '', lang: Language = 'en'): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return lang === 'ar' ? 'غير محدد' : 'Not specified';
  }
  if (!unit) return `${value}`;
  return lang === 'ar' ? ltr(`${value} ${unit}`) : `${value} ${unit}`;
}

function formatDisplayText(text: string, lang: Language): string {
  if (lang !== 'ar') return text;
  return /[\u0600-\u06FF]/.test(text) ? text : ltr(text);
}

function summarizeSpec(spec: EquipmentSpec | undefined, lang: Language = 'en'): string {
  if (!spec) return lang === 'ar' ? 'لا يوجد سجل' : 'No record provided';
  const parts: string[] = [];
  const mfg = localizeDemoManufacturer(spec.manufacturer, lang);
  if (mfg) parts.push(formatDisplayText(mfg, lang));
  if (spec.model) parts.push(lang === 'ar' ? ltr(spec.model) : spec.model);
  if (spec.ratedPowerW !== null) {
    parts.push(lang === 'ar' ? ltr(`${spec.ratedPowerW} W`) : `${spec.ratedPowerW} W`);
  }
  if (spec.capacityKwh !== null) {
    parts.push(lang === 'ar' ? ltr(`${spec.capacityKwh} kWh`) : `${spec.capacityKwh} kWh`);
  }
  if (spec.quantity !== null) {
    parts.push(lang === 'ar' ? `الكمية ${ltr(spec.quantity)}` : `Qty ${spec.quantity}`);
  }
  return parts.length > 0
    ? parts.join(' · ')
    : lang === 'ar'
      ? 'مواصفات غير مكتملة'
      : 'Incomplete specification';
}

export function comparePromisedVsInstalled(
  project: SolarProject,
  lang: Language = 'en',
): EquipmentComparisonResult[] {
  const isAr = lang === 'ar';
  const t = <T>(en: T, ar: T): T => (isAr ? ar : en);
  const unitTxt = isAr ? 'وحدة' : 'units';
  const categories: EquipmentCategory[] = ['PV_MODULE', 'INVERTER', 'BATTERY'];

  return categories
    .filter((category) => {
      if (category !== 'BATTERY') return true;
      const hasPromisedBattery = project.promisedEquipment.some((e) => e.category === 'BATTERY');
      const hasInstalledBattery = project.installedEquipment.some((e) => e.category === 'BATTERY');
      return project.systemType !== 'Grid-Tied' || hasPromisedBattery || hasInstalledBattery;
    })
    .map((category) => {
      const promised = project.promisedEquipment.find((e) => e.category === category);
      const installed = project.installedEquipment.find((e) => e.category === category);
      const label = getCategoryLabel(category, lang);

      if (!promised && !installed) {
        return {
          category,
          label,
          eligibility: 'NO_RECORDS' as ComparisonEligibility,
          status: 'NOT VERIFIED',
          promisedSummary: t('No promised equipment entered', 'لم يتم إدخال معدات موعودة'),
          installedSummary: t('No installed nameplate recorded', 'لم تُسجّل لوحة بيانات للمعدة المركبة'),
          differences: [],
          missingFields: t(
            ['Promised equipment record', 'Installed equipment nameplate'],
            ['سجل المعدات الموعودة', 'لوحة بيانات المعدات المركبة'],
          ),
        };
      }

      if (!promised && installed) {
        return {
          category,
          label,
          eligibility: 'UNQUOTED_INSTALLED' as ComparisonEligibility,
          status: 'NOT VERIFIED',
          promisedSummary: t('Not listed in quotation', 'غير مدرجة في عرض السعر'),
          installedSummary: summarizeSpec(installed, lang),
          differences: [
            {
              field: t('Quotation Coverage', 'تغطية عرض السعر'),
              promised: t('Absent from quotation', 'غير موجودة في عرض السعر'),
              installed: summarizeSpec(installed, lang),
              status: 'NOT VERIFIED',
              note: t(
                'Equipment is documented as installed, but no promised quotation line item exists. Excluded from Equipment Match %.',
                'تم توثيق تركيب المعدة في الموقع، لكن لا يوجد بند مقابل لها في عرض السعر. مستبعدة من نسبة تطابق المواصفات.',
              ),
            },
          ],
          missingFields: [
            t(
              'Contractual quotation specification for installed category',
              'مواصفات عرض السعر التعاقدي للفئة المركبة',
            ),
          ],
        };
      }

      if (promised && !installed) {
        return {
          category,
          label,
          eligibility: 'MISSING_INSTALLED' as ComparisonEligibility,
          status: 'NOT VERIFIED',
          promisedSummary: summarizeSpec(promised, lang),
          installedSummary: t('Not documented on site', 'غير موثقة في الموقع'),
          differences: [
            {
              field: t('Installed Documentation', 'توثيق التركيب'),
              promised: summarizeSpec(promised, lang),
              installed: t('No nameplate recorded', 'لم تُسجّل لوحة بيانات'),
              status: 'NOT VERIFIED',
              note: t(
                'Equipment was promised in the quotation, but no installed nameplate record has been logged. Excluded from Equipment Match %.',
                'المعدة موعودة في عرض السعر، لكن لم يتم تسجيل لوحة بيانات للمعدة المركبة. مستبعدة من نسبة تطابق المواصفات.',
              ),
            },
          ],
          missingFields: [
            t('Installed equipment nameplate record', 'سجل لوحة بيانات المعدة المركبة'),
          ],
        };
      }

      const p = promised!;
      const inst = installed!;
      const differences: ComparisonDifference[] = [];
      const missingFields: string[] = [];

      if (inst.unreadableFields.length > 0) {
        missingFields.push(
          ...inst.unreadableFields.map((f) => {
            const labelText = localizeCategoryFieldText(category, f, lang);
            return isAr
              ? `غير مقروء على لوحة البيانات: ${labelText}`
              : `Unreadable on nameplate: ${labelText}`;
          }),
        );
      }
      if (p.uncertainFields.length > 0) {
        missingFields.push(
          ...p.uncertainFields.map((f) => {
            const labelText = localizeCategoryFieldText(category, f, lang);
            return isAr
              ? `غير مؤكد في عرض السعر: ${labelText}`
              : `Uncertain in quotation: ${labelText}`;
          }),
        );
      }

      // 1. Manufacturer comparison
      const pMfg = normalizeText(p.manufacturer);
      const iMfg = normalizeText(inst.manufacturer);
      const missingStr = t('Missing', 'مفقود');
      const pMfgDisplay = p.manufacturer ? localizeDemoManufacturer(p.manufacturer, lang) : null;
      const iMfgDisplay = inst.manufacturer ? localizeDemoManufacturer(inst.manufacturer, lang) : null;
      if (!pMfg || !iMfg) {
        missingFields.push(t('Manufacturer', 'الشركة المصنعة'));
        differences.push({
          field: t('Manufacturer', 'الشركة المصنعة'),
          promised: pMfg && pMfgDisplay ? formatDisplayText(pMfgDisplay, lang) : missingStr,
          installed: iMfg && iMfgDisplay ? formatDisplayText(iMfgDisplay, lang) : missingStr,
          status: 'NOT VERIFIED',
          note: t(
            'Manufacturer is missing on quotation or installed record.',
            'اسم الشركة المصنعة مفقود في عرض السعر أو سجل التركيب.',
          ),
        });
      } else if (pMfg !== iMfg && !pMfg.includes(iMfg) && !iMfg.includes(pMfg)) {
        differences.push({
          field: t('Manufacturer', 'الشركة المصنعة'),
          promised: formatDisplayText(pMfgDisplay!, lang),
          installed: formatDisplayText(iMfgDisplay!, lang),
          status: 'MISMATCH',
          note: t(
            'Observed nameplate manufacturer differs from the quotation.',
            'الشركة المصنعة على لوحة البيانات المعاينة تختلف عن عرض السعر.',
          ),
        });
      } else {
        differences.push({
          field: t('Manufacturer', 'الشركة المصنعة'),
          promised: formatDisplayText(pMfgDisplay!, lang),
          installed: formatDisplayText(iMfgDisplay!, lang),
          status: 'MATCH',
          note: t('Manufacturer matches quotation.', 'الشركة المصنعة مطابقة لعرض السعر.'),
        });
      }

      // 2. Model comparison
      const pModel = normalizeText(p.model);
      const iModel = normalizeText(inst.model);
      if (!pModel || !iModel) {
        missingFields.push(t('Model Number', 'رقم الطراز'));
        differences.push({
          field: t('Model Number', 'رقم الطراز'),
          promised: pModel && p.model ? (isAr ? ltr(p.model) : p.model) : missingStr,
          installed: iModel && inst.model ? (isAr ? ltr(inst.model) : inst.model) : missingStr,
          status: 'NOT VERIFIED',
          note: t(
            'Model identifier missing in quotation or nameplate.',
            'معرّف الطراز مفقود في عرض السعر أو لوحة البيانات.',
          ),
        });
      } else if (pModel !== iModel) {
        differences.push({
          field: t('Model Number', 'رقم الطراز'),
          promised: isAr ? ltr(p.model!) : p.model!,
          installed: isAr ? ltr(inst.model!) : inst.model!,
          status: 'MISMATCH',
          note: t(
            'Installed equipment model differs from contractual quotation.',
            'طراز المعدة المركبة يختلف عن الطراز المتعاقد عليه في عرض السعر.',
          ),
        });
      } else {
        differences.push({
          field: t('Model Number', 'رقم الطراز'),
          promised: isAr ? ltr(p.model!) : p.model!,
          installed: isAr ? ltr(inst.model!) : inst.model!,
          status: 'MATCH',
          note: t('Exact model designation confirmed.', 'تم تأكيد تطابق الطراز بالكامل.'),
        });
      }

      // 3. Quantity comparison
      if (p.quantity === null || inst.quantity === null) {
        missingFields.push(t('Quantity', 'الكمية'));
        differences.push({
          field: t('Quantity', 'الكمية'),
          promised: formatNum(p.quantity, unitTxt, lang),
          installed: formatNum(inst.quantity, unitTxt, lang),
          status: 'NOT VERIFIED',
          note: t('Unit count is missing in one record.', 'عدد الوحدات مفقود في أحد السجلين.'),
        });
      } else if (inst.quantity !== p.quantity) {
        const diff = inst.quantity - p.quantity;
        differences.push({
          field: t('Quantity', 'الكمية'),
          promised: isAr ? `${ltr(p.quantity)} ${unitTxt}` : `${p.quantity} units`,
          installed: isAr ? `${ltr(inst.quantity)} ${unitTxt}` : `${inst.quantity} units`,
          status: diff < 0 ? 'MISMATCH' : 'WARNING',
          note:
            diff < 0
              ? t(
                  `Shortfall of ${Math.abs(diff)} unit(s) compared to quotation.`,
                  `نقص بمقدار ${ltr(Math.abs(diff))} وحدة مقارنة بعرض السعر.`,
                )
              : t(
                  `${diff} additional unit(s) installed compared to quotation.`,
                  `تركيب ${ltr(diff)} وحدة إضافية مقارنة بعرض السعر.`,
                ),
        });
      } else {
        differences.push({
          field: t('Quantity', 'الكمية'),
          promised: isAr ? `${ltr(p.quantity)} ${unitTxt}` : `${p.quantity} units`,
          installed: isAr ? `${ltr(inst.quantity)} ${unitTxt}` : `${inst.quantity} units`,
          status: 'MATCH',
          note: t('Installed unit quantity matches quotation.', 'الكمية المركبة مطابقة لعرض السعر.'),
        });
      }

      // 4. Rated Power (PV & Inverter)
      if (category === 'PV_MODULE' || category === 'INVERTER') {
        if (p.ratedPowerW === null || inst.ratedPowerW === null) {
          missingFields.push(t('Rated Power (W)', 'القدرة الاسمية (W)'));
          differences.push({
            field: t('Unit Rated Power', 'القدرة الاسمية للوحدة'),
            promised: formatNum(p.ratedPowerW, 'W', lang),
            installed: formatNum(inst.ratedPowerW, 'W', lang),
            status: 'NOT VERIFIED',
            note: t(
              'Rated power specification is missing on one record.',
              'قيمة القدرة الاسمية مفقودة في أحد السجلين.',
            ),
          });
        } else if (p.ratedPowerW <= 0) {
          differences.push({
            field: t('Unit Rated Power', 'القدرة الاسمية للوحدة'),
            promised: isAr ? ltr(`${p.ratedPowerW} W`) : `${p.ratedPowerW} W`,
            installed: isAr ? ltr(`${inst.ratedPowerW} W`) : `${inst.ratedPowerW} W`,
            status: 'NOT VERIFIED',
            note: t(
              'Promised rated power must be greater than zero for tolerance comparison.',
              'يجب أن تكون القدرة الاسمية الموعودة أكبر من الصفر لإجراء مقارنة التفاوت.',
            ),
          });
        } else {
          const deltaW = inst.ratedPowerW - p.ratedPowerW;
          const pct = Math.abs(deltaW) / p.ratedPowerW;
          if (pct > 0.02) {
            differences.push({
              field: t('Unit Rated Power', 'القدرة الاسمية للوحدة'),
              promised: isAr ? ltr(`${p.ratedPowerW} W`) : `${p.ratedPowerW} W`,
              installed: isAr ? ltr(`${inst.ratedPowerW} W`) : `${inst.ratedPowerW} W`,
              status: 'MISMATCH',
              note:
                deltaW < 0
                  ? t(
                      `Installed unit is ${Math.abs(deltaW)} W (${(pct * 100).toFixed(1)}%) lower than promised.`,
                      `قدرة الوحدة المركبة أقل بمقدار ${ltr(`${Math.abs(deltaW)} W`)} (${ltr(`${(pct * 100).toFixed(1)}%`)}) عن الموعود.`,
                    )
                  : t(
                      `Installed unit differs by +${deltaW} W (${(pct * 100).toFixed(1)}%).`,
                      `قدرة الوحدة المركبة تختلف بمقدار ${ltr(`+${deltaW} W`)} (${ltr(`${(pct * 100).toFixed(1)}%`)}).`,
                    ),
            });
          } else {
            differences.push({
              field: t('Unit Rated Power', 'القدرة الاسمية للوحدة'),
              promised: isAr ? ltr(`${p.ratedPowerW} W`) : `${p.ratedPowerW} W`,
              installed: isAr ? ltr(`${inst.ratedPowerW} W`) : `${inst.ratedPowerW} W`,
              status: 'MATCH',
              note: t('Rated power matches within tolerance.', 'القدرة الاسمية متطابقة ضمن حد السماحية.'),
            });
          }
        }
      }

      // 5. Total Capacity check (kWp for PV, kWh & Nominal V for Battery)
      if (
        category === 'PV_MODULE' &&
        p.ratedPowerW !== null &&
        p.quantity !== null &&
        inst.ratedPowerW !== null &&
        inst.quantity !== null
      ) {
        const pTotalKw = (p.ratedPowerW * p.quantity) / 1000;
        const iTotalKw = (inst.ratedPowerW * inst.quantity) / 1000;
        const deltaKw = iTotalKw - pTotalKw;
        differences.push({
          field: t('Total Array Capacity', 'السعة الإجمالية للمصفوفة'),
          promised: isAr ? ltr(`${pTotalKw.toFixed(2)} kWp`) : `${pTotalKw.toFixed(2)} kWp`,
          installed: isAr ? ltr(`${iTotalKw.toFixed(2)} kWp`) : `${iTotalKw.toFixed(2)} kWp`,
          status: Math.abs(deltaKw) > 0.05 ? 'MISMATCH' : 'MATCH',
          note:
            Math.abs(deltaKw) > 0.05
              ? t(
                  `Net array capacity difference of ${deltaKw > 0 ? '+' : ''}${deltaKw.toFixed(2)} kWp.`,
                  `فرق في صافي قدرة المصفوفة بمقدار ${ltr(`${deltaKw > 0 ? '+' : ''}${deltaKw.toFixed(2)} kWp`)}.`,
                )
              : t('Total array DC capacity matches quotation.', 'السعة الإجمالية للمصفوفة مطابقة لعرض السعر.'),
        });
      }

      if (category === 'BATTERY') {
        if (p.capacityKwh === null || inst.capacityKwh === null) {
          missingFields.push(t('Battery Unit Capacity (kWh)', 'سعة وحدة البطارية (kWh)'));
          differences.push({
            field: t('Unit Storage Capacity', 'سعة التخزين للوحدة'),
            promised: formatNum(p.capacityKwh, 'kWh', lang),
            installed: formatNum(inst.capacityKwh, 'kWh', lang),
            status: 'NOT VERIFIED',
            note: t(
              'Battery kWh rating is missing on one record.',
              'تصنيف سعة البطارية (kWh) مفقود في أحد السجلين.',
            ),
          });
        } else {
          const pTotalKwh = p.capacityKwh * (p.quantity ?? 1);
          const iTotalKwh = inst.capacityKwh * (inst.quantity ?? 1);
          const deltaKwh = iTotalKwh - pTotalKwh;
          differences.push({
            field: t('Total Battery Capacity', 'السعة التخزينية الإجمالية للبطاريات'),
            promised: isAr ? ltr(`${pTotalKwh.toFixed(2)} kWh`) : `${pTotalKwh.toFixed(2)} kWh`,
            installed: isAr ? ltr(`${iTotalKwh.toFixed(2)} kWh`) : `${iTotalKwh.toFixed(2)} kWh`,
            status: Math.abs(deltaKwh) > 0.1 ? 'MISMATCH' : 'MATCH',
            note:
              Math.abs(deltaKwh) > 0.1
                ? t(
                    `Total storage capacity variance of ${deltaKwh > 0 ? '+' : ''}${deltaKwh.toFixed(2)} kWh.`,
                    `انحراف في إجمالي السعة التخزينية بمقدار ${ltr(`${deltaKwh > 0 ? '+' : ''}${deltaKwh.toFixed(2)} kWh`)}.`,
                  )
                : t('Total storage capacity matches quotation.', 'إجمالي السعة التخزينية مطابق لعرض السعر.'),
          });
        }

        if (p.nominalVoltageV !== null || inst.nominalVoltageV !== null) {
          if (p.nominalVoltageV === null || inst.nominalVoltageV === null) {
            missingFields.push(t('Battery Nominal Voltage (V)', 'الجهد الاسمي للبطارية (V)'));
            differences.push({
              field: t('Nominal Voltage', 'الجهد الاسمي'),
              promised: formatNum(p.nominalVoltageV, 'V', lang),
              installed: formatNum(inst.nominalVoltageV, 'V', lang),
              status: 'NOT VERIFIED',
              note: t(
                'Battery nominal voltage is missing on one record.',
                'الجهد الاسمي للبطارية مفقود في أحد السجلين.',
              ),
            });
          } else {
            differences.push({
              field: t('Nominal Voltage', 'الجهد الاسمي'),
              promised: isAr ? ltr(`${p.nominalVoltageV} V`) : `${p.nominalVoltageV} V`,
              installed: isAr ? ltr(`${inst.nominalVoltageV} V`) : `${inst.nominalVoltageV} V`,
              status: p.nominalVoltageV === inst.nominalVoltageV ? 'MATCH' : 'MISMATCH',
              note:
                p.nominalVoltageV === inst.nominalVoltageV
                  ? t('Battery nominal voltage matches quotation.', 'الجهد الاسمي للبطارية مطابق لعرض السعر.')
                  : t('Battery nominal voltage differs from quotation.', 'الجهد الاسمي للبطارية يختلف عن عرض السعر.'),
            });
          }
        }
      }

      // 6. Electrical limits comparison for Inverter
      if (category === 'INVERTER') {
        if (p.maxPvInputVoltageV !== null || inst.maxPvInputVoltageV !== null) {
          if (p.maxPvInputVoltageV === null || inst.maxPvInputVoltageV === null) {
            missingFields.push(t('Inverter Max PV Input Voltage (V)', 'أقصى جهد دخل PV للعاكس (V)'));
            differences.push({
              field: t('Max PV Input Voltage', 'أقصى جهد دخل للخلايا'),
              promised: formatNum(p.maxPvInputVoltageV, 'V', lang),
              installed: formatNum(inst.maxPvInputVoltageV, 'V', lang),
              status: 'NOT VERIFIED',
              note: t(
                'Max PV input voltage rating is missing on one record.',
                'قيمة أقصى جهد دخل للخلايا مفقودة في أحد السجلين.',
              ),
            });
          } else {
            const vDiff = inst.maxPvInputVoltageV - p.maxPvInputVoltageV;
            differences.push({
              field: t('Max PV Input Voltage', 'أقصى جهد دخل للخلايا'),
              promised: isAr ? ltr(`${p.maxPvInputVoltageV} V`) : `${p.maxPvInputVoltageV} V`,
              installed: isAr ? ltr(`${inst.maxPvInputVoltageV} V`) : `${inst.maxPvInputVoltageV} V`,
              status: vDiff < 0 ? 'MISMATCH' : vDiff > 0 ? 'WARNING' : 'MATCH',
              note:
                vDiff < 0
                  ? t(
                      `Installed inverter has a lower PV voltage limit (${vDiff} V).`,
                      `العاكس المركب له حد جهد دخل أقل (${ltr(`${vDiff} V`)}).`,
                    )
                  : vDiff > 0
                    ? t(
                        `Installed inverter has a higher PV voltage limit (+${vDiff} V).`,
                        `العاكس المركب له حد جهد دخل أعلى (${ltr(`+${vDiff} V`)}).`,
                      )
                    : t('Max PV input voltage matches quotation.', 'أقصى جهد دخل للخلايا مطابق لعرض السعر.'),
            });
          }
        }

        if (p.nominalVoltageV !== null || inst.nominalVoltageV !== null) {
          if (p.nominalVoltageV === null || inst.nominalVoltageV === null) {
            missingFields.push(
              t('Inverter Nominal Battery / Bus Voltage (V)', 'الجهد الاسمي لناقل البطارية بالعاكس (V)'),
            );
            differences.push({
              field: t('Nominal Battery / Bus Voltage', 'الجهد الاسمي لناقل البطارية'),
              promised: formatNum(p.nominalVoltageV, 'V', lang),
              installed: formatNum(inst.nominalVoltageV, 'V', lang),
              status: 'NOT VERIFIED',
              note: t(
                'Nominal DC bus voltage is missing on one record.',
                'الجهد الاسمي لناقل التيار المستمر مفقود في أحد السجلين.',
              ),
            });
          } else {
            differences.push({
              field: t('Nominal Battery / Bus Voltage', 'الجهد الاسمي لناقل البطارية'),
              promised: isAr ? ltr(`${p.nominalVoltageV} V`) : `${p.nominalVoltageV} V`,
              installed: isAr ? ltr(`${inst.nominalVoltageV} V`) : `${inst.nominalVoltageV} V`,
              status: p.nominalVoltageV === inst.nominalVoltageV ? 'MATCH' : 'MISMATCH',
              note:
                p.nominalVoltageV === inst.nominalVoltageV
                  ? t('Nominal DC bus voltage matches.', 'الجهد الاسمي لناقل التيار المستمر متطابق.')
                  : t('Nominal DC bus voltage differs from quotation.', 'الجهد الاسمي لناقل التيار المستمر يختلف عن عرض السعر.'),
            });
          }
        }

        if (p.maxPvOperatingCurrentA !== null || inst.maxPvOperatingCurrentA !== null) {
          if (p.maxPvOperatingCurrentA === null || inst.maxPvOperatingCurrentA === null) {
            missingFields.push(
              t(
                'Inverter Max PV Operating Current (Imp limit)',
                'أقصى تيار تشغيل PV للعاكس (حد Imp)',
              ),
            );
            differences.push({
              field: t('Max PV Operating Current', 'أقصى تيار تشغيل للخلايا (Imp)'),
              promised: formatNum(p.maxPvOperatingCurrentA, 'A', lang),
              installed: formatNum(inst.maxPvOperatingCurrentA, 'A', lang),
              status: 'NOT VERIFIED',
              note: t(
                'Max PV operating current rating is missing on one record.',
                'تصنيف أقصى تيار تشغيل للخلايا مفقود في أحد السجلين.',
              ),
            });
          } else {
            const cDiff = inst.maxPvOperatingCurrentA - p.maxPvOperatingCurrentA;
            differences.push({
              field: t('Max PV Operating Current', 'أقصى تيار تشغيل للخلايا (Imp)'),
              promised: isAr ? ltr(`${p.maxPvOperatingCurrentA} A`) : `${p.maxPvOperatingCurrentA} A`,
              installed: isAr ? ltr(`${inst.maxPvOperatingCurrentA} A`) : `${inst.maxPvOperatingCurrentA} A`,
              status: cDiff < 0 ? 'MISMATCH' : cDiff > 0 ? 'WARNING' : 'MATCH',
              note:
                cDiff < 0
                  ? t(
                      `Installed inverter operating current limit is ${Math.abs(cDiff)} A lower than promised.`,
                      `حد تيار التشغيل في العاكس المركب أقل بمقدار ${ltr(`${Math.abs(cDiff)} A`)} عن الموعود.`,
                    )
                  : cDiff > 0
                    ? t(
                        `Installed inverter operating current limit is +${cDiff} A higher.`,
                        `حد تيار التشغيل في العاكس المركب أعلى بمقدار ${ltr(`+${cDiff} A`)}.`,
                      )
                    : t('Max PV operating current matches quotation.', 'أقصى تيار تشغيل للخلايا مطابق لعرض السعر.'),
            });
          }
        }

        if (p.maxPvShortCircuitCurrentA !== null || inst.maxPvShortCircuitCurrentA !== null) {
          if (
            p.maxPvShortCircuitCurrentA === null ||
            inst.maxPvShortCircuitCurrentA === null
          ) {
            missingFields.push(
              t(
                'Inverter Max PV Short-Circuit Current (Isc limit)',
                'أقصى تيار قصر PV للعاكس (حد Isc)',
              ),
            );
            differences.push({
              field: t('Max PV Short-Circuit Current', 'أقصى تيار قصر للخلايا (Isc)'),
              promised: formatNum(p.maxPvShortCircuitCurrentA, 'A', lang),
              installed: formatNum(inst.maxPvShortCircuitCurrentA, 'A', lang),
              status: 'NOT VERIFIED',
              note: t(
                'Max PV short-circuit current rating is missing on one record.',
                'تصنيف أقصى تيار قصر للخلايا مفقود في أحد السجلين.',
              ),
            });
          } else {
            const scDiff = inst.maxPvShortCircuitCurrentA - p.maxPvShortCircuitCurrentA;
            differences.push({
              field: t('Max PV Short-Circuit Current', 'أقصى تيار قصر للخلايا (Isc)'),
              promised: isAr ? ltr(`${p.maxPvShortCircuitCurrentA} A`) : `${p.maxPvShortCircuitCurrentA} A`,
              installed: isAr ? ltr(`${inst.maxPvShortCircuitCurrentA} A`) : `${inst.maxPvShortCircuitCurrentA} A`,
              status: scDiff < 0 ? 'MISMATCH' : scDiff > 0 ? 'WARNING' : 'MATCH',
              note:
                scDiff < 0
                  ? t(
                      `Installed inverter short-circuit current limit is ${Math.abs(scDiff)} A lower than promised.`,
                      `حد تيار القصر في العاكس المركب أقل بمقدار ${ltr(`${Math.abs(scDiff)} A`)} عن الموعود.`,
                    )
                  : scDiff > 0
                    ? t(
                        `Installed inverter short-circuit current limit is +${scDiff} A higher.`,
                        `حد تيار القصر في العاكس المركب أعلى بمقدار ${ltr(`+${scDiff} A`)}.`,
                      )
                    : t('Max PV short-circuit current matches quotation.', 'أقصى تيار قصر للخلايا مطابق لعرض السعر.'),
            });
          }
        }
      }

      // 7. Provenance completeness tracking
      const instProv = resolveEquipmentProvenance(inst, project.isDemo);
      if (instProv === 'AI_EXTRACTED') {
        missingFields.push(
          t(
            'User confirmation of AI-extracted nameplate fields',
            'تأكيد المستخدم لحقول لوحة البيانات المستخرجة بالذكاء الاصطناعي',
          ),
        );
      }

      let status: ComparisonStatus = 'MATCH';
      if (differences.some((d) => d.status === 'MISMATCH')) {
        status = 'MISMATCH';
      } else if (differences.some((d) => d.status === 'WARNING')) {
        status = 'WARNING';
      } else if (
        differences.some((d) => d.status === 'NOT VERIFIED') &&
        !differences.some((d) => d.status === 'MATCH')
      ) {
        status = 'NOT VERIFIED';
      } else if (
        differences.some((d) => d.status === 'NOT VERIFIED') ||
        missingFields.length > 0
      ) {
        status = 'NOT VERIFIED';
      }

      return {
        category,
        label,
        eligibility: 'ELIGIBLE' as ComparisonEligibility,
        status,
        promisedSummary: summarizeSpec(p, lang),
        installedSummary: summarizeSpec(inst, lang),
        differences,
        missingFields: Array.from(new Set(missingFields)),
      };
    });
}

function getFieldSourceTag(
  spec: EquipmentSpec | undefined,
  fieldKey: string,
  projectIsDemo: boolean,
  lang: Language = 'en',
): { source: string; provenance: DataProvenance | 'MISSING' } {
  const tags = getTranslations(lang).provenanceSourceTag;
  if (!spec) return { source: tags.missing, provenance: 'MISSING' };
  const prov = getFieldProvenance(spec, fieldKey, projectIsDemo);
  switch (prov) {
    case 'SIMULATED':
      return { source: tags.simulatedEquipment, provenance: prov };
    case 'DATASHEET_VERIFIED':
      return {
        source: spec.datasheetFileName
          ? `${tags.datasheetVerified} (${lang === 'ar' ? ltr(spec.datasheetFileName) : spec.datasheetFileName})`
          : tags.datasheetVerified,
        provenance: prov,
      };
    case 'USER_VERIFIED':
      return { source: tags.userVerified, provenance: prov };
    case 'AI_EXTRACTED':
      return { source: tags.aiExtracted, provenance: prov };
    case 'MANUAL_ENTRY':
      return { source: tags.manualEntry, provenance: prov };
  }
}

function getArraySourceTag(
  config: ArrayConfiguration,
  projectIsDemo: boolean,
  lang: Language = 'en',
): { source: string; provenance: DataProvenance } {
  const tr = getTranslations(lang);
  const prov = resolveArrayProvenance(config, projectIsDemo);
  if (prov === 'SIMULATED') {
    return { source: tr.provenanceSourceTag.simulatedArray, provenance: 'SIMULATED' };
  }
  return {
    source: `${tr.provenanceShort[prov]} (${tr.provenanceSourceTag.arrayInput})`,
    provenance: prov,
  };
}

function makeEquipmentTrace(
  label: string,
  symbol: string,
  value: number | null,
  unit: string,
  spec: EquipmentSpec | undefined,
  fieldKey: string,
  projectIsDemo: boolean,
  lang: Language = 'en',
): EngineeringInputTrace {
  const tag = getFieldSourceTag(spec, fieldKey, projectIsDemo, lang);
  return {
    label,
    symbol,
    value,
    unit,
    source: tag.source,
    inputRole: 'EQUIPMENT_SPEC' as EngineeringInputRole,
    provenance: value === null ? 'MISSING' : tag.provenance,
  };
}

function makeConfigTrace(
  label: string,
  symbol: string,
  value: number | null,
  unit: string,
  arrTag: { source: string; provenance: DataProvenance },
): EngineeringInputTrace {
  return {
    label,
    symbol,
    value,
    unit,
    source: arrTag.source,
    inputRole: 'CONFIGURATION' as EngineeringInputRole,
    provenance: value === null ? 'MISSING' : arrTag.provenance,
  };
}

function buildCheckResult(
  base: Omit<EngineeringCheckResult, 'inputConfidence' | 'qualifiedResult'>,
  lang: Language = 'en',
): EngineeringCheckResult {
  const inputConfidence = resolveInputConfidence(base.status, base.inputs);
  const qualifiedResult = formatQualifiedResult(base.status, inputConfidence, lang);
  return {
    ...base,
    inputConfidence,
    qualifiedResult,
  };
}

export function runEngineeringValidation(
  project: SolarProject,
  lang: Language = 'en',
): EngineeringCheckResult[] {
  const isAr = lang === 'ar';
  const t = <T>(en: T, ar: T): T => (isAr ? ar : en);
  const modUnit = t('modules', 'ألواح');
  const strUnit = t('strings', 'سلاسل');
  const missingTxt = t('Missing', 'مفقود');

  const pv = project.installedEquipment.find((e) => e.category === 'PV_MODULE');
  const inverter = project.installedEquipment.find((e) => e.category === 'INVERTER');
  const battery = project.installedEquipment.find((e) => e.category === 'BATTERY');
  const cfg = project.arrayConfig;
  const isDemo = project.isDemo;

  const arrTag = getArraySourceTag(cfg, isDemo, lang);

  const checks: EngineeringCheckResult[] = [];

  // 1. PV String STC Open-Circuit Voltage vs Inverter Max PV Input Voltage
  {
    const inputs: EngineeringInputTrace[] = [
      makeConfigTrace(t('Modules in Series', 'عدد الألواح على التوالي'), 'Ns', cfg.modulesPerString, modUnit, arrTag),
      makeEquipmentTrace(t('Module Voc (STC)', 'جهد الدائرة المفتوحة للوح (Voc)'), 'Voc_mod', pv?.vocV ?? null, 'V', pv, 'vocV', isDemo, lang),
      makeEquipmentTrace(
        t('Inverter Max PV Voltage', 'أقصى جهد دخل للعاكس'),
        'Vdc_max',
        inverter?.maxPvInputVoltageV ?? null,
        'V',
        inverter,
        'maxPvInputVoltageV',
        isDemo,
        lang,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${ltr(i.symbol)})`);

    if (
      missing.length > 0 ||
      !cfg.modulesPerString ||
      cfg.modulesPerString <= 0 ||
      !pv?.vocV ||
      pv.vocV <= 0 ||
      !inverter?.maxPvInputVoltageV ||
      inverter.maxPvInputVoltageV <= 0
    ) {
      checks.push(
        buildCheckResult({
          id: 'check-pv-voc-stc',
          title: t(
            'PV String Voltage (STC) vs. Inverter Max DC Input',
            'جهد الدائرة المفتوحة للسلسلة (STC) مقابل أقصى جهد دخل للعاكس',
          ),
          category: 'PV_STRING',
          status: 'INSUFFICIENT DATA',
          formula: 'Voc_string = Ns × Voc_mod ≤ Vdc_max',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'V',
          limitLabel: t('Inverter Max PV Input Voltage', 'أقصى جهد دخل للعاكس'),
          limitValue: inverter?.maxPvInputVoltageV
            ? (isAr ? ltr(`${inverter.maxPvInputVoltageV} V`) : `${inverter.maxPvInputVoltageV} V`)
            : missingTxt,
          missingInputs:
            missing.length > 0
              ? missing
              : [t('Valid positive Ns, Voc_mod, and Vdc_max', 'قيم موجبة صالحة لكل من Ns و Voc_mod و Vdc_max')],
          explanation: t(
            'Cannot validate string open-circuit voltage without valid series count, module Voc, and inverter Vdc_max.',
            'يتعذر التحقق من جهد الدائرة المفتوحة للسلسلة دون توفر عدد الألواح على التوالي وجهد Voc للوح وأقصى جهد Vdc_max للعاكس.',
          ),
        }, lang),
      );
    } else {
      const vocString = Number((cfg.modulesPerString * pv.vocV).toFixed(2));
      const limit = inverter.maxPvInputVoltageV;
      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = t(
        `String Voc (${vocString} V) is within the ${limit} V inverter maximum DC input limit with ${((1 - vocString / limit) * 100).toFixed(1)}% headroom.`,
        `جهد الدائرة المفتوحة للسلسلة (${ltr(`${vocString} V`)}) يقع ضمن الحد الأقصى لدخل العاكس (${ltr(`${limit} V`)}) بهامش أمان قدره ${ltr(`${((1 - vocString / limit) * 100).toFixed(1)}%`)}.`,
      );
      if (vocString > limit) {
        status = 'FAIL';
        explanation = t(
          `String Voc (${vocString} V) exceeds the inverter maximum PV input voltage (${limit} V) by ${(vocString - limit).toFixed(2)} V even at 25°C STC.`,
          `جهد الدائرة المفتوحة للسلسلة (${ltr(`${vocString} V`)}) يتجاوز الحد الأقصى لدخل العاكس (${ltr(`${limit} V`)}) بمقدار ${ltr(`${(vocString - limit).toFixed(2)} V`)} حتى عند ظروف STC (25°C).`,
        );
      } else if (vocString > limit * 0.9) {
        status = 'WARNING';
        explanation = t(
          `String Voc (${vocString} V) is above 90% of the ${limit} V inverter limit; low ambient temperatures could push Voc past Vdc_max.`,
          `جهد السلسلة (${ltr(`${vocString} V`)}) يتجاوز ${ltr('90%')} من حد العاكس (${ltr(`${limit} V`)})؛ قد تؤدي درجات الحرارة المنخفضة إلى تجاوز الحد الأقصى Vdc_max.`,
        );
      }
      checks.push(
        buildCheckResult({
          id: 'check-pv-voc-stc',
          title: t(
            'PV String Voltage (STC) vs. Inverter Max DC Input',
            'جهد الدائرة المفتوحة للسلسلة (STC) مقابل أقصى جهد دخل للعاكس',
          ),
          category: 'PV_STRING',
          status,
          formula: 'Voc_string = Ns × Voc_mod',
          inputs,
          calculatedValue: vocString,
          calculatedUnit: 'V',
          limitLabel: t('Inverter Max PV Input Voltage', 'أقصى جهد دخل للعاكس'),
          limitValue: isAr ? ltr(`≤ ${limit} V`) : `≤ ${limit} V`,
          missingInputs: [],
          explanation,
        }, lang),
      );
    }
  }

  // 2. Temperature-Corrected Cold-Weather Voc
  {
    const inputs: EngineeringInputTrace[] = [
      makeConfigTrace(t('Modules in Series', 'عدد الألواح على التوالي'), 'Ns', cfg.modulesPerString, modUnit, arrTag),
      makeEquipmentTrace(t('Module Voc (STC)', 'جهد الدائرة المفتوحة للوح (Voc)'), 'Voc_mod', pv?.vocV ?? null, 'V', pv, 'vocV', isDemo, lang),
      makeEquipmentTrace(
        t('Voc Temp. Coefficient', 'معامل الحرارة لجهد Voc'),
        'β_Voc',
        pv?.tempCoeffVocPctPerC ?? null,
        '%/°C',
        pv,
        'tempCoeffVocPctPerC',
        isDemo,
        lang,
      ),
      makeConfigTrace(t('Min Site Ambient Temp', 'أدنى حرارة محيطة بالموقع'), 'T_min', cfg.minAmbientTempC, '°C', arrTag),
      makeEquipmentTrace(
        t('Inverter Max PV Voltage', 'أقصى جهد دخل للعاكس'),
        'Vdc_max',
        inverter?.maxPvInputVoltageV ?? null,
        'V',
        inverter,
        'maxPvInputVoltageV',
        isDemo,
        lang,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${ltr(i.symbol)})`);

    if (
      missing.length > 0 ||
      cfg.modulesPerString === null ||
      cfg.modulesPerString <= 0 ||
      pv?.vocV === null ||
      pv?.vocV === undefined ||
      pv.vocV <= 0 ||
      pv?.tempCoeffVocPctPerC === null ||
      pv?.tempCoeffVocPctPerC === undefined ||
      cfg.minAmbientTempC === null ||
      inverter?.maxPvInputVoltageV === null ||
      inverter?.maxPvInputVoltageV === undefined ||
      inverter.maxPvInputVoltageV <= 0
    ) {
      checks.push(
        buildCheckResult({
          id: 'check-thermal-voc',
          title: t(
            'Temperature-Corrected Open-Circuit Voltage (Cold Weather)',
            'جهد الدائرة المفتوحة المصحح حرارياً (الطقس البارد)',
          ),
          category: 'THERMAL_VOC',
          status: 'INSUFFICIENT DATA',
          formula: 'Voc_cold = Ns × Voc_mod × [1 + (β_Voc / 100) × (T_min − 25)]',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'V',
          limitLabel: t('Inverter Max PV Input Voltage', 'أقصى جهد دخل للعاكس'),
          limitValue: inverter?.maxPvInputVoltageV
            ? (isAr ? ltr(`≤ ${inverter.maxPvInputVoltageV} V`) : `≤ ${inverter.maxPvInputVoltageV} V`)
            : missingTxt,
          missingInputs:
            missing.length > 0
              ? missing
              : [t('Valid positive Ns, Voc_mod, and Vdc_max', 'قيم موجبة صالحة لكل من Ns و Voc_mod و Vdc_max')],
          explanation: t(
            'MITHAQ-Lab never assumes temperature coefficients or ambient site temperatures. Enter all missing datasheet and climate inputs to run this check.',
            'لا تفترض MITHAQ-Lab معاملات الحرارة أو درجات الحرارة المناخية أبداً. أدخل جميع بيانات النشرة الفنية والمناخ المفقودة لتنفيذ هذا الفحص.',
          ),
        }, lang),
      );
    } else {
      const vocCold = Number(
        (
          cfg.modulesPerString *
          pv.vocV *
          (1 + (pv.tempCoeffVocPctPerC / 100) * (cfg.minAmbientTempC - cfg.stcTempC))
        ).toFixed(2),
      );
      const limit = inverter.maxPvInputVoltageV;
      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = t(
        `At ${cfg.minAmbientTempC}°C, temperature-corrected Voc is ${vocCold} V, remaining below the ${limit} V inverter limit.`,
        `عند درجة حرارة ${ltr(`${cfg.minAmbientTempC}°C`)}, يبلغ الجهد المصحح حرارياً ${ltr(`${vocCold} V`)} ويبقى دون الحد الأقصى للعاكس (${ltr(`${limit} V`)}).`,
      );
      if (vocCold > limit) {
        status = 'FAIL';
        explanation = t(
          `At ${cfg.minAmbientTempC}°C, temperature-corrected Voc (${vocCold} V) exceeds inverter Vdc_max (${limit} V) by ${(vocCold - limit).toFixed(2)} V.`,
          `عند درجة حرارة ${ltr(`${cfg.minAmbientTempC}°C`)}, يتجاوز الجهد المصحح حرارياً (${ltr(`${vocCold} V`)}) أقصى جهد دخل للعاكس (${ltr(`${limit} V`)}) بمقدار ${ltr(`${(vocCold - limit).toFixed(2)} V`)}.`,
        );
      } else if (vocCold > limit * 0.95) {
        status = 'WARNING';
        explanation = t(
          `At ${cfg.minAmbientTempC}°C, temperature-corrected Voc (${vocCold} V) exceeds 95% of inverter Vdc_max (${limit} V).`,
          `عند درجة حرارة ${ltr(`${cfg.minAmbientTempC}°C`)}, يتجاوز الجهد المصحح حرارياً (${ltr(`${vocCold} V`)}) نسبة ${ltr('95%')} من حد العاكس (${ltr(`${limit} V`)}).`,
        );
      }
      checks.push(
        buildCheckResult({
          id: 'check-thermal-voc',
          title: t(
            'Temperature-Corrected Open-Circuit Voltage (Cold Weather)',
            'جهد الدائرة المفتوحة المصحح حرارياً (الطقس البارد)',
          ),
          category: 'THERMAL_VOC',
          status,
          formula: 'Voc_cold = Ns × Voc_mod × [1 + (β_Voc / 100) × (T_min − 25)]',
          inputs,
          calculatedValue: vocCold,
          calculatedUnit: 'V',
          limitLabel: t('Inverter Max PV Input Voltage', 'أقصى جهد دخل للعاكس'),
          limitValue: isAr ? ltr(`≤ ${limit} V`) : `≤ ${limit} V`,
          missingInputs: [],
          explanation,
        }, lang),
      );
    }
  }

  // 3. MPPT Operating Voltage Range
  {
    const inputs: EngineeringInputTrace[] = [
      makeConfigTrace(t('Modules in Series', 'عدد الألواح على التوالي'), 'Ns', cfg.modulesPerString, modUnit, arrTag),
      makeEquipmentTrace(t('Module Vmp (STC)', 'جهد القدرة القصوى للوح (Vmp)'), 'Vmp_mod', pv?.vmpV ?? null, 'V', pv, 'vmpV', isDemo, lang),
      makeEquipmentTrace(
        t('Inverter MPPT Min', 'أدنى جهد MPPT للعاكس'),
        'Vmppt_min',
        inverter?.mpptMinV ?? null,
        'V',
        inverter,
        'mpptMinV',
        isDemo,
        lang,
      ),
      makeEquipmentTrace(
        t('Inverter MPPT Max', 'أقصى جهد MPPT للعاكس'),
        'Vmppt_max',
        inverter?.mpptMaxV ?? null,
        'V',
        inverter,
        'mpptMaxV',
        isDemo,
        lang,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${ltr(i.symbol)})`);

    if (
      missing.length > 0 ||
      !cfg.modulesPerString ||
      cfg.modulesPerString <= 0 ||
      !pv?.vmpV ||
      pv.vmpV <= 0 ||
      inverter?.mpptMinV === null ||
      inverter?.mpptMinV === undefined ||
      inverter?.mpptMaxV === null ||
      inverter?.mpptMaxV === undefined ||
      inverter.mpptMaxV <= inverter.mpptMinV
    ) {
      checks.push(
        buildCheckResult({
          id: 'check-mppt-window',
          title: t(
            'String Operating Voltage vs. MPPT Tracking Window',
            'جهد تشغيل السلسلة مقابل نطاق تتبع MPPT',
          ),
          category: 'MPPT',
          status: 'INSUFFICIENT DATA',
          formula: 'Vmp_string = Ns × Vmp_mod ∈ [Vmppt_min, Vmppt_max]',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'V',
          limitLabel: t('MPPT Voltage Window', 'نطاق جهد MPPT'),
          limitValue:
            inverter?.mpptMinV !== null &&
            inverter?.mpptMinV !== undefined &&
            inverter?.mpptMaxV !== null &&
            inverter?.mpptMaxV !== undefined
              ? (isAr ? ltr(`${inverter.mpptMinV} – ${inverter.mpptMaxV} V`) : `${inverter.mpptMinV} – ${inverter.mpptMaxV} V`)
              : missingTxt,
          missingInputs:
            missing.length > 0
              ? missing
              : [t('Valid MPPT window bounds (Vmppt_max > Vmppt_min) and positive Ns/Vmp', 'حدود نطاق MPPT صالحة وقيم موجبة لكل من Ns و Vmp')],
          explanation: t(
            'Requires series module count, module Vmp, and valid inverter MPPT min/max bounds.',
            'يتطلب عدد الألواح على التوالي وجهد Vmp للوح وحدود نطاق MPPT الدنيا والقصوى للعاكس.',
          ),
        }, lang),
      );
    } else {
      const vmpString = Number((cfg.modulesPerString * pv.vmpV).toFixed(2));
      const { mpptMinV, mpptMaxV } = inverter;
      const span = mpptMaxV - mpptMinV;
      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = t(
        `String Vmp (${vmpString} V) sits comfortably inside the inverter MPPT operating window (${mpptMinV}–${mpptMaxV} V).`,
        `جهد التشغيل للسلسلة (${ltr(`${vmpString} V`)}) يقع بأمان داخل نطاق عمل MPPT للعاكس (${ltr(`${mpptMinV}–${mpptMaxV} V`)}).`,
      );
      if (vmpString < mpptMinV || vmpString > mpptMaxV) {
        status = 'FAIL';
        explanation =
          vmpString < mpptMinV
            ? t(
                `String Vmp (${vmpString} V) is below the minimum MPPT threshold (${mpptMinV} V).`,
                `جهد التشغيل للسلسلة (${ltr(`${vmpString} V`)}) أقل من الحد الأدنى لتتبع MPPT (${ltr(`${mpptMinV} V`)}).`,
              )
            : t(
                `String Vmp (${vmpString} V) exceeds the maximum MPPT ceiling (${mpptMaxV} V).`,
                `جهد التشغيل للسلسلة (${ltr(`${vmpString} V`)}) يتجاوز الحد الأقصى لنطاق MPPT (${ltr(`${mpptMaxV} V`)}).`,
              );
      } else if (vmpString < mpptMinV + span * 0.08 || vmpString > mpptMaxV - span * 0.08) {
        status = 'WARNING';
        explanation = t(
          `String Vmp (${vmpString} V) is within 8% of the MPPT window edge (${mpptMinV}–${mpptMaxV} V); high cell temperatures may reduce tracking efficiency.`,
          `جهد التشغيل للسلسلة (${ltr(`${vmpString} V`)}) قريب بنسبة ${ltr('8%')} من حافة نطاق MPPT (${ltr(`${mpptMinV}–${mpptMaxV} V`)})؛ قد تقلل حرارة الخلايا العالية كفاءة التتبع.`,
        );
      }
      checks.push(
        buildCheckResult({
          id: 'check-mppt-window',
          title: t(
            'String Operating Voltage vs. MPPT Tracking Window',
            'جهد تشغيل السلسلة مقابل نطاق تتبع MPPT',
          ),
          category: 'MPPT',
          status,
          formula: 'Vmp_string = Ns × Vmp_mod',
          inputs,
          calculatedValue: vmpString,
          calculatedUnit: 'V',
          limitLabel: t('MPPT Operating Window', 'نطاق تشغيل MPPT'),
          limitValue: isAr ? ltr(`${mpptMinV} – ${mpptMaxV} V`) : `${mpptMinV} – ${mpptMaxV} V`,
          missingInputs: [],
          explanation,
        }, lang),
      );
    }
  }

  // 4a. Parallel Array Operating Current (Imp) vs Inverter Max PV Operating Current
  {
    const maxOpCurrent = inverter?.maxPvOperatingCurrentA ?? null;
    const inputs: EngineeringInputTrace[] = [
      makeConfigTrace(t('Parallel Strings', 'السلاسل على التوازي'), 'Np', cfg.parallelStrings, strUnit, arrTag),
      makeEquipmentTrace(t('Module Imp (STC)', 'تيار القدرة القصوى للوح (Imp)'), 'Imp_mod', pv?.impA ?? null, 'A', pv, 'impA', isDemo, lang),
      makeEquipmentTrace(
        t('Inverter Max PV Operating Current', 'أقصى تيار تشغيل PV للعاكس'),
        'Ipv_op_max',
        maxOpCurrent,
        'A',
        inverter,
        'maxPvOperatingCurrentA',
        isDemo,
        lang,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${ltr(i.symbol)})`);

    if (
      missing.length > 0 ||
      !cfg.parallelStrings ||
      cfg.parallelStrings <= 0 ||
      !pv?.impA ||
      pv.impA <= 0 ||
      maxOpCurrent === null ||
      maxOpCurrent <= 0
    ) {
      checks.push(
        buildCheckResult({
          id: 'check-pv-operating-current',
          title: t(
            'Parallel Array Operating Current (Imp) vs. Inverter Max PV Operating Current',
            'تيار التشغيل للمصفوفة المتوازية (Imp) مقابل أقصى تيار تشغيل PV للعاكس',
          ),
          category: 'CURRENT',
          status: 'INSUFFICIENT DATA',
          formula: 'I_array_mp = Np × Imp_mod ≤ Ipv_op_max',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'A',
          limitLabel: t('Inverter Max PV Operating Current', 'أقصى تيار تشغيل PV للعاكس'),
          limitValue: maxOpCurrent !== null
            ? (isAr ? ltr(`≤ ${maxOpCurrent} A`) : `≤ ${maxOpCurrent} A`)
            : missingTxt,
          missingInputs:
            missing.length > 0
              ? missing
              : [t('Valid positive Np, Imp_mod, and Ipv_op_max', 'قيم موجبة صالحة لكل من Np و Imp_mod و Ipv_op_max')],
          explanation: t(
            'Requires parallel string count, module Imp, and the inverter datasheet max PV operating input current limit (Ipv_op_max). Short-circuit current limits cannot be substituted.',
            'يتطلب عدد السلاسل المتوازية وتيار Imp للوح وحد أقصى تيار تشغيل للعاكس (Ipv_op_max) من النشرة الفنية. لا يجوز التعويض بحد تيار القصر.',
          ),
        }, lang),
      );
    } else {
      const iArrayMp = Number((cfg.parallelStrings * pv.impA).toFixed(2));
      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = t(
        `Combined parallel operating current (${iArrayMp} A across ${cfg.parallelStrings} string(s)) is within the inverter ${maxOpCurrent} A operating input limit.`,
        `إجمالي تيار التشغيل المتوازي (${ltr(`${iArrayMp} A`)} عبر ${ltr(cfg.parallelStrings)} سلسلة/سلاسل) يقع ضمن حد تيار التشغيل للعاكس (${ltr(`${maxOpCurrent} A`)}).`,
      );

      if (iArrayMp > maxOpCurrent) {
        status = 'FAIL';
        explanation = t(
          `Combined parallel operating current (${iArrayMp} A across ${cfg.parallelStrings} string(s)) exceeds inverter max PV operating current (${maxOpCurrent} A) by ${(iArrayMp - maxOpCurrent).toFixed(2)} A.`,
          `إجمالي تيار التشغيل المتوازي (${ltr(`${iArrayMp} A`)} عبر ${ltr(cfg.parallelStrings)} سلسلة/سلاسل) يتجاوز حد تيار التشغيل للعاكس (${ltr(`${maxOpCurrent} A`)}) بمقدار ${ltr(`${(iArrayMp - maxOpCurrent).toFixed(2)} A`)}.`,
        );
      } else if (iArrayMp > maxOpCurrent * 0.9) {
        status = 'WARNING';
        explanation = t(
          `Combined parallel operating current (${iArrayMp} A) exceeds 90% of the inverter ${maxOpCurrent} A operating current rating.`,
          `إجمالي تيار التشغيل المتوازي (${ltr(`${iArrayMp} A`)}) يتجاوز ${ltr('90%')} من تصنيف تيار التشغيل للعاكس (${ltr(`${maxOpCurrent} A`)}).`,
        );
      }

      checks.push(
        buildCheckResult({
          id: 'check-pv-operating-current',
          title: t(
            'Parallel Array Operating Current (Imp) vs. Inverter Max PV Operating Current',
            'تيار التشغيل للمصفوفة المتوازية (Imp) مقابل أقصى تيار تشغيل PV للعاكس',
          ),
          category: 'CURRENT',
          status,
          formula: 'I_array_mp = Np × Imp_mod',
          inputs,
          calculatedValue: iArrayMp,
          calculatedUnit: 'A',
          limitLabel: t('Inverter Max PV Operating Current', 'أقصى تيار تشغيل PV للعاكس'),
          limitValue: isAr ? ltr(`≤ ${maxOpCurrent} A`) : `≤ ${maxOpCurrent} A`,
          missingInputs: [],
          explanation,
        }, lang),
      );
    }
  }

  // 4b. Parallel Array Short-Circuit Current (Isc) vs Inverter Max PV Short-Circuit Current
  {
    const maxScCurrent = inverter?.maxPvShortCircuitCurrentA ?? null;
    const inputs: EngineeringInputTrace[] = [
      makeConfigTrace(t('Parallel Strings', 'السلاسل على التوازي'), 'Np', cfg.parallelStrings, strUnit, arrTag),
      makeEquipmentTrace(t('Module Isc (STC)', 'تيار القصر للوح (Isc)'), 'Isc_mod', pv?.iscA ?? null, 'A', pv, 'iscA', isDemo, lang),
      makeEquipmentTrace(
        t('Inverter Max PV Short-Circuit Current', 'أقصى تيار قصر PV للعاكس'),
        'Ipv_sc_max',
        maxScCurrent,
        'A',
        inverter,
        'maxPvShortCircuitCurrentA',
        isDemo,
        lang,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${ltr(i.symbol)})`);

    if (
      missing.length > 0 ||
      !cfg.parallelStrings ||
      cfg.parallelStrings <= 0 ||
      !pv?.iscA ||
      pv.iscA <= 0 ||
      maxScCurrent === null ||
      maxScCurrent <= 0
    ) {
      checks.push(
        buildCheckResult({
          id: 'check-pv-shortcircuit-current',
          title: t(
            'Parallel Array Short-Circuit Current (Isc) vs. Inverter Max PV Short-Circuit Current',
            'تيار القصر للمصفوفة المتوازية (Isc) مقابل أقصى تيار قصر PV للعاكس',
          ),
          category: 'CURRENT',
          status: 'INSUFFICIENT DATA',
          formula: 'I_array_sc = Np × Isc_mod ≤ Ipv_sc_max',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'A',
          limitLabel: t('Inverter Max PV Short-Circuit Current', 'أقصى تيار قصر PV للعاكس'),
          limitValue: maxScCurrent !== null
            ? (isAr ? ltr(`≤ ${maxScCurrent} A`) : `≤ ${maxScCurrent} A`)
            : missingTxt,
          missingInputs:
            missing.length > 0
              ? missing
              : [t('Valid positive Np, Isc_mod, and Ipv_sc_max', 'قيم موجبة صالحة لكل من Np و Isc_mod و Ipv_sc_max')],
          explanation: t(
            'Requires parallel string count, module Isc, and the inverter datasheet max PV short-circuit current limit (Ipv_sc_max). Operating current limits cannot be substituted.',
            'يتطلب عدد السلاسل المتوازية وتيار Isc للوح وحد أقصى تيار قصر للعاكس (Ipv_sc_max) من النشرة الفنية. لا يجوز التعويض بحد تيار التشغيل.',
          ),
        }, lang),
      );
    } else {
      const iArraySc = Number((cfg.parallelStrings * pv.iscA).toFixed(2));
      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = t(
        `Combined parallel short-circuit current (${iArraySc} A across ${cfg.parallelStrings} string(s)) is within the inverter ${maxScCurrent} A short-circuit input limit.`,
        `إجمالي تيار القصر المتوازي (${ltr(`${iArraySc} A`)} عبر ${ltr(cfg.parallelStrings)} سلسلة/سلاسل) يقع ضمن حد تيار القصر للعاكس (${ltr(`${maxScCurrent} A`)}).`,
      );

      if (iArraySc > maxScCurrent) {
        status = 'FAIL';
        explanation = t(
          `Combined parallel short-circuit current (${iArraySc} A across ${cfg.parallelStrings} string(s)) exceeds inverter max PV short-circuit current (${maxScCurrent} A) by ${(iArraySc - maxScCurrent).toFixed(2)} A.`,
          `إجمالي تيار القصر المتوازي (${ltr(`${iArraySc} A`)} عبر ${ltr(cfg.parallelStrings)} سلسلة/سلاسل) يتجاوز حد تيار القصر للعاكس (${ltr(`${maxScCurrent} A`)}) بمقدار ${ltr(`${(iArraySc - maxScCurrent).toFixed(2)} A`)}.`,
        );
      } else if (iArraySc > maxScCurrent * 0.9) {
        status = 'WARNING';
        explanation = t(
          `Combined parallel short-circuit current (${iArraySc} A) exceeds 90% of the inverter ${maxScCurrent} A short-circuit rating, leaving minimal irradiance surge margin.`,
          `إجمالي تيار القصر المتوازي (${ltr(`${iArraySc} A`)}) يتجاوز ${ltr('90%')} من تصنيف تيار القصر للعاكس (${ltr(`${maxScCurrent} A`)}) مما يترك هامشاً ضئيلاً لارتفاع الإشعاع.`,
        );
      }

      checks.push(
        buildCheckResult({
          id: 'check-pv-shortcircuit-current',
          title: t(
            'Parallel Array Short-Circuit Current (Isc) vs. Inverter Max PV Short-Circuit Current',
            'تيار القصر للمصفوفة المتوازية (Isc) مقابل أقصى تيار قصر PV للعاكس',
          ),
          category: 'CURRENT',
          status,
          formula: 'I_array_sc = Np × Isc_mod',
          inputs,
          calculatedValue: iArraySc,
          calculatedUnit: 'A',
          limitLabel: t('Inverter Max PV Short-Circuit Current', 'أقصى تيار قصر PV للعاكس'),
          limitValue: isAr ? ltr(`≤ ${maxScCurrent} A`) : `≤ ${maxScCurrent} A`,
          missingInputs: [],
          explanation,
        }, lang),
      );
    }
  }

  // 5. Array DC-to-Inverter AC Power Ratio & Configuration Count Check
  {
    const inputs: EngineeringInputTrace[] = [
      makeEquipmentTrace(
        t('Installed Module Count', 'عدد الألواح المركبة'),
        'N_pv',
        pv?.quantity ?? null,
        modUnit,
        pv,
        'quantity',
        isDemo,
        lang,
      ),
      makeEquipmentTrace(
        t('Module Rated Power', 'القدرة الاسمية للوح'),
        'P_mod',
        pv?.ratedPowerW ?? null,
        'W',
        pv,
        'ratedPowerW',
        isDemo,
        lang,
      ),
      makeEquipmentTrace(
        t('Inverter Rated AC Power', 'القدرة المترددة الاسمية للعاكس'),
        'P_inv',
        inverter?.ratedPowerW ?? null,
        'W',
        inverter,
        'ratedPowerW',
        isDemo,
        lang,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${ltr(i.symbol)})`);

    if (
      missing.length > 0 ||
      !pv?.quantity ||
      pv.quantity <= 0 ||
      !pv?.ratedPowerW ||
      pv.ratedPowerW <= 0 ||
      !inverter?.ratedPowerW ||
      inverter.ratedPowerW <= 0
    ) {
      checks.push(
        buildCheckResult({
          id: 'check-dc-ac-ratio',
          title: t('Array DC-to-Inverter AC Sizing Ratio', 'نسبة تحجيم قدرة المصفوفة DC إلى العاكس AC'),
          category: 'POWER_RATIO',
          status: 'INSUFFICIENT DATA',
          formula: 'DC/AC Ratio = (N_pv × P_mod) / P_inv',
          inputs,
          calculatedValue: null,
          calculatedUnit: t('ratio', 'نسبة'),
          limitLabel: t('Recommended Sizing Window', 'نطاق التحجيم الموصى به'),
          limitValue: isAr ? `${ltr('0.75 – 1.35')} (الحد الأقصى ${ltr('1.50')})` : '0.75 – 1.35 (Max 1.50)',
          missingInputs:
            missing.length > 0
              ? missing
              : [t('Valid positive N_pv, P_mod, and P_inv', 'قيم موجبة صالحة لكل من N_pv و P_mod و P_inv')],
          explanation: t(
            'Requires installed module count, module wattage, and inverter rated AC power.',
            'يتطلب عدد الألواح المركبة وقدرة اللوح بالواط والقدرة الاسمية للعاكس.',
          ),
        }, lang),
      );
    } else {
      const totalDcW = pv.quantity * pv.ratedPowerW;
      const ratio = Number((totalDcW / inverter.ratedPowerW).toFixed(2));
      const configuredTotal =
        cfg.modulesPerString && cfg.parallelStrings
          ? cfg.modulesPerString * cfg.parallelStrings
          : null;
      const countMismatchNote =
        configuredTotal !== null && configuredTotal !== pv.quantity
          ? t(
              ` Note: Array layout (${cfg.modulesPerString}S × ${cfg.parallelStrings}P = ${configuredTotal}) differs from installed module count (${pv.quantity}).`,
              ` ملاحظة: توزيع المصفوفة (${ltr(`${cfg.modulesPerString}S × ${cfg.parallelStrings}P = ${configuredTotal}`)}) يختلف عن عدد الألواح المركبة (${ltr(pv.quantity)}).`,
            )
          : '';

      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = t(
        `Total installed PV DC power (${(totalDcW / 1000).toFixed(2)} kWp) vs. inverter AC rating (${(inverter.ratedPowerW / 1000).toFixed(2)} kW) gives a DC/AC ratio of ${ratio}.${countMismatchNote}`,
        `إجمالي قدرة الألواح المركبة (${ltr(`${(totalDcW / 1000).toFixed(2)} kWp`)}) مقابل قدرة العاكس (${ltr(`${(inverter.ratedPowerW / 1000).toFixed(2)} kW`)}) يعطي نسبة ${ltr(`DC/AC = ${ratio}`)}.${countMismatchNote}`,
      );

      if (ratio > 1.5) {
        status = 'FAIL';
        explanation = t(
          `DC/AC ratio (${ratio}) exceeds 1.50 upper limit (${totalDcW} W DC on ${inverter.ratedPowerW} W inverter).${countMismatchNote}`,
          `نسبة ${ltr(`DC/AC (${ratio})`)} تتجاوز الحد الأقصى ${ltr('1.50')} (${ltr(`${totalDcW} W`)} على عاكس ${ltr(`${inverter.ratedPowerW} W`)}).${countMismatchNote}`,
        );
      } else if (
        ratio > 1.35 ||
        ratio < 0.75 ||
        (configuredTotal !== null && configuredTotal !== pv.quantity)
      ) {
        status = 'WARNING';
        explanation =
          ratio > 1.35 || ratio < 0.75
            ? t(
                `DC/AC ratio (${ratio}) falls outside the standard 0.75–1.35 operating band.${countMismatchNote}`,
                `نسبة ${ltr(`DC/AC (${ratio})`)} تقع خارج النطاق التشغيلي القياسي (${ltr('0.75–1.35')}).${countMismatchNote}`,
              )
            : t(
                `DC/AC ratio is ${ratio}, however array wiring layout count (${configuredTotal}) does not match installed module quantity (${pv.quantity}).`,
                `نسبة ${ltr('DC/AC')} هي ${ltr(ratio)}, إلا أن عدد الألواح في التوصيل (${ltr(configuredTotal ?? '')}) لا يطابق عدد الألواح المركبة (${ltr(pv.quantity)}).`,
              );
      }

      checks.push(
        buildCheckResult({
          id: 'check-dc-ac-ratio',
          title: t('Array DC-to-Inverter AC Sizing Ratio', 'نسبة تحجيم قدرة المصفوفة DC إلى العاكس AC'),
          category: 'POWER_RATIO',
          status,
          formula: 'DC/AC Ratio = (N_pv × P_mod) / P_inv',
          inputs,
          calculatedValue: ratio,
          calculatedUnit: 'DC/AC',
          limitLabel: t('Engineering Sizing Range', 'نطاق التحجيم الهندسي'),
          limitValue: isAr ? `${ltr('0.75 – 1.35')} (فشل: ${ltr('>\u00A01.50')})` : '0.75 – 1.35 (Fail > 1.50)',
          missingInputs: [],
          explanation,
        }, lang),
      );
    }
  }

  // 6. Battery & Inverter Voltage Compatibility (when applicable)
  const batteryRelevant =
    project.systemType !== 'Grid-Tied' ||
    battery !== undefined ||
    project.promisedEquipment.some((e) => e.category === 'BATTERY');

  if (batteryRelevant) {
    const inputs: EngineeringInputTrace[] = [
      makeEquipmentTrace(
        t('Battery Nominal Voltage', 'الجهد الاسمي للبطارية'),
        'V_batt',
        battery?.nominalVoltageV ?? null,
        'V',
        battery,
        'nominalVoltageV',
        isDemo,
        lang,
      ),
      makeEquipmentTrace(
        t('Inverter Battery Bus Voltage', 'جهد ناقل البطارية بالعاكس'),
        'V_inv_dc',
        inverter?.nominalVoltageV ?? null,
        'V',
        inverter,
        'nominalVoltageV',
        isDemo,
        lang,
      ),
      makeEquipmentTrace(
        t('Inverter Battery Min V', 'أدنى جهد بطارية بالعاكس'),
        'V_batt_min',
        inverter?.minBatteryVoltageV ?? null,
        'V',
        inverter,
        'minBatteryVoltageV',
        isDemo,
        lang,
      ),
      makeEquipmentTrace(
        t('Inverter Battery Max V', 'أقصى جهد بطارية بالعاكس'),
        'V_batt_max',
        inverter?.maxBatteryVoltageV ?? null,
        'V',
        inverter,
        'maxBatteryVoltageV',
        isDemo,
        lang,
      ),
    ];

    const missing: string[] = [];
    if (battery?.nominalVoltageV === null || battery?.nominalVoltageV === undefined) {
      missing.push(t('Battery Nominal Voltage (V_batt)', `الجهد الاسمي للبطارية (${ltr('V_batt')})`));
    }
    const hasInverterRange =
      inverter?.minBatteryVoltageV !== null &&
      inverter?.minBatteryVoltageV !== undefined &&
      inverter?.maxBatteryVoltageV !== null &&
      inverter?.maxBatteryVoltageV !== undefined;
    const hasInverterNom =
      inverter?.nominalVoltageV !== null && inverter?.nominalVoltageV !== undefined;

    if (!hasInverterRange && !hasInverterNom) {
      missing.push(
        t(
          'Inverter Battery Bus Voltage or Window (V_inv_dc)',
          `جهد أو نطاق ناقل البطارية بالعاكس (${ltr('V_inv_dc')})`,
        ),
      );
    }

    if (missing.length > 0 || !battery?.nominalVoltageV || battery.nominalVoltageV <= 0) {
      checks.push(
        buildCheckResult({
          id: 'check-battery-voltage',
          title: t(
            'Battery Bank & Inverter DC Bus Compatibility',
            'توافق جهد بنك البطاريات مع ناقل العاكس DC',
          ),
          category: 'BATTERY',
          status: 'INSUFFICIENT DATA',
          formula: 'V_batt_min ≤ V_batt ≤ V_batt_max (or V_batt = V_inv_dc)',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'V',
          limitLabel: t('Inverter Battery Voltage Rating', 'تصنيف جهد البطارية للعاكس'),
          limitValue: hasInverterRange
            ? (isAr
                ? ltr(`${inverter!.minBatteryVoltageV} – ${inverter!.maxBatteryVoltageV} V`)
                : `${inverter!.minBatteryVoltageV} – ${inverter!.maxBatteryVoltageV} V`)
            : hasInverterNom
              ? (isAr
                  ? `${ltr(`${inverter!.nominalVoltageV} V`)} اسمي`
                  : `${inverter!.nominalVoltageV} V nominal`)
              : missingTxt,
          missingInputs:
            missing.length > 0
              ? missing
              : [t('Valid positive Battery Nominal Voltage', 'قيمة موجبة صالحة للجهد الاسمي للبطارية')],
          explanation: t(
            'Requires verified battery nominal voltage and inverter DC battery bus specification.',
            'يتطلب توثيق الجهد الاسمي للبطارية ومواصفة ناقل البطارية في العاكس.',
          ),
        }, lang),
      );
    } else {
      const vBatt = battery.nominalVoltageV;
      let compatible = true;
      let limitText = '';

      if (hasInverterRange) {
        limitText = isAr
          ? ltr(`${inverter!.minBatteryVoltageV} – ${inverter!.maxBatteryVoltageV} V`)
          : `${inverter!.minBatteryVoltageV} – ${inverter!.maxBatteryVoltageV} V`;
        compatible =
          vBatt >= inverter!.minBatteryVoltageV! && vBatt <= inverter!.maxBatteryVoltageV!;
      } else {
        limitText = isAr
          ? `${ltr(`${inverter!.nominalVoltageV} V`)} اسمي`
          : `${inverter!.nominalVoltageV} V nominal`;
        compatible = Math.abs(vBatt - inverter!.nominalVoltageV!) <= 4;
      }

      if (compatible && hasInverterNom && Math.abs(vBatt - inverter!.nominalVoltageV!) > 4) {
        compatible = false;
      }

      checks.push(
        buildCheckResult({
          id: 'check-battery-voltage',
          title: t(
            'Battery Bank & Inverter DC Bus Compatibility',
            'توافق جهد بنك البطاريات مع ناقل العاكس DC',
          ),
          category: 'BATTERY',
          status: compatible ? 'PASS' : 'FAIL',
          formula: hasInverterRange
            ? 'V_batt ∈ [V_batt_min, V_batt_max] and V_batt ≈ V_inv_dc'
            : 'V_batt ≈ V_inv_dc',
          inputs,
          calculatedValue: vBatt,
          calculatedUnit: 'V',
          limitLabel: t('Inverter Battery Bus Spec', 'مواصفة ناقل البطارية بالعاكس'),
          limitValue: limitText,
          missingInputs: [],
          explanation: compatible
            ? t(
                `Installed battery bank (${vBatt} V nominal) is compatible with the inverter battery bus specification (${limitText}).`,
                `بنك البطاريات المركب (${ltr(`${vBatt} V`)}) متوافق مع مواصفة ناقل البطارية في العاكس (${limitText}).`,
              )
            : t(
                `Battery bank nominal voltage (${vBatt} V) is incompatible with inverter battery specification (${limitText}).`,
                `الجهد الاسمي لبنك البطاريات (${ltr(`${vBatt} V`)}) غير متوافق مع مواصفة البطارية في العاكس (${limitText}).`,
              ),
        }, lang),
      );
    }
  }

  return checks;
}

export function computeAuditSummary(
  comparisons: EquipmentComparisonResult[],
  checks: EngineeringCheckResult[],
  lang: Language = 'en',
): AuditSummary {
  const eligibleComparisons = comparisons.filter((c) => c.eligibility === 'ELIGIBLE');
  const unquotedInstalledCategories = comparisons
    .filter((c) => c.eligibility === 'UNQUOTED_INSTALLED')
    .map((c) => c.label);
  const missingInstalledCategories = comparisons
    .filter((c) => c.eligibility === 'MISSING_INSTALLED')
    .map((c) => c.label);

  let totalComparedParameters = 0;
  let matchedParameters = 0;
  let mismatchedParameters = 0;
  let warningParameters = 0;
  let notVerifiedParameters = 0;
  let confirmedMatches = 0;
  let discrepancies = 0;
  let warnings = 0;
  let notVerifiedCount = 0;

  for (const comp of comparisons) {
    if (comp.status === 'MATCH') confirmedMatches++;
    else if (comp.status === 'MISMATCH') discrepancies++;
    else if (comp.status === 'WARNING') warnings++;
    else notVerifiedCount++;
  }

  for (const comp of eligibleComparisons) {
    for (const diff of comp.differences) {
      totalComparedParameters++;
      if (diff.status === 'MATCH') matchedParameters++;
      else if (diff.status === 'MISMATCH') mismatchedParameters++;
      else if (diff.status === 'WARNING') warningParameters++;
      else notVerifiedParameters++;
    }
  }

  const passedChecks = checks.filter((c) => c.status === 'PASS').length;
  const verifiedPassChecks = checks.filter(
    (c) => c.status === 'PASS' && c.inputConfidence === 'VERIFIED_INPUTS',
  ).length;
  const simulatedPassChecks = checks.filter(
    (c) => c.status === 'PASS' && c.inputConfidence === 'SIMULATED_INPUTS',
  ).length;
  const unverifiedPassChecks = checks.filter(
    (c) => c.status === 'PASS' && c.inputConfidence === 'UNVERIFIED_INPUTS',
  ).length;
  const warningChecks = checks.filter((c) => c.status === 'WARNING').length;
  const failedChecks = checks.filter((c) => c.status === 'FAIL').length;
  const insufficientDataChecks = checks.filter((c) => c.status === 'INSUFFICIENT DATA').length;

  const equipmentMatchPct =
    eligibleComparisons.length > 0 && totalComparedParameters > 0
      ? Math.round((matchedParameters / totalComparedParameters) * 100)
      : null;

  let overallStatus: AuditSummary['overallStatus'] = 'VERIFIED MATCH';
  if (failedChecks > 0 || discrepancies > 0) {
    overallStatus = 'ACTION REQUIRED';
  } else if (
    insufficientDataChecks > 0 ||
    notVerifiedCount > 0 ||
    eligibleComparisons.length === 0
  ) {
    overallStatus = 'INCOMPLETE DATA';
  } else if (warnings > 0 || warningChecks > 0) {
    overallStatus = 'DISCREPANCIES FOUND';
  }

  return {
    overallStatus,
    equipmentMatchPct,
    equipmentMatchFormula:
      lang === 'ar'
        ? '(المعايير المتطابقة ÷ إجمالي المعايير المؤهلة) × 100 (يستبعد الفئات غير المسعرة وغير الموثقة)'
        : '(Matching Parameters / Total Eligible Compared Parameters) × 100 (excludes unquoted & undocumented categories)',
    eligibleCategories: eligibleComparisons.length,
    unquotedInstalledCategories,
    missingInstalledCategories,
    matchedParameters,
    mismatchedParameters,
    warningParameters,
    notVerifiedParameters,
    totalComparedParameters,
    confirmedMatches,
    discrepancies,
    warnings,
    notVerifiedCount,
    passedChecks,
    verifiedPassChecks,
    simulatedPassChecks,
    unverifiedPassChecks,
    warningChecks,
    failedChecks,
    insufficientDataChecks,
  };
}

function getCanonicalSymbolMeta(
  symbol: string,
  lang: Language = 'en',
): { key: string; parameter: string; categoryLabel: string; missingOn: string } | undefined {
  const isAr = lang === 'ar';
  const t = <T>(en: T, ar: T): T => (isAr ? ar : en);
  const arrLabel = t('Array Configuration', 'تكوين المصفوفة');

  switch (symbol) {
    case 'Ns':
      return {
        key: 'array.modulesPerString',
        parameter: t('Modules in Series per String (Ns)', `عدد الألواح على التوالي في السلسلة (${ltr('Ns')})`),
        categoryLabel: arrLabel,
        missingOn: arrLabel,
      };
    case 'Np':
      return {
        key: 'array.parallelStrings',
        parameter: t('Parallel Strings (Np)', `عدد السلاسل على التوازي (${ltr('Np')})`),
        categoryLabel: arrLabel,
        missingOn: arrLabel,
      };
    case 'T_min':
      return {
        key: 'array.minAmbientTempC',
        parameter: t('Minimum Site Ambient Temperature (T_min)', `أدنى درجة حرارة محيطة بالموقع (${ltr('T_min')})`),
        categoryLabel: arrLabel,
        missingOn: arrLabel,
      };
    case 'Voc_mod':
      return {
        key: 'pv.vocV',
        parameter: t('PV Module Open-Circuit Voltage (Voc)', `جهد الدائرة المفتوحة للوح (${ltr('Voc')})`),
        categoryLabel: getCategoryLabel('PV_MODULE', lang),
        missingOn: t('Installed PV Nameplate', 'لوحة بيانات اللوح الشمسي المركب'),
      };
    case 'Vmp_mod':
      return {
        key: 'pv.vmpV',
        parameter: t('PV Module Max Power Voltage (Vmp)', `جهد القدرة القصوى للوح (${ltr('Vmp')})`),
        categoryLabel: getCategoryLabel('PV_MODULE', lang),
        missingOn: t('Installed PV Nameplate', 'لوحة بيانات اللوح الشمسي المركب'),
      };
    case 'Isc_mod':
      return {
        key: 'pv.iscA',
        parameter: t('PV Module Short-Circuit Current (Isc)', `تيار القصر للوح (${ltr('Isc')})`),
        categoryLabel: getCategoryLabel('PV_MODULE', lang),
        missingOn: t('Installed PV Nameplate', 'لوحة بيانات اللوح الشمسي المركب'),
      };
    case 'Imp_mod':
      return {
        key: 'pv.impA',
        parameter: t('PV Module Max Power Current (Imp)', `تيار القدرة القصوى للوح (${ltr('Imp')})`),
        categoryLabel: getCategoryLabel('PV_MODULE', lang),
        missingOn: t('Installed PV Nameplate', 'لوحة بيانات اللوح الشمسي المركب'),
      };
    case 'β_Voc':
      return {
        key: 'pv.tempCoeffVocPctPerC',
        parameter: t('PV Module Voc Temperature Coefficient (β_Voc)', `معامل الحرارة لجهد Voc (${ltr('β_Voc')})`),
        categoryLabel: getCategoryLabel('PV_MODULE', lang),
        missingOn: t('Installed PV Nameplate / Datasheet', 'لوحة اللوح الشمسي / النشرة الفنية'),
      };
    case 'N_pv':
      return {
        key: 'pv.quantity',
        parameter: t('Installed PV Module Quantity (N_pv)', `عدد الألواح الشمسية المركبة (${ltr('N_pv')})`),
        categoryLabel: getCategoryLabel('PV_MODULE', lang),
        missingOn: t('Installed PV Nameplate', 'لوحة بيانات اللوح الشمسي المركب'),
      };
    case 'P_mod':
      return {
        key: 'pv.ratedPowerW',
        parameter: t('PV Module Rated Power (Pmax)', `القدرة الاسمية للوح الشمسي (${ltr('Pmax')})`),
        categoryLabel: getCategoryLabel('PV_MODULE', lang),
        missingOn: t('Installed PV Nameplate', 'لوحة بيانات اللوح الشمسي المركب'),
      };
    case 'Vdc_max':
      return {
        key: 'inv.maxPvInputVoltageV',
        parameter: t('Inverter Max PV Input Voltage (Vdc_max)', `أقصى جهد دخل للخلايا بالعاكس (${ltr('Vdc_max')})`),
        categoryLabel: getCategoryLabel('INVERTER', lang),
        missingOn: t('Installed Inverter Nameplate / Datasheet', 'لوحة بيانات العاكس / النشرة الفنية'),
      };
    case 'Vmppt_min':
      return {
        key: 'inv.mpptMinV',
        parameter: t('Inverter MPPT Minimum Voltage (Vmppt_min)', `أدنى جهد MPPT بالعاكس (${ltr('Vmppt_min')})`),
        categoryLabel: getCategoryLabel('INVERTER', lang),
        missingOn: t('Installed Inverter Nameplate / Datasheet', 'لوحة بيانات العاكس / النشرة الفنية'),
      };
    case 'Vmppt_max':
      return {
        key: 'inv.mpptMaxV',
        parameter: t('Inverter MPPT Maximum Voltage (Vmppt_max)', `أقصى جهد MPPT بالعاكس (${ltr('Vmppt_max')})`),
        categoryLabel: getCategoryLabel('INVERTER', lang),
        missingOn: t('Installed Inverter Nameplate / Datasheet', 'لوحة بيانات العاكس / النشرة الفنية'),
      };
    case 'Ipv_op_max':
      return {
        key: 'inv.maxPvOperatingCurrentA',
        parameter: t('Inverter Max PV Operating Current (Ipv_op_max)', `أقصى تيار تشغيل PV بالعاكس (${ltr('Ipv_op_max')})`),
        categoryLabel: getCategoryLabel('INVERTER', lang),
        missingOn: t('Installed Inverter Nameplate / Datasheet', 'لوحة بيانات العاكس / النشرة الفنية'),
      };
    case 'Ipv_sc_max':
      return {
        key: 'inv.maxPvShortCircuitCurrentA',
        parameter: t('Inverter Max PV Short-Circuit Current (Ipv_sc_max)', `أقصى تيار قصر PV بالعاكس (${ltr('Ipv_sc_max')})`),
        categoryLabel: getCategoryLabel('INVERTER', lang),
        missingOn: t('Installed Inverter Nameplate / Datasheet', 'لوحة بيانات العاكس / النشرة الفنية'),
      };
    case 'P_inv':
      return {
        key: 'inv.ratedPowerW',
        parameter: t('Inverter Rated AC Power (P_inv)', `القدرة المترددة الاسمية للعاكس (${ltr('P_inv')})`),
        categoryLabel: getCategoryLabel('INVERTER', lang),
        missingOn: t('Installed Inverter Nameplate', 'لوحة بيانات العاكس المركب'),
      };
    case 'V_batt':
      return {
        key: 'batt.nominalVoltageV',
        parameter: t('Battery Nominal Voltage (V_batt)', `الجهد الاسمي للبطارية (${ltr('V_batt')})`),
        categoryLabel: getCategoryLabel('BATTERY', lang),
        missingOn: t('Installed Battery Nameplate', 'لوحة بيانات البطارية المركبة'),
      };
    case 'V_inv_dc':
      return {
        key: 'inv.batteryBusVoltage',
        parameter: t('Inverter Battery Bus Voltage / Operating Window', 'جهد / نطاق ناقل البطارية بالعاكس'),
        categoryLabel: getCategoryLabel('INVERTER', lang),
        missingOn: t('Installed Inverter Nameplate / Datasheet', 'لوحة بيانات العاكس / النشرة الفنية'),
      };
    default:
      return undefined;
  }
}

function mapComparisonMissingLabelToCanonicalKey(
  category: EquipmentCategory,
  rawLabel: string,
  lang: Language = 'en',
): { key: string; parameter: string; missingOn: string } | null {
  const lower = rawLabel.toLowerCase();
  if (
    lower.includes('user confirmation of ai-extracted') ||
    rawLabel.includes('تأكيد المستخدم لحقول لوحة البيانات')
  ) {
    return null; // Handled in Record Gaps (unverifiedAiRecords)
  }
  if (
    (lower.includes('temp') && lower.includes('voc')) ||
    (rawLabel.includes('معامل') && lower.includes('voc'))
  ) {
    const meta = getCanonicalSymbolMeta('β_Voc', lang)!;
    return { key: meta.key, parameter: meta.parameter, missingOn: meta.missingOn };
  }
  if (
    lower.includes('operating current') ||
    rawLabel.includes('تيار التشغيل') ||
    rawLabel.includes('تيار تشغيل') ||
    lower.includes('imp limit')
  ) {
    const meta = getCanonicalSymbolMeta('Ipv_op_max', lang)!;
    return { key: meta.key, parameter: meta.parameter, missingOn: meta.missingOn };
  }
  if (
    lower.includes('short-circuit') ||
    lower.includes('short circuit') ||
    rawLabel.includes('تيار قصر') ||
    rawLabel.includes('تيار القصر') ||
    lower.includes('isc limit')
  ) {
    const meta = getCanonicalSymbolMeta('Ipv_sc_max', lang)!;
    return { key: meta.key, parameter: meta.parameter, missingOn: meta.missingOn };
  }
  if (
    (lower.includes('max') && lower.includes('pv input voltage')) ||
    rawLabel.includes('أقصى جهد دخل')
  ) {
    const meta = getCanonicalSymbolMeta('Vdc_max', lang)!;
    return { key: meta.key, parameter: meta.parameter, missingOn: meta.missingOn };
  }
  if (lower.includes('mppt min') || rawLabel.includes('أدنى جهد mppt')) {
    const meta = getCanonicalSymbolMeta('Vmppt_min', lang)!;
    return { key: meta.key, parameter: meta.parameter, missingOn: meta.missingOn };
  }
  if (lower.includes('mppt max') || rawLabel.includes('أقصى جهد mppt')) {
    const meta = getCanonicalSymbolMeta('Vmppt_max', lang)!;
    return { key: meta.key, parameter: meta.parameter, missingOn: meta.missingOn };
  }
  if (
    category === 'BATTERY' &&
    (lower.includes('nominal voltage') || rawLabel.includes('الجهد الاسمي للبطارية'))
  ) {
    const meta = getCanonicalSymbolMeta('V_batt', lang)!;
    return { key: meta.key, parameter: meta.parameter, missingOn: meta.missingOn };
  }
  if (
    category === 'INVERTER' &&
    (lower.includes('nominal battery') ||
      lower.includes('bus voltage') ||
      rawLabel.includes('ناقل البطارية'))
  ) {
    const meta = getCanonicalSymbolMeta('V_inv_dc', lang)!;
    return { key: meta.key, parameter: meta.parameter, missingOn: meta.missingOn };
  }
  const catLabel = getCategoryLabel(category, lang);
  return {
    key: `comp.${category}.${lower.replace(/[^a-z0-9\u0600-\u06FF]+/g, '_')}`,
    parameter: rawLabel
      .replace(/^Unreadable on nameplate:\s*/i, '')
      .replace(/^غير مقروء على لوحة البيانات:\s*/, ''),
    missingOn: lang === 'ar' ? `سجل ${catLabel}` : `${catLabel} record`,
  };
}

export function buildMissingDataReport(
  project: SolarProject,
  comparisons: EquipmentComparisonResult[],
  checks: EngineeringCheckResult[],
  lang: Language = 'en',
): MissingDataReport {
  const isAr = lang === 'ar';
  const unquotedInstalled = comparisons
    .filter((c) => c.eligibility === 'UNQUOTED_INSTALLED')
    .map((c) =>
      isAr
        ? `${c.label} (${c.installedSummary} — غير مدرج في عرض السعر)`
        : `${c.label} (${c.installedSummary} — absent from quotation)`,
    );

  const missingInstalled = comparisons
    .filter((c) => c.eligibility === 'MISSING_INSTALLED')
    .map((c) =>
      isAr
        ? `${c.label} (${c.promisedSummary} — غير موثق كمركب)`
        : `${c.label} (${c.promisedSummary} — not documented as installed)`,
    );

  const tr = getTranslations(lang);
  const unverifiedAiRecords: string[] = [];
  for (const eq of project.installedEquipment) {
    const prov = resolveEquipmentProvenance(eq, project.isDemo);
    if (prov === 'AI_EXTRACTED' || prov === 'MANUAL_ENTRY') {
      const mfg = eq.manufacturer ?? (isAr ? 'غير معروف' : 'Unknown');
      const mod = eq.model ?? (isAr ? 'غير معروف' : 'Unknown');
      unverifiedAiRecords.push(
        isAr
          ? `مركب: ${getCategoryLabel(eq.category, lang)} (${ltr(`${mfg} ${mod}`)}): ${tr.provenanceShort[prov]}`
          : `Installed ${getCategoryLabel(eq.category, lang)} (${mfg} ${mod}): ${prov}`,
      );
    }
  }
  for (const eq of project.promisedEquipment) {
    const prov = resolveEquipmentProvenance(eq, project.isDemo);
    if (prov === 'AI_EXTRACTED' || prov === 'MANUAL_ENTRY') {
      const mfg = eq.manufacturer ?? (isAr ? 'غير معروف' : 'Unknown');
      const mod = eq.model ?? (isAr ? 'غير معروف' : 'Unknown');
      unverifiedAiRecords.push(
        isAr
          ? `موعود: ${getCategoryLabel(eq.category, lang)} (${ltr(`${mfg} ${mod}`)}): ${tr.provenanceShort[prov]}`
          : `Promised ${getCategoryLabel(eq.category, lang)} (${mfg} ${mod}): ${prov}`,
      );
    }
  }

  const paramMap = new Map<string, MissingParameterEntry>();
  const ensureEntry = (
    key: string,
    parameter: string,
    categoryLabel: string,
    missingOn: string,
  ): MissingParameterEntry => {
    const existing = paramMap.get(key);
    if (existing) return existing;
    const created: MissingParameterEntry = {
      key,
      parameter,
      categoryLabel,
      missingOn,
      blockedChecks: [],
    };
    paramMap.set(key, created);
    return created;
  };

  // 1. Collect missing inputs directly from blocked (INSUFFICIENT DATA) engineering checks
  const blockedChecks = checks
    .filter((ck) => ck.status === 'INSUFFICIENT DATA')
    .map((ck) => {
      for (const inp of ck.inputs) {
        if (inp.value === null) {
          // Special handling for battery bus voltage when range or nominal suffices
          if (
            ck.id === 'check-battery-voltage' &&
            (inp.symbol === 'V_batt_min' || inp.symbol === 'V_batt_max' || inp.symbol === 'V_inv_dc')
          ) {
            if (ck.missingInputs.some((m) => m.includes('V_inv_dc'))) {
              const meta = getCanonicalSymbolMeta('V_inv_dc', lang)!;
              const entry = ensureEntry(meta.key, meta.parameter, meta.categoryLabel, meta.missingOn);
              if (!entry.blockedChecks.includes(ck.title)) {
                entry.blockedChecks.push(ck.title);
              }
            }
            continue;
          }
          const meta = getCanonicalSymbolMeta(inp.symbol, lang);
          if (meta) {
            const entry = ensureEntry(meta.key, meta.parameter, meta.categoryLabel, meta.missingOn);
            if (!entry.blockedChecks.includes(ck.title)) {
              entry.blockedChecks.push(ck.title);
            }
          }
        }
      }
      return {
        checkId: ck.id,
        title: ck.title,
        missingInputs: ck.missingInputs,
      };
    });

  // 2. Merge missing fields from ELIGIBLE equipment comparisons without duplicating parameters
  for (const comp of comparisons) {
    if (comp.eligibility !== 'ELIGIBLE') continue;
    for (const rawMissing of comp.missingFields) {
      const mapped = mapComparisonMissingLabelToCanonicalKey(comp.category, rawMissing, lang);
      if (!mapped) continue;
      ensureEntry(mapped.key, mapped.parameter, comp.label, mapped.missingOn);
    }
  }

  return {
    recordGaps: {
      unquotedInstalled,
      missingInstalled,
      unverifiedAiRecords,
    },
    missingParameters: Array.from(paramMap.values()),
    blockedChecks,
  };
}
