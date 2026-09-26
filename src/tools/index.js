/* ============================================================
   Tool registry — merges catalog metadata with implementations.
   Each tool: { id, name, cat, icon, desc, keys, mount(container) }
   mount is auto-built from `fields + compute` OR provided custom.
   ============================================================ */
import { TOOLS, TOOL_MAP, CATEGORIES, toolsByCat, searchTools, catalogForAI } from '../data/catalog.js';
import { mountFormTool } from './formkit.js';
import { DAILY_IMPLS } from './daily.js';
import { INTERNET_IMPLS } from './internet.js';
import { ESSENTIAL_IMPLS } from './essentials.js';
import { CODING_IMPLS } from './coding.js';

const IMPLS = {
  ...DAILY_IMPLS,
  ...INTERNET_IMPLS,
  ...ESSENTIAL_IMPLS,
  ...CODING_IMPLS,
};

export function getTool(id) {
  const meta = TOOL_MAP[id];
  if (!meta) return null;
  const impl = IMPLS[id];
  if (!impl) return null;
  if (impl.mount) return { ...meta, mount: impl.mount, help: impl.help };
  return {
    ...meta,
    help: impl.help,
    mount: (container) => container.append(mountFormTool(impl)),
  };
}

export function getAllTools() {
  return TOOLS.map((t) => getTool(t.id)).filter(Boolean);
}

export { TOOLS, TOOL_MAP, CATEGORIES, toolsByCat, searchTools, catalogForAI };
