# Provisional Requirement — Canvas Node Layout Simplification

Status: provisional
Slug: node-layout-simplification

This provisional artifact exists only to establish an independent GitHub PR lineage before the canonical PR-backed Task ID is allocated.

Requirement summary:
- Remove project-information presentation from the canvas; canvas should focus on learning nodes and edges.
- Simplify each node to a single visual/card layer rather than an outer container plus inner content layer.
- Add one-click automatic layout presets for top-to-bottom, bottom-to-top, left-to-right, and right-to-left tree arrangements.
- Automatic layout changes node coordinates only; it must not change semantic node/edge relationships or node content.
- After automatic layout, every node remains independently draggable; later re-layout recomputes positions from the current graph.
