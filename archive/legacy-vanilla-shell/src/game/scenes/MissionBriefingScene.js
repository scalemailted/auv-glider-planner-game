import { downloadJSON, loadJSON, readJSONFile } from '../../core/io/ImportExport.js';
import { getLevelObjectiveSummary } from '../../core/campaign/LevelObjectives.js';

export class MissionBriefingScene {
  label = 'Mission Briefing';

  constructor(app) {
    this.app = app;
  }

  enter() {
    const { level, mission } = this.app.state;
    const scoring = mission?.scoring ?? {};
    const rules = mission?.rules ?? {};
    const mode = this.app.state.challengeMode ?? 'perfectKnowledge';
    const objectiveSummary = getLevelObjectiveSummary(level, mission);
    const criteria = level?.campaign?.successCriteria ?? {};

    this.app.setPanel(`
      <h2>Mission Briefing</h2>
      <p><strong>Level:</strong> ${level?.meta?.name ?? 'Unknown'}</p>
      <p><strong>Mission:</strong> ${mission?.meta?.name ?? 'Unknown'}</p>
      <p><strong>Challenge Mode:</strong> ${mode}</p>
      <p class="small">${mission?.meta?.description ?? ''}</p>
      <p class="small">${mode === 'forecast'
        ? 'Forecast mode shows ocean-inspired synthetic forecast fields during planning. The simulator scores against hidden truth.'
        : 'Perfect Knowledge mode shows the same truth fields used by the simulator.'}</p>
      <h3>Concept</h3>
      <p class="small">${objectiveSummary.concept}</p>
      <h3>Learning Objectives</h3>
      <ul class="small">${objectiveSummary.learningObjectives.map((item) => `<li>${item}</li>`).join('')}</ul>
      <h3>Objective</h3>
      <p class="small">Place glider waypoints to collect high-value ROI samples while using currents and avoiding hazards.</p>
      <h3>Success Criteria</h3>
      <ul class="small">
        <li>Minimum final score: ${criteria.minFinalScore ?? level?.campaign?.ratings?.bronze ?? 40}</li>
        <li>Minimum sample score: ${criteria.minSampleScore ?? rules.roiThreshold ?? 0.15}</li>
        <li>Maximum hazards hit: ${criteria.maxHazardsHit ?? 0}</li>
        <li>Maximum energy used: ${criteria.maxEnergyUsed ?? 'level dependent'}</li>
      </ul>
      <h3>Checklist</h3>
      <ul class="small">${objectiveSummary.missionObjectives.map((objective) => `<li>${objective.label}: ${objective.metric} ${objective.operator} ${objective.value}</li>`).join('')}</ul>
      <h3>Scoring</h3>
      <ul class="small">
        <li>Sample value x ${scoring.sampleWeight ?? 100}</li>
        <li>Energy penalty x ${scoring.energyPenalty ?? 0.05}</li>
        <li>Hazard penalty x ${scoring.hazardPenalty ?? 10}</li>
        <li>Elapsed time penalty x ${scoring.elapsedTimePenalty ?? 0.01}</li>
        <li>ROI sampling threshold ${rules.roiThreshold ?? 0.15}</li>
      </ul>
      <div class="panel-stack">
        <button id="btn-start-planning">Start Planning</button>
        <button id="btn-load-tutorial-mission">Reload Tutorial Mission</button>
        <button id="btn-export-mission">Export Mission JSON</button>
        <label class="file-control">Import Mission JSON <input id="mission-file" type="file" accept="application/json" /></label>
      </div>
    `);

    document.getElementById('btn-start-planning').onclick = () => this.app.goTo('planning');
    document.getElementById('btn-load-tutorial-mission').onclick = async () => {
      this.app.state.mission = await loadJSON('missions/tutorial_sampling.json');
      this.app.state.selectedAgentId = this.app.state.mission.agents?.[0]?.id ?? null;
      this.app.state.plan = null;
      this.app.toast('Tutorial mission loaded.', 'success');
      this.enter();
    };
    document.getElementById('btn-export-mission').onclick = () => downloadJSON('anchor_mission.json', this.app.state.mission);
    document.getElementById('mission-file').onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      this.app.state.mission = await readJSONFile(file);
      this.app.state.selectedAgentId = this.app.state.mission.agents?.[0]?.id ?? null;
      this.app.state.plan = null;
      this.app.toast('Mission imported.', 'success');
      this.enter();
    };
  }

  render(renderer) {
    renderer.drawLevelPreview(this.app.state.level);
  }
}
