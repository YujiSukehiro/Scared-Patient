class WorldGenerator {
  constructor(scene) {
    this.scene = scene;
    this.segments = [];
    this.segmentLength = 15;
    this.activeObstacles = [];
    this.activePills = [];
    
    // Path generator state
    this.currentPosition = new THREE.Vector3(0, 0, 0);
    this.currentDirection = new THREE.Vector3(0, 0, -1); // Start facing negative Z
    this.straightSegmentsSinceLastTurn = 0;
    this.totalSegmentsSpawned = 0;

    // Cache segment materials to prevent WebGL material churn
    this.floorMat = new THREE.MeshStandardMaterial({ color: 0xe8eff2, roughness: 0.2, metalness: 0.1 }); // polished clinical linoleum floor
    this.wallLowerMat = new THREE.MeshStandardMaterial({ color: 0x4fa6a6, roughness: 0.6 }); // clinical teal-green lower wall
    this.wallStripeMat = new THREE.MeshStandardMaterial({ color: 0x117788, roughness: 0.5 }); // dark teal wayfinding stripe & baseboard
    this.wallUpperMat = new THREE.MeshStandardMaterial({ color: 0xf5f7f8, roughness: 0.7 }); // clean sterile white upper wall
    this.ceilingMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 }); // clean plaster ceiling
    this.doorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 }); // wood door
    this.handleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.2, metalness: 0.8 }); // silver metal handles
    this.exitSignMat = new THREE.MeshBasicMaterial({ color: 0x22ff22 }); // glowing exit sign
    this.metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3 }); // metal mounting brackets
  }

  createWall(length, isAlongX) {
    const wallGroup = new THREE.Group();
    const H = 6.0;
    const hLower = 2.4;
    const hStripe = 0.15;
    const hUpper = H - 2.55; // 3.45
    
    let lowerGeo, stripeGeo, upperGeo, baseboardGeo;
    if (isAlongX) {
      lowerGeo = new THREE.BoxGeometry(length, hLower, 0.1);
      stripeGeo = new THREE.BoxGeometry(length, hStripe, 0.1);
      upperGeo = new THREE.BoxGeometry(length, hUpper, 0.1);
      baseboardGeo = new THREE.BoxGeometry(length, 0.15, 0.12);
    } else {
      lowerGeo = new THREE.BoxGeometry(0.1, hLower, length);
      stripeGeo = new THREE.BoxGeometry(0.1, hStripe, length);
      upperGeo = new THREE.BoxGeometry(0.1, hUpper, length);
      baseboardGeo = new THREE.BoxGeometry(0.12, 0.15, length);
    }
    
    const lower = new THREE.Mesh(lowerGeo, this.wallLowerMat);
    lower.position.y = hLower / 2;
    wallGroup.add(lower);
    
    const stripe = new THREE.Mesh(stripeGeo, this.wallStripeMat);
    stripe.position.y = 2.4 + hStripe / 2;
    wallGroup.add(stripe);
    
    const upper = new THREE.Mesh(upperGeo, this.wallUpperMat);
    upper.position.y = 2.55 + hUpper / 2;
    wallGroup.add(upper);
    
    const baseboard = new THREE.Mesh(baseboardGeo, this.wallStripeMat);
    baseboard.position.y = 0.075;
    wallGroup.add(baseboard);
    
    return wallGroup;
  }

  generateSegment(type = null) {
    const W = 10; // Corridor width
    const H = 6;  // Corridor height
    const minStraight = 3;
    const straightProb = 0.7;

    // Determine segment type if not specified
    if (!type) {
      if (this.straightSegmentsSinceLastTurn < minStraight) {
        type = 'straight';
      } else {
        const r = Math.random();
        if (r < straightProb) {
          type = 'straight';
        } else if (r < straightProb + 0.15) {
          type = 'left';
        } else {
          type = 'right';
        }
      }
    }

    const L = (type === 'straight') ? this.segmentLength : W;
    const group = new THREE.Group();

    // Visual materials from cache
    const floorMat = this.floorMat;
    const ceilingMat = this.ceilingMat;

    // Create floor (local space extends along +Z)
    const floorGeo = new THREE.BoxGeometry(W, 0.1, L);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.05, L / 2);
    group.add(floor);

    // Create ceiling
    const ceilingGeo = new THREE.BoxGeometry(W, 0.1, L);
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.set(0, H + 0.05, L / 2);
    group.add(ceiling);

    if (type === 'straight') {
      // Left Wall
      const leftWall = this.createWall(L, false);
      leftWall.position.set(-W / 2 - 0.05, 0, L / 2);
      group.add(leftWall);

      // Right Wall
      const rightWall = this.createWall(L, false);
      rightWall.position.set(W / 2 + 0.05, 0, L / 2);
      group.add(rightWall);

      // Procedurally spawn doors
      const spawnDoorLeft = Math.random() < 0.4;
      const spawnDoorRight = Math.random() < 0.4;

      if (spawnDoorLeft) {
        const doorZ = 2 + Math.random() * 11;
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.4, 1.0), this.doorMat);
        door.position.set(-W / 2 + 0.01, 1.2, doorZ);
        group.add(door);

        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.12), this.handleMat);
        handle.position.set(-W / 2 + 0.04, 1.2, doorZ + 0.38);
        group.add(handle);
      }

      if (spawnDoorRight) {
        const doorZ = 2 + Math.random() * 11;
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.4, 1.0), this.doorMat);
        door.position.set(W / 2 - 0.01, 1.2, doorZ);
        group.add(door);

        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.12), this.handleMat);
        handle.position.set(W / 2 - 0.04, 1.2, doorZ - 0.38);
        group.add(handle);
      }

      // Procedurally spawn ceiling exit signs (30% chance)
      if (Math.random() < 0.3) {
        const signZ = L / 2;
        const signGroup = new THREE.Group();
        signGroup.position.set(0, H - 0.4, signZ);

        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.08), this.exitSignMat);
        signGroup.add(plate);

        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), this.metalMat);
        pole.position.y = 0.25;
        signGroup.add(pole);

        group.add(signGroup);
      }

      // Ceiling Light Fixture
      const lightMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.1, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      lightMesh.position.set(0, H - 0.05, L / 2);
      group.add(lightMesh);

      const light = new THREE.PointLight(0xffffff, 1, 15, 1.5);
      light.position.set(0, H - 0.5, L / 2);
      group.add(light);
    } else {
      // Turn segment (left or right)
      // Front Wall (blocks straight ahead)
      const frontWall = this.createWall(W, true);
      frontWall.position.set(0, 0, W + 0.05);
      group.add(frontWall);

      if (type === 'left') {
        // Block the outer right side (local -X) with a wall of depth W
        const rightWallMesh = this.createWall(W, false);
        rightWallMesh.position.set(-W / 2 - 0.05, 0, W / 2);
        group.add(rightWallMesh);

        // Block the inner left side (local +X) from start to half-width - 1.5m buffer (depth 3.5 centered at Z position 1.75)
        const innerWallMesh = this.createWall(W / 2 - 1.5, false);
        innerWallMesh.position.set(W / 2 + 0.05, 0, (W / 2 - 1.5) / 2);
        group.add(innerWallMesh);
      } else if (type === 'right') {
        // Block the outer left side (local +X) with a wall of depth W
        const leftWallMesh = this.createWall(W, false);
        leftWallMesh.position.set(W / 2 + 0.05, 0, W / 2);
        group.add(leftWallMesh);

        // Block the inner right side (local -X) from start to half-width - 1.5m buffer (depth 3.5 centered at Z position 1.75)
        const innerWallMesh = this.createWall(W / 2 - 1.5, false);
        innerWallMesh.position.set(-W / 2 - 0.05, 0, (W / 2 - 1.5) / 2);
        group.add(innerWallMesh);
      }

      // Ceiling Light Fixture
      const lightMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.1, 1),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      lightMesh.position.set(0, H - 0.05, W / 2);
      group.add(lightMesh);

      const light = new THREE.PointLight(0xffffff, 1.2, 15, 1.5);
      light.position.set(0, H - 0.5, W / 2);
      group.add(light);
    }

    // Position and rotate in world space
    group.position.copy(this.currentPosition);
    const target = this.currentPosition.clone().add(this.currentDirection);
    group.lookAt(target);
    group.updateMatrixWorld(true);

    this.scene.add(group);

    // Calculate exit coordinates mathematically
    const rightDir = new THREE.Vector3(-this.currentDirection.z, 0, this.currentDirection.x);
    const leftDir = new THREE.Vector3(this.currentDirection.z, 0, -this.currentDirection.x);

    let exitPos = new THREE.Vector3();
    let exitDir = new THREE.Vector3();

    if (type === 'straight') {
      exitPos.copy(this.currentPosition).addScaledVector(this.currentDirection, L);
      exitDir.copy(this.currentDirection);
    } else if (type === 'left') {
      exitPos.copy(this.currentPosition).addScaledVector(this.currentDirection, W / 2).addScaledVector(leftDir, W / 2);
      exitDir.copy(leftDir);
    } else if (type === 'right') {
      exitPos.copy(this.currentPosition).addScaledVector(this.currentDirection, W / 2).addScaledVector(rightDir, W / 2);
      exitDir.copy(rightDir);
    }

    const segment = {
      id: Math.random().toString(36).substr(2, 9),
      globalIndex: this.totalSegmentsSpawned,
      type: type,
      zStart: this.currentPosition.z,
      zEnd: exitPos.z,
      startPosition: this.currentPosition.clone(),
      direction: this.currentDirection.clone(),
      endPosition: exitPos.clone(),
      exitDirection: exitDir.clone(),
      mesh: group,
      length: L,
      width: W,
      height: H
    };

    this.segments.push(segment);

    // Update generator state for next segment
    this.currentPosition.copy(exitPos);
    this.currentDirection.copy(exitDir);

    if (type === 'straight') {
      this.straightSegmentsSinceLastTurn++;
    } else {
      this.straightSegmentsSinceLastTurn = 0;
    }
    this.totalSegmentsSpawned++;

    // Spawning logic
    if (segment.globalIndex >= 2) {
      if (type === 'straight') {
        const pattern = Math.floor(Math.random() * 7);
        switch (pattern) {
          case 0: {
            const lane = Math.floor(Math.random() * 3) - 1;
            this.spawnPillOnSegment(segment, lane, 3);
            this.spawnPillOnSegment(segment, lane, 7.5);
            this.spawnPillOnSegment(segment, lane, 12);
            break;
          }
          case 1: {
            this.spawnObstacleOnSegment(segment, 'barrier', 0, 7.5);
            const sideLane = Math.random() < 0.5 ? -1 : 1;
            this.spawnPillOnSegment(segment, sideLane, 3);
            this.spawnPillOnSegment(segment, sideLane, 7.5);
            this.spawnPillOnSegment(segment, sideLane, 12);
            break;
          }
          case 2: {
            const lane = Math.floor(Math.random() * 3) - 1;
            this.spawnObstacleOnSegment(segment, 'syringe', lane, 7.5);
            this.spawnPillOnSegment(segment, lane, 3);
            this.spawnPillOnSegment(segment, lane, 7.5);
            this.spawnPillOnSegment(segment, lane, 12);
            break;
          }
          case 3: {
            this.spawnObstacleOnSegment(segment, 'barrier', -1, 7.5);
            this.spawnObstacleOnSegment(segment, 'barrier', 1, 7.5);
            this.spawnPillOnSegment(segment, 0, 3);
            this.spawnPillOnSegment(segment, 0, 7.5);
            this.spawnPillOnSegment(segment, 0, 12);
            break;
          }
          case 4: {
            const freeLane = Math.floor(Math.random() * 3) - 1;
            for (let l = -1; l <= 1; l++) {
              if (l !== freeLane) {
                this.spawnObstacleOnSegment(segment, 'syringe', l, 7.5);
              }
            }
            this.spawnPillOnSegment(segment, freeLane, 7.5);
            break;
          }
          case 5: {
            const lanes = [-1, 0, 1];
            for (let i = lanes.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
            }
            this.spawnObstacleOnSegment(segment, 'barrier', lanes[0], 4);
            this.spawnObstacleOnSegment(segment, 'syringe', lanes[1], 8);
            this.spawnObstacleOnSegment(segment, 'barrier', lanes[2], 12);
            break;
          }
          case 6: {
            const blockedLane = Math.floor(Math.random() * 3) - 1;
            this.spawnObstacleOnSegment(segment, 'cabinet', blockedLane, 7.5);
            for (let l = -1; l <= 1; l++) {
              if (l !== blockedLane) {
                this.spawnPillOnSegment(segment, l, 5);
                this.spawnPillOnSegment(segment, l, 10);
              }
            }
            break;
          }
        }
      } else {
        // Turn segment: spawn only pills along the curve center to avoid clipping.
        this.spawnPillOnSegment(segment, 0, segment.length * 0.25);
        this.spawnPillOnSegment(segment, 0, segment.length * 0.5);
        this.spawnPillOnSegment(segment, 0, segment.length * 0.75);
      }
    }

    return segment;
  }

  getSegmentRelativeCoords(segment, lane, distanceAlong) {
    const lanePositions = window.config.lanePositions || { "-1": -3, "0": 0, "1": 3 };
    const laneOffset = lanePositions[lane] !== undefined ? lanePositions[lane] : (lane * 3);
    
    if (segment.type === 'straight') {
      const right = new THREE.Vector3(-segment.direction.z, 0, segment.direction.x).normalize();
      const worldPos = segment.startPosition.clone()
        .addScaledVector(segment.direction, distanceAlong)
        .addScaledVector(right, laneOffset);
      return {
        position: worldPos,
        direction: segment.direction.clone()
      };
    } else {
      // turn segment (left or right)
      const t = Math.max(0, Math.min(1, distanceAlong / segment.length));
      const angle = t * Math.PI / 2;
      const fwd = (segment.width / 2) * Math.sin(angle);
      const lat = (segment.width / 2) * (1 - Math.cos(angle));
      
      const isLeft = segment.type === 'left';
      const dirSide = isLeft 
        ? new THREE.Vector3(segment.direction.z, 0, -segment.direction.x).normalize()
        : new THREE.Vector3(-segment.direction.z, 0, segment.direction.x).normalize();
      
      const centerPos = segment.startPosition.clone()
        .addScaledVector(segment.direction, fwd)
        .addScaledVector(dirSide, lat);
      
      const tangent = segment.direction.clone().multiplyScalar(Math.cos(angle))
        .addScaledVector(dirSide, Math.sin(angle))
        .normalize();
      
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      
      const worldPos = centerPos.clone().addScaledVector(normal, laneOffset);
      
      return {
        position: worldPos,
        direction: tangent
      };
    }
  }

  spawnPillOnSegment(segment, lane, distanceAlong) {
    const coords = this.getSegmentRelativeCoords(segment, lane, distanceAlong);
    const pill = window.models.createPill();
    pill.position.copy(coords.position);
    pill.position.y = 0.2;
    
    const target = coords.position.clone().add(coords.direction);
    pill.lookAt(target);
    
    this.scene.add(pill);
    this.activePills.push({
      lane: lane,
      z: coords.position.z,
      mesh: pill,
      segmentId: segment.id,
      distanceAlong: distanceAlong
    });
  }

  spawnObstacleOnSegment(segment, type, lane, distanceAlong) {
    const coords = this.getSegmentRelativeCoords(segment, lane, distanceAlong);
    const obstacle = window.models.createObstacle(type);
    obstacle.position.copy(coords.position);
    obstacle.position.y = 0.0;
    
    const target = coords.position.clone().add(coords.direction);
    obstacle.lookAt(target);
    
    this.scene.add(obstacle);
    this.activeObstacles.push({
      type: type,
      lane: lane,
      z: coords.position.z,
      mesh: obstacle,
      segmentId: segment.id,
      distanceAlong: distanceAlong
    });
  }

  spawnPill(lane, z) {
    const pill = window.models.createPill();
    const lanePositions = window.config.lanePositions || { "-1": -3, "0": 0, "1": 3 };
    pill.position.set(lanePositions[lane], 0.2, z);
    this.scene.add(pill);
    this.activePills.push({ lane, z, mesh: pill });
  }

  spawnObstacle(type, lane, z) {
    const obstacle = window.models.createObstacle(type);
    const lanePositions = window.config.lanePositions || { "-1": -3, "0": 0, "1": 3 };
    obstacle.position.set(lanePositions[lane], 0, z);
    this.scene.add(obstacle);
    this.activeObstacles.push({ type, lane, z, mesh: obstacle });
  }

  isPositionInSegment(pos, segment) {
    const fwd = new THREE.Vector3().subVectors(pos, segment.startPosition).dot(segment.direction);
    if (fwd < 0 || fwd >= segment.length) return false;
    
    const right = new THREE.Vector3(-segment.direction.z, 0, segment.direction.x).normalize();
    const lat = new THREE.Vector3().subVectors(pos, segment.startPosition).dot(right);
    
    if (segment.type === 'straight') {
      return Math.abs(lat) <= (segment.width / 2 + 1.0);
    } else if (segment.type === 'left') {
      if (fwd < segment.width / 2) {
        return Math.abs(lat) <= (segment.width / 2 + 1.0);
      } else {
        return lat >= -(segment.width + 1.0) && lat <= (segment.width / 2 + 1.0);
      }
    } else if (segment.type === 'right') {
      if (fwd < segment.width / 2) {
        return Math.abs(lat) <= (segment.width / 2 + 1.0);
      } else {
        return lat >= -(segment.width / 2 + 1.0) && lat <= (segment.width + 1.0);
      }
    }
    return false;
  }

  recycleSegments(playerZ) {
    const keepSegments = [];
    const currentIdx = (window.gameState && window.gameState.player) ? window.gameState.player.currentSegmentIndex : 0;
    const segmentsToRecycle = [];
    
    for (const segment of this.segments) {
      const isBehindByIndex = segment.globalIndex < currentIdx - 1;
      const isBehindByZ = segment.zEnd >= playerZ + 15;

      const shouldRecycle = (window.gameState && window.gameState.state !== 'START')
        ? isBehindByIndex
        : isBehindByZ;

      if (!shouldRecycle) {
        keepSegments.push(segment);
      } else {
        segmentsToRecycle.push(segment);
      }
    }

    for (const segment of segmentsToRecycle) {
      this.scene.remove(segment.mesh);
      segment.mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => {
            const isCachedMaterial = 
              m === this.floorMat || 
              m === this.wallLowerMat || 
              m === this.wallStripeMat || 
              m === this.wallUpperMat || 
              m === this.ceilingMat || 
              m === this.doorMat || 
              m === this.handleMat || 
              m === this.exitSignMat || 
              m === this.metalMat;
            if (!isCachedMaterial) {
              m.dispose();
            }
          });
        }
      });

      // Recycle associated pills
      for (let i = this.activePills.length - 1; i >= 0; i--) {
        const pill = this.activePills[i];
        let match = false;
        if (pill.segmentId && pill.segmentId === segment.id) {
          match = true;
        } else {
          const pillPos = new THREE.Vector3();
          pill.mesh.getWorldPosition(pillPos);
          if (this.isPositionInSegment(pillPos, segment)) {
            match = true;
          }
        }
        if (match) {
          this.scene.remove(pill.mesh);
          if (typeof pill.mesh.dispose === 'function') {
            pill.mesh.dispose();
          } else {
            pill.mesh.traverse(child => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
              }
            });
          }
          this.activePills.splice(i, 1);
        }
      }

      // Recycle associated obstacles
      for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
        const obs = this.activeObstacles[i];
        let match = false;
        if (obs.segmentId && obs.segmentId === segment.id) {
          match = true;
        } else {
          const obsPos = new THREE.Vector3();
          obs.mesh.getWorldPosition(obsPos);
          if (this.isPositionInSegment(obsPos, segment)) {
            match = true;
          }
        }
        if (match) {
          this.scene.remove(obs.mesh);
          if (typeof obs.mesh.dispose === 'function') {
            obs.mesh.dispose();
          } else {
            obs.mesh.traverse(child => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
              }
            });
          }
          this.activeObstacles.splice(i, 1);
        }
      }
    }

    const removedCount = this.segments.length - keepSegments.length;
    this.segments = keepSegments;
    return removedCount;
  }

  getRelativeCoords(pos, segment) {
    const p = new THREE.Vector3(pos.x, 0, pos.z);
    const start = new THREE.Vector3(segment.startPosition.x, 0, segment.startPosition.z);
    
    if (segment.type === 'straight') {
      const rel = new THREE.Vector3().subVectors(p, start);
      const distAlong = rel.dot(segment.direction);
      const right = new THREE.Vector3(-segment.direction.z, 0, segment.direction.x).normalize();
      const laneOffset = rel.dot(right);
      return { distAlong, laneOffset };
    } else {
      const isLeft = segment.type === 'left';
      const dirSide = isLeft 
        ? new THREE.Vector3(segment.direction.z, 0, -segment.direction.x).normalize()
        : new THREE.Vector3(-segment.direction.z, 0, segment.direction.x).normalize();
      
      const R = segment.width / 2;
      const C = start.clone().addScaledVector(dirSide, R);
      const v = new THREE.Vector3().subVectors(p, C);
      const r = v.length();
      const laneOffset = isLeft ? (r - R) : (R - r);
      
      const fwdDot = v.dot(segment.direction);
      const sideDot = v.dot(dirSide);
      const angle = Math.atan2(fwdDot, -sideDot);
      const distAlong = (angle / (Math.PI / 2)) * segment.length;
      return { distAlong, laneOffset };
    }
  }

  checkCollisions(player) {
    const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
    
    // Check pills
    for (let i = this.activePills.length - 1; i >= 0; i--) {
      const pill = this.activePills[i];
      const pillWorldPos = new THREE.Vector3();
      pill.mesh.getWorldPosition(pillWorldPos);
      
      const seg = this.getCurrentSegment(pillWorldPos) || this.getCurrentSegment(playerPos) || this.segments[0];
      if (!seg) continue;
      
      const playerCoords = this.getRelativeCoords(playerPos, seg);
      const pillCoords = this.getRelativeCoords(pillWorldPos, seg);

      const axialDist = Math.abs(playerCoords.distAlong - pillCoords.distAlong);
      const physicalLane = Math.max(-1, Math.min(1, Math.round(playerCoords.laneOffset / 3.0)));
      const lateralClose = Math.abs(playerCoords.laneOffset - pillCoords.laneOffset) < 1.5;
      const laneMatch = (pill.lane === physicalLane) && lateralClose;
      const yDiff = Math.abs(playerPos.y - pillWorldPos.y);
      
      if (axialDist < 1.0 && laneMatch && yDiff < 1.5) {
        this.scene.remove(pill.mesh);
        if (typeof pill.mesh.dispose === 'function') {
          pill.mesh.dispose();
        } else {
          pill.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
              else child.material.dispose();
            }
          });
        }
        this.activePills.splice(i, 1);
        return { type: 'pill' };
      }
    }

    // Check obstacles
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      const obsWorldPos = new THREE.Vector3();
      obs.mesh.getWorldPosition(obsWorldPos);
      
      const seg = this.getCurrentSegment(obsWorldPos) || this.getCurrentSegment(playerPos) || this.segments[0];
      if (!seg) continue;
      
      const playerCoords = this.getRelativeCoords(playerPos, seg);
      const obsCoords = this.getRelativeCoords(obsWorldPos, seg);

      const axialDist = Math.abs(playerCoords.distAlong - obsCoords.distAlong);
      const physicalLane = Math.max(-1, Math.min(1, Math.round(playerCoords.laneOffset / 3.0)));
      const lateralClose = Math.abs(playerCoords.laneOffset - obsCoords.laneOffset) < 1.5;
      const laneMatch = (obs.lane === physicalLane) && lateralClose;
      
      if (axialDist < 1.0 && laneMatch) {
        if (obs.type === 'syringe') {
          if (!player.isSliding) {
            this.scene.remove(obs.mesh);
            if (typeof obs.mesh.dispose === 'function') {
              obs.mesh.dispose();
            } else {
              obs.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                  else child.material.dispose();
                }
              });
            }
            this.activeObstacles.splice(i, 1);
            return { type: 'obstacle', detail: 'syringe', lane: obs.lane };
          }
        } else if (obs.type === 'cabinet' || obs.type === 'locker' || obs.type === 'side_hazard') {
          this.scene.remove(obs.mesh);
          if (typeof obs.mesh.dispose === 'function') {
            obs.mesh.dispose();
          } else {
            obs.mesh.traverse(child => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
              }
            });
          }
          this.activeObstacles.splice(i, 1);
          return { type: 'obstacle', detail: obs.type, lane: obs.lane };
        } else {
          // barrier
          if (!player.isJumping && playerPos.y < 0.5) {
            this.scene.remove(obs.mesh);
            if (typeof obs.mesh.dispose === 'function') {
              obs.mesh.dispose();
            } else {
              obs.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                  else child.material.dispose();
                }
              });
            }
            this.activeObstacles.splice(i, 1);
            return { type: 'obstacle', detail: 'barrier', lane: obs.lane };
          }
        }
      }
    }

    return null;
  }

  getCurrentSegment(position) {
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const rel = new THREE.Vector3().subVectors(position, segment.startPosition);
      const dot = rel.dot(segment.direction);
      const len = (segment.type === 'straight') ? segment.length : segment.width;
      if (dot >= 0 && dot < len) {
        return segment;
      }
    }
    if (this.segments.length > 0) {
      const lastSeg = this.segments[this.segments.length - 1];
      const rel = new THREE.Vector3().subVectors(position, lastSeg.startPosition);
      const dot = rel.dot(lastSeg.direction);
      if (dot >= 0) {
        return lastSeg;
      }
      return this.segments[0];
    }
    return null;
  }

  reset() {
    // Dispose all active pills
    for (const p of this.activePills) {
      this.scene.remove(p.mesh);
      if (typeof p.mesh.dispose === 'function') {
        p.mesh.dispose();
      } else {
        p.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
      }
    }
    // Dispose all active obstacles
    for (const o of this.activeObstacles) {
      this.scene.remove(o.mesh);
      if (typeof o.mesh.dispose === 'function') {
        o.mesh.dispose();
      } else {
        o.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
      }
    }
    // Dispose all segments
    for (const s of this.segments) {
      this.scene.remove(s.mesh);
      s.mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => {
            const isCachedMaterial = 
              m === this.floorMat || 
              m === this.wallLowerMat || 
              m === this.wallStripeMat || 
              m === this.wallUpperMat || 
              m === this.ceilingMat || 
              m === this.doorMat || 
              m === this.handleMat || 
              m === this.exitSignMat || 
              m === this.metalMat;
            if (!isCachedMaterial) {
              m.dispose();
            }
          });
        }
      });
    }

    this.segments = [];
    this.activeObstacles = [];
    this.activePills = [];
    this.currentPosition.set(0, 0, 0);
    this.currentDirection.set(0, 0, -1);
    this.straightSegmentsSinceLastTurn = 0;
    this.totalSegmentsSpawned = 0;
  }
}

window.worldGen = null;
