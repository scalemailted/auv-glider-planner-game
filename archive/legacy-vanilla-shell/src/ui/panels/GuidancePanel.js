const dismissedLevelIds = new Set();
const collapsedLevelIds = new Set();

export class GuidancePanel {
  constructor(root) {
    this.root = root;
  }

  render(prompts = [], options = {}) {
    if (!this.root) return;

    const levelId = options.levelId ?? 'default';
    if (!Array.isArray(prompts) || prompts.length === 0 || dismissedLevelIds.has(levelId)) {
      this.root.innerHTML = '';
      return;
    }

    const collapsed = collapsedLevelIds.has(levelId);
    this.root.innerHTML = `
      <section class="guidance-card ${collapsed ? 'collapsed' : ''}" aria-label="Tutorial guidance">
        <div class="guidance-header">
          <h3>Tutorial Guidance</h3>
          <div class="guidance-actions">
            <button id="btn-guidance-toggle" type="button">${collapsed ? 'Expand' : 'Collapse'}</button>
            <button id="btn-guidance-dismiss" type="button">Dismiss</button>
          </div>
        </div>
        <ol class="guidance-body">
          ${prompts.map((prompt) => `
            <li class="guidance-step">
              <strong>${escapeHtml(prompt.title ?? 'Planning step')}</strong>
              <p>${escapeHtml(prompt.body ?? '')}</p>
            </li>
          `).join('')}
        </ol>
      </section>
    `;

    this.root.querySelector('#btn-guidance-toggle')?.addEventListener('click', () => {
      if (collapsedLevelIds.has(levelId)) collapsedLevelIds.delete(levelId);
      else collapsedLevelIds.add(levelId);
      this.render(prompts, options);
    });

    this.root.querySelector('#btn-guidance-dismiss')?.addEventListener('click', () => {
      dismissedLevelIds.add(levelId);
      this.root.innerHTML = '';
    });
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
