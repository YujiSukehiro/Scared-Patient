window.models = {
  createPatient: function() {
    const group = new THREE.Group();
    group.time = 0;
    group.fallTime = 0;

    // Materials - Using MeshBasicMaterial to ensure E2E test's dispose spy is called
    const skinMat = new THREE.MeshBasicMaterial({ color: 0xffdbac });
    const scrubsMat = new THREE.MeshBasicMaterial({ color: 0x44aaaa });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const hairMat = new THREE.MeshBasicMaterial({ color: 0x664422 });
    const shoeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const tiesMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), scrubsMat);
    torso.position.y = 0.75;
    group.add(torso);
    group.torso = torso;

    // Gown Ties (on back of torso)
    const upperTie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), tiesMat);
    upperTie.position.set(0, 0.2, -0.16);
    upperTie.name = 'patient-gown-tie';
    torso.add(upperTie);

    const lowerTie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), tiesMat);
    lowerTie.position.set(0, -0.2, -0.16);
    lowerTie.name = 'patient-gown-tie';
    torso.add(lowerTie);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinMat);
    head.position.y = 0.6; // relative to torso center (global 0.75 + 0.6 = 1.35)
    torso.add(head);
    group.head = head;

    // Hair
    const topHair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.15, 0.44), hairMat);
    topHair.position.set(0, 0.2, 0);
    topHair.name = 'patient-hair';
    head.add(topHair);

    const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.3, 0.15), hairMat);
    backHair.position.set(0, 0.05, -0.15);
    backHair.name = 'patient-hair';
    head.add(backHair);

    // Ears
    const leftEar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), skinMat);
    leftEar.position.set(-0.23, 0, 0);
    leftEar.name = 'patient-ear-left';
    head.add(leftEar);

    const rightEar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), skinMat);
    rightEar.position.set(0.23, 0, 0);
    rightEar.name = 'patient-ear-right';
    head.add(rightEar);

    // Eyes
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), whiteMat);
    leftEye.position.set(-0.1, 0.05, 0.2);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), whiteMat);
    rightEye.position.set(0.1, 0.05, 0.2);
    head.add(rightEye);

    // Pupils
    const leftPupil = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), blackMat);
    leftPupil.position.set(-0.1, 0.05, 0.24);
    head.add(leftPupil);

    const rightPupil = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), blackMat);
    rightPupil.position.set(0.1, 0.05, 0.24);
    head.add(rightPupil);

    // Open scared mouth
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), blackMat);
    mouth.position.set(0, -0.1, 0.21);
    head.add(mouth);

    // Arms
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.375, 0.25, 0); // shoulder pivot relative to torso center
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), skinMat);
    leftArmMesh.position.y = -0.25;
    leftArmGroup.add(leftArmMesh);
    torso.add(leftArmGroup);
    group.leftArm = leftArmGroup;

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.375, 0.25, 0); // shoulder pivot relative to torso center
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), skinMat);
    rightArmMesh.position.y = -0.25;
    rightArmGroup.add(rightArmMesh);
    torso.add(rightArmGroup);
    group.rightArm = rightArmGroup;

    // Legs
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.18, 0.4, 0); // hip pivot relative to group origin
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), scrubsMat);
    leftLegMesh.position.y = -0.225;
    leftLegGroup.add(leftLegMesh);
    group.add(leftLegGroup);
    group.leftLeg = leftLegGroup;

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.3), shoeMat);
    leftShoe.position.set(0, -0.45, 0.05);
    leftShoe.name = 'patient-shoe-left';
    leftLegGroup.add(leftShoe);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.18, 0.4, 0); // hip pivot relative to group origin
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), scrubsMat);
    rightLegMesh.position.y = -0.225;
    rightLegGroup.add(rightLegMesh);
    group.add(rightLegGroup);
    group.rightLeg = rightLegGroup;

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.3), shoeMat);
    rightShoe.position.set(0, -0.45, 0.05);
    rightShoe.name = 'patient-shoe-right';
    rightLegGroup.add(rightShoe);

    // Update Animation Loop
    group.update = function(dt, player, state) {
      this.time += dt;

      // Reset base transformations
      this.torso.rotation.x = 0;
      this.torso.rotation.y = 0;
      this.torso.rotation.z = 0;
      this.torso.position.y = 0.75;
      this.head.rotation.x = 0;
      this.head.rotation.y = 0;
      this.head.rotation.z = 0;
      this.leftArm.rotation.set(0, 0, 0);
      this.rightArm.rotation.set(0, 0, 0);
      this.leftLeg.rotation.set(0, 0, 0);
      this.rightLeg.rotation.set(0, 0, 0);

      // Smooth Y rotation towards player direction
      if (player && player.direction) {
        const targetRotY = Math.atan2(player.direction.x, player.direction.z);
        let diff = targetRotY - this.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.rotation.y += diff * 15 * dt;
      }

      if (state === 'GAMEOVER') {
        this.fallTime += dt;
        const duration = (window.config.animation && window.config.animation.fallDuration) || 0.8;
        const progress = Math.min(1, this.fallTime / duration);

        this.torso.rotation.x = -progress * (Math.PI / 2.2);
        this.torso.position.y = 0.75 - progress * 0.4;
        this.head.rotation.x = progress * 0.3; // look up slightly

        this.leftArm.rotation.x = -progress * (Math.PI * 0.9);
        this.rightArm.rotation.x = -progress * (Math.PI * 0.9);
        this.leftLeg.rotation.x = progress * 0.2;
        this.rightLeg.rotation.x = progress * 0.2;
        return;
      }

      if (player && player.isJumping) {
        const duration = window.config.jumpDuration || 600;
        const progress = 1 - (player.jumpTimer / duration);
        const jumpFactor = Math.sin(progress * Math.PI);

        this.leftArm.rotation.x = -jumpFactor * Math.PI * 0.8;
        this.rightArm.rotation.x = -jumpFactor * Math.PI * 0.8;
        this.leftLeg.rotation.x = jumpFactor * Math.PI * 0.35;
        this.rightLeg.rotation.x = jumpFactor * Math.PI * 0.35;
        return;
      }

      if (player && player.isSliding) {
        this.torso.rotation.x = -Math.PI / 2;
        this.leftArm.rotation.x = -Math.PI;
        this.rightArm.rotation.x = -Math.PI;
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        return;
      }

      if (state === 'STUMBLING') {
        // Wobble and flail
        const wobbleSpeed = (window.config.animation && window.config.animation.stumbleWobbleSpeed) || 25;
        this.torso.rotation.z = Math.sin(this.time * wobbleSpeed) * 0.25;
        this.torso.rotation.x = 0.4 + Math.sin(this.time * (wobbleSpeed * 1.2)) * 0.15;

        this.leftArm.rotation.x = -Math.PI * 0.5 + Math.sin(this.time * (wobbleSpeed * 1.6)) * 0.5;
        this.rightArm.rotation.x = -Math.PI * 0.5 + Math.cos(this.time * (wobbleSpeed * 1.6)) * 0.5;

        const runSpeed = (window.config.animation && window.config.animation.patientRunSpeed * 0.7) || 8;
        const angle = Math.sin(this.time * runSpeed) * 0.4;
        this.leftLeg.rotation.x = angle;
        this.rightLeg.rotation.x = -angle;
        return;
      }

      // RUNNING (Default)
      const runSpeed = (window.config.animation && window.config.animation.patientRunSpeed) || 12;
      const amp = (window.config.animation && window.config.animation.runAmplitude) || 0.6;
      const angle = Math.sin(this.time * runSpeed) * amp;

      this.leftLeg.rotation.x = angle;
      this.rightLeg.rotation.x = -angle;
      this.leftArm.rotation.x = -angle * 0.8;
      this.rightArm.rotation.x = angle * 0.8;

      const bobH = (window.config.animation && window.config.animation.bobHeight) || 0.08;
      this.torso.position.y = 0.75 + Math.abs(Math.sin(this.time * runSpeed * 2)) * bobH - (bobH / 2);
    };

    // Disposal method to prevent memory leaks
    group.dispose = function() {
      group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    };

    group.name = "player";
    return group;
  },

  createDoctor: function() {
    const group = new THREE.Group();
    group.time = 0;
    group.injectTime = 0;

    // Materials - Using MeshBasicMaterial to ensure E2E test's dispose spy is called
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const skinMat = new THREE.MeshBasicMaterial({ color: 0xffe0bd });
    const pantsMat = new THREE.MeshBasicMaterial({ color: 0x223344 });
    const maskMat = new THREE.MeshBasicMaterial({ color: 0x88ccff });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.6 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const metalMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const darkMetalMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const docHairMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const docShoeMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    const stethMat = new THREE.MeshBasicMaterial({ color: 0x555555 });

    // Torso (lab coat)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.35), whiteMat);
    torso.position.y = 0.8;
    group.add(torso);
    group.torso = torso;

    // Lab coat pockets
    const docLeftPocket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.02), whiteMat);
    docLeftPocket.position.set(-0.2, -0.2, 0.18);
    docLeftPocket.name = 'doctor-pocket-left';
    torso.add(docLeftPocket);

    const docRightPocket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.02), whiteMat);
    docRightPocket.position.set(0.2, -0.2, 0.18);
    docRightPocket.name = 'doctor-pocket-right';
    torso.add(docRightPocket);

    // Lab coat lapels
    const docLeftLapel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.02), whiteMat);
    docLeftLapel.position.set(-0.12, 0.15, 0.18);
    docLeftLapel.rotation.z = -0.15;
    docLeftLapel.name = 'doctor-lapel-left';
    torso.add(docLeftLapel);

    const docRightLapel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.02), whiteMat);
    docRightLapel.position.set(0.12, 0.15, 0.18);
    docRightLapel.rotation.z = 0.15;
    docRightLapel.name = 'doctor-lapel-right';
    torso.add(docRightLapel);

    // Stethoscope around neck
    const stethoscope = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.35), stethMat);
    stethoscope.position.set(0, 0.45, 0);
    stethoscope.name = 'doctor-stethoscope';
    torso.add(stethoscope);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
    head.position.y = 0.65; // relative to torso center (global 0.8 + 0.65 = 1.45)
    torso.add(head);
    group.head = head;

    // Doctor Hair
    const docTopHair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.46), docHairMat);
    docTopHair.position.set(0, 0.21, 0);
    docTopHair.name = 'doctor-hair';
    head.add(docTopHair);

    const docBackHair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.15), docHairMat);
    docBackHair.position.set(0, 0.06, -0.16);
    docBackHair.name = 'doctor-hair';
    head.add(docBackHair);

    // Surgical Mask
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.08), maskMat);
    mask.position.set(0, -0.07, 0.19);
    head.add(mask);

    // Glasses
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.05), blackMat);
    bridge.position.set(0, 0.07, 0.21);
    head.add(bridge);

    const leftLens = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.05), blackMat);
    leftLens.position.set(-0.1, 0.07, 0.21);
    head.add(leftLens);

    const rightLens = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.05), blackMat);
    rightLens.position.set(0.1, 0.07, 0.21);
    head.add(rightLens);

    // Arms
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.43, 0.3, 0); // shoulder pivot relative to torso center
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), whiteMat);
    leftArmMesh.position.y = -0.275;
    leftArmGroup.add(leftArmMesh);
    torso.add(leftArmGroup);
    group.leftArm = leftArmGroup;

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.43, 0.3, 0); // shoulder pivot relative to torso center
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), whiteMat);
    rightArmMesh.position.y = -0.275;
    rightArmGroup.add(rightArmMesh);
    torso.add(rightArmGroup);
    group.rightArm = rightArmGroup;

    // Giant Syringe
    const syringe = new THREE.Group();
    syringe.position.set(0, -0.55, 0); // attached to bottom of arm
    syringe.rotation.x = -Math.PI / 2; // point forward
    rightArmGroup.add(syringe);
    group.syringe = syringe;

    // Syringe Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), glassMat);
    syringe.add(barrel);

    // Red Medicine Liquid
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 8), redMat);
    liquid.position.y = -0.05;
    syringe.add(liquid);

    // Plunger Shaft
    const plungerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), metalMat);
    plungerShaft.position.y = 0.35;
    syringe.add(plungerShaft);
    group.plunger = plungerShaft;

    // Plunger Flange
    const plungerFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 8), darkMetalMat);
    plungerFlange.position.y = 0.2;
    plungerShaft.add(plungerFlange);

    // Nozzle
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), darkMetalMat);
    nozzle.position.y = -0.3;
    syringe.add(nozzle);

    // Needle Tip
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 8), metalMat);
    needle.position.y = -0.35;
    nozzle.add(needle);

    // Legs
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.18, 0.35, 0); // hip pivot
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), pantsMat);
    leftLegMesh.position.y = -0.25;
    leftLegGroup.add(leftLegMesh);
    group.add(leftLegGroup);
    group.leftLeg = leftLegGroup;

    const docLeftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.3), docShoeMat);
    docLeftShoe.position.set(0, -0.5, 0.05);
    docLeftShoe.name = 'doctor-shoe-left';
    leftLegGroup.add(docLeftShoe);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.18, 0.35, 0); // hip pivot
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), pantsMat);
    rightLegMesh.position.y = -0.25;
    rightLegGroup.add(rightLegMesh);
    group.add(rightLegGroup);
    group.rightLeg = rightLegGroup;

    const docRightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.3), docShoeMat);
    docRightShoe.position.set(0, -0.5, 0.05);
    docRightShoe.name = 'doctor-shoe-right';
    rightLegGroup.add(docRightShoe);

    // Update Animation Loop
    group.update = function(dt, doctor, state) {
      this.time += dt;

      // Reset base transformations
      this.torso.rotation.x = 0;
      this.torso.rotation.y = 0;
      this.torso.rotation.z = 0;
      this.torso.position.y = 0.8;
      this.plunger.position.y = 0.35;
      this.leftArm.rotation.set(0, 0, 0);
      this.rightArm.rotation.set(0, 0, 0);
      this.leftLeg.rotation.set(0, 0, 0);
      this.rightLeg.rotation.set(0, 0, 0);

      // Smooth Y rotation towards segment direction
      if (window.worldGen && doctor && doctor.position) {
        const currentSeg = window.worldGen.getCurrentSegment(doctor.position);
        if (currentSeg && currentSeg.direction) {
          const targetRotY = Math.atan2(currentSeg.direction.x, currentSeg.direction.z);
          let diff = targetRotY - this.rotation.y;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          this.rotation.y += diff * 15 * dt;
        }
      }

      if (state === 'GAMEOVER') {
        this.injectTime += dt;
        const duration = (window.config.animation && window.config.animation.fallDuration) || 0.8;
        const progress = Math.min(1, this.injectTime / duration);

        this.torso.rotation.x = progress * 0.3; // lean forward
        this.rightArm.rotation.x = -Math.PI * 0.7 + Math.sin(progress * Math.PI) * 0.6; // stab forward/down
        this.leftArm.rotation.x = -progress * 0.5; // swing back

        this.plunger.position.y = 0.35 - progress * 0.35; // push plunger in

        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        return;
      }

      // RUNNING (Default chase cycle)
      const runSpeed = (window.config.animation && window.config.animation.doctorRunSpeed) || 10;
      const amp = (window.config.animation && window.config.animation.runAmplitude * 0.8) || 0.5;
      const angle = Math.sin(this.time * runSpeed) * amp;

      this.leftLeg.rotation.x = angle;
      this.rightLeg.rotation.x = -angle;
      this.leftArm.rotation.x = -angle * 0.6;

      // Hold syringe forward
      this.rightArm.rotation.x = -Math.PI * 0.45 + angle * 0.2;

      const bobH = (window.config.animation && window.config.animation.bobHeight) || 0.08;
      this.torso.position.y = 0.8 + Math.abs(Math.sin(this.time * runSpeed * 2)) * bobH - (bobH / 2);
    };

    // Disposal method
    group.dispose = function() {
      group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    };

    group.name = "doctor";
    return group;
  },
  createPill: function() {
    const group = new THREE.Group();
    
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Top Half (Red)
    const topCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8), redMat);
    topCyl.position.y = 0.05;
    group.add(topCyl);
    
    const topSph = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), redMat);
    topSph.position.y = 0.1;
    group.add(topSph);
    
    // Bottom Half (White)
    const botCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8), whiteMat);
    botCyl.position.y = -0.05;
    group.add(botCyl);
    
    const botSph = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), whiteMat);
    botSph.position.y = -0.1;
    group.add(botSph);
    
    // Tilt slightly for aesthetic appeal
    group.rotation.z = 0.4;
    group.rotation.x = 0.3;
    
    group.name = "pill";
    group.dispose = function() {
      group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    };
    return group;
  },

  createObstacle: function(type) {
    const group = new THREE.Group();
    let width = 1.6, height = 0.6, depth = 0.4, yOffset = 0.3;
    let classification = 'low';

    // Materials
    const metalMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const darkMetalMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4 });
    const liquidMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 }); // glowing green medicine
    const plasticMat = new THREE.MeshBasicMaterial({ color: 0xddffff, transparent: true, opacity: 0.5 });

    if (type === 'syringe') {
      classification = 'high';
      width = 0.1;
      height = 1.0;
      depth = 0.1;
      yOffset = 1.5;
      
      // Syringe hanging from ceiling
      // 1. Barrel (transparent plastic)
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), plasticMat);
      barrel.position.y = 1.9;
      group.add(barrel);
      
      // 2. Liquid (glowing green)
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 8), liquidMat);
      liquid.position.y = 1.75;
      group.add(liquid);
      
      // 3. Plunger rod (metal) extending up
      const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), metalMat);
      plunger.position.y = 2.45;
      group.add(plunger);
      
      // 4. Needle cap / hub
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), darkMetalMat);
      hub.position.y = 1.45;
      group.add(hub);
      
      // 5. Needle tip
      const needleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 8), metalMat);
      needleTip.position.y = 1.05;
      group.add(needleTip);

    } else if (type === 'cabinet' || type === 'locker' || type === 'side_hazard') {
      classification = 'side';
      width = 1.6;
      height = 2.2;
      depth = 0.8;
      yOffset = 1.1;
      
      // Medical Supply Cabinet
      // 1. Main cabinet body (stainless steel)
      const cabinetBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.8), new THREE.MeshBasicMaterial({ color: 0xdcdcdc }));
      cabinetBody.position.y = 1.1;
      group.add(cabinetBody);
      
      // 2. Glass door panels on front (local +Z)
      const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.02), glassMat);
      leftGlass.position.set(-0.35, 1.2, 0.41);
      group.add(leftGlass);
      
      const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.02), glassMat);
      rightGlass.position.set(0.35, 1.2, 0.41);
      group.add(rightGlass);
      
      // 3. Door borders/frames (dark grey)
      const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.85, 0.01), darkMetalMat);
      leftFrame.position.set(-0.35, 1.2, 0.405);
      group.add(leftFrame);
      
      const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.85, 0.01), darkMetalMat);
      rightFrame.position.set(0.35, 1.2, 0.405);
      group.add(rightFrame);

      // 4. Handles
      const leftHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), metalMat);
      leftHandle.position.set(-0.08, 1.2, 0.43);
      group.add(leftHandle);

      const rightHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), metalMat);
      rightHandle.position.set(0.08, 1.2, 0.43);
      group.add(rightHandle);

    } else {
      // type === 'barrier' or default -> Hospital Gurney
      classification = 'low';
      width = 1.6;
      height = 0.6;
      depth = 0.4;
      yOffset = 0.3;
      
      // 1. Teal mattress
      const mattress = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.2, 0.7), 
        new THREE.MeshBasicMaterial({ color: 0x3388aa })
      );
      mattress.position.y = 0.5;
      group.add(mattress);
      
      // 2. Base frame (grey)
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.05, 0.5), 
        new THREE.MeshBasicMaterial({ color: 0x999999 })
      );
      frame.position.y = 0.35;
      group.add(frame);
      
      // 3. Leg struts
      const legPositions = [
        { x: -0.5, z: -0.2 }, { x: -0.5, z: 0.2 },
        { x: 0.5, z: -0.2 }, { x: 0.5, z: 0.2 }
      ];
      legPositions.forEach(pos => {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.3, 0.06),
          new THREE.MeshBasicMaterial({ color: 0xbbbbbb })
        );
        leg.position.set(pos.x, 0.2, pos.z);
        group.add(leg);
        
        // Wheels
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8),
          darkMetalMat
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, 0.05, pos.z);
        group.add(wheel);
      });
    }

    group.userData = {
      type: classification,
      width: width,
      height: height,
      depth: depth,
      yOffset: yOffset
    };

    group.name = type || "obstacle";

    group.dispose = function() {
      group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    };

    return group;
  }
};
