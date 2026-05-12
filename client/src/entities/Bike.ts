import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Team, BIKE as BIKE_CONST, BikeState } from '../../../shared/index.js';

export class Bike {
  public mesh: THREE.Group;
  public body: CANNON.Body;
  public nameLabel: THREE.Sprite;

  private scene: THREE.Scene;
  private world: CANNON.World;
  private team: Team;
  private type: 'player' | 'ai' | 'remote';
  private teamColor: number;
  private accentColor: number;

  // Body parts
  private torso: THREE.Mesh;
  private head: THREE.Mesh;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftFoot: THREE.Mesh;
  private rightFoot: THREE.Mesh;
  private boostGlow: THREE.Mesh;

  private animPhase = 0;
  private playerName = '';
  private playerNumber = '';

  constructor(
    scene: THREE.Scene, world: CANNON.World,
    team: Team, type: 'player' | 'ai' | 'remote',
    playerName = '', playerNumber = ''
  ) {
    this.scene = scene;
    this.world = world;
    this.team = team;
    this.type = type;
    this.playerName = playerName || (type === 'ai' ? 'AI' : 'Player');
    this.playerNumber = playerNumber || String(Math.floor(Math.random() * 99) + 1);

    this.teamColor = team === Team.Blue ? 0x2255cc : 0xcc3322;
    this.accentColor = team === Team.Blue ? 0x4488ff : 0xff5533;

    this.mesh = new THREE.Group();

    this.torso = this.createTorso();
    this.head = this.createHead();
    this.leftArm = this.createArm();
    this.rightArm = this.createArm();
    this.leftLeg = this.createLeg();
    this.rightLeg = this.createLeg();
    this.leftFoot = this.createFoot();
    this.rightFoot = this.createFoot();
    this.boostGlow = this.createBoostGlow();

    this.mesh.add(this.torso);
    this.mesh.add(this.head);
    this.mesh.add(this.leftArm);
    this.mesh.add(this.rightArm);
    this.mesh.add(this.leftLeg);
    this.mesh.add(this.rightLeg);
    this.mesh.add(this.leftFoot);
    this.mesh.add(this.rightFoot);
    this.mesh.add(this.boostGlow);

    // Position body parts (in meters)
    this.head.position.set(0, 0.95, 0);
    this.leftArm.position.set(-0.35, 0.55, 0);
    this.rightArm.position.set(0.35, 0.55, 0);
    this.leftLeg.position.set(-0.15, -0.2, 0);
    this.rightLeg.position.set(0.15, -0.2, 0);
    this.leftFoot.position.set(-0.15, -0.65, 0.02);
    this.rightFoot.position.set(0.15, -0.65, 0.02);
    this.boostGlow.position.set(0, -0.8, 0);

    // Create name label
    this.nameLabel = this.createNameLabel();

    this.scene.add(this.mesh);

    // Physics body
    this.body = new CANNON.Body({
      mass: 75,
      shape: new CANNON.Box(new CANNON.Vec3(0.35, 0.75, 0.3)),
      material: new CANNON.Material('player'),
    });
    this.body.position.set(0, 0.75, 0);
    this.world.addBody(this.body);
  }

  private createTorso(): THREE.Mesh {
    const group = new THREE.Group();

    // Main torso cylinder
    const geo = new THREE.CylinderGeometry(0.28, 0.35, 0.65, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: this.teamColor,
      roughness: 0.5,
      metalness: 0.05,
    });
    const torso = new THREE.Mesh(geo, mat);
    torso.castShadow = true;
    torso.position.y = 0.05;

    // Jersey stripe
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      opacity: 0.25,
      transparent: true,
    });
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.36, 0.04, 10),
      stripeMat
    );
    stripe.position.y = 0.1;
    torso.add(stripe);

    // Shoulder pads
    const padMat = new THREE.MeshStandardMaterial({
      color: this.accentColor,
      roughness: 0.4,
      metalness: 0.2,
    });
    for (const side of [-1, 1]) {
      const pad = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        padMat
      );
      pad.position.set(side * 0.38, 0.28, 0);
      pad.scale.set(1, 0.5, 0.7);
      torso.add(pad);
    }

    // Jersey number on chest (via small box with colored material)
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 32;
    numCanvas.height = 40;
    const ctx = numCanvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.playerNumber, 16, 20);

    const numTex = new THREE.CanvasTexture(numCanvas);
    const numMat = new THREE.MeshBasicMaterial({
      map: numTex,
      transparent: true,
      depthTest: false,
      side: THREE.FrontSide,
    });
    const numMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.15), numMat);
    numMesh.position.set(0, 0.1, 0.3);
    torso.add(numMesh);

    return torso;
  }

  private createHead(): THREE.Mesh {
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffcc99,
      roughness: 0.6,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), headMat);
    head.castShadow = true;

    // Hair
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x443322,
      roughness: 0.9,
    });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), hairMat);
    hair.position.y = 0.04;
    hair.scale.set(1.05, 0.35, 1.05);
    head.add(hair);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
      eye.position.set(side * 0.07, 0.02, 0.15);
      head.add(eye);
    }

    // Visor
    const visorMat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.3,
    });
    const visor = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.025, 6, 12),
      visorMat
    );
    visor.position.set(0, 0.01, 0.14);
    visor.rotation.x = 0.3;
    head.add(visor);

    // Mouth
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xcc8866 });
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.015), mouthMat);
    mouth.position.set(0, -0.04, 0.16);
    head.add(mouth);

    return head;
  }

  private createArm(): THREE.Group {
    const group = new THREE.Group();

    // Upper arm
    const armMat = new THREE.MeshStandardMaterial({
      color: this.teamColor,
      roughness: 0.5,
      metalness: 0.05,
    });
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6),
      armMat
    );
    upper.position.y = -0.15;
    upper.castShadow = true;
    group.add(upper);

    // Lower arm (sleeve/skin)
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffcc99,
      roughness: 0.6,
    });
    const lower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.25, 6),
      skinMat
    );
    lower.position.y = -0.4;
    lower.castShadow = true;
    group.add(lower);

    // Hand
    const handMat = new THREE.MeshStandardMaterial({
      color: 0xffcc99,
      roughness: 0.7,
    });
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), handMat);
    hand.position.y = -0.53;
    group.add(hand);

    return group;
  }

  private createLeg(): THREE.Group {
    const group = new THREE.Group();

    // Shorts
    const shortsMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
    });
    const shorts = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.08, 0.2, 8),
      shortsMat
    );
    shorts.position.y = -0.1;
    shorts.castShadow = true;
    group.add(shorts);

    // Lower leg
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffcc99,
      roughness: 0.6,
    });
    const lower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.3, 6),
      skinMat
    );
    lower.position.y = -0.32;
    lower.castShadow = true;
    group.add(lower);

    // Sock band
    const sockMat = new THREE.MeshStandardMaterial({
      color: this.accentColor,
      roughness: 0.8,
    });
    const sock = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.02, 6, 8),
      sockMat
    );
    sock.position.y = -0.2;
    sock.rotation.x = Math.PI / 2;
    group.add(sock);

    return group;
  }

  private createFoot(): THREE.Mesh {
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.7,
      metalness: 0.1,
    });
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.16),
      shoeMat
    );
    foot.castShadow = true;

    // Cleat dots
    const cleatMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    for (let i = 0; i < 4; i++) {
      const cleat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.015, 0.02, 4),
        cleatMat
      );
      cleat.position.set(
        (i % 2 === 0 ? -1 : 1) * 0.025,
        -0.04,
        (i < 2 ? -1 : 1) * 0.04
      );
      foot.add(cleat);
    }

    return foot;
  }

  private createBoostGlow(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(0.2, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: this.teamColor,
      transparent: true,
      opacity: 0,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createNameLabel(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const textW = ctx.measureText(this.playerName).width + 40;
    ctx.beginPath();
    ctx.roundRect(128 - textW / 2, 8, textW, 44, 22);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.playerName, 128, 30);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      sizeAttenuation: true,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.5, 0.4, 1);
    sprite.position.set(0, 1.3, 0);
    sprite.renderOrder = 999;
    this.mesh.add(sprite);
    return sprite;
  }

  sync(state: BikeState) {
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);

    this.body.position.set(state.position.x, state.position.y, state.position.z);

    const speed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
    const normalizedSpeed = Math.min(1, speed / 35);
    const speedFactor = Math.max(normalizedSpeed, 0.1);

    // Running animation
    if (normalizedSpeed > 0.05) {
      this.animPhase += normalizedSpeed * 0.15;
    }

    const sinPhase = Math.sin(this.animPhase);
    const cosPhase = Math.cos(this.animPhase);

    // Arms swing in natural running motion
    this.leftArm.rotation.x = sinPhase * 0.6 * speedFactor;
    this.rightArm.rotation.x = -sinPhase * 0.6 * speedFactor;
    // Arms close in slightly on forward swing
    this.leftArm.rotation.z = 0.15 - sinPhase * 0.08 * speedFactor;
    this.rightArm.rotation.z = -0.15 + sinPhase * 0.08 * speedFactor;
    // Slight arm rotation for natural feel
    this.leftArm.rotation.y = (1 - Math.abs(sinPhase)) * 0.08 * speedFactor;
    this.rightArm.rotation.y = (1 - Math.abs(sinPhase)) * -0.08 * speedFactor;

    // Legs with fuller range of motion
    this.leftLeg.rotation.x = sinPhase * 0.55 * speedFactor;
    this.rightLeg.rotation.x = -sinPhase * 0.55 * speedFactor;

    // Feet follow legs with slight lag
    this.leftFoot.rotation.x = this.leftLeg.rotation.x * 0.6;
    this.rightFoot.rotation.x = this.rightLeg.rotation.x * 0.6;

    // Torso lean on turns (more pronounced)
    this.torso.rotation.z = Math.max(-0.18, Math.min(0.18, -state.angularVelocity.y * 0.06));
    // Forward lean when running
    this.torso.rotation.x = -normalizedSpeed * 0.12;

    // Head natural movement
    this.head.rotation.x = Math.sin(Date.now() * 0.003) * 0.03;
    this.head.rotation.z = -sinPhase * 0.02 * speedFactor;

    // Idle breathing
    if (normalizedSpeed < 0.05) {
      const breathe = Math.sin(Date.now() * 0.002) * 0.01;
      this.torso.scale.y = 1 + breathe;
      // Gentle idle sway
      this.torso.rotation.z = Math.sin(Date.now() * 0.001) * 0.01;
    } else {
      this.torso.scale.y = 1;
    }

    // Boost glow effect
    this.boostGlow.visible = state.isBoosting;
    if (state.isBoosting) {
      const s = 1 + Math.sin(Date.now() * 0.02) * 0.3;
      this.boostGlow.scale.set(s, s, s);
      (this.boostGlow.material as THREE.Material).opacity = 0.25 + Math.sin(Date.now() * 0.025) * 0.15;
      this.boostGlow.position.y = -0.8 - Math.sin(Date.now() * 0.02) * 0.1;
    } else {
      (this.boostGlow.material as THREE.Material).opacity = 0;
    }

    // Update name label visibility — always visible for local player, only when close for others
    const label = this.mesh.children.find(
      (c) => c instanceof THREE.Sprite
    ) as THREE.Sprite | undefined;
    if (label) {
      label.lookAt(this.scene.position);
    }
  }

  remove() {
    this.scene.remove(this.mesh);
    this.world.removeBody(this.body);
  }
}
