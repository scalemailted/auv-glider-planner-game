export function generateHazards(width, height, density = 0.06, terrain = null, random = Math.random) {
  const hazards = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (x === 1 && y === 1) continue;
      if (terrain?.[y]?.[x]) continue;
      if (random() < density) hazards[y][x] = 1;
    }
  }

  if (density > 0.08) {
    const lineX = 2 + Math.floor(random() * Math.max(1, width - 4));
    for (let y = 2; y < height - 2; y += 1) {
      if (!terrain?.[y]?.[lineX] && random() < 0.55) hazards[y][lineX] = 1;
    }
  }

  hazards[1][1] = 0;
  return hazards;
}
