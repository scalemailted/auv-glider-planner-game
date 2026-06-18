export const ANCHOR_VIEW_CONTRACT_VERSION = 'anchor-view-contract-mig-r2';

export function createAnchorViewContract(id, patch = {}) {
  return {
    type: 'anchor.view.contract',
    version: ANCHOR_VIEW_CONTRACT_VERSION,
    id,
    ownsMissionLifecycle: false,
    ownsSimulationPhysics: false,
    ownsScoring: false,
    ownsPlanningState: false,
    usesPhaserScene: false,
    ...patch
  };
}

export function createDomElement(documentRef, tagName, className = '', text = '') {
  const el = documentRef.createElement(tagName);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

export function button(documentRef, label, onClick, className = 'anchor-dom-button') {
  const el = createDomElement(documentRef, 'button', className, label);
  el.type = 'button';
  el.addEventListener?.('click', onClick);
  return el;
}

export function panel(documentRef, title, body = '') {
  const section = createDomElement(documentRef, 'section', 'anchor-dom-panel');
  const heading = createDomElement(documentRef, 'h2', 'anchor-dom-heading', title);
  section.appendChild(heading);
  if (body) {
    const p = createDomElement(documentRef, 'p', 'anchor-dom-copy', body);
    section.appendChild(p);
  }
  return section;
}

export function metricList(documentRef, items = []) {
  const dl = createDomElement(documentRef, 'dl', 'anchor-dom-metrics');
  for (const item of items) {
    const dt = createDomElement(documentRef, 'dt', '', item.label);
    const dd = createDomElement(documentRef, 'dd', '', String(item.value ?? ''));
    dl.append(dt, dd);
  }
  return dl;
}

export function formatNumber(value, digits = 1) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : 'n/a';
}
