import { Socket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';
import {
  PlayerState, PlayerInput, BallState, MatchInfo, MatchState,
  Team, BikeState, ClientEvent, ServerEvent, MatchConfig,
  FIELD, BIKE, BALL
} from '../../shared/index.js';
import { AIController } from './AIController.js';

interface QueuedPlayer {
  socket: Socket;
  name: string;
}

interface Match {
  id: string;
  state: MatchState;
  config: MatchConfig;
  players: Map<string, PlayerState>;
  ball: BallState;
  blueScore: number;
  orangeScore: number;
  elapsedSeconds: number;
  kickoffTimer: number;
  lastInputs: Map<string, PlayerInput>;
  lastUpdateTime: number;
  tickRate: number;
  tickAccumulator: number;
  goalScoredTimer: number;
  ended: boolean;
  passCooldowns: Map<string, number>;
}

let matchCounter = 0;

export class MatchManager {
  private io: SocketIOServer;
  private queue: QueuedPlayer[] = [];
  private matches: Map<string, Match> = new Map();
  private playerMatchMap: Map<string, string> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.startTicks();
  }

  private startTicks() {
    this.tickInterval = setInterval(() => this.tick(), 1000 / 30); // 30 ticks/sec
  }

  private matchmakingTimer: NodeJS.Timeout | null = null;

  addToQueue(socket: Socket, name: string) {
    if (this.playerMatchMap.has(socket.id)) return;
    this.queue.push({ socket, name });
    console.log(`[Queue] ${name} joined queue. Queue size: ${this.queue.length}`);

    if (this.queue.length >= 12) {
      if (this.matchmakingTimer) {
        clearTimeout(this.matchmakingTimer);
        this.matchmakingTimer = null;
      }
      this.createMatch();
    } else if (this.queue.length >= 1 && this.queue.length < 12) {
      // Start matchmaking timer if not already running
      if (!this.matchmakingTimer) {
        const countdown = Math.max(3, 12 - this.queue.length);
        this.matchmakingTimer = setTimeout(() => {
          this.matchmakingTimer = null;
          this.createMatch();
        }, countdown * 1000);
        console.log(`[Queue] Match starting in ${countdown}s (waiting for more players...)`);
      }
    }
  }

  removeFromQueue(socket: Socket) {
    this.queue = this.queue.filter(q => q.socket.id !== socket.id);
  }

  removePlayer(socketId: string) {
    this.queue = this.queue.filter(q => q.socket.id !== socketId);
    const matchId = this.playerMatchMap.get(socketId);
    if (matchId) {
      const match = this.matches.get(matchId);
      if (match) {
        const player = match.players.get(socketId);
        if (player) {
          player.connected = false;
          // Notify others
          this.io.to(matchId).emit(ServerEvent.PlayerLeft, { id: socketId });
        }
      }
    }
  }

  handleInput(socketId: string, input: PlayerInput) {
    const matchId = this.playerMatchMap.get(socketId);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    if (!match) return;
    match.lastInputs.set(socketId, input);
  }

  handleReady(socketId: string) {
    const matchId = this.playerMatchMap.get(socketId);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    if (!match) return;
    const player = match.players.get(socketId);
    if (player) {
      // Mark ready
    }
  }

  handleChat(socketId: string, msg: string) {
    const matchId = this.playerMatchMap.get(socketId);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    if (!match) return;
    const player = match.players.get(socketId);
    if (player) {
      this.io.to(matchId).emit(ServerEvent.ChatMessage, {
        playerId: socketId,
        playerName: player.name,
        message: msg,
        team: player.team,
      });
    }
  }

  sendMatchInfo(socket: Socket) {
    const matchId = this.playerMatchMap.get(socket.id);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    if (!match) return;

    const info: MatchInfo = {
      id: match.id,
      state: match.state,
      config: match.config,
      blueScore: match.blueScore,
      orangeScore: match.orangeScore,
      elapsedSeconds: match.elapsedSeconds,
      players: match.players,
      ball: match.ball,
      kickoffTimer: match.kickoffTimer,
    };
    socket.emit(ServerEvent.MatchStateUpdate, info);
  }

  private createMatch() {
    matchCounter++;
    const matchId = `match_${matchCounter}_${Date.now()}`;
    const match: Match = {
      id: matchId,
      state: MatchState.Kickoff,
      config: {
        maxGoals: 5,
        timeLimitSeconds: 300,
        teams: 2,
        playersPerTeam: 6,
      },
      players: new Map(),
      ball: {
        position: { x: 0, y: BALL.RADIUS, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        lastTouchBy: null,
      },
      blueScore: 0,
      orangeScore: 0,
      elapsedSeconds: 0,
      kickoffTimer: 3,
      lastInputs: new Map(),
      lastUpdateTime: Date.now(),
      tickRate: 30,
      tickAccumulator: 0,
      goalScoredTimer: 0,
      ended: false,
      passCooldowns: new Map(),
    };

    // Assign 12 players (up to 12 queue, rest AI)
    const queuePlayers = this.queue.splice(0, 12);
    const playerIds: string[] = [];
    const teamCounts = new Map<Team, number>();

    for (let i = 0; i < 12; i++) {
      let playerState: PlayerState;
      const isBlue = i < 6;

      if (i < queuePlayers.length) {
        const qp = queuePlayers[i];
        playerState = this.createPlayerState(qp.socket.id, qp.name, isBlue ? Team.Blue : Team.Orange, false, teamCounts);

        // Join socket room
        qp.socket.join(matchId);
        this.playerMatchMap.set(qp.socket.id, matchId);
        playerIds.push(qp.socket.id);
      } else {
        // AI player
        const aiId = `ai_${matchId}_${i}`;
        const aiName = `AI_${i + 1}`;
        playerState = this.createPlayerState(aiId, aiName, isBlue ? Team.Blue : Team.Orange, true, teamCounts);
        playerIds.push(aiId);
      }

      match.players.set(playerState.id, playerState);
    }

    // Set initial positions
    this.resetPositions(match);

    this.matches.set(matchId, match);

    console.log(`[Match] Created ${matchId} with ${queuePlayers.length} human + ${12 - queuePlayers.length} AI players`);

    // Notify all players
    this.io.to(matchId).emit(ServerEvent.MatchFound, {
      matchId,
      config: match.config,
    });

    // Send initial state
    this.broadcastState(match);

    // Start countdown
    this.startKickoffCountdown(match);
  }

  private createPlayerState(id: string, name: string, team: Team, isAI: boolean, teamCounts: Map<Team, number>): PlayerState {
    const count = teamCounts.get(team) || 0;
    teamCounts.set(team, count + 1);
    const position = this.getFormationPosition(team, count);
    return {
      id,
      name,
      team,
      isAI,
      bike: {
        position,
        rotation: { x: 0, y: team === Team.Blue ? 0 : Math.PI, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        boost: BIKE.BOOST_MAX,
        isGrounded: true,
        isBoosting: false,
      },
      connected: !isAI,
    };
  }

  private getFormationPosition(team: Team, index: number): { x: number; y: number; z: number } {
    // 2-2-1 formation (GK + 2 Def + 2 Mid + 1 Fwd)
    const isBlue = team === Team.Blue;
    const direction = isBlue ? 1 : -1;
    const fieldLengthHalf = FIELD.LENGTH / 2 - 5;

    const positions: [number, number][] = [
      // Goalkeeper
      [fieldLengthHalf * direction * -0.95, 0],
      // Defenders
      [fieldLengthHalf * direction * -0.6, -12],
      [fieldLengthHalf * direction * -0.6, 12],
      // Midfielders
      [fieldLengthHalf * direction * -0.2, -8],
      [fieldLengthHalf * direction * -0.2, 8],
      // Forward
      [fieldLengthHalf * direction * 0.3, 0],
    ];

    const pos = positions[index] || positions[5];
    return { x: pos[0], y: 0.5, z: pos[1] };
  }

  private resetPositions(match: Match) {
    let blueIdx = 0;
    let orangeIdx = 0;

    match.players.forEach((player) => {
      if (player.team === Team.Blue) {
        const pos = this.getFormationPosition(Team.Blue, blueIdx);
        player.bike.position = { ...pos };
        player.bike.rotation = { x: 0, y: 0, z: 0 };
        player.bike.velocity = { x: 0, y: 0, z: 0 };
        player.bike.angularVelocity = { x: 0, y: 0, z: 0 };
        player.bike.boost = BIKE.BOOST_MAX;
        blueIdx++;
      } else {
        const pos = this.getFormationPosition(Team.Orange, orangeIdx);
        player.bike.position = { ...pos };
        player.bike.rotation = { x: 0, y: Math.PI, z: 0 };
        player.bike.velocity = { x: 0, y: 0, z: 0 };
        player.bike.angularVelocity = { x: 0, y: 0, z: 0 };
        player.bike.boost = BIKE.BOOST_MAX;
        orangeIdx++;
      }
    });

    match.ball = {
      position: { x: 0, y: BALL.RADIUS, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      lastTouchBy: null,
    };
  }

  private startKickoffCountdown(match: Match) {
    match.state = MatchState.Kickoff;
    match.kickoffTimer = 3;
    this.broadcastState(match);

    const interval = setInterval(() => {
      if (!this.matches.has(match.id)) {
        clearInterval(interval);
        return;
      }
      match.kickoffTimer--;
      this.io.to(match.id).emit(ServerEvent.MatchCountdown, { time: match.kickoffTimer });

      if (match.kickoffTimer <= 0) {
        clearInterval(interval);
        match.state = MatchState.Playing;
        this.broadcastState(match);
      }
    }, 1000);
  }

  private tick() {
    this.matches.forEach((match) => {
      if (match.state !== MatchState.Playing && match.state !== MatchState.Kickoff) return;

      const now = Date.now();
      const dt = Math.min((now - match.lastUpdateTime) / 1000, 0.05);
      match.lastUpdateTime = now;

      if (match.state === MatchState.Playing) {
        match.elapsedSeconds += dt;

        // Check time limit
        if (match.config.timeLimitSeconds && match.elapsedSeconds >= match.config.timeLimitSeconds) {
          this.endMatch(match);
          return;
        }

        // Simulate AI
        this.simulateAI(match, dt);
        // Simulate all players from inputs
        this.simulatePlayers(match, dt);
      }

      // Simulate ball (simplified physics)
      this.simulateBall(match, dt);

      // Broadcast state at 30Hz
      this.broadcastState(match);
    });
  }

  private simulateBall(match: Match, dt: number) {
    const ball = match.ball;
    // Apply gravity
    ball.velocity.y -= 9.81 * dt;

    // Update position
    ball.position.x += ball.velocity.x * dt;
    ball.position.y += ball.velocity.y * dt;
    ball.position.z += ball.velocity.z * dt;

    // Ground collision
    if (ball.position.y < BALL.RADIUS) {
      ball.position.y = BALL.RADIUS;
      ball.velocity.y *= -BALL.BOUNCE;
      // Dampen horizontal velocity
      ball.velocity.x *= (1 - BALL.FRICTION * dt);
      ball.velocity.z *= (1 - BALL.FRICTION * dt);
    }

    // Field bounds
    const halfLength = FIELD.LENGTH / 2;
    const halfWidth = FIELD.WIDTH / 2;

    // Goal detection (inside goal area)
    const inGoalX = Math.abs(ball.position.x) > halfLength - FIELD.GOAL_DEPTH;
    const inGoalZ = Math.abs(ball.position.z) < FIELD.GOAL_WIDTH / 2;
    const inGoalY = ball.position.y < FIELD.GOAL_HEIGHT;

    if (inGoalX && inGoalZ && inGoalY) {
      // GOAL!
      const scoringTeam = ball.position.x > 0 ? Team.Orange : Team.Blue;
      this.handleGoal(match, scoringTeam);
      return;
    }

    // Wall collisions
    if (Math.abs(ball.position.x) > halfLength) {
      ball.position.x = Math.sign(ball.position.x) * halfLength;
      ball.velocity.x *= -BALL.BOUNCE;
    }
    if (Math.abs(ball.position.z) > halfWidth) {
      ball.position.z = Math.sign(ball.position.z) * halfWidth;
      ball.velocity.z *= -BALL.BOUNCE;
    }

    // Speed limit
    const speed = Math.sqrt(
      ball.velocity.x ** 2 + ball.velocity.y ** 2 + ball.velocity.z ** 2
    );
    if (speed > BALL.MAX_SPEED) {
      const scale = BALL.MAX_SPEED / speed;
      ball.velocity.x *= scale;
      ball.velocity.y *= scale;
      ball.velocity.z *= scale;
    }
  }

  private handleGoal(match: Match, scoringTeam: Team) {
    if (scoringTeam === Team.Blue) {
      match.blueScore++;
    } else {
      match.orangeScore++;
    }

    match.state = MatchState.GoalScored;
    match.goalScoredTimer = 3;

    this.io.to(match.id).emit(ServerEvent.GoalScored, {
      team: scoringTeam,
      blueScore: match.blueScore,
      orangeScore: match.orangeScore,
      scorer: match.ball.lastTouchBy,
    });

    // Check match end
    if (match.config.maxGoals && (match.blueScore >= match.config.maxGoals || match.orangeScore >= match.config.maxGoals)) {
      setTimeout(() => this.endMatch(match), 3000);
    } else {
      setTimeout(() => {
        if (!this.matches.has(match.id)) return;
        this.resetPositions(match);
        this.startKickoffCountdown(match);
      }, 3000);
    }

    this.broadcastState(match);
  }

  private endMatch(match: Match) {
    match.state = MatchState.Ended;
    match.ended = true;
    this.broadcastState(match);

    this.io.to(match.id).emit(ServerEvent.MatchEnd, {
      blueScore: match.blueScore,
      orangeScore: match.orangeScore,
      winner: match.blueScore > match.orangeScore ? Team.Blue :
              match.orangeScore > match.blueScore ? Team.Orange : null,
    });

    // Cleanup after 10 seconds
    setTimeout(() => {
      this.matches.delete(match.id);
      match.players.forEach((_, id) => {
        this.playerMatchMap.delete(id);
      });
    }, 10000);
  }

  private simulatePlayers(match: Match, dt: number) {
    match.players.forEach((player) => {
      const input = match.lastInputs.get(player.id);
      if (!input) return;

      const bike = player.bike;
      const isBlue = player.team === Team.Blue;
      const dir = isBlue ? 1 : -1;

      // Throttle/brake
      const maxSpeed = bike.isBoosting ? BIKE.BOOST_SPEED : BIKE.MAX_SPEED;
      const accel = bike.isBoosting ? BIKE.BOOST_ACCELERATION : BIKE.ACCELERATION;

      if (input.throttle !== 0) {
        // Forward direction based on bike rotation
        const forwardX = Math.sin(bike.rotation.y) * dir;
        const forwardZ = Math.cos(bike.rotation.y) * dir;

        bike.velocity.x += forwardX * accel * input.throttle * dt;
        bike.velocity.z += forwardZ * accel * input.throttle * dt;
      }

      // Braking
      if (input.throttle < 0) {
        bike.velocity.x *= (1 - BIKE.BRAKE_FORCE * dt);
        bike.velocity.z *= (1 - BIKE.BRAKE_FORCE * dt);
      }

      // Steering
      const speed = Math.sqrt(bike.velocity.x ** 2 + bike.velocity.z ** 2);
      if (Math.abs(input.steer) > 0.1 && speed > 0.5) {
        const turnRate = BIKE.STEER_SPEED * input.steer * (1 + speed / BIKE.MAX_SPEED * 0.5) * dt;
        bike.rotation.y += turnRate * dir;
        bike.angularVelocity.y = turnRate / dt;
      }

      // Boost
      bike.isBoosting = input.boost && bike.boost > 0;
      if (bike.isBoosting) {
        bike.boost = Math.max(0, bike.boost - BIKE.BOOST_DRAIN_RATE * dt);
      } else {
        bike.boost = Math.min(BIKE.BOOST_MAX, bike.boost + BIKE.BOOST_REGEN_RATE * dt);
      }

      // Ground friction
      const friction = 2.0;
      bike.velocity.x *= (1 - friction * dt);
      bike.velocity.z *= (1 - friction * dt);

      // Speed cap
      const currentSpeed = Math.sqrt(bike.velocity.x ** 2 + bike.velocity.z ** 2);
      if (currentSpeed > maxSpeed) {
        const scale = maxSpeed / currentSpeed;
        bike.velocity.x *= scale;
        bike.velocity.z *= scale;
      }

      // Jump
      if (input.jump && bike.isGrounded) {
        bike.velocity.y = 8;
        bike.isGrounded = false;
      }

      // Gravity
      if (!bike.isGrounded) {
        bike.velocity.y -= 15 * dt;
      }

      // Update position
      bike.position.x += bike.velocity.x * dt;
      bike.position.y += bike.velocity.y * dt;
      bike.position.z += bike.velocity.z * dt;

      // Ground collision
      if (bike.position.y <= 0.5) {
        bike.position.y = 0.5;
        bike.velocity.y = 0;
        bike.isGrounded = true;
        bike.angularVelocity.y *= 0.9;
      }

      // Field boundary collision
      const halfLength = FIELD.LENGTH / 2 - 0.5;
      const halfWidth = FIELD.WIDTH / 2 - 0.5;

      if (Math.abs(bike.position.x) > halfLength) {
        bike.position.x = Math.sign(bike.position.x) * halfLength;
        bike.velocity.x *= -0.3;
      }
      if (Math.abs(bike.position.z) > halfWidth) {
        bike.position.z = Math.sign(bike.position.z) * halfWidth;
        bike.velocity.z *= -0.3;
      }

      // Goal area collision (don't let bikes go through goal)
      if (Math.abs(bike.position.x) > FIELD.LENGTH / 2 - FIELD.GOAL_DEPTH - 0.5) {
        if (Math.abs(bike.position.z) < FIELD.GOAL_WIDTH / 2 + 0.5 && bike.position.y < FIELD.GOAL_HEIGHT) {
          // Push bike back if inside goal
          bike.position.x = Math.sign(bike.position.x) * (FIELD.LENGTH / 2 - FIELD.GOAL_DEPTH - 0.5);
          bike.velocity.x *= -0.3;
        }
      }

      // Pass
      const passCooldown = match.passCooldowns.get(player.id) || 0;
      match.passCooldowns.set(player.id, Math.max(0, passCooldown - dt));

      if (input.pass && passCooldown <= 0) {
        // Kick ball if close enough
        const dx = bike.position.x - match.ball.position.x;
        const dz = bike.position.z - match.ball.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 2.5 && dist > 0) {
          const passForce = 28;
          const passHeight = 1.5;

          // Direction: forward from player facing
          const isBlue = player.team === Team.Blue;
          const dir = isBlue ? 1 : -1;
          const forwardX = Math.sin(bike.rotation.y) * dir;
          const forwardZ = Math.cos(bike.rotation.y) * dir;

          match.ball.velocity.x = forwardX * passForce;
          match.ball.velocity.z = forwardZ * passForce;
          match.ball.velocity.y = passHeight;

          match.ball.lastTouchBy = player.id;
          match.passCooldowns.set(player.id, 0.4);

          // Push ball out of feet
          const pushOut = 1.0;
          match.ball.position.x += forwardX * pushOut;
          match.ball.position.z += forwardZ * pushOut;
        }
      }

      // Ball collision (from running into ball, not pass)
      const ball = match.ball;
      const bdx = bike.position.x - ball.position.x;
      const bdz = bike.position.z - ball.position.z;
      const bdist = Math.sqrt(bdx * bdx + bdz * bdz);
      const minDist = 1.2;

      if (bdist < minDist && bdist > 0) {
        const overlap = minDist - bdist;
        const pushX = bdx / bdist * overlap * 0.5;
        const pushZ = bdz / bdist * overlap * 0.5;

        // Push ball away
        ball.position.x -= pushX;
        ball.position.z -= pushZ;

        const hitForce = Math.min(40, currentSpeed * 0.8 + 5);
        ball.velocity.x -= bdx / bdist * hitForce;
        ball.velocity.z -= bdz / bdist * hitForce;
        ball.velocity.y = Math.abs(bike.velocity.y) * 0.5 + 2;

        // Push bike back slightly
        bike.position.x += pushX * 0.3;
        bike.position.z += pushZ * 0.3;

        ball.lastTouchBy = player.id;
      }
    });
  }

  private simulateAI(match: Match, dt: number) {
    match.players.forEach((player) => {
      if (!player.isAI) return;
      const inputs = AIController.getAIInput(player, match);
      match.lastInputs.set(player.id, inputs);
    });
  }

  private broadcastState(match: Match) {
    const playersObj: Record<string, PlayerState> = {};
    match.players.forEach((p, id) => {
      playersObj[id] = p;
    });

    this.io.to(match.id).emit(ServerEvent.MatchStateUpdate, {
      id: match.id,
      state: match.state,
      players: playersObj,
      ball: match.ball,
      blueScore: match.blueScore,
      orangeScore: match.orangeScore,
      elapsedSeconds: match.elapsedSeconds,
      kickoffTimer: match.kickoffTimer,
    });
  }
}
