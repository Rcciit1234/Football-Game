import { SceneManager } from '../rendering/SceneManager.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { InputManager } from '../input/InputManager.js';
import { CameraController } from '../rendering/CameraController.js';
import { NetworkManager } from './NetworkManager.js';
import { GameState } from './GameState.js';
import { Bike } from '../entities/Bike.js';
import { Ball } from '../entities/Ball.js';
import { Goal } from '../entities/Goal.js';
import { Stadium } from '../rendering/Stadium.js';
import { HUD } from '../ui/HUD.js';
import { MainMenu } from '../ui/MainMenu.js';
import { Minimap } from '../ui/Minimap.js';
import { Effects } from '../rendering/Effects.js';
import { AudioManager } from '../audio/AudioManager.js';
import {
  MatchState, Team, PlayerState, PlayerInput,
  ServerEvent
} from '../../../shared/index.js';

export class Game {
  private sceneManager!: SceneManager;
  private physics!: PhysicsWorld;
  private input!: InputManager;
  private cameraCtrl!: CameraController;
  private network!: NetworkManager;
  private state!: GameState;
  private hud!: HUD;
  private menu!: MainMenu;
  private minimap!: Minimap;
  private effects!: Effects;
  private audio!: AudioManager;
  private stadium!: Stadium;

  private bikes: Map<string, Bike> = new Map();
  private ball!: Ball;
  private goals: Goal[] = [];

  private localPlayerId: string | null = null;
  private lastInput: PlayerInput | null = null;
  private inputSequence = 0;

  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;

  private pendingCameras: string[] = [];
  private _wasKickoff = false;

  async init() {
    // Initialize systems
    this.sceneManager = new SceneManager();
    this.physics = new PhysicsWorld();
    this.input = new InputManager();
    this.state = new GameState();
    this.network = new NetworkManager();
    this.hud = new HUD();
    this.menu = new MainMenu();
    this.minimap = new Minimap();
    this.effects = new Effects(this.sceneManager.scene);
    this.audio = new AudioManager();
    this.stadium = new Stadium(this.sceneManager.scene);
    this.cameraCtrl = new CameraController(this.sceneManager.camera);

    // Create stadium
    this.stadium.build();

    // Create goals
    const blueGoal = new Goal(this.sceneManager.scene, this.physics.world, Team.Blue);
    const orangeGoal = new Goal(this.sceneManager.scene, this.physics.world, Team.Orange);
    this.goals = [blueGoal, orangeGoal];

    // Create ball
    this.ball = new Ball(this.sceneManager.scene, this.physics.world);

    // Setup event listeners
    this.setupEvents();

    // Show menu
    this.menu.show();

    // Start render loop
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();

    // Setup window resize
    window.addEventListener('resize', () => this.sceneManager.onResize());

    // Camera toggle
    window.addEventListener('keydown', (e) => {
      if (e.key === 'c' || e.key === 'C') {
        this.cameraCtrl.toggleMode();
      }
      if (e.key === 'm' || e.key === 'M') {
        const muted = this.audio.toggleMute();
        this.hud.showNotification(muted ? 'Audio: OFF' : 'Audio: ON');
      }
    });
  }

  private setupEvents() {
    this.menu.onPlay = (name: string) => {
      this.audio.init();
      this.audio.playMenuClick();
      this.network.connect(name);
      this.menu.showConnecting();
    };

    this.network.onMatchFound = (data) => {
      this.localPlayerId = this.network.socketId;
      this.state.matchId = data.matchId;
      this.menu.hide();
      this.audio.startEngine();
      this.audio.startCrowdAmbient();
    };

    this.network.onStateUpdate = (data) => {
      this.state.update(data);
      this.syncEntities();
      this.updateHUD();
      this.updateAudio();

      if (data.state === MatchState.Playing) {
        const wasKickoff = this._wasKickoff;
        if (wasKickoff) {
          this.audio.playMatchStart();
        }
        this._wasKickoff = false;
      }
      if (data.state === MatchState.Kickoff) {
        this._wasKickoff = true;
      }

      if (data.state === MatchState.GoalScored) {
        this.effects.goalExplosion(data.ball.position);
      }
    };

    this.network.onGoalScored = (data) => {
      this.effects.goalCelebration(data.team);
      this.hud.showGoalNotification(data.team, data.scorer);
      this.audio.playGoalScored();
    };

    this.network.onMatchEnd = (data) => {
      this.audio.playMatchEnd();
      this.hud.showMatchEnd(data);
      setTimeout(() => {
        this.menu.show();
        this.hud.hide();
        this.audio.stopEngine();
        this.audio.stopCrowdAmbient();
      }, 5000);
    };

    this.network.onCountdown = (data) => {
      this.hud.showCountdown(data.time);
      if (data.time > 0) {
        this.audio.playCountdownBeep();
      } else {
        this.audio.playCountdownGo();
      }
    };

    this.network.onPlayerJoined = (data) => {
      console.log('Player joined:', data);
    };

    this.network.onPlayerLeft = (data) => {
      const bike = this.bikes.get(data.id);
      if (bike) bike.remove();
      this.bikes.delete(data.id);
    };
  }

  private syncEntities() {
    const players = this.state.getPlayers();
    const ballState = this.state.getBall();

    // Sync ball
    if (ballState) {
      this.ball.sync(ballState);
    }

    // Sync bikes
    players.forEach((player) => {
      let bike = this.bikes.get(player.id);
      const isLocal = player.id === this.localPlayerId;

      if (!bike) {
        const pName = player.name || (player.isAI ? 'AI' : 'Player');
        const pNum = String(Math.floor(Math.random() * 99) + 1);
        if (isLocal) {
          bike = new Bike(this.sceneManager.scene, this.physics.world, player.team, 'player', 'You', '');
        } else {
          bike = new Bike(this.sceneManager.scene, this.physics.world, player.team, player.isAI ? 'ai' : 'remote', pName, pNum);
        }
        this.bikes.set(player.id, bike);
      }

      bike.sync(player.bike);

      // Attach camera to local player
      if (isLocal) {
        this.cameraCtrl.follow(bike.mesh);
      }
    });

    // Remove disconnected players' bikes
    this.bikes.forEach((bike, id) => {
      if (!players.has(id) && id !== 'ball') {
        // Keep AI bikes even if player state is gone (server manages)
      }
    });
  }

  private updateHUD() {
    const state = this.state;
    this.hud.updateScore(state.blueScore, state.orangeScore);
    this.hud.updateTimer(state.elapsedSeconds);

    // Update boost for local player
    if (this.localPlayerId) {
      const player = state.players.get(this.localPlayerId);
      if (player) {
        this.hud.updateBoost(player.bike.boost);
        this.hud.updateSpeed(player.bike.velocity);
      }
    }
  }

  private updateAudio() {
    if (!this.localPlayerId) return;
    const player = this.state.players.get(this.localPlayerId);
    if (!player) return;
    const speed = Math.sqrt(
      player.bike.velocity.x ** 2 +
      player.bike.velocity.y ** 2 +
      player.bike.velocity.z ** 2
    );
    this.audio.updateEngine(speed, player.bike.isBoosting);
  }

  private handleInput(dt: number) {
    if (!this.localPlayerId) return;

    const rawInput = this.input.getRawInput();
    this.inputSequence++;

    const input: PlayerInput = {
      steer: rawInput.steer,
      throttle: rawInput.throttle,
      jump: rawInput.jump,
      boost: rawInput.boost,
      pass: rawInput.pass,
      dodge: rawInput.dodge,
      dodgeDirection: rawInput.dodgeDirection,
      handbrake: rawInput.handbrake,
      camera: rawInput.camera,
      sequence: this.inputSequence,
    };

    // Send to server
    this.network.sendInput(input);
    this.lastInput = input;

    // Update minimap
    const players = this.state.getPlayers();
    const ballState = this.state.getBall();
    this.minimap.update(players, ballState);
  }

  private animate() {
    if (!this.isRunning) return;

    this.animFrameId = requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    // Step physics locally for smoothness
    this.physics.step(dt);

    // Handle input
    this.handleInput(dt);

    // Update camera with mouse input for orbit
    this.cameraCtrl.update(dt, this.input.camera);

    // Update effects
    this.effects.update(dt);

    // Render
    this.sceneManager.render();
  }

  destroy() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.network.disconnect();
    this.audio.dispose();
    this.sceneManager.dispose();
  }
}
