export class InputManager {
  private keys: Set<string> = new Set();
  private mouseX = 0;
  private mouseY = 0;
  private gamepads: (Gamepad | null)[] = [];

  // Input state
  public steer = 0;
  public throttle = 0;
  public jump = false;
  public boost = false;
  public pass = false;
  public dodge = false;
  public dodgeDirection = { x: 0, y: 0 };
  public handbrake = false;
  public camera = { yaw: 0, pitch: 0 };

  private jumpPressed = false;
  private jumpCooldown = 0;

  constructor() {
    this.setupKeyboard();
    this.setupGamepad();
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());

      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        if (!this.jumpPressed) {
          this.jump = true;
          this.jumpPressed = true;
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());

      if (e.key === ' ' || e.key === 'Space') {
        this.jump = false;
        this.jumpPressed = false;
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.pass = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.pass = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  private setupGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('[Input] Gamepad connected:', e.gamepad.id);
      this.gamepads[e.gamepad.index] = e.gamepad;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('[Input] Gamepad disconnected:', e.gamepad.id);
      this.gamepads[e.gamepad.index] = null;
    });
  }

  getRawInput() {
    // Read keyboard
    const steerKb = (this.keys.has('a') || this.keys.has('arrowleft') ? -1 : 0) +
      (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0);

    const throttleKb = (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0) +
      (this.keys.has('s') || this.keys.has('arrowdown') ? -1 : 0);

    const boostKb = this.keys.has('shift') || this.keys.has('e');
    const passKb = this.keys.has('q');

    // Gamepad input
    let steerGp = 0;
    let throttleGp = 0;
    let boostGp = false;
    let jumpGp = false;

    for (const gp of navigator.getGamepads()) {
      if (gp) {
        steerGp = gp.axes[0] || 0;
        throttleGp = -(gp.axes[1] || 0);
        boostGp = gp.buttons[7]?.pressed || false; // Right bumper
        jumpGp = gp.buttons[0]?.pressed || false; // A button

        if (Math.abs(steerGp) < 0.15) steerGp = 0;
        if (Math.abs(throttleGp) < 0.15) throttleGp = 0;
      }
    }

    // Combine inputs
    this.steer = Math.max(-1, Math.min(1, steerKb + steerGp));
    this.throttle = Math.max(-1, Math.min(1, throttleKb + throttleGp));
    this.boost = boostKb || boostGp;
    this.pass = passKb || this.pass;
    this.jump = this.jump || jumpGp;

    // Dodge on double-jump
    this.dodge = this.jump && this.jumpPressed;
    if (this.dodge) {
      this.dodgeDirection = {
        x: this.steer,
        y: this.throttle > 0 ? 1 : 0,
      };
    }

    this.handbrake = this.keys.has('shift') && this.keys.has('s');

    // Camera from mouse
    this.camera = {
      yaw: this.mouseX * 0.5,
      pitch: this.mouseY * 0.3,
    };

    const passOut = this.pass;
    this.pass = false;

    return {
      steer: this.steer,
      throttle: this.throttle,
      jump: this.jump,
      boost: this.boost,
      pass: passOut,
      dodge: this.dodge,
      dodgeDirection: this.dodgeDirection,
      handbrake: this.handbrake,
      camera: this.camera,
    };
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key);
  }
}
