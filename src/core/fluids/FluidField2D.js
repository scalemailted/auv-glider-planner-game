export class FluidField2D {
  constructor(config = {}) {
    this.width = clampInt(config.width, 2, 128);
    this.height = clampInt(config.height, 2, 128);
    this.dt = Number(config.dt ?? 0.2);
    this.viscosity = Number(config.viscosity ?? 0.0008);
    this.iterations = clampInt(config.iterations ?? 8, 1, 32);
    this.wrapX = Boolean(config.wrapX);
    this.wrapY = Boolean(config.wrapY);
    this.vorticityConfinement = Number(config.vorticityConfinement ?? 0);
    const size = this.width * this.height;
    this.u = new Float32Array(size);
    this.v = new Float32Array(size);
    this.u0 = new Float32Array(size);
    this.v0 = new Float32Array(size);
    this.pressure = new Float32Array(size);
    this.divergence = new Float32Array(size);
  }

  reset() {
    this.u.fill(0);
    this.v.fill(0);
    this.u0.fill(0);
    this.v0.fill(0);
    this.pressure.fill(0);
    this.divergence.fill(0);
  }

  addForce(x, y, fx, fy, radius = 1.2) {
    const r = Math.max(0.25, Number(radius));
    const minX = Math.floor(x - r);
    const maxX = Math.ceil(x + r);
    const minY = Math.floor(y - r);
    const maxY = Math.ceil(y + r);
    for (let cy = minY; cy <= maxY; cy += 1) {
      for (let cx = minX; cx <= maxX; cx += 1) {
        const ix = this.resolveX(cx);
        const iy = this.resolveY(cy);
        if (ix < 0 || iy < 0) continue;
        const d = Math.hypot(cx - x, cy - y);
        if (d > r) continue;
        const falloff = 1 - d / r;
        const index = this.index(ix, iy);
        this.u[index] += fx * falloff;
        this.v[index] += fy * falloff;
      }
    }
  }

  addVortex(x, y, strength = 1, radius = 3) {
    const r = Math.max(0.5, Number(radius));
    const minX = Math.floor(x - r);
    const maxX = Math.ceil(x + r);
    const minY = Math.floor(y - r);
    const maxY = Math.ceil(y + r);
    for (let cy = minY; cy <= maxY; cy += 1) {
      for (let cx = minX; cx <= maxX; cx += 1) {
        const ix = this.resolveX(cx);
        const iy = this.resolveY(cy);
        if (ix < 0 || iy < 0) continue;
        const dx = cx - x;
        const dy = cy - y;
        const dist = Math.max(0.5, Math.hypot(dx, dy));
        if (dist > r) continue;
        const swirl = strength * (1 - dist / r);
        const index = this.index(ix, iy);
        this.u[index] += (-dy / dist) * swirl;
        this.v[index] += (dx / dist) * swirl;
      }
    }
  }

  step() {
    if (this.vorticityConfinement > 0) this.applyVorticityConfinement();
    this.diffuse(this.u0, this.u, this.viscosity);
    this.diffuse(this.v0, this.v, this.viscosity);
    this.project(this.u0, this.v0);
    this.advect(this.u, this.u0, this.u0, this.v0);
    this.advect(this.v, this.v0, this.u0, this.v0);
    this.project(this.u, this.v);
  }

  dampTerrain(terrain, damping = 0.08) {
    if (!terrain) return;
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (!terrain[y]?.[x]) continue;
        const index = this.index(x, y);
        this.u[index] *= damping;
        this.v[index] *= damping;
      }
    }
  }

  getVelocity(x, y) {
    return [this.sample(this.u, x, y), this.sample(this.v, x, y)];
  }

  index(x, y) {
    return y * this.width + x;
  }

  resolveX(x) {
    if (this.wrapX) return modulo(x, this.width);
    if (x < 0 || x >= this.width) return -1;
    return x;
  }

  resolveY(y) {
    if (this.wrapY) return modulo(y, this.height);
    if (y < 0 || y >= this.height) return -1;
    return y;
  }

  diffuse(target, source, diffusion) {
    target.set(source);
    const a = Math.max(0, diffusion) * this.dt * this.width * this.height;
    if (a === 0) return;
    for (let k = 0; k < this.iterations; k += 1) {
      for (let y = 0; y < this.height; y += 1) {
        for (let x = 0; x < this.width; x += 1) {
          const index = this.index(x, y);
          const sum = this.neighbor(target, x - 1, y) + this.neighbor(target, x + 1, y)
            + this.neighbor(target, x, y - 1) + this.neighbor(target, x, y + 1);
          target[index] = (source[index] + a * sum) / (1 + 4 * a);
        }
      }
    }
  }

  project(u, v) {
    this.pressure.fill(0);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = this.index(x, y);
        const du = this.neighbor(u, x + 1, y) - this.neighbor(u, x - 1, y);
        const dv = this.neighbor(v, x, y + 1) - this.neighbor(v, x, y - 1);
        this.divergence[index] = -0.5 * (du + dv);
      }
    }
    for (let k = 0; k < this.iterations; k += 1) {
      for (let y = 0; y < this.height; y += 1) {
        for (let x = 0; x < this.width; x += 1) {
          const index = this.index(x, y);
          const sum = this.neighbor(this.pressure, x - 1, y) + this.neighbor(this.pressure, x + 1, y)
            + this.neighbor(this.pressure, x, y - 1) + this.neighbor(this.pressure, x, y + 1);
          this.pressure[index] = (this.divergence[index] + sum) / 4;
        }
      }
    }
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = this.index(x, y);
        u[index] -= 0.5 * (this.neighbor(this.pressure, x + 1, y) - this.neighbor(this.pressure, x - 1, y));
        v[index] -= 0.5 * (this.neighbor(this.pressure, x, y + 1) - this.neighbor(this.pressure, x, y - 1));
      }
    }
  }

  advect(target, source, u, v) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = this.index(x, y);
        const prevX = x - this.dt * u[index];
        const prevY = y - this.dt * v[index];
        target[index] = this.sample(source, prevX, prevY);
      }
    }
  }

  applyVorticityConfinement() {
    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        const index = this.index(x, y);
        const curl = (this.neighbor(this.v, x + 1, y) - this.neighbor(this.v, x - 1, y))
          - (this.neighbor(this.u, x, y + 1) - this.neighbor(this.u, x, y - 1));
        const force = curl * this.vorticityConfinement * this.dt;
        this.u[index] += -force;
        this.v[index] += force;
      }
    }
  }

  sample(field, x, y) {
    const x0 = this.wrapX ? modulo(Math.floor(x), this.width) : clampInt(Math.floor(x), 0, this.width - 1);
    const y0 = this.wrapY ? modulo(Math.floor(y), this.height) : clampInt(Math.floor(y), 0, this.height - 1);
    const x1 = this.wrapX ? modulo(x0 + 1, this.width) : Math.min(this.width - 1, x0 + 1);
    const y1 = this.wrapY ? modulo(y0 + 1, this.height) : Math.min(this.height - 1, y0 + 1);
    const tx = Math.max(0, Math.min(1, x - Math.floor(x)));
    const ty = Math.max(0, Math.min(1, y - Math.floor(y)));
    const a = lerp(field[this.index(x0, y0)], field[this.index(x1, y0)], tx);
    const b = lerp(field[this.index(x0, y1)], field[this.index(x1, y1)], tx);
    return lerp(a, b, ty);
  }

  neighbor(field, x, y) {
    const ix = this.resolveX(x);
    const iy = this.resolveY(y);
    if (ix < 0 || iy < 0) return 0;
    return field[this.index(ix, iy)];
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function modulo(value, size) {
  return ((value % size) + size) % size;
}

function clampInt(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}
