import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { EquipmentCategory } from './src/types/mithaq.ts';
import { sanitizeSpecFieldsByCategory } from './src/utils/categorySpecs.ts';
import {
  extractReadableError,
  generateContentWithFallback,
  getApiErrorCode,
  getApiErrorStatus,
  parseJsonSafely,
} from './src/utils/aiReliability.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_QUOTATION_MIMES = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_BASE64_LENGTH = 20 * 1024 * 1024; // ~15 MB binary

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}



const equipmentExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: 'Must be one of PV_MODULE, INVERTER, or BATTERY.',
          },
          manufacturer: { type: Type.STRING, nullable: true },
          model: { type: Type.STRING, nullable: true },
          quantity: { type: Type.NUMBER, nullable: true },
          ratedPowerW: { type: Type.NUMBER, nullable: true },
          capacityKwh: { type: Type.NUMBER, nullable: true },
          nominalVoltageV: { type: Type.NUMBER, nullable: true },
          vocV: { type: Type.NUMBER, nullable: true },
          vmpV: { type: Type.NUMBER, nullable: true },
          iscA: { type: Type.NUMBER, nullable: true },
          impA: { type: Type.NUMBER, nullable: true },
          tempCoeffVocPctPerC: { type: Type.NUMBER, nullable: true },
          maxPvInputVoltageV: { type: Type.NUMBER, nullable: true },
          mpptMinV: { type: Type.NUMBER, nullable: true },
          mpptMaxV: { type: Type.NUMBER, nullable: true },
          maxPvOperatingCurrentA: {
            type: Type.NUMBER,
            nullable: true,
            description: 'Max PV operating/MPPT input current (Imp-related limit). Null if only Isc is given.',
          },
          maxPvShortCircuitCurrentA: {
            type: Type.NUMBER,
            nullable: true,
            description: 'Max PV short-circuit input current (Isc limit). Null if not explicitly labeled as Isc.',
          },
          minBatteryVoltageV: { type: Type.NUMBER, nullable: true },
          maxBatteryVoltageV: { type: Type.NUMBER, nullable: true },
          serialNumber: { type: Type.STRING, nullable: true },
          additionalSpecs: { type: Type.STRING, nullable: true },
          uncertainFields: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          unreadableFields: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['category', 'uncertainFields', 'unreadableFields'],
      },
    },
    extractionWarnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['items', 'extractionWarnings'],
};

const pvModuleExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, description: 'Always PV_MODULE.' },
    manufacturer: { type: Type.STRING, nullable: true },
    model: { type: Type.STRING, nullable: true },
    ratedPowerW: { type: Type.NUMBER, nullable: true, description: 'STC Pmax rated power in Watts.' },
    vocV: { type: Type.NUMBER, nullable: true, description: 'Open-circuit voltage Voc (STC) in Volts.' },
    vmpV: { type: Type.NUMBER, nullable: true, description: 'Max power voltage Vmp (STC) in Volts.' },
    iscA: { type: Type.NUMBER, nullable: true, description: 'Short-circuit current Isc (STC) in Amps.' },
    impA: { type: Type.NUMBER, nullable: true, description: 'Max power current Imp (STC) in Amps.' },
    tempCoeffVocPctPerC: { type: Type.NUMBER, nullable: true, description: 'Temperature coefficient of Voc in %/°C (often negative, e.g. -0.28).' },
    serialNumber: { type: Type.STRING, nullable: true },
    additionalSpecs: { type: Type.STRING, nullable: true, description: 'Other PV module ratings printed (e.g. Max System Voltage, Series Fuse Rating, Cell Type, IP Class).' },
    unreadableFields: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'ONLY PV module fields from this schema (Manufacturer, Model, Rated Power, Voc, Vmp, Isc, Imp, Temp Coefficient of Voc) that are missing or illegible. Never list inverter or battery fields.',
    },
    confidenceNotes: { type: Type.STRING },
  },
  required: ['category', 'unreadableFields', 'confidenceNotes'],
};

const inverterExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, description: 'Always INVERTER.' },
    manufacturer: { type: Type.STRING, nullable: true },
    model: { type: Type.STRING, nullable: true },
    ratedPowerW: { type: Type.NUMBER, nullable: true, description: 'Rated AC output power in Watts (convert kW to W if printed in kW).' },
    nominalVoltageV: { type: Type.NUMBER, nullable: true, description: 'Nominal battery / DC bus voltage in Volts.' },
    minBatteryVoltageV: { type: Type.NUMBER, nullable: true, description: 'Minimum battery operating voltage in Volts.' },
    maxBatteryVoltageV: { type: Type.NUMBER, nullable: true, description: 'Maximum battery operating voltage in Volts.' },
    maxPvInputVoltageV: { type: Type.NUMBER, nullable: true, description: 'Maximum PV DC input voltage in Volts.' },
    maxPvOperatingCurrentA: {
      type: Type.NUMBER,
      nullable: true,
      description: 'Maximum PV operating/MPPT input current (Imp limit) in Amps. Null if only Isc is printed.',
    },
    maxPvShortCircuitCurrentA: {
      type: Type.NUMBER,
      nullable: true,
      description: 'Maximum PV short-circuit input current (Isc limit) in Amps. Null if not explicitly labeled as Isc.',
    },
    mpptMinV: { type: Type.NUMBER, nullable: true, description: 'MPPT operating window minimum voltage in Volts.' },
    mpptMaxV: { type: Type.NUMBER, nullable: true, description: 'MPPT operating window maximum voltage in Volts.' },
    serialNumber: { type: Type.STRING, nullable: true },
    additionalSpecs: { type: Type.STRING, nullable: true, description: 'Other inverter specs printed (e.g. AC grid voltage/Hz, max AC current, IP rating).' },
    unreadableFields: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'ONLY inverter fields from this schema that are missing or illegible. Never list PV module (Voc/Vmp/Isc/Imp/temp coeff) or battery kWh capacity fields.',
    },
    confidenceNotes: { type: Type.STRING },
  },
  required: ['category', 'unreadableFields', 'confidenceNotes'],
};

const batteryExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, description: 'Always BATTERY.' },
    manufacturer: { type: Type.STRING, nullable: true },
    model: { type: Type.STRING, nullable: true },
    nominalVoltageV: { type: Type.NUMBER, nullable: true, description: 'Nominal battery voltage in Volts.' },
    minBatteryVoltageV: { type: Type.NUMBER, nullable: true, description: 'Minimum operating / discharge cut-off voltage in Volts.' },
    maxBatteryVoltageV: { type: Type.NUMBER, nullable: true, description: 'Maximum operating / charge voltage in Volts.' },
    capacityKwh: { type: Type.NUMBER, nullable: true, description: 'Battery energy capacity in kWh if explicitly printed (convert Wh to kWh only if printed).' },
    serialNumber: { type: Type.STRING, nullable: true },
    additionalSpecs: { type: Type.STRING, nullable: true, description: 'Other battery specs printed (e.g. chemistry LiFePO4, Ah capacity, max charge/discharge current A, cycle life).' },
    unreadableFields: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'ONLY battery fields from this schema (Manufacturer, Model, Nominal Voltage, Minimum Operating Voltage, Maximum Operating Voltage, Capacity in kWh) that are missing or illegible. Never list PV module or inverter PV-input fields.',
    },
    confidenceNotes: { type: Type.STRING },
  },
  required: ['category', 'unreadableFields', 'confidenceNotes'],
};

const autoDetectNameplateSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description: 'Detected equipment category: PV_MODULE, INVERTER, or BATTERY.',
    },
    manufacturer: { type: Type.STRING, nullable: true },
    model: { type: Type.STRING, nullable: true },
    ratedPowerW: { type: Type.NUMBER, nullable: true },
    capacityKwh: { type: Type.NUMBER, nullable: true },
    nominalVoltageV: { type: Type.NUMBER, nullable: true },
    vocV: { type: Type.NUMBER, nullable: true },
    vmpV: { type: Type.NUMBER, nullable: true },
    iscA: { type: Type.NUMBER, nullable: true },
    impA: { type: Type.NUMBER, nullable: true },
    tempCoeffVocPctPerC: { type: Type.NUMBER, nullable: true },
    maxPvInputVoltageV: { type: Type.NUMBER, nullable: true },
    mpptMinV: { type: Type.NUMBER, nullable: true },
    mpptMaxV: { type: Type.NUMBER, nullable: true },
    maxPvOperatingCurrentA: { type: Type.NUMBER, nullable: true },
    maxPvShortCircuitCurrentA: { type: Type.NUMBER, nullable: true },
    minBatteryVoltageV: { type: Type.NUMBER, nullable: true },
    maxBatteryVoltageV: { type: Type.NUMBER, nullable: true },
    serialNumber: { type: Type.STRING, nullable: true },
    additionalSpecs: { type: Type.STRING, nullable: true },
    unreadableFields: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'ONLY fields belonging to the detected equipment category that are missing or illegible. Never list fields from other categories.',
    },
    confidenceNotes: { type: Type.STRING },
  },
  required: ['category', 'unreadableFields', 'confidenceNotes'],
};

function isValidEquipmentCategory(value: unknown): value is EquipmentCategory {
  return value === 'PV_MODULE' || value === 'INVERTER' || value === 'BATTERY';
}

function getCategorySchemaAndPrompt(category: EquipmentCategory | 'AUTO') {
  if (category === 'PV_MODULE') {
    return {
      schema: pvModuleExtractionSchema,
      focus:
        'Equipment Category: SOLAR PV MODULE (PV_MODULE). Extract ONLY PV module specs: Manufacturer, Model, Rated Power (Pmax in W), Voc (V), Vmp (V), Isc (A), Imp (A), Temperature Coefficient of Voc (%/°C), Serial Number, and other available module specifications (in additionalSpecs). Do NOT look for or report inverter or battery parameters (such as MPPT voltages, battery voltages, or kWh capacity) as missing.',
    };
  }
  if (category === 'INVERTER') {
    return {
      schema: inverterExtractionSchema,
      focus:
        'Equipment Category: INVERTER (INVERTER). Extract ONLY inverter specs: Manufacturer, Model, Rated Power (W), Nominal Battery Voltage (V), Minimum Battery Voltage (V), Maximum Battery Voltage (V), Maximum PV Input Voltage (V), Maximum PV Operating Current (A, Imp-related), Maximum PV Short-Circuit Current (A, Isc-related), MPPT Minimum Voltage (V), MPPT Maximum Voltage (V), Serial Number, and other available inverter specs (in additionalSpecs). Distinguish clearly between Maximum PV Operating Current and Maximum PV Short-Circuit Current; leave null if not explicitly printed. Do NOT report PV module STC fields (Voc/Vmp/Isc/Imp/temp coeff) or battery kWh capacity as missing.',
    };
  }
  if (category === 'BATTERY') {
    return {
      schema: batteryExtractionSchema,
      focus:
        'Equipment Category: BATTERY STORAGE (BATTERY). Extract ONLY battery specs: Manufacturer, Model, Nominal Voltage (V), Minimum Operating Voltage (V), Maximum Operating Voltage (V), Capacity (kWh), Serial Number, and other available battery specifications (chemistry, Ah rating, max charge/discharge current in additionalSpecs). Do NOT report PV module or inverter PV-input fields (such as Voc, MPPT, or PV current limits) as missing.',
    };
  }
  return {
    schema: autoDetectNameplateSchema,
    focus:
      'First identify whether the nameplate belongs to PV_MODULE, INVERTER, or BATTERY from printed text, then extract ONLY the parameters relevant to that single category and list ONLY missing/illegible parameters belonging to that single category in unreadableFields.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    const aiConfigured = getGeminiClient() !== null;
    res.json({ ok: true, aiConfigured });
  });

  app.post('/api/ai/extract-quotation', async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(424).json({
          error:
            'Gemini API key is not configured on the server. Use manual quotation entry or set GEMINI_API_KEY in Settings > Secrets.',
          code: 'AI_UNCONFIGURED',
        });
        return;
      }

      const { fileName, mimeType, base64Data, rawText } = req.body as {
        fileName?: string;
        mimeType?: string;
        base64Data?: string;
        rawText?: string;
      };

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (base64Data && mimeType) {
        if (!ALLOWED_QUOTATION_MIMES.has(mimeType)) {
          res.status(400).json({ error: `Unsupported quotation file type: ${mimeType}`, code: 'INVALID_MIME' });
          return;
        }
        if (base64Data.length > MAX_BASE64_LENGTH) {
          res.status(400).json({ error: 'Uploaded file exceeds the 15 MB size limit.', code: 'FILE_TOO_LARGE' });
          return;
        }
        if (mimeType === 'text/plain' || mimeType === 'text/csv') {
          const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
          parts.push({ text: `Quotation document (${fileName ?? 'document'}):\n\n${decoded}` });
        } else {
          parts.push({ inlineData: { mimeType, data: base64Data } });
        }
      }

      if (rawText && rawText.trim().length > 0) {
        parts.push({ text: `Quotation text:\n\n${rawText.slice(0, 60000)}` });
      }

      if (parts.length === 0) {
        res.status(400).json({ error: 'Provide a quotation file or quotation text to analyze.', code: 'EMPTY_INPUT' });
        return;
      }

      parts.push({
        text: 'Extract promised PV_MODULE, INVERTER, and BATTERY equipment entries from this quotation. Return null for any specification not explicitly present in the source document. Never invent missing specs.',
      });

      const response = await generateContentWithFallback(ai, {
        contents: { parts },
        config: {
          systemInstruction:
            'You are a photovoltaic procurement extraction assistant for MITHAQ-Lab. Extract ONLY explicitly stated equipment specifications from the quotation into structured JSON. NEVER guess, extrapolate, or invent missing manufacturer ratings (such as Voc, Vmp, Isc, Imp, temperature coefficients, or MPPT windows) if they are absent from the document—set missing fields to null and list any ambiguous items in uncertainFields or extractionWarnings.',
          responseMimeType: 'application/json',
          responseSchema: equipmentExtractionSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = parseJsonSafely<{ items: unknown[]; extractionWarnings: string[] }>(
        response.text,
      );
      if (!parsed.ok) {
        console.error('[MITHAQ-Lab Gemini] Unparseable quotation JSON:', parsed.preview);
        res.status(500).json({
          error: 'AI returned an unreadable response while parsing the quotation. Please retry or add items manually.',
          code: 'AI_INVALID_JSON',
        });
        return;
      }

      const sanitizedItems = Array.isArray(parsed.data.items)
        ? parsed.data.items.map((item) => {
            if (item && typeof item === 'object' && isValidEquipmentCategory((item as { category?: unknown }).category)) {
              return sanitizeSpecFieldsByCategory(
                (item as { category: EquipmentCategory }).category,
                item as Record<string, unknown>,
              );
            }
            return item;
          })
        : [];

      res.json({
        items: sanitizedItems,
        extractionWarnings: Array.isArray(parsed.data.extractionWarnings)
          ? parsed.data.extractionWarnings
          : [],
      });
    } catch (error) {
      res.status(getApiErrorStatus(error)).json({
        error: extractReadableError(error),
        code: getApiErrorCode(error),
      });
    }
  });

  app.post('/api/ai/extract-nameplate', async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(424).json({
          error:
            'Gemini API key is not configured on the server. Enter nameplate values manually or set GEMINI_API_KEY in Settings > Secrets.',
          code: 'AI_UNCONFIGURED',
        });
        return;
      }

      const { fileName, mimeType, base64Data, categoryHint } = req.body as {
        fileName?: string;
        mimeType?: string;
        base64Data?: string;
        categoryHint?: string;
      };

      if (!base64Data || !mimeType || !ALLOWED_IMAGE_MIMES.has(mimeType)) {
        res.status(400).json({
          error: 'Please upload a valid JPEG, PNG, or WebP photograph of the equipment nameplate.',
          code: 'INVALID_IMAGE',
        });
        return;
      }

      if (base64Data.length > MAX_BASE64_LENGTH) {
        res.status(400).json({ error: 'Image exceeds maximum allowed size.', code: 'FILE_TOO_LARGE' });
        return;
      }

      const targetCategory: EquipmentCategory | 'AUTO' = isValidEquipmentCategory(categoryHint)
        ? categoryHint
        : 'AUTO';
      const { schema, focus } = getCategorySchemaAndPrompt(targetCategory);

      const response = await generateContentWithFallback(ai, {
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            {
              text: `Read the visible technical nameplate sticker or rating plate in this photograph (${fileName ?? 'nameplate'}).\n${focus}\nExtract ONLY values clearly legible on the label. Never invent unreadable specifications. List ONLY missing or blurry fields belonging to this category in unreadableFields and set them to null.`,
            },
          ],
        },
        config: {
          systemInstruction:
            'You are an optical nameplate verification reader for MITHAQ-Lab. Identify equipment ONLY from visible printed text on the nameplate label—NEVER guess specifications from casing shape, color, or physical appearance. Extract strictly the parameters relevant to the target equipment category. Never invent unreadable values (set them to null), and NEVER report fields from another equipment category as missing.',
          responseMimeType: 'application/json',
          responseSchema: schema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = parseJsonSafely<Record<string, unknown>>(response.text);
      if (!parsed.ok) {
        console.error('[MITHAQ-Lab Gemini] Unparseable nameplate JSON:', parsed.preview);
        res.status(500).json({
          error: 'AI returned an unreadable response while reading the nameplate. Please retry or enter values manually.',
          code: 'AI_INVALID_JSON',
        });
        return;
      }

      const resolvedCategory: EquipmentCategory = isValidEquipmentCategory(targetCategory)
        ? targetCategory
        : isValidEquipmentCategory(parsed.data.category)
          ? parsed.data.category
          : 'PV_MODULE';

      const sanitized = sanitizeSpecFieldsByCategory(resolvedCategory, parsed.data);
      res.json(sanitized);
    } catch (error) {
      res.status(getApiErrorStatus(error)).json({
        error: extractReadableError(error),
        code: getApiErrorCode(error),
      });
    }
  });

  app.post('/api/ai/extract-datasheet', async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(424).json({
          error:
            'Gemini API key is not configured on the server. Enter missing specifications manually or set GEMINI_API_KEY in Settings > Secrets.',
          code: 'AI_UNCONFIGURED',
        });
        return;
      }

      const { category, fileName, mimeType, base64Data, rawText, manufacturerHint, modelHint } =
        req.body as {
          category?: string;
          fileName?: string;
          mimeType?: string;
          base64Data?: string;
          rawText?: string;
          manufacturerHint?: string | null;
          modelHint?: string | null;
        };

      if (!isValidEquipmentCategory(category)) {
        res.status(400).json({
          error: 'Valid equipment category (PV_MODULE, INVERTER, or BATTERY) is required.',
          code: 'INVALID_CATEGORY',
        });
        return;
      }

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (base64Data && mimeType) {
        if (!ALLOWED_QUOTATION_MIMES.has(mimeType)) {
          res.status(400).json({
            error: `Unsupported datasheet file type: ${mimeType}. Upload a PDF, image, TXT, or CSV file.`,
            code: 'INVALID_MIME',
          });
          return;
        }
        if (base64Data.length > MAX_BASE64_LENGTH) {
          res.status(400).json({
            error: 'Uploaded datasheet exceeds the 15 MB size limit.',
            code: 'FILE_TOO_LARGE',
          });
          return;
        }
        if (mimeType === 'text/plain' || mimeType === 'text/csv') {
          const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
          parts.push({ text: `Manufacturer datasheet (${fileName ?? 'datasheet'}):\n\n${decoded}` });
        } else {
          parts.push({ inlineData: { mimeType, data: base64Data } });
        }
      }

      if (rawText && rawText.trim().length > 0) {
        parts.push({ text: `Datasheet specifications text:\n\n${rawText.slice(0, 60000)}` });
      }

      if (parts.length === 0) {
        res.status(400).json({
          error: 'Provide a datasheet document (PDF/image/TXT) or paste datasheet specifications.',
          code: 'EMPTY_INPUT',
        });
        return;
      }

      const { schema, focus } = getCategorySchemaAndPrompt(category);
      const modelContext = [manufacturerHint, modelHint].filter(Boolean).join(' ');
      parts.push({
        text: `${focus}\n${
          modelContext
            ? `Target equipment model context (if multiple models appear in a multi-column table, prioritize the row/column matching "${modelContext}"): ${modelContext}.\n`
            : ''
        }Extract ONLY explicitly printed datasheet values for this category. Set absent specs to null. Never invent missing specs or report fields from other categories.`,
      });

      const response = await generateContentWithFallback(ai, {
        contents: { parts },
        config: {
          systemInstruction:
            'You are a technical datasheet extraction assistant for MITHAQ-Lab. Extract ONLY explicitly stated specifications matching the requested equipment category and model from the uploaded manufacturer datasheet. Never guess, interpolate, or invent unprinted values (set them to null), and never report cross-category fields as missing.',
          responseMimeType: 'application/json',
          responseSchema: schema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = parseJsonSafely<Record<string, unknown>>(response.text);
      if (!parsed.ok) {
        console.error('[MITHAQ-Lab Gemini] Unparseable datasheet JSON:', parsed.preview);
        res.status(500).json({
          error: 'AI returned an unreadable response while reading the datasheet. Please retry or enter specs manually.',
          code: 'AI_INVALID_JSON',
        });
        return;
      }

      const sanitized = sanitizeSpecFieldsByCategory(category, parsed.data);
      res.json({
        ...sanitized,
        sourceFileName: fileName ?? undefined,
      });
    } catch (error) {
      res.status(getApiErrorStatus(error)).json({
        error: extractReadableError(error),
        code: getApiErrorCode(error),
      });
    }
  });

  app.post('/api/ai/explain-audit', async (req, res) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(424).json({
          error: 'Gemini API key is not configured on the server.',
          code: 'AI_UNCONFIGURED',
        });
        return;
      }

      const { projectSummary, lang } = req.body as { projectSummary?: unknown; lang?: string };
      if (!projectSummary || typeof projectSummary !== 'object') {
        res.status(400).json({ error: 'Missing structured audit payload.', code: 'INVALID_INPUT' });
        return;
      }

      const isArabic = lang !== 'en';
      const languageInstruction = isArabic
        ? 'Write the response in clear, professional Arabic suitable for solar photovoltaic engineers and customers, while keeping international symbols and model numbers in Latin script (Voc, Vmp, Isc, Imp, MPPT, PV, DC, AC, model codes, units).'
        : 'Write the response in clear, plain English.';

      const response = await generateContentWithFallback(ai, {
        contents: `Summarize these verified MITHAQ-Lab audit comparison results and deterministic engineering checks in plain, neutral engineering language for the customer and inspector:\n\n${JSON.stringify(projectSummary, null, 2)}`,
        config: {
          systemInstruction: `You are an engineering audit technical writer for MITHAQ-Lab. ${languageInstruction} Explain discrepancies and deterministic calculation findings in clear, objective, plain language (3 short paragraphs max). STRICT RULES: (1) Never accuse a supplier or installer of fraud or intentional deception. (2) Never invent specifications or recalculate engineering numbers—quote only the provided results. (3) Never claim an installation is electrically safe.`,
        },
      });

      res.json({ commentary: response.text ?? '' });
    } catch (error) {
      res.status(getApiErrorStatus(error)).json({
        error: extractReadableError(error),
        code: getApiErrorCode(error),
      });
    }
  });

  // Never allow unmatched /api requests to fall through to Vite/SPA HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.', code: 'API_NOT_FOUND' });
  });

  // Ensure Express body-parser or middleware errors on /api return JSON instead of HTML
  app.use(
    (
      err: { status?: number; statusCode?: number; type?: string; message?: string },
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (req.path.startsWith('/api')) {
        const rawStatus = err.status ?? err.statusCode ?? 500;
        // Avoid 403/502/503/504 which upstream nginx proxy_intercept_errors replaces with HTML
        const status = [403, 502, 503, 504].includes(rawStatus)
          ? rawStatus === 403
            ? 400
            : 500
          : rawStatus;
        const message =
          err.type === 'entity.too.large'
            ? 'Uploaded file exceeds the maximum request payload limit.'
            : err.type === 'entity.parse.failed'
              ? 'Malformed JSON request payload.'
              : err.message || 'Internal server error.';
        res.status(status).json({ error: message, code: err.type ?? 'SERVER_ERROR' });
        return;
      }
      next(err);
    },
  );

  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');
  let viteServer: { close: () => Promise<void> } | null = null;

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    viteServer = vite;
    app.use(vite.middlewares);
  }

  const cliPortIdx = process.argv.indexOf('--port');
  const cliPort = cliPortIdx !== -1 ? Number(process.argv[cliPortIdx + 1]) : NaN;
  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  const resolvedEnvPort =
    Number.isFinite(envPort) && envPort > 0 && envPort !== nginxPort ? envPort : NaN;
  const port =
    Number.isFinite(cliPort) && cliPort > 0
      ? cliPort
      : Number.isFinite(resolvedEnvPort)
        ? resolvedEnvPort
        : Number(process.env.DEFAULT_APP_PORT ?? 3000);

  const cliHostIdx = process.argv.indexOf('--host');
  const host =
    cliHostIdx !== -1 && process.argv[cliHostIdx + 1]
      ? process.argv[cliHostIdx + 1]
      : '0.0.0.0';

  const httpServer = http.createServer(app);

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[MITHAQ-Lab] Received ${signal}, closing server...`);
    try {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
        httpServer.closeAllConnections?.();
        setTimeout(resolve, 1500).unref();
      });
      if (viteServer) {
        await viteServer.close();
      }
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGHUP', () => void shutdown('SIGHUP'));

  const listenWithRetry = (attempt = 1, maxAttempts = 6) => {
    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && attempt < maxAttempts && !isShuttingDown) {
        console.warn(
          `[MITHAQ-Lab] Port ${port} in use (attempt ${attempt}/${maxAttempts}), retrying in 400ms...`,
        );
        setTimeout(() => listenWithRetry(attempt + 1, maxAttempts), 400);
        return;
      }
      console.error(
        `[MITHAQ-Lab] Failed to bind ${host}:${port} (${err.code ?? err.message}).`,
      );
      void viteServer?.close().finally(() => process.exit(1));
    };

    httpServer.once('error', onError);
    httpServer.listen(port, host, () => {
      httpServer.off('error', onError);
      httpServer.on('error', (err) => {
        console.error('[MITHAQ-Lab] HTTP server error:', err);
      });
      console.log(`MITHAQ-Lab server listening on http://${host}:${port}`);
    });
  };

  listenWithRetry();
}

startServer().catch((err) => {
  console.error('[MITHAQ-Lab] Fatal server startup error:', err);
  process.exit(1);
});
