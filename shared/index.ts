// ─── Team & Player ───
export enum Team {
  Blue = 'blue',
  Orange = 'orange',
}

export interface PlayerState {
  id: string;
  name: string;
  team: Team;
  isAI: boolean;
  bike: BikeState;
  connected: boolean;
}

export interface BikeState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
  boost: number;
  isGrounded: boolean;
  isBoosting: boolean;
}

// ─── Ball ───
export interface BallState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  lastTouchBy: string | null;
}

// ─── Input ───
export interface PlayerInput {
  steer: number;
  throttle: number;
  jump: boolean;
  sprint: boolean;
  kick: boolean;
  camera: { yaw: number; pitch: number };
  sequence: number;
}

// ─── Match ───
export enum MatchState {
  Lobby = 'lobby',
  Kickoff = 'kickoff',
  Playing = 'playing',
  GoalScored = 'goal_scored',
  Halftime = 'halftime',
  Ended = 'ended',
}

export interface MatchConfig {
  maxGoals: number | null;
  timeLimitSeconds: number | null;
  teams: number; // 2
  playersPerTeam: number; // 6
}

export interface MatchInfo {
  id: string;
  state: MatchState;
  config: MatchConfig;
  blueScore: number;
  orangeScore: number;
  elapsedSeconds: number;
  players: Map<string, PlayerState>;
  ball: BallState;
  kickoffTimer: number;
}

// ─── Network Events ───
export enum ClientEvent {
  JoinQueue = 'join_queue',
  LeaveQueue = 'leave_queue',
  PlayerInput = 'player_input',
  Ready = 'ready',
  RequestMatchInfo = 'request_match_info',
  ChatMessage = 'chat_message',
}

export enum ServerEvent {
  MatchFound = 'match_found',
  MatchStateUpdate = 'match_state_update',
  PlayerJoined = 'player_joined',
  PlayerLeft = 'player_left',
  GoalScored = 'goal_scored',
  MatchEnd = 'match_end',
  MatchCountdown = 'match_countdown',
  ChatMessage = 'chat_message',
  Error = 'error',
}

// ─── Physics Constants ───
export const BOOST_PADS = [
  // Center
  { x: 0, z: 0 },
  // Center line sides
  { x: 0, z: -20 }, { x: 0, z: 20 },
  // Midfield diagonals
  { x: -15, z: -25 }, { x: -15, z: 25 },
  { x: 15, z: -25 }, { x: 15, z: 25 },
  // Defensive areas
  { x: -30, z: -15 }, { x: -30, z: 15 },
  { x: 30, z: -15 }, { x: 30, z: 15 },
  // Near goals
  { x: -42, z: -10 }, { x: -42, z: 10 },
  { x: 42, z: -10 }, { x: 42, z: 10 },
  // Corners of center
  { x: -25, z: -30 }, { x: -25, z: 30 },
  { x: 25, z: -30 }, { x: 25, z: 30 },
] as const;

export const FIELD = {
  LENGTH: 100,
  WIDTH: 68,
  GOAL_WIDTH: 7.32,
  GOAL_HEIGHT: 2.44,
  GOAL_DEPTH: 2.5,
  CENTER_CIRCLE_RADIUS: 9.15,
  PENALTY_AREA_WIDTH: 40.3,
  PENALTY_AREA_LENGTH: 16.5,
  WALL_HEIGHT: 5,
  WALL_THICKNESS: 0.5,
} as const;

export const BIKE = {
  WIDTH: 0.7,
  HEIGHT: 1.6,
  LENGTH: 1.0,
  MASS: 75,
  MAX_SPEED: 30,
  BOOST_SPEED: 45,
  ACCELERATION: 30,
  BOOST_ACCELERATION: 45,
  BRAKE_FORCE: 30,
  STEER_SPEED: 4.0,
  JUMP_FORCE: 500,
  DODGE_FORCE: 600,
  BOOST_MAX: 100,
  BOOST_DRAIN_RATE: 15,
  BOOST_REGEN_RATE: 5,
  STEER_RETURN_SPEED: 2.5,
} as const;

export const BALL = {
  RADIUS: 0.5,
  MASS: 2.5,
  MAX_SPEED: 80,
  BOUNCE: 0.65,
  FRICTION: 0.4,
} as const;
