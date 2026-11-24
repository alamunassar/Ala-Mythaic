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
import { createDemoProject } from '../../data/demoProject.ts';
import { buildProjectPdfDocument, toPdfSafeText } from '../../utils/pdfReport.ts';
import {
  createOriginalAiSnapshot,
  filterUnreadableFieldsByCategory,
  sanitizeSpecFieldsByCategory,
} from '../../utils/categorySpecs.ts';
import { normalizeLoadedProject } from '../../utils/storage.ts';
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
});
