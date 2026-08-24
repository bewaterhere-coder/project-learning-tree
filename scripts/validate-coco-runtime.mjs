import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const read = (path) => readFileSync(join(root, path), 'utf8');
const requiredProjectFiles = [
  '.coco/project.md',
  '.coco/bootstrap.md',
  '.coco/project-runtime.md',
  '.coco/workflow-binding.md',
  '.coco/project-overrides.md',
  '.coco/task-state-model.md',
];

for (const path of requiredProjectFiles) {
  try {
    if (!statSync(join(root, path)).isFile()) failures.push(`not a file: ${path}`);
  } catch {
    failures.push(`missing project Runtime file: ${path}`);
  }
}

const bootstrap = read('.coco/bootstrap.md');
for (const path of requiredProjectFiles.filter((path) => path !== '.coco/bootstrap.md')) {
  if (!bootstrap.includes(path)) failures.push(`bootstrap omits: ${path}`);
}
if (bootstrap.includes('.coco/develop-workflow.md')) {
  failures.push('bootstrap uses removed .coco/develop-workflow.md');
}

const projectRuntime = read('.coco/project-runtime.md');
for (const token of [
  'repository: bewaterhere-coder/Coco-AI-OS',
  'manifest: coco.runtime.yaml',
  'id: project_development',
  'revision_policy: canonical_main',
]) {
  if (!projectRuntime.includes(token)) failures.push(`project Runtime omits: ${token}`);
}
if (/expected:[\s\S]*?revision:\s*[0-9a-f]{40}/i.test(projectRuntime)) {
  failures.push('project Runtime pins a commit SHA instead of canonical main');
}

const workflowBinding = read('.coco/workflow-binding.md');
if (!workflowBinding.includes('contract: contracts/development/workflow-core.md')) {
  failures.push('workflow binding does not use the canonical Workflow Core path');
}
if (!workflowBinding.includes('发送需求给 Cursor')) {
  failures.push('workflow binding omits the project development trigger');
}

if (!read('.coco/project.md').includes('.coco/bootstrap.md')) {
  failures.push('project context does not expose the Bootstrap recovery entry');
}
if (!read('AGENTS.md').includes('.coco/bootstrap.md')) {
  failures.push('agent instructions do not expose the project workflow Bootstrap');
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log('PASS project .coco Runtime files and Bootstrap references');
console.log('PASS canonical Workflow binding and revision policy');
console.log('PASS project command and Agent discovery');
