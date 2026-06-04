import {
  formatMissionTime,
  getPlanningWindowCount,
  getTimeConfig,
  getWindowEndTime,
  getWindowStartTime
} from '../../core/time/MissionTime.js';
import { getSurfacingTimes } from '../../core/sim/GliderComms.js';

export class TimelinePanel {
  constructor(root) {
    this.root = root;
  }

  render(level, { mission = null, time = 0, selectedWindow = 0 } = {}, { onTimeChange, onWindowSelect } = {}) {
    const config = getTimeConfig(level);
    const count = getPlanningWindowCount(level);
    const start = getWindowStartTime(level, selectedWindow);
    const end = getWindowEndTime(level, selectedWindow);
    const step = config.dt || 1;
    const markerWidth = count > 1 ? 100 / (count - 1) : 100;
    const surfacingTimes = getSurfacingTimes(level, mission);

    this.root.innerHTML = `
      <section class="timeline-workspace" aria-label="Planning timeline">
        <div class="timeline-status">
          <strong>${formatMissionTime(level, time)}</strong>
          <span>Window ${selectedWindow} | ${formatMissionTime(level, start)}-${formatMissionTime(level, end)}</span>
        </div>
        <div class="timeline-slider-wrap">
          <input id="mission-time-slider" type="range" min="0" max="${config.duration}" step="${step}" value="${time}" />
          <div class="timeline-markers" aria-hidden="true">
            ${Array.from({ length: count }, (_, index) => `
              <span class="${index === selectedWindow ? 'active' : ''}" style="left:${index * markerWidth}%"></span>
            `).join('')}
            ${surfacingTimes.map((surfaceTime) => `
              <i class="surface-marker" style="left:${config.duration > 0 ? (surfaceTime / config.duration) * 100 : 0}%" title="Surfacing window"></i>
            `).join('')}
          </div>
        </div>
        <div class="timeline-jump-buttons">
          <button data-time-jump="start">Start</button>
          <button data-time-jump="prev">Prev</button>
          <button data-time-jump="next">Next</button>
          <button data-time-jump="end">End</button>
        </div>
        <div class="timeline-strip">
          ${Array.from({ length: count }, (_, index) => `
            <button class="${index === selectedWindow ? 'active' : ''}" data-window="${index}">
              W${index}<span>${formatMissionTime(level, getWindowStartTime(level, index))}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;

    this.root.querySelector('#mission-time-slider').oninput = (event) => {
      onTimeChange?.(Number(event.target.value));
    };

    this.root.querySelectorAll('button[data-window]').forEach((button) => {
      button.onclick = () => onWindowSelect?.(Number(button.dataset.window));
    });

    this.root.querySelectorAll('button[data-time-jump]').forEach((button) => {
      button.onclick = () => {
        const jump = button.dataset.timeJump;
        if (jump === 'start') onTimeChange?.(0);
        if (jump === 'end') onTimeChange?.(config.duration);
        if (jump === 'prev') onWindowSelect?.(Math.max(0, selectedWindow - 1));
        if (jump === 'next') onWindowSelect?.(Math.min(count - 1, selectedWindow + 1));
      };
    });
  }
}
