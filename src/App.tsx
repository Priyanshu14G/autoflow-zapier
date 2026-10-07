import React, { useState, useEffect } from 'react';
import { Workflow, WorkflowRun, Integration, Template, User, Workspace } from './types';
import { StorageService } from './services/storageService';
import { ExecutionEngine } from './services/executionEngine';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Sidebar, NavTab } from './components/navigation/Sidebar';
import { TopBar } from './components/navigation/TopBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { WorkflowsListView } from './components/workflows/WorkflowsListView';
import { WorkflowBuilder } from './components/builder/WorkflowBuilder';
import { WorkflowVersionsModal } from './components/workflows/WorkflowVersionsModal';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { TemplatesView } from './components/templates/TemplatesView';
import { RunsView } from './components/runs/RunsView';
import { RunDetailDrawer } from './components/runs/RunDetailDrawer';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { TeamView } from './components/team/TeamView';
import { BillingView } from './components/billing/BillingView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthModal } from './components/auth/AuthModal';
import { AIWorkflowGeneratorModal } from './components/ai/AIWorkflowGeneratorModal';

export function AppContent() {
  const { showToast } = useToast();

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  // Core entities
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(StorageService.getCurrentUser());
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(
    StorageService.getCurrentWorkspace()
  );

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAIArchitectOpen, setIsAIArchitectOpen] = useState(false);
  const [versionsModalWorkflow, setVersionsModalWorkflow] = useState<Workflow | null>(null);
  const [selectedRunForDrawer, setSelectedRunForDrawer] = useState<WorkflowRun | null>(null);

  // Initialize data on mount
  useEffect(() => {
    setWorkflows(StorageService.getWorkflows());
    setRuns(StorageService.getRuns());
    setIntegrations(StorageService.getIntegrations());
    setTemplates(StorageService.getTemplates());
  }, []);

  // Workflow Handlers
  const handleCreateWorkflow = () => {
    const newWf = StorageService.createWorkflow({
      name: 'New Custom Pipeline',
      description: 'Multi-step automation pipeline created from scratch.',
    });
    setWorkflows(StorageService.getWorkflows());
    setEditingWorkflow(newWf);
    showToast('New workflow created and ready for editing', 'success');
  };

  const handleDuplicateWorkflow = (id: string) => {
    const copy = StorageService.duplicateWorkflow(id);
    if (copy) {
      setWorkflows(StorageService.getWorkflows());
      showToast(`Duplicated into "${copy.name}"`, 'success');
    }
  };

  const handleDeleteWorkflow = (id: string) => {
    StorageService.deleteWorkflow(id);
    setWorkflows(StorageService.getWorkflows());
    showToast('Workflow deleted', 'info');
  };

  const handleToggleWorkflowStatus = (id: string) => {
    const updated = StorageService.toggleWorkflowStatus(id);
    if (updated) {
      setWorkflows(StorageService.getWorkflows());
      showToast(
        `Workflow status changed to ${updated.status}`,
        updated.status === 'active' ? 'success' : 'info'
      );
    }
  };

  // Template Handler: Creates a workflow and immediately opens the Builder!
  const handleUseTemplate = (template: Template) => {
    const newWf = StorageService.createWorkflow({
      name: template.name,
      description: template.description,
      nodes: template.workflowData.nodes,
      edges: template.workflowData.edges,
    });
    setWorkflows(StorageService.getWorkflows());
    setEditingWorkflow(newWf);
    showToast(`Template "${template.name}" loaded into visual editor!`, 'success');
  };

  // AI Architect Handler
  const handleApplyAIWorkflow = (workflowData: {
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  }) => {
    const newWf = StorageService.createWorkflow({
      name: workflowData.name,
      description: workflowData.description,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    });
    setWorkflows(StorageService.getWorkflows());
    setEditingWorkflow(newWf);
  };

  // Integration Toggle
  const handleToggleIntegration = (id: string, accountName?: string) => {
    StorageService.toggleIntegrationConnection(id, accountName);
    setIntegrations(StorageService.getIntegrations());
  };

  // Retry Workflow Run
  const handleRetryWorkflow = async (run: WorkflowRun) => {
    const targetWf = workflows.find((w) => w.id === run.workflowId) || workflows[0];
    if (!targetWf) return;

    showToast(`Executing retry on ${run.workflowName}...`, 'info');
    try {
      const newRun = await ExecutionEngine.executeWorkflow(targetWf);
      setRuns(StorageService.getRuns());
      setWorkflows(StorageService.getWorkflows());
      setSelectedRunForDrawer(newRun);
      showToast(`Retry completed successfully (${newRun.durationMs}ms)`, 'success');
    } catch (e) {
      showToast('Workflow retry encountered an error', 'error');
    }
  };

  // IF USER IS EDITING A WORKFLOW: SHOW FULLSCREEN BUILDER
  if (editingWorkflow) {
    return (
      <WorkflowBuilder
        initialWorkflow={editingWorkflow}
        onBack={() => {
          setEditingWorkflow(null);
          setWorkflows(StorageService.getWorkflows());
        }}
        onSave={(savedWf) => {
          setWorkflows(StorageService.getWorkflows());
          setEditingWorkflow(savedWf);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={(ws) => {
          setCurrentWorkspace(ws);
          StorageService.saveCurrentWorkspace(ws);
          showToast(`Switched workspace to ${ws.name}`, 'info');
        }}
        onOpenAIArchitect={() => setIsAIArchitectOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        workflowsCount={workflows.length}
        runsCount={runs.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <TopBar
          activeTab={activeTab}
          workspaceName={currentWorkspace.name}
          onCreateWorkflow={handleCreateWorkflow}
          onOpenAIArchitect={() => setIsAIArchitectOpen(true)}
        />

        {/* Viewport content */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              workflows={workflows}
              runs={runs}
              onCreateWorkflow={handleCreateWorkflow}
              onExploreTemplates={() => setActiveTab('templates')}
              onOpenAIArchitect={() => setIsAIArchitectOpen(true)}
              onSelectWorkflow={(wf) => setEditingWorkflow(wf)}
              onSelectRun={(run) => setSelectedRunForDrawer(run)}
            />
          )}

          {activeTab === 'workflows' && (
            <WorkflowsListView
              workflows={workflows}
              onSelectWorkflow={(wf) => setEditingWorkflow(wf)}
              onCreateWorkflow={handleCreateWorkflow}
              onOpenAIArchitect={() => setIsAIArchitectOpen(true)}
              onDuplicateWorkflow={handleDuplicateWorkflow}
              onDeleteWorkflow={handleDeleteWorkflow}
              onToggleStatus={handleToggleWorkflowStatus}
              onOpenVersions={(wf) => setVersionsModalWorkflow(wf)}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesView
              templates={templates}
              onUseTemplate={handleUseTemplate}
            />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsView
              integrations={integrations}
              onToggleConnection={handleToggleIntegration}
            />
          )}

          {activeTab === 'runs' && (
            <RunsView
              runs={runs}
              onRetryWorkflow={handleRetryWorkflow}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              workflows={workflows}
              runs={runs}
            />
          )}

          {activeTab === 'team' && <TeamView />}

          {activeTab === 'billing' && <BillingView />}

          {activeTab === 'settings' && (
            <SettingsView
              user={currentUser}
              workspace={currentWorkspace}
              onUpdateUser={(updated) => {
                setCurrentUser(updated);
                StorageService.saveCurrentUser(updated);
              }}
              onUpdateWorkspace={(updated) => {
                setCurrentWorkspace(updated);
                StorageService.saveCurrentWorkspace(updated);
              }}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onUserAuthenticated={(u) => {
          setCurrentUser(u);
          StorageService.saveCurrentUser(u);
        }}
      />

      <AIWorkflowGeneratorModal
        isOpen={isAIArchitectOpen}
        onClose={() => setIsAIArchitectOpen(false)}
        onApplyWorkflow={handleApplyAIWorkflow}
      />

      {versionsModalWorkflow && (
        <WorkflowVersionsModal
          workflow={versionsModalWorkflow}
          isOpen={Boolean(versionsModalWorkflow)}
          onClose={() => setVersionsModalWorkflow(null)}
          onRestoreVersion={(ver) => {
            const restoredWf = { ...versionsModalWorkflow, version: ver.version };
            StorageService.saveWorkflow(restoredWf);
            setWorkflows(StorageService.getWorkflows());
          }}
        />
      )}

      {selectedRunForDrawer && (
        <RunDetailDrawer
          run={selectedRunForDrawer}
          onClose={() => setSelectedRunForDrawer(null)}
          onRetryWorkflow={handleRetryWorkflow}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
