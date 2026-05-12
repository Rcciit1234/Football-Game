import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Team, FIELD } from '../../../shared/index.js';

export class Goal {
  private scene: THREE.Scene;
  private world: CANNON.World;
  private team: Team;
  private group: THREE.Group;
  private triggerBody: CANNON.Body;

  constructor(scene: THREE.Scene, world: CANNON.World, team: Team) {
    this.scene = scene;
    this.world = world;
    this.team = team;
    this.group = new THREE.Group();

    const xSign = team === Team.Blue ? -1 : 1;
    const xPos = xSign * (FIELD.LENGTH / 2 + 0.1);
    const goalWidth = FIELD.GOAL_WIDTH;
    const goalHeight = FIELD.GOAL_HEIGHT;
    const goalDepth = FIELD.GOAL_DEPTH;

    // Goal frame (invisible hit detection)
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.8,
    });

    const postThickness = 0.08;

    // Vertical posts
    for (const zSign of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(postThickness, postThickness, goalHeight, 8),
        postMat
      );
      post.position.set(xPos, goalHeight / 2, zSign * goalWidth / 2);
      post.castShadow = true;
      this.group.add(post);
    }

    // Crossbar
    const crossbar = new THREE.Mesh(
      new THREE.CylinderGeometry(postThickness, postThickness, goalWidth, 8),
      postMat
    );
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(xPos, goalHeight, 0);
    crossbar.castShadow = true;
    this.group.add(crossbar);

    // Net
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.12,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: true,
    });

    // Back net
    const backNet = new THREE.Mesh(
      new THREE.PlaneGeometry(goalWidth, goalHeight, 6, 4),
      netMat
    );
    backNet.position.set(xPos - xSign * goalDepth, goalHeight / 2, 0);
    this.group.add(backNet);

    // Top net
    const topNet = new THREE.Mesh(
      new THREE.PlaneGeometry(goalWidth, goalDepth, 6, 4),
      netMat
    );
    topNet.rotation.x = -Math.PI / 2;
    topNet.position.set(xPos - xSign * goalDepth / 2, goalHeight, 0);
    this.group.add(topNet);

    // Side nets
    for (const zSign of [-1, 1]) {
      const sideNet = new THREE.Mesh(
        new THREE.PlaneGeometry(goalDepth, goalHeight, 4, 4),
        netMat
      );
      sideNet.rotation.y = Math.PI / 2;
      sideNet.position.set(xPos - xSign * goalDepth / 2, goalHeight / 2, zSign * goalWidth / 2);
      this.group.add(sideNet);
    }

    // Team-colored glow inside goal
    const glowMat = new THREE.MeshBasicMaterial({
      color: team === Team.Blue ? 0x00f0ff : 0x8b5cf6,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(goalWidth * 0.8, goalHeight * 0.8),
      glowMat
    );
    glow.position.set(xPos - xSign * goalDepth * 0.5, goalHeight / 2, 0);
    this.group.add(glow);

    this.scene.add(this.group);

    // Trigger body for goal detection
    this.triggerBody = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(0.1, goalHeight / 2, goalWidth / 2)),
    });
    this.triggerBody.position.set(xPos, goalHeight / 2, 0);
    this.world.addBody(this.triggerBody);
  }

  remove() {
    this.scene.remove(this.group);
    this.world.removeBody(this.triggerBody);
  }
}
