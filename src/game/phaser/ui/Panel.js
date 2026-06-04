export function createPanel(scene, { x, y, width, height, title = '', alpha = 0.88 }) {
  const container = scene.add.container(x, y);
  const background = scene.add.rectangle(0, 0, width, height, 0x0f1b2e, alpha)
    .setOrigin(0, 0)
    .setStrokeStyle(1, 0x6d86aa, 0.32);
  container.add(background);
  if (title) {
    container.add(scene.add.text(14, 10, title, {
      fontFamily: 'system-ui',
      fontSize: '14px',
      fontStyle: '700',
      color: '#eef6ff'
    }));
  }
  return { container, background, width, height };
}
