export type SystemType = 'Grid-Tied' | 'Hybrid (PV + Battery)' | 'Off-Grid';

export type DataProvenance =
  | 'AI_EXTRACTED'
  | 'USER_VERIFIED'
  | 'MANUAL_ENTRY'
  | 'DATASHEET_VERIFIED'
  | 'SIMULATED';

export type EquipmentCategory = 'PV_MODULE' | 'INVERTER' | 'BATTERY';

export interface OriginalAiExtractionSnapshot {
  extractedAt: string;
  category: EquipmentCategory;
  sourceFileName?: string;
  confidenceNotes?: string;
  unreadableFields: string[];
  fields: {
    manufacturer: string | null;
    model: string | null;
    ratedPowerW: number | null;
    capacityKwh: number | null;
    nominalVoltageV: number | null;
    vocV: number | null;
    vmpV: number | null;
    iscA: number | null;
    impA: number | null;
    tempCoeffVocPctPerC: number | null;
    maxPvInputVoltageV: number | null;
    mpptMinV: number | null;
    mpptMaxV: number | null;
    maxPvOperatingCurrentA: number | null;
    maxPvShortCircuitCurrentA: number | null;
    minBatteryVoltageV: number | null;
    maxBatteryVoltageV: number | null;
    serialNumber: string | null;
    additionalSpecs: string | null;
  };
}

export interface EquipmentSpec {
  id: string;
  category: EquipmentCategory;
  manufacturer: string | null;
  model: string | null;
  quantity: number | null;
  ratedPowerW: number | null;
  capacityKwh: number | null;
  nominalVoltageV: number | null;
  vocV: number | null;
  vmpV: number | null;
  iscA: number | null;
  impA: number | null;
  tempCoeffVocPctPerC: number | null;
  maxPvInputVoltageV: number | null;
  mpptMinV: number | null;
  mpptMaxV: number | null;
  maxPvOperatingCurrentA: number | null;
  maxPvShortCircuitCurrentA: number | null;
  /** @deprecated Legacy ambiguous field; kept optional for migration only. */
  maxPvInputCurrentA?: number | null;
  minBatteryVoltageV: number | null;
  maxBatteryVoltageV: number | null;
  serialNumber?: string | null;
  additionalSpecs?: string;
  provenance: DataProvenance;
  fieldProvenance?: Partial<Record<string, DataProvenance>>;
  uncertainFields: string[];
  unreadableFields: string[];
  sourceFileName?: string;
  sourceImagePreview?: string;
  datasheetFileName?: string;
  originalAiExtraction?: OriginalAiExtractionSnapshot;
  verifiedByUser: boolean;
}

export interface ArrayConfiguration {
  modulesPerString: number | null;
  parallelStrings: number | null;
  minAmbientTempC: number | null;
  stcTempC: number;
  provenance: DataProvenance;
}

export interface FieldMeasurement {
  id: string;
  parameter: string;
  value: number;
  unit: string;
  measuredAt: string;
  technicianName: string;
  notes: string;
  isSimulated?: boolean;
}

export type ComparisonStatus = 'MATCH' | 'MISMATCH' | 'WARNING' | 'NOT VERIFIED';

export type ComparisonEligibility =
  | 'ELIGIBLE'
  | 'UNQUOTED_INSTALLED'
  | 'MISSING_INSTALLED'
  | 'NO_RECORDS';

export interface ComparisonDifference {
  field: string;
  promised: string;
  installed: string;
  status: ComparisonStatus;
  note: string;
}

export interface EquipmentComparisonResult {
  category: EquipmentCategory;
  label: string;
  eligibility: ComparisonEligibility;
  status: ComparisonStatus;
  promisedSummary: string;
  installedSummary: string;
  differences: ComparisonDifference[];
  missingFields: string[];
}

export type EngineeringCheckStatus = 'PASS' | 'WARNING' | 'FAIL' | 'INSUFFICIENT DATA';

export type InputConfidenceLevel =
  | 'VERIFIED_INPUTS'
  | 'SIMULATED_INPUTS'
  | 'UNVERIFIED_INPUTS'
  | 'INCOMPLETE_INPUTS';

export type EngineeringInputRole = 'EQUIPMENT_SPEC' | 'CONFIGURATION';

export interface EngineeringInputTrace {
  label: string;
  symbol: string;
  value: number | null;
  unit: string;
  source: string;
  inputRole: EngineeringInputRole;
  provenance: DataProvenance | 'MISSING';
}

export interface EngineeringCheckResult {
  id: string;
  title: string;
  category: 'PV_STRING' | 'THERMAL_VOC' | 'MPPT' | 'CURRENT' | 'POWER_RATIO' | 'BATTERY';
  status: EngineeringCheckStatus;
  inputConfidence: InputConfidenceLevel;
  qualifiedResult: string;
  formula: string;
  inputs: EngineeringInputTrace[];
  calculatedValue: number | null;
  calculatedUnit: string;
  limitLabel: string;
  limitValue: string;
  missingInputs: string[];
  explanation: string;
}

export type OverallAuditStatus =
  | 'VERIFIED MATCH'
  | 'DISCREPANCIES FOUND'
  | 'ACTION REQUIRED'
  | 'INCOMPLETE DATA';

export interface AuditSummary {
  overallStatus: OverallAuditStatus;
  equipmentMatchPct: number | null;
  equipmentMatchFormula: string;
  eligibleCategories: number;
  unquotedInstalledCategories: string[];
  missingInstalledCategories: string[];
  matchedParameters: number;
  mismatchedParameters: number;
  warningParameters: number;
  notVerifiedParameters: number;
  totalComparedParameters: number;
  confirmedMatches: number;
  discrepancies: number;
  warnings: number;
  notVerifiedCount: number;
  passedChecks: number;
  verifiedPassChecks: number;
  simulatedPassChecks: number;
  unverifiedPassChecks: number;
  warningChecks: number;
  failedChecks: number;
  insufficientDataChecks: number;
}

export interface MissingParameterEntry {
  key: string;
  parameter: string;
  categoryLabel: string;
  missingOn: string;
  blockedChecks: string[];
}

export interface MissingDataReport {
  recordGaps: {
    unquotedInstalled: string[];
    missingInstalled: string[];
    unverifiedAiRecords: string[];
  };
  missingParameters: MissingParameterEntry[];
  blockedChecks: {
    checkId: string;
    title: string;
    missingInputs: string[];
  }[];
}

export interface SolarProject {
  id: string;
  customerName: string;
  location: string;
  installationDate: string;
  systemType: SystemType;
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
  quotationFileName?: string;
  quotationRawText?: string;
  promisedEquipment: EquipmentSpec[];
  installedEquipment: EquipmentSpec[];
  arrayConfig: ArrayConfiguration;
  fieldMeasurements: FieldMeasurement[];
  aiAuditCommentary?: string;
}

export type AppSection =
  | 'dashboard'
  | 'projects'
  | 'new-inspection'
  | 'comparison'
  | 'validation'
  | 'measurements'
  | 'reports'
  | 'settings';
