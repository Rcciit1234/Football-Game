import * as THREE from 'three';
import { Team } from '../../../shared/index.js';

export class Effects {
  private scene: THREE.Scene;
  private particles: THREE.Points[] = [];
  private goalLights: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  goalExplosion(position: { x: number; y: number; z: number }) {
    // Create particle burst
    const particleCount = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const color = new THREE.Color();
      color.setHSL(0.05 + Math.random() * 0.1, 1, 0.5 + Math.random() * 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.2 + Math.random() * 0.5;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        Math.random() * 15,
        (Math.random() - 0.5) * 20
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);
    (particles as any)._velocities = velocities;
    (particles as any)._life = 2;
    this.particles.push(particles);
  }

  goalCelebration(team: Team) {
    const color = team === Team.Blue ? 0x3366ff : 0xff6633;

    // Flash lights
    for (let i = 0; i < 8; i++) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.8,
        })
      );
      light.position.set(
        (Math.random() - 0.5) * 120,
        5 + Math.random() * 10,
        (Math.random() - 0.5) * 80
      );
      this.scene.add(light);
      (light as any)._life = 3;
      (light as any)._color = color;
      this.goalLights.push(light);
    }
  }

  update(dt: number) {
    // Update explosion particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const velocities = (p as any)._velocities as THREE.Vector3[];
      const life = (p as any)._life as number;

      (p as any)._life = life - dt;

      const positions = p.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < velocities.length; j++) {
        positions[j * 3] += velocities[j].x * dt;
        positions[j * 3 + 1] += velocities[j].y * dt;
        positions[j * 3 + 2] += velocities[j].z * dt;

        // Gravity
        velocities[j].y -= 9.81 * dt;
      }
      p.geometry.attributes.position.needsUpdate = true;

      (p.material as THREE.Material).opacity = Math.max(0, life / 2);

      if (life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }

    // Update goal lights
    for (let i = this.goalLights.length - 1; i >= 0; i--) {
      const light = this.goalLights[i];
      const life = (light as any)._life as number;
      (light as any)._life = life - dt;

      light.position.y += dt * 2;
      light.scale.setScalar(1 + (3 - life) * 0.5);
      (light.material as THREE.Material).opacity = Math.max(0, life / 3);

      if (life <= 0) {
        this.scene.remove(light);
        light.geometry.dispose();
        (light.material as THREE.Material).dispose();
        this.goalLights.splice(i, 1);
      }
    }
  }
}
