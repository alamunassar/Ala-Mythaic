import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMissingDataReport,
  comparePromisedVsInstalled,
  computeAuditSummary,
  detectSimulatedMarkers,
  formatInputConfidence,
  getFieldProvenance,
  projectContainsSimulatedData,
  resolveEquipmentProvenance,
  runEngineeringValidation,
} from '../engineeringEngine.ts';
import {
  createDemoProject,
  createScenarioProject,
  DEMO_SCENARIOS,
  loadScenarioIntoProjects,
} from '../../data/demoProject.ts';
import { buildProjectPdfDocument, toPdfSafeText } from '../../utils/pdfReport.ts';
import {
  PDF_RAW_TEXT_OPTIONS,
  containsArabic,
  finalizeRtlAutoTableLines,
  prepareRtlLines,
  prepareRtlSingleLine,
  registerArabicFont,
  shapeCellTextForAutoTable,
  toVisualRtlLine,
} from '../../utils/pdfRtl.ts';
import {
  localizeDemoAdditionalSpecs,
  localizeDemoCustomerName,
  localizeDemoLocation,
  localizeDemoManufacturer,
  localizeDemoMeasurementNotes,
  localizeDemoMeasurementParam,
  localizeDemoMeasurementTech,
  localizeDemoUncertainField,
} from '../../utils/demoLocalization.ts';
import {
  createOriginalAiSnapshot,
  filterUnreadableFieldsByCategory,
  localizeCategoryFieldText,
  sanitizeSpecFieldsByCategory,
} from '../../utils/categorySpecs.ts';
import { normalizeLoadedProject } from '../../utils/storage.ts';
import { safeFetchJson } from '../../utils/api.ts';
import {
  AiTimeoutError,
  extractReadableError,
  generateContentWithFallback,
  getApiErrorCode,
  getApiErrorStatus,
} from '../../utils/aiReliability.ts';
import {
  computeExtractionFieldDiffs,
  extractTrackedFieldValues,
  isProtectedVerifiedRecord,
  planEquipmentExtractionMerge,
  resolveConflictFillMissingOnly,
  resolveConflictKeepExisting,
  resolveConflictReplaceWithProposed,
  resolveManualEditProvenance,
} from '../../utils/equipmentProtection.ts';
import {
  getDirection,
  getTranslations,
  loadLanguage,
  ltr,
  normalizeLanguage,
} from '../../i18n/translations.ts';
import { jsPDF } from 'jspdf';
import type { EquipmentSpec, SolarProject } from '../../types/mithaq.ts';

function makePv(overrides: Partial<EquipmentSpec> = {}): EquipmentSpec {
  return {
    id: 'pv-1',
    category: 'PV_MODULE',
    manufacturer: 'Jinko Solar',
    model: 'JKM550M-72HL4-V',
    quantity: 16,
    ratedPowerW: 550,
    capacityKwh: null,
    nominalVoltageV: null,
    vocV: 49.62,
    vmpV: 40.9,
    iscA: 14.03,
    impA: 13.45,
    tempCoeffVocPctPerC: -0.28,
    maxPvInputVoltageV: null,
    mpptMinV: null,
    mpptMaxV: null,
    maxPvOperatingCurrentA: null,
    maxPvShortCircuitCurrentA: null,
    minBatteryVoltageV: null,
    maxBatteryVoltageV: null,
    provenance: 'USER_VERIFIED',
    uncertainFields: [],
    unreadableFields: [],
    verifiedByUser: true,
    ...overrides,
  };
}

function makeInverter(overrides: Partial<EquipmentSpec> = {}): EquipmentSpec {
  return {
    id: 'inv-1',
    category: 'INVERTER',
    manufacturer: 'Deye',
    model: 'SUN-10K-SG04LP3',
    quantity: 1,
    ratedPowerW: 10000,
    capacityKwh: null,
    nominalVoltageV: 48,
    vocV: null,
    vmpV: null,
    iscA: null,
    impA: null,
    tempCoeffVocPctPerC: null,
    maxPvInputVoltageV: 800,
    mpptMinV: 200,
    mpptMaxV: 650,
    maxPvOperatingCurrentA: 22,
    maxPvShortCircuitCurrentA: 26,
    minBatteryVoltageV: 40,
    maxBatteryVoltageV: 60,
    provenance: 'USER_VERIFIED',
    uncertainFields: [],
    unreadableFields: [],
    verifiedByUser: true,
    ...overrides,
  };
}

function makeBattery(overrides: Partial<EquipmentSpec> = {}): EquipmentSpec {
  return {
    id: 'bat-1',
    category: 'BATTERY',
    manufacturer: 'Pylontech',
    model: 'US5000',
    quantity: 2,
    ratedPowerW: null,
    capacityKwh: 4.8,
    nominalVoltageV: 48,
    vocV: null,
    vmpV: null,
    iscA: null,
    impA: null,
    tempCoeffVocPctPerC: null,
    maxPvInputVoltageV: null,
    mpptMinV: null,
    mpptMaxV: null,
    maxPvOperatingCurrentA: null,
    maxPvShortCircuitCurrentA: null,
    minBatteryVoltageV: null,
    maxBatteryVoltageV: null,
    provenance: 'USER_VERIFIED',
    uncertainFields: [],
    unreadableFields: [],
    verifiedByUser: true,
    ...overrides,
  };
}

function makeBaseProject(overrides: Partial<SolarProject> = {}): SolarProject {
  return {
    id: 'MTH-TEST-001',
    customerName: 'Test Facility',
    location: 'Test City',
    installationDate: '2026-10-01',
    systemType: 'Hybrid (PV + Battery)',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    isDemo: false,
    promisedEquipment: [makePv(), makeInverter(), makeBattery()],
    installedEquipment: [makePv(), makeInverter(), makeBattery()],
    arrayConfig: {
      modulesPerString: 8,
      parallelStrings: 2,
      minAmbientTempC: 0,
      stcTempC: 25,
      provenance: 'MANUAL_ENTRY',
    },
    fieldMeasurements: [],
    ...overrides,
  };
}

describe('MITHAQ-Lab Deterministic Engineering Engine', () => {
  it('returns PASS for all 7 checks when specifications and margins are valid', () => {
    const project = makeBaseProject({
      installedEquipment: [
        makePv({ quantity: 8 }),
        makeInverter({
          ratedPowerW: 5000,
          maxPvOperatingCurrentA: 22,
          maxPvShortCircuitCurrentA: 26,
        }),
        makeBattery(),
      ],
      arrayConfig: {
        modulesPerString: 8,
        parallelStrings: 1,
        minAmbientTempC: 0,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
    });

    const checks = runEngineeringValidation(project);
    assert.equal(checks.length, 7);
    for (const check of checks) {
      assert.equal(
        check.status,
        'PASS',
        `Expected ${check.id} to PASS, got ${check.status}: ${check.explanation}`,
      );
    }

    const thermal = checks.find((c) => c.id === 'check-thermal-voc');
    assert.equal(thermal?.calculatedValue, 424.75);
  });

  it('never substitutes operating current limit for short-circuit limit or vice versa', () => {
    const projectOnlyIsc = makeBaseProject({
      installedEquipment: [
        makePv({ quantity: 8, impA: 13.45, iscA: 14.03 }),
        makeInverter({
          ratedPowerW: 5000,
          maxPvOperatingCurrentA: null,
          maxPvShortCircuitCurrentA: 26,
        }),
        makeBattery(),
      ],
      arrayConfig: {
        modulesPerString: 8,
        parallelStrings: 1,
        minAmbientTempC: 0,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
    });

    const checks1 = runEngineeringValidation(projectOnlyIsc);
    const op1 = checks1.find((c) => c.id === 'check-pv-operating-current');
    const sc1 = checks1.find((c) => c.id === 'check-pv-shortcircuit-current');
    assert.equal(op1?.status, 'INSUFFICIENT DATA');
    assert.equal(op1?.calculatedValue, null);
    assert.ok(op1?.missingInputs.some((m) => m.includes('Ipv_op_max')));
    assert.equal(sc1?.status, 'PASS');
    assert.equal(sc1?.calculatedValue, 14.03);

    const projectOnlyOp = makeBaseProject({
      installedEquipment: [
        makePv({ quantity: 8, impA: 13.45, iscA: 14.03 }),
        makeInverter({
          ratedPowerW: 5000,
          maxPvOperatingCurrentA: 22,
          maxPvShortCircuitCurrentA: null,
        }),
        makeBattery(),
      ],
      arrayConfig: {
        modulesPerString: 8,
        parallelStrings: 1,
        minAmbientTempC: 0,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
    });

    const checks2 = runEngineeringValidation(projectOnlyOp);
    const op2 = checks2.find((c) => c.id === 'check-pv-operating-current');
    const sc2 = checks2.find((c) => c.id === 'check-pv-shortcircuit-current');
    assert.equal(op2?.status, 'PASS');
    assert.equal(op2?.calculatedValue, 13.45);
    assert.equal(sc2?.status, 'INSUFFICIENT DATA');
    assert.equal(sc2?.calculatedValue, null);
    assert.ok(sc2?.missingInputs.some((m) => m.includes('Ipv_sc_max')));
  });

  it('evaluates operating Imp and short-circuit Isc limits independently when both exceed', () => {
    const project = makeBaseProject({
      installedEquipment: [
        makePv({ impA: 13.45, iscA: 14.03 }),
        makeInverter({ maxPvOperatingCurrentA: 22, maxPvShortCircuitCurrentA: 26 }),
        makeBattery(),
      ],
      arrayConfig: {
        modulesPerString: 8,
        parallelStrings: 2,
        minAmbientTempC: 5,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
    });

    const checks = runEngineeringValidation(project);
    const opCheck = checks.find((c) => c.id === 'check-pv-operating-current');
    const scCheck = checks.find((c) => c.id === 'check-pv-shortcircuit-current');
    assert.equal(opCheck?.status, 'FAIL');
    assert.equal(opCheck?.calculatedValue, 26.9);
    assert.equal(scCheck?.status, 'FAIL');
    assert.equal(scCheck?.calculatedValue, 28.06);
  });

  it('returns INSUFFICIENT DATA instead of guessing when temp coefficient or ambient temp is missing', () => {
    const project = makeBaseProject({
      installedEquipment: [
        makePv({ tempCoeffVocPctPerC: null }),
        makeInverter(),
        makeBattery(),
      ],
    });

    const checks = runEngineeringValidation(project);
    const thermal = checks.find((c) => c.id === 'check-thermal-voc');
    assert.equal(thermal?.status, 'INSUFFICIENT DATA');
    assert.equal(thermal?.calculatedValue, null);
    assert.ok(thermal?.missingInputs.some((m) => m.includes('β_Voc')));
  });

  it('returns FAIL when cold-weather temperature-corrected Voc exceeds inverter max voltage', () => {
    const project = makeBaseProject({
      installedEquipment: [
        makePv({ quantity: 11, tempCoeffVocPctPerC: -0.28 }),
        makeInverter({ maxPvInputVoltageV: 550, mpptMaxV: 500 }),
        makeBattery(),
      ],
      arrayConfig: {
        modulesPerString: 11,
        parallelStrings: 1,
        minAmbientTempC: -10,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
    });

    const checks = runEngineeringValidation(project);
    const thermal = checks.find((c) => c.id === 'check-thermal-voc');
    assert.equal(thermal?.status, 'FAIL');
    assert.ok((thermal?.calculatedValue ?? 0) > 550);
  });

  it('returns FAIL for incompatible battery bank voltage', () => {
    const project = makeBaseProject({
      installedEquipment: [
        makePv({ quantity: 8 }),
        makeInverter({ nominalVoltageV: 48, minBatteryVoltageV: 40, maxBatteryVoltageV: 60 }),
        makeBattery({ nominalVoltageV: 24 }),
      ],
      arrayConfig: {
        modulesPerString: 8,
        parallelStrings: 1,
        minAmbientTempC: 10,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
    });

    const checks = runEngineeringValidation(project);
    const battCheck = checks.find((c) => c.id === 'check-battery-voltage');
    assert.equal(battCheck?.status, 'FAIL');
  });

  it('enforces strict DataProvenance rules: manual entries stay MANUAL_ENTRY and MD-10K-HYB / simulated notes stay SIMULATED even if verifiedByUser is true', () => {
    const manualPv = makePv({
      provenance: 'MANUAL_ENTRY',
      verifiedByUser: false,
    });
    assert.equal(resolveEquipmentProvenance(manualPv, false), 'MANUAL_ENTRY');

    // MD-10K-HYB must ALWAYS resolve to SIMULATED even if user checked verification
    const md10kInv = makeInverter({
      model: 'MD-10K-HYB',
      provenance: 'USER_VERIFIED',
      verifiedByUser: true,
    });
    assert.equal(resolveEquipmentProvenance(md10kInv, false), 'SIMULATED');
    assert.ok(detectSimulatedMarkers(md10kInv, false).some((r) => r.includes('MD-10K-HYB')));

    // Technical notes containing SIMULATED DATA / DEMO / PROTOTYPE must force SIMULATED
    for (const noteText of [
      'Contains SIMULATED DATA for testing',
      'DEMO unit bench test only',
      'Engineering PROTOTYPE sample',
    ]) {
      const flagged = makeBattery({
        additionalSpecs: noteText,
        provenance: 'USER_VERIFIED',
        verifiedByUser: true,
      });
      assert.equal(resolveEquipmentProvenance(flagged, false), 'SIMULATED');
      assert.ok(detectSimulatedMarkers(flagged, false).length > 0);
    }

    // Per-field datasheet provenance stays DATASHEET_VERIFIED on non-simulated record
    const supplementedPv = makePv({
      provenance: 'AI_EXTRACTED',
      verifiedByUser: false,
      datasheetFileName: 'jinko_550w.pdf',
      fieldProvenance: { tempCoeffVocPctPerC: 'DATASHEET_VERIFIED' },
    });
    assert.equal(getFieldProvenance(supplementedPv, 'vocV', false), 'AI_EXTRACTED');
    assert.equal(
      getFieldProvenance(supplementedPv, 'tempCoeffVocPctPerC', false),
      'DATASHEET_VERIFIED',
    );

    // Non-demo project containing MD-10K-HYB triggers projectContainsSimulatedData and normalizes cleanly on storage load
    const hybridWithSimulatedInv = makeBaseProject({
      isDemo: false,
      installedEquipment: [makePv(), md10kInv, makeBattery()],
    });
    assert.equal(projectContainsSimulatedData(hybridWithSimulatedInv), true);

    const normalized = normalizeLoadedProject(hybridWithSimulatedInv);
    const loadedInv = normalized.installedEquipment.find((e) => e.category === 'INVERTER');
    assert.equal(loadedInv?.provenance, 'SIMULATED');
    assert.equal(loadedInv?.verifiedByUser, false);
  });

  it('excludes unquoted and undocumented categories from Equipment Match % and returns N/A when 0 eligible items exist', () => {
    // Case A: Promised PV + Inverter match 100%, Battery is installed but absent from quotation
    const unquotedBatteryProject = makeBaseProject({
      promisedEquipment: [makePv(), makeInverter()],
      installedEquipment: [makePv(), makeInverter(), makeBattery()],
    });

    const compsA = comparePromisedVsInstalled(unquotedBatteryProject);
    const battComp = compsA.find((c) => c.category === 'BATTERY');
    assert.equal(battComp?.eligibility, 'UNQUOTED_INSTALLED');
    assert.equal(battComp?.status, 'NOT VERIFIED');

    const summaryA = computeAuditSummary(compsA, runEngineeringValidation(unquotedBatteryProject));
    assert.equal(summaryA.eligibleCategories, 2);
    assert.equal(summaryA.equipmentMatchPct, 100);
    assert.deepEqual(summaryA.unquotedInstalledCategories, ['Battery Storage']);
    assert.deepEqual(summaryA.missingInstalledCategories, []);

    // Case B: Zero eligible comparisons -> equipmentMatchPct must be null (N/A), not 0%
    const zeroEligibleProject = makeBaseProject({
      promisedEquipment: [makePv()],
      installedEquipment: [makeBattery()],
    });
    const compsB = comparePromisedVsInstalled(zeroEligibleProject);
    const summaryB = computeAuditSummary(compsB, runEngineeringValidation(zeroEligibleProject));
    assert.equal(summaryB.eligibleCategories, 0);
    assert.equal(summaryB.equipmentMatchPct, null);
    assert.deepEqual(summaryB.unquotedInstalledCategories, ['Battery Storage']);
    assert.deepEqual(summaryB.missingInstalledCategories, ['Solar PV Modules']);
    assert.equal(summaryB.overallStatus, 'INCOMPLETE DATA');
  });

  it('deduplicates missing technical parameters and links them to blocked engineering checks without mixing them into discrepancies', () => {
    const project = makeBaseProject({
      installedEquipment: [
        makePv({
          tempCoeffVocPctPerC: null,
          unreadableFields: ['Temp. Coefficient of Voc'],
        }),
        makeInverter({
          maxPvOperatingCurrentA: null,
          unreadableFields: ['Maximum PV Operating Current'],
        }),
        makeBattery(),
      ],
    });

    const comps = comparePromisedVsInstalled(project);
    const checks = runEngineeringValidation(project);
    const report = buildMissingDataReport(project, comps, checks);

    // Discrepancies must be 0 even though inverter operating current is missing in comparison
    const invComp = comps.find((c) => c.category === 'INVERTER');
    const opDiff = invComp?.differences.find((d) => d.field === 'Max PV Operating Current');
    assert.equal(opDiff?.status, 'NOT VERIFIED');
    const summary = computeAuditSummary(comps, checks);
    assert.equal(summary.discrepancies, 0);
    assert.equal(summary.warnings, 0);

    // tempCoeffVocPctPerC must appear ONCE and link to the cold-weather check
    const tempEntries = report.missingParameters.filter(
      (m) => m.key === 'pv.tempCoeffVocPctPerC',
    );
    assert.equal(tempEntries.length, 1);
    assert.deepEqual(tempEntries[0].blockedChecks, [
      'Temperature-Corrected Open-Circuit Voltage (Cold Weather)',
    ]);

    // maxPvOperatingCurrentA must appear ONCE and link to the operating current check
    const opEntries = report.missingParameters.filter(
      (m) => m.key === 'inv.maxPvOperatingCurrentA',
    );
    assert.equal(opEntries.length, 1);
    assert.deepEqual(opEntries[0].blockedChecks, [
      'Parallel Array Operating Current (Imp) vs. Inverter Max PV Operating Current',
    ]);

    assert.equal(report.blockedChecks.length, 2);
  });

  it('computes transparent equipment match percentage with exact matched and mismatched parameter counts', () => {
    const project = makeBaseProject({
      promisedEquipment: [
        makePv({ model: 'JKM580N-72HL4-V', ratedPowerW: 580, quantity: 16 }),
        makeInverter({ ratedPowerW: 10000 }),
        makeBattery({ quantity: 3 }),
      ],
      installedEquipment: [
        makePv({ model: 'JKM540M-72HL4-V', ratedPowerW: 540, quantity: 16 }),
        makeInverter({ ratedPowerW: 8000 }),
        makeBattery({ quantity: 2 }),
      ],
    });

    const comparisons = comparePromisedVsInstalled(project);
    assert.equal(comparisons.find((c) => c.category === 'PV_MODULE')?.status, 'MISMATCH');
    assert.equal(comparisons.find((c) => c.category === 'INVERTER')?.status, 'MISMATCH');
    assert.equal(comparisons.find((c) => c.category === 'BATTERY')?.status, 'MISMATCH');

    const checks = runEngineeringValidation(project);
    const summary = computeAuditSummary(comparisons, checks);
    assert.equal(summary.discrepancies, 3);
    assert.equal(summary.overallStatus, 'ACTION REQUIRED');
    assert.equal(
      summary.matchedParameters +
        summary.mismatchedParameters +
        summary.warningParameters +
        summary.notVerifiedParameters,
      summary.totalComparedParameters,
    );
    assert.equal(
      summary.equipmentMatchPct,
      Math.round((summary.matchedParameters / summary.totalComparedParameters) * 100),
    );
  });

  it('builds valid PDF reports with WinAnsi-safe symbols and includes simulated data notices for MD-10K-HYB / demo projects', () => {
    const demo = createDemoProject();
    const checks = runEngineeringValidation(demo);

    assert.equal(
      checks.find((c) => c.id === 'check-pv-operating-current')?.status,
      'INSUFFICIENT DATA',
    );
    assert.equal(
      checks.find((c) => c.id === 'check-pv-shortcircuit-current')?.status,
      'FAIL',
    );

    const { doc, reportId } = buildProjectPdfDocument(demo);
    assert.ok(reportId.startsWith('RPT-MTH-DEMO-2026-001-'));
    assert.ok(doc.getNumberOfPages() >= 2);
    const pdfBytes = doc.output('arraybuffer');
    assert.ok(pdfBytes.byteLength > 3000);

    // Non-demo project containing MD-10K-HYB must also include DEMONSTRATION / SIMULATED DATA notice in PDF
    const nonDemoWithSimInverter = makeBaseProject({
      isDemo: false,
      installedEquipment: [
        makePv(),
        makeInverter({ model: 'MD-10K-HYB', verifiedByUser: true, provenance: 'USER_VERIFIED' }),
        makeBattery(),
      ],
    });
    const simPdf = buildProjectPdfDocument(nonDemoWithSimInverter);
    const pages = simPdf.doc.internal.pages as unknown as string[][];
    const page1Text = (pages[1] ?? []).join('\n');
    assert.ok(
      page1Text.includes('DEMONSTRATION / SIMULATED DATA'),
      'Expected PDF page 1 to display DEMONSTRATION / SIMULATED DATA banner when MD-10K-HYB is present',
    );

    // Verify symbol sanitizer strips every non-Latin1 character (> 0xFF)
    const sampleFormula =
      'Voc_cold = Ns × Voc_mod × [1 + (β_Voc / 100) × (T_min − 25)] ≤ Vdc_max ∈ [125, 425] MΩ';
    const safe = toPdfSafeText(sampleFormula);
    for (let i = 0; i < safe.length; i++) {
      assert.ok(
        safe.charCodeAt(i) <= 255,
        `Found non-WinAnsi char "${safe[i]}" (code ${safe.charCodeAt(i)}) in "${safe}"`,
      );
    }
    assert.ok(safe.includes('beta_Voc'));
    assert.ok(safe.includes('<='));
    assert.ok(safe.includes('MOhm'));
  });

  it('enforces category-specific field sanitization and filters cross-category unreadable fields for all 3 categories', () => {
    const pvSanitized = sanitizeSpecFieldsByCategory('PV_MODULE', {
      manufacturer: 'Jinko Solar',
      model: 'JKM540M-72HL4-V',
      ratedPowerW: 540,
      vocV: 49.42,
      capacityKwh: 4.8,
      mpptMinV: 125,
      unreadableFields: [
        'tempCoeffVocPctPerC',
        'capacityKwh',
        'mpptMinV',
        'minBatteryVoltageV',
      ],
    });
    assert.equal(pvSanitized.ratedPowerW, 540);
    assert.equal(pvSanitized.vocV, 49.42);
    assert.equal(pvSanitized.capacityKwh, null);
    assert.equal(pvSanitized.mpptMinV, null);
    assert.deepEqual(pvSanitized.unreadableFields, ['Temp. Coefficient of Voc']);

    const invSanitized = sanitizeSpecFieldsByCategory('INVERTER', {
      manufacturer: 'Unbranded / OEM',
      model: 'SH-8000W-48V',
      ratedPowerW: 8000,
      nominalVoltageV: 48,
      minBatteryVoltageV: 40,
      maxBatteryVoltageV: 60,
      maxPvInputVoltageV: 500,
      mpptMinV: 125,
      mpptMaxV: 425,
      maxPvShortCircuitCurrentA: 26,
      vocV: 49.42,
      capacityKwh: 10,
      unreadableFields: ['maxPvOperatingCurrentA', 'vocV', 'capacityKwh'],
    });
    assert.equal(invSanitized.vocV, null);
    assert.equal(invSanitized.capacityKwh, null);
    assert.deepEqual(invSanitized.unreadableFields, ['Maximum PV Operating Current']);

    const battFiltered = filterUnreadableFieldsByCategory('BATTERY', [
      'minBatteryVoltageV',
      'maxBatteryVoltageV',
      'vocV',
      'mpptMaxV',
      'maxPvInputVoltageV',
    ]);
    assert.deepEqual(battFiltered, [
      'Minimum Operating Voltage',
      'Maximum Operating Voltage',
    ]);

    const snapshot = createOriginalAiSnapshot(
      'PV_MODULE',
      {
        manufacturer: 'Jinko Solar',
        model: 'JKM540M-72HL4-V',
        ratedPowerW: 540,
        vocV: 49.42,
        tempCoeffVocPctPerC: null,
        unreadableFields: ['tempCoeffVocPctPerC', 'capacityKwh'],
        confidenceNotes: 'Clear PV nameplate',
      },
      'demo_pv_nameplate.jpg',
    );
    assert.equal(snapshot.category, 'PV_MODULE');
    assert.equal(snapshot.fields.vocV, 49.42);
    assert.equal(snapshot.fields.tempCoeffVocPctPerC, null);
    assert.deepEqual(snapshot.unreadableFields, ['Temp. Coefficient of Voc']);
  });

  it('separates deterministic calculation outcomes from input provenance confidence across all classifications and PDF output', () => {
    // 1. PASS — VERIFIED INPUTS (USER_VERIFIED + DATASHEET_VERIFIED critical specs; MANUAL_ENTRY array config does not downgrade)
    const verifiedProject = makeBaseProject({
      installedEquipment: [
        makePv({
          quantity: 8,
          provenance: 'USER_VERIFIED',
          verifiedByUser: true,
          fieldProvenance: { tempCoeffVocPctPerC: 'DATASHEET_VERIFIED' },
          datasheetFileName: 'jinko_datasheet.pdf',
        }),
        makeInverter({
          ratedPowerW: 5000,
          provenance: 'DATASHEET_VERIFIED',
          verifiedByUser: true,
          datasheetFileName: 'deye_datasheet.pdf',
        }),
        makeBattery({ provenance: 'USER_VERIFIED', verifiedByUser: true }),
      ],
      arrayConfig: {
        modulesPerString: 8,
        parallelStrings: 1,
        minAmbientTempC: 0,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
    });

    const verifiedChecks = runEngineeringValidation(verifiedProject);
    for (const ck of verifiedChecks) {
      assert.equal(ck.status, 'PASS');
      assert.equal(ck.inputConfidence, 'VERIFIED_INPUTS');
      assert.equal(ck.qualifiedResult, 'PASS — VERIFIED INPUTS');
    }
    const verifiedSummary = computeAuditSummary(
      comparePromisedVsInstalled(verifiedProject),
      verifiedChecks,
    );
    assert.equal(verifiedSummary.verifiedPassChecks, 7);
    assert.equal(verifiedSummary.simulatedPassChecks, 0);
    assert.equal(verifiedSummary.unverifiedPassChecks, 0);

    // 2. PASS — SIMULATED INPUTS (MD-10K-HYB mathematically passes Vdc_max, must NOT become FAIL or VERIFIED)
    const simulatedPassProject = makeBaseProject({
      isDemo: false,
      installedEquipment: [
        makePv({ quantity: 8, provenance: 'USER_VERIFIED', verifiedByUser: true }),
        makeInverter({
          model: 'MD-10K-HYB',
          ratedPowerW: 5000,
          maxPvInputVoltageV: 800,
          mpptMinV: 200,
          mpptMaxV: 650,
          maxPvOperatingCurrentA: 22,
          maxPvShortCircuitCurrentA: 26,
          provenance: 'USER_VERIFIED',
          verifiedByUser: true,
        }),
        makeBattery({ provenance: 'USER_VERIFIED', verifiedByUser: true }),
      ],
      arrayConfig: {
        modulesPerString: 8,
        parallelStrings: 1,
        minAmbientTempC: 0,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
    });

    const simChecks = runEngineeringValidation(simulatedPassProject);
    // Checks using simulated inverter specs must be PASS — SIMULATED INPUTS;
    // checks using verified PV + manual config only remain PASS (never turned into FAIL)
    const simVocCheck = simChecks.find((c) => c.id === 'check-pv-voc-stc');
    assert.equal(simVocCheck?.status, 'PASS');
    assert.equal(simVocCheck?.inputConfidence, 'SIMULATED_INPUTS');
    assert.equal(simVocCheck?.qualifiedResult, 'PASS — SIMULATED INPUTS');

    // 3. PASS — UNVERIFIED INPUTS (MANUAL_ENTRY or AI_EXTRACTED critical equipment spec)
    const unverifiedPassProject = makeBaseProject({
      installedEquipment: [
        makePv({
          quantity: 8,
          provenance: 'AI_EXTRACTED',
          verifiedByUser: false,
        }),
        makeInverter({
          ratedPowerW: 5000,
          provenance: 'MANUAL_ENTRY',
          verifiedByUser: false,
        }),
        makeBattery({ provenance: 'USER_VERIFIED', verifiedByUser: true }),
      ],
      arrayConfig: {
        modulesPerString: 8,
        parallelStrings: 1,
        minAmbientTempC: 0,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
    });

    const unverifiedChecks = runEngineeringValidation(unverifiedPassProject);
    for (const ck of unverifiedChecks) {
      assert.equal(ck.status, 'PASS');
      assert.equal(ck.inputConfidence, 'UNVERIFIED_INPUTS');
      assert.equal(ck.qualifiedResult, 'PASS — UNVERIFIED INPUTS');
    }

    // 4. FAIL preserves FAIL outcome while reporting separate inputConfidence
    const failVerifiedProject = makeBaseProject({
      installedEquipment: [
        makePv({ quantity: 14, provenance: 'USER_VERIFIED', verifiedByUser: true }),
        makeInverter({
          maxPvInputVoltageV: 550,
          mpptMaxV: 500,
          provenance: 'DATASHEET_VERIFIED',
          verifiedByUser: true,
        }),
        makeBattery(),
      ],
      arrayConfig: {
        modulesPerString: 14,
        parallelStrings: 1,
        minAmbientTempC: -5,
        stcTempC: 25,
        provenance: 'MANUAL_ENTRY',
      },
    });
    const failChecks = runEngineeringValidation(failVerifiedProject);
    const failVoc = failChecks.find((c) => c.id === 'check-pv-voc-stc');
    assert.equal(failVoc?.status, 'FAIL');
    assert.equal(failVoc?.inputConfidence, 'VERIFIED_INPUTS');
    assert.equal(failVoc?.qualifiedResult, 'FAIL');
    assert.equal(formatInputConfidence(failVoc!.inputConfidence), 'VERIFIED INPUTS');

    // 5. INSUFFICIENT DATA sets INCOMPLETE_INPUTS
    const missingDataProject = makeBaseProject({
      installedEquipment: [
        makePv({ tempCoeffVocPctPerC: null }),
        makeInverter({ maxPvOperatingCurrentA: null }),
        makeBattery(),
      ],
    });
    const missingChecks = runEngineeringValidation(missingDataProject);
    const missingThermal = missingChecks.find((c) => c.id === 'check-thermal-voc');
    assert.equal(missingThermal?.status, 'INSUFFICIENT DATA');
    assert.equal(missingThermal?.inputConfidence, 'INCOMPLETE_INPUTS');
    assert.equal(missingThermal?.qualifiedResult, 'INSUFFICIENT DATA');

    // 6. PDF output consistency: contains legend, qualified outcome, input confidence, and role tags
    const pdfRes = buildProjectPdfDocument(simulatedPassProject);
    const pdfPages = pdfRes.doc.internal.pages as unknown as string[][];
    const allPdfText = pdfPages.flat().join('\n');
    assert.ok(allPdfText.includes('PASS - SIMULATED INPUTS'));
    assert.ok(allPdfText.includes('SIMULATED INPUTS'));
    assert.ok(allPdfText.includes('[Equip Spec;'));
    assert.ok(allPdfText.includes('[Config;'));
    assert.ok(allPdfText.includes('Calculation Outcome'));
    assert.ok(allPdfText.includes('Input Confidence'));
  });

  it('protects USER_VERIFIED and DATASHEET_VERIFIED records during AI extraction without duplicates', () => {
    const userVerifiedPv = makePv({
      id: 'pv-verified',
      manufacturer: 'Jinko Solar',
      model: 'JKM580N-72HL4-V',
      ratedPowerW: 580,
      vocV: 51.4,
      tempCoeffVocPctPerC: null,
      provenance: 'USER_VERIFIED',
      verifiedByUser: true,
    });
    const datasheetVerifiedInv = makeInverter({
      id: 'inv-ds',
      manufacturer: 'Deye',
      model: 'SUN-10K-SG04LP3',
      provenance: 'DATASHEET_VERIFIED',
      datasheetFileName: 'deye_10k.pdf',
      verifiedByUser: false,
    });
    const aiPlusDatasheetBatt = makeBattery({
      id: 'bat-mixed',
      provenance: 'AI_EXTRACTED',
      verifiedByUser: false,
      datasheetFileName: 'pylontech.pdf',
      fieldProvenance: { capacityKwh: 'DATASHEET_VERIFIED' },
    });
    const unverifiedSimulatedPv = makePv({
      id: 'pv-sim',
      model: 'MD-500-SIM',
      provenance: 'SIMULATED',
      verifiedByUser: false,
    });

    assert.equal(isProtectedVerifiedRecord(userVerifiedPv, false), true);
    assert.equal(isProtectedVerifiedRecord(datasheetVerifiedInv, false), true);
    assert.equal(isProtectedVerifiedRecord(aiPlusDatasheetBatt, false), true);
    assert.equal(isProtectedVerifiedRecord(unverifiedSimulatedPv, false), false);

    // 1. Existing USER_VERIFIED PV + DATASHEET_VERIFIED Inverter + unmentioned Battery
    const incomingQuote: EquipmentSpec[] = [
      makePv({
        id: 'ai-pv-1',
        manufacturer: 'Other Solar',
        model: 'OS-450',
        ratedPowerW: 450,
        tempCoeffVocPctPerC: -0.27,
        provenance: 'AI_EXTRACTED',
        verifiedByUser: false,
      }),
      makeInverter({
        id: 'ai-inv-1',
        manufacturer: 'Generic',
        model: 'GEN-8K',
        ratedPowerW: 8000,
        provenance: 'AI_EXTRACTED',
        verifiedByUser: false,
      }),
    ];

    const plan = planEquipmentExtractionMerge(
      [userVerifiedPv, datasheetVerifiedInv, aiPlusDatasheetBatt],
      incomingQuote,
      false,
    );

    // Protected records preserved intact, unmentioned category preserved, zero duplicates
    assert.equal(plan.conflicts.length, 2);
    assert.equal(plan.nextEquipment.length, 3);
    assert.equal(plan.nextEquipment.find((e) => e.category === 'PV_MODULE')?.id, 'pv-verified');
    assert.equal(plan.nextEquipment.find((e) => e.category === 'INVERTER')?.id, 'inv-ds');
    assert.equal(plan.nextEquipment.find((e) => e.category === 'BATTERY')?.id, 'bat-mixed');
    assert.deepEqual(plan.preservedUnchangedCategories, ['BATTERY']);

    // Conflict actions: KEEP leaves verified untouched; FILL_MISSING only fills null fields
    const afterKeep = resolveConflictKeepExisting(plan.nextEquipment, plan.conflicts[0]);
    assert.equal(afterKeep.find((e) => e.category === 'PV_MODULE')?.model, 'JKM580N-72HL4-V');

    const pvConflict = plan.conflicts.find((c) => c.category === 'PV_MODULE')!;
    const afterFill = resolveConflictFillMissingOnly(plan.nextEquipment, pvConflict, false);
    const filledPv = afterFill.find((e) => e.category === 'PV_MODULE')!;
    assert.equal(filledPv.model, 'JKM580N-72HL4-V'); // kept verified value
    assert.equal(filledPv.tempCoeffVocPctPerC, -0.27); // filled previously missing field
    assert.equal(getFieldProvenance(filledPv, 'tempCoeffVocPctPerC', false), 'AI_EXTRACTED');
    assert.equal(getFieldProvenance(filledPv, 'vocV', false), 'USER_VERIFIED');
    assert.equal(afterFill.filter((e) => e.category === 'PV_MODULE').length, 1);

    // Explicit replace updates in-place with zero duplicates
    const afterReplace = resolveConflictReplaceWithProposed(afterFill, pvConflict);
    assert.equal(afterReplace.filter((e) => e.category === 'PV_MODULE').length, 1);
    assert.equal(afterReplace.find((e) => e.category === 'PV_MODULE')?.id, 'ai-pv-1');

    // Unverified existing records are replaced cleanly without creating duplicates
    const unverifiedPlan = planEquipmentExtractionMerge(
      [unverifiedSimulatedPv],
      [makePv({ id: 'ai-pv-2', provenance: 'AI_EXTRACTED', verifiedByUser: false })],
      false,
    );
    assert.equal(unverifiedPlan.conflicts.length, 0);
    assert.equal(unverifiedPlan.nextEquipment.length, 1);
    assert.equal(unverifiedPlan.nextEquipment[0].id, 'ai-pv-2');
  });

  it('tracks manual field edit provenance without altering unedited fields or marking partial edits USER_VERIFIED', () => {
    // Case A: AI_EXTRACTED record with one DATASHEET_VERIFIED field; user manually edits vocV & datasheet tempCoeff
    const aiPv = makePv({
      vocV: 49.42,
      vmpV: 40.9,
      tempCoeffVocPctPerC: -0.28,
      provenance: 'AI_EXTRACTED',
      verifiedByUser: false,
      datasheetFileName: 'jinko.pdf',
      fieldProvenance: { tempCoeffVocPctPerC: 'DATASHEET_VERIFIED' },
    });

    const baselineA = extractTrackedFieldValues(aiPv);
    const editedValuesA = {
      ...baselineA,
      vocV: 49.85, // manually edited AI field
      tempCoeffVocPctPerC: -0.31, // manually edited datasheet field
    };
    const resA = resolveManualEditProvenance({
      initialSpec: aiPv,
      baselineValues: baselineA,
      nextValues: editedValuesA,
      nextQuantity: aiPv.quantity,
      workingFieldProvenance: aiPv.fieldProvenance ?? {},
      datasheetFileName: aiPv.datasheetFileName,
      verifiedByUser: false,
      isSimulatedRecord: false,
      projectIsDemo: false,
    });

    assert.equal(resA.provenance, 'AI_EXTRACTED');
    assert.equal(resA.verifiedByUser, false);
    assert.deepEqual(resA.manuallyEditedFields.sort(), ['tempCoeffVocPctPerC', 'vocV']);
    assert.equal(resA.fieldProvenance.vocV, 'MANUAL_ENTRY');
    assert.equal(resA.fieldProvenance.tempCoeffVocPctPerC, 'MANUAL_ENTRY');
    const savedA: EquipmentSpec = {
      ...aiPv,
      vocV: 49.85,
      tempCoeffVocPctPerC: -0.31,
      provenance: resA.provenance,
      fieldProvenance: resA.fieldProvenance,
      verifiedByUser: resA.verifiedByUser,
    };
    assert.equal(getFieldProvenance(savedA, 'vocV', false), 'MANUAL_ENTRY');
    assert.equal(getFieldProvenance(savedA, 'tempCoeffVocPctPerC', false), 'MANUAL_ENTRY');
    assert.equal(getFieldProvenance(savedA, 'vmpV', false), 'AI_EXTRACTED');

    // Case B: DATASHEET_VERIFIED record where user manually edits 1 field without verifying
    const dsInv = makeInverter({
      provenance: 'DATASHEET_VERIFIED',
      verifiedByUser: false,
      datasheetFileName: 'deye.pdf',
      fieldProvenance: {},
    });
    const baselineB = extractTrackedFieldValues(dsInv);
    const resB = resolveManualEditProvenance({
      initialSpec: dsInv,
      baselineValues: baselineB,
      nextValues: { ...baselineB, maxPvInputVoltageV: 820 },
      nextQuantity: dsInv.quantity,
      workingFieldProvenance: {},
      datasheetFileName: dsInv.datasheetFileName,
      verifiedByUser: false,
      isSimulatedRecord: false,
      projectIsDemo: false,
    });
    assert.equal(resB.provenance, 'MANUAL_ENTRY');
    assert.equal(resB.verifiedByUser, false);
    const savedB: EquipmentSpec = {
      ...dsInv,
      maxPvInputVoltageV: 820,
      provenance: resB.provenance,
      fieldProvenance: resB.fieldProvenance,
      verifiedByUser: resB.verifiedByUser,
    };
    assert.equal(getFieldProvenance(savedB, 'maxPvInputVoltageV', false), 'MANUAL_ENTRY');
    assert.equal(getFieldProvenance(savedB, 'mpptMaxV', false), 'DATASHEET_VERIFIED');
  });

  it('never treats missing, whitespace, or punctuation-only manufacturer/model strings as a MATCH', () => {
    for (const badValue of ['', '   ', '-', '---', '...', '—', null]) {
      const project = makeBaseProject({
        promisedEquipment: [makePv({ manufacturer: 'Jinko Solar', model: 'JKM550M-72HL4-V' })],
        installedEquipment: [
          makePv({
            manufacturer: badValue,
            model: badValue,
          }),
        ],
      });

      const comps = comparePromisedVsInstalled(project);
      const pvComp = comps.find((c) => c.category === 'PV_MODULE')!;
      const mfgDiff = pvComp.differences.find((d) => d.field === 'Manufacturer');
      const modelDiff = pvComp.differences.find((d) => d.field === 'Model Number');
      assert.equal(mfgDiff?.status, 'NOT VERIFIED', `Expected NOT VERIFIED for manufacturer="${badValue}"`);
      assert.equal(modelDiff?.status, 'NOT VERIFIED', `Expected NOT VERIFIED for model="${badValue}"`);
      assert.ok(pvComp.missingFields.includes('Manufacturer'));
      assert.ok(pvComp.missingFields.includes('Model Number'));
    }

    // Legitimate partial/full manufacturer matches & mismatches are preserved
    const legitProject = makeBaseProject({
      promisedEquipment: [makePv({ manufacturer: 'Jinko Solar Co., Ltd.' })],
      installedEquipment: [makePv({ manufacturer: 'Jinko Solar' })],
    });
    const legitMfgDiff = comparePromisedVsInstalled(legitProject)
      .find((c) => c.category === 'PV_MODULE')
      ?.differences.find((d) => d.field === 'Manufacturer');
    assert.equal(legitMfgDiff?.status, 'MATCH');

    const mismatchProject = makeBaseProject({
      promisedEquipment: [makePv({ manufacturer: 'Jinko Solar' })],
      installedEquipment: [makePv({ manufacturer: 'LONGi Solar' })],
    });
    const mismatchMfgDiff = comparePromisedVsInstalled(mismatchProject)
      .find((c) => c.category === 'PV_MODULE')
      ?.differences.find((d) => d.field === 'Manufacturer');
    assert.equal(mismatchMfgDiff?.status, 'MISMATCH');
  });

  it('handles Gemini timeouts, bounded retries, and safeFetchJson timeouts cleanly', async () => {
    // 1. Hanging Gemini request triggers AiTimeoutError (408 / AI_TIMEOUT) without retrying
    let hangCalls = 0;
    const hangingAi = {
      models: {
        generateContent: ({ config }: { config?: { abortSignal?: AbortSignal } }) =>
          new Promise<{ text?: string }>((_resolve, reject) => {
            hangCalls += 1;
            config?.abortSignal?.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true },
            );
          }),
      },
    };

    await assert.rejects(
      () =>
        generateContentWithFallback(
          hangingAi,
          { contents: 'test' },
          { attemptTimeoutMs: 30, overallTimeoutMs: 200, maxTransientRetries: 1, retryDelayMs: 5 },
        ),
      (err: unknown) => {
        assert.ok(err instanceof AiTimeoutError);
        assert.equal(getApiErrorStatus(err), 408);
        assert.equal(getApiErrorCode(err), 'AI_TIMEOUT');
        assert.ok(extractReadableError(err).toLowerCase().includes('timed out'));
        return true;
      },
    );
    assert.equal(hangCalls, 1);

    // 2. Non-transient 400 error fails immediately without retries
    let nonTransientCalls = 0;
    const badRequestAi = {
      models: {
        generateContent: async () => {
          nonTransientCalls += 1;
          throw new Error('400 INVALID_ARGUMENT: bad schema');
        },
      },
    };
    await assert.rejects(
      () =>
        generateContentWithFallback(
          badRequestAi,
          { contents: 'test' },
          { attemptTimeoutMs: 500, overallTimeoutMs: 1000, maxTransientRetries: 2, retryDelayMs: 5 },
        ),
      /INVALID_ARGUMENT/,
    );
    assert.equal(nonTransientCalls, 1);

    // 3. Daily quota error switches straight to fallback model without retrying primary
    const calledModels: string[] = [];
    const quotaFallbackAi = {
      models: {
        generateContent: async ({ model }: { model: string }) => {
          calledModels.push(model);
          if (model === 'gemini-4-hydrogen') {
            throw new Error('429 Quota exceeded for free_tier_requests PerDay');
          }
          return { text: '{"ok":true}' };
        },
      },
    };
    const fallbackRes = await generateContentWithFallback(
      quotaFallbackAi,
      { contents: 'test' },
      { attemptTimeoutMs: 500, overallTimeoutMs: 1000, maxTransientRetries: 1, retryDelayMs: 5 },
    );
    assert.equal(fallbackRes.text, '{"ok":true}');
    assert.deepEqual(calledModels, ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);

    // 4. safeFetchJson aborts hung requests cleanly with 408 and timedOut=true
    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = ((_url: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('The operation was aborted', 'AbortError')),
            { once: true },
          );
        })) as typeof fetch;

      const timedOutRes = await safeFetchJson('/api/ai/extract-quotation', {
        method: 'POST',
        timeoutMs: 25,
      });
      assert.equal(timedOutRes.ok, false);
      assert.equal(timedOutRes.status, 408);
      assert.equal(timedOutRes.timedOut, true);
      assert.ok(timedOutRes.error?.toLowerCase().includes('timed out'));

      // HTML fallback page returns clear error rather than JSON parse crash
      globalThis.fetch = (async () =>
        new Response('<!doctype html><html><body>Bad Gateway</body></html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        })) as typeof fetch;

      const htmlRes = await safeFetchJson('/api/ai/extract-quotation');
      assert.equal(htmlRes.ok, false);
      assert.equal(htmlRes.status, 502);
      assert.ok(htmlRes.error?.includes('HTML page instead of JSON'));
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('provides three clearly labeled SIMULATED demonstration scenarios with deterministic engine outputs', () => {
    assert.equal(DEMO_SCENARIOS.length, 3);

    for (const def of DEMO_SCENARIOS) {
      const proj = createScenarioProject(def.id);
      assert.equal(proj.id, def.projectId);
      assert.equal(proj.isDemo, true);
      assert.equal(projectContainsSimulatedData(proj), true);
      assert.equal(proj.arrayConfig.provenance, 'SIMULATED');
      for (const eq of [...proj.promisedEquipment, ...proj.installedEquipment]) {
        assert.equal(eq.provenance, 'SIMULATED');
        assert.equal(eq.verifiedByUser, false);
        assert.equal(resolveEquipmentProvenance(eq, proj.isDemo), 'SIMULATED');
      }
      for (const meas of proj.fieldMeasurements) {
        assert.equal(meas.isSimulated, true);
      }
    }

    // Scenario 1: Compliant Synthetic Installation -> 100% MATCH, 7/7 PASS — SIMULATED INPUTS
    const s1 = createScenarioProject('compliant');
    const s1Comps = comparePromisedVsInstalled(s1);
    const s1Checks = runEngineeringValidation(s1);
    const s1Summary = computeAuditSummary(s1Comps, s1Checks);
    assert.equal(s1Comps.length, 3);
    for (const comp of s1Comps) {
      assert.equal(comp.status, 'MATCH');
    }
    assert.equal(s1Summary.equipmentMatchPct, 100);
    assert.equal(s1Summary.discrepancies, 0);
    assert.equal(s1Summary.overallStatus, 'VERIFIED MATCH');
    assert.equal(s1Checks.length, 7);
    for (const ck of s1Checks) {
      assert.equal(ck.status, 'PASS', `Scenario 1 check ${ck.id} failed: ${ck.explanation}`);
      assert.equal(ck.inputConfidence, 'SIMULATED_INPUTS');
      assert.equal(ck.qualifiedResult, 'PASS — SIMULATED INPUTS');
    }
    assert.equal(s1Checks.find((c) => c.id === 'check-pv-voc-stc')?.calculatedValue, 396);
    assert.equal(s1Checks.find((c) => c.id === 'check-thermal-voc')?.calculatedValue, 421.74);
    assert.equal(s1Checks.find((c) => c.id === 'check-mppt-window')?.calculatedValue, 332);
    assert.equal(
      s1Checks.find((c) => c.id === 'check-pv-operating-current')?.calculatedValue,
      26.5,
    );
    assert.equal(
      s1Checks.find((c) => c.id === 'check-pv-shortcircuit-current')?.calculatedValue,
      27.6,
    );
    assert.equal(s1Checks.find((c) => c.id === 'check-dc-ac-ratio')?.calculatedValue, 0.88);
    assert.equal(s1Checks.find((c) => c.id === 'check-battery-voltage')?.calculatedValue, 48);

    // Scenario 2: Equipment Mismatch & Engineering Failure -> 3 MISMATCH, Isc FAIL, ACTION REQUIRED
    const s2 = createScenarioProject('mismatch');
    const s2Comps = comparePromisedVsInstalled(s2);
    const s2Checks = runEngineeringValidation(s2);
    const s2Summary = computeAuditSummary(s2Comps, s2Checks);
    assert.equal(s2Comps.find((c) => c.category === 'PV_MODULE')?.status, 'MISMATCH');
    assert.equal(s2Comps.find((c) => c.category === 'INVERTER')?.status, 'MISMATCH');
    assert.equal(s2Comps.find((c) => c.category === 'BATTERY')?.status, 'MISMATCH');
    assert.equal(
      s2Checks.find((c) => c.id === 'check-pv-shortcircuit-current')?.status,
      'FAIL',
    );
    assert.equal(
      s2Checks.find((c) => c.id === 'check-thermal-voc')?.status,
      'INSUFFICIENT DATA',
    );
    assert.equal(
      s2Checks.find((c) => c.id === 'check-pv-operating-current')?.status,
      'INSUFFICIENT DATA',
    );
    assert.equal(s2Summary.overallStatus, 'ACTION REQUIRED');

    // Scenario 3: Incomplete Data -> 5 INSUFFICIENT DATA, 2 PASS, missing params reported & resolvable
    const s3 = createScenarioProject('incomplete');
    const s3Comps = comparePromisedVsInstalled(s3);
    const s3Checks = runEngineeringValidation(s3);
    const s3Summary = computeAuditSummary(s3Comps, s3Checks);
    const s3MissingReport = buildMissingDataReport(s3, s3Comps, s3Checks);

    assert.equal(s3Summary.discrepancies, 0);
    assert.equal(s3Summary.insufficientDataChecks, 5);
    assert.equal(s3Summary.passedChecks, 2);
    assert.equal(s3Summary.overallStatus, 'INCOMPLETE DATA');
    assert.equal(s3MissingReport.blockedChecks.length, 5);
    assert.ok(s3MissingReport.missingParameters.some((m) => m.key === 'pv.tempCoeffVocPctPerC'));
    assert.ok(s3MissingReport.missingParameters.some((m) => m.key === 'inv.maxPvInputVoltageV'));
    assert.ok(s3MissingReport.missingParameters.some((m) => m.key === 'inv.mpptMinV'));
    assert.ok(s3MissingReport.missingParameters.some((m) => m.key === 'inv.maxPvOperatingCurrentA'));
    assert.ok(s3MissingReport.missingParameters.some((m) => m.key === 'batt.nominalVoltageV'));
    assert.ok(s3MissingReport.missingParameters.some((m) => m.key === 'array.minAmbientTempC'));

    // Filling missing inputs manually resolves all 5 blocked checks cleanly
    const resolvedS3: SolarProject = {
      ...s3,
      installedEquipment: s3.installedEquipment.map((eq) => {
        if (eq.category === 'PV_MODULE') return { ...eq, tempCoeffVocPctPerC: -0.26 };
        if (eq.category === 'INVERTER') {
          return { ...eq, maxPvInputVoltageV: 750, mpptMinV: 180, maxPvOperatingCurrentA: 22 };
        }
        return { ...eq, nominalVoltageV: 48 };
      }),
      arrayConfig: { ...s3.arrayConfig, minAmbientTempC: 2 },
    };
    const resolvedChecks = runEngineeringValidation(resolvedS3);
    for (const ck of resolvedChecks) {
      assert.equal(ck.status, 'PASS', `Resolved Scenario 3 check ${ck.id}: ${ck.explanation}`);
    }
  });

  it('loads and resets scenarios cleanly without modifying real projects or merging stale state', () => {
    const realProject = makeBaseProject({
      id: 'MTH-REAL-2026-999',
      customerName: 'Real Clinic Audit',
      isDemo: false,
    });

    // Load Scenario 1 alongside existing real project
    const step1 = loadScenarioIntoProjects([realProject], 'compliant');
    assert.equal(step1.loadedProject.id, 'MTH-DEMO-2026-S1');
    assert.equal(step1.projects.length, 2);
    assert.equal(step1.projects.find((p) => p.id === 'MTH-REAL-2026-999')?.customerName, 'Real Clinic Audit');

    // Mutate Scenario 1 in memory (simulate user edits), then load Scenario 3 and reset Scenario 1
    const mutatedList = step1.projects.map((p) =>
      p.id === 'MTH-DEMO-2026-S1'
        ? {
            ...p,
            customerName: 'Edited Temporary Title',
            arrayConfig: { ...p.arrayConfig, modulesPerString: 99 },
          }
        : p,
    );

    const step2 = loadScenarioIntoProjects(mutatedList, 'incomplete');
    assert.equal(step2.loadedProject.id, 'MTH-DEMO-2026-S3');
    assert.equal(step2.loadedProject.arrayConfig.modulesPerString, 12);
    assert.equal(step2.projects.length, 3);

    // Reloading Scenario 1 resets it back to pristine state with zero duplicates and real project preserved
    const step3 = loadScenarioIntoProjects(step2.projects, 'compliant');
    const s1Occurrences = step3.projects.filter((p) => p.id === 'MTH-DEMO-2026-S1');
    assert.equal(s1Occurrences.length, 1);
    assert.equal(
      s1Occurrences[0].customerName,
      'Al-Waha Logistics Warehouse (Simulated Scenario 1)',
    );
    assert.equal(s1Occurrences[0].arrayConfig.modulesPerString, 8);
    assert.equal(
      step3.projects.find((p) => p.id === 'MTH-REAL-2026-999')?.customerName,
      'Real Clinic Audit',
    );
    assert.equal(
      step3.projects.find((p) => p.id === 'MTH-DEMO-2026-S3')?.arrayConfig.minAmbientTempC,
      null,
    );
  });
});

describe('Arabic-First Defaults, RTL Direction & Arabic PDF Verification', () => {
  it('defaults to Arabic (ar) with RTL direction when storage is unavailable or invalid', () => {
    assert.equal(normalizeLanguage(undefined), 'ar');
    assert.equal(normalizeLanguage(null), 'ar');
    assert.equal(normalizeLanguage('fr'), 'ar');
    assert.equal(normalizeLanguage('ar'), 'ar');
    assert.equal(normalizeLanguage('en'), 'en');
    assert.equal(loadLanguage(), 'ar');
    assert.equal(getDirection('ar'), 'rtl');
    assert.equal(getDirection('en'), 'ltr');
  });

  it('produces localized Arabic engineering labels and explanations with identical deterministic numbers', () => {
    const s1 = createScenarioProject('compliant');
    const enChecks = runEngineeringValidation(s1, 'en');
    const arChecks = runEngineeringValidation(s1, 'ar');

    assert.equal(arChecks.length, enChecks.length);
    for (let i = 0; i < enChecks.length; i++) {
      assert.equal(arChecks[i].id, enChecks[i].id);
      assert.equal(arChecks[i].status, enChecks[i].status);
      assert.equal(arChecks[i].calculatedValue, enChecks[i].calculatedValue);
      assert.equal(arChecks[i].formula, enChecks[i].formula);
      assert.match(arChecks[i].title, /[\u0600-\u06FF]/, `Expected Arabic title for ${arChecks[i].id}`);
      assert.match(
        arChecks[i].explanation,
        /[\u0600-\u06FF]/,
        `Expected Arabic explanation for ${arChecks[i].id}`,
      );
    }

    // Verify critical deterministic numeric values match Scenario 1 expectations
    const arMap = new Map(arChecks.map((c) => [c.id, c]));
    assert.equal(arMap.get('check-pv-voc-stc')?.calculatedValue, 396);
    assert.equal(arMap.get('check-thermal-voc')?.calculatedValue, 421.74);
    assert.equal(arMap.get('check-mppt-window')?.calculatedValue, 332);
    assert.equal(arMap.get('check-pv-operating-current')?.calculatedValue, 26.5);
    assert.equal(arMap.get('check-pv-shortcircuit-current')?.calculatedValue, 27.6);
    assert.equal(arMap.get('check-dc-ac-ratio')?.calculatedValue, 0.88);
    assert.equal(arMap.get('check-battery-voltage')?.calculatedValue, 48);

    // Ensure technical symbols remain preserved in Arabic comparison and validation
    assert.ok(arChecks.some((c) => c.title.includes('Voc') || c.formula.includes('Voc')));
    assert.ok(arChecks.some((c) => c.title.includes('MPPT') || c.formula.includes('MPPT')));

    const s3 = createScenarioProject('incomplete');
    const s3CompsAr = comparePromisedVsInstalled(s3, 'ar');
    const s3ChecksAr = runEngineeringValidation(s3, 'ar');
    const s3MissingAr = buildMissingDataReport(s3, s3CompsAr, s3ChecksAr, 'ar');
    assert.equal(s3MissingAr.blockedChecks.length, 5);
    assert.ok(s3MissingAr.missingParameters.every((m) => /[\u0600-\u06FF]/.test(m.parameter)));
  });

  it('builds Arabic RTL PDF reports with DejaVuSans font and zero ??? placeholders across all scenarios', () => {
    for (const key of ['compliant', 'mismatch', 'incomplete'] as const) {
      const scenario = createScenarioProject(key);
      const { doc } = buildProjectPdfDocument(scenario, 'ar');
      const fonts = doc.getFontList();
      assert.ok(
        Object.keys(fonts).some((name) => name.toLowerCase() === 'dejavusans'),
        `Expected DejaVuSans font registered for scenario ${key}`,
      );
      assert.ok(doc.getNumberOfPages() >= 3, `Expected >= 3 pages for scenario ${key}`);

      const buf = doc.output('arraybuffer');
      assert.ok(buf.byteLength > 100_000, `Expected non-empty PDF payload for ${key}`);

      const rawText = new TextDecoder('latin1').decode(new Uint8Array(buf));
      assert.ok(rawText.includes('DejaVuSans'), `Expected DejaVuSans embedded in PDF for ${key}`);
      assert.ok(!rawText.includes('???'), `Unexpected ??? placeholder in Arabic PDF for ${key}`);
    }
  });
});

describe('Regression Suite — Arabic PDF BiDi/Shaping, RTL Localization & Threshold Preservation', () => {
  it('configures jsPDF raw text options to prevent double-reordering and symmetric bracket swaps', () => {
    assert.deepEqual(PDF_RAW_TEXT_OPTIONS, {
      isInputVisual: true,
      isOutputVisual: true,
      isInputRtl: false,
      isOutputRtl: false,
      isSymmetricSwapping: false,
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    registerArabicFont(doc);
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(9);

    const mixedSamples = [
      `اختبار ${ltr('(PV)')} بنسبة ${ltr('(6.9%)')} مع ${ltr('-0.64 kWp')} و ${ltr('40 W')}`,
      `الحد المسموح: ${ltr('0.75 – 1.35')} (فشل: ${ltr('>\u00A01.50')})`,
      `الفرق المتوقع ${ltr('(-50 V)')} في ${ltr('MPPT')}`,
    ];

    for (const sample of mixedSamples) {
      const single = prepareRtlSingleLine(doc, sample);
      const wrapped = prepareRtlLines(doc, sample, 45);
      for (const line of [single, ...wrapped]) {
        assert.ok(!/[\u202A-\u202E\u2066-\u2069]/.test(line), `Leaked BiDi control char in: ${line}`);
        assert.ok(!line.includes('{') && !line.includes('}'), `Unexpected curly brace swap in: ${line}`);
      }
      assert.ok(single.includes('(PV)') || wrapped.join(' ').includes('(PV)') || !sample.includes('(PV)'));
      if (sample.includes('0.75')) {
        assert.ok(single.includes('0.75 – 1.35'), `Lost ratio range in: ${single}`);
        assert.ok(single.includes('1.50'), `Lost 1.50 threshold in: ${single}`);
      }
    }

    // Pure LTR formula stays strictly LTR
    const pureFormula = 'ratio = P_pv_dc / P_inv_ac';
    assert.equal(toVisualRtlLine(pureFormula), pureFormula);
  });

  it('keeps shaped autoTable header lines idempotent across multi-page redraws', () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    registerArabicFont(doc);
    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(8);

    const rawHeaders = ['الفحص الهندسي', 'النتيجة', 'المعادلة', 'القيمة المحسوبة', 'الحد المسموح'];
    const shaped = shapeCellTextForAutoTable(doc, rawHeaders);
    const pass1 = finalizeRtlAutoTableLines([...shaped]);
    const pass2 = finalizeRtlAutoTableLines([...shaped]);

    assert.deepEqual(pass1, pass2);
    for (let i = 0; i < pass1.length; i++) {
      assert.ok(containsArabic(pass1[i]));
      assert.ok(!/[\u202A-\u202E\u2066-\u2069]/.test(pass1[i]));
    }
  });

  it('renders all 4 pages for default mismatch Arabic PDF without duplicate-parenthesis bug', () => {
    const arTr = getTranslations('ar');
    assert.ok(!arTr.common.simDataBannerBody.includes('(({customer}))'));
    assert.ok(!arTr.pdf.gapBItemWithBlocks.includes('->'));

    const demo = createDemoProject();
    const { doc } = buildProjectPdfDocument(demo, 'ar');
    assert.equal(doc.getNumberOfPages(), 4);

    // Ensure raw stored project model was NOT mutated by PDF display localization
    assert.equal(demo.customerName, 'Al-Noor Commercial Cold Storage (Simulated Demo)');
    assert.equal(demo.location, 'Riyadh Industrial Zone II');
  });

  it('localizes simulated markers, audit summary methodology formula, category fields, and extraction diffs in Arabic', () => {
    const demo = createDemoProject();
    const pv = demo.installedEquipment.find((e) => e.category === 'PV_MODULE')!;
    const arReasons = detectSimulatedMarkers(pv, true, 'ar');
    const enReasons = detectSimulatedMarkers(pv, true, 'en');
    assert.ok(arReasons.length > 0 && arReasons.every((r) => containsArabic(r)));
    assert.ok(enReasons.length > 0 && enReasons.every((r) => !containsArabic(r)));

    const compsAr = comparePromisedVsInstalled(demo, 'ar');
    const checksAr = runEngineeringValidation(demo, 'ar');
    const summaryAr = computeAuditSummary(compsAr, checksAr, 'ar');
    assert.ok(containsArabic(summaryAr.equipmentMatchFormula));
    assert.ok(summaryAr.equipmentMatchFormula.includes('المعايير المتطابقة'));

    // Unreadable label localization handles parenthetical and verbose AI strings
    const localizedVocCoeff = localizeCategoryFieldText(
      'PV_MODULE',
      'Voc Temperature Coefficient (not printed on module nameplate)',
      'ar',
    );
    const localizedImpLimit = localizeCategoryFieldText(
      'INVERTER',
      'Max PV Operating Current (Imp limit) not printed on nameplate',
      'ar',
    );
    assert.ok(containsArabic(localizedVocCoeff) && localizedVocCoeff !== 'Voc Temperature Coefficient (not printed on module nameplate)');
    assert.ok(containsArabic(localizedImpLimit) && localizedImpLimit !== 'Max PV Operating Current (Imp limit) not printed on nameplate');

    // Extraction diff localization translates Quantity, Missing, units, and field labels
    const existingVerified = makePv({ manufacturer: 'Jinko Solar', quantity: 16, provenance: 'USER_VERIFIED' });
    const incomingAi = makePv({ manufacturer: 'Longi', quantity: 14, tempCoeffVocPctPerC: null, provenance: 'AI_EXTRACTED' });
    const diffsAr = computeExtractionFieldDiffs(existingVerified, incomingAi, 'ar');
    const qtyDiff = diffsAr.find((d) => d.key === 'quantity');
    const tempDiff = diffsAr.find((d) => d.key === 'tempCoeffVocPctPerC');
    assert.ok(qtyDiff && containsArabic(qtyDiff.label) && qtyDiff.existingValue.includes('وحدة'));
    assert.ok(tempDiff && containsArabic(tempDiff.proposedValue));

    const plan = planEquipmentExtractionMerge([existingVerified], [incomingAi], false, 'ar');
    assert.equal(plan.conflicts.length, 1);
    assert.ok(plan.conflicts[0].changedFields.some((f) => containsArabic(f.label)));
  });

  it('localizes demo project display strings in Arabic while preserving custom non-demo text untouched', () => {
    assert.ok(containsArabic(localizeDemoCustomerName('Al-Noor Commercial Cold Storage (Simulated Demo)', 'ar')));
    assert.equal(
      localizeDemoCustomerName('Al-Noor Commercial Cold Storage (Simulated Demo)', 'en'),
      'Al-Noor Commercial Cold Storage (Simulated Demo)',
    );
    assert.equal(localizeDemoCustomerName('Custom Factory Solar Audit', 'ar'), 'Custom Factory Solar Audit');

    assert.ok(containsArabic(localizeDemoLocation('Riyadh Industrial Zone II', 'ar')));
    assert.ok(containsArabic(localizeDemoManufacturer('Unbranded / OEM', 'ar') ?? ''));
    assert.equal(localizeDemoManufacturer('Huawei', 'ar'), 'Huawei');
    assert.ok(containsArabic(localizeDemoAdditionalSpecs('10 kW Hybrid Inverter, IP65 enclosure', 'ar') ?? ''));
    assert.ok(containsArabic(localizeDemoUncertainField('Manufacturer brand omitted on metallic plate', 'ar')));
    assert.ok(containsArabic(localizeDemoMeasurementParam('Measured Battery Bank DC Voltage', 'ar')));
    assert.ok(containsArabic(localizeDemoMeasurementTech('Eng. Tariq Al-Mansoor', 'ar')));
    assert.ok(
      containsArabic(
        localizeDemoMeasurementNotes(
          'Two US5000 battery modules connected in parallel; third rack slot unpopulated.',
          'ar',
        ),
      ),
    );
  });

  it('preserves exact deterministic DC/AC ratio thresholds (0.75, 1.35, 1.50) across EN and AR', () => {
    const buildRatioCase = (pvW: number, qty: number, invW: number) =>
      makeBaseProject({
        installedEquipment: [
          makePv({ ratedPowerW: pvW, quantity: qty }),
          makeInverter({ ratedPowerW: invW, quantity: 1 }),
          makeBattery(),
        ],
        arrayConfig: {
          modulesPerString: qty,
          parallelStrings: 1,
          minAmbientTempC: 10,
          stcTempC: 25,
          provenance: 'USER_VERIFIED',
        },
      });

    // 8000 W / 10000 W = 0.80 -> PASS (within [0.75, 1.35])
    const passChecksAr = runEngineeringValidation(buildRatioCase(500, 16, 10000), 'ar');
    const passDcAc = passChecksAr.find((c) => c.id === 'check-dc-ac-ratio')!;
    assert.equal(passDcAc.calculatedValue, 0.8);
    assert.equal(passDcAc.status, 'PASS');
    assert.ok(passDcAc.limitValue.includes('0.75') && passDcAc.limitValue.includes('1.35') && passDcAc.limitValue.includes('1.50'));

    // 14500 W / 10000 W = 1.45 -> WARNING (> 1.35 and <= 1.50)
    const warnChecksAr = runEngineeringValidation(buildRatioCase(500, 29, 10000), 'ar');
    const warnDcAc = warnChecksAr.find((c) => c.id === 'check-dc-ac-ratio')!;
    assert.equal(warnDcAc.calculatedValue, 1.45);
    assert.equal(warnDcAc.status, 'WARNING');

    // 15500 W / 10000 W = 1.55 -> FAIL (> 1.50)
    const failChecksAr = runEngineeringValidation(buildRatioCase(500, 31, 10000), 'ar');
    const failDcAc = failChecksAr.find((c) => c.id === 'check-dc-ac-ratio')!;
    assert.equal(failDcAc.calculatedValue, 1.55);
    assert.equal(failDcAc.status, 'FAIL');
  });
});


