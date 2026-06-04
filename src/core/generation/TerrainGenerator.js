export function generateTerrain(width, height, density = 0.08, random = Math.random) {
  const terrain = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (border || random() < density) terrain[y][x] = 1;
    }
  }

  const patchCount = Math.max(1, Math.floor(width * height * density * 0.04));
  for (let i = 0; i < patchCount; i += 1) {
    const cx = 2 + Math.floor(random() * Math.max(1, width - 4));
    const cy = 2 + Math.floor(random() * Math.max(1, height - 4));
    const radius = 1 + Math.floor(random() * 2);
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        if (terrain[y]?.[x] === undefined) continue;
        if (Math.hypot(x - cx, y - cy) <= radius + random() * 0.5) terrain[y][x] = 1;
      }
    }
  }

  clearSafeArea(terrain, 1, 1);
  ensureTraversableSpace(terrain);
  return terrain;
}

function clearSafeArea(terrain, sx, sy) {
  for (let y = sy - 1; y <= sy + 1; y += 1) {
    for (let x = sx - 1; x <= sx + 1; x += 1) {
      if (terrain[y]?.[x] !== undefined) terrain[y][x] = 0;
    }
  }
}

function ensureTraversableSpace(terrain) {
  const height = terrain.length;
  const width = terrain[0]?.length ?? 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if ((x + y) % 3 === 0) terrain[y][x] = 0;
    }
  }
}
