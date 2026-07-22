"""Build a small forecast-only planning world from an ANCHOR solver packet."""

import math


def summarize_packet(packet):
    level = packet["level"] or {}
    mission = packet["mission"] or {}
    grid = ((level["world"] or {})["grid"] or {})
    time = ((level["world"] or {})["time"] or {})
    planning = packet["planningData"] or {}
    visibility = packet["visibility"] or {}
    return {
        "challengeId": packet["challengeId"] or packet["instanceId"],
        "replaySeedAnchor": packet["replaySeedAnchor"] or (level["meta"] or {})["replaySeedAnchor"],
        "generationVersion": packet["generationVersion"] or (level["meta"] or {})["generationVersion"],
        "missionDuration": time["duration"],
        "planningWindow": time["planningWindow"],
        "grid": {"width": grid["width"], "height": grid["height"]},
        "agents": len(mission["agents"] or []),
        "forecastAvailable": bool(planning["forecastAvailable"]),
        "roiViewMode": planning["roiViewMode"],
        "visiblePlanningSource": packet["visiblePlanningSource"],
        "usesTruthByDefault": False,
        "truthIncluded": bool(visibility["truthIncluded"]),
        "oracleMode": bool(visibility["oracleMode"]),
    }


def build_headless_world(packet):
    level = packet["level"] or {}
    mission = packet["mission"] or {}
    mode = level["meta"]["generationConfig"]["scenarioSetup"]["mode"]
    visible = ((packet["planningData"] or {})["visibleFields"] or {})
    terrain = visible["terrain"] or (level["layers"] or {})["terrain"] or []
    hazards = visible["hazards"] or (level["layers"] or {})["hazards"] or []
    forecast_frame = choose_forecast_frame(visible, mode)
    grid = ((level["world"] or {})["grid"] or {})
    time = ((level["world"] or {})["time"] or {})
    width = int(grid["width"] or (len(terrain[0]) if terrain else 0))
    height = int(grid["height"] or len(terrain))
    duration = float(time["duration"] or 1.0)
    planning_window = float(time["planningWindow"] or duration or 1.0)
    deployment = packet["deployment"] or {}
    return {
        "packet": packet,
        "level": level,
        "mission": mission,
        "mode": mode,
        "width": width,
        "height": height,
        "duration": duration,
        "planningWindow": planning_window,
        "windowCount": max(1, math.ceil(duration / planning_window)),
        "terrain": terrain,
        "hazards": hazards,
        "depth": visible["depth"] or (level["layers"] or {})["depth"] or [],
        "roi": forecast_frame["roi"] or visible["roi"] or [],
        "current": forecast_frame["current"] or [],
        "forecastFrame": forecast_frame,
        "agents": mission["agents"] or [],
        "deploymentAgents": deployment["agents"] or [],
        "scoring": mission["scoring"] or {},
    }


def choose_forecast_frame(visible, mode):
    isStochastic = mode != "deterministic"
    forecast = (visible["forecast"] if isStochastic else visible["truth"]) or {}
    frames = forecast["frames"] or []
    if frames:
        return frames[0]
    forecasts = visible["forecasts"] or []
    for member in forecasts:
        member_frames = member["frames"] or []
        if member_frames:
            return member_frames[0]
    return {}
