import { PlayerState, BallState, MatchState } from '../../../shared/index.js';

export class GameState {
  public matchId: string = '';
  public state: MatchState = MatchState.Lobby;
  public players: Map<string, PlayerState> = new Map();
  public ball: BallState = { position: { x: 0, y: 0.22, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lastTouchBy: null };
  public blueScore = 0;
  public orangeScore = 0;
  public elapsedSeconds = 0;
  public kickoffTimer = 0;

  update(data: any) {
    this.matchId = data.id || this.matchId;
    this.state = data.state ?? this.state;
    this.blueScore = data.blueScore ?? this.blueScore;
    this.orangeScore = data.orangeScore ?? this.orangeScore;
    this.elapsedSeconds = data.elapsedSeconds ?? this.elapsedSeconds;
    this.kickoffTimer = data.kickoffTimer ?? this.kickoffTimer;

    if (data.players) {
      this.players.clear();
      Object.entries(data.players).forEach(([id, player]) => {
        this.players.set(id, player as PlayerState);
      });
    }

    if (data.ball) {
      this.ball = data.ball as BallState;
    }
  }

  getPlayers(): Map<string, PlayerState> {
    return this.players;
  }

  getBall(): BallState {
    return this.ball;
  }

  getLocalPlayer(localId: string): PlayerState | undefined {
    return this.players.get(localId);
  }

  getTeamPlayers(team: string): PlayerState[] {
    const result: PlayerState[] = [];
    this.players.forEach((p) => {
      if (p.team === team) result.push(p);
    });
    return result;
  }
}
