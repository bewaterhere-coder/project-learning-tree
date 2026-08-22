import { Handle, Position } from "@xyflow/react";
import { SOURCE_HANDLES, TARGET_HANDLES } from "./edge-routing.js";

const HANDLES = [
  { type: "target" as const, position: Position.Top, id: TARGET_HANDLES.top },
  {
    type: "target" as const,
    position: Position.Right,
    id: TARGET_HANDLES.right,
  },
  {
    type: "target" as const,
    position: Position.Bottom,
    id: TARGET_HANDLES.bottom,
  },
  { type: "target" as const, position: Position.Left, id: TARGET_HANDLES.left },
  { type: "source" as const, position: Position.Top, id: SOURCE_HANDLES.top },
  {
    type: "source" as const,
    position: Position.Right,
    id: SOURCE_HANDLES.right,
  },
  {
    type: "source" as const,
    position: Position.Bottom,
    id: SOURCE_HANDLES.bottom,
  },
  { type: "source" as const, position: Position.Left, id: SOURCE_HANDLES.left },
];

export function LearningNodeHandles() {
  return (
    <>
      {HANDLES.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          isConnectable={false}
        />
      ))}
    </>
  );
}
