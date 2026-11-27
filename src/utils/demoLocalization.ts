import type { Language } from '../i18n/translations';

const DEMO_CUSTOMER_AR: Record<string, string> = {
  'Al-Noor Commercial Cold Storage (Simulated Demo)':
    'مخازن النور التجارية للتبريد (نموذج محاكاة تجريبي)',
  'Al-Waha Logistics Warehouse (Simulated Scenario 1)':
    'مستودع الواحة اللوجستي (السيناريو التجريبي 1 - محاكاة)',
  'Red Sea Cold Chain Depot (Simulated Scenario 3)':
    'مستودع سلسلة التبريد بالبحر الأحمر (السيناريو التجريبي 3 - محاكاة)',
};

const DEMO_LOCATION_AR: Record<string, string> = {
  'Riyadh Industrial Zone II': 'الرياض — المنطقة الصناعية الثانية',
  'Dammam Logistics Park (Simulated)': 'المدينة اللوجستية بالدمام (محاكاة)',
  'Jeddah North Industrial Gate (Simulated)': 'البوابة الصناعية شمال جدة (محاكاة)',
};

const DEMO_MANUFACTURER_AR: Record<string, string> = {
  'Unbranded / OEM': 'بدون علامة تجارية / OEM',
  'Horizon Synth PV (Simulated)': 'Horizon Synth PV (محاكاة)',
  'Horizon Synth Power (Simulated)': 'Horizon Synth Power (محاكاة)',
  'Horizon Synth Energy (Simulated)': 'Horizon Synth Energy (محاكاة)',
};

const DEMO_ADDITIONAL_SPECS_AR: Record<string, string> = {
  'N-Type TOPCon Bifacial, 9.28 kWp promised array':
    'خلايا N-Type TOPCon ثنائية الوجه، مصفوفة موعودة بقدرة 9.28 kWp',
  '10 kW Hybrid Inverter, IP65 enclosure': 'عاكس هجين بقدرة 10 kW، هيكل حماية IP65',
  'LiFePO4 48V 100Ah rack-mounted modules (14.4 kWh total)':
    'وحدات LiFePO4 بجهد 48V وسعة 100Ah مركبة على رف (إجمالي 14.4 kWh)',
  'Max System Voltage 1500V DC, Fuse Rating 25A, Class II':
    'أقصى جهد للنظام 1500V DC، تصنيف المصهر 25A، الفئة Class II',
  '230VAC / 50Hz, Max Output 35A, IP65 Forced Air':
    'خرج 230VAC / 50Hz، أقصى تيار خرج 35A، حماية IP65 وتبريد قسري',
  '2 units physically installed in 3-slot rack (9.6 kWh observed)':
    'تم تركيب وحدتين فعلياً في رف من 3 فتحات (9.6 kWh مرصودة)',
  'SIMULATED DATA: Synthetic 550W monocrystalline module for compliant demo':
    'بيانات محاكاة: لوح أحادي البلورة افتراضي 550W للسيناريو المطابق',
  'SIMULATED DATA: Synthetic 10 kW 48V hybrid inverter':
    'بيانات محاكاة: عاكس هجين افتراضي 10 kW بجهد 48V',
  'SIMULATED DATA: Synthetic 48V 5.0 kWh LFP storage bank (10.0 kWh total)':
    'بيانات محاكاة: بنك بطاريات LFP افتراضي 48V بسعة 5.0 kWh للوحدة (10.0 kWh إجمالاً)',
  'SIMULATED DATA: Compliant installed PV module record matching quotation':
    'بيانات محاكاة: سجل لوح شمسي مركب مطابق لعرض السعر',
  'SIMULATED DATA: Compliant installed inverter matching quotation limits':
    'بيانات محاكاة: عاكس مركب مطابق لحدود عرض السعر',
  'SIMULATED DATA: Compliant installed LFP battery modules (10.0 kWh total)':
    'بيانات محاكاة: وحدات بطارية LFP مركبة مطابقة للعرض (10.0 kWh إجمالاً)',
  'SIMULATED DATA: Synthetic 560W PV quotation reference':
    'بيانات محاكاة: مرجع عرض سعر افتراضي لألواح 560W',
  'SIMULATED DATA: Synthetic 8 kW hybrid inverter quotation reference':
    'بيانات محاكاة: مرجع عرض سعر افتراضي لعاكس هجين 8 kW',
  'SIMULATED DATA: Synthetic 48V 5.0 kWh battery quotation reference':
    'بيانات محاكاة: مرجع عرض سعر افتراضي لبطارية 48V بسعة 5.0 kWh',
  'SIMULATED DATA: Nameplate lacks Voc temperature coefficient (β_Voc)':
    'بيانات محاكاة: لوحة البيانات تفتقد معامل الحرارة (β_Voc)',
  'SIMULATED DATA: Scuffed plate obscured Vdc_max, MPPT min voltage, and Imp limit':
    'بيانات محاكاة: لوحة مخدوشة حجبت Vdc_max وأدنى جهد MPPT وحد تيار Imp',
  'SIMULATED DATA: Battery rack sticker missing nominal voltage rating':
    'بيانات محاكاة: ملصق رف البطاريات يفتقد تصنيف الجهد الاسمي',
};

const DEMO_UNCERTAIN_FIELD_AR: Record<string, string> = {
  'Manufacturer brand omitted on metallic plate':
    'اسم الشركة المصنعة غير مطبوع على اللوحة المعدنية',
};

const DEMO_MEAS_PARAM_AR: Record<string, string> = {
  'Measured PV String 1 Open-Circuit Voltage (Voc)':
    'جهد الدائرة المفتوحة المقاس للسلسلة 1 (Voc)',
  'Measured Combined PV Input Current (I_pv)':
    'التيار الكلي المقاس لمدخل الخلايا (I_pv)',
  'Measured Battery Bank DC Voltage': 'جهد DC المقاس لبنك البطاريات',
  'Simulated String 1 Open-Circuit Voltage (Voc)':
    'جهد الدائرة المفتوحة (محاكاة) للسلسلة 1 (Voc)',
  'Simulated Combined Array Current (I_pv)':
    'التيار الكلي للمصفوفة (محاكاة) (I_pv)',
  'Simulated Battery Bank DC Voltage': 'جهد DC لبنك البطاريات (محاكاة)',
};

const DEMO_MEAS_TECH_AR: Record<string, string> = {
  'Eng. Tariq Al-Mansoor': 'م. طارق المنصور',
  'Demo Inspector (Simulated)': 'مفتش تجريبي (محاكاة)',
};

const DEMO_MEAS_NOTES_AR: Record<string, string> = {
  'Clear sky, module backsheet 31°C. Matches 8-series JKM540M string within thermal derating.':
    'سماء صافية، حرارة ظهر اللوح 31°C؛ متطابق مع سلسلة من 8 ألواح JKM540M ضمن التصحيح الحراري.',
  'Measured under ~910 W/m² irradiance; approaches inverter 26A input ceiling.':
    'قيس عند إشعاع ~910 W/m²؛ يقترب من سقف دخل العاكس البالغ 26A.',
  'Two US5000 battery modules connected in parallel; third rack slot unpopulated.':
    'وحدتا بطارية US5000 متصلتان على التوازي؛ الفتحة الثالثة بالرف فارغة.',
  'Simulated measurement consistent with 8-series SYNTH-PV-550M string.':
    'قياس محاكاة متوافق مع سلسلة من 8 ألواح SYNTH-PV-550M.',
  'Simulated operating current within 30 A inverter operating ceiling.':
    'تيار تشغيل محاكاة يقع ضمن حد التشغيل الأقصى للعاكس البالغ 30 A.',
  'Simulated resting 48 V LFP bus voltage within [42 V, 58 V].':
    'جهد راحة محاكاة لناقل LFP 48 V ضمن النطاق [42 V, 58 V].',
};

export function localizeDemoCustomerName(name: string, lang: Language): string {
  if (lang !== 'ar') return name;
  return DEMO_CUSTOMER_AR[name] ?? name;
}

export function localizeDemoLocation(location: string, lang: Language): string {
  if (lang !== 'ar') return location;
  return DEMO_LOCATION_AR[location] ?? location;
}

export function localizeDemoManufacturer(manufacturer: string | null | undefined, lang: Language): string | null | undefined {
  if (!manufacturer || lang !== 'ar') return manufacturer;
  return DEMO_MANUFACTURER_AR[manufacturer] ?? manufacturer;
}

export function localizeDemoAdditionalSpecs(specs: string | undefined, lang: Language): string | undefined {
  if (!specs || lang !== 'ar') return specs;
  return DEMO_ADDITIONAL_SPECS_AR[specs] ?? specs;
}

export function localizeDemoUncertainField(field: string, lang: Language): string {
  if (lang !== 'ar') return field;
  return DEMO_UNCERTAIN_FIELD_AR[field] ?? field;
}

export function localizeDemoMeasurementParam(param: string, lang: Language): string {
  if (lang !== 'ar') return param;
  return DEMO_MEAS_PARAM_AR[param] ?? param;
}

export function localizeDemoMeasurementTech(tech: string, lang: Language): string {
  if (lang !== 'ar') return tech;
  return DEMO_MEAS_TECH_AR[tech] ?? tech;
}

export function localizeDemoMeasurementNotes(notes: string, lang: Language): string {
  if (lang !== 'ar') return notes;
  return DEMO_MEAS_NOTES_AR[notes] ?? notes;
}
