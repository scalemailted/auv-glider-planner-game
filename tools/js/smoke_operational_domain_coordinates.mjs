import assert from 'node:assert/strict';

import { createOperationalDomainSpec } from '../../src/core/domain/OperationalDomainSpec.js';
import { normalizeMissionResolutionProfile } from '../../src/core/domain/MissionResolutionProfile.js';
import {
  coordinateRoundtripDiagnostics,
  gridCellToPhysicalPoint,
  physicalPointToPlanningCell,
  physicalPointToThreeWorld,
  physicalPointToUv
} from '../../src/core/domain/OperationalDomainCoordinates.js';

const domain = createOperationalDomainSpec();
const profile = normalizeMissionResolutionProfile('regionalShelfFleet');
const northWest = gridCellToPhysicalPoint({ x: 0, y: 0 }, domain, profile.planningLattice);
const southEast = gridCellToPhysicalPoint({ x: profile.planningLattice.columns - 1, y: profile.planningLattice.rows - 1 }, domain, profile.planningLattice);
assert.ok(northWest.northMeters > southEast.northMeters, 'row 0 should map to north/top');
assert.ok(southEast.eastMeters > northWest.eastMeters, 'larger col should map east/right');

const point = { eastMeters: 20000, northMeters: 37500, depthMeters: 120 };
const uv = physicalPointToUv(point, domain);
assert.equal(uv.inside, true);
const planning = physicalPointToPlanningCell(point, domain, profile);
assert.equal(Number.isFinite(Number(planning.x)), true);
const world = physicalPointToThreeWorld(point, domain);
assert.ok(world.y < 0, 'positive depth must map downward to negative Three world y');
const roundtrip = coordinateRoundtripDiagnostics({ domain, profile, point });
assert.equal(roundtrip.valid, true, roundtrip.errors.join('; '));

console.log('smoke_operational_domain_coordinates: ok');
