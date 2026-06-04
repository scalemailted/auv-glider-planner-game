# Mission Format

A mission defines agents, rules, physics parameters, and scoring weights.

Generated challenge missions preserve the player setup in `mission.meta.scenarioSetup`. The setup drives agent count, per-glider battery/fuel, glider speed, and the communication surface interval. Agents are generated as `glider_01`, `glider_02`, and so on, up to the browser-safe cap.

## Communication Rules

Missions may enable Slocum-style surface-only communication:

```json
{
  "rules": {
    "communication": {
      "mode": "surfaceOnly",
      "surfaceInterval": 3,
      "surfaceDuration": 0.25,
      "allowReplanningOnSurface": true,
      "updatePenalty": 2
    }
  }
}
```

The interval and duration use the level's mission-time units. During simulation, gliders submerge, surface at interval markers, report actual position, and can pause for a replan decision. `replanned` events count toward `scoring.updatePenalty` when enabled.

## Deployment Rules

Tutorial missions can keep fixed starts. Challenge missions can require the player or solver to choose a deployment cell from a level zone:

```json
{
  "agents": [
    {
      "id": "glider_01",
      "deployment": {
        "mode": "chooseFromZone",
        "zoneId": "drop_alpha",
        "selectedStart": null
      }
    }
  ]
}
```

If `deployment` is missing and `agent.start` exists, the browser normalizes the agent to `fixedStart` and uses `start` as `selectedStart`. In `chooseFromZone`, waypoint placement and simulation are blocked until `selectedStart` is a valid water cell inside the referenced deployment zone.

## End Conditions

Missions can optionally score a final surface, communication, recovery, pickup, or return requirement:

```json
{
  "rules": {
    "endCondition": {
      "mode": "recovery",
      "requiredByMissionEnd": true,
      "targetZoneId": "base_alpha",
      "bonus": 10,
      "penalty": 25
    }
  }
}
```

`mode: "none"` is the default, so sampling-only missions still end normally when the plan completes or mission time expires. Recovery-style modes use `targetZoneId` from `rules.endCondition.zones`, `rules.recoveryZones`, `rules.communicationZones`, or level bases. If the condition is required and not achieved, result summaries mark recovery success false and apply the configured penalty. If it is achieved, the configured bonus is added.

## Sampling Rules

Missions can also configure how repeated visits to ROI cells score:

```json
{
  "rules": {
    "sampling": {
      "mode": "diminishing",
      "duplicateValueMultiplier": 0,
      "localDepletionRadius": 1,
      "depletionFactor": 0.25,
      "cooldownWindows": 0,
      "persistentWindowMultiplier": 1
    }
  }
}
```

Modes:

- `unique`: first observation gives full value; duplicates use `duplicateValueMultiplier`, which defaults to `0`.
- `diminishing`: sampled cells, and optionally nearby cells, remain visible but score at `depletionFactor`.
- `cooldown`: repeated samples score at the duplicate multiplier until `cooldownWindows` planning windows pass.
- `persistent`: monitoring missions can score repeat samples once per planning window, scaled by `persistentWindowMultiplier`.

Older missions without `rules.endCondition` or `rules.sampling` use `mode: "none"` and `mode: "unique"` defaults.

## Priority Target Rules

Levels may include temporal Gold Star Targets in `layers.priorityTargets`. Missions can enable, display, and score them:

```json
{
  "rules": {
    "priorityTargets": {
      "enabled": true,
      "captureMode": "once",
      "showFutureTargets": false,
      "showActiveOnly": true
    }
  },
  "scoring": {
    "priorityTargetValueMultiplier": 1,
    "priorityTargetMissPenalty": 0,
    "allowSharedPriorityCapture": false
  }
}
```

Default behavior is risk/reward, not punishment: capturing an active target adds its value to final score, missing it applies no penalty, and duplicate captures are logged but do not add score. Set `priorityTargetMissPenalty` only for advanced challenge variants.
