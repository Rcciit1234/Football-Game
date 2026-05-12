export class MainMenu {
  private container: HTMLDivElement;
  private nameInput: HTMLInputElement;
  private playBtn: HTMLButtonElement;
  private statusEl: HTMLDivElement;

  public onPlay: ((name: string) => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'main-menu';
    this.container.style.cssText = `
      position: fixed; inset: 0; z-index: 500;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #05050a 0%, #0d0d2b 100%);
      transition: opacity 0.5s;
    `;

    // Animated background grid
    const bgDecor = document.createElement('div');
    bgDecor.style.cssText = `
      position: absolute; inset: 0; overflow: hidden; pointer-events: none;
    `;
    bgDecor.innerHTML = `
      <div style="position:absolute;top:-200px;left:-200px;width:600px;height:600px;
        background:radial-gradient(circle,rgba(0,240,255,0.08),transparent 70%);border-radius:50%;"></div>
      <div style="position:absolute;bottom:-200px;right:-200px;width:600px;height:600px;
        background:radial-gradient(circle,rgba(139,92,246,0.08),transparent 70%);border-radius:50%;"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:800px;height:800px;
        background:radial-gradient(circle,rgba(0,240,255,0.03),transparent 60%);border-radius:50%;"></div>
      <div style="position:absolute;top:0;left:0;right:0;bottom:0;
        background-image:
          linear-gradient(rgba(0,240,255,0.03) 1px,transparent 1px),
          linear-gradient(90deg,rgba(0,240,255,0.03) 1px,transparent 1px);
        background-size: 60px 60px;"></div>
    `;
    this.container.appendChild(bgDecor);

    // Title with glow
    const title = document.createElement('h1');
    title.style.cssText = `
      font-size: 5.5rem; font-weight: 900; letter-spacing: -3px;
      background: linear-gradient(135deg, #00f0ff, #8b5cf6, #00f0ff);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      margin-bottom: 0.25rem; position: relative;
      text-shadow: 0 0 80px rgba(0,240,255,0.3);
    `;
    title.textContent = 'VOLTGOAL';

    const subtitle = document.createElement('p');
    subtitle.style.cssText = `
      font-size: 0.85rem; color: rgba(0,240,255,0.5); margin-bottom: 2.5rem;
      letter-spacing: 6px; text-transform: uppercase;
    `;
    subtitle.textContent = '6v6 Football';

    // Name input
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
      display: flex; flex-direction: column; gap: 16px; align-items: center;
    `;

    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.placeholder = 'Enter your name';
    this.nameInput.maxLength = 16;
    this.nameInput.style.cssText = `
      background: rgba(255,255,255,0.03); border: 1px solid rgba(0,240,255,0.15);
      color: #fff; padding: 12px 24px; font-size: 1rem; border-radius: 8px;
      outline: none; width: 280px; text-align: center;
      transition: border-color 0.3s;
    `;
    this.nameInput.addEventListener('focus', () => {
      this.nameInput.style.borderColor = '#00f0ff';
    });
    this.nameInput.addEventListener('blur', () => {
      this.nameInput.style.borderColor = 'rgba(0,240,255,0.15)';
    });
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.play();
    });

    const names = ['Striker', 'Blaze', 'Phantom', 'Nitro', 'Vortex', 'Fury', 'Shadow', 'Thunder', 'Ace', 'Bolt'];
    this.nameInput.value = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);

    this.playBtn = document.createElement('button');
    this.playBtn.textContent = 'FIND MATCH';
    this.playBtn.style.cssText = `
      background: linear-gradient(135deg, #00f0ff, #8b5cf6);
      color: #fff; border: none; padding: 14px 48px; font-size: 1.1rem;
      font-weight: 700; border-radius: 8px; cursor: pointer;
      transition: all 0.3s; letter-spacing: 2px;
    `;
    this.playBtn.addEventListener('mouseenter', () => {
      this.playBtn.style.transform = 'translateY(-2px)';
      this.playBtn.style.boxShadow = '0 8px 30px rgba(0,240,255,0.3)';
    });
    this.playBtn.addEventListener('mouseleave', () => {
      this.playBtn.style.transform = '';
      this.playBtn.style.boxShadow = '';
    });
    this.playBtn.addEventListener('click', () => this.play());

    // Controls info
    const controls = document.createElement('div');
    controls.style.cssText = `
      margin-top: 3rem; color: rgba(255,255,255,0.15); font-size: 0.7rem;
      text-align: center; line-height: 2;
    `;
    controls.innerHTML = `
       W/Up - Run Forward &nbsp;|&nbsp; S/Down - Run Back<br>
       A/Left - Strafe Left &nbsp;|&nbsp; D/Right - Strafe Right<br>
       Space - Jump &nbsp;|&nbsp; Shift - Sprint &nbsp;|&nbsp; Click/E - Kick<br>
       Mouse - Look Around &nbsp;|&nbsp; M - Mute
       <br><br>
       <a href="https://github.com/Rcciit1234" target="_blank" style="color:rgba(0,240,255,0.3);text-decoration:none;transition:color 0.3s;"
          onmouseover="this.style.color='rgba(0,240,255,0.8)'" onmouseout="this.style.color='rgba(0,240,255,0.3)'">github.com/Rcciit1234</a>
    `;

    // Status
    this.statusEl = document.createElement('div');
    this.statusEl.style.cssText = `
      margin-top: 1rem; color: rgba(0,240,255,0.6); font-size: 0.85rem;
    `;

    inputContainer.appendChild(this.nameInput);
    inputContainer.appendChild(this.playBtn);
    inputContainer.appendChild(this.statusEl);

    this.container.appendChild(title);
    this.container.appendChild(subtitle);
    this.container.appendChild(inputContainer);
    this.container.appendChild(controls);

    document.body.appendChild(this.container);
  }

  private play() {
    const name = this.nameInput.value.trim() || 'Player';
    this.onPlay?.(name);
  }

  showConnecting() {
    this.playBtn.disabled = true;
    this.playBtn.textContent = 'SEARCHING...';
    this.playBtn.style.opacity = '0.6';
    this.statusEl.textContent = 'Looking for players...';

    let dots = 0;
    const interval = setInterval(() => {
      dots = (dots + 1) % 4;
      this.statusEl.textContent = 'Looking for players' + '.'.repeat(dots);
    }, 500);

    (this.container as any)._dotsInterval = interval;
  }

  show() {
    this.container.style.display = 'flex';
    this.container.style.opacity = '1';
    this.playBtn.disabled = false;
    this.playBtn.textContent = 'FIND MATCH';
    this.playBtn.style.opacity = '1';
    this.statusEl.textContent = '';

    const interval = (this.container as any)._dotsInterval;
    if (interval) clearInterval(interval);
  }

  hide() {
    this.container.style.opacity = '0';
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 500);

    const interval = (this.container as any)._dotsInterval;
    if (interval) clearInterval(interval);
  }
}
