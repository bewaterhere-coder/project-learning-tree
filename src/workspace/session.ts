import {
  bootstrapLearningProject,
  dispatchCommand,
  type DomainSnapshot,
  type NodeId,
  type Ports,
  type ProjectId,
  type RepositoryEvidenceProvider,
  type UiCommand,
} from "../application/index.js";
import { defaultPorts, updateProjectMetadata } from "../domain/index.js";
import {
  clampArchivedPaneHeight,
  clampChatWidth,
  clampInspectorWidth,
  clampSidebarWidth,
  defaultProjectLayout,
  defaultShell,
  initialFloatingChatPosition,
} from "./defaults.js";
import type {
  ChatBinding,
  LearningWorkspace,
  NodePosition,
  ProjectWorkspace,
  ProjectWorkspaceLayout,
  Viewport,
  WorkspaceShellLayout,
} from "./types.js";

export function createWorkspace(
  snapshots: DomainSnapshot[],
  selectedProjectId?: ProjectId | null,
): LearningWorkspace {
  const projects = snapshots.map((snapshot) => ({
    projectId: snapshot.project.id,
    snapshot,
    layout: defaultProjectLayout(snapshot),
    archived: false,
  }));
  return {
    projects,
    selectedProjectId: resolveInitialSelection(projects, selectedProjectId),
    shell: defaultShell(),
  };
}

export function workspaceFromSnapshot(
  snapshot: DomainSnapshot,
): LearningWorkspace {
  return createWorkspace([snapshot]);
}

export function selectedProject(
  workspace: LearningWorkspace,
): ProjectWorkspace | undefined {
  if (workspace.selectedProjectId === null) {
    return undefined;
  }
  return workspace.projects.find(
    (project) =>
      project.projectId === workspace.selectedProjectId && !project.archived,
  );
}

export function activeProjects(
  workspace: LearningWorkspace,
): ProjectWorkspace[] {
  return workspace.projects.filter((project) => !project.archived);
}

export function archivedProjects(
  workspace: LearningWorkspace,
): ProjectWorkspace[] {
  return workspace.projects.filter((project) => project.archived);
}

export function selectProject(
  workspace: LearningWorkspace,
  projectId: ProjectId,
): LearningWorkspace {
  if (projectId === workspace.selectedProjectId) {
    return workspace;
  }
  const found = workspace.projects.find(
    (project) => project.projectId === projectId && !project.archived,
  );
  if (!found) {
    return workspace;
  }
  return {
    ...workspace,
    selectedProjectId: projectId,
    lastError: undefined,
    lastErrorCommand: undefined,
  };
}

export function applySelectedCommand(
  workspace: LearningWorkspace,
  command: UiCommand,
  ports?: Ports,
): LearningWorkspace {
  const current = selectedProject(workspace);
  if (!current) {
    return workspace;
  }
  const nextSession = dispatchCommand(
    {
      snapshot: current.snapshot,
      lastError: workspace.lastError,
      lastErrorCommand: workspace.lastErrorCommand,
    },
    command,
    ports,
  );
  return {
    ...workspace,
    lastError: nextSession.lastError,
    lastErrorCommand: nextSession.lastErrorCommand,
    projects: workspace.projects.map((project) =>
      project.projectId === current.projectId
        ? { ...project, snapshot: nextSession.snapshot }
        : project,
    ),
  };
}

export type CreateWorkspaceProjectOptions = {
  ports?: Ports;
  provider?: RepositoryEvidenceProvider;
};

export async function createWorkspaceProject(
  workspace: LearningWorkspace,
  command: { name?: string; source?: string; description?: string },
  portsOrOptions: Ports | CreateWorkspaceProjectOptions = {},
): Promise<LearningWorkspace> {
  const options = isPorts(portsOrOptions)
    ? { ports: portsOrOptions }
    : portsOrOptions;
  const result = await bootstrapLearningProject(
    {
      name: command.name?.trim() || "",
      source: command.source,
      description: command.description,
    },
    options.ports ?? defaultPorts(),
    options.provider,
    workspace.shell.locale,
  );
  if (!result.ok) {
    return {
      ...workspace,
      lastError: result.error,
      lastErrorCommand: "createProject",
    };
  }
  const project: ProjectWorkspace = {
    projectId: result.snapshot.project.id,
    snapshot: result.snapshot,
    layout: defaultProjectLayout(result.snapshot),
    archived: false,
    bootstrap: result.record,
  };
  return {
    ...workspace,
    projects: [...workspace.projects, project],
    selectedProjectId: project.projectId,
    lastError: undefined,
    lastErrorCommand: undefined,
  };
}

export function updateWorkspaceProjectMetadata(
  workspace: LearningWorkspace,
  projectId: ProjectId,
  command: { name: string; source?: string; description?: string },
): LearningWorkspace {
  const current = workspace.projects.find(
    (project) => project.projectId === projectId,
  );
  if (!current) {
    return workspace;
  }
  const result = updateProjectMetadata(current.snapshot, command);
  if (!result.ok) {
    return {
      ...workspace,
      lastError: result.error,
      lastErrorCommand: "updateProjectMetadata",
    };
  }
  return {
    ...workspace,
    lastError: undefined,
    lastErrorCommand: undefined,
    projects: workspace.projects.map((project) =>
      project.projectId === projectId
        ? { ...project, snapshot: result.snapshot }
        : project,
    ),
  };
}

export function archiveProject(
  workspace: LearningWorkspace,
  projectId: ProjectId,
): LearningWorkspace {
  const index = workspace.projects.findIndex(
    (project) => project.projectId === projectId,
  );
  const current = index >= 0 ? workspace.projects[index] : undefined;
  if (!current || current.archived) {
    return workspace;
  }
  const projects = workspace.projects.map((project, projectIndex) =>
    projectIndex === index ? { ...project, archived: true } : project,
  );
  return {
    ...workspace,
    projects,
    selectedProjectId:
      workspace.selectedProjectId === projectId
        ? nextActiveProjectId(projects, index)
        : workspace.selectedProjectId,
    lastError: undefined,
    lastErrorCommand: undefined,
  };
}

export function restoreProject(
  workspace: LearningWorkspace,
  projectId: ProjectId,
): LearningWorkspace {
  const current = workspace.projects.find(
    (project) => project.projectId === projectId,
  );
  if (!current || !current.archived) {
    return workspace;
  }
  return {
    ...workspace,
    projects: workspace.projects.map((project) =>
      project.projectId === projectId ? { ...project, archived: false } : project,
    ),
    selectedProjectId:
      workspace.selectedProjectId === null
        ? projectId
        : workspace.selectedProjectId,
    lastError: undefined,
    lastErrorCommand: undefined,
  };
}

export type DeleteArchivedProjectResult =
  | { workspace: LearningWorkspace; deleted: false }
  | { workspace: LearningWorkspace; deleted: true; projectId: ProjectId };

export function deleteArchivedProject(
  workspace: LearningWorkspace,
  projectId: ProjectId,
): DeleteArchivedProjectResult {
  const index = workspace.projects.findIndex(
    (project) => project.projectId === projectId,
  );
  const current = index >= 0 ? workspace.projects[index] : undefined;
  if (!current || !current.archived) {
    return { workspace, deleted: false };
  }
  const projects = workspace.projects.filter(
    (project) => project.projectId !== projectId,
  );
  return {
    deleted: true,
    projectId,
    workspace: {
      ...workspace,
      projects,
      selectedProjectId:
        workspace.selectedProjectId === projectId
          ? nextActiveProjectId(projects, -1)
          : workspace.selectedProjectId,
      lastError: undefined,
      lastErrorCommand: undefined,
    },
  };
}

export function normalizeWorkspaceSelection(
  workspace: LearningWorkspace,
): LearningWorkspace {
  if (workspace.selectedProjectId === null) {
    return workspace;
  }
  const selected = selectedProject(workspace);
  if (selected) {
    return workspace;
  }
  return {
    ...workspace,
    selectedProjectId: nextActiveProjectId(workspace.projects, -1),
  };
}

export function focusAndOpenInspector(
  workspace: LearningWorkspace,
  nodeId: NodeId,
): LearningWorkspace {
  const focused = applySelectedCommand(workspace, {
    type: "focusNode",
    nodeId,
  });
  return updateSelectedLayout(focused, { inspectorOpen: true });
}

export function updateShell(
  workspace: LearningWorkspace,
  patch: Partial<WorkspaceShellLayout>,
): LearningWorkspace {
  const next: WorkspaceShellLayout = {
    ...workspace.shell,
    ...patch,
  };
  if (patch.projectSidebarWidth !== undefined) {
    next.projectSidebarWidth = clampSidebarWidth(patch.projectSidebarWidth);
  }
  if (patch.archivedPaneHeight !== undefined) {
    next.archivedPaneHeight = clampArchivedPaneHeight(patch.archivedPaneHeight);
  }
  return { ...workspace, shell: next };
}

export function updateSelectedLayout(
  workspace: LearningWorkspace,
  patch: Partial<ProjectWorkspaceLayout>,
): LearningWorkspace {
  const current = selectedProject(workspace);
  if (!current) {
    return workspace;
  }
  return {
    ...workspace,
    projects: workspace.projects.map((project) => {
      if (project.projectId !== current.projectId) {
        return project;
      }
      const layout: ProjectWorkspaceLayout = {
        ...project.layout,
        ...patch,
        nodePositions:
          patch.nodePositions !== undefined
            ? { ...project.layout.nodePositions, ...patch.nodePositions }
            : project.layout.nodePositions,
        viewport:
          patch.viewport !== undefined
            ? { ...patch.viewport }
            : project.layout.viewport,
      };
      if (patch.inspectorWidth !== undefined) {
        layout.inspectorWidth = clampInspectorWidth(patch.inspectorWidth);
      }
      if (patch.chatWidth !== undefined) {
        layout.chatWidth = clampChatWidth(patch.chatWidth);
      }
      return { ...project, layout: normalizeLayoutBinding(project.snapshot, layout) };
    }),
  };
}

export function applyNodeDragStop(
  workspace: LearningWorkspace,
  positions: Record<NodeId, NodePosition>,
): LearningWorkspace {
  return updateSelectedLayout(workspace, { nodePositions: positions });
}

export function setSelectedViewport(
  workspace: LearningWorkspace,
  viewport: Viewport,
): LearningWorkspace {
  return updateSelectedLayout(workspace, { viewport: { ...viewport } });
}

export function setInspectorOpen(
  workspace: LearningWorkspace,
  inspectorOpen: boolean,
): LearningWorkspace {
  return updateSelectedLayout(workspace, { inspectorOpen });
}

export function openChat(workspace: LearningWorkspace): LearningWorkspace {
  const current = selectedProject(workspace);
  if (!current) {
    return workspace;
  }
  const patch: Partial<ProjectWorkspaceLayout> = {
    chatOpen: true,
    chatBinding: { mode: "follow-focus" },
  };
  if (
    current.layout.chatPositionOrigin === "auto" &&
    current.layout.chatPosition === undefined
  ) {
    const focusId = current.snapshot.pass.currentFocusNodeId;
    const nodePosition =
      focusId === undefined ? undefined : current.layout.nodePositions[focusId];
    patch.chatPosition = initialFloatingChatPosition(
      nodePosition,
      current.layout.viewport,
    );
  }
  return updateSelectedLayout(workspace, patch);
}

export function openChatForNode(
  workspace: LearningWorkspace,
  nodeId: NodeId,
): LearningWorkspace {
  const focused = applySelectedCommand(workspace, {
    type: "focusNode",
    nodeId,
  });
  return openChat(focused);
}

export function closeChat(workspace: LearningWorkspace): LearningWorkspace {
  return updateSelectedLayout(workspace, { chatOpen: false });
}

export function pinChatToNode(
  workspace: LearningWorkspace,
  nodeId: NodeId,
): LearningWorkspace {
  const current = selectedProject(workspace);
  if (!current) {
    return workspace;
  }
  return updateSelectedLayout(workspace, {
    chatBinding: {
      mode: "pinned",
      projectId: current.projectId,
      nodeId,
    },
  });
}

export function followCurrentNode(workspace: LearningWorkspace): LearningWorkspace {
  return updateSelectedLayout(workspace, {
    chatBinding: { mode: "follow-focus" },
  });
}

export function setChatPlacement(
  workspace: LearningWorkspace,
  chatPlacement: ProjectWorkspaceLayout["chatPlacement"],
): LearningWorkspace {
  return updateSelectedLayout(workspace, { chatPlacement });
}

export function moveFloatingChat(
  workspace: LearningWorkspace,
  chatPosition: { x: number; y: number },
): LearningWorkspace {
  return updateSelectedLayout(workspace, {
    chatPosition: { ...chatPosition },
    chatPositionOrigin: "user",
  });
}

export function normalizeChatBindings(
  workspace: LearningWorkspace,
): LearningWorkspace {
  return {
    ...workspace,
    projects: workspace.projects.map((project) => ({
      ...project,
      layout: normalizeLayoutBinding(project.snapshot, project.layout),
    })),
  };
}

function normalizeLayoutBinding(
  snapshot: DomainSnapshot,
  layout: ProjectWorkspaceLayout,
): ProjectWorkspaceLayout {
  return {
    ...layout,
    chatBinding: resolveStoredBinding(snapshot, layout.chatBinding),
  };
}

export function resolveStoredBinding(
  snapshot: DomainSnapshot,
  binding: ChatBinding,
): ChatBinding {
  if (binding.mode !== "pinned") {
    return { mode: "follow-focus" };
  }
  if (binding.projectId !== snapshot.project.id) {
    return { mode: "follow-focus" };
  }
  if (snapshot.nodes[binding.nodeId] === undefined) {
    return { mode: "follow-focus" };
  }
  return binding;
}

function resolveInitialSelection(
  projects: ProjectWorkspace[],
  selectedProjectId?: ProjectId | null,
): ProjectId | null {
  if (selectedProjectId === null) {
    return null;
  }
  if (
    selectedProjectId !== undefined &&
    projects.some(
      (project) =>
        project.projectId === selectedProjectId && !project.archived,
    )
  ) {
    return selectedProjectId;
  }
  return nextActiveProjectId(projects, -1);
}

function isPorts(value: Ports | CreateWorkspaceProjectOptions): value is Ports {
  return (
    typeof (value as Ports).now === "function" &&
    typeof (value as Ports).id === "function"
  );
}

function nextActiveProjectId(
  projects: ProjectWorkspace[],
  archivedIndex: number,
): ProjectId | null {
  for (let index = archivedIndex + 1; index < projects.length; index += 1) {
    const project = projects[index];
    if (project && !project.archived) {
      return project.projectId;
    }
  }
  for (let index = archivedIndex - 1; index >= 0; index -= 1) {
    const project = projects[index];
    if (project && !project.archived) {
      return project.projectId;
    }
  }
  return null;
}
