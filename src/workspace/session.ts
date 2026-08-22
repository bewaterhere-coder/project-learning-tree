import {
  dispatchCommand,
  type DomainSnapshot,
  type NodeId,
  type Ports,
  type ProjectId,
  type UiCommand,
} from "../application/index.js";
import {
  clampInspectorWidth,
  clampSidebarWidth,
  defaultProjectLayout,
  defaultShell,
} from "./defaults.js";
import type {
  LearningWorkspace,
  NodePosition,
  ProjectWorkspace,
  ProjectWorkspaceLayout,
  Viewport,
  WorkspaceShellLayout,
} from "./types.js";

export function createWorkspace(
  snapshots: DomainSnapshot[],
  selectedProjectId?: ProjectId,
): LearningWorkspace {
  if (snapshots.length === 0) {
    throw new Error("LearningWorkspace requires at least one project");
  }
  const projects = snapshots.map((snapshot) => ({
    projectId: snapshot.project.id,
    snapshot,
    layout: defaultProjectLayout(snapshot),
  }));
  const selected =
    selectedProjectId !== undefined &&
    projects.some((project) => project.projectId === selectedProjectId)
      ? selectedProjectId
      : projects[0]!.projectId;
  return {
    projects,
    selectedProjectId: selected,
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
): ProjectWorkspace {
  const found = workspace.projects.find(
    (project) => project.projectId === workspace.selectedProjectId,
  );
  if (!found) {
    throw new Error(
      `Selected project ${workspace.selectedProjectId} is missing from the workspace`,
    );
  }
  return found;
}

export function selectProject(
  workspace: LearningWorkspace,
  projectId: ProjectId,
): LearningWorkspace {
  if (
    projectId === workspace.selectedProjectId ||
    !workspace.projects.some((project) => project.projectId === projectId)
  ) {
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
      project.projectId === workspace.selectedProjectId
        ? { ...project, snapshot: nextSession.snapshot }
        : project,
    ),
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
  return { ...workspace, shell: next };
}

export function updateSelectedLayout(
  workspace: LearningWorkspace,
  patch: Partial<ProjectWorkspaceLayout>,
): LearningWorkspace {
  return {
    ...workspace,
    projects: workspace.projects.map((project) => {
      if (project.projectId !== workspace.selectedProjectId) {
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
      return { ...project, layout };
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
