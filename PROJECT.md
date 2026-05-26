# Project: Scared Patient Turn Mechanics Fix

## Architecture
- **Track-Relative Coordinates**: Represents player position in track-relative coords `(currentSegmentIndex, distanceAlong, laneOffset)`.
- **Pre-Turn Buffering**: Stores turn inputs within 8m as `player.bufferedTurn` instead of executing them instantly, and executes them exactly at the segment boundary.
- **Normal Curve Lane Fix**: Corrects left-turn lane swapping by defining a consistent right-hand rule for the normal vector relative to the tangent in `js/world.js`.
- **Camera Follow**: Smoothly tracks the player's 3D coordinates based on continuous track-relative mapping, preventing wall clipping.
- **Doctor Proximity Tracker**: Resolves doctor snapping by tracing doctor distance backwards along segment boundaries using relative distance.

## Code Layout
- `js/world.js`: Defines segment generation, relative coordinates calculation, and collision checking.
- `js/game.js`: Controls player movement, input handling, game loop, camera, and doctor tracking.
- `verify_game.js`: E2E test runner.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Normal Curve Correction | Fix normal vector computation in `js/world.js` for left-turn lane swap | None | DONE |
| 2 | Track-Relative Coordinates & Buffering | Refactor player state in `js/game.js` to track-relative coords; implement early turn buffering | M1 | DONE |
| 3 | Camera & Doctor Tracking | Implement smooth camera following and robust doctor tracing in `js/game.js` | M2 | DONE |
| 4 | E2E Turn Tests | Implement robust turning E2E test cases in `verify_game.js` | M3 | DONE |
| 5 | Wall Placement & Boundary Checks | Correct turn segment wall positions and bounds checking in `js/world.js` | M4 | DONE |
| 6 | Doctor Chase Visibility & Camera Adjustments | Adjust doctor spacing, camera tracking offsets, and FOV | M5 | PLANNED |
| 7 | Distance-Based Speed Ramping | Implement progressive player/doctor speed scaling based on distance | M5 | PLANNED |
| 8 | Character Model Details & Disposal | Upgrade player/doctor meshes with detailed primitives and safe disposal | M5 | PLANNED |
| 9 | Test Alignment | Add Tier 6 assertions to verify speed ramping, camera visibility, and geometries | M6, M7, M8 | PLANNED |

## Interface Contracts
### Player State
- `currentSegmentIndex` (int): index of the segment player is currently on.
- `distanceAlong` (float): player's distance traveled along the current segment.
- `laneOffset` (float): smooth lateral offset interpolating towards target lane.
- `bufferedTurn` (string|null): buffered turn direction ('left', 'right', or null).
- `hasTurned` (boolean): flag representing whether player transitioned onto the turn arc.
