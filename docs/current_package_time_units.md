# Current Package Time Units

`packages/currents` accepts canonical seconds only. It must not know about Planning display hours, timeline labels, UI windows, or formatted mission time.

Required production boundary:

```text
visible Planning time in display units
-> PlanningTimelineTimeBridge
-> canonical seconds
-> packages/currents sampler
```

Regression checks include:

- 8 Planning hours -> 28,800 seconds
- 16 Planning hours -> 57,600 seconds
- 48 Planning hours -> 172,800 seconds
- Simulation/headless/replay seconds pass through unchanged
- package modules do not import `PlanningTimelineTimeBridge`
- non-finite `timeSeconds` is rejected