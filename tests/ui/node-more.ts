/** Shared TASK-009 UI helpers for node More-menu actions. */
import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

export async function openNodeMore(user: UserEvent, nodeId: string): Promise<void> {
  await user.click(screen.getByTestId(`node-more-${nodeId}`));
}

export async function clickNodeComplete(user: UserEvent, nodeId: string): Promise<void> {
  await openNodeMore(user, nodeId);
  await user.click(screen.getByTestId(`node-complete-${nodeId}`));
}

export async function openNodeInspector(user: UserEvent, nodeId: string): Promise<void> {
  await openNodeMore(user, nodeId);
  await user.click(screen.getByTestId(`node-open-inspector-${nodeId}`));
}
