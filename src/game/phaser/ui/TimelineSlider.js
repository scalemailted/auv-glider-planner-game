import { PhaserButton } from './Button.js';
import {
  formatMissionTime,
  getMissionTimelineFrames,
  getNextTimelineFrameIndex,
  getPrevTimelineFrameIndex,
  getTimeConfig,
  getTimelineFrameIndexForTime
} from '../../../core/time/MissionTime.js';
import { getSurfacingTimes } from '../../../core/sim/GliderComms.js';

export class TimelineSlider {
  constructor(scene, handlers) {
    this.scene = scene;
    this.handlers = handlers;
    this.buttons = [];
    this.container = scene.add.container(0, 0).setDepth(34);
    this.track = scene.add.rectangle(206, 760, 760, 10, 0x1a2d49, 0.92)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x6d86aa, 0.42);
    this.knob = scene.add.circle(206, 760, 12, 0x63e6be, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ draggable: true });
    this.label = scene.add.text(32, 742, '', { fontFamily: 'system-ui', fontSize: '14px', color: '#eef6ff' });
    this.container.add([this.track, this.knob, this.label]);
    scene.input.setDraggable(this.knob);
    this.knob.on('drag', (_pointer, dragX) => this.setTimeFromX(dragX));
    this.knob.on('pointerdown', () => {
      scene.suppressNextPointerUp = true;
      scene.uiPointerActive = true;
    });
    this.track.setInteractive(new Phaser.Geom.Rectangle(0, -12, 760, 24), Phaser.Geom.Rectangle.Contains);
    this.track.on('pointerdown', (pointer) => {
      scene.suppressNextPointerUp = true;
      this.setTimeFromX(pointer.x);
    });
    this.makeButtons();
  }

  makeButtons() {
    const specs = [
      ['Start', 1018, () => this.goToFrame(0, 'start')],
      ['Prev', 1080, () => this.goToFrame(getPrevTimelineFrameIndex(this.state.level, this.state.mission, this.state.planningTime), 'prev')],
      ['Next', 1142, () => this.goToFrame(getNextTimelineFrameIndex(this.state.level, this.state.mission, this.state.planningTime), 'next')],
      ['End', 1204, () => this.goToFrame(getMissionTimelineFrames(this.state.level, this.state.mission).length - 1, 'end')]
    ];
    for (const [label, x, onClick] of specs) {
      const button = new PhaserButton(this.scene, { x, y: 760, width: 56, height: 28, label, onClick });
      button.container.setDepth(35);
      this.buttons.push(button);
    }
  }

  refresh(state) {
    this.state = state;
    const config = getTimeConfig(state.level);
    const duration = config.duration || 1;
    const pct = Math.max(0, Math.min(1, Number(state.planningTime ?? 0) / duration));
    this.knob.setPosition(206 + pct * 760, 760);
    const frameIndex = getTimelineFrameIndexForTime(state.level, state.mission, state.planningTime);
    this.label.setText(`${formatMissionTime(state.level, state.planningTime)} | Frame ${frameIndex} | Window ${state.selectedWindow}`);
    this.drawMarkers(state, config, duration);
  }

  drawMarkers(state, config, duration) {
    for (const marker of this.markers ?? []) marker.destroy();
    this.markers = [];
    const frames = getMissionTimelineFrames(state.level, state.mission);
    const activeFrame = getTimelineFrameIndexForTime(state.level, state.mission, state.planningTime);
    for (const frame of frames) {
      const time = frame.t;
      const x = 206 + (time / duration) * 760;
      const marker = this.scene.add.rectangle(x, 760, frame.isFinalFrame ? 4 : 2, frame.index === activeFrame ? 28 : frame.isFinalFrame ? 24 : 18, frame.index === activeFrame ? 0x63e6be : frame.isFinalFrame ? 0xffd166 : 0xdcecff, frame.index === activeFrame ? 0.9 : 0.48).setDepth(34);
      marker.setInteractive(new Phaser.Geom.Rectangle(-8, -14, 16, 28), Phaser.Geom.Rectangle.Contains);
      marker.on('pointerdown', () => {
        this.scene.suppressNextPointerUp = true;
        this.goToFrame(frame.index, 'marker');
      });
      this.markers.push(marker);
    }
    const frameTimes = new Set(frames.map((frame) => Number(frame.t.toFixed(6))));
    for (const time of getSurfacingTimes(state.level, state.mission)) {
      if (frameTimes.has(Number(time.toFixed(6)))) continue;
      this.markers.push(this.scene.add.circle(206 + (time / duration) * 760, 782, 6, 0xffd166, 0.78).setDepth(34));
    }
  }

  setTimeFromX(x) {
    const config = getTimeConfig(this.state.level);
    const pct = Math.max(0, Math.min(1, (x - 206) / 760));
    const step = config.dt || 1;
    const rawTime = pct * config.duration;
    const time = pct >= 0.995 ? config.duration : Math.round(rawTime / step) * step;
    this.handlers.time(time);
  }

  goToFrame(frameIndex, reason = 'button') {
    const frames = getMissionTimelineFrames(this.state.level, this.state.mission);
    const bounded = Math.max(0, Math.min(frames.length - 1, Math.round(Number(frameIndex) || 0)));
    if (typeof this.handlers.frame === 'function') {
      this.handlers.frame(bounded);
      return;
    }
    this.handlers.time?.(frames[bounded]?.t ?? 0);
    if (globalThis.DEBUG_TIMELINE_FRAMES) {
      console.debug('[timeline]', 'phaser-goToFrame', {
        reason,
        frameIndex: bounded,
        selectedTimeAfter: frames[bounded]?.t,
        frames: frames.map((frame) => ({ index: frame.index, t: frame.t, kind: frame.kind, isFinalFrame: frame.isFinalFrame }))
      });
    }
  }

  destroy() {
    for (const marker of this.markers ?? []) marker.destroy();
    this.buttons.forEach((button) => button.destroy());
    this.container.destroy();
  }
}
