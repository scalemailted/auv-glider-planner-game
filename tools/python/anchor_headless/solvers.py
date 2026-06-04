"""Small baseline solvers for ANCHOR external solver templates."""

import math


def greedy_forecast_plan(world, max_waypoints=4):
    candidates = make_candidates(world)
    used = set()
    agent_plans = []
    for agent in world["agents"]:
        agent_id = str(agent.get("id"))
        start = choose_start(agent, world)
        current = (start["x"], start["y"])
        elapsed = 0.0
        fuel_used = 0.0
        fuel_budget = float(agent.get("battery") or agent.get("maxBattery") or 100.0)
        speed = max(0.05, float(agent.get("maxSpeed") or 1.0))
        waypoints = []

        for index in range(min(max_waypoints, world["windowCount"])):
            target = choose_target(current, candidates, used, world)
            if target is None:
                break
            distance = max(0.0, math.hypot(target["x"] - current[0], target["y"] - current[1]))
            travel_time = distance / speed
            energy = distance * float((world["mission"].get("physics") or {}).get("energyPerCell") or 1.0)
            next_time = elapsed + travel_time
            if next_time > world["duration"] or fuel_used + energy > fuel_budget:
                break
            used.add((target["x"], target["y"]))
            fuel_used += energy
            elapsed = next_time
            current = (target["x"], target["y"])
            waypoints.append({
                "id": f"{agent_id}_colab_wp_{index + 1:03d}",
                "window": min(index, world["windowCount"] - 1),
                "t": round(elapsed, 3),
                "estimatedArrivalTime": round(elapsed, 3),
                "segmentTravelTime": round(travel_time, 3),
                "segmentEnergy": round(energy, 3),
                "cumulativeEnergy": round(fuel_used, 3),
                "remainingFuelEstimate": round(max(0.0, fuel_budget - fuel_used), 3),
                "x": int(target["x"]),
                "y": int(target["y"]),
                "action": "sample",
                "note": f"colab-template-greedy-v1 expectedValue={target['value']:.3f}",
            })

        agent_plan = {"agentId": agent_id, "waypoints": waypoints}
        if start.get("selectedStart"):
            agent_plan["selectedStart"] = {"x": start["x"], "y": start["y"]}
        agent_plans.append(agent_plan)
    return agent_plans


def make_candidates(world):
    candidates = []
    for y in range(world["height"]):
        for x in range(world["width"]):
            if is_blocked(world, x, y) or is_hazard(world, x, y):
                continue
            value = roi_expected_value(value_at(world["roi"], x, y, 0.0))
            if value <= 0:
                continue
            candidates.append({"x": x, "y": y, "value": value})
    candidates.sort(key=lambda item: (-item["value"], item["y"], item["x"]))
    return candidates


def choose_start(agent, world):
    deployment_agent = next((item for item in world["deploymentAgents"] if item.get("agentId") == agent.get("id")), None)
    selected = deployment_agent.get("selectedStart") if deployment_agent else None
    if valid_point(selected):
        return {"x": int(selected["x"]), "y": int(selected["y"]), "selectedStart": True}
    allowed = deployment_agent.get("allowedCells") if deployment_agent else None
    if allowed:
        for cell in allowed:
            if valid_point(cell) and not is_blocked(world, int(cell["x"]), int(cell["y"])):
                return {"x": int(cell["x"]), "y": int(cell["y"]), "selectedStart": True}
    start = agent.get("start") or {}
    return {"x": int(start.get("x", 0)), "y": int(start.get("y", 0)), "selectedStart": False}


def choose_target(current, candidates, used, world):
    scored = []
    for candidate in candidates:
        target = (candidate["x"], candidate["y"])
        if target in used:
            continue
        if not clear_line(world, current, target):
            continue
        distance = max(1.0, math.hypot(target[0] - current[0], target[1] - current[1]))
        scored.append((candidate["value"] / distance, candidate["value"], -distance, candidate))
    if not scored:
        return None
    scored.sort(reverse=True, key=lambda item: item[:3])
    return scored[0][3]


def clear_line(world, start, end):
    for x, y in bresenham_line(int(start[0]), int(start[1]), int(end[0]), int(end[1])):
        if is_blocked(world, x, y) or is_hazard(world, x, y):
            return False
    return True


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


def is_blocked(world, x, y):
    return bool(value_at(world["terrain"], x, y, 1))


def is_hazard(world, x, y):
    return float(value_at(world["hazards"], x, y, 0) or 0) > 0


def value_at(grid, x, y, default=None):
    if y < 0 or x < 0 or y >= len(grid) or x >= len(grid[y]):
        return default
    return grid[y][x]


def roi_expected_value(cell):
    if isinstance(cell, dict):
        value = float(cell.get("value", cell.get("rewardValue", cell.get("expectedValue", 0.0))) or 0.0)
        probability = float(cell.get("probability", 1.0) or 1.0)
        return float(cell.get("expectedValue", value * max(0.0, min(1.0, probability))) or 0.0)
    return float(cell or 0.0)


def valid_point(point):
    if not isinstance(point, dict):
        return False
    try:
        float(point.get("x"))
        float(point.get("y"))
        return True
    except (TypeError, ValueError):
        return False
