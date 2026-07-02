"""Optional matplotlib visualizations for notebook use."""

from __future__ import annotations

from typing import Any

from .model import PlannerResult, PlanningProblem


def plot_environment_overview(problem: PlanningProblem):
    plt = _matplotlib()
    fig, ax = plt.subplots(figsize=(6, 5))
    _imshow(ax, problem.roi, title="Visible Forecast Science / ROI", cmap="viridis")
    xs = [node.x for node in problem.candidates]
    ys = [node.y for node in problem.candidates]
    ax.scatter(xs, ys, c="white", s=25, edgecolors="black", label="candidate nodes")
    ax.set_xlabel("grid x")
    ax.set_ylabel("grid y")
    ax.legend(loc="upper right")
    return fig


def plot_current_field(problem: PlanningProblem, *, time_seconds: float = 0.0, depth_meters: float = 0.0):
    plt = _matplotlib()
    fig, ax = plt.subplots(figsize=(6, 5))
    width, height = problem.width, problem.height
    xs, ys, us, vs = [], [], [], []
    for y in range(height):
        for x in range(width):
            vector = _value_at(problem.current, x, y, [0, 0])
            if isinstance(vector, dict):
                u, v = float(vector.get("u", 0.0) or 0.0), float(vector.get("v", 0.0) or 0.0)
            elif isinstance(vector, (list, tuple)) and len(vector) >= 2:
                u, v = float(vector[0] or 0.0), float(vector[1] or 0.0)
            else:
                u, v = 0.0, 0.0
            xs.append(x)
            ys.append(y)
            us.append(u)
            vs.append(v)
    ax.quiver(xs, ys, us, vs)
    ax.set_title(f"Visible current field, t={time_seconds:g}s, depth={depth_meters:g}m")
    ax.set_xlabel("grid x")
    ax.set_ylabel("grid y")
    return fig


def plot_scalar_field(problem: PlanningProblem, *, time_seconds: float = 0.0, depth_meters: float = 0.0):
    plt = _matplotlib()
    fig, ax = plt.subplots(figsize=(6, 5))
    _imshow(ax, problem.roi, title=f"Scalar / science field, t={time_seconds:g}s, depth={depth_meters:g}m", cmap="magma")
    ax.set_xlabel("grid x")
    ax.set_ylabel("grid y")
    return fig


def plot_planner_routes(problem: PlanningProblem, results: list[PlannerResult]):
    plt = _matplotlib()
    fig, ax = plt.subplots(figsize=(6, 5))
    _imshow(ax, problem.roi, title="Candidate planner routes", cmap="Greys")
    for result in results:
        xs = [node.x for node in result.route]
        ys = [node.y for node in result.route]
        ax.plot(xs, ys, marker="o", label=result.planner_id)
    ax.set_xlabel("grid x")
    ax.set_ylabel("grid y")
    ax.legend(loc="upper right")
    return fig


def vertical_profile_table(problem: PlanningProblem, *, x: int, y: int) -> list[dict[str, Any]]:
    layers = (((problem.level.get("world") or {}).get("waterColumnConfig") or {}).get("depthLayers") or
              [{"id": "surface", "depthMeters": 0}, {"id": "thermocline", "depthMeters": 35}, {"id": "deep", "depthMeters": 150}])
    value = _value_at(problem.roi, x, y, 0.0)
    return [
        {
            "x": x,
            "y": y,
            "depthLayerId": layer.get("id"),
            "depthMeters": layer.get("depthMeters"),
            "visibleScalarValue": value,
            "note": "Fixture scalar is shown from the solver-visible frame unless a depth-resolved fixture field is provided.",
        }
        for layer in layers
    ]


def _matplotlib():
    try:
        import matplotlib.pyplot as plt  # type: ignore
    except Exception as exc:
        raise RuntimeError("matplotlib is optional and required only for notebook visualizations") from exc
    return plt


def _imshow(ax, grid: list[list[Any]], *, title: str, cmap: str):
    ax.imshow([[float(cell.get("expectedValue", cell.get("value", 0.0)) if isinstance(cell, dict) else cell or 0.0) for cell in row] for row in grid], origin="upper", cmap=cmap)
    ax.set_title(title)


def _value_at(grid: list[list[Any]], x: int, y: int, default: Any = None) -> Any:
    if not isinstance(grid, list) or y < 0 or x < 0 or y >= len(grid) or x >= len(grid[y]):
        return default
    return grid[y][x]

