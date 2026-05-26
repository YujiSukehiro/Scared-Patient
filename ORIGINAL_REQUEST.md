# Original User Request

## Initial Request — 2026-05-26T18:52:50Z

Thoroughly fix the 90-degree turn mechanics in "Scared Patient" to ensure players can smoothly execute turns (including early buffering) without clipping, warping, or walking through walls.

Working directory: `/Users/connorleavitt/Desktop/Coding/Gaming/Game for clinic/ScaredPatient`
Integrity mode: `demo`

## Requirements

### R1. Mathematically Correct and Wall-Free 90-Degree Turns
Fix the player positioning math during left/right turns in `js/game.js` and `js/world.js`.
- Warping the player onto the next segment must align them precisely in their current lane.
- The player must never clip, warp, or walk through any walls (inner or outer) during the turn transition, regardless of whether they turn early, on time, or slightly late.
- The camera must smoothly follow the player's physical coordinates around the corner without snapping through geometry.

### R2. Pre-Turn Input Buffering
- Pressing the turn keys (WASD, Arrows, or swipe gestures) within 8 meters of an upcoming turn must register as a turn intent rather than a lane change.
- The turn must execute seamlessly once triggered, transferring the player onto the next segment's centerline/lanes continuously.

### R3. Automated Test Verification
- Add robust E2E test cases to `verify_game.js` that programmatically simulate turning left and right at intersections.
- The tests must assert that the player's physical 3D coordinates immediately after a turn are inside the boundaries of the next segment and not clipping any wall coordinates.

## Acceptance Criteria

### Turn Correctness
- [ ] Executing a left or right turn places the player in the correct lane on the next segment.
- [ ] Player never clips, intersects, or passes through a wall mesh during a turn.
- [ ] Camera pans smoothly during the turn without popping or clipping through walls.

### Input & Buffering
- [ ] Pre-turn inputs (ArrowLeft/ArrowRight pressed up to 8 meters before the turn segment) successfully execute the turn.
- [ ] Pressing turn keys early does not cause lane changes or physical corridor wall collisions.

### Verification
- [ ] E2E tests are updated to verify player coordinates after turning.
- [ ] All E2E and adversarial tests pass successfully.

## Follow-up — 2026-05-26T19:57:59Z

Enhance "Scared Patient 3D" by making the chase scarier (keeping the doctor visible in the camera frame), increasing base speed and adding distance-based speed ramping, and adding realistic primitive details to both character models.

Working directory: `/Users/connorleavitt/Desktop/Coding/Gaming/Game for clinic/ScaredPatient`
Integrity mode: `demo`

## Requirements

### R1. Visible Doctor Chase Dynamics
- Adjust the doctor's trailing distance and the camera's tracking offset/FOV in `js/game.js` so that the doctor (and their giant syringe) is visible behind the player in the bottom frame during normal running.
- Ensure that the doctor remains visible but does not clip into the player unless a collision occurs.

### R2. Speed Ramping & Difficulty Progression
- Increase the base speeds of both the player and the doctor to make the starting gameplay more fast-paced.
- Implement a progressive speed ramping formula in the update loop: as the player's distance increases, both the player's running speed and the doctor's chase speed scale upwards, increasing the intensity of the game over time.

### R3. Detailed Character Primitive Models
- Upgrade the 3D models for both characters in `js/models.js` using primitives (spheres, cylinders, boxes):
  - **Scared Patient**: Add hair details, ears, detailed shoes, and refine the hospital gown (e.g. adding a collar, trim, or belt geometry).
  - **Doctor**: Add hair details, shoes, and refine the surgical mask, glasses, and white lab coat.
- Maintain the code-driven procedural running and stumble animations with these added primitive parts.

### R4. Verification and Test Alignment
- Run the E2E test suite to ensure that player speed scaling, camera tracking, and model geometries pass all tests without regressions.
- Add assertions to verify that player speed increases over distance.

---

## Acceptance Criteria

### Chase Visibility
- [ ] The doctor's mesh is positioned behind the player in a way that is visible within the camera's view frustum during straight corridor runs.
- [ ] Stumbling brings the doctor visually closer, increasing the heartbeat rate correctly.

### Speed Progression
- [ ] Initial player speed is higher than the previous base speed.
- [ ] Player speed increases programmatically as the player's run distance increases.

### Character Enhancements
- [ ] The patient mesh contains hair, ears, shoes, and gown trim geometries.
- [ ] The doctor mesh contains hair, shoes, and detailed surgical attire.
- [ ] Geometries and materials of the added features are safely disposed of in `group.dispose()` to prevent WebGL memory leaks.

### Tests
- [ ] E2E automated test suite (`npm test`) passes with 100% success.
- [ ] Adversarial and memory leak tests pass successfully.

## Follow-up — 2026-05-26T20:07:26Z

The user requested that we revert the camera angle back to the old one (as the new camera angle makes the game feel a bit rough).

Specifically:
1. Revert the camera tracking offsets in `updateCamera(dt)` back to the original:
   - Camera position: `addScaledVector(playerDir, -5).addScaledVector(new THREE.Vector3(0, 1, 0), 3)`
   - LookAt target: `addScaledVector(playerDir, 5).addScaledVector(new THREE.Vector3(0, 1, 0), 1)`
2. To keep the doctor visible and in-frame without changing the camera angle:
   - Run the doctor closer to the player. Since the camera sits 5m behind the player, if the doctor is at around 3.5m to 4.5m behind the player, the doctor will be positioned between the camera and the player, making them perfectly visible in the frame.
   - Adjust the config and the doctor's distance updates in `js/game.js` so the doctor trails at around 3.5m to 4.5m under normal running, and closer (e.g., 1.5m to 2.0m) when the player stumbles, instead of the original 10m to 15m.
