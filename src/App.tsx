import { useEffect, useState } from 'react';
import {
  Activity,
  ClipboardList,
  Cpu,
  Download,
  FileBarChart2,
  FlaskConical,
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
import {
  createDemoProject,
  DEMO_SCENARIOS,
  loadScenarioIntoProjects,
  type DemoScenarioId,
} from './data/demoProject';
import { useI18n } from './i18n/I18nContext';
import type { AppSection, SolarProject } from './types/mithaq';
import { downloadProjectPdfReport } from './utils/pdfReport';
import {
  loadActiveProjectId,
  loadProjects,
  saveActiveProjectId,
  saveProjects,
} from './utils/storage';

export default function App() {
  const { lang, dir, setLang, tr } = useI18n();
  const [projects, setProjects] = useState<SolarProject[]>(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>(() =>
    loadActiveProjectId(loadProjects()),
  );
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [projectEpoch, setProjectEpoch] = useState(0);

  const navItems: {
    id: AppSection;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
    { id: 'dashboard', label: tr.nav.dashboard, icon: LayoutDashboard },
    { id: 'projects', label: tr.nav.projects, icon: FolderKanban },
    { id: 'new-inspection', label: tr.nav.newInspection, icon: PlusCircle },
    { id: 'comparison', label: tr.nav.comparison, icon: GitCompareArrows },
    { id: 'validation', label: tr.nav.validation, icon: Cpu },
    { id: 'measurements', label: tr.nav.measurements, icon: Activity },
    { id: 'reports', label: tr.nav.reports, icon: FileBarChart2 },
    { id: 'settings', label: tr.nav.settings, icon: Settings },
  ];

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

  const handleLoadScenario = (
    scenarioId: DemoScenarioId,
    navigateTo?: AppSection,
  ) => {
    const def = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    setProjects((prev) => loadScenarioIntoProjects(prev, scenarioId).projects);
    if (def) {
      setActiveProjectId(def.projectId);
    }
    setProjectEpoch((n) => n + 1);
    if (navigateTo) {
      setActiveSection(navigateTo);
    }
    setMobileNavOpen(false);
  };

  const handleResetDemo = () => {
    handleLoadScenario('mismatch');
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

  const activeNavLabel = navItems.find((n) => n.id === activeSection)?.label ?? tr.nav.dashboard;

  return (
    <div dir={dir} className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Dark Navy Engineering Sidebar */}
      <aside
        className={`fixed inset-y-0 start-0 z-50 w-64 bg-[#0B1528] text-slate-100 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileNavOpen
            ? 'translate-x-0'
            : dir === 'rtl'
              ? 'translate-x-full'
              : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Lockup */}
          <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold tracking-tight text-white font-display" dir="ltr">
                {tr.meta.brand}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {tr.meta.subtitle}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded"
              aria-label={tr.nav.closeMenu}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 8 Primary Navigation Sections */}
          <nav className="px-3 py-4 space-y-1" aria-label={tr.nav.primaryNav}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap text-start ${
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

        {/* Demo Scenarios (SIMULATED) + Slogan Footer */}
        <div className="border-t border-slate-800">
          <div className="px-3 py-3 border-b border-slate-800/80 space-y-1.5">
            <div className="px-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              <span className="inline-flex items-center gap-1">
                <FlaskConical className="w-3 h-3 shrink-0" />
                {tr.scenarios.sidebarTitle}
              </span>
              <span dir="ltr">{tr.common.simBadge}</span>
            </div>
            <div className="space-y-1">
              {DEMO_SCENARIOS.map((sc) => {
                const isSelected = activeProject.id === sc.projectId;
                const scText = tr.scenarios.items[sc.id];
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleLoadScenario(sc.id, 'dashboard')}
                    title={scText.description}
                    className={`w-full text-start px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="truncate">{scText.shortTitle}</span>
                    {isSelected && (
                      <span className="text-[9px] font-mono text-amber-300 shrink-0">
                        {tr.common.active}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 text-[11px] text-slate-400 leading-relaxed">
            <div className="flex items-center gap-1.5 text-slate-200 font-medium mb-1">
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span>{tr.meta.sloganTitle}</span>
            </div>
            {tr.meta.slogan}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-md"
              aria-label={tr.nav.openMenu}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap" dir="ltr">
                {tr.meta.brand}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">{activeNavLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              role="group"
              aria-label={tr.langSwitcher.ariaLabel}
              className="inline-flex items-center rounded-md border border-slate-300 bg-slate-50 p-0.5 text-[11px] font-semibold"
            >
              <button
                type="button"
                onClick={() => setLang('ar')}
                aria-pressed={lang === 'ar'}
                className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                  lang === 'ar'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tr.langSwitcher.arLabel}
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                  lang === 'en'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tr.langSwitcher.enLabel}
              </button>
            </div>

            <select
              value={activeProject.id}
              onChange={(e) => handleSelectProject(e.target.value)}
              aria-label={tr.header.activeProjectAria}
              className="max-w-[160px] sm:max-w-[240px] px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-800 truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.customerName}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => downloadProjectPdfReport(activeProject, lang)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {tr.header.exportPdf}
            </button>
          </div>
        </header>

        {/* Workspace Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              key={`${activeProject.id}-${projectEpoch}`}
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
              onLoadScenario={(scenarioId) => handleLoadScenario(scenarioId, 'dashboard')}
            />
          )}
          {activeSection === 'new-inspection' && (
            <InspectionWorkflowView
              key={`${activeProject.id}-${projectEpoch}`}
              project={activeProject}
              onUpdateProject={handleUpdateProject}
              onNavigate={setActiveSection}
            />
          )}
          {activeSection === 'comparison' && (
            <ComparisonView
              key={`${activeProject.id}-${projectEpoch}`}
              project={activeProject}
              onNavigate={setActiveSection}
            />
          )}
          {activeSection === 'validation' && (
            <EngineeringValidationView
              key={`${activeProject.id}-${projectEpoch}`}
              project={activeProject}
              onUpdateProject={handleUpdateProject}
            />
          )}
          {activeSection === 'measurements' && (
            <FieldMeasurementsView
              key={`${activeProject.id}-${projectEpoch}`}
              project={activeProject}
              onUpdateProject={handleUpdateProject}
            />
          )}
          {activeSection === 'reports' && (
            <ReportsView
              key={`${activeProject.id}-${projectEpoch}`}
              project={activeProject}
            />
          )}
          {activeSection === 'settings' && (
            <SettingsView
              projects={projects}
              onImportProjects={(imported) => {
                setProjects(imported);
                setActiveProjectId(imported[0].id);
                setProjectEpoch((n) => n + 1);
              }}
              onResetDemo={handleResetDemo}
            />
          )}
        </main>
      </div>
    </div>
  );
}
