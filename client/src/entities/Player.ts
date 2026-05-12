import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Team, BikeState } from '../../../shared/index.js';

export class Player {
  public mesh: THREE.Group;
  public body: CANNON.Body;
  public nameLabel: THREE.Sprite;

  private scene: THREE.Scene;
  private world: CANNON.World;
  private team: Team;
  private type: 'player' | 'ai' | 'remote';
  private teamColor: number;

  private torso: THREE.Mesh;
  private head: THREE.Mesh;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftFoot: THREE.Mesh;
  private rightFoot: THREE.Mesh;

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

    this.teamColor = team === Team.Blue ? 0x00f0ff : 0x8b5cf6;

    this.mesh = new THREE.Group();

    this.torso = this.createTorso();
    this.head = this.createHead();
    this.leftArm = this.createArm();
    this.rightArm = this.createArm();
    this.leftLeg = this.createLeg();
    this.rightLeg = this.createLeg();
    this.leftFoot = this.createFoot();
    this.rightFoot = this.createFoot();

    this.mesh.add(this.torso);
    this.mesh.add(this.head);
    this.mesh.add(this.leftArm);
    this.mesh.add(this.rightArm);
    this.mesh.add(this.leftLeg);
    this.mesh.add(this.rightLeg);
    this.mesh.add(this.leftFoot);
    this.mesh.add(this.rightFoot);

    this.head.position.set(0, 0.95, 0);
    this.leftArm.position.set(-0.35, 0.55, 0);
    this.rightArm.position.set(0.35, 0.55, 0);
    this.leftLeg.position.set(-0.15, -0.2, 0);
    this.rightLeg.position.set(0.15, -0.2, 0);
    this.leftFoot.position.set(-0.15, -0.65, 0.02);
    this.rightFoot.position.set(0.15, -0.65, 0.02);

    this.nameLabel = this.createNameLabel();
    this.scene.add(this.mesh);

    this.body = new CANNON.Body({
      mass: 75,
      shape: new CANNON.Cylinder(0.3, 0.3, 1.6, 8),
      material: new CANNON.Material('player'),
    });
    this.body.position.set(0, 0.8, 0);
    this.world.addBody(this.body);
  }

  private createTorso(): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(0.28, 0.35, 0.65, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: this.teamColor,
      roughness: 0.5,
      metalness: 0.05,
    });
    const torso = new THREE.Mesh(geo, mat);
    torso.castShadow = true;
    torso.position.y = 0.05;

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
      map: numTex, transparent: true, depthTest: false, side: THREE.FrontSide,
    });
    const numMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.15), numMat);
    numMesh.position.set(0, 0.1, 0.3);
    torso.add(numMesh);

    return torso;
  }

  private createHead(): THREE.Mesh {
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffcc99, roughness: 0.6,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), headMat);
    head.castShadow = true;

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x443322, roughness: 0.9,
    });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), hairMat);
    hair.position.y = 0.04;
    hair.scale.set(1.05, 0.35, 1.05);
    head.add(hair);

    return head;
  }

  private createArm(): THREE.Group {
    const group = new THREE.Group();
    const armMat = new THREE.MeshStandardMaterial({
      color: this.teamColor, roughness: 0.5, metalness: 0.05,
    });
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6), armMat);
    upper.position.y = -0.15;
    upper.castShadow = true;
    group.add(upper);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.6 });
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.25, 6), skinMat);
    lower.position.y = -0.4;
    lower.castShadow = true;
    group.add(lower);

    return group;
  }

  private createLeg(): THREE.Group {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.6 });
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 6), skinMat);
    lower.position.y = -0.32;
    lower.castShadow = true;
    group.add(lower);
    return group;
  }

  private createFoot(): THREE.Mesh {
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x222222, roughness: 0.7, metalness: 0.1,
    });
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), shoeMat);
    foot.castShadow = true;
    return foot;
  }

  private createNameLabel(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const textW = ctx.measureText(this.playerName).width + 40;
    ctx.beginPath();
    ctx.roundRect(128 - textW / 2, 8, textW, 44, 22);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.playerName, 128, 30);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: false, sizeAttenuation: true,
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

    if (normalizedSpeed > 0.05) {
      this.animPhase += normalizedSpeed * 0.15;
    }

    const sinPhase = Math.sin(this.animPhase);
    const cosPhase = Math.cos(this.animPhase);

    this.leftArm.rotation.x = sinPhase * 0.6 * speedFactor;
    this.rightArm.rotation.x = -sinPhase * 0.6 * speedFactor;
    this.leftLeg.rotation.x = sinPhase * 0.55 * speedFactor;
    this.rightLeg.rotation.x = -sinPhase * 0.55 * speedFactor;
    this.leftFoot.rotation.x = this.leftLeg.rotation.x * 0.6;
    this.rightFoot.rotation.x = this.rightLeg.rotation.x * 0.6;
  }

  remove() {
    this.scene.remove(this.mesh);
    this.world.removeBody(this.body);
  }
}
