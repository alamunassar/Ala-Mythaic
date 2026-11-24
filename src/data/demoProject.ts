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
