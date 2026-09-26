import { el } from '../ui.js';
import { renderAdminPanel } from './community.js';

export function renderAdminPage(root) {
  const host = el('div.wrap.page-top', { style: { paddingBottom: '70px' } });
  root.append(host);
  renderAdminPanel(host);
}
