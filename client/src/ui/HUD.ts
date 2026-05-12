export class HUD {
  private container: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private timerEl: HTMLDivElement;
  private countdownEl: HTMLDivElement;
  private goalNotificationEl: HTMLDivElement;
  private matchEndEl: HTMLDivElement;
  private notificationEl: HTMLDivElement;
  private notificationTimeout: number | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    this.container.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 100;
      font-family: 'Segoe UI', system-ui, sans-serif;
    `;

    // Scoreboard
    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText = `
      position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
      display: flex; align-items: center; gap: 20px;
      background: rgba(0,0,0,0.6); padding: 8px 28px; border-radius: 10px;
      backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.08);
    `;
    this.scoreEl.innerHTML = `
      <div style="color:#00f0ff;font-size:1.8rem;font-weight:800;">0</div>
      <div style="color:rgba(255,255,255,0.25);font-size:0.75rem;letter-spacing:1px;">VS</div>
      <div style="color:#8b5cf6;font-size:1.8rem;font-weight:800;">0</div>
    `;

    // Timer
    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText = `
      position: absolute; top: 75px; left: 50%; transform: translateX(-50%);
      color: rgba(255,255,255,0.7); font-size: 1rem; font-weight: 600;
      background: rgba(0,0,0,0.4); padding: 2px 14px; border-radius: 6px;
      font-variant-numeric: tabular-nums;
    `;
    this.timerEl.textContent = '5:00';

    // Countdown overlay
    this.countdownEl = document.createElement('div');
    this.countdownEl.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 6rem; font-weight: 900; color: #fff;
      text-shadow: 0 0 40px rgba(255,255,255,0.3);
      opacity: 0; transition: opacity 0.3s;
    `;

    // Goal notification
    this.goalNotificationEl = document.createElement('div');
    this.goalNotificationEl.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 3rem; font-weight: 900;
      text-shadow: 0 0 60px rgba(255,255,255,0.5);
      opacity: 0; transition: all 0.5s;
      text-align: center;
    `;

    // Match end
    this.matchEndEl = document.createElement('div');
    this.matchEndEl.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 3rem; font-weight: 900; color: #fff;
      text-shadow: 0 0 40px rgba(255,255,255,0.3);
      opacity: 0; transition: opacity 0.5s;
      text-align: center;
    `;

    // Notification overlay
    this.notificationEl = document.createElement('div');
    this.notificationEl.style.cssText = `
      position: absolute; top: 130px; left: 50%; transform: translateX(-50%);
      color: #fff; font-size: 0.85rem; font-weight: 600;
      background: rgba(0,0,0,0.5); padding: 4px 16px; border-radius: 6px;
      opacity: 0; transition: opacity 0.3s;
      pointer-events: none;
    `;

    this.container.appendChild(this.scoreEl);
    this.container.appendChild(this.timerEl);
    this.container.appendChild(this.countdownEl);
    this.container.appendChild(this.goalNotificationEl);
    this.container.appendChild(this.matchEndEl);
    this.container.appendChild(this.notificationEl);

    document.body.appendChild(this.container);
  }

  updateScore(blue: number, orange: number) {
    this.scoreEl.innerHTML = `
      <div style="color:#00f0ff;font-size:1.8rem;font-weight:800;">${blue}</div>
      <div style="color:rgba(255,255,255,0.25);font-size:0.75rem;letter-spacing:1px;">VS</div>
      <div style="color:#8b5cf6;font-size:1.8rem;font-weight:800;">${orange}</div>
    `;
  }

  updateTimer(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this.timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  showCountdown(time: number) {
    if (time > 0) {
      this.countdownEl.textContent = time.toString();
      this.countdownEl.style.opacity = '1';
      this.countdownEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
      setTimeout(() => {
        this.countdownEl.style.opacity = '0';
        this.countdownEl.style.transform = 'translate(-50%, -50%) scale(1)';
      }, 800);
    } else {
      this.countdownEl.textContent = 'GO!';
      this.countdownEl.style.color = '#00f0ff';
      this.countdownEl.style.opacity = '1';
      this.countdownEl.style.transform = 'translate(-50%, -50%) scale(1.5)';
      setTimeout(() => {
        this.countdownEl.style.opacity = '0';
        this.countdownEl.style.transform = 'translate(-50%, -50%) scale(1)';
        this.countdownEl.style.color = '#fff';
      }, 1000);
    }
  }

  showGoalNotification(team: string, scorer: string | null) {
    const color = team === 'blue' ? '#00f0ff' : '#8b5cf6';
    const teamName = team === 'blue' ? 'CYAN' : 'PURPLE';
    this.goalNotificationEl.innerHTML = `
      <div style="color:${color}">GOAL!</div>
      <div style="font-size:1rem;color:#aaa;margin-top:10px">${teamName} TEAM</div>
    `;
    this.goalNotificationEl.style.opacity = '1';
    this.goalNotificationEl.style.transform = 'translate(-50%, -50%) scale(1.2)';

    setTimeout(() => {
      this.goalNotificationEl.style.opacity = '0';
      this.goalNotificationEl.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 2500);
  }

  showMatchEnd(data: { blueScore: number; orangeScore: number; winner: string | null }) {
    let msg = "MATCH OVER";
    if (data.winner) {
      const winnerName = data.winner === 'blue' ? 'CYAN' : 'PURPLE';
      msg = `${winnerName} TEAM WINS!`;
    } else {
      msg = "DRAW!";
    }

    this.matchEndEl.innerHTML = `
      <div style="font-size:3rem">${msg}</div>
      <div style="font-size:1.5rem;color:#aaa;margin-top:10px">
        ${data.blueScore} - ${data.orangeScore}
      </div>
    `;
    this.matchEndEl.style.opacity = '1';
  }

  showNotification(msg: string) {
    this.notificationEl.textContent = msg;
    this.notificationEl.style.opacity = '1';
    if (this.notificationTimeout !== null) clearTimeout(this.notificationTimeout);
    this.notificationTimeout = window.setTimeout(() => {
      this.notificationEl.style.opacity = '0';
    }, 1500);
  }

  hide() {
    this.container.style.display = 'none';
  }

  show() {
    this.container.style.display = '';
  }
}
