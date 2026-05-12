import * as CANNON from 'cannon-es';

export class PhysicsWorld {
  public world: CANNON.World;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.81, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.defaultContactMaterial.friction = 0.4;
    this.world.defaultContactMaterial.restitution = 0.3;

    // Create ground plane
    const groundBody = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.position.set(0, 0, 0);
    this.world.addBody(groundBody);

    // Create walls
    this.createWalls();
  }

  private createWalls() {
    const halfLength = 50;
    const halfWidth = 34;
    const wallHeight = 5;
    const wallThickness = 0.5;

    const wallMat = new CANNON.Material('wall');

    // Side walls (z-axis walls)
    for (const z of [-halfWidth, halfWidth]) {
      const wall = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: wallMat });
      wall.addShape(new CANNON.Box(new CANNON.Vec3(halfLength, wallHeight / 2, wallThickness)));
      wall.position.set(0, wallHeight / 2, z);
      this.world.addBody(wall);
    }

    // Back walls (x-axis walls) with goal gap
    for (const x of [-halfLength, halfLength]) {
      // Left section
      const wall1 = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: wallMat });
      wall1.addShape(new CANNON.Box(new CANNON.Vec3(wallThickness, wallHeight / 2, halfWidth)));
      wall1.position.set(x, wallHeight / 2, 0);

      // Add goal opening using two wall segments on each side of goal
      // Actually, let's use a single wall and make the goal with triggers
      // Remove the segment where the goal is
      const goalHalfWidth = 3.66; // half of 7.32

      // Top section (above goal)
      const topWall = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: wallMat });
      topWall.addShape(new CANNON.Box(new CANNON.Vec3(wallThickness, (wallHeight - 2.44) / 2, goalHalfWidth)));
      topWall.position.set(x, wallHeight - (wallHeight - 2.44) / 2, 0);
      this.world.addBody(topWall);

      // Side sections around goal
      for (const sideZ of [-halfWidth, halfWidth]) {
        const sideDir = sideZ < 0 ? -1 : 1;
        const segmentWidth = halfWidth - goalHalfWidth;

        const sideWall = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: wallMat });
        sideWall.addShape(new CANNON.Box(new CANNON.Vec3(wallThickness, wallHeight / 2, segmentWidth)));
        sideWall.position.set(
          x,
          wallHeight / 2,
          sideDir * (goalHalfWidth + segmentWidth)
        );
        this.world.addBody(sideWall);
      }

      // Keep the original wall that includes the entire width for areas above goal height
      this.world.addBody(wall1);
    }
  }

  step(dt: number) {
    this.world.step(1 / 60, dt, 3);
  }

  dispose() {
    // Clean up bodies
    while (this.world.bodies.length) {
      this.world.removeBody(this.world.bodies[0]);
    }
  }
}
