export class ScorePanel {
  constructor(root) {
    this.root = root;
  }

  render(summary = {}) {
    this.root.innerHTML = `
      <h3>Score</h3>
      <div class="metric-grid">
        <div class="metric">Final<br><strong>${summary.finalScore ?? 0}</strong></div>
        <div class="metric">Sample<br><strong>${summary.sampleScore ?? 0}</strong></div>
        <div class="metric">Energy<br><strong>${summary.energyUsed ?? 0}</strong></div>
        <div class="metric">Hazards<br><strong>${summary.hazardsHit ?? 0}</strong></div>
      </div>
      <div class="score-components small">
        <div>Energy penalty: ${summary.energyPenalty ?? 0}</div>
        <div>Hazard penalty: ${summary.hazardPenalty ?? 0}</div>
        <div>Elapsed penalty: ${summary.elapsedTimePenalty ?? 0}</div>
        <div>Update penalty: ${summary.updatePenalty ?? 0}</div>
        <div>Replans: ${summary.replans ?? 0}</div>
        <div>Duplicate samples: ${summary.duplicateSamples ?? 0}</div>
        <div>Completed waypoints: ${summary.completedWaypoints ?? 0}</div>
        <div>Missed waypoints: ${summary.missedWaypoints ?? 0}</div>
        <div>Sampled cells: ${summary.sampledCells ?? 0}</div>
      </div>
    `;
  }
}
