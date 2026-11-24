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
): string[] {
  const reasons: string[] = [];
  if (projectIsDemo) {
    reasons.push('Project is flagged as a demonstration project');
  }
  if (!spec) return reasons;

  if (spec.provenance === 'SIMULATED' || (spec.provenance as string) === 'SIMULATED_DEMO') {
    reasons.push('Record provenance is marked SIMULATED');
  }
  if (typeof spec.id === 'string' && spec.id.startsWith('demo-')) {
    reasons.push('Demonstration record identifier');
  }
  if (typeof spec.model === 'string' && SIMULATED_MODEL_REGEX.test(spec.model)) {
    reasons.push(`Model "${spec.model.trim()}" is a simulated demonstration model`);
  }

  const textFields: Array<{ label: string; value: string | null | undefined }> = [
    { label: 'Technical notes', value: spec.additionalSpecs },
    { label: 'Manufacturer', value: spec.manufacturer },
    { label: 'Model', value: spec.model },
    { label: 'Serial number', value: spec.serialNumber },
    { label: 'Datasheet reference', value: spec.datasheetFileName },
  ];

  for (const field of textFields) {
    if (typeof field.value === 'string' && SIMULATED_TEXT_REGEX.test(field.value)) {
      reasons.push(`${field.label} contains simulated/demo/prototype marker`);
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

export function formatProvenance(p: DataProvenance | string): string {
  const norm = normalizeProvenance(p);
  switch (norm) {
    case 'AI_EXTRACTED':
      return 'AI_EXTRACTED (Unverified AI Read)';
    case 'USER_VERIFIED':
      return 'USER_VERIFIED (Reviewed Against Source)';
    case 'MANUAL_ENTRY':
      return 'MANUAL_ENTRY (Unverified Manual Input)';
    case 'DATASHEET_VERIFIED':
      return 'DATASHEET_VERIFIED (Manufacturer Datasheet)';
    case 'SIMULATED':
      return 'SIMULATED (Demo / Prototype Only)';
  }
}

export function shortProvenanceCode(p: DataProvenance | string): DataProvenance {
  return normalizeProvenance(p);
}

export function formatInputConfidence(level: InputConfidenceLevel): string {
  switch (level) {
    case 'VERIFIED_INPUTS':
      return 'VERIFIED INPUTS';
    case 'SIMULATED_INPUTS':
      return 'SIMULATED INPUTS';
    case 'UNVERIFIED_INPUTS':
      return 'UNVERIFIED INPUTS';
    case 'INCOMPLETE_INPUTS':
      return 'INCOMPLETE INPUTS';
  }
}

export function formatQualifiedResult(
  status: EngineeringCheckStatus,
  inputConfidence: InputConfidenceLevel,
): string {
  if (status === 'INSUFFICIENT DATA') {
    return 'INSUFFICIENT DATA';
  }
  if (status === 'FAIL') {
    return 'FAIL';
  }
  return `${status} — ${formatInputConfidence(inputConfidence)}`;
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

function formatNum(value: number | null | undefined, unit = ''): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Not specified';
  }
  return unit ? `${value} ${unit}` : `${value}`;
}

function summarizeSpec(spec: EquipmentSpec | undefined): string {
  if (!spec) return 'No record provided';
  const parts: string[] = [];
  if (spec.manufacturer) parts.push(spec.manufacturer);
  if (spec.model) parts.push(spec.model);
  if (spec.ratedPowerW !== null) parts.push(`${spec.ratedPowerW} W`);
  if (spec.capacityKwh !== null) parts.push(`${spec.capacityKwh} kWh`);
  if (spec.quantity !== null) parts.push(`Qty ${spec.quantity}`);
  return parts.length > 0 ? parts.join(' · ') : 'Incomplete specification';
}

export function comparePromisedVsInstalled(project: SolarProject): EquipmentComparisonResult[] {
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
      const label = CATEGORY_LABELS[category];

      if (!promised && !installed) {
        return {
          category,
          label,
          eligibility: 'NO_RECORDS' as ComparisonEligibility,
          status: 'NOT VERIFIED',
          promisedSummary: 'No promised equipment entered',
          installedSummary: 'No installed nameplate recorded',
          differences: [],
          missingFields: ['Promised equipment record', 'Installed equipment nameplate'],
        };
      }

      if (!promised && installed) {
        return {
          category,
          label,
          eligibility: 'UNQUOTED_INSTALLED' as ComparisonEligibility,
          status: 'NOT VERIFIED',
          promisedSummary: 'Not listed in quotation',
          installedSummary: summarizeSpec(installed),
          differences: [
            {
              field: 'Quotation Coverage',
              promised: 'Absent from quotation',
              installed: summarizeSpec(installed),
              status: 'NOT VERIFIED',
              note: 'Equipment is documented as installed, but no promised quotation line item exists. Excluded from Equipment Match %.',
            },
          ],
          missingFields: ['Contractual quotation specification for installed category'],
        };
      }

      if (promised && !installed) {
        return {
          category,
          label,
          eligibility: 'MISSING_INSTALLED' as ComparisonEligibility,
          status: 'NOT VERIFIED',
          promisedSummary: summarizeSpec(promised),
          installedSummary: 'Not documented on site',
          differences: [
            {
              field: 'Installed Documentation',
              promised: summarizeSpec(promised),
              installed: 'No nameplate recorded',
              status: 'NOT VERIFIED',
              note: 'Equipment was promised in the quotation, but no installed nameplate record has been logged. Excluded from Equipment Match %.',
            },
          ],
          missingFields: ['Installed equipment nameplate record'],
        };
      }

      const p = promised!;
      const inst = installed!;
      const differences: ComparisonDifference[] = [];
      const missingFields: string[] = [];

      if (inst.unreadableFields.length > 0) {
        missingFields.push(
          ...inst.unreadableFields.map((f) => `Unreadable on nameplate: ${f}`),
        );
      }
      if (p.uncertainFields.length > 0) {
        missingFields.push(
          ...p.uncertainFields.map((f) => `Uncertain in quotation: ${f}`),
        );
      }

      // 1. Manufacturer comparison
      const pMfg = normalizeText(p.manufacturer);
      const iMfg = normalizeText(inst.manufacturer);
      if (!p.manufacturer || !inst.manufacturer) {
        missingFields.push('Manufacturer');
        differences.push({
          field: 'Manufacturer',
          promised: p.manufacturer ?? 'Missing',
          installed: inst.manufacturer ?? 'Missing',
          status: 'NOT VERIFIED',
          note: 'Manufacturer is missing on quotation or installed record.',
        });
      } else if (pMfg !== iMfg && !pMfg.includes(iMfg) && !iMfg.includes(pMfg)) {
        differences.push({
          field: 'Manufacturer',
          promised: p.manufacturer,
          installed: inst.manufacturer,
          status: 'MISMATCH',
          note: 'Observed nameplate manufacturer differs from the quotation.',
        });
      } else {
        differences.push({
          field: 'Manufacturer',
          promised: p.manufacturer,
          installed: inst.manufacturer,
          status: 'MATCH',
          note: 'Manufacturer matches quotation.',
        });
      }

      // 2. Model comparison
      const pModel = normalizeText(p.model);
      const iModel = normalizeText(inst.model);
      if (!p.model || !inst.model) {
        missingFields.push('Model Number');
        differences.push({
          field: 'Model Number',
          promised: p.model ?? 'Missing',
          installed: inst.model ?? 'Missing',
          status: 'NOT VERIFIED',
          note: 'Model identifier missing in quotation or nameplate.',
        });
      } else if (pModel !== iModel) {
        differences.push({
          field: 'Model Number',
          promised: p.model,
          installed: inst.model,
          status: 'MISMATCH',
          note: 'Installed equipment model differs from contractual quotation.',
        });
      } else {
        differences.push({
          field: 'Model Number',
          promised: p.model,
          installed: inst.model,
          status: 'MATCH',
          note: 'Exact model designation confirmed.',
        });
      }

      // 3. Quantity comparison
      if (p.quantity === null || inst.quantity === null) {
        missingFields.push('Quantity');
        differences.push({
          field: 'Quantity',
          promised: formatNum(p.quantity, 'units'),
          installed: formatNum(inst.quantity, 'units'),
          status: 'NOT VERIFIED',
          note: 'Unit count is missing in one record.',
        });
      } else if (inst.quantity !== p.quantity) {
        const diff = inst.quantity - p.quantity;
        differences.push({
          field: 'Quantity',
          promised: `${p.quantity} units`,
          installed: `${inst.quantity} units`,
          status: diff < 0 ? 'MISMATCH' : 'WARNING',
          note:
            diff < 0
              ? `Shortfall of ${Math.abs(diff)} unit(s) compared to quotation.`
              : `${diff} additional unit(s) installed compared to quotation.`,
        });
      } else {
        differences.push({
          field: 'Quantity',
          promised: `${p.quantity} units`,
          installed: `${inst.quantity} units`,
          status: 'MATCH',
          note: 'Installed unit quantity matches quotation.',
        });
      }

      // 4. Rated Power (PV & Inverter)
      if (category === 'PV_MODULE' || category === 'INVERTER') {
        if (p.ratedPowerW === null || inst.ratedPowerW === null) {
          missingFields.push('Rated Power (W)');
          differences.push({
            field: 'Unit Rated Power',
            promised: formatNum(p.ratedPowerW, 'W'),
            installed: formatNum(inst.ratedPowerW, 'W'),
            status: 'NOT VERIFIED',
            note: 'Rated power specification is missing on one record.',
          });
        } else if (p.ratedPowerW <= 0) {
          differences.push({
            field: 'Unit Rated Power',
            promised: `${p.ratedPowerW} W`,
            installed: `${inst.ratedPowerW} W`,
            status: 'NOT VERIFIED',
            note: 'Promised rated power must be greater than zero for tolerance comparison.',
          });
        } else {
          const deltaW = inst.ratedPowerW - p.ratedPowerW;
          const pct = Math.abs(deltaW) / p.ratedPowerW;
          if (pct > 0.02) {
            differences.push({
              field: 'Unit Rated Power',
              promised: `${p.ratedPowerW} W`,
              installed: `${inst.ratedPowerW} W`,
              status: 'MISMATCH',
              note:
                deltaW < 0
                  ? `Installed unit is ${Math.abs(deltaW)} W (${(pct * 100).toFixed(1)}%) lower than promised.`
                  : `Installed unit differs by +${deltaW} W (${(pct * 100).toFixed(1)}%).`,
            });
          } else {
            differences.push({
              field: 'Unit Rated Power',
              promised: `${p.ratedPowerW} W`,
              installed: `${inst.ratedPowerW} W`,
              status: 'MATCH',
              note: 'Rated power matches within tolerance.',
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
          field: 'Total Array Capacity',
          promised: `${pTotalKw.toFixed(2)} kWp`,
          installed: `${iTotalKw.toFixed(2)} kWp`,
          status: Math.abs(deltaKw) > 0.05 ? 'MISMATCH' : 'MATCH',
          note:
            Math.abs(deltaKw) > 0.05
              ? `Net array capacity difference of ${deltaKw > 0 ? '+' : ''}${deltaKw.toFixed(2)} kWp.`
              : 'Total array DC capacity matches quotation.',
        });
      }

      if (category === 'BATTERY') {
        if (p.capacityKwh === null || inst.capacityKwh === null) {
          missingFields.push('Battery Unit Capacity (kWh)');
          differences.push({
            field: 'Unit Storage Capacity',
            promised: formatNum(p.capacityKwh, 'kWh'),
            installed: formatNum(inst.capacityKwh, 'kWh'),
            status: 'NOT VERIFIED',
            note: 'Battery kWh rating is missing on one record.',
          });
        } else {
          const pTotalKwh = p.capacityKwh * (p.quantity ?? 1);
          const iTotalKwh = inst.capacityKwh * (inst.quantity ?? 1);
          const deltaKwh = iTotalKwh - pTotalKwh;
          differences.push({
            field: 'Total Battery Capacity',
            promised: `${pTotalKwh.toFixed(2)} kWh`,
            installed: `${iTotalKwh.toFixed(2)} kWh`,
            status: Math.abs(deltaKwh) > 0.1 ? 'MISMATCH' : 'MATCH',
            note:
              Math.abs(deltaKwh) > 0.1
                ? `Total storage capacity variance of ${deltaKwh > 0 ? '+' : ''}${deltaKwh.toFixed(2)} kWh.`
                : 'Total storage capacity matches quotation.',
          });
        }

        if (p.nominalVoltageV !== null || inst.nominalVoltageV !== null) {
          if (p.nominalVoltageV === null || inst.nominalVoltageV === null) {
            missingFields.push('Battery Nominal Voltage (V)');
            differences.push({
              field: 'Nominal Voltage',
              promised: formatNum(p.nominalVoltageV, 'V'),
              installed: formatNum(inst.nominalVoltageV, 'V'),
              status: 'NOT VERIFIED',
              note: 'Battery nominal voltage is missing on one record.',
            });
          } else {
            differences.push({
              field: 'Nominal Voltage',
              promised: `${p.nominalVoltageV} V`,
              installed: `${inst.nominalVoltageV} V`,
              status: p.nominalVoltageV === inst.nominalVoltageV ? 'MATCH' : 'MISMATCH',
              note:
                p.nominalVoltageV === inst.nominalVoltageV
                  ? 'Battery nominal voltage matches quotation.'
                  : 'Battery nominal voltage differs from quotation.',
            });
          }
        }
      }

      // 6. Electrical limits comparison for Inverter
      if (category === 'INVERTER') {
        if (p.maxPvInputVoltageV !== null || inst.maxPvInputVoltageV !== null) {
          if (p.maxPvInputVoltageV === null || inst.maxPvInputVoltageV === null) {
            missingFields.push('Inverter Max PV Input Voltage (V)');
            differences.push({
              field: 'Max PV Input Voltage',
              promised: formatNum(p.maxPvInputVoltageV, 'V'),
              installed: formatNum(inst.maxPvInputVoltageV, 'V'),
              status: 'NOT VERIFIED',
              note: 'Max PV input voltage rating is missing on one record.',
            });
          } else {
            const vDiff = inst.maxPvInputVoltageV - p.maxPvInputVoltageV;
            differences.push({
              field: 'Max PV Input Voltage',
              promised: `${p.maxPvInputVoltageV} V`,
              installed: `${inst.maxPvInputVoltageV} V`,
              status: vDiff < 0 ? 'MISMATCH' : vDiff > 0 ? 'WARNING' : 'MATCH',
              note:
                vDiff < 0
                  ? `Installed inverter has a lower PV voltage limit (${vDiff} V).`
                  : vDiff > 0
                    ? `Installed inverter has a higher PV voltage limit (+${vDiff} V).`
                    : 'Max PV input voltage matches quotation.',
            });
          }
        }

        if (p.nominalVoltageV !== null || inst.nominalVoltageV !== null) {
          if (p.nominalVoltageV === null || inst.nominalVoltageV === null) {
            missingFields.push('Inverter Nominal Battery / Bus Voltage (V)');
            differences.push({
              field: 'Nominal Battery / Bus Voltage',
              promised: formatNum(p.nominalVoltageV, 'V'),
              installed: formatNum(inst.nominalVoltageV, 'V'),
              status: 'NOT VERIFIED',
              note: 'Nominal DC bus voltage is missing on one record.',
            });
          } else {
            differences.push({
              field: 'Nominal Battery / Bus Voltage',
              promised: `${p.nominalVoltageV} V`,
              installed: `${inst.nominalVoltageV} V`,
              status: p.nominalVoltageV === inst.nominalVoltageV ? 'MATCH' : 'MISMATCH',
              note:
                p.nominalVoltageV === inst.nominalVoltageV
                  ? 'Nominal DC bus voltage matches.'
                  : 'Nominal DC bus voltage differs from quotation.',
            });
          }
        }

        if (p.maxPvOperatingCurrentA !== null || inst.maxPvOperatingCurrentA !== null) {
          if (p.maxPvOperatingCurrentA === null || inst.maxPvOperatingCurrentA === null) {
            missingFields.push('Inverter Max PV Operating Current (Imp limit)');
            differences.push({
              field: 'Max PV Operating Current',
              promised: formatNum(p.maxPvOperatingCurrentA, 'A'),
              installed: formatNum(inst.maxPvOperatingCurrentA, 'A'),
              status: 'NOT VERIFIED',
              note: 'Max PV operating current rating is missing on one record.',
            });
          } else {
            const cDiff = inst.maxPvOperatingCurrentA - p.maxPvOperatingCurrentA;
            differences.push({
              field: 'Max PV Operating Current',
              promised: `${p.maxPvOperatingCurrentA} A`,
              installed: `${inst.maxPvOperatingCurrentA} A`,
              status: cDiff < 0 ? 'MISMATCH' : cDiff > 0 ? 'WARNING' : 'MATCH',
              note:
                cDiff < 0
                  ? `Installed inverter operating current limit is ${Math.abs(cDiff)} A lower than promised.`
                  : cDiff > 0
                    ? `Installed inverter operating current limit is +${cDiff} A higher.`
                    : 'Max PV operating current matches quotation.',
            });
          }
        }

        if (p.maxPvShortCircuitCurrentA !== null || inst.maxPvShortCircuitCurrentA !== null) {
          if (
            p.maxPvShortCircuitCurrentA === null ||
            inst.maxPvShortCircuitCurrentA === null
          ) {
            missingFields.push('Inverter Max PV Short-Circuit Current (Isc limit)');
            differences.push({
              field: 'Max PV Short-Circuit Current',
              promised: formatNum(p.maxPvShortCircuitCurrentA, 'A'),
              installed: formatNum(inst.maxPvShortCircuitCurrentA, 'A'),
              status: 'NOT VERIFIED',
              note: 'Max PV short-circuit current rating is missing on one record.',
            });
          } else {
            const scDiff = inst.maxPvShortCircuitCurrentA - p.maxPvShortCircuitCurrentA;
            differences.push({
              field: 'Max PV Short-Circuit Current',
              promised: `${p.maxPvShortCircuitCurrentA} A`,
              installed: `${inst.maxPvShortCircuitCurrentA} A`,
              status: scDiff < 0 ? 'MISMATCH' : scDiff > 0 ? 'WARNING' : 'MATCH',
              note:
                scDiff < 0
                  ? `Installed inverter short-circuit current limit is ${Math.abs(scDiff)} A lower than promised.`
                  : scDiff > 0
                    ? `Installed inverter short-circuit current limit is +${scDiff} A higher.`
                    : 'Max PV short-circuit current matches quotation.',
            });
          }
        }
      }

      // 7. Provenance completeness tracking
      const instProv = resolveEquipmentProvenance(inst, project.isDemo);
      if (instProv === 'AI_EXTRACTED') {
        missingFields.push('User confirmation of AI-extracted nameplate fields');
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
        promisedSummary: summarizeSpec(p),
        installedSummary: summarizeSpec(inst),
        differences,
        missingFields: Array.from(new Set(missingFields)),
      };
    });
}

function getFieldSourceTag(
  spec: EquipmentSpec | undefined,
  fieldKey: string,
  projectIsDemo: boolean,
): { source: string; provenance: DataProvenance | 'MISSING' } {
  if (!spec) return { source: 'Missing', provenance: 'MISSING' };
  const prov = getFieldProvenance(spec, fieldKey, projectIsDemo);
  switch (prov) {
    case 'SIMULATED':
      return { source: 'SIMULATED (Demo/Prototype Record)', provenance: prov };
    case 'DATASHEET_VERIFIED':
      return {
        source: `DATASHEET_VERIFIED${spec.datasheetFileName ? ` (${spec.datasheetFileName})` : ''}`,
        provenance: prov,
      };
    case 'USER_VERIFIED':
      return { source: 'USER_VERIFIED (Nameplate/Source Confirmed)', provenance: prov };
    case 'AI_EXTRACTED':
      return { source: 'AI_EXTRACTED (Unverified AI Read)', provenance: prov };
    case 'MANUAL_ENTRY':
      return { source: 'MANUAL_ENTRY (Unverified Manual Input)', provenance: prov };
  }
}

function getArraySourceTag(
  config: ArrayConfiguration,
  projectIsDemo: boolean,
): { source: string; provenance: DataProvenance } {
  const prov = resolveArrayProvenance(config, projectIsDemo);
  if (prov === 'SIMULATED') {
    return { source: 'SIMULATED (Demo Array Config)', provenance: 'SIMULATED' };
  }
  return { source: `${prov} (Array Topology Input)`, provenance: prov };
}

function makeEquipmentTrace(
  label: string,
  symbol: string,
  value: number | null,
  unit: string,
  spec: EquipmentSpec | undefined,
  fieldKey: string,
  projectIsDemo: boolean,
): EngineeringInputTrace {
  const tag = getFieldSourceTag(spec, fieldKey, projectIsDemo);
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
): EngineeringCheckResult {
  const inputConfidence = resolveInputConfidence(base.status, base.inputs);
  const qualifiedResult = formatQualifiedResult(base.status, inputConfidence);
  return {
    ...base,
    inputConfidence,
    qualifiedResult,
  };
}

export function runEngineeringValidation(project: SolarProject): EngineeringCheckResult[] {
  const pv = project.installedEquipment.find((e) => e.category === 'PV_MODULE');
  const inverter = project.installedEquipment.find((e) => e.category === 'INVERTER');
  const battery = project.installedEquipment.find((e) => e.category === 'BATTERY');
  const cfg = project.arrayConfig;
  const isDemo = project.isDemo;

  const arrTag = getArraySourceTag(cfg, isDemo);

  const checks: EngineeringCheckResult[] = [];

  // 1. PV String STC Open-Circuit Voltage vs Inverter Max PV Input Voltage
  {
    const inputs: EngineeringInputTrace[] = [
      makeConfigTrace('Modules in Series', 'Ns', cfg.modulesPerString, 'modules', arrTag),
      makeEquipmentTrace('Module Voc (STC)', 'Voc_mod', pv?.vocV ?? null, 'V', pv, 'vocV', isDemo),
      makeEquipmentTrace(
        'Inverter Max PV Voltage',
        'Vdc_max',
        inverter?.maxPvInputVoltageV ?? null,
        'V',
        inverter,
        'maxPvInputVoltageV',
        isDemo,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${i.symbol})`);

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
          title: 'PV String Voltage (STC) vs. Inverter Max DC Input',
          category: 'PV_STRING',
          status: 'INSUFFICIENT DATA',
          formula: 'Voc_string = Ns × Voc_mod ≤ Vdc_max',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'V',
          limitLabel: 'Inverter Max PV Input Voltage',
          limitValue: inverter?.maxPvInputVoltageV ? `${inverter.maxPvInputVoltageV} V` : 'Missing',
          missingInputs:
            missing.length > 0 ? missing : ['Valid positive Ns, Voc_mod, and Vdc_max'],
          explanation:
            'Cannot validate string open-circuit voltage without valid series count, module Voc, and inverter Vdc_max.',
        }),
      );
    } else {
      const vocString = Number((cfg.modulesPerString * pv.vocV).toFixed(2));
      const limit = inverter.maxPvInputVoltageV;
      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = `String Voc (${vocString} V) is within the ${limit} V inverter maximum DC input limit with ${((1 - vocString / limit) * 100).toFixed(1)}% headroom.`;
      if (vocString > limit) {
        status = 'FAIL';
        explanation = `String Voc (${vocString} V) exceeds the inverter maximum PV input voltage (${limit} V) by ${(vocString - limit).toFixed(2)} V even at 25°C STC.`;
      } else if (vocString > limit * 0.9) {
        status = 'WARNING';
        explanation = `String Voc (${vocString} V) is above 90% of the ${limit} V inverter limit; low ambient temperatures could push Voc past Vdc_max.`;
      }
      checks.push(
        buildCheckResult({
          id: 'check-pv-voc-stc',
          title: 'PV String Voltage (STC) vs. Inverter Max DC Input',
          category: 'PV_STRING',
          status,
          formula: 'Voc_string = Ns × Voc_mod',
          inputs,
          calculatedValue: vocString,
          calculatedUnit: 'V',
          limitLabel: 'Inverter Max PV Input Voltage',
          limitValue: `≤ ${limit} V`,
          missingInputs: [],
          explanation,
        }),
      );
    }
  }

  // 2. Temperature-Corrected Cold-Weather Voc
  {
    const inputs: EngineeringInputTrace[] = [
      makeConfigTrace('Modules in Series', 'Ns', cfg.modulesPerString, 'modules', arrTag),
      makeEquipmentTrace('Module Voc (STC)', 'Voc_mod', pv?.vocV ?? null, 'V', pv, 'vocV', isDemo),
      makeEquipmentTrace(
        'Voc Temp. Coefficient',
        'β_Voc',
        pv?.tempCoeffVocPctPerC ?? null,
        '%/°C',
        pv,
        'tempCoeffVocPctPerC',
        isDemo,
      ),
      makeConfigTrace('Min Site Ambient Temp', 'T_min', cfg.minAmbientTempC, '°C', arrTag),
      makeEquipmentTrace(
        'Inverter Max PV Voltage',
        'Vdc_max',
        inverter?.maxPvInputVoltageV ?? null,
        'V',
        inverter,
        'maxPvInputVoltageV',
        isDemo,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${i.symbol})`);

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
          title: 'Temperature-Corrected Open-Circuit Voltage (Cold Weather)',
          category: 'THERMAL_VOC',
          status: 'INSUFFICIENT DATA',
          formula: 'Voc_cold = Ns × Voc_mod × [1 + (β_Voc / 100) × (T_min − 25)]',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'V',
          limitLabel: 'Inverter Max PV Input Voltage',
          limitValue: inverter?.maxPvInputVoltageV
            ? `≤ ${inverter.maxPvInputVoltageV} V`
            : 'Missing',
          missingInputs:
            missing.length > 0 ? missing : ['Valid positive Ns, Voc_mod, and Vdc_max'],
          explanation:
            'MITHAQ-Lab never assumes temperature coefficients or ambient site temperatures. Enter all missing datasheet and climate inputs to run this check.',
        }),
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
      let explanation = `At ${cfg.minAmbientTempC}°C, temperature-corrected Voc is ${vocCold} V, remaining below the ${limit} V inverter limit.`;
      if (vocCold > limit) {
        status = 'FAIL';
        explanation = `At ${cfg.minAmbientTempC}°C, temperature-corrected Voc (${vocCold} V) exceeds inverter Vdc_max (${limit} V) by ${(vocCold - limit).toFixed(2)} V.`;
      } else if (vocCold > limit * 0.95) {
        status = 'WARNING';
        explanation = `At ${cfg.minAmbientTempC}°C, temperature-corrected Voc (${vocCold} V) exceeds 95% of inverter Vdc_max (${limit} V).`;
      }
      checks.push(
        buildCheckResult({
          id: 'check-thermal-voc',
          title: 'Temperature-Corrected Open-Circuit Voltage (Cold Weather)',
          category: 'THERMAL_VOC',
          status,
          formula: 'Voc_cold = Ns × Voc_mod × [1 + (β_Voc / 100) × (T_min − 25)]',
          inputs,
          calculatedValue: vocCold,
          calculatedUnit: 'V',
          limitLabel: 'Inverter Max PV Input Voltage',
          limitValue: `≤ ${limit} V`,
          missingInputs: [],
          explanation,
        }),
      );
    }
  }

  // 3. MPPT Operating Voltage Range
  {
    const inputs: EngineeringInputTrace[] = [
      makeConfigTrace('Modules in Series', 'Ns', cfg.modulesPerString, 'modules', arrTag),
      makeEquipmentTrace('Module Vmp (STC)', 'Vmp_mod', pv?.vmpV ?? null, 'V', pv, 'vmpV', isDemo),
      makeEquipmentTrace(
        'Inverter MPPT Min',
        'Vmppt_min',
        inverter?.mpptMinV ?? null,
        'V',
        inverter,
        'mpptMinV',
        isDemo,
      ),
      makeEquipmentTrace(
        'Inverter MPPT Max',
        'Vmppt_max',
        inverter?.mpptMaxV ?? null,
        'V',
        inverter,
        'mpptMaxV',
        isDemo,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${i.symbol})`);

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
          title: 'String Operating Voltage vs. MPPT Tracking Window',
          category: 'MPPT',
          status: 'INSUFFICIENT DATA',
          formula: 'Vmp_string = Ns × Vmp_mod ∈ [Vmppt_min, Vmppt_max]',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'V',
          limitLabel: 'MPPT Voltage Window',
          limitValue:
            inverter?.mpptMinV !== null &&
            inverter?.mpptMinV !== undefined &&
            inverter?.mpptMaxV !== null &&
            inverter?.mpptMaxV !== undefined
              ? `${inverter.mpptMinV} – ${inverter.mpptMaxV} V`
              : 'Missing',
          missingInputs:
            missing.length > 0
              ? missing
              : ['Valid MPPT window bounds (Vmppt_max > Vmppt_min) and positive Ns/Vmp'],
          explanation:
            'Requires series module count, module Vmp, and valid inverter MPPT min/max bounds.',
        }),
      );
    } else {
      const vmpString = Number((cfg.modulesPerString * pv.vmpV).toFixed(2));
      const { mpptMinV, mpptMaxV } = inverter;
      const span = mpptMaxV - mpptMinV;
      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = `String Vmp (${vmpString} V) sits comfortably inside the inverter MPPT operating window (${mpptMinV}–${mpptMaxV} V).`;
      if (vmpString < mpptMinV || vmpString > mpptMaxV) {
        status = 'FAIL';
        explanation =
          vmpString < mpptMinV
            ? `String Vmp (${vmpString} V) is below the minimum MPPT threshold (${mpptMinV} V).`
            : `String Vmp (${vmpString} V) exceeds the maximum MPPT ceiling (${mpptMaxV} V).`;
      } else if (vmpString < mpptMinV + span * 0.08 || vmpString > mpptMaxV - span * 0.08) {
        status = 'WARNING';
        explanation = `String Vmp (${vmpString} V) is within 8% of the MPPT window edge (${mpptMinV}–${mpptMaxV} V); high cell temperatures may reduce tracking efficiency.`;
      }
      checks.push(
        buildCheckResult({
          id: 'check-mppt-window',
          title: 'String Operating Voltage vs. MPPT Tracking Window',
          category: 'MPPT',
          status,
          formula: 'Vmp_string = Ns × Vmp_mod',
          inputs,
          calculatedValue: vmpString,
          calculatedUnit: 'V',
          limitLabel: 'MPPT Operating Window',
          limitValue: `${mpptMinV} – ${mpptMaxV} V`,
          missingInputs: [],
          explanation,
        }),
      );
    }
  }

  // 4a. Parallel Array Operating Current (Imp) vs Inverter Max PV Operating Current
  {
    const maxOpCurrent = inverter?.maxPvOperatingCurrentA ?? null;
    const inputs: EngineeringInputTrace[] = [
      makeConfigTrace('Parallel Strings', 'Np', cfg.parallelStrings, 'strings', arrTag),
      makeEquipmentTrace('Module Imp (STC)', 'Imp_mod', pv?.impA ?? null, 'A', pv, 'impA', isDemo),
      makeEquipmentTrace(
        'Inverter Max PV Operating Current',
        'Ipv_op_max',
        maxOpCurrent,
        'A',
        inverter,
        'maxPvOperatingCurrentA',
        isDemo,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${i.symbol})`);

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
          title: 'Parallel Array Operating Current (Imp) vs. Inverter Max PV Operating Current',
          category: 'CURRENT',
          status: 'INSUFFICIENT DATA',
          formula: 'I_array_mp = Np × Imp_mod ≤ Ipv_op_max',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'A',
          limitLabel: 'Inverter Max PV Operating Current',
          limitValue: maxOpCurrent !== null ? `≤ ${maxOpCurrent} A` : 'Missing',
          missingInputs:
            missing.length > 0 ? missing : ['Valid positive Np, Imp_mod, and Ipv_op_max'],
          explanation:
            'Requires parallel string count, module Imp, and the inverter datasheet max PV operating input current limit (Ipv_op_max). Short-circuit current limits cannot be substituted.',
        }),
      );
    } else {
      const iArrayMp = Number((cfg.parallelStrings * pv.impA).toFixed(2));
      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = `Combined parallel operating current (${iArrayMp} A across ${cfg.parallelStrings} string(s)) is within the inverter ${maxOpCurrent} A operating input limit.`;

      if (iArrayMp > maxOpCurrent) {
        status = 'FAIL';
        explanation = `Combined parallel operating current (${iArrayMp} A across ${cfg.parallelStrings} string(s)) exceeds inverter max PV operating current (${maxOpCurrent} A) by ${(iArrayMp - maxOpCurrent).toFixed(2)} A.`;
      } else if (iArrayMp > maxOpCurrent * 0.9) {
        status = 'WARNING';
        explanation = `Combined parallel operating current (${iArrayMp} A) exceeds 90% of the inverter ${maxOpCurrent} A operating current rating.`;
      }

      checks.push(
        buildCheckResult({
          id: 'check-pv-operating-current',
          title: 'Parallel Array Operating Current (Imp) vs. Inverter Max PV Operating Current',
          category: 'CURRENT',
          status,
          formula: 'I_array_mp = Np × Imp_mod',
          inputs,
          calculatedValue: iArrayMp,
          calculatedUnit: 'A',
          limitLabel: 'Inverter Max PV Operating Current',
          limitValue: `≤ ${maxOpCurrent} A`,
          missingInputs: [],
          explanation,
        }),
      );
    }
  }

  // 4b. Parallel Array Short-Circuit Current (Isc) vs Inverter Max PV Short-Circuit Current
  {
    const maxScCurrent = inverter?.maxPvShortCircuitCurrentA ?? null;
    const inputs: EngineeringInputTrace[] = [
      makeConfigTrace('Parallel Strings', 'Np', cfg.parallelStrings, 'strings', arrTag),
      makeEquipmentTrace('Module Isc (STC)', 'Isc_mod', pv?.iscA ?? null, 'A', pv, 'iscA', isDemo),
      makeEquipmentTrace(
        'Inverter Max PV Short-Circuit Current',
        'Ipv_sc_max',
        maxScCurrent,
        'A',
        inverter,
        'maxPvShortCircuitCurrentA',
        isDemo,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${i.symbol})`);

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
          title: 'Parallel Array Short-Circuit Current (Isc) vs. Inverter Max PV Short-Circuit Current',
          category: 'CURRENT',
          status: 'INSUFFICIENT DATA',
          formula: 'I_array_sc = Np × Isc_mod ≤ Ipv_sc_max',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'A',
          limitLabel: 'Inverter Max PV Short-Circuit Current',
          limitValue: maxScCurrent !== null ? `≤ ${maxScCurrent} A` : 'Missing',
          missingInputs:
            missing.length > 0 ? missing : ['Valid positive Np, Isc_mod, and Ipv_sc_max'],
          explanation:
            'Requires parallel string count, module Isc, and the inverter datasheet max PV short-circuit current limit (Ipv_sc_max). Operating current limits cannot be substituted.',
        }),
      );
    } else {
      const iArraySc = Number((cfg.parallelStrings * pv.iscA).toFixed(2));
      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = `Combined parallel short-circuit current (${iArraySc} A across ${cfg.parallelStrings} string(s)) is within the inverter ${maxScCurrent} A short-circuit input limit.`;

      if (iArraySc > maxScCurrent) {
        status = 'FAIL';
        explanation = `Combined parallel short-circuit current (${iArraySc} A across ${cfg.parallelStrings} string(s)) exceeds inverter max PV short-circuit current (${maxScCurrent} A) by ${(iArraySc - maxScCurrent).toFixed(2)} A.`;
      } else if (iArraySc > maxScCurrent * 0.9) {
        status = 'WARNING';
        explanation = `Combined parallel short-circuit current (${iArraySc} A) exceeds 90% of the inverter ${maxScCurrent} A short-circuit rating, leaving minimal irradiance surge margin.`;
      }

      checks.push(
        buildCheckResult({
          id: 'check-pv-shortcircuit-current',
          title: 'Parallel Array Short-Circuit Current (Isc) vs. Inverter Max PV Short-Circuit Current',
          category: 'CURRENT',
          status,
          formula: 'I_array_sc = Np × Isc_mod',
          inputs,
          calculatedValue: iArraySc,
          calculatedUnit: 'A',
          limitLabel: 'Inverter Max PV Short-Circuit Current',
          limitValue: `≤ ${maxScCurrent} A`,
          missingInputs: [],
          explanation,
        }),
      );
    }
  }

  // 5. Array DC-to-Inverter AC Power Ratio & Configuration Count Check
  {
    const inputs: EngineeringInputTrace[] = [
      makeEquipmentTrace(
        'Installed Module Count',
        'N_pv',
        pv?.quantity ?? null,
        'modules',
        pv,
        'quantity',
        isDemo,
      ),
      makeEquipmentTrace(
        'Module Rated Power',
        'P_mod',
        pv?.ratedPowerW ?? null,
        'W',
        pv,
        'ratedPowerW',
        isDemo,
      ),
      makeEquipmentTrace(
        'Inverter Rated AC Power',
        'P_inv',
        inverter?.ratedPowerW ?? null,
        'W',
        inverter,
        'ratedPowerW',
        isDemo,
      ),
    ];
    const missing = inputs.filter((i) => i.value === null).map((i) => `${i.label} (${i.symbol})`);

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
          title: 'Array DC-to-Inverter AC Sizing Ratio',
          category: 'POWER_RATIO',
          status: 'INSUFFICIENT DATA',
          formula: 'DC/AC Ratio = (N_pv × P_mod) / P_inv',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'ratio',
          limitLabel: 'Recommended Sizing Window',
          limitValue: '0.75 – 1.35 (Max 1.50)',
          missingInputs:
            missing.length > 0 ? missing : ['Valid positive N_pv, P_mod, and P_inv'],
          explanation:
            'Requires installed module count, module wattage, and inverter rated AC power.',
        }),
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
          ? ` Note: Array layout (${cfg.modulesPerString}S × ${cfg.parallelStrings}P = ${configuredTotal}) differs from installed module count (${pv.quantity}).`
          : '';

      let status: EngineeringCheckResult['status'] = 'PASS';
      let explanation = `Total installed PV DC power (${(totalDcW / 1000).toFixed(2)} kWp) vs. inverter AC rating (${(inverter.ratedPowerW / 1000).toFixed(2)} kW) gives a DC/AC ratio of ${ratio}.${countMismatchNote}`;

      if (ratio > 1.5) {
        status = 'FAIL';
        explanation = `DC/AC ratio (${ratio}) exceeds 1.50 upper limit (${totalDcW} W DC on ${inverter.ratedPowerW} W inverter).${countMismatchNote}`;
      } else if (
        ratio > 1.35 ||
        ratio < 0.75 ||
        (configuredTotal !== null && configuredTotal !== pv.quantity)
      ) {
        status = 'WARNING';
        explanation =
          ratio > 1.35 || ratio < 0.75
            ? `DC/AC ratio (${ratio}) falls outside the standard 0.75–1.35 operating band.${countMismatchNote}`
            : `DC/AC ratio is ${ratio}, however array wiring layout count (${configuredTotal}) does not match installed module quantity (${pv.quantity}).`;
      }

      checks.push(
        buildCheckResult({
          id: 'check-dc-ac-ratio',
          title: 'Array DC-to-Inverter AC Sizing Ratio',
          category: 'POWER_RATIO',
          status,
          formula: 'DC/AC Ratio = (N_pv × P_mod) / P_inv',
          inputs,
          calculatedValue: ratio,
          calculatedUnit: 'DC/AC',
          limitLabel: 'Engineering Sizing Range',
          limitValue: '0.75 – 1.35 (Fail > 1.50)',
          missingInputs: [],
          explanation,
        }),
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
        'Battery Nominal Voltage',
        'V_batt',
        battery?.nominalVoltageV ?? null,
        'V',
        battery,
        'nominalVoltageV',
        isDemo,
      ),
      makeEquipmentTrace(
        'Inverter Battery Bus Voltage',
        'V_inv_dc',
        inverter?.nominalVoltageV ?? null,
        'V',
        inverter,
        'nominalVoltageV',
        isDemo,
      ),
      makeEquipmentTrace(
        'Inverter Battery Min V',
        'V_batt_min',
        inverter?.minBatteryVoltageV ?? null,
        'V',
        inverter,
        'minBatteryVoltageV',
        isDemo,
      ),
      makeEquipmentTrace(
        'Inverter Battery Max V',
        'V_batt_max',
        inverter?.maxBatteryVoltageV ?? null,
        'V',
        inverter,
        'maxBatteryVoltageV',
        isDemo,
      ),
    ];

    const missing: string[] = [];
    if (battery?.nominalVoltageV === null || battery?.nominalVoltageV === undefined) {
      missing.push('Battery Nominal Voltage (V_batt)');
    }
    const hasInverterRange =
      inverter?.minBatteryVoltageV !== null &&
      inverter?.minBatteryVoltageV !== undefined &&
      inverter?.maxBatteryVoltageV !== null &&
      inverter?.maxBatteryVoltageV !== undefined;
    const hasInverterNom =
      inverter?.nominalVoltageV !== null && inverter?.nominalVoltageV !== undefined;

    if (!hasInverterRange && !hasInverterNom) {
      missing.push('Inverter Battery Bus Voltage or Window (V_inv_dc)');
    }

    if (missing.length > 0 || !battery?.nominalVoltageV || battery.nominalVoltageV <= 0) {
      checks.push(
        buildCheckResult({
          id: 'check-battery-voltage',
          title: 'Battery Bank & Inverter DC Bus Compatibility',
          category: 'BATTERY',
          status: 'INSUFFICIENT DATA',
          formula: 'V_batt_min ≤ V_batt ≤ V_batt_max (or V_batt = V_inv_dc)',
          inputs,
          calculatedValue: null,
          calculatedUnit: 'V',
          limitLabel: 'Inverter Battery Voltage Rating',
          limitValue: hasInverterRange
            ? `${inverter!.minBatteryVoltageV} – ${inverter!.maxBatteryVoltageV} V`
            : hasInverterNom
              ? `${inverter!.nominalVoltageV} V nominal`
              : 'Missing',
          missingInputs: missing.length > 0 ? missing : ['Valid positive Battery Nominal Voltage'],
          explanation:
            'Requires verified battery nominal voltage and inverter DC battery bus specification.',
        }),
      );
    } else {
      const vBatt = battery.nominalVoltageV;
      let compatible = true;
      let limitText = '';

      if (hasInverterRange) {
        limitText = `${inverter!.minBatteryVoltageV} – ${inverter!.maxBatteryVoltageV} V`;
        compatible =
          vBatt >= inverter!.minBatteryVoltageV! && vBatt <= inverter!.maxBatteryVoltageV!;
      } else {
        limitText = `${inverter!.nominalVoltageV} V nominal`;
        compatible = Math.abs(vBatt - inverter!.nominalVoltageV!) <= 4;
      }

      if (compatible && hasInverterNom && Math.abs(vBatt - inverter!.nominalVoltageV!) > 4) {
        compatible = false;
      }

      checks.push(
        buildCheckResult({
          id: 'check-battery-voltage',
          title: 'Battery Bank & Inverter DC Bus Compatibility',
          category: 'BATTERY',
          status: compatible ? 'PASS' : 'FAIL',
          formula: hasInverterRange
            ? 'V_batt ∈ [V_batt_min, V_batt_max] and V_batt ≈ V_inv_dc'
            : 'V_batt ≈ V_inv_dc',
          inputs,
          calculatedValue: vBatt,
          calculatedUnit: 'V',
          limitLabel: 'Inverter Battery Bus Spec',
          limitValue: limitText,
          missingInputs: [],
          explanation: compatible
            ? `Installed battery bank (${vBatt} V nominal) is compatible with the inverter battery bus specification (${limitText}).`
            : `Battery bank nominal voltage (${vBatt} V) is incompatible with inverter battery specification (${limitText}).`,
        }),
      );
    }
  }

  return checks;
}

export function computeAuditSummary(
  comparisons: EquipmentComparisonResult[],
  checks: EngineeringCheckResult[],
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
      '(Matching Parameters / Total Eligible Compared Parameters) × 100 (excludes unquoted & undocumented categories)',
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

const SYMBOL_TO_CANONICAL_PARAM: Record<
  string,
  { key: string; parameter: string; categoryLabel: string; missingOn: string }
> = {
  Ns: {
    key: 'array.modulesPerString',
    parameter: 'Modules in Series per String (Ns)',
    categoryLabel: 'Array Configuration',
    missingOn: 'Array Configuration',
  },
  Np: {
    key: 'array.parallelStrings',
    parameter: 'Parallel Strings (Np)',
    categoryLabel: 'Array Configuration',
    missingOn: 'Array Configuration',
  },
  T_min: {
    key: 'array.minAmbientTempC',
    parameter: 'Minimum Site Ambient Temperature (T_min)',
    categoryLabel: 'Array Configuration',
    missingOn: 'Array Configuration',
  },
  Voc_mod: {
    key: 'pv.vocV',
    parameter: 'PV Module Open-Circuit Voltage (Voc)',
    categoryLabel: CATEGORY_LABELS.PV_MODULE,
    missingOn: 'Installed PV Nameplate',
  },
  Vmp_mod: {
    key: 'pv.vmpV',
    parameter: 'PV Module Max Power Voltage (Vmp)',
    categoryLabel: CATEGORY_LABELS.PV_MODULE,
    missingOn: 'Installed PV Nameplate',
  },
  Isc_mod: {
    key: 'pv.iscA',
    parameter: 'PV Module Short-Circuit Current (Isc)',
    categoryLabel: CATEGORY_LABELS.PV_MODULE,
    missingOn: 'Installed PV Nameplate',
  },
  Imp_mod: {
    key: 'pv.impA',
    parameter: 'PV Module Max Power Current (Imp)',
    categoryLabel: CATEGORY_LABELS.PV_MODULE,
    missingOn: 'Installed PV Nameplate',
  },
  β_Voc: {
    key: 'pv.tempCoeffVocPctPerC',
    parameter: 'PV Module Voc Temperature Coefficient (β_Voc)',
    categoryLabel: CATEGORY_LABELS.PV_MODULE,
    missingOn: 'Installed PV Nameplate / Datasheet',
  },
  N_pv: {
    key: 'pv.quantity',
    parameter: 'Installed PV Module Quantity (N_pv)',
    categoryLabel: CATEGORY_LABELS.PV_MODULE,
    missingOn: 'Installed PV Nameplate',
  },
  P_mod: {
    key: 'pv.ratedPowerW',
    parameter: 'PV Module Rated Power (Pmax)',
    categoryLabel: CATEGORY_LABELS.PV_MODULE,
    missingOn: 'Installed PV Nameplate',
  },
  Vdc_max: {
    key: 'inv.maxPvInputVoltageV',
    parameter: 'Inverter Max PV Input Voltage (Vdc_max)',
    categoryLabel: CATEGORY_LABELS.INVERTER,
    missingOn: 'Installed Inverter Nameplate / Datasheet',
  },
  Vmppt_min: {
    key: 'inv.mpptMinV',
    parameter: 'Inverter MPPT Minimum Voltage (Vmppt_min)',
    categoryLabel: CATEGORY_LABELS.INVERTER,
    missingOn: 'Installed Inverter Nameplate / Datasheet',
  },
  Vmppt_max: {
    key: 'inv.mpptMaxV',
    parameter: 'Inverter MPPT Maximum Voltage (Vmppt_max)',
    categoryLabel: CATEGORY_LABELS.INVERTER,
    missingOn: 'Installed Inverter Nameplate / Datasheet',
  },
  Ipv_op_max: {
    key: 'inv.maxPvOperatingCurrentA',
    parameter: 'Inverter Max PV Operating Current (Ipv_op_max)',
    categoryLabel: CATEGORY_LABELS.INVERTER,
    missingOn: 'Installed Inverter Nameplate / Datasheet',
  },
  Ipv_sc_max: {
    key: 'inv.maxPvShortCircuitCurrentA',
    parameter: 'Inverter Max PV Short-Circuit Current (Ipv_sc_max)',
    categoryLabel: CATEGORY_LABELS.INVERTER,
    missingOn: 'Installed Inverter Nameplate / Datasheet',
  },
  P_inv: {
    key: 'inv.ratedPowerW',
    parameter: 'Inverter Rated AC Power (P_inv)',
    categoryLabel: CATEGORY_LABELS.INVERTER,
    missingOn: 'Installed Inverter Nameplate',
  },
  V_batt: {
    key: 'batt.nominalVoltageV',
    parameter: 'Battery Nominal Voltage (V_batt)',
    categoryLabel: CATEGORY_LABELS.BATTERY,
    missingOn: 'Installed Battery Nameplate',
  },
  V_inv_dc: {
    key: 'inv.batteryBusVoltage',
    parameter: 'Inverter Battery Bus Voltage / Operating Window',
    categoryLabel: CATEGORY_LABELS.INVERTER,
    missingOn: 'Installed Inverter Nameplate / Datasheet',
  },
};

function mapComparisonMissingLabelToCanonicalKey(
  category: EquipmentCategory,
  rawLabel: string,
): { key: string; parameter: string; missingOn: string } | null {
  const lower = rawLabel.toLowerCase();
  if (lower.includes('user confirmation of ai-extracted')) {
    return null; // Handled in Record Gaps (unverifiedAiRecords)
  }
  if (lower.includes('temp') && lower.includes('voc')) {
    return {
      key: 'pv.tempCoeffVocPctPerC',
      parameter: SYMBOL_TO_CANONICAL_PARAM.β_Voc.parameter,
      missingOn: SYMBOL_TO_CANONICAL_PARAM.β_Voc.missingOn,
    };
  }
  if (lower.includes('operating current')) {
    return {
      key: 'inv.maxPvOperatingCurrentA',
      parameter: SYMBOL_TO_CANONICAL_PARAM.Ipv_op_max.parameter,
      missingOn: SYMBOL_TO_CANONICAL_PARAM.Ipv_op_max.missingOn,
    };
  }
  if (lower.includes('short-circuit') || lower.includes('short circuit')) {
    return {
      key: 'inv.maxPvShortCircuitCurrentA',
      parameter: SYMBOL_TO_CANONICAL_PARAM.Ipv_sc_max.parameter,
      missingOn: SYMBOL_TO_CANONICAL_PARAM.Ipv_sc_max.missingOn,
    };
  }
  if (lower.includes('max pv input voltage')) {
    return {
      key: 'inv.maxPvInputVoltageV',
      parameter: SYMBOL_TO_CANONICAL_PARAM.Vdc_max.parameter,
      missingOn: SYMBOL_TO_CANONICAL_PARAM.Vdc_max.missingOn,
    };
  }
  return {
    key: `comp.${category}.${lower.replace(/[^a-z0-9]+/g, '_')}`,
    parameter: rawLabel.replace(/^Unreadable on nameplate:\s*/i, ''),
    missingOn: `${CATEGORY_LABELS[category]} record`,
  };
}

export function buildMissingDataReport(
  project: SolarProject,
  comparisons: EquipmentComparisonResult[],
  checks: EngineeringCheckResult[],
): MissingDataReport {
  const unquotedInstalled = comparisons
    .filter((c) => c.eligibility === 'UNQUOTED_INSTALLED')
    .map((c) => `${c.label} (${c.installedSummary} — absent from quotation)`);

  const missingInstalled = comparisons
    .filter((c) => c.eligibility === 'MISSING_INSTALLED')
    .map((c) => `${c.label} (${c.promisedSummary} — not documented as installed)`);

  const unverifiedAiRecords: string[] = [];
  for (const eq of project.installedEquipment) {
    const prov = resolveEquipmentProvenance(eq, project.isDemo);
    if (prov === 'AI_EXTRACTED' || prov === 'MANUAL_ENTRY') {
      unverifiedAiRecords.push(
        `Installed ${CATEGORY_LABELS[eq.category]} (${eq.manufacturer ?? 'Unknown'} ${eq.model ?? 'Unknown'}): ${prov}`,
      );
    }
  }
  for (const eq of project.promisedEquipment) {
    const prov = resolveEquipmentProvenance(eq, project.isDemo);
    if (prov === 'AI_EXTRACTED' || prov === 'MANUAL_ENTRY') {
      unverifiedAiRecords.push(
        `Promised ${CATEGORY_LABELS[eq.category]} (${eq.manufacturer ?? 'Unknown'} ${eq.model ?? 'Unknown'}): ${prov}`,
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
            if (ck.missingInputs.some((m) => m.includes('Battery Bus'))) {
              const meta = SYMBOL_TO_CANONICAL_PARAM.V_inv_dc;
              const entry = ensureEntry(meta.key, meta.parameter, meta.categoryLabel, meta.missingOn);
              if (!entry.blockedChecks.includes(ck.title)) {
                entry.blockedChecks.push(ck.title);
              }
            }
            continue;
          }
          const meta = SYMBOL_TO_CANONICAL_PARAM[inp.symbol];
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
      const mapped = mapComparisonMissingLabelToCanonicalKey(comp.category, rawMissing);
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
