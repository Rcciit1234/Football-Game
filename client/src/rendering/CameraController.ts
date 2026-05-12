import * as THREE from 'three';

export enum CameraMode {
  Chase = 'chase',
  TopDown = 'topdown',
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Object3D | null = null;
  private mode: CameraMode = CameraMode.Chase;

  // Spring state for smooth camera
  private pos = new THREE.Vector3();
  private posVel = new THREE.Vector3();
  private lookAt = new THREE.Vector3();
  private lookAtVel = new THREE.Vector3();

  // Orbit offset from mouse
  private orbitYaw = 0;
  private orbitPitch = 0;
  private targetOrbitYaw = 0;
  private targetOrbitPitch = 0;

  // Chase parameters
  private chaseDistance = 9;
  private chaseHeight = 4.5;

  // Top-down
  private topDownHeight = 50;

  // Spring constants (critically damped)
  private omega = 5;

  // Mode transition
  private modeTransition = 0;
  private switchingMode = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.pos.copy(camera.position);
    this.lookAt.set(0, 0, 0);
  }

  follow(target: THREE.Object3D) {
    this.target = target;
  }

  toggleMode() {
    this.mode = this.mode === CameraMode.Chase ? CameraMode.TopDown : CameraMode.Chase;
    this.switchingMode = true;
    this.modeTransition = 0;
    this.posVel.set(0, 0, 0);
    this.lookAtVel.set(0, 0, 0);
  }

  setMode(mode: CameraMode) {
    if (mode !== this.mode) {
      this.mode = mode;
      this.switchingMode = true;
      this.modeTransition = 0;
      this.posVel.set(0, 0, 0);
      this.lookAtVel.set(0, 0, 0);
    }
  }

  update(dt: number, cameraInput?: { yaw: number; pitch: number }) {
    if (!this.target) return;

    if (this.mode === CameraMode.Chase) {
      this.updateChase(dt, cameraInput);
    } else {
      this.updateTopDown(dt);
    }
  }

  private springTo(target: THREE.Vector3, velocity: THREE.Vector3, dt: number) {
    const omega = this.omega;
    const x0 = new THREE.Vector3().copy(target).sub(
      this.mode === CameraMode.Chase ? this.pos : this.pos
    );
    velocity.add(x0.clone().multiplyScalar(omega * omega * dt));
    velocity.multiplyScalar(1 / (1 + 2 * omega * dt));
    if (this.mode === CameraMode.Chase) {
      this.pos.add(velocity.clone().multiplyScalar(dt));
    } else {
      this.pos.add(velocity.clone().multiplyScalar(dt));
    }
  }

  private updateChase(dt: number, cameraInput?: { yaw: number; pitch: number }) {
    if (!this.target) return;

    const targetPos = new THREE.Vector3();
    this.target.getWorldPosition(targetPos);

    // Smooth orbit from mouse
    if (cameraInput) {
      this.targetOrbitYaw = cameraInput.yaw * 0.6;
      this.targetOrbitPitch = Math.max(-0.4, Math.min(0.4, cameraInput.pitch * 0.4));
    }

    const orbitT = Math.min(1, 3 * dt);
    this.orbitYaw += (this.targetOrbitYaw - this.orbitYaw) * orbitT;
    this.orbitPitch += (this.targetOrbitPitch - this.orbitPitch) * orbitT;

    // Forward direction from target
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.target.quaternion);

    // Base desired position behind player
    const basePos = targetPos.clone()
      .add(forward.clone().multiplyScalar(-this.chaseDistance))
      .add(new THREE.Vector3(0, this.chaseHeight, 0));

    // Apply orbit offset around the player
    const orbitOffset = new THREE.Vector3(
      Math.sin(this.orbitYaw) * 2.5,
      Math.sin(this.orbitPitch) * 2,
      -Math.abs(Math.cos(this.orbitYaw)) * 1.5 + 1.5
    );
    const desiredPos = basePos.clone().add(orbitOffset);

    // Look slightly ahead of player
    const lookTarget = targetPos.clone().add(forward.clone().multiplyScalar(2));

    // Critically damped spring to desired position
    const omega = this.omega;
    const dx = desiredPos.x - this.pos.x;
    const dy = desiredPos.y - this.pos.y;
    const dz = desiredPos.z - this.pos.z;

    this.posVel.x += dx * omega * omega * dt;
    this.posVel.y += dy * omega * omega * dt;
    this.posVel.z += dz * omega * omega * dt;

    this.posVel.x /= (1 + 2 * omega * dt);
    this.posVel.y /= (1 + 2 * omega * dt);
    this.posVel.z /= (1 + 2 * omega * dt);

    this.pos.x += this.posVel.x * dt;
    this.pos.y += this.posVel.y * dt;
    this.pos.z += this.posVel.z * dt;

    // Spring for lookAt
    const ldx = lookTarget.x - this.lookAt.x;
    const ldy = lookTarget.y - this.lookAt.y;
    const ldz = lookTarget.z - this.lookAt.z;

    this.lookAtVel.x += ldx * omega * omega * dt;
    this.lookAtVel.y += ldy * omega * omega * dt;
    this.lookAtVel.z += ldz * omega * omega * dt;

    this.lookAtVel.x /= (1 + 2 * omega * dt);
    this.lookAtVel.y /= (1 + 2 * omega * dt);
    this.lookAtVel.z /= (1 + 2 * omega * dt);

    this.lookAt.x += this.lookAtVel.x * dt;
    this.lookAt.y += this.lookAtVel.y * dt;
    this.lookAt.z += this.lookAtVel.z * dt;

    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.lookAt);
  }

  private updateTopDown(dt: number) {
    if (!this.target) return;

    const targetPos = new THREE.Vector3();
    this.target.getWorldPosition(targetPos);

    const desiredPos = targetPos.clone().add(new THREE.Vector3(0, this.topDownHeight, 0));

    // Spring to top-down
    const omega = this.omega;
    const dx = desiredPos.x - this.pos.x;
    const dy = desiredPos.y - this.pos.y;
    const dz = desiredPos.z - this.pos.z;

    this.posVel.x += dx * omega * omega * dt;
    this.posVel.y += dy * omega * omega * dt;
    this.posVel.z += dz * omega * omega * dt;

    this.posVel.x /= (1 + 2 * omega * dt);
    this.posVel.y /= (1 + 2 * omega * dt);
    this.posVel.z /= (1 + 2 * omega * dt);

    this.pos.x += this.posVel.x * dt;
    this.pos.y += this.posVel.y * dt;
    this.pos.z += this.posVel.z * dt;

    this.camera.position.copy(this.pos);
    this.camera.lookAt(targetPos);
  }

  getMode(): CameraMode {
    return this.mode;
  }
}
