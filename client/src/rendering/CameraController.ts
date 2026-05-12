import * as THREE from 'three';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Object3D | null = null;

  private pos = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();

  private yaw = 0;
  private pitch = -0.3;
  private distance = 8;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.pos.copy(camera.position);
  }

  follow(target: THREE.Object3D) {
    this.target = target;
  }

  update(dt: number, cameraInput?: { yaw: number; pitch: number }) {
    if (!this.target) return;

    if (cameraInput) {
      this.yaw = cameraInput.yaw;
      this.pitch = Math.max(-1.0, Math.min(0.8, cameraInput.pitch));
    }

    const targetPos = new THREE.Vector3();
    this.target.getWorldPosition(targetPos);

    const idealPos = new THREE.Vector3(
      targetPos.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance,
      targetPos.y + 1.2 + Math.sin(this.pitch) * this.distance,
      targetPos.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance,
    );

    const smooth = Math.min(1, 8 * dt);
    this.pos.lerp(idealPos, smooth);
    this.lookTarget.lerp(targetPos.clone().add(new THREE.Vector3(0, 1.2, 0)), smooth);

    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.lookTarget);
  }
}
