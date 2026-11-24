import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  FileUp,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { DEMO_QUOTATION_TEXT } from '../data/demoProject';
import {
  CATEGORY_LABELS,
  detectSimulatedMarkers,
  formatProvenance,
  projectContainsSimulatedData,
  resolveEquipmentProvenance,
} from '../engine/engineeringEngine';
import type {
  AppSection,
  DataProvenance,
  EquipmentCategory,
  EquipmentSpec,
  SolarProject,
  SystemType,
} from '../types/mithaq';
import { safeFetchJson } from '../utils/api';
import {
  CATEGORY_FIELD_DEFINITIONS,
  createOriginalAiSnapshot,
  filterUnreadableFieldsByCategory,
  getMissingCategoryFields,
  sanitizeSpecFieldsByCategory,
} from '../utils/categorySpecs';
import { EquipmentFormModal } from './EquipmentFormModal';

interface InspectionWorkflowViewProps {
  project: SolarProject;
  onUpdateProject: (updated: SolarProject) => void;
  onNavigate: (section: AppSection) => void;
}

function fileToBase64(file: File): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const commaIdx = dataUrl.indexOf(',');
      resolve({
        base64: commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl,
        dataUrl,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

async function assetPathToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load sample nameplate image.');
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error('Sample nameplate image failed to load (unexpected non-image response).');
  }
  const mimeType = blob.type || 'image/jpeg';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const commaIdx = dataUrl.indexOf(',');
      resolve({
        base64: commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl,
        mimeType,
      });
    };
    reader.onerror = () => reject(new Error('Failed to encode sample image.'));
    reader.readAsDataURL(blob);
  });
}

export function InspectionWorkflowView({
  project,
  onUpdateProject,
  onNavigate,
}: InspectionWorkflowViewProps) {
  const [quotationText, setQuotationText] = useState(project.quotationRawText ?? '');
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteWarnings, setQuoteWarnings] = useState<string[]>([]);

  const [nameplateCategoryHint, setNameplateCategoryHint] = useState<EquipmentCategory>('PV_MODULE');
  const [nameplateQty, setNameplateQty] = useState('16');
  const [nameplateLoading, setNameplateLoading] = useState(false);
  const [nameplateError, setNameplateError] = useState<string | null>(null);
  const [nameplateNote, setNameplateNote] = useState<string | null>(null);
  const [expandedOriginalAiIds, setExpandedOriginalAiIds] = useState<Record<string, boolean>>({});

  const [editingModal, setEditingModal] = useState<{
    mode: 'PROMISED' | 'INSTALLED';
    spec?: EquipmentSpec;
    defaultCategory?: EquipmentCategory;
    defaultOpenDatasheet?: boolean;
  } | null>(null);

  const handleMetaUpdate = (patch: Partial<SolarProject>) => {
    onUpdateProject({
      ...project,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleExtractQuotation = async () => {
    setQuoteLoading(true);
    setQuoteError(null);
    setQuoteWarnings([]);
    try {
      let base64Data: string | undefined;
      let mimeType: string | undefined;
      let fileName = project.quotationFileName;

      if (quotationFile) {
        const encoded = await fileToBase64(quotationFile);
        base64Data = encoded.base64;
        mimeType = quotationFile.type || 'application/pdf';
        fileName = quotationFile.name;
      }

      const result = await safeFetchJson<{
        items?: Array<Record<string, unknown>>;
        extractionWarnings?: string[];
      }>('/api/ai/extract-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          mimeType,
          base64Data,
          rawText: quotationText,
        }),
      });
      if (!result.ok || !result.data) {
        setQuoteError(
          result.error ??
            'AI quotation extraction unavailable. Use "Add Promised Equipment Manually" below.',
        );
        return;
      }
      const data = result.data;

      const items = Array.isArray(data.items) ? data.items : [];
      const warnings = Array.isArray(data.extractionWarnings) ? data.extractionWarnings : [];
      setQuoteWarnings(warnings);

      const mapped: EquipmentSpec[] = items
        .filter((it: Record<string, unknown>) =>
          ['PV_MODULE', 'INVERTER', 'BATTERY'].includes(String(it.category)),
        )
        .map((it: Record<string, unknown>, idx: number) => ({
          id: `prom-${Date.now()}-${idx}`,
          category: it.category as EquipmentCategory,
          manufacturer: (it.manufacturer as string | null) ?? null,
          model: (it.model as string | null) ?? null,
          quantity: typeof it.quantity === 'number' ? it.quantity : null,
          ratedPowerW: typeof it.ratedPowerW === 'number' ? it.ratedPowerW : null,
          capacityKwh: typeof it.capacityKwh === 'number' ? it.capacityKwh : null,
          nominalVoltageV: typeof it.nominalVoltageV === 'number' ? it.nominalVoltageV : null,
          vocV: typeof it.vocV === 'number' ? it.vocV : null,
          vmpV: typeof it.vmpV === 'number' ? it.vmpV : null,
          iscA: typeof it.iscA === 'number' ? it.iscA : null,
          impA: typeof it.impA === 'number' ? it.impA : null,
          tempCoeffVocPctPerC:
            typeof it.tempCoeffVocPctPerC === 'number' ? it.tempCoeffVocPctPerC : null,
          maxPvInputVoltageV:
            typeof it.maxPvInputVoltageV === 'number' ? it.maxPvInputVoltageV : null,
          mpptMinV: typeof it.mpptMinV === 'number' ? it.mpptMinV : null,
          mpptMaxV: typeof it.mpptMaxV === 'number' ? it.mpptMaxV : null,
          maxPvOperatingCurrentA:
            typeof it.maxPvOperatingCurrentA === 'number' ? it.maxPvOperatingCurrentA : null,
          maxPvShortCircuitCurrentA:
            typeof it.maxPvShortCircuitCurrentA === 'number'
              ? it.maxPvShortCircuitCurrentA
              : null,
          minBatteryVoltageV:
            typeof it.minBatteryVoltageV === 'number' ? it.minBatteryVoltageV : null,
          maxBatteryVoltageV:
            typeof it.maxBatteryVoltageV === 'number' ? it.maxBatteryVoltageV : null,
          additionalSpecs: (it.additionalSpecs as string | undefined) ?? undefined,
          provenance: 'AI_EXTRACTED',
          uncertainFields: Array.isArray(it.uncertainFields)
            ? (it.uncertainFields as string[])
            : ['Review AI extraction before confirming'],
          unreadableFields: Array.isArray(it.unreadableFields)
            ? (it.unreadableFields as string[])
            : [],
          sourceFileName: fileName,
          verifiedByUser: false,
        }));

      if (mapped.length === 0) {
        setQuoteWarnings((prev) => [
          ...prev,
          'No structured solar equipment items were recognized. Add promised equipment manually.',
        ]);
      } else {
        onUpdateProject({
          ...project,
          quotationFileName: fileName,
          quotationRawText: quotationText,
          promisedEquipment: mapped,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setQuoteError(
        err instanceof Error
          ? err.message
          : 'Network error during quotation extraction. Use manual entry below.',
      );
    } finally {
      setQuoteLoading(false);
    }
  };

  const runNameplateVision = async (
    fileName: string,
    mimeType: string,
    base64Data: string,
    previewUrl: string,
    categoryHint: EquipmentCategory,
  ) => {
    setNameplateLoading(true);
    setNameplateError(null);
    setNameplateNote(null);
    try {
      const result = await safeFetchJson<{
        category?: string;
        manufacturer?: string | null;
        model?: string | null;
        ratedPowerW?: number | null;
        capacityKwh?: number | null;
        nominalVoltageV?: number | null;
        vocV?: number | null;
        vmpV?: number | null;
        iscA?: number | null;
        impA?: number | null;
        tempCoeffVocPctPerC?: number | null;
        maxPvInputVoltageV?: number | null;
        mpptMinV?: number | null;
        mpptMaxV?: number | null;
        maxPvOperatingCurrentA?: number | null;
        maxPvShortCircuitCurrentA?: number | null;
        minBatteryVoltageV?: number | null;
        maxBatteryVoltageV?: number | null;
        serialNumber?: string | null;
        additionalSpecs?: string | null;
        unreadableFields?: string[];
        confidenceNotes?: string;
      }>('/api/ai/extract-nameplate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          mimeType,
          base64Data,
          categoryHint,
        }),
      });
      if (!result.ok || !result.data) {
        setNameplateError(
          result.error ??
            'AI Vision extraction failed. Click "Add Nameplate Manually" to enter label specs.',
        );
        return;
      }
      const data = result.data;

      const detectedCategory: EquipmentCategory =
        data.category === 'PV_MODULE' || data.category === 'INVERTER' || data.category === 'BATTERY'
          ? data.category
          : categoryHint;

      const sanitized = sanitizeSpecFieldsByCategory(
        detectedCategory,
        data as Record<string, unknown>,
      );
      const originalAiExtraction = createOriginalAiSnapshot(
        detectedCategory,
        sanitized,
        fileName,
      );

      const parsedQty = Number(nameplateQty);
      const qtyVal = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : null;

      const newSpec: EquipmentSpec = {
        id: `inst-${Date.now()}`,
        category: detectedCategory,
        manufacturer: (sanitized.manufacturer as string | null) ?? null,
        model: (sanitized.model as string | null) ?? null,
        quantity: qtyVal,
        ratedPowerW: typeof sanitized.ratedPowerW === 'number' ? sanitized.ratedPowerW : null,
        capacityKwh: typeof sanitized.capacityKwh === 'number' ? sanitized.capacityKwh : null,
        nominalVoltageV:
          typeof sanitized.nominalVoltageV === 'number' ? sanitized.nominalVoltageV : null,
        vocV: typeof sanitized.vocV === 'number' ? sanitized.vocV : null,
        vmpV: typeof sanitized.vmpV === 'number' ? sanitized.vmpV : null,
        iscA: typeof sanitized.iscA === 'number' ? sanitized.iscA : null,
        impA: typeof sanitized.impA === 'number' ? sanitized.impA : null,
        tempCoeffVocPctPerC:
          typeof sanitized.tempCoeffVocPctPerC === 'number' ? sanitized.tempCoeffVocPctPerC : null,
        maxPvInputVoltageV:
          typeof sanitized.maxPvInputVoltageV === 'number' ? sanitized.maxPvInputVoltageV : null,
        mpptMinV: typeof sanitized.mpptMinV === 'number' ? sanitized.mpptMinV : null,
        mpptMaxV: typeof sanitized.mpptMaxV === 'number' ? sanitized.mpptMaxV : null,
        maxPvOperatingCurrentA:
          typeof sanitized.maxPvOperatingCurrentA === 'number'
            ? sanitized.maxPvOperatingCurrentA
            : null,
        maxPvShortCircuitCurrentA:
          typeof sanitized.maxPvShortCircuitCurrentA === 'number'
            ? sanitized.maxPvShortCircuitCurrentA
            : null,
        minBatteryVoltageV:
          typeof sanitized.minBatteryVoltageV === 'number' ? sanitized.minBatteryVoltageV : null,
        maxBatteryVoltageV:
          typeof sanitized.maxBatteryVoltageV === 'number' ? sanitized.maxBatteryVoltageV : null,
        serialNumber: (sanitized.serialNumber as string | null) ?? null,
        additionalSpecs: (sanitized.additionalSpecs as string | null) ?? undefined,
        provenance: 'AI_EXTRACTED',
        fieldProvenance: {},
        uncertainFields: [],
        unreadableFields: filterUnreadableFieldsByCategory(
          detectedCategory,
          sanitized.unreadableFields,
        ),
        sourceFileName: fileName,
        sourceImagePreview: previewUrl,
        originalAiExtraction,
        verifiedByUser: false,
      };

      const filtered = project.installedEquipment.filter((e) => e.category !== detectedCategory);
      onUpdateProject({
        ...project,
        installedEquipment: [...filtered, newSpec],
        updatedAt: new Date().toISOString(),
      });
      setNameplateNote(
        (sanitized.confidenceNotes as string | undefined) ??
          'Nameplate label read. Original AI output preserved — please review and confirm.',
      );
    } catch (err) {
      setNameplateError(
        err instanceof Error ? err.message : 'Unable to process nameplate photograph.',
      );
    } finally {
      setNameplateLoading(false);
    }
  };

  const handleNameplateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64, dataUrl } = await fileToBase64(file);
      await runNameplateVision(
        file.name,
        file.type || 'image/jpeg',
        base64,
        dataUrl,
        nameplateCategoryHint,
      );
    } catch (err) {
      setNameplateError(err instanceof Error ? err.message : 'Failed to read image file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleTestDemoNameplate = async (
    assetUrl: string,
    fileName: string,
    cat: EquipmentCategory,
  ) => {
    try {
      const { base64, mimeType } = await assetPathToBase64(assetUrl);
      await runNameplateVision(fileName, mimeType, base64, assetUrl, cat);
    } catch (err) {
      setNameplateError(err instanceof Error ? err.message : 'Failed to load sample image.');
    }
  };

  const handleSaveEquipment = (mode: 'PROMISED' | 'INSTALLED', spec: EquipmentSpec) => {
    if (mode === 'PROMISED') {
      const exists = project.promisedEquipment.some((e) => e.id === spec.id);
      const next = exists
        ? project.promisedEquipment.map((e) => (e.id === spec.id ? spec : e))
        : [...project.promisedEquipment.filter((e) => e.category !== spec.category), spec];
      onUpdateProject({
        ...project,
        promisedEquipment: next,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const exists = project.installedEquipment.some((e) => e.id === spec.id);
      const next = exists
        ? project.installedEquipment.map((e) => (e.id === spec.id ? spec : e))
        : [...project.installedEquipment.filter((e) => e.category !== spec.category), spec];
      onUpdateProject({
        ...project,
        installedEquipment: next,
        updatedAt: new Date().toISOString(),
      });
    }
    setEditingModal(null);
  };

  const handleDeleteEquipment = (mode: 'PROMISED' | 'INSTALLED', id: string) => {
    if (mode === 'PROMISED') {
      onUpdateProject({
        ...project,
        promisedEquipment: project.promisedEquipment.filter((e) => e.id !== id),
        updatedAt: new Date().toISOString(),
      });
    } else {
      onUpdateProject({
        ...project,
        installedEquipment: project.installedEquipment.filter((e) => e.id !== id),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Project Metadata */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Step 1 — Active Project Details
            </h2>
            <p className="text-xs text-slate-500">
              Project ID: <span className="font-mono font-semibold text-slate-700">{project.id}</span>
            </p>
          </div>
          {(project.isDemo || projectContainsSimulatedData(project)) && (
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
              {project.isDemo
                ? 'Simulated Demonstration Project'
                : 'Contains Simulated / Prototype Data'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={project.customerName}
              onChange={(e) => handleMetaUpdate({ customerName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
            <input
              type="text"
              value={project.location}
              onChange={(e) => handleMetaUpdate({ location: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Installation Date
            </label>
            <input
              type="date"
              value={project.installationDate}
              onChange={(e) => handleMetaUpdate({ installationDate: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">System Type</label>
            <select
              value={project.systemType}
              onChange={(e) => handleMetaUpdate({ systemType: e.target.value as SystemType })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
            >
              <option value="Hybrid (PV + Battery)">Hybrid (PV + Battery)</option>
              <option value="Grid-Tied">Grid-Tied</option>
              <option value="Off-Grid">Off-Grid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Quotation Analysis */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Step 2 — Contractual Quotation Analysis (Promised Equipment)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a quotation PDF/document or paste quotation text for Gemini extraction, then
              review and confirm every specification.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingModal({ mode: 'PROMISED' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Promised Equipment Manually
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              Upload Quotation Document (PDF, Image, TXT, CSV)
            </label>
            <div className="border border-dashed border-slate-300 rounded-md p-4 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {quotationFile
                  ? `Selected: ${quotationFile.name}`
                  : project.quotationFileName
                    ? `Current file: ${project.quotationFileName}`
                    : 'No file selected'}
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer whitespace-nowrap shrink-0">
                <FileUp className="w-3.5 h-3.5" />
                Choose File
                <input
                  type="file"
                  accept=".pdf,.txt,.csv,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => setQuotationFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleExtractQuotation}
                disabled={quoteLoading || (!quotationFile && !quotationText.trim())}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                {quoteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {quoteLoading ? 'Analyzing Quotation...' : 'Extract Promised Specs with Gemini'}
              </button>
              <button
                type="button"
                onClick={() => setQuotationText(DEMO_QUOTATION_TEXT)}
                className="px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
              >
                Insert Sample Quotation Text
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Quotation Text / Line Items (Optional or Paste)
            </label>
            <textarea
              rows={5}
              value={quotationText}
              onChange={(e) => setQuotationText(e.target.value)}
              placeholder="Paste quotation equipment schedule or bill of materials..."
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {quoteError && (
          <div className="bg-red-50 border border-red-200 text-red-900 text-xs px-3 py-2.5 rounded-md">
            {quoteError}
          </div>
        )}

        {quoteWarnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2.5 rounded-md space-y-1">
            <div className="font-semibold">Extraction Uncertainty Notes:</div>
            {quoteWarnings.map((w, idx) => (
              <div key={idx}>· {w}</div>
            ))}
          </div>
        )}

        {/* Promised Equipment List */}
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Manufacturer & Model</th>
                <th className="py-2.5 px-3">Qty</th>
                <th className="py-2.5 px-3">Key Ratings</th>
                <th className="py-2.5 px-3">Verification</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {project.promisedEquipment.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No promised equipment recorded yet. Extract a quotation or add items manually.
                  </td>
                </tr>
              ) : (
                project.promisedEquipment.map((eq) => {
                  const prov: DataProvenance = resolveEquipmentProvenance(eq, project.isDemo);
                  const simReasons = detectSimulatedMarkers(eq, project.isDemo);
                  return (
                    <tr key={eq.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {CATEGORY_LABELS[eq.category]}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">
                          {eq.manufacturer ?? 'Missing Mfg'} ·{' '}
                          <span className="font-mono">{eq.model ?? 'Missing Model'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatProvenance(prov)}
                        </div>
                        {simReasons.length > 0 && (
                          <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                            Warning: {simReasons[0]}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums">
                        {eq.quantity ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                        {[
                          eq.ratedPowerW !== null ? `${eq.ratedPowerW}W` : null,
                          eq.capacityKwh !== null ? `${eq.capacityKwh}kWh` : null,
                          eq.vocV !== null ? `Voc:${eq.vocV}V` : null,
                          eq.maxPvInputVoltageV !== null ? `MaxPV:${eq.maxPvInputVoltageV}V` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Incomplete'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {prov === 'SIMULATED' ? (
                          <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> SIMULATED
                          </span>
                        ) : prov === 'USER_VERIFIED' || prov === 'DATASHEET_VERIFIED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {prov}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> {prov}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingModal({ mode: 'PROMISED', spec: eq })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-50 mr-1.5"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEquipment('PROMISED', eq.id)}
                          className="p-1 text-slate-400 hover:text-red-700"
                          aria-label="Remove promised item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 3: Installed Equipment Nameplate Verification */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Step 3 — Installed Equipment Nameplate Verification (Site Evidence)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload nameplate photographs for Gemini Vision label OCR. Equipment is identified
              strictly from printed label text, never physical appearance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingModal({ mode: 'INSTALLED' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Nameplate Manually
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Equipment Category
              </label>
              <select
                value={nameplateCategoryHint}
                onChange={(e) => {
                  const nextCat = e.target.value as EquipmentCategory;
                  setNameplateCategoryHint(nextCat);
                  if (nextCat === 'PV_MODULE') setNameplateQty('16');
                  else if (nextCat === 'INVERTER') setNameplateQty('1');
                  else setNameplateQty('2');
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
              >
                <option value="PV_MODULE">Solar PV Module Nameplate</option>
                <option value="INVERTER">Inverter Rating Plate</option>
                <option value="BATTERY">Battery Module Label</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Observed Physical Unit Count
              </label>
              <input
                type="number"
                min="1"
                value={nameplateQty}
                onChange={(e) => setNameplateQty(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-md bg-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 cursor-pointer whitespace-nowrap">
              {nameplateLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              {nameplateLoading ? 'Reading Nameplate...' : 'Upload Nameplate Photo (AI Vision)'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={nameplateLoading}
                onChange={handleNameplateFileChange}
              />
            </label>

            <button
              type="button"
              disabled={nameplateLoading}
              onClick={() => {
                const sampleAssets: Record<EquipmentCategory, { url: string; name: string }> = {
                  PV_MODULE: {
                    url: '/src/assets/images/demo_pv_nameplate_1795536733219.jpg',
                    name: 'demo_pv_nameplate.jpg',
                  },
                  INVERTER: {
                    url: '/src/assets/images/demo_inverter_nameplate_1795536733832.jpg',
                    name: 'demo_inverter_nameplate.jpg',
                  },
                  BATTERY: {
                    url: '/src/assets/images/demo_battery_nameplate_1795539943919.jpg',
                    name: 'demo_battery_nameplate.jpg',
                  },
                };
                const sample = sampleAssets[nameplateCategoryHint];
                handleTestDemoNameplate(sample.url, sample.name, nameplateCategoryHint);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 whitespace-nowrap"
            >
              Test AI on Sample {CATEGORY_LABELS[nameplateCategoryHint]} Label
            </button>
          </div>
        </div>

        {nameplateError && (
          <div className="bg-red-50 border border-red-200 text-red-900 text-xs px-3 py-2.5 rounded-md">
            {nameplateError}
          </div>
        )}
        {nameplateNote && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-3 py-2.5 rounded-md">
            {nameplateNote}
          </div>
        )}

        {/* Installed Equipment Cards */}
        {project.installedEquipment.length === 0 ? (
          <div className="border border-slate-200 rounded-md py-8 text-center text-xs text-slate-500">
            No installed equipment nameplates recorded yet. Upload a nameplate photo or add specs
            manually.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.installedEquipment.map((eq) => {
              const categoryDefs = CATEGORY_FIELD_DEFINITIONS[eq.category].filter(
                (d) => !['manufacturer', 'model', 'serialNumber', 'additionalSpecs'].includes(d.key),
              );
              const filteredUnreadable = filterUnreadableFieldsByCategory(
                eq.category,
                eq.unreadableFields,
              );
              const missingRequired = getMissingCategoryFields(eq);
              const hasOriginalAi = Boolean(eq.originalAiExtraction);
              const isOriginalOpen = Boolean(expandedOriginalAiIds[eq.id]);
              const resolvedProv = resolveEquipmentProvenance(eq, project.isDemo);
              const simReasons = detectSimulatedMarkers(eq, project.isDemo);

              return (
                <div
                  key={eq.id}
                  className="border border-slate-200 rounded-lg overflow-hidden bg-white flex flex-col justify-between"
                >
                  <div>
                    {eq.sourceImagePreview ? (
                      <div className="aspect-[4/3] bg-slate-100 border-b border-slate-200 overflow-hidden">
                        <img
                          src={eq.sourceImagePreview}
                          alt={`${CATEGORY_LABELS[eq.category]} nameplate`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-slate-100 border-b border-slate-200 flex flex-col items-center justify-center p-4 text-center">
                        <Camera className="w-6 h-6 text-slate-400 mb-1.5" />
                        <span className="text-xs font-medium text-slate-600">
                          {resolvedProv === 'SIMULATED'
                            ? 'Simulated Equipment Record'
                            : 'Manual Nameplate Entry'}
                        </span>
                      </div>
                    )}

                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-500">
                          {CATEGORY_LABELS[eq.category]}
                        </span>
                        <span
                          className={`text-[11px] font-mono font-semibold ${
                            resolvedProv === 'USER_VERIFIED' ||
                            resolvedProv === 'DATASHEET_VERIFIED'
                              ? 'text-emerald-700'
                              : resolvedProv === 'SIMULATED'
                                ? 'text-amber-800'
                                : 'text-slate-700'
                          }`}
                        >
                          {resolvedProv}
                        </span>
                      </div>

                      {simReasons.length > 0 && (
                        <div className="bg-amber-50 border border-amber-300 rounded px-2.5 py-1.5 text-[11px] text-amber-950 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <span>
                            <span className="font-semibold">Simulated Data Warning:</span>{' '}
                            {simReasons.join('; ')}. Not verified real equipment.
                          </span>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {eq.manufacturer ?? 'Unknown Manufacturer'}
                        </div>
                        <div className="text-xs font-mono text-slate-700">
                          Model: {eq.model ?? 'Not readable'} · Qty: {eq.quantity ?? '—'}
                        </div>
                        {eq.serialNumber && (
                          <div className="text-[11px] font-mono text-slate-500">
                            S/N: {eq.serialNumber}
                          </div>
                        )}
                      </div>

                      {/* Category-Specific Extracted Specifications */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        {categoryDefs.map((def) => {
                          const val = eq[def.key as keyof EquipmentSpec];
                          const hasVal = val !== null && val !== undefined && val !== '';
                          if (!hasVal && def.key === 'ratedPowerW' && eq.category === 'BATTERY') {
                            return null;
                          }
                          return (
                            <div
                              key={def.key}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1"
                            >
                              <div className="text-[10px] text-slate-500 truncate">{def.label}</div>
                              <div
                                className={`font-mono tabular-nums font-medium ${
                                  hasVal ? 'text-slate-900' : 'text-slate-400'
                                }`}
                              >
                                {hasVal ? `${val}${def.unit ? ` ${def.unit}` : ''}` : 'Missing'}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {eq.additionalSpecs && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
                          <span className="font-semibold text-slate-700">Other Specs:</span>{' '}
                          {eq.additionalSpecs}
                        </div>
                      )}

                      {eq.datasheetFileName && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                          <span className="font-semibold">Datasheet linked:</span>{' '}
                          {eq.datasheetFileName}
                        </div>
                      )}

                      {(filteredUnreadable.length > 0 || missingRequired.length > 0) && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900 space-y-1">
                          <div>
                            <span className="font-semibold">
                              Missing on {CATEGORY_LABELS[eq.category]} label:
                            </span>{' '}
                            {(filteredUnreadable.length > 0
                              ? filteredUnreadable
                              : missingRequired.map((m) => m.label)
                            ).join(', ')}
                          </div>
                          <div className="text-[10px] text-amber-800">
                            Use Review & Correct for manual entry or Upload Datasheet below.
                          </div>
                        </div>
                      )}

                      {/* Preserved Original AI Extraction Toggle */}
                      {hasOriginalAi && eq.originalAiExtraction && (
                        <div className="border border-slate-200 rounded bg-slate-50">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOriginalAiIds((prev) => ({
                                ...prev,
                                [eq.id]: !prev[eq.id],
                              }))
                            }
                            className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <span className="inline-flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {isOriginalOpen ? 'Hide Original AI Read' : 'View Original AI Read'}
                            </span>
                            <span className="text-[10px] font-normal text-slate-500">
                              Preserved
                            </span>
                          </button>
                          {isOriginalOpen && (
                            <div className="px-2.5 pb-2 pt-1 border-t border-slate-200 text-[11px] space-y-1">
                              {CATEGORY_FIELD_DEFINITIONS[eq.originalAiExtraction.category]
                                .filter((d) => d.key !== 'additionalSpecs')
                                .map((def) => {
                                  const origVal =
                                    eq.originalAiExtraction!.fields[
                                      def.key as keyof typeof eq.originalAiExtraction.fields
                                    ];
                                  return (
                                    <div key={def.key} className="flex justify-between gap-2">
                                      <span className="text-slate-500">{def.label}:</span>
                                      <span className="font-mono text-slate-800 text-right">
                                        {origVal !== null && origVal !== undefined && origVal !== ''
                                          ? `${origVal}${def.unit ? ` ${def.unit}` : ''}`
                                          : 'Not readable'}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingModal({ mode: 'INSTALLED', spec: eq })}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 hover:text-slate-950"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Review & Correct
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingModal({
                            mode: 'INSTALLED',
                            spec: eq,
                            defaultOpenDatasheet: true,
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Datasheet
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteEquipment('INSTALLED', eq.id)}
                      className="p-1 text-slate-400 hover:text-red-700"
                      aria-label="Delete installed equipment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate('comparison')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
          >
            Proceed to Step 4: Equipment Comparison
          </button>
        </div>
      </div>

      {editingModal && (
        <EquipmentFormModal
          mode={editingModal.mode}
          initialSpec={editingModal.spec}
          defaultCategory={editingModal.defaultCategory}
          defaultOpenDatasheet={editingModal.defaultOpenDatasheet}
          projectIsDemo={project.isDemo}
          onSave={(spec) => handleSaveEquipment(editingModal.mode, spec)}
          onClose={() => setEditingModal(null)}
        />
      )}
    </div>
  );
}
