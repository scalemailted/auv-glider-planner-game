import assert from 'node:assert/strict';
import { HtmlMissionWorkspaceOverlay } from '../../src/ui/HtmlMissionWorkspaceOverlay.js';

const root = fakeRoot();
let dispatchCount = 0;
const overlay = new HtmlMissionWorkspaceOverlay({
  elements: { overlay: {}, consoleRoot: root },
  toast: () => {},
  applyConsoleAccordions: () => {}
}, { mainMenu: () => {} });

overlay.bind(root, { alpha: () => { dispatchCount += 1; } });
overlay.bind(root, { alpha: () => { dispatchCount += 100; } });
assert.equal(overlay.overlayControlBindCount, 1, 'rerender should not add duplicate root listener');
root.dispatch('alpha');
assert.equal(dispatchCount, 100, 'latest action map should be used after rerender');
assert.equal(overlay.overlayControlDispatchCount, 1, 'single click should dispatch once');
root.dispatch('missing');
assert.equal(overlay.overlayControlDispatchCount, 2, 'missing handlers are still counted as one dispatch attempt');

console.log('smoke_continuous_ui_control_bindings: ok', {
  bindCount: overlay.overlayControlBindCount,
  dispatchCount: overlay.overlayControlDispatchCount
});

function fakeRoot() {
  const listeners = [];
  const root = {
    __anchorActionMap: {},
    contains: () => true,
    addEventListener: (type, listener) => {
      if (type === 'click') listeners.push(listener);
    },
    dispatch(action) {
      const button = {
        disabled: false,
        dataset: { action },
        closest: () => button
      };
      const event = { target: button, preventDefault: () => {} };
      for (const listener of listeners) listener(event);
    }
  };
  return root;
}