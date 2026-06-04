export class MainMenuScene {
  label = 'Main Menu';

  constructor(app) {
    this.app = app;
  }

  enter() {
    this.app.setPanel(`
      <h2 class="scene-title">ANCHOR: Glider Command</h2>
      <p class="small">Plan AUV/glider sampling missions across dynamic ocean-inspired fields.</p>
      <div class="menu-grid">
        <button id="btn-levels">Campaign</button>
        <button id="btn-briefing">Mission Briefing</button>
        <button id="btn-planning">Start Planning</button>
        <button id="btn-editor">Sandbox / Level Generator</button>
        <button id="btn-solver">Solver Challenge</button>
        <button id="btn-dataset">Dataset Export</button>
      </div>
      <h3>How to Play</h3>
      <p class="small">Currents drift gliders, energy limits long routes, hazards penalize risky paths, and forecast mode hides truth until simulation.</p>
    `);

    document.getElementById('btn-levels').onclick = () => this.app.goTo('levelSelect');
    document.getElementById('btn-briefing').onclick = () => this.app.goTo('briefing');
    document.getElementById('btn-planning').onclick = () => this.app.goTo('planning');
    document.getElementById('btn-editor').onclick = () => this.app.goTo('levelEditor');
    document.getElementById('btn-solver').onclick = () => this.app.goTo('planning');
    document.getElementById('btn-dataset').onclick = () => this.app.goTo('datasetExport');
  }

  render(renderer) {
    renderer.drawTitleCard('ANCHOR: Glider Command', 'A mission-planning puzzle for autonomous ocean gliders.');
  }
}
