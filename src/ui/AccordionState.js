const STORAGE_KEY = 'anchorGliderCommand.ui.accordions.v1';

export function applyMissionConsoleAccordions(root, mode = 'default', defaults = {}, options = {}) {
  if (!root) return;
  const sections = [...root.querySelectorAll(':scope > .console-section')];
  if (!sections.length) return;
  const state = loadAccordionState();
  state[mode] ??= {};
  for (const [index, section] of sections.entries()) {
    if (section.dataset.accordionReady === 'true') continue;
    if (section.hidden) continue;
    const titleElement = section.querySelector(':scope > h2, :scope > h3, :scope > span, :scope > strong');
    const title = meaningfulTitle(titleElement?.textContent, section, index);
    if (!title) {
      flattenOrRemoveSection(section);
      continue;
    }
    if (section.dataset.keepTitle === 'true') {
      renderNonAccordionSection(section, title, titleElement);
      continue;
    }
    if (!shouldRenderAsAccordionSection({ title, items: sectionItems(section, titleElement) })) {
      renderNonAccordionSection(section, title, titleElement);
      continue;
    }
    const key = section.dataset.accordionKey || slugify(title);
    const expanded = state[mode][key] ?? defaults[key] ?? defaults[title] ?? !options.defaultCollapsed;
    section.dataset.accordionKey = key;
    section.dataset.accordionReady = 'true';
    section.classList.add('accordion-section');

    const body = document.createElement('div');
    body.className = 'accordion-body';
    while (section.firstChild) {
      const child = section.firstChild;
      section.removeChild(child);
      if (child !== titleElement) body.appendChild(child);
    }
    if (!hasMeaningfulBody(body)) {
      section.remove();
      continue;
    }

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'accordion-header';
    header.setAttribute('aria-expanded', String(Boolean(expanded)));
    header.innerHTML = `
      <span class="accordion-title">${escapeHtml(title)}</span>
      <span class="accordion-caret" aria-hidden="true"></span>
    `;
    header.addEventListener('click', () => {
      const open = section.classList.contains('collapsed');
      setAccordionExpanded(section, open);
      const next = loadAccordionState();
      next[mode] ??= {};
      next[mode][key] = open;
      saveAccordionState(next);
    });

    section.append(header, body);
    if (!expanded) setAccordionExpanded(section, false);
    else setAccordionExpanded(section, true);
  }
}

export function shouldRenderAsAccordionSection(section) {
  if (!section) return false;
  if (!section.title || isPlaceholderTitle(section.title)) return false;
  if (!section.items || section.items.length === 0) return false;

  const meaningfulItems = section.items.filter((item) => !item.hidden);
  if (meaningfulItems.length === 0) return false;

  if (
    meaningfulItems.length === 1 &&
    ['button', 'status', 'text'].includes(meaningfulItems[0].type)
  ) {
    return false;
  }

  return true;
}

export function getAccordionDefaults(mode) {
  const defaults = {
    idle: {
      'challenge-mode': true,
      'simulation-lab': false,
      idle: false,
      status: false
    },
    flowDemo: {
      'field-mode': true,
      fields: true,
      'additive-layers': true,
      partitioned: false,
      terrain: true,
      controls: true,
      'magnitude-range': false
    },
    roiDemo: {
      distribution: true,
      shape: true,
      time: true,
      'field-stats': false
    },
    tutorial: {
      'tutorial-campaign': true,
      progress: false
    },
    leaderboard: {
      filters: true,
      actions: true
    },
    scenarioSetup: {
      'mission-mode': true,
      'advanced-setup': false,
      'core-settings': true,
      generation: true,
      preview: true
    },
    briefing: {
      start: true,
      'mission-conditions': true,
      scoring: false,
      'tutorial-guidance': false
    },
    planning: {
      'active-plan': true,
      plan: true,
      'view-layers': true,
      analysis: false,
      'route-estimate': false,
      'selected-glider': false,
      'glider-performance': false,
      'mission-tools': false
    },
    simulation: {
      playback: true,
      'simulation-status': true,
      'recent-events': false
    },
    editor: {
      'editor-status': true,
      'level-setup': true,
      'brush-tools': true,
      'current-field': false,
      'level-actions': true,
      layers: true,
      'mission-rules': false,
      validation: false
    },
    debrief: {
      actions: true,
      'mission-results': true,
      'mission-actions': false,
      exports: true,
      'solver-comparison': false
    },
    import: {
      import: true,
      play: true,
      status: false
    },
    dataset: {
      generation: true,
      exports: true,
      status: false
    },
    savedLevels: {
      'legacy-saved-levels': true,
      'saved-levels': false
    }
  };
  return defaults[mode] ?? {};
}

function setAccordionExpanded(section, expanded) {
  section.classList.toggle('collapsed', !expanded);
  const header = section.querySelector(':scope > .accordion-header');
  const body = section.querySelector(':scope > .accordion-body');
  header?.setAttribute('aria-expanded', String(Boolean(expanded)));
  if (body) body.hidden = !expanded;
}

function loadAccordionState() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function saveAccordionState(state) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // UI state persistence is optional.
  }
}

function slugify(value) {
  return String(value ?? 'section')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function meaningfulTitle(value, section, index) {
  const raw = String(value ?? '').trim();
  if (raw && !isPlaceholderTitle(raw)) return raw;
  const key = section?.dataset?.accordionKey;
  if (key && !isPlaceholderTitle(key)) return titleFromKey(key);
  if (section?.classList?.contains('console-status')) return index === 0 ? 'Status' : 'Console Status';
  return '';
}

function isPlaceholderTitle(value) {
  return /^(section|section[-_\s]*\d+|\d+)$/i.test(String(value ?? '').trim());
}

function titleFromKey(value) {
  return String(value ?? '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sectionItems(section, titleElement = null) {
  return [...section.childNodes]
    .filter((node) => node !== titleElement)
    .map(sectionItem)
    .filter(Boolean);
}

function sectionItem(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.trim();
    return text ? { type: 'text', hidden: false, node, text } : null;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const hidden = node.hidden || node.getAttribute('aria-hidden') === 'true';
  const text = node.textContent.trim();
  const hasControls = Boolean(node.matches('button,input,select,textarea,a,label') || node.querySelector?.('button,input,select,textarea,a,label'));
  if (!text && !hasControls) return null;
  if (node.matches('button, .console-button')) return { type: 'button', hidden, node, text };
  if (!hasControls && text.length <= 180) return { type: 'status', hidden, node, text };
  if (!hasControls) return { type: 'text', hidden, node, text };
  return { type: 'group', hidden, node, text };
}

function renderNonAccordionSection(section, title, titleElement = null) {
  const items = sectionItems(section, titleElement).filter((item) => !item.hidden);
  if (!items.length) {
    section.remove();
    return;
  }
  if (section.dataset.keepTitle === 'true') {
    section.dataset.accordionReady = 'true';
    section.classList.add('non-accordion-section');
    return;
  }
  if (items.length === 1 && items[0].type === 'button') {
    section.replaceWith(items[0].node);
    return;
  }
  if (items.length === 1 && ['status', 'text'].includes(items[0].type)) {
    const status = document.createElement('section');
    status.className = 'console-status';
    status.dataset.compactSection = 'true';
    const label = document.createElement('span');
    label.textContent = title;
    status.append(label);
    status.append(items[0].node);
    section.replaceWith(status);
    return;
  }
  flattenOrRemoveSection(section);
}

function hasMeaningfulBody(body) {
  return [...body.childNodes].some((node) => {
    if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent.trim());
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    if (node.hidden) return false;
    return Boolean(node.textContent.trim()) || node.querySelector?.('button,input,select,textarea,a,label');
  });
}

function flattenOrRemoveSection(section) {
  const children = [...section.childNodes];
  const visibleChildren = children.filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent.trim());
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    return !node.hidden && (Boolean(node.textContent.trim()) || node.querySelector?.('button,input,select,textarea,a,label'));
  });
  if (visibleChildren.length === 1 && visibleChildren[0].nodeType === Node.ELEMENT_NODE && visibleChildren[0].matches('button, .console-button')) {
    section.replaceWith(visibleChildren[0]);
    return;
  }
  section.remove();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
