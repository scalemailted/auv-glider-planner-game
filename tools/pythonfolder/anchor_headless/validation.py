"""Lightweight plan sanity checks for external solver templates."""


def sanity_check_plan(plan, world):
    errors = []
    duration = float(world["duration"])
    for agent_plan in plan.get("agentPlans") or []:
        previous_time = None
        for index, waypoint in enumerate(agent_plan.get("waypoints") or []):
            label = f"{agent_plan.get('agentId')} waypoint {index + 1}"
            x = waypoint.get("x")
            y = waypoint.get("y")
            if not isinstance(x, int) or not isinstance(y, int):
                errors.append(f"{label} needs integer x/y coordinates.")
                continue
            if x < 0 or y < 0 or x >= world["width"] or y >= world["height"]:
                errors.append(f"{label} is outside the grid.")
                continue
            if bool(_value_at(world["terrain"], x, y, 1)):
                errors.append(f"{label} is on land/blocked terrain.")
            t = waypoint.get("t", waypoint.get("estimatedArrivalTime"))
            if t is None:
                errors.append(f"{label} needs t or estimatedArrivalTime.")
                continue
            t = float(t)
            if t < 0 or t > duration:
                errors.append(f"{label} time is outside the mission duration.")
            if previous_time is not None and t <= previous_time:
                errors.append(f"{label} time must be strictly increasing.")
            previous_time = t
    return errors


def _value_at(grid, x, y, default=None):
    if y < 0 or x < 0 or y >= len(grid) or x >= len(grid[y]):
        return default
    return grid[y][x]
