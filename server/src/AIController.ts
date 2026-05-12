import { PlayerState, PlayerInput, MatchState, Team, FIELD } from '../../shared/index.js';

interface MatchLike {
  state: MatchState;
  ball: { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } };
  players: Map<string, PlayerState>;
}

export class AIController {
  static getAIInput(player: PlayerState, match: MatchLike): PlayerInput {
    const ball = match.ball;
    const myPos = player.bike.position;
    const isBlue = player.team === Team.Blue;

    const target = AIController.getAITarget(player, match);
    const distToTarget = AIController.distance(myPos, target);

    const playerIndex = AIController.getPlayerIndex(player, match);
    const isGoalkeeper = playerIndex === 0;

    let steer = 0;
    let throttle = 0;
    let sprint = false;
    let jump = false;
    let kick = false;

    if (isGoalkeeper) {
      const goalX = isBlue ? -FIELD.LENGTH / 2 + 3 : FIELD.LENGTH / 2 - 3;
      const targetZ = Math.max(-FIELD.GOAL_WIDTH / 2 + 1, Math.min(FIELD.GOAL_WIDTH / 2 - 1, ball.position.z));

      const diffZ = targetZ - myPos.z;
      steer = Math.max(-1, Math.min(1, diffZ * 0.1));
      throttle = Math.abs(myPos.x - goalX) > 1 ? Math.sign(goalX - myPos.x) * 0.5 : 0;

      const distToBall = AIController.distance(myPos, ball.position);
      if (distToBall < 5 && Math.abs(ball.position.x - goalX) < 15) {
        throttle = Math.sign(ball.position.x - myPos.x) * 0.8;
        sprint = distToBall > 3;
      }
    } else {
      const angleToTarget = Math.atan2(target.z - myPos.z, target.x - myPos.x);
      let facingAngle = player.bike.rotation.y;
      if (isBlue) facingAngle = -facingAngle;

      let angleDiff = angleToTarget - facingAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      steer = Math.max(-1, Math.min(1, angleDiff * 2));
      throttle = 0.8;
      sprint = distToTarget > 8 && Math.abs(angleDiff) < 0.5;

      if (distToTarget < 2.5) {
        const goalPos = { x: isBlue ? FIELD.LENGTH / 2 - 2 : -FIELD.LENGTH / 2 + 2, y: 0, z: 0 };
        const angleToGoal = Math.atan2(goalPos.z - myPos.z, goalPos.x - myPos.x);
        const facingGoal = Math.abs(angleToGoal - facingAngle) < 0.5;

        if (facingGoal) {
          throttle = 1;
          sprint = true;
          kick = true;
        } else if (Math.random() < 0.3) {
          kick = true;
        }
      }

      const ownGoalX = isBlue ? -FIELD.LENGTH / 2 : FIELD.LENGTH / 2;
      const distToOwnGoal = AIController.distance(myPos, { x: ownGoalX, y: 0, z: 0 });

      if (distToOwnGoal < 20 && distToTarget > 10) {
        throttle = 0.9;
        sprint = true;
      }
    }

    if (Math.random() < 0.005) {
      jump = true;
    }

    return {
      steer,
      throttle,
      jump,
      sprint,
      kick,
      camera: { yaw: 0, pitch: 0 },
      sequence: Date.now(),
    };
  }

  private static getAITarget(player: PlayerState, match: MatchLike): { x: number; y: number; z: number } {
    const ball = match.ball;
    const myPos = player.bike.position;
    const isBlue = player.team === Team.Blue;
    const playerIndex = AIController.getPlayerIndex(player, match);

    if (playerIndex <= 1) {
      const goalX = isBlue ? -FIELD.LENGTH / 2 + 5 : FIELD.LENGTH / 2 - 5;
      const targetX = (ball.position.x + goalX) / 2;
      const targetZ = ball.position.z * 0.5;
      return {
        x: Math.max(-FIELD.LENGTH / 2 + 5, Math.min(FIELD.LENGTH / 2 - 5, targetX)),
        y: 0,
        z: Math.max(-FIELD.WIDTH / 2 + 3, Math.min(FIELD.WIDTH / 2 - 3, targetZ)),
      };
    } else if (playerIndex <= 3) {
      const offset = isBlue ? -3 : 3;
      return {
        x: Math.max(-FIELD.LENGTH / 2 + 2, Math.min(FIELD.LENGTH / 2 - 2, ball.position.x + offset)),
        y: 0,
        z: ball.position.z,
      };
    } else {
      const goalX = isBlue ? FIELD.LENGTH / 2 - 5 : -FIELD.LENGTH / 2 + 5;
      return {
        x: Math.max(-FIELD.LENGTH / 2 + 2, Math.min(FIELD.LENGTH / 2 - 2, ball.position.x * 0.7 + goalX * 0.3)),
        y: 0,
        z: ball.position.z,
      };
    }
  }

  private static getPlayerIndex(player: PlayerState, match: MatchLike): number {
    let idx = 0;
    for (const [, p] of match.players) {
      if (p.team === player.team) {
        if (p.id === player.id) return idx;
        idx++;
      }
    }
    return 0;
  }

  private static distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }
}
