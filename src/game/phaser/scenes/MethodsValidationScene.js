import { markAnchorRouteReady } from '../../../app/production/AnchorAppBootReadiness.js';
import { downloadJSON, downloadText } from '../../../core/io/ImportExport.js';
import {
  buildScientificValidationViewModel,
  buildValidationSummaryCsv,
  loadOfficialValidationBaseline,
  runExploratoryValidationCheck,
  scientificValidationDebugPayload,
  selectedRawMetricCsv,
  selectedReportPlotData,
  selectedReproductionCommand
} from '../../../core/validation/ScientificValidationViewModel.js';
import { methodsValidationPanelHtml } from '../../../ui/validation/MethodsValidationPanel.js';

const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class MethodsValidationScene extends PhaserScene {
  constructor() {
    super('MethodsValidationScene');
    this.state = {
      presentationMode: 'learn',
      selectedComponentId: 'currents',
      selectedClaimId: null,
      exploratoryRerun: null,
      exploratoryRerunCount: 0,
      downloadCount: 0
    };
    this.baseline = null;
    this.viewModel = null;
  }

  create() {
    this.app = this.sys.game.anchorApp ?? globalThis.__anchorPhaserApp;
    if (!this.app) return;
    this.events?.once?.('shutdown', () => this.shutdown());
    this.events?.once?.('destroy', () => this.shutdown());
    this.app.clearPanels?.();
    this.app.setSceneLabel?.('Methods & Validation');
    this.mountRoot();
    this.render();
    this.loadBaseline();
  }

  shutdown() {
    const root = this.rootElement();
    if (root) {
      root.onclick = null;
      root.innerHTML = '';
      root.classList.remove('methods-validation-host');
    }
    this.publishDebug('shutdown');
  }

  mountRoot() {
    const root = this.rootElement();
    if (!root) return;
    root.classList.add('methods-validation-host');
    root.onclick = (event) => this.handleClick(event);
  }

  rootElement() {
    return this.app?.elements?.overlay?.modalRoot ?? null;
  }

  async loadBaseline() {
    try {
      this.baseline = await loadOfficialValidationBaseline();
      this.state.selectedComponentId = this.baseline.reports.find((report) => report.componentId === this.state.selectedComponentId)?.componentId ?? this.baseline.reports[0]?.componentId ?? null;
      this.render();
      markAnchorRouteReady('methods-validation', { resolvedRuntimeShell: 'default', officialBaselineLoaded: true });
    } catch (error) {
      const root = this.rootElement();
      if (root) root.innerHTML = `<main id="methods-validation-route" class="methods-validation-route"><section class="console-section"><h1>Methods &amp; Validation</h1><p>Validation baseline failed to load: ${escapeHtml(error?.message ?? error)}</p><button type="button" data-action="menu">Return to Product Hub</button></section></main>`;
      this.publishDebug('load-failed', [String(error?.message ?? error)]);
    }
  }

  render() {
    this.viewModel = buildScientificValidationViewModel(this.baseline, this.state);
    const root = this.rootElement();
    if (root) root.innerHTML = methodsValidationPanelHtml(this.viewModel);
    this.publishDebug('render');
  }

  handleClick(event) {
    const target = event.target;
    const component = target?.closest?.('[data-component-id]');
    if (component) {
      event.preventDefault();
      this.state.selectedComponentId = component.dataset.componentId;
      this.state.selectedClaimId = null;
      this.render();
      return;
    }
    const claim = target?.closest?.('[data-claim-id]');
    if (claim) {
      event.preventDefault();
      this.state.selectedClaimId = claim.dataset.claimId;
      this.render();
      return;
    }
    const button = target?.closest?.('[data-action]');
    if (!button) return;
    event.preventDefault();
    this.handleAction(button.dataset.action);
  }

  handleAction(action) {
    switch (action) {
      case 'validation-mode-learn':
        this.state.presentationMode = 'learn';
        this.render();
        break;
      case 'validation-mode-research':
        this.state.presentationMode = 'research';
        this.render();
        break;
      case 'run-validation-exploratory':
        this.state.exploratoryRerun = runExploratoryValidationCheck(this.viewModel);
        this.state.exploratoryRerunCount += 1;
        this.render();
        break;
      case 'download-validation-manifest':
        this.download('anchor_scientific_validation_manifest.json', this.viewModel.manifest);
        break;
      case 'download-validation-report':
        this.download('anchor_scientific_validation_report.json', this.viewModel.selectedReport);
        break;
      case 'download-validation-summary-csv':
        this.downloadText('anchor_scientific_validation_summary.csv', buildValidationSummaryCsv(this.viewModel), 'text/csv');
        break;
      case 'download-validation-metrics-csv':
        this.downloadText('anchor_scientific_validation_metrics.csv', selectedRawMetricCsv(this.viewModel), 'text/csv');
        break;
      case 'download-validation-plot-data':
        this.download('anchor_scientific_validation_plot_data.json', selectedReportPlotData(this.viewModel));
        break;
      case 'copy-validation-command':
        this.copyOrDownloadCommand();
        break;
      case 'menu':
        this.scene.start('MainMenuScene');
        break;
      default:
        break;
    }
  }

  download(filename, payload) {
    this.state.downloadCount += 1;
    downloadJSON(filename, payload);
    this.publishDebug('download');
  }

  downloadText(filename, text, mimeType) {
    this.state.downloadCount += 1;
    downloadText(filename, text, mimeType);
    this.publishDebug('download');
  }

  copyOrDownloadCommand() {
    const text = selectedReproductionCommand(this.viewModel);
    this.state.downloadCount += 1;
    const writePromise = globalThis.navigator?.clipboard?.writeText?.(text);
    if (writePromise && typeof writePromise.catch === 'function') {
      writePromise.catch(() => downloadText('anchor_validation_reproduction_command.txt', text, 'text/plain'));
    } else {
      downloadText('anchor_validation_reproduction_command.txt', text, 'text/plain');
    }
    this.publishDebug('copy-command');
  }

  publishDebug(reason = 'update', failures = []) {
    globalThis.ANCHOR_SCIENTIFIC_VALIDATION_DEBUG = {
      ...scientificValidationDebugPayload(this.viewModel, this.state),
      failures: [...(this.viewModel?.failures ?? []), ...failures],
      reason
    };
  }
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }