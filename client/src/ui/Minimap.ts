import { PlayerState, BallState, Team } from '../../../shared/index.js';

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size = 160;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.cssText = `
      position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
      z-index: 101; border-radius: 50%;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
      border: 2px solid rgba(255,255,255,0.1);
    `;
    this.ctx = this.canvas.getContext('2d')!;
    document.body.appendChild(this.canvas);
  }

  update(players: Map<string, PlayerState>, ball: BallState | null) {
    const ctx = this.ctx;
    const s = this.size;
    const cx = s / 2;
    const cy = s / 2;
    const scale = 1.2;

    ctx.clearRect(0, 0, s, s);

    // Field outline
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cx - 4, cy - 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Center line
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx, s - 4);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.stroke();

    // Draw ball
    if (ball) {
      const bx = cx + ball.position.x * scale;
      const by = cy + ball.position.z * scale;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw players
    players.forEach((player) => {
      const px = cx + player.bike.position.x * scale;
      const py = cy + player.bike.position.z * scale;
      const color = player.team === Team.Blue ? '#00f0ff' : '#8b5cf6';
      const alpha = player.isAI ? '66' : 'ff';

      ctx.fillStyle = color + alpha;
      ctx.beginPath();
      ctx.arc(px, py, player.isAI ? 2 : 3, 0, Math.PI * 2);
      ctx.fill();

      // Direction indicator
      const dirX = Math.sin(player.bike.rotation.y) * 4;
      const dirZ = Math.cos(player.bike.rotation.y) * 4;
      ctx.strokeStyle = color + alpha;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + dirX, py + dirZ);
      ctx.stroke();
    });
  }
}
