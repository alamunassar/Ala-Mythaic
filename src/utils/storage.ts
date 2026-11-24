import { createDemoProject } from '../data/demoProject';
import {
  detectSimulatedMarkers,
  normalizeProvenance,
  resolveEquipmentProvenance,
} from '../engine/engineeringEngine';
import type { EquipmentSpec, SolarProject } from '../types/mithaq';

const STORAGE_KEY = 'mithaq_lab_projects_v1';
const ACTIVE_PROJECT_KEY = 'mithaq_lab_active_project_v1';

function normalizeEquipmentList(
  list: EquipmentSpec[],
  projectIsDemo: boolean,
): EquipmentSpec[] {
  return list.map((eq) => {
    const simulatedReasons = detectSimulatedMarkers(eq, projectIsDemo);
    const resolved = resolveEquipmentProvenance(eq, projectIsDemo);
    return {
      ...eq,
      maxPvOperatingCurrentA: eq.maxPvOperatingCurrentA ?? null,
      maxPvShortCircuitCurrentA: eq.maxPvShortCircuitCurrentA ?? null,
      minBatteryVoltageV: eq.minBatteryVoltageV ?? null,
      maxBatteryVoltageV: eq.maxBatteryVoltageV ?? null,
      provenance: resolved,
      verifiedByUser: simulatedReasons.length > 0 ? false : Boolean(eq.verifiedByUser),
    };
  });
}

export function normalizeLoadedProject(p: SolarProject): SolarProject {
  const isDemo = Boolean(p.isDemo);
  return {
    ...p,
    promisedEquipment: normalizeEquipmentList(p.promisedEquipment ?? [], isDemo),
    installedEquipment: normalizeEquipmentList(p.installedEquipment ?? [], isDemo),
    arrayConfig: {
      modulesPerString: p.arrayConfig?.modulesPerString ?? null,
      parallelStrings: p.arrayConfig?.parallelStrings ?? null,
      minAmbientTempC: p.arrayConfig?.minAmbientTempC ?? null,
      stcTempC: p.arrayConfig?.stcTempC ?? 25,
      provenance: isDemo
        ? 'SIMULATED'
        : normalizeProvenance(p.arrayConfig?.provenance),
    },
  };
}

export function loadProjects(): SolarProject[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = [createDemoProject()];
      saveProjects(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = [createDemoProject()];
      saveProjects(seeded);
      return seeded;
    }
    const freshDemo = createDemoProject();
    return (parsed as SolarProject[]).map((p) => {
      if (p.id === freshDemo.id && p.isDemo) {
        return freshDemo;
      }
      return normalizeLoadedProject(p);
    });
  } catch {
    return [createDemoProject()];
  }
}

export function saveProjects(projects: SolarProject[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // Handle quota exceeded gracefully by stripping oversized preview data URLs if needed
    const compact = projects.map((p) => ({
      ...p,
      installedEquipment: p.installedEquipment.map((eq) => ({
        ...eq,
        sourceImagePreview:
          eq.sourceImagePreview && eq.sourceImagePreview.startsWith('data:')
            ? undefined
            : eq.sourceImagePreview,
      })),
    }));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore secondary storage failure
    }
  }
}

export function loadActiveProjectId(projects: SolarProject[]): string {
  try {
    const saved = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (saved && projects.some((p) => p.id === saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return projects[0]?.id ?? '';
}

export function saveActiveProjectId(projectId: string): void {
  try {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  } catch {
    // ignore
  }
}

export function generateProjectId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MTH-${year}-${rand}`;
}
