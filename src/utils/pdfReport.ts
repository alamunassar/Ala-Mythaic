import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  buildMissingDataReport,
  CATEGORY_LABELS,
  comparePromisedVsInstalled,
  computeAuditSummary,
  detectSimulatedMarkers,
  formatInputConfidence,
  formatProvenance,
  projectContainsSimulatedData,
  resolveEquipmentProvenance,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
import type { EquipmentSpec, SolarProject } from '../types/mithaq';

export function generateReportId(projectId: string): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RPT-${projectId.replace(/[^A-Z0-9-]/gi, '')}-${stamp}-${suffix}`;
}

/**
 * jsPDF built-in Helvetica uses WinAnsi/Latin-1 (0x20..0xFF).
 * Any Unicode code point > 255 (e.g., β, ≤, ≥, ∈, ≈, −, –, —, Ω) gets truncated
 * by single-byte font encoding into garbled glyphs. Normalize all engineering symbols
 * to crisp Latin-1 / ASCII equivalents.
 */
export function toPdfSafeText(input: string): string {
  return input
    .replace(/\u03B2/g, 'beta') // β
    .replace(/\u2264/g, '<=') // ≤
    .replace(/\u2265/g, '>=') // ≥
    .replace(/\u2208/g, 'in') // ∈
    .replace(/\u2248/g, '~=') // ≈
    .replace(/\u2212/g, '-') // −
    .replace(/[\u2013\u2014]/g, '-') // – —
    .replace(/\u03A9/g, 'Ohm') // Ω
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00B7/g, ' | ') // ·
    .replace(/[^\x0A\x20-\xFF]/g, '?');
}

function fmtSpecLine(eq: EquipmentSpec): string {
  const details: string[] = [];
  if (eq.ratedPowerW !== null) details.push(`P: ${eq.ratedPowerW} W`);
  if (eq.capacityKwh !== null) details.push(`Cap: ${eq.capacityKwh} kWh`);
  if (eq.nominalVoltageV !== null) details.push(`Vnom: ${eq.nominalVoltageV} V`);
  if (eq.minBatteryVoltageV !== null && eq.maxBatteryVoltageV !== null) {
    details.push(`V_batt_win: ${eq.minBatteryVoltageV}-${eq.maxBatteryVoltageV} V`);
  }
  if (eq.vocV !== null) details.push(`Voc: ${eq.vocV} V`);
  if (eq.vmpV !== null) details.push(`Vmp: ${eq.vmpV} V`);
  if (eq.iscA !== null) details.push(`Isc: ${eq.iscA} A`);
  if (eq.impA !== null) details.push(`Imp: ${eq.impA} A`);
  if (eq.tempCoeffVocPctPerC !== null) details.push(`beta_Voc: ${eq.tempCoeffVocPctPerC} %/°C`);
  if (eq.maxPvInputVoltageV !== null) details.push(`MaxPV: ${eq.maxPvInputVoltageV} V`);
  if (eq.mpptMinV !== null && eq.mpptMaxV !== null) {
    details.push(`MPPT: ${eq.mpptMinV}-${eq.mpptMaxV} V`);
  }
  if (eq.maxPvOperatingCurrentA !== null) {
    details.push(`Ipv,op,max: ${eq.maxPvOperatingCurrentA} A`);
  }
  if (eq.maxPvShortCircuitCurrentA !== null) {
    details.push(`Ipv,sc,max: ${eq.maxPvShortCircuitCurrentA} A`);
  }
  return toPdfSafeText(details.join(' | ') || 'No technical ratings recorded');
}

function ensureSpace(doc: jsPDF, currentY: number, minNeededMm: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + minNeededMm > pageHeight - 16) {
    doc.addPage();
    return 18;
  }
  return currentY;
}

function getLastTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function applyStatusColor(
  statusText: string,
  cellStyles: { textColor?: [number, number, number]; fontStyle?: string },
) {
  const firstLine = statusText.split('\n')[0].trim().toUpperCase();
  if (
    firstLine === 'MATCH' ||
    firstLine === 'PASS' ||
    firstLine.startsWith('PASS -') ||
    firstLine === 'VERIFIED MATCH'
  ) {
    cellStyles.textColor = [21, 128, 61];
    cellStyles.fontStyle = 'bold';
  } else if (firstLine === 'MISMATCH' || firstLine === 'FAIL' || firstLine === 'ACTION REQUIRED') {
    cellStyles.textColor = [185, 28, 28];
    cellStyles.fontStyle = 'bold';
  } else if (
    firstLine === 'WARNING' ||
    firstLine.startsWith('WARNING -') ||
    firstLine === 'DISCREPANCIES FOUND'
  ) {
    cellStyles.textColor = [180, 83, 9];
    cellStyles.fontStyle = 'bold';
  } else if (
    firstLine === 'INSUFFICIENT DATA' ||
    firstLine === 'NOT VERIFIED' ||
    firstLine === 'INCOMPLETE DATA'
  ) {
    cellStyles.textColor = [71, 85, 105];
    cellStyles.fontStyle = 'bold';
  }
}

export function buildProjectPdfDocument(project: SolarProject): {
  doc: jsPDF;
  reportId: string;
} {
  const reportId = generateReportId(project.id);
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const comparisons = comparePromisedVsInstalled(project);
  const checks = runEngineeringValidation(project);
  const summary = computeAuditSummary(comparisons, checks);
  const missingReport = buildMissingDataReport(project, comparisons, checks);
  const hasSimulated = projectContainsSimulatedData(project);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const printableWidth = pageWidth - 28; // 182mm on A4

  // Header Banner (Dark Navy)
  doc.setFillColor(11, 21, 40);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('MITHAQ-Lab', 14, 12.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Solar Installation Verification & Engineering Audit Platform', 14, 18.5);
  doc.text('What Was Promised vs. What Was Installed vs. What Was Verified.', 14, 24);

  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(toPdfSafeText(`Report ID: ${reportId}`), pageWidth - 14, 12.5, { align: 'right' });
  doc.text(toPdfSafeText(`Generated: ${generatedAt}`), pageWidth - 14, 18.5, { align: 'right' });
  doc.text(toPdfSafeText(`Project ID: ${project.id}`), pageWidth - 14, 24, { align: 'right' });

  let cursorY = 38;

  // Simulated / Demonstration Notice Banner
  if (hasSimulated) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(14, cursorY, printableWidth, 14, 'FD');
    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(
      'DEMONSTRATION / SIMULATED DATA - CONTAINS NON-REAL OR PROTOTYPE RECORDS',
      18,
      cursorY + 5,
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.text(
      toPdfSafeText(
        project.isDemo
          ? 'This report is generated from synthetic demonstration data and does not represent a verified real customer installation.'
          : 'One or more equipment records, notes, or measurements contain simulated/prototype markers and are not verified real equipment.',
      ),
      18,
      cursorY + 10.5,
    );
    cursorY += 19;
  }

  // Section 1: Project Metadata & Final Verification Summary
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. Project Metadata & Final Verification Summary', 14, cursorY);
  cursorY += 3;

  const matchPctLabel =
    summary.equipmentMatchPct !== null
      ? `${summary.equipmentMatchPct}% (${summary.matchedParameters} matched / ${summary.totalComparedParameters} eligible params across ${summary.eligibleCategories} cat(s))`
      : 'N/A (No eligible promised-vs-installed comparisons)';

  const coverageGapText = [
    summary.unquotedInstalledCategories.length > 0
      ? `Installed without quote: ${summary.unquotedInstalledCategories.join(', ')}`
      : null,
    summary.missingInstalledCategories.length > 0
      ? `Promised not documented: ${summary.missingInstalledCategories.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join(' | ');

  autoTable(doc, {
    startY: cursorY,
    tableWidth: printableWidth,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    styles: { fontSize: 7.8, cellPadding: 2.2, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { cellWidth: 52 },
      2: { cellWidth: 42, fontStyle: 'bold', textColor: [51, 65, 85] },
      3: { cellWidth: 56 },
    },
    head: [['Project Attribute', 'Value', 'Audit Summary Metric', 'Result']],
    body: [
      [
        'Customer Name',
        project.customerName,
        'Overall Verification Status',
        summary.overallStatus,
      ],
      [
        'Project Location',
        project.location,
        'Equipment Spec Match %',
        matchPctLabel,
      ],
      [
        'Installation Date',
        project.installationDate,
        'Match % Methodology',
        `${summary.equipmentMatchFormula}\nMatching: ${summary.matchedParameters} | Mismatching: ${summary.mismatchedParameters} | Warning: ${summary.warningParameters} | Insufficient Data: ${summary.notVerifiedParameters}`,
      ],
      [
        'System Topology',
        project.systemType,
        'Category & Coverage Gaps',
        `${summary.confirmedMatches} Match | ${summary.discrepancies} Mismatch | ${summary.warnings} Warning | ${summary.notVerifiedCount} Not Verified${coverageGapText ? `\nExcluded: ${coverageGapText}` : ''}`,
      ],
      [
        'Array Layout',
        `${project.arrayConfig.modulesPerString ?? '?'}S × ${project.arrayConfig.parallelStrings ?? '?'}P (Tmin: ${project.arrayConfig.minAmbientTempC ?? '?'} °C)`,
        'Engineering Checks',
        `${summary.passedChecks} Pass | ${summary.warningChecks} Warning | ${summary.failedChecks} Fail | ${summary.insufficientDataChecks} Insufficient Data\nPASS Input Confidence: ${summary.verifiedPassChecks} Verified | ${summary.simulatedPassChecks} Simulated | ${summary.unverifiedPassChecks} Unverified`,
      ],
    ].map((r) => r.map((c) => toPdfSafeText(c))),
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3 && data.row.index === 0) {
        applyStatusColor(String(data.cell.raw ?? ''), data.cell.styles as never);
      }
    },
  });

  cursorY = getLastTableY(doc) + 8;

  // Section 2: Promised vs Installed Equipment Comparison
  cursorY = ensureSpace(doc, cursorY, 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Promised vs. Installed Equipment Comparison', 14, cursorY);
  cursorY += 3;

  const compRows: string[][] = [];
  for (const comp of comparisons) {
    if (comp.differences.length === 0) {
      compRows.push([
        toPdfSafeText(comp.label),
        'Category Status',
        toPdfSafeText(comp.promisedSummary),
        toPdfSafeText(comp.installedSummary),
        toPdfSafeText(comp.status),
        toPdfSafeText(comp.missingFields.join('; ') || 'No records entered'),
      ]);
    } else {
      for (const diff of comp.differences) {
        compRows.push([
          toPdfSafeText(comp.label),
          toPdfSafeText(diff.field),
          toPdfSafeText(diff.promised),
          toPdfSafeText(diff.installed),
          toPdfSafeText(diff.status),
          toPdfSafeText(diff.note),
        ]);
      }
    }
  }

  autoTable(doc, {
    startY: cursorY,
    tableWidth: printableWidth,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    styles: { fontSize: 7.2, cellPadding: 1.7, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.6 },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22 },
      5: { cellWidth: 46 },
    },
    head: [['Category', 'Parameter', 'Promised', 'Installed', 'Status', 'Audit Note']],
    body: compRows,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        applyStatusColor(String(data.cell.raw ?? ''), data.cell.styles as never);
      }
    },
  });

  cursorY = getLastTableY(doc) + 6;

  // Section 3: Equipment Register
  cursorY = ensureSpace(doc, cursorY, 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Equipment Register & Data Provenance', 14, cursorY);
  cursorY += 3;

  const formatEqSource = (eq: EquipmentSpec): string => {
    const prov = resolveEquipmentProvenance(eq, project.isDemo);
    const simReasons = detectSimulatedMarkers(eq, project.isDemo);
    const base = formatProvenance(prov);
    const extras: string[] = [];
    if (eq.datasheetFileName) extras.push(`Datasheet: ${eq.datasheetFileName}`);
    if (simReasons.length > 0 && prov === 'SIMULATED') extras.push(simReasons[0]);
    return toPdfSafeText(extras.length > 0 ? `${base}\n(${extras.join('; ')})` : base);
  };

  const eqRows: string[][] = [
    ...project.promisedEquipment.map((eq) => [
      'PROMISED',
      toPdfSafeText(CATEGORY_LABELS[eq.category]),
      toPdfSafeText(`${eq.manufacturer ?? 'N/A'}\n${eq.model ?? 'N/A'}`),
      eq.quantity !== null ? String(eq.quantity) : 'N/A',
      fmtSpecLine(eq),
      formatEqSource(eq),
    ]),
    ...project.installedEquipment.map((eq) => [
      'INSTALLED',
      toPdfSafeText(CATEGORY_LABELS[eq.category]),
      toPdfSafeText(`${eq.manufacturer ?? 'N/A'}\n${eq.model ?? 'N/A'}`),
      eq.quantity !== null ? String(eq.quantity) : 'N/A',
      fmtSpecLine(eq),
      formatEqSource(eq),
    ]),
  ];

  autoTable(doc, {
    startY: cursorY,
    tableWidth: printableWidth,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    styles: { fontSize: 7.0, cellPadding: 1.7, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.6 },
    columnStyles: {
      0: { cellWidth: 19, fontStyle: 'bold' },
      1: { cellWidth: 24 },
      2: { cellWidth: 32 },
      3: { cellWidth: 11, halign: 'center' },
      4: { cellWidth: 58 },
      5: { cellWidth: 38 },
    },
    head: [['Type', 'Category', 'Make & Model', 'Qty', 'Technical Ratings', 'Data Provenance']],
    body: eqRows.length > 0 ? eqRows : [['-', '-', 'No equipment entered', '-', '-', '-']],
  });

  cursorY = getLastTableY(doc) + 6;

  // Section 4: Independent Engineering Validation & Calculations
  cursorY = ensureSpace(doc, cursorY, 48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Deterministic Engineering Validation & Calculations', 14, cursorY);
  cursorY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(51, 65, 85);
  const legendText = toPdfSafeText(
    'Legend — Calculation Outcome (PASS, WARNING, FAIL, INSUFFICIENT DATA) reflects deterministic limit math. Input Confidence (VERIFIED INPUTS, SIMULATED INPUTS, UNVERIFIED INPUTS, INCOMPLETE INPUTS) reflects provenance of critical equipment specs [Equip Spec] (array configuration [Config] does not downgrade verified equipment). Verified inputs and PASS do not certify safety or code compliance.',
  );
  const wrappedLegend = doc.splitTextToSize(legendText, printableWidth);
  doc.text(wrappedLegend, 14, cursorY);
  cursorY += wrappedLegend.length * 3.3 + 2.5;

  const checkRows = checks.map((c) => {
    const checkAndFormula = toPdfSafeText(`${c.title}\n\nFormula:\n${c.formula}`);
    const outcomeAndConfidence = toPdfSafeText(
      `${c.qualifiedResult}\nConfidence:\n${formatInputConfidence(c.inputConfidence)}`,
    );
    const inputsLines = c.inputs
      .map((i) => {
        const roleLabel = i.inputRole === 'EQUIPMENT_SPEC' ? 'Equip Spec' : 'Config';
        return `${i.symbol} = ${i.value !== null ? `${i.value} ${i.unit}` : 'MISSING'} [${roleLabel}; ${i.provenance}]`;
      })
      .join('\n');
    const resultStr =
      c.calculatedValue !== null ? `${c.calculatedValue} ${c.calculatedUnit}` : 'Not Computed';
    const inputsAndResult = toPdfSafeText(
      `${inputsLines}\n\nResult: ${resultStr}\nLimit: ${c.limitValue}`,
    );
    const notesStr = toPdfSafeText(
      c.missingInputs.length > 0
        ? `Blocked by Missing Inputs:\n- ${c.missingInputs.join('\n- ')}\n\n${c.explanation}`
        : c.explanation,
    );
    return [checkAndFormula, outcomeAndConfidence, inputsAndResult, notesStr];
  });

  autoTable(doc, {
    startY: cursorY,
    tableWidth: printableWidth,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    styles: { fontSize: 6.9, cellPadding: 1.7, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 39 },
      1: { cellWidth: 39 },
      2: { cellWidth: 57 },
      3: { cellWidth: 47 },
    },
    head: [
      [
        'Engineering Check & Formula',
        'Outcome & Confidence',
        'Traceable Inputs, Role, Provenance & Result',
        'Finding / Missing Information',
      ],
    ],
    body: checkRows,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        applyStatusColor(String(data.cell.raw ?? ''), data.cell.styles as never);
      }
    },
  });

  cursorY = getLastTableY(doc) + 6;

  // Section 5: Technician Field Measurements
  cursorY = ensureSpace(doc, cursorY, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('5. Technician Field Measurements (Manually Recorded)', 14, cursorY);
  cursorY += 3;

  const measRows = project.fieldMeasurements.map((m) => [
    toPdfSafeText(m.parameter + (m.isSimulated ? ' [SIMULATED]' : '')),
    toPdfSafeText(`${m.value} ${m.unit}`),
    toPdfSafeText(m.measuredAt.replace('T', ' ')),
    toPdfSafeText(m.technicianName),
    toPdfSafeText(m.notes || '-'),
  ]);

  autoTable(doc, {
    startY: cursorY,
    tableWidth: printableWidth,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    styles: { fontSize: 7.2, cellPadding: 1.7, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.6 },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 28 },
      3: { cellWidth: 32 },
      4: { cellWidth: 56 },
    },
    head: [['Measured Parameter', 'Value', 'Timestamp', 'Technician', 'Field Notes']],
    body:
      measRows.length > 0
        ? measRows
        : [['No technician field measurements logged yet', '-', '-', '-', '-']],
  });

  cursorY = getLastTableY(doc) + 6;

  // Section 6: Separated Discrepancies, Structured Missing Data & Audit Scope Notice
  cursorY = ensureSpace(doc, cursorY, 36);

  const discrepancyNotes = comparisons
    .filter((c) => c.eligibility === 'ELIGIBLE')
    .flatMap((c) =>
      c.differences
        .filter((d) => d.status === 'MISMATCH' || d.status === 'WARNING')
        .map((d) => `${c.label} - ${d.field} (${d.status}): ${d.note}`),
    );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('6. Discrepancies, Structured Missing Data & Audit Scope Notice', 14, cursorY);
  cursorY += 4;

  const writeSectionParagraph = (text: string, italic = false) => {
    doc.setFont('helvetica', italic ? 'italic' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const wrapped = doc.splitTextToSize(toPdfSafeText(text), printableWidth);
    cursorY = ensureSpace(doc, cursorY, wrapped.length * 3.3 + 3);
    doc.text(wrapped, 14, cursorY);
    cursorY += wrapped.length * 3.3 + 2.5;
  };

  if (discrepancyNotes.length > 0) {
    writeSectionParagraph(
      `Confirmed Equipment Discrepancies & Value Warnings (${discrepancyNotes.length}):\n` +
        discrepancyNotes.map((d) => `- ${d}`).join('\n'),
    );
  } else {
    writeSectionParagraph(
      'Confirmed Equipment Discrepancies & Value Warnings (0): No confirmed discrepancies across eligible compared parameters.',
    );
  }

  // (A) Equipment Record Gaps
  const recordGapLines: string[] = [
    ...missingReport.recordGaps.unquotedInstalled.map(
      (g) => `Installed without quotation coverage: ${g}`,
    ),
    ...missingReport.recordGaps.missingInstalled.map(
      (g) => `Promised in quotation, not documented installed: ${g}`,
    ),
    ...missingReport.recordGaps.unverifiedAiRecords.map((g) => `Unverified record: ${g}`),
  ];
  writeSectionParagraph(
    recordGapLines.length > 0
      ? `A. Equipment Record Gaps (${recordGapLines.length}):\n` +
          recordGapLines.map((l) => `- ${l}`).join('\n')
      : 'A. Equipment Record Gaps: None.',
  );

  // (B) Missing Technical Parameters (Deduplicated & Linked to Blocked Checks)
  const missingParamLines = missingReport.missingParameters.map((mp) =>
    mp.blockedChecks.length > 0
      ? `${mp.parameter} [${mp.missingOn}] -> Blocks: ${mp.blockedChecks.join('; ')}`
      : `${mp.parameter} [${mp.missingOn}]`,
  );
  writeSectionParagraph(
    missingParamLines.length > 0
      ? `B. Missing Technical Parameters - Deduplicated (${missingParamLines.length}):\n` +
          missingParamLines.map((l) => `- ${l}`).join('\n')
      : 'B. Missing Technical Parameters: None.',
  );

  // (C) Engineering Checks Blocked by Missing Data
  const blockedCheckLines = missingReport.blockedChecks.map(
    (bc) => `${bc.title} (Missing: ${bc.missingInputs.join(', ')})`,
  );
  writeSectionParagraph(
    blockedCheckLines.length > 0
      ? `C. Engineering Checks Blocked by Missing Data (${blockedCheckLines.length}):\n` +
          blockedCheckLines.map((l) => `- ${l}`).join('\n')
      : 'C. Engineering Checks Blocked by Missing Data: None.',
  );

  if (project.aiAuditCommentary) {
    writeSectionParagraph(
      `Audit Narrative Summary (Generated from Deterministic Results):\n${project.aiAuditCommentary}`,
    );
  }

  writeSectionParagraph(
    'AUDIT SCOPE & LIMITATIONS NOTICE: MITHAQ-Lab compares contractual quotations against observed equipment nameplates and performs deterministic engineering calculations on available manufacturer parameters. A PASS engineering check confirms only mathematical compliance with the entered equipment limits; it does NOT certify electrical safety, installation workmanship, conductor sizing, local electrical code compliance, or replace a licensed professional inspection. Equipment discrepancies do not establish supplier intent or fraud.',
    true,
  );

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      toPdfSafeText(`MITHAQ-Lab Verification Report | ${reportId} | Page ${i} of ${totalPages}`),
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  return { doc, reportId };
}

export function downloadProjectPdfReport(project: SolarProject): string {
  const { doc, reportId } = buildProjectPdfDocument(project);
  doc.save(`${project.id}_MITHAQ_Audit_Report.pdf`);
  return reportId;
}
