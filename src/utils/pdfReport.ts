import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  buildMissingDataReport,
  comparePromisedVsInstalled,
  computeAuditSummary,
  detectSimulatedMarkers,
  formatInputConfidence,
  formatProvenance,
  getCategoryLabel,
  projectContainsSimulatedData,
  resolveEquipmentProvenance,
  runEngineeringValidation,
} from '../engine/engineeringEngine';
import {
  fmt,
  getTranslations,
  ltr,
  type Language,
  type TranslationDictionary,
} from '../i18n/translations';
import type { EquipmentSpec, SolarProject } from '../types/mithaq';
import {
  localizeDemoCustomerName,
  localizeDemoLocation,
  localizeDemoManufacturer,
  localizeDemoMeasurementNotes,
  localizeDemoMeasurementParam,
  localizeDemoMeasurementTech,
} from './demoLocalization';
import {
  PDF_RAW_TEXT_OPTIONS,
  containsArabic,
  finalizeRtlAutoTableLines,
  prepareRtlLines,
  prepareRtlSingleLine,
  registerArabicFont,
  shapeCellTextForAutoTable,
} from './pdfRtl';

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
 * to crisp Latin-1 / ASCII equivalents for English Helvetica PDFs.
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

function fmtSpecLine(
  eq: EquipmentSpec,
  pdfTr: TranslationDictionary['pdf'],
  isRtl: boolean,
): string {
  const details: string[] = [];
  if (eq.ratedPowerW !== null) details.push(`P: ${eq.ratedPowerW} W`);
  if (eq.capacityKwh !== null) details.push(`Cap: ${eq.capacityKwh} kWh`);
  if (eq.nominalVoltageV !== null) details.push(`Vnom: ${eq.nominalVoltageV} V`);
  if (eq.minBatteryVoltageV !== null && eq.maxBatteryVoltageV !== null) {
    details.push(`Vbatt: ${eq.minBatteryVoltageV}-${eq.maxBatteryVoltageV} V`);
  }
  if (eq.vocV !== null) details.push(`Voc: ${eq.vocV} V`);
  if (eq.vmpV !== null) details.push(`Vmp: ${eq.vmpV} V`);
  if (eq.iscA !== null) details.push(`Isc: ${eq.iscA} A`);
  if (eq.impA !== null) details.push(`Imp: ${eq.impA} A`);
  if (eq.tempCoeffVocPctPerC !== null) details.push(`β_Voc: ${eq.tempCoeffVocPctPerC} %/°C`);
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
  if (details.length === 0) {
    return isRtl ? pdfTr.noRatingsRecorded : toPdfSafeText(pdfTr.noRatingsRecorded);
  }
  const joined = details.join(' | ');
  return isRtl ? ltr(joined) : toPdfSafeText(joined);
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
  const rawFirstLine = statusText.replace(/[\u202A-\u202E\u2066-\u2069]/g, '').split('\n')[0].trim();
  const upper = rawFirstLine.toUpperCase();
  if (
    upper === 'MATCH' ||
    upper === 'PASS' ||
    upper.startsWith('PASS -') ||
    upper.startsWith('PASS —') ||
    upper === 'VERIFIED MATCH' ||
    rawFirstLine === 'متطابق' ||
    rawFirstLine === 'ناجح' ||
    rawFirstLine.startsWith('ناجح —') ||
    rawFirstLine.startsWith('ناجح -') ||
    rawFirstLine === 'تطابق موثق'
  ) {
    cellStyles.textColor = [21, 128, 61];
    cellStyles.fontStyle = 'bold';
  } else if (
    upper === 'MISMATCH' ||
    upper === 'FAIL' ||
    upper === 'ACTION REQUIRED' ||
    rawFirstLine === 'عدم تطابق' ||
    rawFirstLine === 'فشل' ||
    rawFirstLine === 'إجراء مطلوب'
  ) {
    cellStyles.textColor = [185, 28, 28];
    cellStyles.fontStyle = 'bold';
  } else if (
    upper === 'WARNING' ||
    upper.startsWith('WARNING -') ||
    upper.startsWith('WARNING —') ||
    upper === 'DISCREPANCIES FOUND' ||
    rawFirstLine === 'تحذير' ||
    rawFirstLine.startsWith('تحذير —') ||
    rawFirstLine.startsWith('تحذير -') ||
    rawFirstLine === 'توجد فروقات'
  ) {
    cellStyles.textColor = [180, 83, 9];
    cellStyles.fontStyle = 'bold';
  } else if (
    upper === 'INSUFFICIENT DATA' ||
    upper === 'NOT VERIFIED' ||
    upper === 'INCOMPLETE DATA' ||
    rawFirstLine === 'بيانات غير كافية' ||
    rawFirstLine === 'غير مؤكد' ||
    rawFirstLine === 'بيانات غير مكتملة'
  ) {
    cellStyles.textColor = [71, 85, 105];
    cellStyles.fontStyle = 'bold';
  }
}

export function buildProjectPdfDocument(
  project: SolarProject,
  lang: Language = 'en',
): {
  doc: jsPDF;
  reportId: string;
} {
  const isRtl = lang === 'ar';
  const tr = getTranslations(lang);
  const pdfTr = tr.pdf;
  const reportId = generateReportId(project.id);
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const comparisons = comparePromisedVsInstalled(project, lang);
  const checks = runEngineeringValidation(project, lang);
  const summary = computeAuditSummary(comparisons, checks, lang);
  const missingReport = buildMissingDataReport(project, comparisons, checks, lang);
  const hasSimulated = projectContainsSimulatedData(project);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setR2L(false);

  if (isRtl) {
    registerArabicFont(doc);
  }

  const fontFamily = isRtl ? 'DejaVuSans' : 'helvetica';
  const pageWidth = doc.internal.pageSize.getWidth();
  const printableWidth = pageWidth - 28; // 182mm on A4

  const fmtCell = (text: string): string => (isRtl ? text : toPdfSafeText(text));
  const rtlSafeWrap = (text: string): string => (isRtl && !containsArabic(text) ? ltr(text) : text);

  const drawSingleText = (
    text: string,
    x: number,
    y: number,
    options?: { align?: 'left' | 'center' | 'right' },
  ) => {
    const rendered = isRtl ? prepareRtlSingleLine(doc, text) : toPdfSafeText(text);
    if (isRtl) {
      doc.text(rendered, x, y, { ...(options ?? {}), ...PDF_RAW_TEXT_OPTIONS });
    } else {
      doc.text(rendered, x, y, options);
    }
  };

  const drawSectionHeading = (title: string, y: number) => {
    doc.setTextColor(15, 23, 42);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(11);
    if (isRtl) {
      drawSingleText(title, pageWidth - 14, y, { align: 'right' });
    } else {
      drawSingleText(title, 14, y);
    }
  };

  type TableColStyle = {
    cellWidth?: number;
    fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
    textColor?: [number, number, number];
    halign?: 'left' | 'center' | 'right';
  };

  const runTable = (opts: {
    startY: number;
    theme: 'grid' | 'striped';
    stylesFontSize: number;
    headFontSize: number;
    cellPadding: number;
    colStyles: Record<number, TableColStyle>;
    head: string[];
    body: string[][];
    statusOrigColIndex?: number;
    statusFirstRowOnly?: boolean;
  }) => {
    const colCount = opts.head.length;
    const orderedHead = isRtl ? [[...opts.head].reverse()] : [opts.head];
    const orderedBody = opts.body.map((row) => {
      const normalizedRow = row.map((c) => fmtCell(c));
      return isRtl ? normalizedRow.reverse() : normalizedRow;
    });

    const mappedColStyles: Record<number, TableColStyle> = {};
    for (let i = 0; i < colCount; i++) {
      const targetIdx = isRtl ? colCount - 1 - i : i;
      const baseStyle = opts.colStyles[i] ?? {};
      mappedColStyles[targetIdx] = {
        ...baseStyle,
        halign: isRtl
          ? baseStyle.halign === 'center'
            ? 'center'
            : 'right'
          : baseStyle.halign ?? 'left',
      };
    }

    const statusTargetCol =
      typeof opts.statusOrigColIndex === 'number'
        ? isRtl
          ? colCount - 1 - opts.statusOrigColIndex
          : opts.statusOrigColIndex
        : undefined;

    autoTable(doc, {
      startY: opts.startY,
      tableWidth: printableWidth,
      margin: { left: 14, right: 14 },
      theme: opts.theme,
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      styles: {
        font: fontFamily,
        fontSize: opts.stylesFontSize,
        cellPadding: opts.cellPadding,
        overflow: 'linebreak',
        valign: 'top',
        halign: isRtl ? 'right' : 'left',
        ...(isRtl ? { textOptions: PDF_RAW_TEXT_OPTIONS } : {}),
      } as never,
      headStyles: {
        font: fontFamily,
        fontStyle: 'bold',
        fillColor: opts.theme === 'grid' ? [15, 23, 42] : [30, 41, 59],
        textColor: 255,
        fontSize: opts.headFontSize,
        halign: isRtl ? 'right' : 'left',
        ...(isRtl ? { textOptions: PDF_RAW_TEXT_OPTIONS } : {}),
      } as never,
      columnStyles: mappedColStyles,
      head: orderedHead,
      body: orderedBody,
      didParseCell: (data) => {
        if (
          typeof statusTargetCol === 'number' &&
          data.section === 'body' &&
          data.column.index === statusTargetCol &&
          (!opts.statusFirstRowOnly || data.row.index === 0)
        ) {
          applyStatusColor(String(data.cell.raw ?? ''), data.cell.styles as never);
        }
        if (isRtl && Array.isArray(data.cell.text)) {
          data.cell.text = shapeCellTextForAutoTable(doc, data.cell.text);
        }
      },
      willDrawCell: (data) => {
        const cell = data.cell as unknown as {
          text?: string[];
          __rtlShapedLines?: string[];
        };
        if (isRtl && Array.isArray(cell.text)) {
          if (!cell.__rtlShapedLines) {
            cell.__rtlShapedLines = [...cell.text];
          }
          cell.text = finalizeRtlAutoTableLines(cell.__rtlShapedLines);
        }
      },
    });
  };

  // Header Banner (Dark Navy)
  doc.setFillColor(11, 21, 40);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(17);
  if (isRtl) {
    doc.text('MITHAQ-Lab', pageWidth - 14, 12.5, { align: 'right', ...PDF_RAW_TEXT_OPTIONS });
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    drawSingleText(pdfTr.platformSubtitle, pageWidth - 14, 18.5, { align: 'right' });
    drawSingleText(pdfTr.slogan, pageWidth - 14, 24, { align: 'right' });

    doc.setFontSize(8.2);
    doc.setTextColor(255, 255, 255);
    drawSingleText(fmt(pdfTr.reportIdLabel, { id: ltr(reportId) }), 14, 12.5, { align: 'left' });
    drawSingleText(fmt(pdfTr.generatedLabel, { date: ltr(generatedAt) }), 14, 18.5, {
      align: 'left',
    });
    drawSingleText(fmt(pdfTr.projectIdLabel, { id: ltr(project.id) }), 14, 24, { align: 'left' });
  } else {
    doc.text('MITHAQ-Lab', 14, 12.5);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    drawSingleText(pdfTr.platformSubtitle, 14, 18.5);
    drawSingleText(pdfTr.slogan, 14, 24);

    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    drawSingleText(fmt(pdfTr.reportIdLabel, { id: reportId }), pageWidth - 14, 12.5, {
      align: 'right',
    });
    drawSingleText(fmt(pdfTr.generatedLabel, { date: generatedAt }), pageWidth - 14, 18.5, {
      align: 'right',
    });
    drawSingleText(fmt(pdfTr.projectIdLabel, { id: project.id }), pageWidth - 14, 24, {
      align: 'right',
    });
  }

  let cursorY = 38;

  // Simulated / Demonstration Notice Banner
  if (hasSimulated) {
    const descText = project.isDemo ? pdfTr.simBannerDemoDesc : pdfTr.simBannerMarkerDesc;
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7.8);
    const wrappedDesc = isRtl
      ? prepareRtlLines(doc, descText, printableWidth - 8)
      : (doc.splitTextToSize(toPdfSafeText(descText), printableWidth - 8) as string[]);
    const boxHeight = Math.max(14, 8.5 + wrappedDesc.length * 3.6);

    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(14, cursorY, printableWidth, boxHeight, 'FD');
    doc.setTextColor(146, 64, 14);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(9);
    if (isRtl) {
      drawSingleText(pdfTr.simBannerTitle, pageWidth - 18, cursorY + 5, { align: 'right' });
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(7.8);
      doc.text(wrappedDesc, pageWidth - 18, cursorY + 10.2, {
        align: 'right',
        ...PDF_RAW_TEXT_OPTIONS,
      });
    } else {
      drawSingleText(pdfTr.simBannerTitle, 18, cursorY + 5);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(7.8);
      doc.text(wrappedDesc, 18, cursorY + 10.2);
    }
    cursorY += boxHeight + 5;
  }

  // Section 1: Project Metadata & Final Verification Summary
  drawSectionHeading(pdfTr.sec1Title, cursorY);
  cursorY += 3;

  const matchPctLabel =
    summary.equipmentMatchPct !== null
      ? fmt(pdfTr.matchPctEligibleLabel, {
          pct: summary.equipmentMatchPct,
          matched: summary.matchedParameters,
          total: summary.totalComparedParameters,
          cats: summary.eligibleCategories,
        })
      : pdfTr.matchPctNaLabel;

  const coverageGapText = [
    summary.unquotedInstalledCategories.length > 0
      ? fmt(pdfTr.installedWithoutQuote, {
          cats: summary.unquotedInstalledCategories.join(', '),
        })
      : null,
    summary.missingInstalledCategories.length > 0
      ? fmt(pdfTr.promisedNotDoc, {
          cats: summary.missingInstalledCategories.join(', '),
        })
      : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const arrayLayoutStr = `${project.arrayConfig.modulesPerString ?? '?'}S × ${
    project.arrayConfig.parallelStrings ?? '?'
  }P (Tmin: ${project.arrayConfig.minAmbientTempC ?? '?'} °C)`;

  const catDetailLine = fmt(pdfTr.catSummaryDetail, {
    matches: summary.confirmedMatches,
    discrepancies: summary.discrepancies,
    warnings: summary.warnings,
    notVerified: summary.notVerifiedCount,
  });

  const displayCustomerName = localizeDemoCustomerName(project.customerName, lang);
  const displayLocation = localizeDemoLocation(project.location, lang);

  runTable({
    startY: cursorY,
    theme: 'grid',
    stylesFontSize: 7.8,
    headFontSize: 8,
    cellPadding: 2.2,
    colStyles: {
      0: { cellWidth: 32, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { cellWidth: 52 },
      2: { cellWidth: 42, fontStyle: 'bold', textColor: [51, 65, 85] },
      3: { cellWidth: 56 },
    },
    head: pdfTr.sec1Head,
    statusOrigColIndex: 3,
    statusFirstRowOnly: true,
    body: [
      [
        pdfTr.customerName,
        rtlSafeWrap(displayCustomerName),
        pdfTr.overallStatus,
        tr.statuses[summary.overallStatus],
      ],
      [
        pdfTr.projectLocation,
        rtlSafeWrap(displayLocation),
        pdfTr.specMatchPct,
        matchPctLabel,
      ],
      [
        pdfTr.installDate,
        isRtl ? ltr(project.installationDate) : project.installationDate,
        pdfTr.matchMethodology,
        fmt(pdfTr.methodologyDetail, {
          formula: summary.equipmentMatchFormula,
          matched: summary.matchedParameters,
          mismatched: summary.mismatchedParameters,
          warning: summary.warningParameters,
          insufficient: summary.notVerifiedParameters,
        }),
      ],
      [
        pdfTr.systemTopology,
        tr.systemTypes[project.systemType],
        pdfTr.catAndGaps,
        `${catDetailLine}${coverageGapText ? `\n${pdfTr.excludedPrefix} ${coverageGapText}` : ''}`,
      ],
      [
        pdfTr.arrayLayout,
        isRtl ? ltr(arrayLayoutStr) : arrayLayoutStr,
        pdfTr.engChecks,
        fmt(pdfTr.engChecksDetail, {
          passed: summary.passedChecks,
          warning: summary.warningChecks,
          failed: summary.failedChecks,
          insufficient: summary.insufficientDataChecks,
          verified: summary.verifiedPassChecks,
          simulated: summary.simulatedPassChecks,
          unverified: summary.unverifiedPassChecks,
        }),
      ],
    ],
  });

  cursorY = getLastTableY(doc) + 8;

  // Section 2: Promised vs Installed Equipment Comparison
  cursorY = ensureSpace(doc, cursorY, 34);
  drawSectionHeading(pdfTr.sec2Title, cursorY);
  cursorY += 3;

  const compRows: string[][] = [];
  for (const comp of comparisons) {
    if (comp.differences.length === 0) {
      compRows.push([
        comp.label,
        pdfTr.categoryStatusField,
        comp.promisedSummary,
        comp.installedSummary,
        tr.statuses[comp.status],
        comp.missingFields.join(isRtl ? '؛ ' : '; ') || pdfTr.noRecordsEntered,
      ]);
    } else {
      for (const diff of comp.differences) {
        compRows.push([
          comp.label,
          diff.field,
          diff.promised,
          diff.installed,
          tr.statuses[diff.status],
          diff.note,
        ]);
      }
    }
  }

  runTable({
    startY: cursorY,
    theme: 'striped',
    stylesFontSize: 7.2,
    headFontSize: 7.6,
    cellPadding: 1.7,
    colStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22 },
      5: { cellWidth: 46 },
    },
    head: pdfTr.sec2Head,
    statusOrigColIndex: 4,
    body: compRows,
  });

  cursorY = getLastTableY(doc) + 6;

  // Section 3: Equipment Register
  cursorY = ensureSpace(doc, cursorY, 34);
  drawSectionHeading(pdfTr.sec3Title, cursorY);
  cursorY += 3;

  const formatEqSource = (eq: EquipmentSpec): string => {
    const prov = resolveEquipmentProvenance(eq, project.isDemo);
    const simReasons = detectSimulatedMarkers(eq, project.isDemo, lang);
    const base = formatProvenance(prov, lang);
    const extras: string[] = [];
    if (eq.datasheetFileName) {
      extras.push(fmt(pdfTr.datasheetPrefix, { name: ltr(eq.datasheetFileName) }));
    }
    if (simReasons.length > 0 && prov === 'SIMULATED') {
      extras.push(simReasons[0]);
    }
    return extras.length > 0 ? `${base}\n(${extras.join(isRtl ? '؛ ' : '; ')})` : base;
  };

  const naLabel = tr.common.na;
  const fmtEqMfgModel = (eq: EquipmentSpec): string => {
    const mfgRaw = localizeDemoManufacturer(eq.manufacturer, lang);
    const mfgStr = mfgRaw ? rtlSafeWrap(mfgRaw) : naLabel;
    const modStr = eq.model ? rtlSafeWrap(eq.model) : naLabel;
    return `${mfgStr}\n${modStr}`;
  };

  const eqRows: string[][] = [
    ...project.promisedEquipment.map((eq) => [
      pdfTr.promisedType,
      getCategoryLabel(eq.category, lang),
      fmtEqMfgModel(eq),
      eq.quantity !== null ? String(eq.quantity) : naLabel,
      fmtSpecLine(eq, pdfTr, isRtl),
      formatEqSource(eq),
    ]),
    ...project.installedEquipment.map((eq) => [
      pdfTr.installedType,
      getCategoryLabel(eq.category, lang),
      fmtEqMfgModel(eq),
      eq.quantity !== null ? String(eq.quantity) : naLabel,
      fmtSpecLine(eq, pdfTr, isRtl),
      formatEqSource(eq),
    ]),
  ];

  runTable({
    startY: cursorY,
    theme: 'grid',
    stylesFontSize: 7.0,
    headFontSize: 7.6,
    cellPadding: 1.7,
    colStyles: {
      0: { cellWidth: 18, fontStyle: 'bold' },
      1: { cellWidth: 24 },
      2: { cellWidth: 31 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 56 },
      5: { cellWidth: 38 },
    },
    head: pdfTr.sec3Head,
    body: eqRows.length > 0 ? eqRows : [['-', '-', pdfTr.noEquipmentEntered, '-', '-', '-']],
  });

  cursorY = getLastTableY(doc) + 6;

  // Section 4: Independent Engineering Validation & Calculations
  cursorY = ensureSpace(doc, cursorY, 48);
  drawSectionHeading(pdfTr.sec4Title, cursorY);
  cursorY += 4.2;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(51, 65, 85);
  const wrappedLegend = isRtl
    ? prepareRtlLines(doc, pdfTr.sec4Legend, printableWidth)
    : (doc.splitTextToSize(toPdfSafeText(pdfTr.sec4Legend), printableWidth) as string[]);
  const legendLineHeight = isRtl ? 3.8 : 3.3;
  if (isRtl) {
    doc.text(wrappedLegend, pageWidth - 14, cursorY, { align: 'right', ...PDF_RAW_TEXT_OPTIONS });
  } else {
    doc.text(wrappedLegend, 14, cursorY);
  }
  cursorY += wrappedLegend.length * legendLineHeight + 2.5;

  const checkRows = checks.map((c) => {
    const formulaVal = isRtl ? ltr(c.formula) : c.formula;
    const checkAndFormula = `${c.title}\n\n${pdfTr.formulaPrefix}\n${formulaVal}`;
    const outcomeAndConfidence = `${c.qualifiedResult}\n${pdfTr.confidencePrefix}\n${formatInputConfidence(
      c.inputConfidence,
      lang,
    )}`;
    const inputsLines = c.inputs
      .map((i) => {
        const roleLabel =
          i.inputRole === 'EQUIPMENT_SPEC' ? pdfTr.roleEquipSpec : pdfTr.roleConfig;
        const valText = i.value !== null ? `${i.value} ${i.unit}` : tr.common.missing;
        const expr = isRtl
          ? `${ltr(`${i.symbol} =`)} ${i.value !== null ? ltr(valText) : valText}`
          : `${i.symbol} = ${valText}`;
        const provLabel =
          i.provenance === 'MISSING' ? tr.common.missing : tr.provenanceShort[i.provenance];
        return `${expr} [${roleLabel}${isRtl ? '؛' : ';'} ${provLabel}]`;
      })
      .join('\n');
    const resultStr =
      c.calculatedValue !== null
        ? isRtl
          ? ltr(`${c.calculatedValue} ${c.calculatedUnit}`)
          : `${c.calculatedValue} ${c.calculatedUnit}`
        : tr.common.notComputed;
    const limitDisplay = rtlSafeWrap(c.limitValue);
    const inputsAndResult = `${inputsLines}\n\n${pdfTr.resultPrefix} ${resultStr}\n${pdfTr.limitPrefix} ${limitDisplay}`;
    const notesStr =
      c.missingInputs.length > 0
        ? `${pdfTr.blockedByPrefix}\n- ${c.missingInputs.join('\n- ')}\n\n${c.explanation}`
        : c.explanation;
    return [checkAndFormula, outcomeAndConfidence, inputsAndResult, notesStr];
  });

  runTable({
    startY: cursorY,
    theme: 'grid',
    stylesFontSize: 6.9,
    headFontSize: 7.5,
    cellPadding: 1.7,
    colStyles: {
      0: { cellWidth: 39 },
      1: { cellWidth: 39 },
      2: { cellWidth: 57 },
      3: { cellWidth: 47 },
    },
    head: pdfTr.sec4Head,
    statusOrigColIndex: 1,
    body: checkRows,
  });

  cursorY = getLastTableY(doc) + 6;

  // Section 5: Technician Field Measurements
  cursorY = ensureSpace(doc, cursorY, 28);
  drawSectionHeading(pdfTr.sec5Title, cursorY);
  cursorY += 3;

  const measRows = project.fieldMeasurements.map((m) => {
    const paramText = rtlSafeWrap(localizeDemoMeasurementParam(m.parameter, lang));
    const techText = rtlSafeWrap(localizeDemoMeasurementTech(m.technicianName, lang));
    const notesText = m.notes ? rtlSafeWrap(localizeDemoMeasurementNotes(m.notes, lang)) : '-';
    return [
      paramText + (m.isSimulated ? ` ${pdfTr.simulatedTag}` : ''),
      isRtl ? ltr(`${m.value} ${m.unit}`) : `${m.value} ${m.unit}`,
      isRtl ? ltr(m.measuredAt.replace('T', ' ')) : m.measuredAt.replace('T', ' '),
      techText,
      notesText,
    ];
  });

  runTable({
    startY: cursorY,
    theme: 'striped',
    stylesFontSize: 7.2,
    headFontSize: 7.6,
    cellPadding: 1.7,
    colStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 28 },
      3: { cellWidth: 32 },
      4: { cellWidth: 56 },
    },
    head: pdfTr.sec5Head,
    body:
      measRows.length > 0 ? measRows : [[pdfTr.noMeasurementsLogged, '-', '-', '-', '-']],
  });

  cursorY = getLastTableY(doc) + 6;

  // Section 6: Separated Discrepancies, Structured Missing Data & Audit Scope Notice
  cursorY = ensureSpace(doc, cursorY, 36);

  const discrepancyNotes = comparisons
    .filter((c) => c.eligibility === 'ELIGIBLE')
    .flatMap((c) =>
      c.differences
        .filter((d) => d.status === 'MISMATCH' || d.status === 'WARNING')
        .map((d) => `${c.label} - ${d.field} (${tr.statuses[d.status]}): ${d.note}`),
    );

  drawSectionHeading(pdfTr.sec6Title, cursorY);
  cursorY += 4.2;

  const writeSectionParagraph = (text: string, italic = false) => {
    doc.setFont(fontFamily, italic ? 'italic' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const wrapped = isRtl
      ? prepareRtlLines(doc, text, printableWidth)
      : (doc.splitTextToSize(toPdfSafeText(text), printableWidth) as string[]);
    const lineHeight = isRtl ? 3.8 : 3.3;
    cursorY = ensureSpace(doc, cursorY, wrapped.length * lineHeight + 3);
    if (isRtl) {
      doc.text(wrapped, pageWidth - 14, cursorY, { align: 'right', ...PDF_RAW_TEXT_OPTIONS });
    } else {
      doc.text(wrapped, 14, cursorY);
    }
    cursorY += wrapped.length * lineHeight + 2.5;
  };

  if (discrepancyNotes.length > 0) {
    writeSectionParagraph(
      `${fmt(pdfTr.discrepanciesHeading, { count: discrepancyNotes.length })}\n` +
        discrepancyNotes.map((d) => `- ${d}`).join('\n'),
    );
  } else {
    writeSectionParagraph(pdfTr.noDiscrepanciesText);
  }

  // (A) Equipment Record Gaps
  const recordGapLines: string[] = [
    ...missingReport.recordGaps.unquotedInstalled.map((g) => fmt(pdfTr.gapUqItem, { item: g })),
    ...missingReport.recordGaps.missingInstalled.map((g) => fmt(pdfTr.gapMiItem, { item: g })),
    ...missingReport.recordGaps.unverifiedAiRecords.map((g) => fmt(pdfTr.gapUvItem, { item: g })),
  ];
  writeSectionParagraph(
    recordGapLines.length > 0
      ? `${fmt(pdfTr.gapAHeading, { count: recordGapLines.length })}\n` +
          recordGapLines.map((l) => `- ${l}`).join('\n')
      : pdfTr.gapANone,
  );

  // (B) Missing Technical Parameters (Deduplicated & Linked to Blocked Checks)
  const missingParamLines = missingReport.missingParameters.map((mp) =>
    mp.blockedChecks.length > 0
      ? fmt(pdfTr.gapBItemWithBlocks, {
          param: mp.parameter,
          missingOn: mp.missingOn,
          blocks: mp.blockedChecks.join(isRtl ? '؛ ' : '; '),
        })
      : `${mp.parameter} [${mp.missingOn}]`,
  );
  writeSectionParagraph(
    missingParamLines.length > 0
      ? `${fmt(pdfTr.gapBHeading, { count: missingParamLines.length })}\n` +
          missingParamLines.map((l) => `- ${l}`).join('\n')
      : pdfTr.gapBNone,
  );

  // (C) Engineering Checks Blocked by Missing Data
  const blockedCheckLines = missingReport.blockedChecks.map((bc) =>
    fmt(pdfTr.gapCItem, { title: bc.title, inputs: bc.missingInputs.join(isRtl ? '، ' : ', ') }),
  );
  writeSectionParagraph(
    blockedCheckLines.length > 0
      ? `${fmt(pdfTr.gapCHeading, { count: blockedCheckLines.length })}\n` +
          blockedCheckLines.map((l) => `- ${l}`).join('\n')
      : pdfTr.gapCNone,
  );

  if (project.aiAuditCommentary) {
    writeSectionParagraph(`${pdfTr.narrativeHeading}\n${project.aiAuditCommentary}`);
  }

  writeSectionParagraph(pdfTr.scopeNotice, true);

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    drawSingleText(
      fmt(pdfTr.footerText, {
        reportId: isRtl ? ltr(reportId) : reportId,
        page: i,
        total: totalPages,
      }),
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  return { doc, reportId };
}

export function downloadProjectPdfReport(
  project: SolarProject,
  lang: Language = 'en',
): string {
  const { doc, reportId } = buildProjectPdfDocument(project, lang);
  doc.save(`${project.id}_MITHAQ_Audit_Report.pdf`);
  return reportId;
}
