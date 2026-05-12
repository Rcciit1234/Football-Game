export class HUD {
  private container: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private timerEl: HTMLDivElement;
  private boostContainer: HTMLDivElement;
  private boostFill: HTMLDivElement;
  private boostLabel: HTMLDivElement;
  private speedEl: HTMLDivElement;
  private countdownEl: HTMLDivElement;
  private goalNotificationEl: HTMLDivElement;
  private matchEndEl: HTMLDivElement;
  private controlsHint: HTMLDivElement;
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
      background: rgba(0,0,0,0.7); padding: 10px 30px; border-radius: 10px;
      backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);
    `;
    this.scoreEl.innerHTML = `
      <div style="color:#3366ff;font-size:2rem;font-weight:800;">0</div>
      <div style="color:#888;font-size:1rem;">VS</div>
      <div style="color:#ff6633;font-size:2rem;font-weight:800;">0</div>
    `;

    // Timer
    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText = `
      position: absolute; top: 80px; left: 50%; transform: translateX(-50%);
      color: #fff; font-size: 1.2rem; font-weight: 600;
      background: rgba(0,0,0,0.5); padding: 4px 16px; border-radius: 6px;
      font-variant-numeric: tabular-nums;
    `;
    this.timerEl.textContent = '5:00';

    // Boost meter
    this.boostContainer = document.createElement('div');
    this.boostContainer.style.cssText = `
      position: absolute; bottom: 40px; left: 40px;
      display: flex; flex-direction: column; gap: 4px;
    `;

    this.boostLabel = document.createElement('div');
    this.boostLabel.style.cssText = `color: #888; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;`;
    this.boostLabel.textContent = 'Boost';

    const boostBarOuter = document.createElement('div');
    boostBarOuter.style.cssText = `
      width: 150px; height: 8px; background: rgba(255,255,255,0.1);
      border-radius: 4px; overflow: hidden;
    `;

    this.boostFill = document.createElement('div');
    this.boostFill.style.cssText = `
      width: 100%; height: 100%;
      background: linear-gradient(90deg, #ff6b35, #ffd700);
      border-radius: 4px; transition: width 0.1s;
    `;

    boostBarOuter.appendChild(this.boostFill);
    this.boostContainer.appendChild(this.boostLabel);
    this.boostContainer.appendChild(boostBarOuter);

    // Speed display
    this.speedEl = document.createElement('div');
    this.speedEl.style.cssText = `
      position: absolute; bottom: 40px; right: 40px;
      color: #fff; font-size: 1.5rem; font-weight: 700;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    `;
    this.speedEl.textContent = '0 km/h';

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

    // Controls hint
    this.controlsHint = document.createElement('div');
    this.controlsHint.style.cssText = `
      position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
      color: rgba(255,255,255,0.3); font-size: 0.7rem;
      letter-spacing: 0.5px;
    `;
    this.controlsHint.textContent = 'W/S - Move  |  A/D - Steer  |  Space - Jump  |  Shift - Boost  |  Q/Click - Pass  |  M - Mute';

    // Notification overlay
    this.notificationEl = document.createElement('div');
    this.notificationEl.style.cssText = `
      position: absolute; top: 130px; left: 50%; transform: translateX(-50%);
      color: #fff; font-size: 0.9rem; font-weight: 600;
      background: rgba(0,0,0,0.6); padding: 6px 16px; border-radius: 6px;
      opacity: 0; transition: opacity 0.3s;
      pointer-events: none;
    `;

    this.container.appendChild(this.scoreEl);
    this.container.appendChild(this.timerEl);
    this.container.appendChild(this.boostContainer);
    this.container.appendChild(this.speedEl);
    this.container.appendChild(this.countdownEl);
    this.container.appendChild(this.goalNotificationEl);
    this.container.appendChild(this.matchEndEl);
    this.container.appendChild(this.notificationEl);
    this.container.appendChild(this.controlsHint);

    document.body.appendChild(this.container);
  }

  updateScore(blue: number, orange: number) {
    this.scoreEl.innerHTML = `
      <div style="color:#3366ff;font-size:2rem;font-weight:800;">${blue}</div>
      <div style="color:#888;font-size:1rem;">VS</div>
      <div style="color:#ff6633;font-size:2rem;font-weight:800;">${orange}</div>
    `;
  }

  updateTimer(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this.timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  updateBoost(amount: number) {
    const pct = Math.max(0, Math.min(100, amount));
    this.boostFill.style.width = `${pct}%`;

    if (pct < 20) {
      this.boostFill.style.background = 'linear-gradient(90deg, #ff4444, #ff6b35)';
    } else {
      this.boostFill.style.background = 'linear-gradient(90deg, #ff6b35, #ffd700)';
    }
  }

  updateSpeed(velocity: { x: number; y: number; z: number }) {
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    this.speedEl.textContent = `${Math.round(speed * 3.6)} km/h`;
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
      this.countdownEl.style.color = '#ffd700';
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
    const color = team === 'blue' ? '#3366ff' : '#ff6633';
    const teamName = team === 'blue' ? 'BLUE' : 'ORANGE';
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
      const winnerName = data.winner === 'blue' ? 'BLUE' : 'ORANGE';
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
