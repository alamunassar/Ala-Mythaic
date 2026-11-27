import type {
  ComparisonStatus,
  DataProvenance,
  EngineeringCheckStatus,
  EquipmentCategory,
  InputConfidenceLevel,
  OverallAuditStatus,
  SystemType,
} from '../types/mithaq';

export type Language = 'en' | 'ar';
export type TextDirection = 'ltr' | 'rtl';

export const LANGUAGE_STORAGE_KEY = 'mithaq_lab_lang_v1';

export function getDirection(lang: Language): TextDirection {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function normalizeLanguage(raw: string | null | undefined): Language {
  return raw === 'en' ? 'en' : 'ar';
}

export function loadLanguage(): Language {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'ar';
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return 'ar';
  }
}

export function saveLanguage(lang: Language): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Simple template formatter replacing {key} placeholders.
 */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_m, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

/**
 * Wraps LTR technical snippets (equations, model codes, units, numbers) with Unicode LRE/PDF
 * when embedding inside Arabic RTL strings so PDF BiDi & DOM rendering keep token order intact.
 */
export function ltr(text: string | number): string {
  return `\u202A${text}\u202C`;
}

export interface TranslationDictionary {
  meta: {
    title: string;
    brand: string;
    subtitle: string;
    sloganTitle: string;
    slogan: string;
  };
  langSwitcher: {
    ariaLabel: string;
    enLabel: string;
    arLabel: string;
  };
  nav: {
    dashboard: string;
    projects: string;
    newInspection: string;
    comparison: string;
    validation: string;
    measurements: string;
    reports: string;
    settings: string;
    openMenu: string;
    closeMenu: string;
    primaryNav: string;
  };
  header: {
    activeProjectAria: string;
    exportPdf: string;
  };
  common: {
    none: string;
    missing: string;
    notComputed: string;
    incomplete: string;
    units: string;
    cancel: string;
    edit: string;
    delete: string;
    open: string;
    active: string;
    simBadge: string;
    simDataBannerTitle: string;
    simDataBannerDemoTitle: string;
    simDataBannerBody: string;
    createRealProject: string;
    preserved: string;
    notReadable: string;
    verificationBoundaryTitle: string;
    verificationBoundaryBody: string;
    yes: string;
    no: string;
  };
  scenarios: {
    sidebarTitle: string;
    sectionTitle: string;
    sectionSubtitle: string;
    resetOpenBtn: string;
    loadBtn: string;
    items: Record<
      'compliant' | 'mismatch' | 'incomplete',
      {
        shortTitle: string;
        title: string;
        expectedBadge: string;
        description: string;
      }
    >;
  };
  categories: Record<EquipmentCategory, string>;
  systemTypes: Record<SystemType, string>;
  statuses: Record<
    ComparisonStatus | EngineeringCheckStatus | OverallAuditStatus,
    string
  >;
  inputConfidence: Record<InputConfidenceLevel, string>;
  provenanceShort: Record<DataProvenance, string>;
  provenanceFull: Record<DataProvenance, string>;
  provenanceSourceTag: {
    simulatedEquipment: string;
    datasheetVerified: string;
    userVerified: string;
    aiExtracted: string;
    manualEntry: string;
    simulatedArray: string;
    arrayInput: string;
    missing: string;
  };
  specFields: {
    manufacturer: string;
    model: string;
    ratedPowerW: string;
    ratedPowerWInverter: string;
    ratedPowerWBattery: string;
    vocV: string;
    vmpV: string;
    iscA: string;
    impA: string;
    tempCoeffVocPctPerC: string;
    nominalVoltageVInverter: string;
    nominalVoltageVBattery: string;
    minBatteryVoltageVInverter: string;
    maxBatteryVoltageVInverter: string;
    minBatteryVoltageVBattery: string;
    maxBatteryVoltageVBattery: string;
    maxPvInputVoltageV: string;
    maxPvOperatingCurrentA: string;
    maxPvShortCircuitCurrentA: string;
    mpptMinV: string;
    mpptMaxV: string;
    capacityKwh: string;
    serialNumber: string;
    additionalSpecsPv: string;
    additionalSpecsInverter: string;
    additionalSpecsBattery: string;
  };
  dashboard: {
    installedPrefix: string;
    exportPdfReport: string;
    pdfGeneratedNotice: string;
    kpiSpecMatchTitle: string;
    kpiSpecMatchSub: string;
    kpiSpecMatchZero: string;
    kpiSpecMatchBreakdown: string;
    kpiExcludedSuffix: string;
    kpiDiscrepanciesTitle: string;
    kpiDiscrepanciesCategorySub: string;
    kpiDiscrepanciesParamLine: string;
    kpiDiscrepanciesCategoryLine: string;
    kpiEngChecksTitle: string;
    kpiEngChecksBreakdown: string;
    kpiEngChecksPassConfidence: string;
    kpiEngChecksSimDisclaimer: string;
    kpiFieldMeasTitle: string;
    kpiFieldMeasManual: string;
    kpiFieldMeasBreakdown: string;
    compSummaryTitle: string;
    fullMatrix: string;
    promisedLabel: string;
    installedLabel: string;
    editInInspection: string;
    openInspection: string;
    envelopeTitle: string;
    allCalculations: string;
    voltageProfileLabel: string;
    vdcMaxLabel: string;
    vdcMaxMissing: string;
    missingPrefix: string;
    limitPrefix: string;
    envelopeLegend: string;
    limitExceededAlert: string;
    aiSummaryTitle: string;
    aiSummarySubtitle: string;
    aiSummarizeBtn: string;
    aiSummarizingBtn: string;
    aiEmptyHint: string;
    aiNetworkError: string;
    aiServerError: string;
  };
  projects: {
    stepTitle: string;
    stepSubtitle: string;
    validationRequiredError: string;
    customerLabel: string;
    customerPlaceholder: string;
    locationLabel: string;
    locationPlaceholder: string;
    dateLabel: string;
    systemTypeLabel: string;
    createBtn: string;
    registerTitle: string;
    registerSubtitle: string;
    restoreDemoBtn: string;
    colProjectId: string;
    colCustomerLocation: string;
    colTopology: string;
    colDate: string;
    colAuditStatus: string;
    colActions: string;
    simulatedDemoBadge: string;
    deleteProjectAria: string;
  };
  inspection: {
    step1Title: string;
    projectIdPrefix: string;
    demoTag: string;
    simDataTag: string;
    customerName: string;
    location: string;
    installDate: string;
    systemType: string;
    step2Title: string;
    step2Subtitle: string;
    addPromisedManual: string;
    uploadQuoteLabel: string;
    selectedFile: string;
    currentFile: string;
    noFileSelected: string;
    chooseFile: string;
    analyzingQuote: string;
    extractQuoteBtn: string;
    insertSampleQuote: string;
    quoteTextLabel: string;
    quoteTextPlaceholder: string;
    extractionUncertaintyTitle: string;
    colCategory: string;
    colMfgModel: string;
    colQty: string;
    colKeyRatings: string;
    colVerification: string;
    colActions: string;
    noPromisedEmpty: string;
    missingMfg: string;
    missingModel: string;
    warningPrefix: string;
    removePromisedAria: string;
    step3Title: string;
    step3Subtitle: string;
    addNameplateManual: string;
    equipCategoryLabel: string;
    pvNameplateOpt: string;
    invNameplateOpt: string;
    battNameplateOpt: string;
    observedCountLabel: string;
    readingNameplate: string;
    uploadNameplateBtn: string;
    testAiSampleBtn: string;
    noInstalledEmpty: string;
    simEquipCardLabel: string;
    manualEntryCardLabel: string;
    simWarningTitle: string;
    simWarningSuffix: string;
    unknownMfg: string;
    modelPrefix: string;
    qtyPrefix: string;
    snPrefix: string;
    otherSpecsLabel: string;
    datasheetLinkedLabel: string;
    missingOnLabel: string;
    missingLabelHint: string;
    hideOrigAi: string;
    viewOrigAi: string;
    reviewCorrectBtn: string;
    datasheetBtn: string;
    deleteInstalledAria: string;
    proceedStep4: string;
    quoteUnavailableErr: string;
    quoteNoItemsWarn: string;
    quoteNetworkErr: string;
    nameplateVisionErr: string;
    nameplateReadSuccess: string;
    nameplateProcessErr: string;
    fileReadErr: string;
    sampleImgErr: string;
    sampleLoadErr: string;
    quoteProtectedNotice: string;
    quoteExtractedNotice: string;
    nameplateProtectedNotice: string;
    verifiedQuoteProtectedTitle: string;
    verifiedQuoteProtectedBody: string;
    verifiedNameplateProtectedTitle: string;
    verifiedNameplateProtectedBody: string;
    keepVerifiedBtn: string;
    fillMissingBtn: string;
    replaceWithAiBtn: string;
    conflictMatchQuote: string;
    conflictMatchNameplate: string;
    conflictVerifiedVsAi: string;
  };
  modal: {
    reviewEdit: string;
    add: string;
    promisedTitle: string;
    installedTitle: string;
    subtitle: string;
    closeAria: string;
    simDetectedTitle: string;
    simDetectedBody: string;
    uncertainFieldsLabel: string;
    missingUnreadableLabel: string;
    manualOrDatasheetHint: string;
    origAiTitle: string;
    categoryLabel: string;
    photoLabel: string;
    readAtLabel: string;
    aiNotesLabel: string;
    uploadDatasheetToggle: string;
    datasheetIntro: string;
    chooseDatasheetFile: string;
    extractingDatasheet: string;
    extractDatasheetBtn: string;
    datasheetTextPlaceholder: string;
    quantityLabel: string;
    quantityPlaceholder: string;
    mfgLabel: string;
    mfgPlaceholder: string;
    modelLabel: string;
    modelPlaceholder: string;
    pvSectionTitle: string;
    invSectionTitle: string;
    battSectionTitle: string;
    serialLabel: string;
    notesLabel: string;
    verifyDisabledSim: string;
    verifyCheckboxLabel: string;
    saveBtn: string;
    datasheetFailedErr: string;
    datasheetSupplemented: string;
    datasheetNoNewFields: string;
    datasheetReadErr: string;
    pastedDatasheetText: string;
  };
  comparison: {
    stepTitle: string;
    stepSubtitle: string;
    engValidationBtn: string;
    specMatchTitle: string;
    eligibleSummary: string;
    noEligibleSummary: string;
    paramBreakdownTitle: string;
    paramLine1: string;
    paramLine2: string;
    categoriesLine: string;
    excludedGapsTitle: string;
    installedNoQuote: string;
    promisedNotInstalled: string;
    neutralityNotice: string;
    excludedBadge: string;
    promisedLabel: string;
    installedLabel: string;
    colComparedSpec: string;
    colPromised: string;
    colObserved: string;
    colStatus: string;
    colAuditNote: string;
    emptyCategoryRow: string;
    missingUnverifiedPrefix: string;
    structuredMissingTitle: string;
    sectionATitle: string;
    sectionAEmpty: string;
    installedWithoutQuoteItem: string;
    promisedNotDocItem: string;
    unverifiedRecordItem: string;
    sectionBTitle: string;
    sectionBEmpty: string;
    blocksPrefix: string;
    sectionCTitle: string;
    sectionCEmpty: string;
    needsPrefix: string;
  };
  validation: {
    stepTitle: string;
    stepSubtitle: string;
    deterministicBadge: string;
    nsLabel: string;
    npLabel: string;
    tminLabel: string;
    legendTitle: string;
    legendBody: string;
    formulaLabel: string;
    qualifiedLabel: string;
    confidenceInlineLabel: string;
    tracedInputsTitle: string;
    colParameter: string;
    colSymbol: string;
    colValue: string;
    colInputRole: string;
    colProvenance: string;
    roleEquipSpec: string;
    roleArrayConfig: string;
    calcResultLabel: string;
    missingInputsLabel: string;
  };
  measurements: {
    stepTitle: string;
    stepSubtitle: string;
    telemetryBadge: string;
    calcRefLabel: string;
    paramLabel: string;
    valueLabel: string;
    unitAria: string;
    dateTimeLabel: string;
    techNameLabel: string;
    techNamePlaceholder: string;
    notesLabel: string;
    notesPlaceholder: string;
    logBtn: string;
    errInvalidValue: string;
    errTechRequired: string;
    tableTitle: string;
    colParam: string;
    colReading: string;
    colSourceType: string;
    colTimestamp: string;
    colTechnician: string;
    colNotes: string;
    colAction: string;
    emptyRow: string;
    simulatedReading: string;
    manualEntry: string;
    deleteAria: string;
    presets: { label: string; unit: string }[];
  };
  reports: {
    stepTitle: string;
    stepSubtitle: string;
    downloadBtn: string;
    downloadedSuccess: string;
    previewLabel: string;
    simBanner: string;
    sectionsTitle: string;
    sectionsList: string[];
    snapshotTitle: string;
    snapMatchPct: string;
    snapEligibleCats: string;
    snapMatchedParams: string;
    snapMismatchedParams: string;
    snapWarnInsuffParams: string;
    snapUnquotedUndocCats: string;
    snapCatDiscrepancies: string;
    snapPassedChecks: string;
    snapFailedChecks: string;
    snapInsufficientChecks: string;
    snapFieldMeas: string;
    formulaPrefix: string;
  };
  settings: {
    title: string;
    subtitle: string;
    aiCardTitle: string;
    checkingServer: string;
    aiActive: string;
    aiInactive: string;
    aiOfflineNote: string;
    backupCardTitle: string;
    exportJsonBtn: string;
    importJsonBtn: string;
    restoreDemoBtn: string;
    exportedMsg: string;
    importedMsg: string;
    invalidBackupMsg: string;
    parseFailMsg: string;
    demoRestoredMsg: string;
    governanceTitle: string;
    governanceBody: string;
  };
  pdf: {
    platformSubtitle: string;
    slogan: string;
    reportIdLabel: string;
    generatedLabel: string;
    projectIdLabel: string;
    simBannerTitle: string;
    simBannerDemoDesc: string;
    simBannerMarkerDesc: string;
    sec1Title: string;
    sec1Head: [string, string, string, string];
    customerName: string;
    projectLocation: string;
    installDate: string;
    systemTopology: string;
    arrayLayout: string;
    overallStatus: string;
    specMatchPct: string;
    matchMethodology: string;
    catAndGaps: string;
    engChecks: string;
    matchPctEligibleLabel: string;
    matchPctNaLabel: string;
    installedWithoutQuote: string;
    promisedNotDoc: string;
    excludedPrefix: string;
    methodologyDetail: string;
    catSummaryDetail: string;
    engChecksDetail: string;
    sec2Title: string;
    sec2Head: [string, string, string, string, string, string];
    categoryStatusField: string;
    noRecordsEntered: string;
    sec3Title: string;
    sec3Head: [string, string, string, string, string, string];
    promisedType: string;
    installedType: string;
    noEquipmentEntered: string;
    datasheetPrefix: string;
    noRatingsRecorded: string;
    sec4Title: string;
    sec4Legend: string;
    sec4Head: [string, string, string, string];
    formulaPrefix: string;
    confidencePrefix: string;
    roleEquipSpec: string;
    roleConfig: string;
    resultPrefix: string;
    limitPrefix: string;
    blockedByPrefix: string;
    sec5Title: string;
    sec5Head: [string, string, string, string, string];
    simulatedTag: string;
    noMeasurementsLogged: string;
    sec6Title: string;
    discrepanciesHeading: string;
    noDiscrepanciesText: string;
    gapAHeading: string;
    gapANone: string;
    gapUqItem: string;
    gapMiItem: string;
    gapUvItem: string;
    gapBHeading: string;
    gapBNone: string;
    gapBItemWithBlocks: string;
    gapCHeading: string;
    gapCNone: string;
    gapCItem: string;
    narrativeHeading: string;
    scopeNotice: string;
    footerText: string;
  };
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  en: {
    meta: {
      title: 'MITHAQ-Lab — Solar Installation Verification & Engineering Audit',
      brand: 'MITHAQ-Lab',
      subtitle: 'Solar Verification & Audit',
      sloganTitle: 'Audit Principle',
      slogan: 'What Was Promised vs. What Was Installed vs. What Was Verified.',
    },
    langSwitcher: {
      ariaLabel: 'Interface and report language',
      enLabel: 'EN — English',
      arLabel: 'AR — العربية',
    },
    nav: {
      dashboard: 'Dashboard',
      projects: 'Projects',
      newInspection: 'New Inspection',
      comparison: 'Equipment Comparison',
      validation: 'Engineering Validation',
      measurements: 'Field Measurements',
      reports: 'Reports',
      settings: 'Settings',
      openMenu: 'Open menu',
      closeMenu: 'Close navigation',
      primaryNav: 'Primary Navigation',
    },
    header: {
      activeProjectAria: 'Active Solar Project',
      exportPdf: 'Export PDF',
    },
    common: {
      none: 'None',
      missing: 'MISSING',
      notComputed: 'Not Computed',
      incomplete: 'Incomplete',
      units: 'units',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      open: 'Open',
      active: 'Active',
      simBadge: 'SIMULATED',
      simDataBannerTitle: 'DEMONSTRATION / SIMULATED DATA DETECTED:',
      simDataBannerDemoTitle: 'Simulated Demonstration Project Active:',
      simDataBannerBody:
        'Records shown for {customer} include synthetic or prototype data and must not be treated as verified real-world field equipment.',
      createRealProject: 'Create Real Project',
      preserved: 'Preserved',
      notReadable: 'Not readable',
      verificationBoundaryTitle: 'Verification Boundary:',
      verificationBoundaryBody:
        'A PASS result confirms only that the entered equipment ratings and array configuration mathematically satisfy the stated limit checks. Verified manufacturer ratings and PASS outcomes do not certify electrical safety, installation workmanship, local electrical code compliance, or replace a licensed professional inspection.',
      yes: 'Yes',
      no: 'No',
    },
    scenarios: {
      sidebarTitle: 'Demo Scenarios',
      sectionTitle: 'Demonstration Scenarios (SIMULATED)',
      sectionSubtitle:
        'Load or reset any repeatable synthetic demonstration scenario without affecting your custom audit projects.',
      resetOpenBtn: 'Reset & Open Scenario',
      loadBtn: 'Load Scenario',
      items: {
        compliant: {
          shortTitle: 'S1: Compliant (PASS)',
          title: 'Scenario 1 — Compliant Synthetic Installation',
          expectedBadge: 'VERIFIED MATCH / 7 PASS',
          description:
            'Matching promised vs. installed synthetic specs; all 7 deterministic engineering checks PASS within MPPT, Voc, current, and battery voltage limits.',
        },
        mismatch: {
          shortTitle: 'S2: Mismatch & FAIL',
          title: 'Scenario 2 — Equipment Mismatch & Engineering Failure',
          expectedBadge: 'ACTION REQUIRED / MISMATCH & FAIL',
          description:
            'Installed 540 W PV & 8 kW inverter differ from 580 W & 10 kW quote; parallel Isc (28.06 A) exceeds 26 A limit and Imp limit is missing.',
        },
        incomplete: {
          shortTitle: 'S3: Incomplete Data',
          title: 'Scenario 3 — Incomplete Data (Missing Critical Specs)',
          expectedBadge: 'INCOMPLETE DATA / 6 BLOCKED',
          description:
            'Missing PV β_Voc, inverter Vdc_max / MPPT_min / Ipv_op_max, battery Vnom, and site T_min return INSUFFICIENT DATA cleanly without assumptions.',
        },
      },
    },
    categories: {
      PV_MODULE: 'Solar PV Modules',
      INVERTER: 'Inverter',
      BATTERY: 'Battery Storage',
    },
    systemTypes: {
      'Hybrid (PV + Battery)': 'Hybrid (PV + Battery)',
      'Grid-Tied': 'Grid-Tied',
      'Off-Grid': 'Off-Grid',
    },
    statuses: {
      MATCH: 'MATCH',
      MISMATCH: 'MISMATCH',
      WARNING: 'WARNING',
      'NOT VERIFIED': 'NOT VERIFIED',
      PASS: 'PASS',
      FAIL: 'FAIL',
      'INSUFFICIENT DATA': 'INSUFFICIENT DATA',
      'VERIFIED MATCH': 'VERIFIED MATCH',
      'DISCREPANCIES FOUND': 'DISCREPANCIES FOUND',
      'ACTION REQUIRED': 'ACTION REQUIRED',
      'INCOMPLETE DATA': 'INCOMPLETE DATA',
    },
    inputConfidence: {
      VERIFIED_INPUTS: 'VERIFIED INPUTS',
      SIMULATED_INPUTS: 'SIMULATED INPUTS',
      UNVERIFIED_INPUTS: 'UNVERIFIED INPUTS',
      INCOMPLETE_INPUTS: 'INCOMPLETE INPUTS',
    },
    provenanceShort: {
      AI_EXTRACTED: 'AI_EXTRACTED',
      USER_VERIFIED: 'USER_VERIFIED',
      MANUAL_ENTRY: 'MANUAL_ENTRY',
      DATASHEET_VERIFIED: 'DATASHEET_VERIFIED',
      SIMULATED: 'SIMULATED',
    },
    provenanceFull: {
      AI_EXTRACTED: 'AI_EXTRACTED (Unverified AI Read)',
      USER_VERIFIED: 'USER_VERIFIED (Reviewed Against Source)',
      MANUAL_ENTRY: 'MANUAL_ENTRY (Unverified Manual Input)',
      DATASHEET_VERIFIED: 'DATASHEET_VERIFIED (Manufacturer Datasheet)',
      SIMULATED: 'SIMULATED (Demo / Prototype Only)',
    },
    provenanceSourceTag: {
      simulatedEquipment: 'SIMULATED (Demo/Prototype Record)',
      datasheetVerified: 'DATASHEET_VERIFIED',
      userVerified: 'USER_VERIFIED (Nameplate/Source Confirmed)',
      aiExtracted: 'AI_EXTRACTED (Unverified AI Read)',
      manualEntry: 'MANUAL_ENTRY (Unverified Manual Input)',
      simulatedArray: 'SIMULATED (Demo Array Config)',
      arrayInput: 'Array Topology Input',
      missing: 'Missing',
    },
    specFields: {
      manufacturer: 'Manufacturer',
      model: 'Model',
      ratedPowerW: 'Rated Power (Pmax)',
      ratedPowerWInverter: 'Rated Power',
      ratedPowerWBattery: 'Rated Power (optional)',
      vocV: 'Open-Circuit Voltage (Voc)',
      vmpV: 'Max Power Voltage (Vmp)',
      iscA: 'Short-Circuit Current (Isc)',
      impA: 'Max Power Current (Imp)',
      tempCoeffVocPctPerC: 'Temp. Coefficient of Voc',
      nominalVoltageVInverter: 'Nominal Battery Voltage',
      nominalVoltageVBattery: 'Nominal Voltage',
      minBatteryVoltageVInverter: 'Minimum Battery Voltage',
      maxBatteryVoltageVInverter: 'Maximum Battery Voltage',
      minBatteryVoltageVBattery: 'Minimum Operating Voltage',
      maxBatteryVoltageVBattery: 'Maximum Operating Voltage',
      maxPvInputVoltageV: 'Maximum PV Input Voltage',
      maxPvOperatingCurrentA: 'Maximum PV Operating Current',
      maxPvShortCircuitCurrentA: 'Maximum PV Short-Circuit Current',
      mpptMinV: 'MPPT Minimum Voltage',
      mpptMaxV: 'MPPT Maximum Voltage',
      capacityKwh: 'Capacity',
      serialNumber: 'Serial Number',
      additionalSpecsPv: 'Additional Module Specs',
      additionalSpecsInverter: 'Additional Inverter Specs',
      additionalSpecsBattery: 'Additional Battery Specs',
    },
    dashboard: {
      installedPrefix: 'Installed',
      exportPdfReport: 'Export PDF Report',
      pdfGeneratedNotice: 'Generated and downloaded {reportId}.pdf',
      kpiSpecMatchTitle: 'Equipment Spec Match',
      kpiSpecMatchSub: '{matched}/{total} eligible parameters across {cats} category(ies)',
      kpiSpecMatchZero: '0 eligible items',
      kpiSpecMatchBreakdown:
        '{mismatched} mismatched params · {warning} warning · {insufficient} insufficient data',
      kpiExcludedSuffix: ' ({count} excluded category)',
      kpiDiscrepanciesTitle: 'Equipment Discrepancies (Categories)',
      kpiDiscrepanciesCategorySub: 'categories with mismatches',
      kpiDiscrepanciesParamLine:
        '{paramMismatches} individual parameter mismatch(es) across {eligibleCats} eligible category(ies)',
      kpiDiscrepanciesCategoryLine:
        'Categories: {matches} matched · {warnings} warning · {notVerified} unverified',
      kpiEngChecksTitle: 'Engineering Checks',
      kpiEngChecksBreakdown:
        '{passed} passed · {warning} warning · {failed} failed · {insufficient} blocked (insufficient data)',
      kpiEngChecksPassConfidence:
        'PASS inputs: {verified} verified · {simulated} simulated · {unverified} unverified',
      kpiEngChecksSimDisclaimer:
        'Mathematical PASS results using simulated inputs do not represent verified real-world equipment performance.',
      kpiFieldMeasTitle: 'Field Measurements Logged',
      kpiFieldMeasManual: 'Site technician readings',
      kpiFieldMeasBreakdown: '{manual} manual entries · {simulated} simulated demo readings',
      compSummaryTitle: 'Promised vs. Installed Equipment',
      fullMatrix: 'Full Matrix',
      promisedLabel: 'Promised',
      installedLabel: 'Installed',
      editInInspection: 'Edit quotation or nameplate records in New Inspection',
      openInspection: 'Open Inspection',
      envelopeTitle: 'Deterministic Electrical Operating Envelope',
      allCalculations: 'All Calculations',
      voltageProfileLabel: 'String Voltage Profile vs. Inverter Limits',
      vdcMaxLabel: 'Vdc Max: {val} V',
      vdcMaxMissing: 'Inverter Vdc_max Missing',
      missingPrefix: 'Missing: {fields}',
      limitPrefix: '{val} {unit} (Limit: {limit})',
      envelopeLegend:
        'Outcome reflects deterministic limit math; Input Confidence reflects provenance of critical equipment specs (does not certify installation safety or code compliance).',
      limitExceededAlert: 'Engineering Limit Exceeded:',
      aiSummaryTitle: 'Engineering Audit Narrative Summary',
      aiSummarySubtitle:
        'Plain-language explanation generated from verified comparison and deterministic check outcomes.',
      aiSummarizeBtn: 'Summarize Findings with Gemini',
      aiSummarizingBtn: 'Summarizing...',
      aiEmptyHint:
        'Click "Summarize Findings with Gemini" to generate a customer-ready plain language explanation of discrepancies and calculation findings, or export the offline PDF report directly.',
      aiNetworkError:
        'Unable to reach server for AI commentary. Deterministic audit metrics remain active.',
      aiServerError: 'Failed to generate AI audit summary.',
    },
    projects: {
      stepTitle: 'Step 1 — Create Solar Verification Project',
      stepSubtitle:
        'Assign a unique audit ID and initialize customer, location, and topology metadata.',
      validationRequiredError:
        'Customer name, project location, and installation date are required.',
      customerLabel: 'Customer / Facility Name',
      customerPlaceholder: 'e.g. Al-Manar Medical Clinic',
      locationLabel: 'Project Location',
      locationPlaceholder: 'e.g. Amman, District 4',
      dateLabel: 'Installation Date',
      systemTypeLabel: 'System Type',
      createBtn: 'Create Project & Start Inspection',
      registerTitle: 'Verification Projects Register ({count})',
      registerSubtitle: 'Persisted locally in your browser across page reloads.',
      restoreDemoBtn: 'Restore Demo Project',
      colProjectId: 'Project ID',
      colCustomerLocation: 'Customer & Location',
      colTopology: 'Topology',
      colDate: 'Date',
      colAuditStatus: 'Audit Status',
      colActions: 'Actions',
      simulatedDemoBadge: 'Simulated Demo',
      deleteProjectAria: 'Delete project {id}',
    },
    inspection: {
      step1Title: 'Step 1 — Active Project Details',
      projectIdPrefix: 'Project ID:',
      demoTag: 'Simulated Demonstration Project',
      simDataTag: 'Contains Simulated / Prototype Data',
      customerName: 'Customer Name',
      location: 'Location',
      installDate: 'Installation Date',
      systemType: 'System Type',
      step2Title: 'Step 2 — Contractual Quotation Analysis (Promised Equipment)',
      step2Subtitle:
        'Upload a quotation PDF/document or paste quotation text for Gemini extraction, then review and confirm every specification.',
      addPromisedManual: 'Add Promised Equipment Manually',
      uploadQuoteLabel: 'Upload Quotation Document (PDF, Image, TXT, CSV)',
      selectedFile: 'Selected: {name}',
      currentFile: 'Current file: {name}',
      noFileSelected: 'No file selected',
      chooseFile: 'Choose File',
      analyzingQuote: 'Analyzing Quotation...',
      extractQuoteBtn: 'Extract Promised Specs with Gemini',
      insertSampleQuote: 'Insert Sample Quotation Text',
      quoteTextLabel: 'Quotation Text / Line Items (Optional or Paste)',
      quoteTextPlaceholder: 'Paste quotation equipment schedule or bill of materials...',
      extractionUncertaintyTitle: 'Extraction Uncertainty Notes:',
      colCategory: 'Category',
      colMfgModel: 'Manufacturer & Model',
      colQty: 'Qty',
      colKeyRatings: 'Key Ratings',
      colVerification: 'Verification',
      colActions: 'Actions',
      noPromisedEmpty:
        'No promised equipment recorded yet. Extract a quotation or add items manually.',
      missingMfg: 'Missing Mfg',
      missingModel: 'Missing Model',
      warningPrefix: 'Warning:',
      removePromisedAria: 'Remove promised item',
      step3Title: 'Step 3 — Installed Equipment Nameplate Verification (Site Evidence)',
      step3Subtitle:
        'Upload nameplate photographs for Gemini Vision label OCR. Equipment is identified strictly from printed label text, never physical appearance.',
      addNameplateManual: 'Add Nameplate Manually',
      equipCategoryLabel: 'Equipment Category',
      pvNameplateOpt: 'Solar PV Module Nameplate',
      invNameplateOpt: 'Inverter Rating Plate',
      battNameplateOpt: 'Battery Module Label',
      observedCountLabel: 'Observed Physical Unit Count',
      readingNameplate: 'Reading Nameplate...',
      uploadNameplateBtn: 'Upload Nameplate Photo (AI Vision)',
      testAiSampleBtn: 'Test AI on Sample {category} Label',
      noInstalledEmpty:
        'No installed equipment nameplates recorded yet. Upload a nameplate photo or add specs manually.',
      simEquipCardLabel: 'Simulated Equipment Record',
      manualEntryCardLabel: 'Manual Nameplate Entry',
      simWarningTitle: 'Simulated Data Warning:',
      simWarningSuffix: 'Not verified real equipment.',
      unknownMfg: 'Unknown Manufacturer',
      modelPrefix: 'Model:',
      qtyPrefix: 'Qty:',
      snPrefix: 'S/N:',
      otherSpecsLabel: 'Other Specs:',
      datasheetLinkedLabel: 'Datasheet linked:',
      missingOnLabel: 'Missing on {category} label:',
      missingLabelHint: 'Use Review & Correct for manual entry or Upload Datasheet below.',
      hideOrigAi: 'Hide Original AI Read',
      viewOrigAi: 'View Original AI Read',
      reviewCorrectBtn: 'Review & Correct',
      datasheetBtn: 'Datasheet',
      deleteInstalledAria: 'Delete installed equipment',
      proceedStep4: 'Proceed to Step 4: Equipment Comparison',
      quoteUnavailableErr:
        'AI quotation extraction unavailable. Use "Add Promised Equipment Manually" below.',
      quoteNoItemsWarn:
        'No structured solar equipment items were recognized. Add promised equipment manually.',
      quoteNetworkErr: 'Network error during quotation extraction. Use manual entry below.',
      nameplateVisionErr:
        'AI Vision extraction failed. Click "Add Nameplate Manually" to enter label specs.',
      nameplateReadSuccess:
        'Nameplate label read. Original AI output preserved — please review and confirm.',
      nameplateProcessErr: 'Unable to process nameplate photograph.',
      fileReadErr: 'Failed to read image file.',
      sampleImgErr: 'Sample nameplate image failed to load (unexpected non-image response).',
      sampleLoadErr: 'Failed to load sample image.',
      quoteProtectedNotice:
        'Protected verified record(s) preserved ({categories}). Review proposed AI changes below before applying.',
      quoteExtractedNotice:
        'Extracted {count} promised equipment category record(s). Review and confirm values below.',
      nameplateProtectedNotice:
        'Existing verified {category} record was preserved. Review the proposed AI nameplate extraction below before overwriting.',
      verifiedQuoteProtectedTitle:
        'Verified Quotation Records Protected — Review Proposed AI Changes',
      verifiedQuoteProtectedBody:
        'Existing verified or datasheet-backed records were not overwritten. Choose how to apply each extracted item below.',
      verifiedNameplateProtectedTitle:
        'Verified Nameplate Record Protected — Review Proposed AI Extraction',
      verifiedNameplateProtectedBody:
        'The existing verified or datasheet-backed installed record remains intact. Choose whether to keep it, fill missing fields only, or replace it with this AI read.',
      keepVerifiedBtn: 'Keep Verified',
      fillMissingBtn: 'Fill Missing Only',
      replaceWithAiBtn: 'Replace with AI',
      conflictMatchQuote: 'Extracted values match the existing verified record.',
      conflictMatchNameplate: 'Extracted values match the existing verified nameplate record.',
      conflictVerifiedVsAi: 'Verified: {existing} → AI: {proposed}',
    },
    modal: {
      reviewEdit: 'Review & Edit',
      add: 'Add',
      promisedTitle: 'Promised Quotation Equipment',
      installedTitle: 'Installed Nameplate Equipment',
      subtitle: 'Leave blank if unknown. MITHAQ-Lab never assumes missing technical parameters.',
      closeAria: 'Close modal',
      simDetectedTitle:
        'SIMULATED / PROTOTYPE DATA DETECTED — CANNOT BE MARKED AS VERIFIED REAL EQUIPMENT',
      simDetectedBody:
        '{reasons}. This record is locked to SIMULATED provenance.',
      uncertainFieldsLabel: 'Uncertain extraction fields:',
      missingUnreadableLabel: 'Missing / unreadable on {category} nameplate:',
      manualOrDatasheetHint:
        'Enter any verified values manually below or upload the manufacturer datasheet.',
      origAiTitle: 'Original AI Nameplate Extraction (Preserved Read-Only Reference)',
      categoryLabel: 'Category:',
      photoLabel: 'Photo:',
      readAtLabel: 'Read at:',
      aiNotesLabel: 'AI Label Notes:',
      uploadDatasheetToggle: 'Upload Manufacturer Datasheet for Missing Specs (Optional)',
      datasheetIntro:
        'Upload the official {category} datasheet (PDF, image, TXT, CSV) or paste datasheet text to fill only missing specifications without overwriting your original AI nameplate read.',
      chooseDatasheetFile: 'Choose Datasheet File',
      extractingDatasheet: 'Extracting Datasheet...',
      extractDatasheetBtn: 'Extract Missing Specs from Datasheet',
      datasheetTextPlaceholder: 'Or paste datasheet specification table excerpt here...',
      quantityLabel: 'Quantity (Units)',
      quantityPlaceholder: 'e.g. 16',
      mfgLabel: 'Manufacturer',
      mfgPlaceholder: 'e.g. Jinko Solar Co., Ltd.',
      modelLabel: 'Model Designation',
      modelPlaceholder: 'e.g. JKM540M-72HL4-V',
      pvSectionTitle: 'Solar PV Module Electrical Specifications (STC)',
      invSectionTitle: 'Inverter Electrical Limits & Battery Bus',
      battSectionTitle: 'Battery Storage Specifications',
      serialLabel: 'Observed Serial Number (Optional)',
      notesLabel: 'Technical Notes / Additional Markings',
      verifyDisabledSim: 'Verification disabled for simulated/demo data',
      verifyCheckboxLabel:
        'Confirmed against genuine source document or physical nameplate (USER_VERIFIED)',
      saveBtn: 'Save Equipment Record',
      datasheetFailedErr:
        'Datasheet extraction failed. Enter missing specifications manually below.',
      datasheetSupplemented:
        'Supplemented {count} missing field(s) from datasheet: {fields}. Original AI nameplate read remains preserved.',
      datasheetNoNewFields:
        'Datasheet parsed, and all missing fields either were not explicitly listed in the datasheet or are already populated.',
      datasheetReadErr: 'Unable to read datasheet document.',
      pastedDatasheetText: 'Pasted Datasheet Text',
    },
    comparison: {
      stepTitle: 'Step 4 — Promised vs. Installed Equipment Comparison',
      stepSubtitle:
        'Objective parameter-by-parameter comparison between contractual quotation promises and observed site nameplates.',
      engValidationBtn: 'Engineering Validation',
      specMatchTitle: 'Equipment Spec Match %',
      eligibleSummary:
        '{matched}/{total} eligible parameters across {cats} eligible category(ies)',
      noEligibleSummary: 'No eligible promised-vs-installed comparison items',
      paramBreakdownTitle: 'Eligible Parameter Breakdown',
      paramLine1: '{matched} Matching · {mismatched} Mismatching',
      paramLine2: '{warning} Warning · {insufficient} Insufficient Data',
      categoriesLine: 'Categories: {matches} Match · {discrepancies} Mismatch · {warnings} Warning',
      excludedGapsTitle: 'Excluded Coverage Gaps',
      installedNoQuote: 'Installed, absent from quotation:',
      promisedNotInstalled: 'Promised, not documented installed:',
      neutralityNotice:
        'Equipment discrepancies highlight differences between contractual documentation and installed equipment nameplates for engineering review. Missing parameters are reported separately from discrepancies and never counted as matches. Discrepancies alone do not establish supplier fraud.',
      excludedBadge: 'Excluded from Match % ({eligibility})',
      promisedLabel: 'Promised:',
      installedLabel: 'Installed:',
      colComparedSpec: 'Compared Specification',
      colPromised: 'Promised (Quotation)',
      colObserved: 'Observed (Installed Nameplate)',
      colStatus: 'Status',
      colAuditNote: 'Audit Note',
      emptyCategoryRow: 'No quotation or nameplate records entered for this category.',
      missingUnverifiedPrefix: 'Missing / Unverified Information:',
      structuredMissingTitle: 'Structured Missing Data Summary (Separated from Discrepancies)',
      sectionATitle: 'A. Equipment Record Gaps',
      sectionAEmpty: 'No record coverage gaps.',
      installedWithoutQuoteItem: 'Installed without quotation: {item}',
      promisedNotDocItem: 'Promised, not documented: {item}',
      unverifiedRecordItem: 'Unverified record: {item}',
      sectionBTitle: 'B. Missing Technical Parameters ({count})',
      sectionBEmpty: 'All required technical parameters present.',
      blocksPrefix: 'Blocks:',
      sectionCTitle: 'C. Engineering Checks Blocked ({count})',
      sectionCEmpty: 'No engineering checks blocked.',
      needsPrefix: 'Needs:',
    },
    validation: {
      stepTitle: 'Step 5 — Independent Deterministic Engineering Validation',
      stepSubtitle:
        'All calculations run deterministically in TypeScript using observed nameplate inputs. Missing specifications return INSUFFICIENT DATA instead of assumptions.',
      deterministicBadge: 'Deterministic Math Engine',
      nsLabel: 'Modules in Series per String (Ns)',
      npLabel: 'Parallel Strings per MPPT / Input (Np)',
      tminLabel: 'Minimum Site Ambient Temperature (°C)',
      legendTitle: 'Legend: Calculation Outcome vs. Input Confidence',
      legendBody:
        'Calculation Outcome (PASS, WARNING, FAIL, INSUFFICIENT DATA) evaluates mathematical limit compliance deterministically. Input Confidence (VERIFIED INPUTS, SIMULATED INPUTS, UNVERIFIED INPUTS, INCOMPLETE INPUTS) tracks provenance of critical equipment specifications used in the check (array configuration entries do not downgrade verified equipment). Even PASS — VERIFIED INPUTS confirms only rated-limit math and does not certify installation safety or local code compliance.',
      formulaLabel: 'Formula:',
      qualifiedLabel: 'Qualified Classification:',
      confidenceInlineLabel: 'Input Confidence:',
      tracedInputsTitle: 'Traceable Input Parameters',
      colParameter: 'Parameter',
      colSymbol: 'Symbol',
      colValue: 'Value',
      colInputRole: 'Input Role',
      colProvenance: 'Data Provenance',
      roleEquipSpec: 'Critical Equip. Spec',
      roleArrayConfig: 'Array Config',
      calcResultLabel: 'Calculated Result',
      missingInputsLabel: 'Missing Inputs:',
    },
    measurements: {
      stepTitle: 'Step 6 — Technician Field Measurements (Manual Entry)',
      stepSubtitle:
        'Record on-site multimeter or clamp-meter readings. Field measurements are stored separately from calculated STC values and are never synthesized automatically.',
      telemetryBadge: 'Manual Site Telemetry Log',
      calcRefLabel: 'Calculated Reference (STC):',
      paramLabel: 'Measurement Parameter',
      valueLabel: 'Measured Value',
      unitAria: 'Measurement unit',
      dateTimeLabel: 'Measurement Date & Time',
      techNameLabel: 'Technician / Inspector Name',
      techNamePlaceholder: 'e.g. Eng. Sara Al-Khatib',
      notesLabel: 'Inspection Notes & Environmental Conditions',
      notesPlaceholder: 'e.g. Clear sky, irradiance ~890 W/m², Fluke 393FC clamp meter',
      logBtn: 'Log Field Measurement',
      errInvalidValue: 'Enter a valid parameter name and numeric measurement value.',
      errTechRequired: 'Technician or inspector name is required for traceability.',
      tableTitle: 'Recorded Field Measurements ({count})',
      colParam: 'Parameter',
      colReading: 'Measured Reading',
      colSourceType: 'Source Type',
      colTimestamp: 'Timestamp',
      colTechnician: 'Technician',
      colNotes: 'Notes',
      colAction: 'Action',
      emptyRow: 'No field measurements recorded yet. Log your first site measurement above.',
      simulatedReading: 'Simulated Demo Reading',
      manualEntry: 'Manual Field Entry',
      deleteAria: 'Delete field measurement',
      presets: [
        { label: 'Measured PV String 1 Open-Circuit Voltage (Voc)', unit: 'V' },
        { label: 'Measured PV String 2 Open-Circuit Voltage (Voc)', unit: 'V' },
        { label: 'Measured Combined PV Input Current (I_pv)', unit: 'A' },
        { label: 'Measured Battery Bank DC Voltage', unit: 'V' },
        { label: 'Measured AC Output / Grid Voltage', unit: 'V' },
        { label: 'Measured Module Backsheet Temperature', unit: '°C' },
        { label: 'Measured Insulation Resistance', unit: 'MΩ' },
      ],
    },
    reports: {
      stepTitle: 'Step 8 — Professional PDF Engineering Audit Report',
      stepSubtitle:
        'Generates a complete downloadable PDF report offline directly in your browser—no AI or external service required.',
      downloadBtn: 'Download PDF Audit Report',
      downloadedSuccess:
        'PDF Report {reportId} downloaded successfully for project {projectId}.',
      previewLabel: 'REPORT DOSSIER PREVIEW',
      simBanner:
        'Report Header Stamp: DEMONSTRATION / SIMULATED DATA PRESENT — CONTAINS NON-REAL OR PROTOTYPE RECORDS',
      sectionsTitle: 'Included Report Sections',
      sectionsList: [
        '1. Project & Customer Metadata + Unique Report ID',
        '2. Promised vs. Installed Equipment Comparison Matrix',
        '3. Equipment Register with Data Provenance Tags',
        '4. Deterministic Engineering Formulas, Inputs & Results',
        '5. Technician Manual Field Measurements Log',
        '6. Separated Discrepancies, Missing Data & Scope Notice',
      ],
      snapshotTitle: 'Report Metrics Snapshot',
      snapMatchPct: 'Equipment Match %:',
      snapEligibleCats: 'Eligible Categories:',
      snapMatchedParams: 'Matching Parameters:',
      snapMismatchedParams: 'Mismatching Parameters:',
      snapWarnInsuffParams: 'Warning / Insufficient Data Params:',
      snapUnquotedUndocCats: 'Unquoted / Undocumented Cats:',
      snapCatDiscrepancies: 'Categories with Discrepancies:',
      snapPassedChecks: 'Passed Eng. Checks (V / S / U):',
      snapFailedChecks: 'Failed Eng. Checks:',
      snapInsufficientChecks: 'Blocked (Insufficient Data):',
      snapFieldMeas: 'Field Measurements:',
      formulaPrefix: 'Formula:',
    },
    settings: {
      title: 'Platform Settings & Storage Management',
      subtitle:
        'Manage local project archives, demonstration data, and server-side AI extraction readiness.',
      aiCardTitle: 'Server-Side Gemini Document & Vision Extraction',
      checkingServer: 'Checking server configuration...',
      aiActive: 'Server Gemini API key active (used for quotation & nameplate extraction)',
      aiInactive:
        'Gemini API key not configured in environment — manual entry & offline calculation remain fully operational',
      aiOfflineNote:
        'Comparison logic, deterministic engineering calculations, local storage, and PDF report generation operate independently of AI connectivity.',
      backupCardTitle: 'Local Project Data Backup & Demo Reset',
      exportJsonBtn: 'Export Projects JSON',
      importJsonBtn: 'Import Projects JSON',
      restoreDemoBtn: 'Restore Demo Project',
      exportedMsg: 'Exported local project archive as JSON.',
      importedMsg: 'Imported {count} project(s) into local workspace.',
      invalidBackupMsg: 'Invalid MITHAQ-Lab project backup JSON.',
      parseFailMsg: 'Failed to parse JSON backup file.',
      demoRestoredMsg: 'Simulated demonstration project restored.',
      governanceTitle: 'Engineering Governance Principles:',
      governanceBody:
        'MITHAQ-Lab never invents missing manufacturer specifications, never replaces deterministic mathematical formulas with AI estimates, never automatically declares electrical safety, and never accuses suppliers of fraud based on equipment discrepancies.',
    },
    pdf: {
      platformSubtitle: 'Solar Installation Verification & Engineering Audit Platform',
      slogan: 'What Was Promised vs. What Was Installed vs. What Was Verified.',
      reportIdLabel: 'Report ID: {id}',
      generatedLabel: 'Generated: {date}',
      projectIdLabel: 'Project ID: {id}',
      simBannerTitle: 'DEMONSTRATION / SIMULATED DATA - CONTAINS NON-REAL OR PROTOTYPE RECORDS',
      simBannerDemoDesc:
        'This report is generated from synthetic demonstration data and does not represent a verified real customer installation.',
      simBannerMarkerDesc:
        'One or more equipment records, notes, or measurements contain simulated/prototype markers and are not verified real equipment.',
      sec1Title: '1. Project Metadata & Final Verification Summary',
      sec1Head: ['Project Attribute', 'Value', 'Audit Summary Metric', 'Result'],
      customerName: 'Customer Name',
      projectLocation: 'Project Location',
      installDate: 'Installation Date',
      systemTopology: 'System Topology',
      arrayLayout: 'Array Layout',
      overallStatus: 'Overall Verification Status',
      specMatchPct: 'Equipment Spec Match %',
      matchMethodology: 'Match % Methodology',
      catAndGaps: 'Category & Coverage Gaps',
      engChecks: 'Engineering Checks',
      matchPctEligibleLabel:
        '{pct}% ({matched} matched / {total} eligible params across {cats} cat(s))',
      matchPctNaLabel: 'N/A (No eligible promised-vs-installed comparisons)',
      installedWithoutQuote: 'Installed without quote: {cats}',
      promisedNotDoc: 'Promised not documented: {cats}',
      excludedPrefix: 'Excluded:',
      methodologyDetail:
        '{formula}\nMatching: {matched} | Mismatching: {mismatched} | Warning: {warning} | Insufficient Data: {insufficient}',
      catSummaryDetail:
        '{matches} Match | {discrepancies} Mismatch (Categories) | {warnings} Warning | {notVerified} Not Verified',
      engChecksDetail:
        '{passed} Pass | {warning} Warning | {failed} Fail | {insufficient} Blocked (Insufficient Data)\nPASS Input Confidence: {verified} Verified | {simulated} Simulated | {unverified} Unverified',
      sec2Title: '2. Promised vs. Installed Equipment Comparison',
      sec2Head: ['Category', 'Parameter', 'Promised', 'Installed', 'Status', 'Audit Note'],
      categoryStatusField: 'Category Status',
      noRecordsEntered: 'No records entered',
      sec3Title: '3. Equipment Register & Data Provenance',
      sec3Head: ['Type', 'Category', 'Make & Model', 'Qty', 'Technical Ratings', 'Data Provenance'],
      promisedType: 'PROMISED',
      installedType: 'INSTALLED',
      noEquipmentEntered: 'No equipment entered',
      datasheetPrefix: 'Datasheet: {name}',
      noRatingsRecorded: 'No technical ratings recorded',
      sec4Title: '4. Deterministic Engineering Validation & Calculations',
      sec4Legend:
        'Legend — Calculation Outcome (PASS, WARNING, FAIL, INSUFFICIENT DATA) reflects deterministic limit math. Input Confidence (VERIFIED INPUTS, SIMULATED INPUTS, UNVERIFIED INPUTS, INCOMPLETE INPUTS) reflects provenance of critical equipment specs [Equip Spec] (array configuration [Config] does not downgrade verified equipment). Mathematical PASS results using simulated inputs do not reflect verified real-world equipment, and verified PASS outcomes do not certify safety or code compliance.',
      sec4Head: [
        'Engineering Check & Formula',
        'Outcome & Confidence',
        'Traceable Inputs, Role, Provenance & Result',
        'Finding / Missing Information',
      ],
      formulaPrefix: 'Formula:',
      confidencePrefix: 'Confidence:',
      roleEquipSpec: 'Equip Spec',
      roleConfig: 'Config',
      resultPrefix: 'Result:',
      limitPrefix: 'Limit:',
      blockedByPrefix: 'Blocked by Missing Inputs:',
      sec5Title: '5. Technician Field Measurements (Manually Recorded)',
      sec5Head: ['Measured Parameter', 'Value', 'Timestamp', 'Technician', 'Field Notes'],
      simulatedTag: '[SIMULATED]',
      noMeasurementsLogged: 'No technician field measurements logged yet',
      sec6Title: '6. Discrepancies, Structured Missing Data & Audit Scope Notice',
      discrepanciesHeading: 'Confirmed Equipment Discrepancies & Value Warnings ({count}):',
      noDiscrepanciesText:
        'Confirmed Equipment Discrepancies & Value Warnings (0): No confirmed discrepancies across eligible compared parameters.',
      gapAHeading: 'A. Equipment Record Gaps ({count}):',
      gapANone: 'A. Equipment Record Gaps: None.',
      gapUqItem: 'Installed without quotation coverage: {item}',
      gapMiItem: 'Promised in quotation, not documented installed: {item}',
      gapUvItem: 'Unverified record: {item}',
      gapBHeading: 'B. Missing Technical Parameters - Deduplicated ({count}):',
      gapBNone: 'B. Missing Technical Parameters: None.',
      gapBItemWithBlocks: '{param} [{missingOn}] -> Blocks: {blocks}',
      gapCHeading: 'C. Engineering Checks Blocked by Missing Data ({count}):',
      gapCNone: 'C. Engineering Checks Blocked by Missing Data: None.',
      gapCItem: '{title} (Missing: {inputs})',
      narrativeHeading: 'Audit Narrative Summary (Generated from Deterministic Results):',
      scopeNotice:
        'AUDIT SCOPE & LIMITATIONS NOTICE: MITHAQ-Lab compares contractual quotations against observed equipment nameplates and performs deterministic engineering calculations on available manufacturer parameters. A PASS engineering check confirms only mathematical compliance with the entered equipment limits; it does NOT certify electrical safety, installation workmanship, conductor sizing, local electrical code compliance, or replace a licensed professional inspection. Equipment discrepancies do not establish supplier intent or fraud.',
      footerText: 'MITHAQ-Lab Verification Report | {reportId} | Page {page} of {total}',
    },
  },

  ar: {
    meta: {
      title: 'MITHAQ-Lab — منصة التحقق من منظومات الطاقة الشمسية والتدقيق الهندسي',
      brand: 'MITHAQ-Lab',
      subtitle: 'التحقق والتدقيق الهندسي للطاقة الشمسية',
      sloganTitle: 'مبدأ التدقيق',
      slogan: 'ما تم الوعد به في العرض مقابل ما تم تركيبه فعلياً مقابل ما تم التحقق منه هندسياً.',
    },
    langSwitcher: {
      ariaLabel: 'لغة الواجهة والتقرير',
      enLabel: 'EN — English',
      arLabel: 'AR — العربية',
    },
    nav: {
      dashboard: 'لوحة التحكم',
      projects: 'المشاريع',
      newInspection: 'فحص جديد',
      comparison: 'مقارنة المعدات',
      validation: 'التحقق الهندسي',
      measurements: 'القياسات الميدانية',
      reports: 'التقارير',
      settings: 'الإعدادات',
      openMenu: 'فتح القائمة',
      closeMenu: 'إغلاق القائمة',
      primaryNav: 'القائمة الرئيسية',
    },
    header: {
      activeProjectAria: 'مشروع الطاقة الشمسية النشط',
      exportPdf: 'تصدير PDF',
    },
    common: {
      none: 'لا يوجد',
      missing: 'مفقود',
      notComputed: 'غير محسوب',
      incomplete: 'غير مكتمل',
      units: 'وحدة',
      cancel: 'إلغاء',
      edit: 'تعديل',
      delete: 'حذف',
      open: 'فتح',
      active: 'نشط',
      simBadge: 'محاكاة',
      simDataBannerTitle: 'تنبيه وجود بيانات تجريبية / محاكاة:',
      simDataBannerDemoTitle: 'المشروع التجريبي بالمحاكاة نشط:',
      simDataBannerBody:
        'تتضمن السجلات المعروضة للعميل ({customer}) بيانات افتراضية أو نموذجية، ولا يجوز اعتبارها معدات ميدانية فعلية موثقة.',
      createRealProject: 'إنشاء مشروع فعلي',
      preserved: 'محفوظ',
      notReadable: 'غير مقروء',
      verificationBoundaryTitle: 'حدود ونطاق التحقق:',
      verificationBoundaryBody:
        'نتيجة "ناجح" تؤكد رياضياً فقط أن القيم الاسمية المدخلة وتكوين المصفوفة يستوفيان حدود الفحص المذكورة. القيم الموثقة ونتائج النجاح الحسابية لا تمنح شهادة أمان كهربائي أو مطابقة لكود البناء، ولا تغني عن الفحص الميداني لمهندس كهرباء مرخص.',
      yes: 'نعم',
      no: 'لا',
    },
    scenarios: {
      sidebarTitle: 'سيناريوهات تجريبية',
      sectionTitle: 'السيناريوهات التجريبية للمحاكاة (SIMULATED)',
      sectionSubtitle:
        'حمّل أو أعد ضبط أي سيناريو تجريبي افتراضي متكرر دون التأثير على مشاريع التدقيق الخاصة بك.',
      resetOpenBtn: 'إعادة ضبط وفتح السيناريو',
      loadBtn: 'تحميل السيناريو',
      items: {
        compliant: {
          shortTitle: 'س1: مطابق (ناجح)',
          title: 'السيناريو 1 — تركيب افتراضي متطابق ومستوفٍ للحدود',
          expectedBadge: 'تطابق موثق / 7 فحوصات ناجحة',
          description:
            'مواصفات تركيب افتراضية مطابقة تماماً لعرض السعر؛ تنجح كافة الفحوصات الهندسية الـ 7 ضمن حدود MPPT و Voc والتيار وجهد البطارية.',
        },
        mismatch: {
          shortTitle: 'س2: عدم تطابق وفشل',
          title: 'السيناريو 2 — تعارض في المعدات وفشل هندسي',
          expectedBadge: 'إجراء مطلوب / عدم تطابق وفشل',
          description:
            'الألواح المركبة 540 W والعاكس 8 kW تختلف عن العرض (580 W و 10 kW)؛ كما يتجاوز تيار القصر Isc (28.06 A) حد 26 A مع فقدان حد Imp.',
        },
        incomplete: {
          shortTitle: 'س3: بيانات ناقصة',
          title: 'السيناريو 3 — بيانات غير مكتملة (نقص مواصفات حرجة)',
          expectedBadge: 'بيانات غير مكتملة / 6 فحوصات متوقفة',
          description:
            'نقص معامل الحرارة β_Voc وحدود العاكس Vdc_max و MPPT_min و Ipv_op_max والجهد الاسمي للبطارية و T_min يُرجع "بيانات غير كافية" دون افتراضات.',
        },
      },
    },
    categories: {
      PV_MODULE: 'ألواح الطاقة الشمسية (PV)',
      INVERTER: 'العاكس الشمسي (Inverter)',
      BATTERY: 'نظام تخزين البطاريات',
    },
    systemTypes: {
      'Hybrid (PV + Battery)': 'هجين (ألواح + بطاريات)',
      'Grid-Tied': 'مربوط بالشبكة (Grid-Tied)',
      'Off-Grid': 'معزول عن الشبكة (Off-Grid)',
    },
    statuses: {
      MATCH: 'متطابق',
      MISMATCH: 'عدم تطابق',
      WARNING: 'تحذير',
      'NOT VERIFIED': 'غير مؤكد',
      PASS: 'ناجح',
      FAIL: 'فشل',
      'INSUFFICIENT DATA': 'بيانات غير كافية',
      'VERIFIED MATCH': 'تطابق موثق',
      'DISCREPANCIES FOUND': 'توجد فروقات',
      'ACTION REQUIRED': 'إجراء مطلوب',
      'INCOMPLETE DATA': 'بيانات غير مكتملة',
    },
    inputConfidence: {
      VERIFIED_INPUTS: 'مدخلات موثقة',
      SIMULATED_INPUTS: 'مدخلات محاكاة',
      UNVERIFIED_INPUTS: 'مدخلات غير موثقة',
      INCOMPLETE_INPUTS: 'مدخلات غير مكتملة',
    },
    provenanceShort: {
      AI_EXTRACTED: 'استخراج AI',
      USER_VERIFIED: 'مؤكد من المستخدم',
      MANUAL_ENTRY: 'إدخال يدوي',
      DATASHEET_VERIFIED: 'موثق بنشرة فنية',
      SIMULATED: 'بيانات محاكاة',
    },
    provenanceFull: {
      AI_EXTRACTED: 'AI_EXTRACTED (قراءة آلية غير مؤكدة)',
      USER_VERIFIED: 'USER_VERIFIED (مراجع ومؤكد من المصدر)',
      MANUAL_ENTRY: 'MANUAL_ENTRY (إدخال يدوي غير مؤكد)',
      DATASHEET_VERIFIED: 'DATASHEET_VERIFIED (نشرة مواصفات الشركة المصنعة)',
      SIMULATED: 'SIMULATED (بيانات تجريبية / محاكاة فقط)',
    },
    provenanceSourceTag: {
      simulatedEquipment: 'بيانات محاكاة (سجل تجريبي/نموذجي)',
      datasheetVerified: 'موثق بنشرة المواصفات الفنية',
      userVerified: 'مؤكد من المستخدم (لوحة البيانات / المستند)',
      aiExtracted: 'استخراج آلي بالذكاء الاصطناعي (غير مؤكد)',
      manualEntry: 'إدخال يدوي (غير مؤكد)',
      simulatedArray: 'بيانات محاكاة (تكوين مصفوفة تجريبي)',
      arrayInput: 'مدخلات تكوين المصفوفة',
      missing: 'مفقود',
    },
    specFields: {
      manufacturer: 'الشركة المصنعة',
      model: 'الطراز (Model)',
      ratedPowerW: 'القدرة الاسمية (Pmax)',
      ratedPowerWInverter: 'القدرة الاسمية (Rated Power)',
      ratedPowerWBattery: 'القدرة الاسمية (اختياري)',
      vocV: 'جهد الدائرة المفتوحة (Voc)',
      vmpV: 'جهد القدرة القصوى (Vmp)',
      iscA: 'تيار القصر (Isc)',
      impA: 'تيار القدرة القصوى (Imp)',
      tempCoeffVocPctPerC: 'معامل الحرارة لجهد Voc',
      nominalVoltageVInverter: 'الجهد الاسمي للبطارية',
      nominalVoltageVBattery: 'الجهد الاسمي',
      minBatteryVoltageVInverter: 'أدنى جهد للبطارية',
      maxBatteryVoltageVInverter: 'أقصى جهد للبطارية',
      minBatteryVoltageVBattery: 'أدنى جهد تشغيل',
      maxBatteryVoltageVBattery: 'أقصى جهد تشغيل',
      maxPvInputVoltageV: 'أقصى جهد دخل للخلايا (Vdc_max)',
      maxPvOperatingCurrentA: 'أقصى تيار تشغيل للخلايا (Ipv_op_max)',
      maxPvShortCircuitCurrentA: 'أقصى تيار قصر للخلايا (Ipv_sc_max)',
      mpptMinV: 'أدنى جهد لنطاق MPPT',
      mpptMaxV: 'أقصى جهد لنطاق MPPT',
      capacityKwh: 'السعة التخزينية',
      serialNumber: 'الرقم التسلسلي (S/N)',
      additionalSpecsPv: 'مواصفات إضافية للوح الشمسي',
      additionalSpecsInverter: 'مواصفات إضافية للعاكس',
      additionalSpecsBattery: 'مواصفات إضافية للبطارية',
    },
    dashboard: {
      installedPrefix: 'تاريخ التركيب',
      exportPdfReport: 'تصدير تقرير PDF',
      pdfGeneratedNotice: 'تم إنشاء وتنزيل التقرير {reportId}.pdf بنجاح',
      kpiSpecMatchTitle: 'نسبة تطابق مواصفات المعدات',
      kpiSpecMatchSub: '{matched}/{total} معياراً مؤهلاً ضمن {cats} فئة/فئات',
      kpiSpecMatchZero: '0 بنود مؤهلة',
      kpiSpecMatchBreakdown:
        '{mismatched} معيار غير متطابق · {warning} تحذير · {insufficient} بيانات غير كافية',
      kpiExcludedSuffix: ' ({count} فئة مستبعدة)',
      kpiDiscrepanciesTitle: 'تعارضات المعدات (حسب الفئة)',
      kpiDiscrepanciesCategorySub: 'فئة/فئات تحتوي على عدم تطابق',
      kpiDiscrepanciesParamLine:
        '{paramMismatches} تعارضاً على مستوى المعايير الفردية ضمن {eligibleCats} فئة مؤهلة',
      kpiDiscrepanciesCategoryLine:
        'الفئات: {matches} متطابق · {warnings} تحذير · {notVerified} غير مؤكد',
      kpiEngChecksTitle: 'الفحوصات الهندسية الحتمية',
      kpiEngChecksBreakdown:
        '{passed} ناجح · {warning} تحذير · {failed} فشل · {insufficient} متوقف (بيانات غير كافية)',
      kpiEngChecksPassConfidence:
        'مدخلات حالات النجاح: {verified} موثقة · {simulated} محاكاة · {unverified} غير موثقة',
      kpiEngChecksSimDisclaimer:
        'نتائج النجاح الحسابية المعتمدة على مدخلات محاكاة لا تمثل أداءً موثقاً لمعدات فعلية على أرض الواقع.',
      kpiFieldMeasTitle: 'القياسات الميدانية المسجلة',
      kpiFieldMeasManual: 'قراءات الفحص الميداني',
      kpiFieldMeasBreakdown: '{manual} إدخال ميداني يدوي · {simulated} قراءة محاكاة تجريبية',
      compSummaryTitle: 'المعدات الموعودة مقابل المركبة فعلياً',
      fullMatrix: 'المصفوفة الكاملة',
      promisedLabel: 'الموعود',
      installedLabel: 'المركب',
      editInInspection: 'تعديل سجلات العرض أو لوحات البيانات من قسم فحص جديد',
      openInspection: 'فتح الفحص',
      envelopeTitle: 'نطاق التشغيل الكهربائي الحتمي',
      allCalculations: 'كافة الحسابات',
      voltageProfileLabel: 'منحنى جهد السلسلة مقابل حدود العاكس',
      vdcMaxLabel: 'أقصى جهد Vdc: {val} V',
      vdcMaxMissing: 'قيمة Vdc_max للعاكس مفقودة',
      missingPrefix: 'مفقود: {fields}',
      limitPrefix: '{val} {unit} (الحد المسموح: {limit})',
      envelopeLegend:
        'تعكس النتيجة الحسابات الرياضية للحدود؛ بينما تعكس موثوقية المدخلات مصدر المواصفات الحرجة للمعدات (ولا تمنح شهادة أمان أو مطابقة كود).',
      limitExceededAlert: 'تجاوز الحد الهندسي المسموح:',
      aiSummaryTitle: 'الملخص السردي للتدقيق الهندسي',
      aiSummarySubtitle:
        'شرح بلغة واضحة مستند حصرياً إلى نتائج المقارنة والفحوصات الهندسية الحتمية.',
      aiSummarizeBtn: 'تلخيص النتائج عبر Gemini',
      aiSummarizingBtn: 'جارٍ التلخيص...',
      aiEmptyHint:
        'انقر على "تلخيص النتائج عبر Gemini" لإنشاء ملخص واضح للعميل حول الفروقات والحسابات، أو قم بتصدير تقرير PDF مباشرة دون اتصال.',
      aiNetworkError:
        'تعذر الاتصال بالخادم لتوليد الملخص. جميع مقاييس التدقيق الحتمية ما زالت فعالة.',
      aiServerError: 'فشل إنشاء الملخص الهندسي عبر الخادم.',
    },
    projects: {
      stepTitle: 'الخطوة 1 — إنشاء مشروع تحقق لطاقة شمسية',
      stepSubtitle: 'تخصيص معرّف تدقيق فريد وإدخال بيانات العميل والموقع ونوع المنظومة.',
      validationRequiredError: 'اسم العميل وموقع المشروع وتاريخ التركيب حقول مطلوبة.',
      customerLabel: 'اسم العميل / المنشأة',
      customerPlaceholder: 'مثال: عيادة المنار الطبية',
      locationLabel: 'موقع المشروع',
      locationPlaceholder: 'مثال: الرياض، المنطقة الصناعية',
      dateLabel: 'تاريخ التركيب',
      systemTypeLabel: 'نوع المنظومة',
      createBtn: 'إنشاء المشروع وبدء الفحص',
      registerTitle: 'سجل مشاريع التحقق ({count})',
      registerSubtitle: 'محفوظ محلياً في المتصفح عبر إعادة التحميل.',
      restoreDemoBtn: 'استعادة المشروع التجريبي',
      colProjectId: 'معرّف المشروع',
      colCustomerLocation: 'العميل والموقع',
      colTopology: 'نوع المنظومة',
      colDate: 'التاريخ',
      colAuditStatus: 'حالة التدقيق',
      colActions: 'الإجراءات',
      simulatedDemoBadge: 'محاكاة تجريبية',
      deleteProjectAria: 'حذف المشروع {id}',
    },
    inspection: {
      step1Title: 'الخطوة 1 — تفاصيل المشروع النشط',
      projectIdPrefix: 'معرّف المشروع:',
      demoTag: 'مشروع تجريبي بالمحاكاة',
      simDataTag: 'يحتوي على بيانات محاكاة / نموذجية',
      customerName: 'اسم العميل',
      location: 'الموقع',
      installDate: 'تاريخ التركيب',
      systemType: 'نوع المنظومة',
      step2Title: 'الخطوة 2 — تحليل عرض السعر التعاقدي (المعدات الموعودة)',
      step2Subtitle:
        'ارفع ملف عرض السعر (PDF أو صورة أو نص) أو الصق نص العرض لاستخراجه عبر Gemini، ثم راجع كافة المواصفات وأكدها.',
      addPromisedManual: 'إضافة معدة موعودة يدوياً',
      uploadQuoteLabel: 'رفع مستند عرض السعر (PDF، صورة، TXT، CSV)',
      selectedFile: 'الملف المختار: {name}',
      currentFile: 'الملف الحالي: {name}',
      noFileSelected: 'لم يتم اختيار ملف',
      chooseFile: 'اختر ملفاً',
      analyzingQuote: 'جارٍ تحليل عرض السعر...',
      extractQuoteBtn: 'استخراج المواصفات الموعودة عبر Gemini',
      insertSampleQuote: 'إدراج نص عرض سعر تجريبي',
      quoteTextLabel: 'نص عرض السعر / بنود المعدات (اختياري أو لصق)',
      quoteTextPlaceholder: 'الصق جدول المعدات أو بنود عرض السعر هنا...',
      extractionUncertaintyTitle: 'ملاحظات عدم اليقين في الاستخراج:',
      colCategory: 'الفئة',
      colMfgModel: 'الشركة المصنعة والطراز',
      colQty: 'الكمية',
      colKeyRatings: 'القيم الاسمية الرئيسية',
      colVerification: 'التوثيق',
      colActions: 'الإجراءات',
      noPromisedEmpty: 'لم يتم تسجيل معدات موعودة بعد. استخرج عرض السعر أو أضف البنود يدوياً.',
      missingMfg: 'شركة مصنعة مفقودة',
      missingModel: 'طراز مفقود',
      warningPrefix: 'تنبيه:',
      removePromisedAria: 'إزالة البند الموعود',
      step3Title: 'الخطوة 3 — التحقق من لوحات بيانات المعدات المركبة (أدلة الموقع)',
      step3Subtitle:
        'ارفع صور لوحات البيانات الاسمية لقراءتها عبر Gemini Vision. يتم التعرف على المعدات من النص المطبوع على اللوحة فقط وليس من الشكل الخارجي.',
      addNameplateManual: 'إضافة لوحة بيانات يدوياً',
      equipCategoryLabel: 'فئة المعدة',
      pvNameplateOpt: 'لوحة بيانات اللوح الشمسي (PV)',
      invNameplateOpt: 'لوحة بيانات العاكس (Inverter)',
      battNameplateOpt: 'ملصق وحدة البطارية',
      observedCountLabel: 'العدد الفعلي المعاين في الموقع',
      readingNameplate: 'جارٍ قراءة لوحة البيانات...',
      uploadNameplateBtn: 'رفع صورة لوحة البيانات (AI Vision)',
      testAiSampleBtn: 'اختبار AI على عينة {category}',
      noInstalledEmpty:
        'لم يتم تسجيل لوحات بيانات للمعدات المركبة بعد. ارفع صورة اللوحة أو أدخل المواصفات يدوياً.',
      simEquipCardLabel: 'سجل معدة تجريبي (محاكاة)',
      manualEntryCardLabel: 'إدخال يدوي للوحة البيانات',
      simWarningTitle: 'تحذير بيانات محاكاة:',
      simWarningSuffix: 'ليست معدة فعلية موثقة.',
      unknownMfg: 'شركة مصنعة غير معروفة',
      modelPrefix: 'الطراز:',
      qtyPrefix: 'الكمية:',
      snPrefix: 'الرقم التسلسلي:',
      otherSpecsLabel: 'مواصفات أخرى:',
      datasheetLinkedLabel: 'النشرة الفنية المرفقة:',
      missingOnLabel: 'مفقود على ملصق {category}:',
      missingLabelHint: 'استخدم "مراجعة وتصحيح" للإدخال اليدوي أو ارفع النشرة الفنية أدناه.',
      hideOrigAi: 'إخفاء قراءة AI الأصلية',
      viewOrigAi: 'عرض قراءة AI الأصلية',
      reviewCorrectBtn: 'مراجعة وتصحيح',
      datasheetBtn: 'النشرة الفنية',
      deleteInstalledAria: 'حذف المعدة المركبة',
      proceedStep4: 'الانتقال إلى الخطوة 4: مقارنة المعدات',
      quoteUnavailableErr:
        'استخراج عرض السعر بالذكاء الاصطناعي غير متاح حالياً. استخدم "إضافة معدة موعودة يدوياً" أدناه.',
      quoteNoItemsWarn:
        'لم يتم التعرف على بنود معدات شمسية مهيكلة. يرجى إضافة المعدات الموعودة يدوياً.',
      quoteNetworkErr: 'خطأ شبكة أثناء تحليل عرض السعر. استخدم الإدخال اليدوي أدناه.',
      nameplateVisionErr:
        'تعذر استخراج لوحة البيانات بالذكاء الاصطناعي. انقر "إضافة لوحة بيانات يدوياً" لإدخال القيم.',
      nameplateReadSuccess:
        'تمت قراءة لوحة البيانات مع حفظ المخرجات الأصلية للذكاء الاصطناعي — يرجى المراجعة والتأكيد.',
      nameplateProcessErr: 'تعذر معالجة صورة لوحة البيانات.',
      fileReadErr: 'تعذر قراءة ملف الصورة.',
      sampleImgErr: 'فشل تحميل صورة العينة (استجابة غير صالحة).',
      sampleLoadErr: 'تعذر تحميل صورة العينة.',
      quoteProtectedNotice:
        'تم الحفاظ على السجلات الموثقة المحمية ({categories}). راجع التغييرات المقترحة أدناه قبل تطبيقها.',
      quoteExtractedNotice:
        'تم استخراج {count} سجل/سجلات لفئات المعدات الموعودة. يرجى مراجعة القيم وتأكيدها أدناه.',
      nameplateProtectedNotice:
        'تم الحفاظ على السجل الموثق الحالي لفئة ({category}). راجع قراءة لوحة البيانات المقترحة أدناه قبل الاستبدال.',
      verifiedQuoteProtectedTitle:
        'السجلات الموثقة لعرض السعر محمية — مراجعة التغييرات المقترحة',
      verifiedQuoteProtectedBody:
        'لم يتم استبدال السجلات المؤكدة أو الموثقة بنشرة فنية تلقائياً. اختر كيفية التعامل مع كل بند مستخرج أدناه.',
      verifiedNameplateProtectedTitle:
        'سجل لوحة البيانات الموثق محمي — مراجعة القراءة الآلية المقترحة',
      verifiedNameplateProtectedBody:
        'لا يزال سجل المعدة المركبة الموثق محفوظاً دون تعديل. اختر الإبقاء عليه، أو ملء الحقول المفقودة فقط، أو استبداله بهذه القراءة.',
      keepVerifiedBtn: 'الإبقاء على الموثق',
      fillMissingBtn: 'ملء المفقود فقط',
      replaceWithAiBtn: 'استبدال بالقراءة الآلية',
      conflictMatchQuote: 'القيم المستخرجة مطابقة للسجل الموثق الحالي.',
      conflictMatchNameplate: 'القيم المستخرجة مطابقة لسجل لوحة البيانات الموثق الحالي.',
      conflictVerifiedVsAi: 'الموثق: {existing} → الآلي: {proposed}',
    },
    modal: {
      reviewEdit: 'مراجعة وتعديل',
      add: 'إضافة',
      promisedTitle: 'معدة موعودة في عرض السعر',
      installedTitle: 'معدة مركبة (لوحة البيانات)',
      subtitle: 'اترك الحقل فارغاً إذا كان غير معروف. لا تفترض MITHAQ-Lab أي مواصفات مفقودة.',
      closeAria: 'إغلاق النافذة',
      simDetectedTitle:
        'تم اكتشاف بيانات محاكاة / نموذجية — لا يمكن وسمها كمعدات فعلية موثقة',
      simDetectedBody: '{reasons}. تم قفل هذا السجل على تصنيف محاكاة (SIMULATED).',
      uncertainFieldsLabel: 'حقول غير مؤكدة في الاستخراج:',
      missingUnreadableLabel: 'حقول مفقودة / غير مقروءة على لوحة {category}:',
      manualOrDatasheetHint:
        'أدخل القيم المؤكدة يدوياً أدناه أو ارفع النشرة الفنية للشركة المصنعة.',
      origAiTitle: 'القراءة الأصلية للذكاء الاصطناعي (مرجع محفوظ للقراءة فقط)',
      categoryLabel: 'الفئة:',
      photoLabel: 'الصورة:',
      readAtLabel: 'وقت القراءة:',
      aiNotesLabel: 'ملاحظات القراءة الآلية:',
      uploadDatasheetToggle: 'رفع النشرة الفنية للمصنع لاستكمال القيم المفقودة (اختياري)',
      datasheetIntro:
        'ارفع النشرة الفنية الرسمية لفئة {category} (PDF أو صورة أو نص) أو الصق نص المواصفات لملء الحقول المفقودة فقط دون استبدال قراءة لوحة البيانات الأصلية.',
      chooseDatasheetFile: 'اختيار ملف النشرة الفنية',
      extractingDatasheet: 'جارٍ استخراج النشرة الفنية...',
      extractDatasheetBtn: 'استخراج القيم المفقودة من النشرة الفنية',
      datasheetTextPlaceholder: 'أو الصق مقتطف جدول المواصفات من النشرة الفنية هنا...',
      quantityLabel: 'الكمية (وحدات)',
      quantityPlaceholder: 'مثال: 16',
      mfgLabel: 'الشركة المصنعة',
      mfgPlaceholder: 'مثال: Jinko Solar Co., Ltd.',
      modelLabel: 'رمز الطراز (Model)',
      modelPlaceholder: 'مثال: JKM540M-72HL4-V',
      pvSectionTitle: 'المواصفات الكهربائية للوح الشمسي (عند ظروف STC)',
      invSectionTitle: 'الحدود الكهربائية للعاكس وناقل البطارية',
      battSectionTitle: 'مواصفات وحدة تخزين البطاريات',
      serialLabel: 'الرقم التسلسلي المعاين (اختياري)',
      notesLabel: 'ملاحظات فنية / علامات إضافية',
      verifyDisabledSim: 'تم تعطيل التأكيد لبيانات المحاكاة / التجريبية',
      verifyCheckboxLabel:
        'تمت المراجعة والمطابقة مع المستند الأصلي أو لوحة البيانات الفعلية (USER_VERIFIED)',
      saveBtn: 'حفظ سجل المعدة',
      datasheetFailedErr:
        'تعذر استخراج النشرة الفنية. يرجى إدخال المواصفات المفقودة يدوياً أدناه.',
      datasheetSupplemented:
        'تم استكمال {count} حقل/حقول مفقودة من النشرة الفنية: {fields}. تم الحفاظ على القراءة الآلية الأصلية.',
      datasheetNoNewFields:
        'تم تحليل النشرة الفنية؛ الحقول المفقودة غير واردة صراحة في المستند أو أنها ممتلئة مسبقاً.',
      datasheetReadErr: 'تعذر قراءة ملف النشرة الفنية.',
      pastedDatasheetText: 'نص النشرة الفنية الملصق',
    },
    comparison: {
      stepTitle: 'الخطوة 4 — مقارنة المعدات الموعودة مقابل المركبة',
      stepSubtitle:
        'مقارنة موضوعية معياراً بمعيار بين بنود العرض التعاقدي ولوحات البيانات المعاينة في الموقع.',
      engValidationBtn: 'التحقق الهندسي',
      specMatchTitle: 'نسبة تطابق مواصفات المعدات',
      eligibleSummary: '{matched}/{total} معياراً مؤهلاً ضمن {cats} فئة مؤهلة',
      noEligibleSummary: 'لا توجد بنود مؤهلة للمقارنة بين الموعود والمركب',
      paramBreakdownTitle: 'تفصيل المعايير المؤهلة',
      paramLine1: '{matched} متطابق · {mismatched} غير متطابق',
      paramLine2: '{warning} تحذير · {insufficient} بيانات غير كافية',
      categoriesLine: 'الفئات: {matches} متطابق · {discrepancies} عدم تطابق · {warnings} تحذير',
      excludedGapsTitle: 'فجوات التغطية المستبعدة من النسبة',
      installedNoQuote: 'مركب بدون تغطية في عرض السعر:',
      promisedNotInstalled: 'موعود ولم يتم توثيق تركيبه:',
      neutralityNotice:
        'تبرز تعارضات المعدات الفروقات بين الوثائق التعاقدية ولوحات المعدات المركبة لأغراض المراجعة الهندسية. يتم فصل القيم المفقودة عن التعارضات ولا تُحسب كتطابق أبداً، كما لا تُعد التعارضات وحدها دليلاً على غش أو سوء نية.',
      excludedBadge: 'مستبعد من نسبة التطابق ({eligibility})',
      promisedLabel: 'الموعود:',
      installedLabel: 'المركب:',
      colComparedSpec: 'المعيار المقارن',
      colPromised: 'الموعود (عرض السعر)',
      colObserved: 'المرصود (لوحة البيانات المركبة)',
      colStatus: 'الحالة',
      colAuditNote: 'ملاحظة التدقيق',
      emptyCategoryRow: 'لم يتم إدخال سجلات عرض سعر أو لوحات بيانات لهذه الفئة.',
      missingUnverifiedPrefix: 'بيانات مفقودة / غير مؤكدة:',
      structuredMissingTitle: 'ملخص البيانات المفقودة المهيكل (منفصل عن التعارضات)',
      sectionATitle: 'أ. فجوات سجلات المعدات',
      sectionAEmpty: 'لا توجد فجوات تغطية في السجلات.',
      installedWithoutQuoteItem: 'مركب بدون عرض سعر: {item}',
      promisedNotDocItem: 'موعود غير موثق: {item}',
      unverifiedRecordItem: 'سجل غير مؤكد: {item}',
      sectionBTitle: 'ب. المعايير الفنية المفقودة ({count})',
      sectionBEmpty: 'جميع المعايير الفنية المطلوبة متوفرة.',
      blocksPrefix: 'يعيق فحص:',
      sectionCTitle: 'ج. الفحوصات الهندسية المتوقفة ({count})',
      sectionCEmpty: 'لا توجد فحوصات هندسية متوقفة.',
      needsPrefix: 'يتطلب:',
    },
    validation: {
      stepTitle: 'الخطوة 5 — التحقق الهندسي الحتمي المستقل',
      stepSubtitle:
        'تُنفذ جميع المعادلات حتمياً بلغة TypeScript بالاعتماد على مدخلات لوحات البيانات. تعيد المعايير المفقودة حالة "بيانات غير كافية" دون أي افتراض.',
      deterministicBadge: 'محرك حسابي حتمي',
      nsLabel: 'عدد الألواح على التوالي في السلسلة (Ns)',
      npLabel: 'عدد السلاسل على التوازي لكل مدخل MPPT (Np)',
      tminLabel: 'أدنى درجة حرارة محيطة في الموقع (°C)',
      legendTitle: 'دليل القراءة: نتيجة الحساب مقابل موثوقية المدخلات',
      legendBody:
        'نتيجة الحساب (ناجح، تحذير، فشل، بيانات غير كافية) تقيس الالتزام الرياضي بالحدود المحددة. بينما تتبع موثوقية المدخلات (مدخلات موثقة، مدخلات محاكاة، مدخلات غير موثقة، مدخلات غير مكتملة) مصدر المواصفات الحرجة للمعدات (مدخلات تكوين المصفوفة لا تخفض تصنيف المعدات الموثقة). حتى حالة "ناجح — مدخلات موثقة" تؤكد الحسابات الاسمية فقط ولا تعني اعتماد الأمان الكهربائي أو مطابقة الكود.',
      formulaLabel: 'المعادلة:',
      qualifiedLabel: 'التصنيف المركب:',
      confidenceInlineLabel: 'موثوقية المدخلات:',
      tracedInputsTitle: 'معاملات الإدخال المتتبعة',
      colParameter: 'المعامل',
      colSymbol: 'الرمز',
      colValue: 'القيمة',
      colInputRole: 'دور المدخل',
      colProvenance: 'مصدر البيانات (Provenance)',
      roleEquipSpec: 'مواصفة معدة حرجة',
      roleArrayConfig: 'تكوين المصفوفة',
      calcResultLabel: 'النتيجة المحسوبة',
      missingInputsLabel: 'مدخلات مفقودة:',
    },
    measurements: {
      stepTitle: 'الخطوة 6 — القياسات الميدانية للفني (إدخال يدوي)',
      stepSubtitle:
        'سجل قراءات جهاز القياس المتعدد أو الكلامب ميتر في الموقع. تُحفظ القياسات الميدانية بشكل منفصل عن قيم STC المحسوبة ولا يتم توليدها آلياً أبداً.',
      telemetryBadge: 'سجل القياس الميداني اليدوي',
      calcRefLabel: 'المرجع المحسوب (STC):',
      paramLabel: 'معامل القياس',
      valueLabel: 'القيمة المقاسة',
      unitAria: 'وحدة القياس',
      dateTimeLabel: 'تاريخ ووقت القياس',
      techNameLabel: 'اسم الفني / المفتش',
      techNamePlaceholder: 'مثال: م. سارة الخطيب',
      notesLabel: 'ملاحظات الفحص والظروف البيئية',
      notesPlaceholder: 'مثال: سماء صافية، إشعاع ~890 W/m²، جهاز Fluke 393FC',
      logBtn: 'تسجيل القياس الميداني',
      errInvalidValue: 'يرجى إدخال اسم معامل صالح وقيمة قياس رقمية.',
      errTechRequired: 'اسم الفني أو المفتش مطلوب لضمان تتبع السجل.',
      tableTitle: 'القياسات الميدانية المسجلة ({count})',
      colParam: 'المعامل',
      colReading: 'القراءة المقاسة',
      colSourceType: 'نوع المصدر',
      colTimestamp: 'الوقت والتاريخ',
      colTechnician: 'الفني',
      colNotes: 'الملاحظات',
      colAction: 'إجراء',
      emptyRow: 'لم يتم تسجيل قياسات ميدانية بعد. أضف أول قراءة ميدانية أعلاه.',
      simulatedReading: 'قراءة محاكاة تجريبية',
      manualEntry: 'إدخال ميداني يدوي',
      deleteAria: 'حذف القياس الميداني',
      presets: [
        { label: 'جهد الدائرة المفتوحة المقاس للسلسلة 1 (Voc)', unit: 'V' },
        { label: 'جهد الدائرة المفتوحة المقاس للسلسلة 2 (Voc)', unit: 'V' },
        { label: 'التيار الكلي المقاس لمدخل الخلايا (I_pv)', unit: 'A' },
        { label: 'جهد DC المقاس لبنك البطاريات', unit: 'V' },
        { label: 'جهد الخرج المتردد / الشبكة المقاس (AC)', unit: 'V' },
        { label: 'درجة حرارة السطح الخلفي للوح الشمسي', unit: '°C' },
        { label: 'مقاومة العزل المقاسة', unit: 'MΩ' },
      ],
    },
    reports: {
      stepTitle: 'الخطوة 8 — تقرير التدقيق الهندسي بصيغة PDF',
      stepSubtitle:
        'يُنشئ تقريراً احترافياً كاملاً قابلاً للتنزيل مباشرة في المتصفح دون اتصال أو خدمة خارجية.',
      downloadBtn: 'تنزيل تقرير التدقيق PDF',
      downloadedSuccess:
        'تم تنزيل تقرير التدقيق {reportId} بنجاح للمشروع {projectId}.',
      previewLabel: 'معاينة ملف التقرير',
      simBanner:
        'ختم التقرير: توجد بيانات محاكاة / تجريبية — يتضمن سجلات افتراضية غير فعلية',
      sectionsTitle: 'الأقسام المشمولة في التقرير',
      sectionsList: [
        '1. بيانات المشروع والعميل + معرّف التقرير الفريد',
        '2. مصفوفة مقارنة المعدات الموعودة مقابل المركبة',
        '3. سجل المعدات مع وسوم مصدر البيانات (Provenance)',
        '4. المعادلات الهندسية الحتمية والمدخلات والنتائج',
        '5. سجل القياسات الميدانية اليدوية للفني',
        '6. الفروقات والبيانات المفقودة وإشعار نطاق التدقيق',
      ],
      snapshotTitle: 'ملخص مؤشرات التقرير',
      snapMatchPct: 'نسبة تطابق المواصفات:',
      snapEligibleCats: 'الفئات المؤهلة للمقارنة:',
      snapMatchedParams: 'المعايير المتطابقة:',
      snapMismatchedParams: 'المعايير غير المتطابقة:',
      snapWarnInsuffParams: 'معايير التحذير / غير الكافية:',
      snapUnquotedUndocCats: 'فئات غير مسعرة / غير موثقة:',
      snapCatDiscrepancies: 'فئات بها تعارضات:',
      snapPassedChecks: 'فحوصات ناجحة (موثق / محاكاة / غير موثق):',
      snapFailedChecks: 'فحوصات فاشلة:',
      snapInsufficientChecks: 'فحوصات متوقفة (نقص بيانات):',
      snapFieldMeas: 'القياسات الميدانية:',
      formulaPrefix: 'المعادلة:',
    },
    settings: {
      title: 'إعدادات المنصة وإدارة التخزين',
      subtitle:
        'إدارة أرشيف المشاريع المحلي، واستعادة البيانات التجريبية، وجاهزية الاستخراج الآلي عبر الخادم.',
      aiCardTitle: 'الاستخراج الآلي للمستندات والصور عبر الخادم (Gemini)',
      checkingServer: 'جارٍ فحص إعدادات الخادم...',
      aiActive: 'مفتاح Gemini API مفعل على الخادم (لاستخراج عروض الأسعار ولوحات البيانات)',
      aiInactive:
        'مفتاح Gemini API غير مضبوط في البيئة — الإدخال اليدوي والحسابات الهندسية تعمل بالكامل دون اتصال',
      aiOfflineNote:
        'تعمل منطق المقارنة والحسابات الهندسية الحتمية والتخزين المحلي وتصدير PDF بشكل مستقل عن الاتصال بالذكاء الاصطناعي.',
      backupCardTitle: 'النسخ الاحتياطي المحلي واستعادة المشروع التجريبي',
      exportJsonBtn: 'تصدير المشاريع JSON',
      importJsonBtn: 'استيراد المشاريع JSON',
      restoreDemoBtn: 'استعادة المشروع التجريبي',
      exportedMsg: 'تم تصدير أرشيف المشاريع المحلي بصيغة JSON.',
      importedMsg: 'تم استيراد {count} مشروع/مشاريع إلى مساحة العمل المحلية.',
      invalidBackupMsg: 'ملف النسخة الاحتياطية JSON غير صالح لـ MITHAQ-Lab.',
      parseFailMsg: 'تعذر قراءة ملف JSON.',
      demoRestoredMsg: 'تمت استعادة المشروع التجريبي بالمحاكاة.',
      governanceTitle: 'مبادئ الحوكمة الهندسية:',
      governanceBody:
        'لا تخترع منصة MITHAQ-Lab مواصفات مصنع مفقودة أبداً، ولا تستبدل المعادلات الرياضية الحتمية بتقديرات ذكاء اصطناعي، ولا تعلن الأمان الكهربائي تلقائياً، ولا تتهم الموردين بالاحتيال بناءً على فروقات المعدات.',
    },
    pdf: {
      platformSubtitle: 'منصة التحقق من منظومات الطاقة الشمسية والتدقيق الهندسي',
      slogan: 'ما تم الوعد به مقابل ما تم تركيبه فعلياً مقابل ما تم التحقق منه.',
      reportIdLabel: 'رقم التقرير: {id}',
      generatedLabel: 'تاريخ الإنشاء: {date}',
      projectIdLabel: 'رقم المشروع: {id}',
      simBannerTitle: 'بيانات تجريبية / محاكاة - يتضمن سجلات غير حقيقية أو نموذجية',
      simBannerDemoDesc:
        'تم إنشاء هذا التقرير من بيانات محاكاة تجريبية ولا يمثل تركيباً فعلياً موثقاً لعميل حقيقي.',
      simBannerMarkerDesc:
        'يحتوي سجل واحد أو أكثر من المعدات أو الملاحظات أو القياسات على مؤشرات محاكاة ولا يمثل معدات فعلية موثقة.',
      sec1Title: '1. بيانات المشروع وملخص التحقق النهائي',
      sec1Head: ['بيانات المشروع', 'القيمة', 'مؤشر ملخص التدقيق', 'النتيجة'],
      customerName: 'اسم العميل',
      projectLocation: 'موقع المشروع',
      installDate: 'تاريخ التركيب',
      systemTopology: 'نوع المنظومة',
      arrayLayout: 'تكوين المصفوفة',
      overallStatus: 'حالة التحقق الإجمالية',
      specMatchPct: 'نسبة تطابق المواصفات',
      matchMethodology: 'منهجية حساب التطابق',
      catAndGaps: 'ملخص الفئات والفجوات',
      engChecks: 'الفحوصات الهندسية',
      matchPctEligibleLabel:
        '{pct}% ({matched} متطابق / {total} معياراً مؤهلاً ضمن {cats} فئة)',
      matchPctNaLabel: 'غير متاح (لا توجد مقارنات مؤهلة)',
      installedWithoutQuote: 'مركب بدون عرض سعر: {cats}',
      promisedNotDoc: 'موعود غير موثق: {cats}',
      excludedPrefix: 'مستبعد:',
      methodologyDetail:
        '{formula}\nمتطابق: {matched} | غير متطابق: {mismatched} | تحذير: {warning} | بيانات غير كافية: {insufficient}',
      catSummaryDetail:
        '{matches} فئة متطابقة | {discrepancies} فئة بها عدم تطابق | {warnings} تحذير | {notVerified} غير مؤكد',
      engChecksDetail:
        '{passed} ناجح | {warning} تحذير | {failed} فشل | {insufficient} متوقف (بيانات غير كافية)\nموثوقية مدخلات النجاح: {verified} موثقة | {simulated} محاكاة | {unverified} غير موثقة',
      sec2Title: '2. مقارنة المعدات الموعودة مقابل المركبة فعلياً',
      sec2Head: ['الفئة', 'المعيار', 'الموعود', 'المركب', 'الحالة', 'ملاحظة التدقيق'],
      categoryStatusField: 'حالة الفئة',
      noRecordsEntered: 'لم يتم إدخال سجلات',
      sec3Title: '3. سجل المعدات وموثوقية المصدر',
      sec3Head: ['النوع', 'الفئة', 'المصنّع والطراز', 'الكمية', 'القيم الاسمية الفنية', 'مصدر البيانات'],
      promisedType: 'موعود',
      installedType: 'مركب',
      noEquipmentEntered: 'لم يتم إدخال معدات',
      datasheetPrefix: 'نشرة فنية: {name}',
      noRatingsRecorded: 'لا توجد قيم فنية مسجلة',
      sec4Title: '4. التحقق الهندسي الحتمي والمعادلات الحسابية',
      sec4Legend:
        'دليل التقرير — نتيجة الحساب (ناجح، تحذير، فشل، بيانات غير كافية) تعكس الحساب الرياضي للحدود. موثوقية المدخلات (مدخلات موثقة، مدخلات محاكاة، مدخلات غير موثقة، مدخلات غير مكتملة) تعكس مصدر مواصفات المعدات الحرجة [مواصفة معدة] (ولا يؤدي تكوين المصفوفة [تكوين] إلى خفض تصنيف المعدات الموثقة). نتائج النجاح المعتمدة على مدخلات محاكاة لا تمثل أداءً موثقاً لمعدات فعلية، ونتائج النجاح الموثقة لا تمنح شهادة أمان كهربائي أو مطابقة كود.',
      sec4Head: [
        'الفحص الهندسي والمعادلة',
        'النتيجة والموثوقية',
        'المدخلات المتتبعة والدور والمصدر والنتيجة',
        'النتيجة التفصيلية / البيانات المفقودة',
      ],
      formulaPrefix: 'المعادلة:',
      confidencePrefix: 'الموثوقية:',
      roleEquipSpec: 'مواصفة معدة',
      roleConfig: 'تكوين',
      resultPrefix: 'النتيجة:',
      limitPrefix: 'الحد المسموح:',
      blockedByPrefix: 'متوقف بسبب نقص المدخلات:',
      sec5Title: '5. القياسات الميدانية للفني (مسجلة يدوياً)',
      sec5Head: ['المعامل المقاس', 'القيمة', 'الوقت والتاريخ', 'الفني', 'الملاحظات الميدانية'],
      simulatedTag: '[محاكاة]',
      noMeasurementsLogged: 'لم يتم تسجيل قياسات ميدانية بعد',
      sec6Title: '6. التعارضات المؤكدة والبيانات المفقودة وإشعار نطاق التدقيق',
      discrepanciesHeading: 'التعارضات المؤكدة وتحذيرات القيم ({count}):',
      noDiscrepanciesText:
        'التعارضات المؤكدة وتحذيرات القيم (0): لا توجد تعارضات مؤكدة ضمن المعايير المؤهلة للمقارنة.',
      gapAHeading: 'أ. فجوات سجلات المعدات ({count}):',
      gapANone: 'أ. فجوات سجلات المعدات: لا توجد.',
      gapUqItem: 'مركب بدون تغطية في عرض السعر: {item}',
      gapMiItem: 'موعود في العرض ولم يوثق تركيبه: {item}',
      gapUvItem: 'سجل غير مؤكد: {item}',
      gapBHeading: 'ب. المعايير الفنية المفقودة - بدون تكرار ({count}):',
      gapBNone: 'ب. المعايير الفنية المفقودة: لا توجد.',
      gapBItemWithBlocks: '{param} [{missingOn}] -> يعيق: {blocks}',
      gapCHeading: 'ج. الفحوصات الهندسية المتوقفة بسبب نقص البيانات ({count}):',
      gapCNone: 'ج. الفحوصات الهندسية المتوقفة: لا توجد.',
      gapCItem: '{title} (المفقود: {inputs})',
      narrativeHeading: 'الملخص السردي للتدقيق (مبني على النتائج الحتمية):',
      scopeNotice:
        'إشعار نطاق وحدود التدقيق: تقارن منصة MITHAQ-Lab بين عروض الأسعار التعاقدية ولوحات البيانات المركبة وتجري حسابات هندسية حتمية على المواصفات المتوفرة. نتيجة النجاح تؤكد التوافق الرياضي مع حدود المعدات المدخلة فقط؛ ولا تمنح شهادة أمان كهربائي أو جودة تركيب أو مطابقة لكود الكهرباء المحلي ولا تغني عن الفحص الهندسي الميداني المرخص. ولا تثبت فروقات المعدات نية الاحتيال.',
      footerText: 'تقرير التحقق MITHAQ-Lab | {reportId} | صفحة {page} من {total}',
    },
  },
};

export function getTranslations(lang: Language): TranslationDictionary {
  return TRANSLATIONS[lang];
}
