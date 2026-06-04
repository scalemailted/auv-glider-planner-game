#!/usr/bin/env python3
"""Example external solver for ANCHOR solver packets.

This is intentionally simple and dependency-free. It is a teaching example,
not an optimal planner. The strategy ranks visible ROI expected value against
distance, static hazards, mobile hazard exposure, and shallow depth. It prefers
straight legs that do not cross blocked or hazard cells.
"""

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_MAX_WAYPOINTS = 4
VALID_STRATEGIES = {"value_per_distance", "greedy_roi", "nearest_roi"}


def main(argv):
    if len(argv) not in (3, 4):
        print(
            "Usage: python tools/python/example_greedy_solver.py "
            "solver_packet.json output_plan.json [value_per_distance|greedy_roi|nearest_roi]",
            file=sys.stderr,
        )
        return 2

    packet_path = Path(argv[1])
    output_path = Path(argv[2])
    strategy = argv[3] if len(argv) == 4 else "value_per_distance"
    if strategy not in VALID_STRATEGIES:
        print(f"Unknown strategy '{strategy}'. Expected one of: {', '.join(sorted(VALID_STRATEGIES))}", file=sys.stderr)
        return 2

    packet = read_json(packet_path)
    plan = solve_packet(packet, strategy=strategy)
    output_path.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output_path} with {sum(len(p['waypoints']) for p in plan['agentPlans'])} waypoint(s).")
    return 0


def read_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def solve_packet(packet, strategy="value_per_distance"):
    if packet.get("type") != "anchor.solverPacket":
        raise ValueError("Input JSON must have type anchor.solverPacket")

    mission = packet.get("mission") or {}
    level = packet.get("level") or {}
    visible_fields = (packet.get("planningData") or {}).get("visibleFields") or {}
    frame = choose_visible_frame(packet, visible_fields)
    roi = frame.get("roi") or []
    terrain = visible_fields.get("terrain") or (level.get("layers") or {}).get("terrain") or []
    hazards = visible_fields.get("hazards") or (level.get("layers") or {}).get("hazards") or []
    mobile_hazards = visible_fields.get("mobileHazards") or (level.get("layers") or {}).get("mobileHazards") or []
    depth = visible_fields.get("depth") or (level.get("layers") or {}).get("depth") or []
    grid = ((level.get("world") or {}).get("grid") or {})
    width = int(grid.get("width") or (len(terrain[0]) if terrain else 0))
    height = int(grid.get("height") or len(terrain))
    window_count = planning_window_count(level)

    candidates = make_candidates(width, height, roi, terrain, hazards, mobile_hazards, depth, level)
    agents = mission.get("agents") or []
    used_targets = set()
    agent_plans = []

    for agent in agents:
        agent_id = str(agent.get("id"))
        start = agent.get("start") or {}
        current = (int(start.get("x", 0)), int(start.get("y", 0)))
        waypoints = []

        for waypoint_index in range(min(DEFAULT_MAX_WAYPOINTS, window_count)):
            target = choose_target(
                current=current,
                candidates=candidates,
                used_targets=used_targets,
                terrain=terrain,
                hazards=hazards,
                mobile_hazards=mobile_hazards,
                depth=depth,
                level=level,
                strategy=strategy,
            )
            if target is None:
                break

            used_targets.add((target["x"], target["y"]))
            current = (target["x"], target["y"])
            waypoints.append({
                "id": f"{agent_id}_solver_wp_{waypoint_index + 1:03d}",
                "window": min(waypoint_index, window_count - 1),
                "x": target["x"],
                "y": target["y"],
                "action": "sample",
                "note": f"{strategy}: expected={target['roi']:.3f} p={target['probability']:.2f} risk={target['risk']:.3f}",
            })

        agent_plans.append({"agentId": agent_id, "waypoints": waypoints})

    return {
        "schemaVersion": "2.0",
        "type": "anchor.plan",
        "levelId": packet.get("levelId"),
        "instanceId": packet.get("instanceId"),
        "missionId": packet.get("missionId"),
        "meta": {
            "name": f"Example {strategy.replace('_', ' ').title()} Solver Plan",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "solver": "tools/python/example_greedy_solver.py",
            "strategy": strategy,
            "visiblePlanningSource": packet.get("visiblePlanningSource"),
        },
        "agentPlans": agent_plans,
    }


def choose_visible_frame(packet, visible_fields):
    source = packet.get("visiblePlanningSource")
    if source == "forecast":
        frames = (visible_fields.get("forecast") or {}).get("frames") or []
    else:
        frames = (visible_fields.get("truth") or {}).get("frames") or []

    if not frames:
        frames = (visible_fields.get("truth") or {}).get("frames") or []
    if not frames:
        frames = (visible_fields.get("forecast") or {}).get("frames") or []
    return frames[0] if frames else {}


def planning_window_count(level):
    time = ((level.get("world") or {}).get("time") or {})
    duration = float(time.get("duration") or 1)
    planning_window = float(time.get("planningWindow") or duration or 1)
    return max(1, math.ceil(duration / planning_window))


def make_candidates(width, height, roi, terrain, hazards, mobile_hazards, depth, level):
    candidates = []
    for y in range(height):
        for x in range(width):
            if is_blocked(x, y, terrain) or is_hazard(x, y, hazards):
                continue
            cell = value_at(roi, x, y, default=0.0)
            value, probability, expected_value = roi_parts(cell)
            if value <= 0:
                continue
            candidates.append({
                "x": x,
                "y": y,
                "roi": expected_value,
                "reward": value,
                "probability": probability,
                "mobile_risk": mobile_hazard_risk(x, y, mobile_hazards, level),
                "depth_penalty": shallow_depth_penalty(x, y, depth),
            })
    return candidates


def choose_target(
    current,
    candidates,
    used_targets,
    terrain,
    hazards,
    mobile_hazards,
    depth,
    level,
    strategy,
):
    scored = []
    for candidate in candidates:
        target = (candidate["x"], candidate["y"])
        if target in used_targets:
            continue

        # This basic obstacle check keeps each straight waypoint leg away from
        # blocked terrain and hazard cells. It does not search around obstacles.
        if not clear_line(current, target, terrain, hazards):
            continue

        dist = max(1.0, distance(current, target))
        static_risk = line_hazard_count(current, target, hazards) * 0.3
        mobile_risk = candidate.get("mobile_risk", 0.0) * 0.35
        depth_risk = candidate.get("depth_penalty", 0.0) * 0.25
        risk = static_risk + mobile_risk + depth_risk
        # Students can compare these simple ranking rules and improve them.
        if strategy == "greedy_roi":
            score = candidate["roi"] - risk
        elif strategy == "nearest_roi":
            score = -dist - risk
        else:
            score = (candidate["roi"] / dist) - risk
        scored.append((score, candidate["roi"], -dist, {**candidate, "risk": risk}))

    if not scored:
        return None
    scored.sort(reverse=True, key=lambda item: item[:3])
    return scored[0][3]


def clear_line(start, end, terrain, hazards):
    for x, y in bresenham_line(start[0], start[1], end[0], end[1]):
        if is_blocked(x, y, terrain) or is_hazard(x, y, hazards):
            return False
    return True


def line_hazard_count(start, end, hazards):
    count = 0
    for x, y in bresenham_line(start[0], start[1], end[0], end[1]):
        if is_hazard(x, y, hazards):
            count += 1
    return count


def bresenham_line(x0, y0, x1, y1):
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy

    while True:
        yield x0, y0
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def is_blocked(x, y, terrain):
    return bool(value_at(terrain, x, y, default=1))


def is_hazard(x, y, hazards):
    return float(value_at(hazards, x, y, default=0)) > 0


def value_at(grid, x, y, default=0):
    if y < 0 or x < 0 or y >= len(grid) or x >= len(grid[y]):
        return default
    return grid[y][x]


def roi_parts(cell):
    if isinstance(cell, dict):
        value = float(cell.get("value", cell.get("rewardValue", cell.get("expectedValue", 0.0))) or 0.0)
        probability = max(0.0, min(1.0, float(cell.get("probability", 1.0) or 1.0)))
        expected = float(cell.get("expectedValue", value * probability) or 0.0)
        return value, probability, expected
    value = float(cell or 0.0)
    return value, 1.0, value


def mobile_hazard_risk(x, y, mobile_hazards, level):
    duration = float((((level.get("world") or {}).get("time") or {}).get("duration")) or 1.0)
    times = [0.0, duration * 0.33, duration * 0.66, duration]
    risk = 0.0
    for hazard in mobile_hazards or []:
        frames = hazard.get("frames") or []
        for t in times:
            frame = nearest_hazard_frame(frames, t)
            if not frame:
                continue
            radius = float(frame.get("radius", 1.0) or 1.0)
            dist = math.hypot(x - float(frame.get("x", x)), y - float(frame.get("y", y)))
            if dist <= radius + 1.5:
                risk += max(0.0, radius + 1.5 - dist)
    return risk


def nearest_hazard_frame(frames, t):
    if not frames:
        return None
    return min(frames, key=lambda frame: abs(float(frame.get("t", 0.0) or 0.0) - t))


def shallow_depth_penalty(x, y, depth):
    value = value_at(depth or [], x, y, default=1.0)
    try:
        depth_value = float(value)
    except (TypeError, ValueError):
        depth_value = 1.0
    return max(0.0, 0.35 - depth_value)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
