/** ComfyUI API-format workflow injection: replace scene placeholders only.
 * User-controlled model/style prompts, LoRA nodes and workflow graph are preserved.
 * The workflow controls all literal values; only marked placeholders are substituted.
 */
export type WorkflowGraph = Record<string, { class_type: string; inputs: Record<string, unknown> }>;
export function injectComfyScene(workflow: WorkflowGraph, options: {
  scene: string; positive: string; negative: string; model?: string;
  width?: number; height?: number; steps?: number; cfg?: number; seed?: number;
}): WorkflowGraph {
  const graph: WorkflowGraph = JSON.parse(JSON.stringify(workflow));
  let hasPositive = false;
  for (const node of Object.values(graph)) {
    if (!node || typeof node !== "object" || !node.inputs) continue;
    for (const [key, value] of Object.entries(node.inputs)) {
      if (typeof value !== "string") continue;
      if (value.includes("{{SHIORIVIA_POSITIVE}}")) { node.inputs[key] = value.replaceAll("{{SHIORIVIA_POSITIVE}}", [options.positive, options.scene].filter(Boolean).join(", ")); hasPositive = true; }
      if (value.includes("{{SHIORIVIA_SCENE}}")) { node.inputs[key] = value.replaceAll("{{SHIORIVIA_SCENE}}", options.scene); hasPositive = true; }
      if (value.includes("{{SHIORIVIA_NEGATIVE}}")) node.inputs[key] = value.replaceAll("{{SHIORIVIA_NEGATIVE}}", options.negative);
      if (value === "{{SHIORIVIA_MODEL}}" && options.model) node.inputs[key] = options.model;
      if (value === "{{SHIORIVIA_WIDTH}}" && options.width) node.inputs[key] = options.width;
      if (value === "{{SHIORIVIA_HEIGHT}}" && options.height) node.inputs[key] = options.height;
      if (value === "{{SHIORIVIA_STEPS}}" && options.steps) node.inputs[key] = options.steps;
      if (value === "{{SHIORIVIA_CFG}}" && options.cfg) node.inputs[key] = options.cfg;
      if (value === "{{SHIORIVIA_SEED}}" && options.seed !== undefined) node.inputs[key] = options.seed;
    }
  }
  if (!hasPositive) throw new Error("Workflow needs {{SHIORIVIA_SCENE}} or {{SHIORIVIA_POSITIVE}} placeholder");
  return graph;
}
