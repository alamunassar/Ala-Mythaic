import type { SolarProject } from '../types/mithaq';

export const DEMO_QUOTATION_TEXT = `CONTRACTUAL SOLAR QUOTATION #QT-2026-8841
Supplier: Horizon Sun Energy Systems
Customer: Al-Noor Commercial Cold Storage (Simulated Demo)
Site: Riyadh Industrial Zone II
System Type: Hybrid (PV + Battery)
Target Commissioning Date: 2026-10-18

BILL OF MATERIALS (PROMISED EQUIPMENT):
1. Solar PV Modules:
   - Manufacturer: Jinko Solar Co., Ltd.
   - Model: JKM580N-72HL4-V (N-Type Mono)
   - Rated Power (Pmax): 580 W
   - Quantity: 16 panels (Total 9.28 kWp)
   - Electrical (STC): Voc = 51.30 V, Vmp = 42.45 V, Isc = 14.37 A, Imp = 13.67 A
   - Voc Temperature Coefficient: -0.25 %/°C

2. Hybrid Solar Inverter:
   - Manufacturer: SunSync Power
   - Model: SH-10000W-48V
   - Rated AC Output Power: 10,000 W
   - Quantity: 1 unit
   - Max PV Input Voltage: 550 V DC
   - MPPT Operating Range: 150 – 425 V DC
   - Max PV Operating Current (Imp): 22 A
   - Max PV Short-Circuit Current (Isc): 26 A
   - Battery Nominal Voltage: 48 V DC (40 – 60 V)

3. Battery Storage Bank:
   - Manufacturer: Pylontech
   - Model: US5000 (LiFePO4)
   - Unit Capacity: 4.8 kWh
   - Quantity: 3 modules (Total 14.4 kWh)
   - Nominal Voltage: 48 V DC`;

export function createDemoProject(): SolarProject {
  return {
    id: 'MTH-DEMO-2026-001',
    customerName: 'Al-Noor Commercial Cold Storage (Simulated Demo)',
    location: 'Riyadh Industrial Zone II',
    installationDate: '2026-10-18',
    systemType: 'Hybrid (PV + Battery)',
    createdAt: '2026-10-18T09:00:00.000Z',
    updatedAt: '2026-10-18T14:30:00.000Z',
    isDemo: true,
    quotationFileName: 'QT-2026-8841_AlNoor_Simulated_Quotation.txt',
    quotationRawText: DEMO_QUOTATION_TEXT,
    promisedEquipment: [
      {
        id: 'demo-prom-pv',
        category: 'PV_MODULE',
        manufacturer: 'Jinko Solar Co., Ltd.',
        model: 'JKM580N-72HL4-V',
        quantity: 16,
        ratedPowerW: 580,
        capacityKwh: null,
        nominalVoltageV: null,
        vocV: 51.3,
        vmpV: 42.45,
        iscA: 14.37,
        impA: 13.67,
        tempCoeffVocPctPerC: -0.25,
        maxPvInputVoltageV: null,
        mpptMinV: null,
        mpptMaxV: null,
        maxPvOperatingCurrentA: null,
        maxPvShortCircuitCurrentA: null,
        minBatteryVoltageV: null,
        maxBatteryVoltageV: null,
        additionalSpecs: 'N-Type TOPCon Bifacial, 9.28 kWp promised array',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'QT-2026-8841_AlNoor_Simulated_Quotation.txt',
        verifiedByUser: false,
      },
      {
        id: 'demo-prom-inv',
        category: 'INVERTER',
        manufacturer: 'SunSync Power',
        model: 'SH-10000W-48V',
        quantity: 1,
        ratedPowerW: 10000,
        capacityKwh: null,
        nominalVoltageV: 48,
        vocV: null,
        vmpV: null,
        iscA: null,
        impA: null,
        tempCoeffVocPctPerC: null,
        maxPvInputVoltageV: 550,
        mpptMinV: 150,
        mpptMaxV: 425,
        maxPvOperatingCurrentA: 22,
        maxPvShortCircuitCurrentA: 26,
        minBatteryVoltageV: 40,
        maxBatteryVoltageV: 60,
        additionalSpecs: '10 kW Hybrid Inverter, IP65 enclosure',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'QT-2026-8841_AlNoor_Simulated_Quotation.txt',
        verifiedByUser: false,
      },
      {
        id: 'demo-prom-batt',
        category: 'BATTERY',
        manufacturer: 'Pylontech',
        model: 'US5000',
        quantity: 3,
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
        additionalSpecs: 'LiFePO4 48V 100Ah rack-mounted modules (14.4 kWh total)',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'QT-2026-8841_AlNoor_Simulated_Quotation.txt',
        verifiedByUser: false,
      },
    ],
    installedEquipment: [
      {
        id: 'demo-inst-pv',
        category: 'PV_MODULE',
        manufacturer: 'Jinko Solar Co., Ltd.',
        model: 'JKM540M-72HL4-V',
        quantity: 16,
        ratedPowerW: 540,
        capacityKwh: null,
        nominalVoltageV: null,
        vocV: 49.42,
        vmpV: 40.7,
        iscA: 13.85,
        impA: 13.27,
        tempCoeffVocPctPerC: null,
        maxPvInputVoltageV: null,
        mpptMinV: null,
        mpptMaxV: null,
        maxPvOperatingCurrentA: null,
        maxPvShortCircuitCurrentA: null,
        minBatteryVoltageV: null,
        maxBatteryVoltageV: null,
        serialNumber: 'JKS22100412345',
        additionalSpecs: 'Max System Voltage 1500V DC, Fuse Rating 25A, Class II',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: ['Voc Temperature Coefficient (not printed on module nameplate)'],
        sourceFileName: 'demo_pv_nameplate_1795536733219.jpg',
        sourceImagePreview: '/src/assets/images/demo_pv_nameplate_1795536733219.jpg',
        verifiedByUser: false,
      },
      {
        id: 'demo-inst-inv',
        category: 'INVERTER',
        manufacturer: 'Unbranded / OEM',
        model: 'SH-8000W-48V',
        quantity: 1,
        ratedPowerW: 8000,
        capacityKwh: null,
        nominalVoltageV: 48,
        vocV: null,
        vmpV: null,
        iscA: null,
        impA: null,
        tempCoeffVocPctPerC: null,
        maxPvInputVoltageV: 500,
        mpptMinV: 125,
        mpptMaxV: 425,
        maxPvOperatingCurrentA: null,
        maxPvShortCircuitCurrentA: 26,
        minBatteryVoltageV: 40,
        maxBatteryVoltageV: 60,
        serialNumber: 'SN2023101509',
        additionalSpecs: '230VAC / 50Hz, Max Output 35A, IP65 Forced Air',
        provenance: 'SIMULATED',
        uncertainFields: ['Manufacturer brand omitted on metallic plate'],
        unreadableFields: ['Max PV Operating Current (Imp limit) not printed on nameplate'],
        sourceFileName: 'demo_inverter_nameplate_1795536733832.jpg',
        sourceImagePreview: '/src/assets/images/demo_inverter_nameplate_1795536733832.jpg',
        verifiedByUser: false,
      },
      {
        id: 'demo-inst-batt',
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
        serialNumber: 'PYL-US5000-8831A / 8832A',
        additionalSpecs: '2 units physically installed in 3-slot rack (9.6 kWh observed)',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        verifiedByUser: false,
      },
    ],
    arrayConfig: {
      modulesPerString: 8,
      parallelStrings: 2,
      minAmbientTempC: 2,
      stcTempC: 25,
      provenance: 'SIMULATED',
    },
    fieldMeasurements: [
      {
        id: 'demo-meas-1',
        parameter: 'Measured PV String 1 Open-Circuit Voltage (Voc)',
        value: 388.4,
        unit: 'V',
        measuredAt: '2026-10-18T11:15',
        technicianName: 'Eng. Tariq Al-Mansoor',
        notes: 'Clear sky, module backsheet 31°C. Matches 8-series JKM540M string within thermal derating.',
        isSimulated: true,
      },
      {
        id: 'demo-meas-2',
        parameter: 'Measured Combined PV Input Current (I_pv)',
        value: 24.9,
        unit: 'A',
        measuredAt: '2026-10-18T12:10',
        technicianName: 'Eng. Tariq Al-Mansoor',
        notes: 'Measured under ~910 W/m² irradiance; approaches inverter 26A input ceiling.',
        isSimulated: true,
      },
      {
        id: 'demo-meas-3',
        parameter: 'Measured Battery Bank DC Voltage',
        value: 51.6,
        unit: 'V',
        measuredAt: '2026-10-18T12:25',
        technicianName: 'Eng. Tariq Al-Mansoor',
        notes: 'Two US5000 battery modules connected in parallel; third rack slot unpopulated.',
        isSimulated: true,
      },
    ],
  };
}

export type DemoScenarioId = 'compliant' | 'mismatch' | 'incomplete';

export interface DemoScenarioDefinition {
  id: DemoScenarioId;
  projectId: string;
  shortTitle: string;
  title: string;
  expectedBadge: string;
  description: string;
}

export const DEMO_SCENARIOS: DemoScenarioDefinition[] = [
  {
    id: 'compliant',
    projectId: 'MTH-DEMO-2026-S1',
    shortTitle: 'Scenario 1: Compliant',
    title: 'Scenario 1 — Compliant Synthetic Installation',
    expectedBadge: 'SIMULATED · MATCH / PASS',
    description:
      'Consistent synthetic promised & installed equipment within inverter electrical limits; all 7 deterministic checks pass.',
  },
  {
    id: 'mismatch',
    projectId: 'MTH-DEMO-2026-001',
    shortTitle: 'Scenario 2: Mismatch & Fail',
    title: 'Scenario 2 — Equipment Mismatch & Engineering Failure',
    expectedBadge: 'SIMULATED · MISMATCH / FAIL',
    description:
      'Contractual equipment downgrades (580W→540W PV, 10kW→8kW OEM inverter, 3→2 batteries) plus array Isc exceeding inverter ceiling.',
  },
  {
    id: 'incomplete',
    projectId: 'MTH-DEMO-2026-S3',
    shortTitle: 'Scenario 3: Incomplete Data',
    title: 'Scenario 3 — Incomplete Data (Missing Specs)',
    expectedBadge: 'SIMULATED · INSUFFICIENT DATA',
    description:
      'Deliberately missing engineering parameters return INSUFFICIENT DATA instead of guessing, ready for manual resolution.',
  },
];

export const DEMO_COMPLIANT_QUOTATION_TEXT = `SIMULATED CONTRACTUAL QUOTATION #QT-SIM-2026-S1
Supplier: Horizon Synthetic Solar Lab (Simulated)
Customer: Al-Waha Logistics Warehouse (Simulated Scenario 1)
Site: Dammam Logistics Park (Simulated)
System Type: Hybrid (PV + Battery)
Target Commissioning Date: 2026-10-20

BILL OF MATERIALS (SYNTHETIC PROMISED EQUIPMENT — SIMULATED):
1. Solar PV Modules:
   - Manufacturer: Horizon Synth PV (Simulated)
   - Model: SYNTH-PV-550M
   - Rated Power (Pmax): 550 W
   - Quantity: 16 panels (Total 8.80 kWp)
   - Electrical (STC): Voc = 49.50 V, Vmp = 41.50 V, Isc = 13.80 A, Imp = 13.25 A
   - Voc Temperature Coefficient: -0.26 %/°C

2. Hybrid Solar Inverter:
   - Manufacturer: Horizon Synth Power (Simulated)
   - Model: SYNTH-HYB-10K48
   - Rated AC Output Power: 10,000 W
   - Quantity: 1 unit
   - Max PV Input Voltage: 600 V DC
   - MPPT Operating Range: 180 – 500 V DC
   - Max PV Operating Current (Imp): 30 A
   - Max PV Short-Circuit Current (Isc): 36 A
   - Battery Nominal Voltage: 48 V DC (42 – 58 V)

3. Battery Storage Bank:
   - Manufacturer: Horizon Synth Energy (Simulated)
   - Model: SYNTH-LFP-48V5K
   - Unit Capacity: 5.0 kWh
   - Quantity: 2 modules (Total 10.0 kWh)
   - Nominal Voltage: 48 V DC`;

export function createCompliantDemoProject(): SolarProject {
  return {
    id: 'MTH-DEMO-2026-S1',
    customerName: 'Al-Waha Logistics Warehouse (Simulated Scenario 1)',
    location: 'Dammam Logistics Park (Simulated)',
    installationDate: '2026-10-20',
    systemType: 'Hybrid (PV + Battery)',
    createdAt: '2026-10-20T08:00:00.000Z',
    updatedAt: '2026-10-20T11:30:00.000Z',
    isDemo: true,
    quotationFileName: 'QT-SIM-2026-S1_Compliant_Simulated.txt',
    quotationRawText: DEMO_COMPLIANT_QUOTATION_TEXT,
    promisedEquipment: [
      {
        id: 'demo-s1-prom-pv',
        category: 'PV_MODULE',
        manufacturer: 'Horizon Synth PV (Simulated)',
        model: 'SYNTH-PV-550M',
        quantity: 16,
        ratedPowerW: 550,
        capacityKwh: null,
        nominalVoltageV: null,
        vocV: 49.5,
        vmpV: 41.5,
        iscA: 13.8,
        impA: 13.25,
        tempCoeffVocPctPerC: -0.26,
        maxPvInputVoltageV: null,
        mpptMinV: null,
        mpptMaxV: null,
        maxPvOperatingCurrentA: null,
        maxPvShortCircuitCurrentA: null,
        minBatteryVoltageV: null,
        maxBatteryVoltageV: null,
        additionalSpecs: 'SIMULATED DATA: Synthetic 550W monocrystalline module for compliant demo',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'QT-SIM-2026-S1_Compliant_Simulated.txt',
        verifiedByUser: false,
      },
      {
        id: 'demo-s1-prom-inv',
        category: 'INVERTER',
        manufacturer: 'Horizon Synth Power (Simulated)',
        model: 'SYNTH-HYB-10K48',
        quantity: 1,
        ratedPowerW: 10000,
        capacityKwh: null,
        nominalVoltageV: 48,
        vocV: null,
        vmpV: null,
        iscA: null,
        impA: null,
        tempCoeffVocPctPerC: null,
        maxPvInputVoltageV: 600,
        mpptMinV: 180,
        mpptMaxV: 500,
        maxPvOperatingCurrentA: 30,
        maxPvShortCircuitCurrentA: 36,
        minBatteryVoltageV: 42,
        maxBatteryVoltageV: 58,
        additionalSpecs: 'SIMULATED DATA: Synthetic 10 kW 48V hybrid inverter',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'QT-SIM-2026-S1_Compliant_Simulated.txt',
        verifiedByUser: false,
      },
      {
        id: 'demo-s1-prom-batt',
        category: 'BATTERY',
        manufacturer: 'Horizon Synth Energy (Simulated)',
        model: 'SYNTH-LFP-48V5K',
        quantity: 2,
        ratedPowerW: null,
        capacityKwh: 5.0,
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
        additionalSpecs: 'SIMULATED DATA: Synthetic 48V 5.0 kWh LFP storage bank (10.0 kWh total)',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'QT-SIM-2026-S1_Compliant_Simulated.txt',
        verifiedByUser: false,
      },
    ],
    installedEquipment: [
      {
        id: 'demo-s1-inst-pv',
        category: 'PV_MODULE',
        manufacturer: 'Horizon Synth PV (Simulated)',
        model: 'SYNTH-PV-550M',
        quantity: 16,
        ratedPowerW: 550,
        capacityKwh: null,
        nominalVoltageV: null,
        vocV: 49.5,
        vmpV: 41.5,
        iscA: 13.8,
        impA: 13.25,
        tempCoeffVocPctPerC: -0.26,
        maxPvInputVoltageV: null,
        mpptMinV: null,
        mpptMaxV: null,
        maxPvOperatingCurrentA: null,
        maxPvShortCircuitCurrentA: null,
        minBatteryVoltageV: null,
        maxBatteryVoltageV: null,
        serialNumber: 'SIM-PV-S1-001..016',
        additionalSpecs: 'SIMULATED DATA: Compliant installed PV module record matching quotation',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'SYNTH_PV_Nameplate_Simulated.json',
        verifiedByUser: false,
      },
      {
        id: 'demo-s1-inst-inv',
        category: 'INVERTER',
        manufacturer: 'Horizon Synth Power (Simulated)',
        model: 'SYNTH-HYB-10K48',
        quantity: 1,
        ratedPowerW: 10000,
        capacityKwh: null,
        nominalVoltageV: 48,
        vocV: null,
        vmpV: null,
        iscA: null,
        impA: null,
        tempCoeffVocPctPerC: null,
        maxPvInputVoltageV: 600,
        mpptMinV: 180,
        mpptMaxV: 500,
        maxPvOperatingCurrentA: 30,
        maxPvShortCircuitCurrentA: 36,
        minBatteryVoltageV: 42,
        maxBatteryVoltageV: 58,
        serialNumber: 'SIM-INV-S1-1001',
        additionalSpecs: 'SIMULATED DATA: Compliant installed inverter matching quotation limits',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'SYNTH_INV_Nameplate_Simulated.json',
        verifiedByUser: false,
      },
      {
        id: 'demo-s1-inst-batt',
        category: 'BATTERY',
        manufacturer: 'Horizon Synth Energy (Simulated)',
        model: 'SYNTH-LFP-48V5K',
        quantity: 2,
        ratedPowerW: null,
        capacityKwh: 5.0,
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
        serialNumber: 'SIM-BAT-S1-2001/2002',
        additionalSpecs: 'SIMULATED DATA: Compliant installed LFP battery modules (10.0 kWh total)',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'SYNTH_BAT_Nameplate_Simulated.json',
        verifiedByUser: false,
      },
    ],
    arrayConfig: {
      modulesPerString: 8,
      parallelStrings: 2,
      minAmbientTempC: 0,
      stcTempC: 25,
      provenance: 'SIMULATED',
    },
    fieldMeasurements: [
      {
        id: 'demo-s1-meas-1',
        parameter: 'Simulated String 1 Open-Circuit Voltage (Voc)',
        value: 392.4,
        unit: 'V',
        measuredAt: '2026-10-20T10:30',
        technicianName: 'Demo Inspector (Simulated)',
        notes: 'Simulated measurement consistent with 8-series SYNTH-PV-550M string.',
        isSimulated: true,
      },
      {
        id: 'demo-s1-meas-2',
        parameter: 'Simulated Combined Array Current (I_pv)',
        value: 25.1,
        unit: 'A',
        measuredAt: '2026-10-20T10:45',
        technicianName: 'Demo Inspector (Simulated)',
        notes: 'Simulated operating current within 30 A inverter operating ceiling.',
        isSimulated: true,
      },
      {
        id: 'demo-s1-meas-3',
        parameter: 'Simulated Battery Bank DC Voltage',
        value: 52.4,
        unit: 'V',
        measuredAt: '2026-10-20T10:55',
        technicianName: 'Demo Inspector (Simulated)',
        notes: 'Simulated resting 48 V LFP bus voltage within [42 V, 58 V].',
        isSimulated: true,
      },
    ],
  };
}

export const DEMO_INCOMPLETE_QUOTATION_TEXT = `SIMULATED CONTRACTUAL QUOTATION #QT-SIM-2026-S3
Supplier: Horizon Synthetic Solar Lab (Simulated)
Customer: Red Sea Cold Chain Depot (Simulated Scenario 3)
Site: Jeddah North Industrial Gate (Simulated)
System Type: Hybrid (PV + Battery)
Target Commissioning Date: 2026-10-22

BILL OF MATERIALS (SYNTHETIC PROMISED EQUIPMENT — SIMULATED):
1. Solar PV Modules:
   - Manufacturer: Horizon Synth PV (Simulated)
   - Model: SYNTH-PV-560M
   - Rated Power (Pmax): 560 W
   - Quantity: 12 panels (Total 6.72 kWp)
   - Electrical (STC): Voc = 50.10 V, Vmp = 42.00 V, Isc = 14.00 A, Imp = 13.33 A
   - Voc Temperature Coefficient: -0.26 %/°C

2. Hybrid Solar Inverter:
   - Manufacturer: Horizon Synth Power (Simulated)
   - Model: SYNTH-HYB-8K48
   - Rated AC Output Power: 8,000 W
   - Quantity: 1 unit
   - Max PV Input Voltage: 750 V DC
   - MPPT Operating Range: 180 – 600 V DC
   - Max PV Operating Current (Imp): 22 A
   - Max PV Short-Circuit Current (Isc): 30 A
   - Battery Nominal Voltage: 48 V DC (40 – 60 V)

3. Battery Storage Bank:
   - Manufacturer: Horizon Synth Energy (Simulated)
   - Model: SYNTH-LFP-48V5K
   - Unit Capacity: 5.0 kWh
   - Quantity: 2 modules (Total 10.0 kWh)
   - Nominal Voltage: 48 V DC`;

export function createIncompleteDemoProject(): SolarProject {
  return {
    id: 'MTH-DEMO-2026-S3',
    customerName: 'Red Sea Cold Chain Depot (Simulated Scenario 3)',
    location: 'Jeddah North Industrial Gate (Simulated)',
    installationDate: '2026-10-22',
    systemType: 'Hybrid (PV + Battery)',
    createdAt: '2026-10-22T09:15:00.000Z',
    updatedAt: '2026-10-22T12:00:00.000Z',
    isDemo: true,
    quotationFileName: 'QT-SIM-2026-S3_Incomplete_Simulated.txt',
    quotationRawText: DEMO_INCOMPLETE_QUOTATION_TEXT,
    promisedEquipment: [
      {
        id: 'demo-s3-prom-pv',
        category: 'PV_MODULE',
        manufacturer: 'Horizon Synth PV (Simulated)',
        model: 'SYNTH-PV-560M',
        quantity: 12,
        ratedPowerW: 560,
        capacityKwh: null,
        nominalVoltageV: null,
        vocV: 50.1,
        vmpV: 42.0,
        iscA: 14.0,
        impA: 13.33,
        tempCoeffVocPctPerC: -0.26,
        maxPvInputVoltageV: null,
        mpptMinV: null,
        mpptMaxV: null,
        maxPvOperatingCurrentA: null,
        maxPvShortCircuitCurrentA: null,
        minBatteryVoltageV: null,
        maxBatteryVoltageV: null,
        additionalSpecs: 'SIMULATED DATA: Synthetic 560W PV quotation reference',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'QT-SIM-2026-S3_Incomplete_Simulated.txt',
        verifiedByUser: false,
      },
      {
        id: 'demo-s3-prom-inv',
        category: 'INVERTER',
        manufacturer: 'Horizon Synth Power (Simulated)',
        model: 'SYNTH-HYB-8K48',
        quantity: 1,
        ratedPowerW: 8000,
        capacityKwh: null,
        nominalVoltageV: 48,
        vocV: null,
        vmpV: null,
        iscA: null,
        impA: null,
        tempCoeffVocPctPerC: null,
        maxPvInputVoltageV: 750,
        mpptMinV: 180,
        mpptMaxV: 600,
        maxPvOperatingCurrentA: 22,
        maxPvShortCircuitCurrentA: 30,
        minBatteryVoltageV: 40,
        maxBatteryVoltageV: 60,
        additionalSpecs: 'SIMULATED DATA: Synthetic 8 kW hybrid inverter quotation reference',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'QT-SIM-2026-S3_Incomplete_Simulated.txt',
        verifiedByUser: false,
      },
      {
        id: 'demo-s3-prom-batt',
        category: 'BATTERY',
        manufacturer: 'Horizon Synth Energy (Simulated)',
        model: 'SYNTH-LFP-48V5K',
        quantity: 2,
        ratedPowerW: null,
        capacityKwh: 5.0,
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
        additionalSpecs: 'SIMULATED DATA: Synthetic 48V 5.0 kWh battery quotation reference',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [],
        sourceFileName: 'QT-SIM-2026-S3_Incomplete_Simulated.txt',
        verifiedByUser: false,
      },
    ],
    installedEquipment: [
      {
        id: 'demo-s3-inst-pv',
        category: 'PV_MODULE',
        manufacturer: 'Horizon Synth PV (Simulated)',
        model: 'SYNTH-PV-560M',
        quantity: 12,
        ratedPowerW: 560,
        capacityKwh: null,
        nominalVoltageV: null,
        vocV: 50.1,
        vmpV: 42.0,
        iscA: 14.0,
        impA: 13.33,
        tempCoeffVocPctPerC: null,
        maxPvInputVoltageV: null,
        mpptMinV: null,
        mpptMaxV: null,
        maxPvOperatingCurrentA: null,
        maxPvShortCircuitCurrentA: null,
        minBatteryVoltageV: null,
        maxBatteryVoltageV: null,
        serialNumber: 'SIM-PV-S3-001..012',
        additionalSpecs: 'SIMULATED DATA: Nameplate lacks Voc temperature coefficient (β_Voc)',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: ['Temp. Coefficient of Voc'],
        sourceFileName: 'SYNTH_PV_Partial_Nameplate_Simulated.jpg',
        verifiedByUser: false,
      },
      {
        id: 'demo-s3-inst-inv',
        category: 'INVERTER',
        manufacturer: 'Horizon Synth Power (Simulated)',
        model: 'SYNTH-HYB-8K48',
        quantity: 1,
        ratedPowerW: 8000,
        capacityKwh: null,
        nominalVoltageV: 48,
        vocV: null,
        vmpV: null,
        iscA: null,
        impA: null,
        tempCoeffVocPctPerC: null,
        maxPvInputVoltageV: null,
        mpptMinV: null,
        mpptMaxV: 600,
        maxPvOperatingCurrentA: null,
        maxPvShortCircuitCurrentA: 30,
        minBatteryVoltageV: 40,
        maxBatteryVoltageV: 60,
        serialNumber: 'SIM-INV-S3-8001',
        additionalSpecs:
          'SIMULATED DATA: Scuffed plate obscured Vdc_max, MPPT min voltage, and Imp limit',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: [
          'Maximum PV Input Voltage',
          'MPPT Minimum Voltage',
          'Maximum PV Operating Current',
        ],
        sourceFileName: 'SYNTH_INV_Partial_Nameplate_Simulated.jpg',
        verifiedByUser: false,
      },
      {
        id: 'demo-s3-inst-batt',
        category: 'BATTERY',
        manufacturer: 'Horizon Synth Energy (Simulated)',
        model: 'SYNTH-LFP-48V5K',
        quantity: 2,
        ratedPowerW: null,
        capacityKwh: 5.0,
        nominalVoltageV: null,
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
        serialNumber: 'SIM-BAT-S3-5001/5002',
        additionalSpecs: 'SIMULATED DATA: Battery rack sticker missing nominal voltage rating',
        provenance: 'SIMULATED',
        uncertainFields: [],
        unreadableFields: ['Nominal Voltage'],
        sourceFileName: 'SYNTH_BAT_Partial_Nameplate_Simulated.jpg',
        verifiedByUser: false,
      },
    ],
    arrayConfig: {
      modulesPerString: 12,
      parallelStrings: 1,
      minAmbientTempC: null,
      stcTempC: 25,
      provenance: 'SIMULATED',
    },
    fieldMeasurements: [],
  };
}

export function createScenarioProject(scenarioId: DemoScenarioId): SolarProject {
  switch (scenarioId) {
    case 'compliant':
      return createCompliantDemoProject();
    case 'incomplete':
      return createIncompleteDemoProject();
    case 'mismatch':
    default:
      return createDemoProject();
  }
}

export function loadScenarioIntoProjects(
  projects: SolarProject[],
  scenarioId: DemoScenarioId,
): { projects: SolarProject[]; loadedProject: SolarProject } {
  const loadedProject = createScenarioProject(scenarioId);
  const preservedProjects = projects.filter(
    (p) => !(p.isDemo && p.id === loadedProject.id),
  );
  return {
    projects: [loadedProject, ...preservedProjects],
    loadedProject,
  };
}
