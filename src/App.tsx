import { useEffect, useState } from 'react';
import {
  Activity,
  ClipboardList,
  Cpu,
  Download,
  FileBarChart2,
  FolderKanban,
  GitCompareArrows,
  LayoutDashboard,
  Menu,
  PlusCircle,
  Settings,
  X,
} from 'lucide-react';
import { ComparisonView } from './components/ComparisonView';
import { DashboardView } from './components/DashboardView';
import { EngineeringValidationView } from './components/EngineeringValidationView';
import { FieldMeasurementsView } from './components/FieldMeasurementsView';
import { InspectionWorkflowView } from './components/InspectionWorkflowView';
import { ProjectsView } from './components/ProjectsView';
import { ReportsView, SettingsView } from './components/ReportsAndSettingsView';
import { createDemoProject } from './data/demoProject';
import type { AppSection, SolarProject } from './types/mithaq';
import { downloadProjectPdfReport } from './utils/pdfReport';
import {
  loadActiveProjectId,
  loadProjects,
  saveActiveProjectId,
  saveProjects,
} from './utils/storage';

const NAV_ITEMS: {
  id: AppSection;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'new-inspection', label: 'New Inspection', icon: PlusCircle },
  { id: 'comparison', label: 'Equipment Comparison', icon: GitCompareArrows },
  { id: 'validation', label: 'Engineering Validation', icon: Cpu },
  { id: 'measurements', label: 'Field Measurements', icon: Activity },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [projects, setProjects] = useState<SolarProject[]>(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>(() =>
    loadActiveProjectId(loadProjects()),
  );
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    if (activeProjectId) {
      saveActiveProjectId(activeProjectId);
    }
  }, [activeProjectId]);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? createDemoProject();

  const handleUpdateProject = (updated: SolarProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleCreateProject = (newProj: SolarProject) => {
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveSection('new-inspection');
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      const nextList = remaining.length > 0 ? remaining : [createDemoProject()];
      if (activeProjectId === id) {
        setActiveProjectId(nextList[0].id);
      }
      return nextList;
    });
  };

  const handleResetDemo = () => {
    const demo = createDemoProject();
    setProjects((prev) => {
      const withoutDemo = prev.filter((p) => p.id !== demo.id);
      return [demo, ...withoutDemo];
    });
    setActiveProjectId(demo.id);
  };

  const handleSelectProject = (id: string, navigateTo?: AppSection) => {
    setActiveProjectId(id);
    if (navigateTo) {
      setActiveSection(navigateTo);
    }
  };

  const handleNavClick = (id: AppSection) => {
    setActiveSection(id);
    setMobileNavOpen(false);
  };

  const activeNavLabel = NAV_ITEMS.find((n) => n.id === activeSection)?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Dark Navy Engineering Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1528] text-slate-100 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Lockup */}
          <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold tracking-tight text-white font-display">
                MITHAQ-Lab
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Solar Verification &amp; Audit
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 8 Primary Navigation Sections */}
          <nav className="px-3 py-4 space-y-1" aria-label="Primary Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Slogan Footer */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium mb-1">
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            <span>Audit Principle</span>
          </div>
          What Was Promised vs. What Was Installed vs. What Was Verified.
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-md"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                MITHAQ-Lab
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">{activeNavLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <select
              value={activeProject.id}
              onChange={(e) => handleSelectProject(e.target.value)}
              aria-label="Active Solar Project"
              className="max-w-[200px] sm:max-w-[260px] px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-800 truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.customerName}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => downloadProjectPdfReport(activeProject)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        </header>

        {/* Workspace Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              project={activeProject}
              onNavigate={setActiveSection}
              onUpdateProject={handleUpdateProject}
            />
          )}
          {activeSection === 'projects' && (
            <ProjectsView
              projects={projects}
              activeProjectId={activeProject.id}
              onSelectProject={handleSelectProject}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onResetDemo={handleResetDemo}
            />
          )}
          {activeSection === 'new-inspection' && (
            <InspectionWorkflowView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
              onNavigate={setActiveSection}
            />
          )}
          {activeSection === 'comparison' && (
            <ComparisonView project={activeProject} onNavigate={setActiveSection} />
          )}
          {activeSection === 'validation' && (
            <EngineeringValidationView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
            />
          )}
          {activeSection === 'measurements' && (
            <FieldMeasurementsView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
            />
          )}
          {activeSection === 'reports' && <ReportsView project={activeProject} />}
          {activeSection === 'settings' && (
            <SettingsView
              projects={projects}
              onImportProjects={(imported) => {
                setProjects(imported);
                setActiveProjectId(imported[0].id);
              }}
              onResetDemo={handleResetDemo}
            />
          )}
        </main>
      </div>
    </div>
  );
}
