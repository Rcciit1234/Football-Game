import * as THREE from 'three';

export class Stadium {
  private scene: THREE.Scene;
  private fieldGroup: THREE.Group;
  private stadiumGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.fieldGroup = new THREE.Group();
    this.stadiumGroup = new THREE.Group();
  }

  build() {
    this.createField();
    this.createWalls();
    this.createStadiumStructure();
    this.createLighting();
    this.createCrowd();
    this.createEnvironment();

    this.scene.add(this.fieldGroup);
    this.scene.add(this.stadiumGroup);
  }

  private createField() {
    const L = 100;
    const W = 68;

    // Grass base with stripe pattern
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2d8a4e,
      roughness: 0.9,
      metalness: 0,
    });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(L, W), grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0.01;
    grass.receiveShadow = true;
    this.fieldGroup.add(grass);

    // Stripe overlay
    const stripeMat = new THREE.MeshBasicMaterial({
      color: 0x33a055, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
    });
    for (let i = -5; i <= 5; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(L / 10, W), stripeMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(i * (L / 10), 0.015, 0);
      if (Math.abs(i) % 2 === 0) s.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      this.fieldGroup.add(s);
    }

    // White markings
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, opacity: 0.35, transparent: true,
    });

    // Border lines
    const mkLine = (x: number, z: number, w: number, h: number, ry = 0) => {
      const g = new THREE.PlaneGeometry(w, h);
      const m = new THREE.Mesh(g, lineMat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.y = ry;
      m.position.set(x, 0.02, z);
      this.fieldGroup.add(m);
    };

    mkLine(0, 0, L, 0.08);
    mkLine(-L / 2, 0, 0.08, W, Math.PI / 2);
    mkLine(L / 2, 0, 0.08, W, Math.PI / 2);
    mkLine(0, -W / 2, L, 0.08);
    mkLine(0, W / 2, L, 0.08);

    // Center line
    mkLine(0, 0, 0.08, W, Math.PI / 2);

    // Center circle
    const circGeo = new THREE.RingGeometry(9.15, 9.25, 48);
    const circMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, opacity: 0.35, transparent: true, side: THREE.DoubleSide,
    });
    const circ = new THREE.Mesh(circGeo, circMat);
    circ.rotation.x = -Math.PI / 2;
    circ.position.y = 0.02;
    this.fieldGroup.add(circ);

    // Center dot
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = 0.02;
    this.fieldGroup.add(dot);

    // Penalty areas
    for (const xSign of [-1, 1]) {
      const pX = xSign * (L / 2 - 16.5 / 2);
      mkLine(pX - 16.5 / 2, 0, 0.08, 40.3, Math.PI / 2);
      mkLine(pX + 16.5 / 2, 0, 0.08, 40.3, Math.PI / 2);
      mkLine(pX, -40.3 / 2, 16.5, 0.08);
      mkLine(pX, 40.3 / 2, 16.5, 0.08);

      // Goal area (6yd)
      const gX = xSign * (L / 2 - 5.5 / 2);
      mkLine(gX - 5.5 / 2, 0, 0.08, 18.3, Math.PI / 2);
      mkLine(gX + 5.5 / 2, 0, 0.08, 18.3, Math.PI / 2);
      mkLine(gX, -18.3 / 2, 5.5, 0.08);
      mkLine(gX, 18.3 / 2, 5.5, 0.08);

      // Penalty spot
      const spot = new THREE.Mesh(
        new THREE.CircleGeometry(0.15, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })
      );
      spot.rotation.x = -Math.PI / 2;
      spot.position.set(xSign * (L / 2 - 11), 0.02, 0);
      this.fieldGroup.add(spot);
    }

    // Goals
    for (const xSign of [-1, 1]) {
      this.createGoal(xSign);
    }

    // Corner arcs
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, opacity: 0.3, transparent: true, side: THREE.DoubleSide,
    });
    for (const xSign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        const arc = new THREE.Mesh(
          new THREE.RingGeometry(1, 1.08, 24, 1, 0, Math.PI / 2),
          arcMat
        );
        arc.rotation.x = -Math.PI / 2;
        arc.position.set(xSign * (L / 2), 0.02, zSign * (W / 2));
        arc.rotation.z = xSign * zSign > 0 ? Math.PI / 2 : 0;
        this.fieldGroup.add(arc);
      }
    }

    // Boost pads
    this.createBoostPads();
  }

  private createGoal(xSign: number) {
    const gw = 7.32, gh = 2.44, gd = 2.5;
    const xPos = xSign * (50 + gd / 2);

    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.2, metalness: 0.8,
    });
    const pt = 0.08;

    for (const zSign of [-1, 1]) {
      const zPos = zSign * gw / 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(pt, pt, gh, 8), postMat);
      post.position.set(xPos, gh / 2, zPos);
      post.castShadow = true;
      this.fieldGroup.add(post);
    }

    // Crossbar
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(pt, pt, gw, 8), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(xPos, gh, 0);
    crossbar.castShadow = true;
    this.fieldGroup.add(crossbar);

    // Net
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, opacity: 0.1, transparent: true, wireframe: true, side: THREE.DoubleSide,
    });
    const netRes = { w: 8, h: 6 };

    const backNet = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh, netRes.w, netRes.h), netMat);
    backNet.position.set(xPos - xSign * gd, gh / 2, 0);
    this.fieldGroup.add(backNet);

    const topNet = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd, netRes.w, 4), netMat);
    topNet.rotation.x = -Math.PI / 2;
    topNet.position.set(xPos - xSign * gd / 2, gh, 0);
    this.fieldGroup.add(topNet);

    for (const zSign of [-1, 1]) {
      const sideNet = new THREE.Mesh(new THREE.PlaneGeometry(gd, gh, 4, netRes.h), netMat);
      sideNet.rotation.y = Math.PI / 2;
      sideNet.position.set(xPos - xSign * gd / 2, gh / 2, zSign * gw / 2);
      this.fieldGroup.add(sideNet);
    }

    // Goal inner glow
    const glowMat = new THREE.MeshBasicMaterial({
      color: xSign < 0 ? 0x2255cc : 0xcc3322,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(gw * 0.7, gh * 0.7), glowMat);
    glow.position.set(xPos - xSign * gd * 0.5, gh / 2, 0);
    this.fieldGroup.add(glow);
  }

  private createBoostPads() {
    const padMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, emissive: 0xff8800, emissiveIntensity: 0.4,
      roughness: 0.3, metalness: 0.1,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff6600, transparent: true, opacity: 0.12,
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700, transparent: true, opacity: 0.25, side: THREE.DoubleSide,
    });

    const positions = [
      { x: 0, z: 0 }, { x: 0, z: -20 }, { x: 0, z: 20 },
      { x: -15, z: -25 }, { x: -15, z: 25 }, { x: 15, z: -25 }, { x: 15, z: 25 },
      { x: -30, z: -15 }, { x: -30, z: 15 }, { x: 30, z: -15 }, { x: 30, z: 15 },
      { x: -42, z: -10 }, { x: -42, z: 10 }, { x: 42, z: -10 }, { x: 42, z: 10 },
      { x: -25, z: -30 }, { x: -25, z: 30 }, { x: 25, z: -30 }, { x: 25, z: 30 },
    ];

    for (const p of positions) {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.05, 16), padMat);
      pad.position.set(p.x, 0.03, p.z);
      pad.receiveShadow = true;
      this.fieldGroup.add(pad);

      const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.7, 24), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x, 0.04, p.z);
      this.fieldGroup.add(ring);

      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(p.x, 0.04, p.z);
      this.fieldGroup.add(glow);

      // Lightning bolt icon
      const boltMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
      for (const dir of ['h', 'v']) {
        const bolt = new THREE.Mesh(
          new THREE.BoxGeometry(dir === 'h' ? 0.25 : 0.05, 0.02, dir === 'h' ? 0.05 : 0.25),
          boltMat
        );
        bolt.position.set(p.x, 0.06, p.z);
        this.fieldGroup.add(bolt);
      }
    }
  }

  private createWalls() {
    const HL = 50, HW = 34, WH = 5;
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a4a, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.7,
    });

    // Side walls (glass-like)
    for (const z of [-HW, HW]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(HL * 2, WH, 0.15), wallMat);
      w.position.set(0, WH / 2, z);
      w.receiveShadow = true;
      this.fieldGroup.add(w);
    }

    // Back walls with goal gaps
    const goalHalf = 3.66;
    for (const x of [-HL, HL]) {
      for (const zSign of [-1, 1]) {
        const segW = HW - goalHalf;
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.15, WH, segW), wallMat);
        w.position.set(x, WH / 2, zSign * (goalHalf + segW / 2));
        w.receiveShadow = true;
        this.fieldGroup.add(w);
      }
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.15, WH - 2.44, goalHalf * 2), wallMat);
      top.position.set(x, WH - (WH - 2.44) / 2, 0);
      this.fieldGroup.add(top);
    }

    // Perimeter advertising boards
    const adMat = new THREE.MeshStandardMaterial({
      color: 0x0d1b2a, roughness: 0.4, metalness: 0.7,
    });
    // Create LED-like ad boards around the field
    const adColors = [0x2255cc, 0xcc3322, 0x22aa44, 0xffaa00, 0x8822cc, 0x00aaaa];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const radius = 36;
      const x = Math.cos(angle) * 50 * 0.9;
      const z = Math.sin(angle) * 34 * 0.9;
      // Only place on straight sections
      if (Math.abs(x) < 45 && Math.abs(z) < 30) {
        const board = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 1.2, 0.08),
          new THREE.MeshStandardMaterial({
            color: adColors[i % adColors.length],
            roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.6,
          })
        );
        board.position.set(
          Math.max(-48, Math.min(48, x)),
          0.7,
          Math.max(-32, Math.min(32, z))
        );
        board.lookAt(0, 0.7, 0);
        this.fieldGroup.add(board);
      }
    }
  }

  private createStadiumStructure() {
    const HL = 50, HW = 34;
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9, metalness: 0.1 });
    const standMatUpper = new THREE.MeshStandardMaterial({ color: 0x16213e, roughness: 0.8, metalness: 0.1 });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x0f3460, roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.2,
    });

    // Three tiers of stands
    const tiers = [
      { y: 0.5, h: 4, offset: 2, mat: standMat },
      { y: 5.5, h: 5, offset: 5, mat: standMatUpper },
      { y: 11.5, h: 6, offset: 8, mat: standMatUpper },
    ];

    for (const t of tiers) {
      // Side stands
      for (const zSign of [-1, 1]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(HL * 2 + 4, t.h, t.offset), t.mat);
        s.position.set(0, t.y + t.h / 2, zSign * (HW + t.offset / 2 + 1.5));
        s.receiveShadow = true;
        this.stadiumGroup.add(s);
      }

      // Corner stands
      for (const xSign of [-1, 1]) {
        for (const zSign of [-1, 1]) {
          const c = new THREE.Mesh(new THREE.BoxGeometry(t.offset + 2, t.h, t.offset + 2), t.mat);
          c.position.set(xSign * (HL + (t.offset + 2) / 2), t.y + t.h / 2, zSign * (HW + (t.offset + 2) / 2 + 1.5));
          c.receiveShadow = true;
          this.stadiumGroup.add(c);
        }
      }

      // Roof canopy
      for (const zSign of [-1, 1]) {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(HL * 2 + 8, 0.2, t.offset + 6), roofMat);
        roof.position.set(0, t.y + t.h + 0.5, zSign * (HW + t.offset / 2 + 4));
        this.stadiumGroup.add(roof);
      }
    }

    // Main entrance tunnels
    const entranceMat = new THREE.MeshStandardMaterial({ color: 0x0a0a1a, roughness: 0.8, metalness: 0.3 });
    for (const zSign of [-1, 1]) {
      // Tunnel
      const tunnel = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 4), entranceMat);
      tunnel.position.set(0, 2.5, zSign * (HW + 4));
      this.stadiumGroup.add(tunnel);

      // Tunnel arch
      const archMat = new THREE.MeshStandardMaterial({ color: 0x334466, metalness: 0.7, roughness: 0.3 });
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2, 0.15, 8, 12, Math.PI), archMat);
      arch.position.set(0, 4, zSign * (HW + 4) - zSign * 2);
      arch.rotation.y = Math.PI / 2;
      this.stadiumGroup.add(arch);
    }

    // Scoreboard structure (above center of one stand)
    const scoreMat = new THREE.MeshStandardMaterial({ color: 0x0a0a1a, metalness: 0.6, roughness: 0.3 });
    const scoreboard = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 1.5), scoreMat);
    scoreboard.position.set(0, 20, 48);
    this.stadiumGroup.add(scoreboard);

    // Scoreboard screen
    const screenMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.3 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), screenMat);
    screen.position.set(0, 20, 48.8);
    this.stadiumGroup.add(screen);

    // Floodlight towers
    for (const x of [-HL - 5, HL + 5]) {
      for (const z of [-HW - 5, HW + 5]) {
        this.createFloodlightTower(x, z);
      }
    }
  }

  private createFloodlightTower(x: number, z: number) {
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5, metalness: 0.7 });

    // Main pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 28, 8), towerMat);
    pole.position.set(x, 14, z);
    pole.castShadow = true;
    this.stadiumGroup.add(pole);

    // Cross arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.15), towerMat);
    arm.position.set(x, 27.5, z);
    this.stadiumGroup.add(arm);

    // Light housings
    const lightMat = new THREE.MeshStandardMaterial({ color: 0x555577, roughness: 0.3, metalness: 0.8 });
    for (const side of [-1, 1]) {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.6), lightMat);
      housing.position.set(x + side * 1, 27.5, z);
      this.stadiumGroup.add(housing);

      // Light glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 })
      );
      glow.position.set(x + side * 1, 27.3, z);
      this.stadiumGroup.add(glow);
    }

    // Spot light (actual Three.js light)
    const spot = new THREE.SpotLight(0xffffff, 40, 70, Math.PI / 5, 0.6, 1.2);
    spot.position.set(x, 27, z);
    spot.target.position.set(-x * 0.2, 0, -z * 0.2);
    spot.castShadow = true;
    spot.shadow.mapSize.width = 1024;
    spot.shadow.mapSize.height = 1024;
    this.stadiumGroup.add(spot);
    this.stadiumGroup.add(spot.target);

    // Visible light beam (faded cone)
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x4466aa, transparent: true, opacity: 0.03, side: THREE.DoubleSide, depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(20, 50, 8, 1, true), beamMat);
    beam.position.set(x, 20, z);
    beam.lookAt(-x * 0.2, 0, -z * 0.2);
    this.stadiumGroup.add(beam);
  }

  private createLighting() {
    const ambient = new THREE.AmbientLight(0x8899bb, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(40, 50, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;
    this.scene.add(dirLight);

    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-30, 20, -20);
    this.scene.add(fill);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a7d44, 0.4);
    this.scene.add(hemi);
  }

  private createCrowd() {
    const HL = 50, HW = 34;

    // Generate dense crowd sprites in all stands
    for (let i = 0; i < 400; i++) {
      const side = Math.floor(Math.random() * 4);
      const tier = Math.floor(Math.random() * 3);
      const tierOffsets = [3, 6, 9];

      let x = 0, z = 0;
      const standW = (HL * 2 - 8);
      const standD = 2 + tier * 3;

      switch (side) {
        case 0: x = (Math.random() - 0.5) * standW; z = HW + 2 + Math.random() * standD; break;
        case 1: x = (Math.random() - 0.5) * standW; z = -HW - 2 - Math.random() * standD; break;
        case 2: x = HL + 2 + Math.random() * standD; z = (Math.random() - 0.5) * (HW * 2 - 8); break;
        case 3: x = -HL - 2 - Math.random() * standD; z = (Math.random() - 0.5) * (HW * 2 - 8); break;
      }

      const color = new THREE.Color();
      // Mix of team colors and neutrals
      const hue = Math.random() < 0.4
        ? (Math.random() < 0.5 ? 0.6 : 0.05)
        : 0.55 + Math.random() * 0.1;
      color.setHSL(hue, 0.3 + Math.random() * 0.4, 0.15 + Math.random() * 0.25);

      const spriteMat = new THREE.SpriteMaterial({
        color,
        transparent: true,
        opacity: 0.4 + Math.random() * 0.3,
      });

      const sprite = new THREE.Sprite(spriteMat);
      const yBase = Math.random() * 4;
      sprite.position.set(x, 1 + yBase + tier * 5 + Math.random() * 3, z);
      sprite.scale.set(0.6 + Math.random() * 0.4, 0.8 + Math.random() * 0.6, 1);
      this.stadiumGroup.add(sprite);
    }
  }

  private createEnvironment() {
    // Stars
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1200;
      positions[i * 3 + 1] = 60 + Math.random() * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1200;
      const brightness = 0.3 + Math.random() * 0.7;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.3, vertexColors: true, transparent: true, opacity: 0.7,
    });
    const stars = new THREE.Points(geo, mat);
    this.scene.add(stars);
  }
}
