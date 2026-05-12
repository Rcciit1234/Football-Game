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
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
      transition: opacity 0.5s;
    `;

    // Background decorative elements
    const bgDecor = document.createElement('div');
    bgDecor.style.cssText = `
      position: absolute; inset: 0; overflow: hidden; pointer-events: none;
    `;
    bgDecor.innerHTML = `
      <div style="position:absolute;top:-100px;left:-100px;width:400px;height:400px;
        background:radial-gradient(circle,rgba(51,102,255,0.1),transparent);border-radius:50%;"></div>
      <div style="position:absolute;bottom:-100px;right:-100px;width:400px;height:400px;
        background:radial-gradient(circle,rgba(255,102,51,0.1),transparent);border-radius:50%;"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;
        background:radial-gradient(circle,rgba(255,215,0,0.05),transparent);border-radius:50%;"></div>
    `;
    this.container.appendChild(bgDecor);

    // Title
    const title = document.createElement('h1');
    title.style.cssText = `
      font-size: 5rem; font-weight: 900; letter-spacing: -3px;
      background: linear-gradient(135deg, #ff6b35, #f7931e, #ffd700);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem; position: relative;
    `;
    title.textContent = '3D FOOTBALL';

    const subtitle = document.createElement('p');
    subtitle.style.cssText = `
      font-size: 1.2rem; color: #666; margin-bottom: 2rem; letter-spacing: 2px;
    `;
    subtitle.textContent = '6 VS 6';

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
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
      color: #fff; padding: 12px 24px; font-size: 1rem; border-radius: 8px;
      outline: none; width: 280px; text-align: center;
      transition: border-color 0.3s;
    `;
    this.nameInput.addEventListener('focus', () => {
      this.nameInput.style.borderColor = '#f7931e';
    });
    this.nameInput.addEventListener('blur', () => {
      this.nameInput.style.borderColor = 'rgba(255,255,255,0.15)';
    });
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.play();
    });

    // Generate random name
    const names = ['Striker', 'Blaze', 'Phantom', 'Nitro', 'Vortex', 'Fury', 'Shadow', 'Thunder', 'Ace', 'Bolt'];
    this.nameInput.value = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);

    this.playBtn = document.createElement('button');
    this.playBtn.textContent = 'FIND MATCH';
    this.playBtn.style.cssText = `
      background: linear-gradient(135deg, #f7931e, #ff6b35);
      color: #fff; border: none; padding: 14px 48px; font-size: 1.1rem;
      font-weight: 700; border-radius: 8px; cursor: pointer;
      transition: all 0.3s; letter-spacing: 2px;
    `;
    this.playBtn.addEventListener('mouseenter', () => {
      this.playBtn.style.transform = 'translateY(-2px)';
      this.playBtn.style.boxShadow = '0 8px 25px rgba(247,147,30,0.3)';
    });
    this.playBtn.addEventListener('mouseleave', () => {
      this.playBtn.style.transform = '';
      this.playBtn.style.boxShadow = '';
    });
    this.playBtn.addEventListener('click', () => this.play());

    // Controls info
    const controls = document.createElement('div');
    controls.style.cssText = `
      margin-top: 3rem; color: rgba(255,255,255,0.2); font-size: 0.75rem;
      text-align: center; line-height: 1.8;
    `;
    controls.innerHTML = `
       W / Up - Move Forward &nbsp;|&nbsp; S / Down - Move Back<br>
       A / Left - Steer Left &nbsp;|&nbsp; D / Right - Steer Right<br>
       Space - Jump &nbsp;|&nbsp; Shift - Boost &nbsp;|&nbsp; Q / Click - Pass<br>
       M - Mute Audio
       <br><br>
       <a href="https://github.com/Rcciit1234" target="_blank" style="color:rgba(255,255,255,0.3);text-decoration:none;">github.com/Rcciit1234</a>
    `;

    // Status
    this.statusEl = document.createElement('div');
    this.statusEl.style.cssText = `
      margin-top: 1rem; color: #888; font-size: 0.85rem;
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

    // Animated dots
    let dots = 0;
    const interval = setInterval(() => {
      dots = (dots + 1) % 4;
      this.statusEl.textContent = 'Looking for players' + '.'.repeat(dots);
    }, 500);

    // Store interval for cleanup
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
