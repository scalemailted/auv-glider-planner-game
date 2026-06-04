"""Build a small forecast-only planning world from an ANCHOR solver packet."""

import math


def summarize_packet(packet):
    level = packet.get("level") or {}
    mission = packet.get("mission") or {}
    grid = ((level.get("world") or {}).get("grid") or {})
    time = ((level.get("world") or {}).get("time") or {})
    planning = packet.get("planningData") or {}
    visibility = packet.get("visibility") or {}
    return {
        "challengeId": packet.get("challengeId") or packet.get("instanceId"),
        "replaySeedAnchor": packet.get("replaySeedAnchor") or (level.get("meta") or {}).get("replaySeedAnchor"),
        "generationVersion": packet.get("generationVersion") or (level.get("meta") or {}).get("generationVersion"),
        "missionDuration": time.get("duration"),
        "planningWindow": time.get("planningWindow"),
        "grid": {"width": grid.get("width"), "height": grid.get("height")},
        "agents": len(mission.get("agents") or []),
        "forecastAvailable": bool(planning.get("forecastAvailable")),
        "roiViewMode": planning.get("roiViewMode"),
        "visiblePlanningSource": packet.get("visiblePlanningSource"),
        "usesTruthByDefault": False,
        "truthIncluded": bool(visibility.get("truthIncluded")),
        "oracleMode": bool(visibility.get("oracleMode")),
    }


def build_headless_world(packet):
    level = packet.get("level") or {}
    mission = packet.get("mission") or {}
    visible = ((packet.get("planningData") or {}).get("visibleFields") or {})
    terrain = visible.get("terrain") or (level.get("layers") or {}).get("terrain") or []
    hazards = visible.get("hazards") or (level.get("layers") or {}).get("hazards") or []
    forecast_frame = choose_forecast_frame(visible)
    grid = ((level.get("world") or {}).get("grid") or {})
    time = ((level.get("world") or {}).get("time") or {})
    width = int(grid.get("width") or (len(terrain[0]) if terrain else 0))
    height = int(grid.get("height") or len(terrain))
    duration = float(time.get("duration") or 1.0)
    planning_window = float(time.get("planningWindow") or duration or 1.0)
    deployment = packet.get("deployment") or {}
    return {
        "packet": packet,
        "level": level,
        "mission": mission,
        "width": width,
        "height": height,
        "duration": duration,
        "planningWindow": planning_window,
        "windowCount": max(1, math.ceil(duration / planning_window)),
        "terrain": terrain,
        "hazards": hazards,
        "depth": visible.get("depth") or (level.get("layers") or {}).get("depth") or [],
        "roi": forecast_frame.get("roi") or visible.get("roi") or [],
        "current": forecast_frame.get("current") or [],
        "forecastFrame": forecast_frame,
        "agents": mission.get("agents") or [],
        "deploymentAgents": deployment.get("agents") or [],
        "scoring": mission.get("scoring") or {},
    }


def choose_forecast_frame(visible):
    forecast = visible.get("forecast") or {}
    frames = forecast.get("frames") or []
    if frames:
        return frames[0]
    forecasts = visible.get("forecasts") or []
    for member in forecasts:
        member_frames = member.get("frames") or []
        if member_frames:
            return member_frames[0]
    return {}
