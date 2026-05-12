const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIDTH = 900;
const HEIGHT = 600;
const PITCH_PADDING = 50;
const GOAL_WIDTH = 120;
const PLAYER_RADIUS = 14;
const BALL_RADIUS = 8;
const FRICTION = 0.965;
const PLAYER_SPEED = 2.8;
const PLAYER_ACCEL = 0.3;
const BALL_BOUNCE = 0.5;
const STADIUM_BG = '#0d0d1a';

canvas.width = WIDTH;
canvas.height = HEIGHT;

let gameState = 'START';
let timer = 60;
let lastTime = 0;
let playerScore = 0;
let opponentScore = 0;
let matchTimerId = null;
let shakeTime = 0;
let shakeIntensity = 0;
let heldBy = null;
let particles = [];
let crowd = [];
let goalFlash = 0;
let goalScored = null;
let celebrationTimer = 0;

// --- Audio ---
let audioCtx = null;
let crowdGain = null;
let crowdSource = null;

function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const sr = audioCtx.sampleRate;
        const len = sr * 4;
        const buf = audioCtx.createBuffer(1, len, sr);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
            const white = Math.random() * 2 - 1;
            d[i] = (last + 0.015 * white) / 1.015;
            last = d[i];
            d[i] *= 3.5;
        }
        crowdSource = audioCtx.createBufferSource();
        crowdSource.buffer = buf;
        crowdSource.loop = true;
        const bp = audioCtx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 500;
        bp.Q.value = 0.4;
        crowdGain = audioCtx.createGain();
        crowdGain.gain.value = 0.035;
        crowdSource.connect(bp);
        bp.connect(crowdGain);
        crowdGain.connect(audioCtx.destination);
        crowdSource.start();
    } catch(e) {}
}

function playCheer() {
    if (!audioCtx || !crowdGain) return;
    crowdGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    crowdGain.gain.exponentialRampToValueAtTime(0.035, audioCtx.currentTime + 2.5);
    for (let i = 0; i < 3; i++) {
        try {
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 500 + Math.random() * 500;
            g.gain.setValueAtTime(0.025, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5 + Math.random());
            osc.connect(g);
            g.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 2);
        } catch(e) {}
    }
}

function playKick() {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);
        g.gain.setValueAtTime(0.08, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } catch(e) {}
}

function playWhistle() {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(950, audioCtx.currentTime + 0.12);
        osc.frequency.setValueAtTime(780, audioCtx.currentTime + 0.25);
        g.gain.setValueAtTime(0.12, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } catch(e) {}
}

// --- Controls ---
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!audioCtx && gameState !== 'START') {
        initAudio();
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

function triggerShake(intensity = 8) {
    shakeTime = 10;
    shakeIntensity = intensity;
}

// --- Particles ---
function emitParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.015 + Math.random() * 0.025,
            size: 2 + Math.random() * 4,
            color
        });
    }
}

// --- Crowd ---
function generateCrowd() {
    crowd = [];
    const colors = ['#ff4444', '#4488ff', '#44ddaa', '#ffaa00', '#ff44ff', '#ffffff', '#44ff44', '#ff6688'];
    const rows = 3;
    const spacing = 20;
    const offsetY = 8;
    for (let row = 0; row < rows; row++) {
        const y = offsetY + row * 12;
        const y2 = HEIGHT - offsetY - row * 12;
        for (let x = 10; x < WIDTH - 10; x += spacing + Math.random() * 8) {
            crowd.push({
                x, y,
                phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.6,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 3 + Math.random() * 4,
                bob: 0.5 + Math.random() * 1.5
            });
            crowd.push({
                x, y: y2,
                phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.6,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 3 + Math.random() * 4,
                bob: 0.5 + Math.random() * 1.5
            });
        }
    }
}

// --- Ball ---
class Ball {
    constructor() {
        this.reset();
        this.trail = [];
    }

    reset() {
        this.x = WIDTH / 2;
        this.y = HEIGHT / 2;
        this.vx = 0;
        this.vy = 0;
        this.lastKickedBy = null;
        this.angle = 0;
        this.trail = [];
    }

    update() {
        if (heldBy) {
            this.vx = 0;
            this.vy = 0;
            const offset = PLAYER_RADIUS + 5;
            this.x = heldBy.x + Math.cos(heldBy.angle) * offset;
            this.y = heldBy.y + Math.sin(heldBy.angle) * offset;
            this.trail = [];
            return;
        }

        this.x += this.vx;
        this.y += this.vy;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.angle += speed * 0.1;

        if (speed > 2 && this.trail.length < 20) {
            this.trail.push({ x: this.x, y: this.y, life: 1 });
        }
        this.trail = this.trail.filter(t => {
            t.life -= 0.05;
            return t.life > 0;
        });

        this.vx *= FRICTION;
        this.vy *= FRICTION;

        if (this.y - BALL_RADIUS < PITCH_PADDING || this.y + BALL_RADIUS > HEIGHT - PITCH_PADDING) {
            this.vy *= -BALL_BOUNCE;
            this.y = this.y < HEIGHT / 2 ? PITCH_PADDING + BALL_RADIUS : HEIGHT - PITCH_PADDING - BALL_RADIUS;
            emitParticles(this.x, this.y, '#ffffff', 6);
        }

        if (this.x - BALL_RADIUS < PITCH_PADDING || this.x + BALL_RADIUS > WIDTH - PITCH_PADDING) {
            const inGoalY = this.y > HEIGHT / 2 - GOAL_WIDTH / 2 && this.y < HEIGHT / 2 + GOAL_WIDTH / 2;
            if (!inGoalY) {
                this.vx *= -BALL_BOUNCE;
                this.x = this.x < WIDTH / 2 ? PITCH_PADDING + BALL_RADIUS : WIDTH - PITCH_PADDING - BALL_RADIUS;
                emitParticles(this.x, this.y, '#ffffff', 6);
            } else {
                if (this.x < PITCH_PADDING) scoreGoal('opponent');
                if (this.x > WIDTH - PITCH_PADDING) scoreGoal('player');
            }
        }
    }

    draw() {
        this.trail.forEach((t, i) => {
            ctx.globalAlpha = t.life * 0.25;
            ctx.beginPath();
            ctx.arc(t.x, t.y, BALL_RADIUS * 0.8 * t.life, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 10, BALL_RADIUS, BALL_RADIUS * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, BALL_RADIUS);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#eeeeee');
        grad.addColorStop(1, '#aaaaaa');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.fillStyle = '#222';
        const r = BALL_RADIUS * 0.5;
        for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.rotate((Math.PI * 2 / 5) * i);
            ctx.beginPath();
            for (let j = 0; j < 5; j++) {
                const px = r + Math.cos(j * Math.PI * 2 / 5) * 2.5;
                const py = Math.sin(j * Math.PI * 2 / 5) * 2.5;
                j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
            const px = Math.cos(j * Math.PI * 2 / 5) * 3;
            const py = Math.sin(j * Math.PI * 2 / 5) * 3;
            j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// --- Player ---
class Player {
    constructor(x, y, team, role = 'field') {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.team = team;
        this.role = role;
        this.color = team === 'player' ? '#0088ff' : '#ff3333';
        this.shirtColor = team === 'player' ? '#0066cc' : '#cc2222';
        this.skinColor = '#ffdbac';
        this.isControlled = false;
        this.kickAnim = 0;
        this.moveAnim = 0;
        this.angle = team === 'player' ? 0 : Math.PI;
        this.holdTime = 0;
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.vx = 0;
        this.vy = 0;
        this.kickAnim = 0;
        this.moveAnim = 0;
        this.holdTime = 0;
    }

    update(ball) {
        if (this.isControlled) this.handleInput();
        else this.handleAI(ball);

        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 0.1) {
            this.angle = Math.atan2(this.vy, this.vx);
            this.moveAnim += speed * 0.12;
        } else if (this.moveAnim > 0.01) {
            this.moveAnim *= 0.92;
        }

        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.88;
        this.vy *= 0.88;

        this.x = Math.max(PITCH_PADDING + PLAYER_RADIUS, Math.min(WIDTH - PITCH_PADDING - PLAYER_RADIUS, this.x));
        this.y = Math.max(PITCH_PADDING + PLAYER_RADIUS, Math.min(HEIGHT - PITCH_PADDING - PLAYER_RADIUS, this.y));

        const dx = ball.x - this.x;
        const dy = ball.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (heldBy === this) {
            this.holdTime += 0.016;
            const shouldRelease = this.isControlled ? keys['Space'] : (this.holdTime > 1.2);
            if (shouldRelease) {
                let kickAngle = this.angle;
                if (!this.isControlled) {
                    kickAngle = Math.atan2(
                        HEIGHT / 2 - this.y,
                        (this.team === 'player' ? WIDTH - PITCH_PADDING : PITCH_PADDING) - this.x
                    );
                }
                const power = (this.isControlled && keys['Space']) ? 14 : 8;
                ball.vx = Math.cos(kickAngle) * power;
                ball.vy = Math.sin(kickAngle) * power;
                this.kickAnim = 1;
                heldBy = null;
                this.holdTime = 0;
                emitParticles(ball.x, ball.y, '#ffffff', 8);
                playKick();
                if (this.isControlled) triggerShake(6);
            }
        } else if (!heldBy && dist < PLAYER_RADIUS + BALL_RADIUS + 4) {
            const ballSpeed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
            if (this.role === 'gk' || ballSpeed < 4 || this.isControlled) {
                heldBy = this;
                this.holdTime = 0;
            }
        }

        if (this.kickAnim > 0) this.kickAnim -= 0.07;
    }

    handleInput() {
        if (keys['KeyW'] || keys['ArrowUp']) this.vy -= PLAYER_ACCEL;
        if (keys['KeyS'] || keys['ArrowDown']) this.vy += PLAYER_ACCEL;
        if (keys['KeyA'] || keys['ArrowLeft']) this.vx -= PLAYER_ACCEL;
        if (keys['KeyD'] || keys['ArrowRight']) this.vx += PLAYER_ACCEL;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > PLAYER_SPEED) {
            this.vx = (this.vx / speed) * PLAYER_SPEED;
            this.vy = (this.vy / speed) * PLAYER_SPEED;
        }
    }

    handleAI(ball) {
        let targetX = this.startX;
        let targetY = this.startY;
        const distToBall = Math.sqrt((ball.x - this.x) ** 2 + (ball.y - this.y) ** 2);
        const detectionRadius = 250;
        const isBallClose = distToBall < detectionRadius;

        if (this.role === 'gk') {
            const isDangerous = this.team === 'player'
                ? ball.x < WIDTH / 3
                : ball.x > (WIDTH * 2) / 3;
            if (isDangerous || distToBall < 100) {
                targetY = ball.y;
                targetY = Math.max(
                    HEIGHT / 2 - GOAL_WIDTH / 2 - 20,
                    Math.min(HEIGHT / 2 + GOAL_WIDTH / 2 + 20, targetY)
                );
                const pushForward = this.team === 'player' ? 20 : -20;
                targetX = this.startX + (distToBall < 80 ? pushForward : 0);
            } else {
                targetX = this.startX;
                targetY = HEIGHT / 2;
            }
        } else {
            const myTeam = players.filter(p => p.team === this.team && p.role !== 'gk');
            const sorted = [...myTeam].sort((a, b) => {
                const dA = Math.sqrt((ball.x - a.x) ** 2 + (ball.y - a.y) ** 2);
                const dB = Math.sqrt((ball.x - b.x) ** 2 + (ball.y - b.y) ** 2);
                return dA - dB;
            });
            if (sorted[0] === this || (sorted[1] === this && isBallClose)) {
                targetX = ball.x;
                targetY = ball.y;
            } else {
                targetX = this.startX * 0.7 + ball.x * 0.3;
                targetY = this.startY * 0.7 + ball.y * 0.3;
            }
        }

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
            const mult = isBallClose ? 1.2 : 0.8;
            this.vx += (dx / dist) * PLAYER_ACCEL * mult;
            this.vy += (dy / dist) * PLAYER_ACCEL * mult;
        }
    }

    draw() {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const bodyLean = Math.min(speed * 0.4, 4);
        const legCycle = Math.sin(this.moveAnim) * 12;
        const armCycle = Math.sin(this.moveAnim) * 8;

        ctx.save();
        ctx.translate(this.x, this.y);

        const drawAngle = heldBy === this && this.kickAnim > 0
            ? this.angle + this.kickAnim * 0.3
            : this.angle;
        ctx.rotate(drawAngle);

        ctx.beginPath();
        ctx.ellipse(0, 14, PLAYER_RADIUS - 2, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fill();

        ctx.fillStyle = this.team === 'player' ? '#1a1a4a' : '#4a1a1a';
        ctx.save();
        ctx.translate(-4, 3 - bodyLean);
        ctx.rotate(legCycle * 0.025);
        ctx.fillRect(-3, 0, 5, 14);
        ctx.restore();
        ctx.save();
        ctx.translate(4, 3 - bodyLean);
        ctx.rotate(-legCycle * 0.025);
        ctx.fillRect(-2, 0, 5, 14);
        ctx.restore();

        ctx.fillStyle = '#111';
        const shoeOff = legCycle * 0.03;
        ctx.fillRect(-7 + shoeOff, 14 - bodyLean - 2, 6, 4);
        ctx.fillRect(1 - shoeOff, 14 - bodyLean - 2, 6, 4);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-11, -10 - bodyLean, 22, 16, 6);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(-2, -10 - bodyLean, 4, 16);

        ctx.fillStyle = this.color;
        ctx.save();
        ctx.translate(-13, -6 - bodyLean);
        ctx.rotate(-armCycle * 0.015);
        ctx.fillRect(-3, 0, 5, 10);
        ctx.restore();
        ctx.save();
        ctx.translate(8, -6 - bodyLean);
        ctx.rotate(armCycle * 0.015);
        ctx.fillRect(-2, 0, 5, 10);
        ctx.restore();

        ctx.fillStyle = this.skinColor;
        ctx.fillRect(-16, 2 - bodyLean + armCycle * 0.015, 4, 4);
        ctx.fillRect(12, 2 - bodyLean - armCycle * 0.015, 4, 4);

        if (this.kickAnim > 0) {
            ctx.fillStyle = '#222';
            ctx.save();
            ctx.translate(10, -2);
            ctx.rotate(this.kickAnim * 0.3);
            ctx.fillRect(0, -3, 16, 5);
            ctx.fillStyle = '#111';
            ctx.fillRect(14, -5, 6, 9);
            ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(0, -12 - bodyLean, 7, 0, Math.PI * 2);
        ctx.fillStyle = this.skinColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, -12 - bodyLean, 7, Math.PI, 0);
        ctx.fillStyle = '#333';
        ctx.fill();

        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(3, -14 - bodyLean, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-3, -14 - bodyLean, 1.2, 0, Math.PI * 2);
        ctx.fill();

        if (this.isControlled) {
            ctx.restore();
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            ctx.arc(0, 0, PLAYER_RADIUS + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#00ff88';
            ctx.beginPath();
            ctx.moveTo(0, -PLAYER_RADIUS - 18);
            ctx.lineTo(-5, -PLAYER_RADIUS - 28);
            ctx.lineTo(5, -PLAYER_RADIUS - 28);
            ctx.fill();
        }

        ctx.restore();
    }
}

// --- Game Objects ---
const players = [];
const ball = new Ball();

function initTeams() {
    players.length = 0;
    players.push(new Player(PITCH_PADDING + 30, HEIGHT / 2, 'player', 'gk'));
    players.push(new Player(180, 150, 'player'));
    players.push(new Player(180, 450, 'player'));
    players.push(new Player(320, HEIGHT / 2, 'player'));
    players.push(new Player(400, 120, 'player'));
    players.push(new Player(400, 480, 'player'));

    players.push(new Player(WIDTH - PITCH_PADDING - 30, HEIGHT / 2, 'opponent', 'gk'));
    players.push(new Player(WIDTH - 180, 150, 'opponent'));
    players.push(new Player(WIDTH - 180, 450, 'opponent'));
    players.push(new Player(WIDTH - 320, HEIGHT / 2, 'opponent'));
    players.push(new Player(WIDTH - 400, 120, 'opponent'));
    players.push(new Player(WIDTH - 400, 480, 'opponent'));
}

// --- Drawing ---
function drawStadium() {
    const topGrad = ctx.createLinearGradient(0, 0, 0, PITCH_PADDING);
    topGrad.addColorStop(0, '#12122a');
    topGrad.addColorStop(1, '#0a0a18');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, WIDTH, PITCH_PADDING);

    const bottomGrad = ctx.createLinearGradient(0, HEIGHT - PITCH_PADDING, 0, HEIGHT);
    bottomGrad.addColorStop(0, '#0a0a18');
    bottomGrad.addColorStop(1, '#12122a');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, HEIGHT - PITCH_PADDING, WIDTH, PITCH_PADDING);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, WIDTH, 4);
    ctx.fillRect(0, HEIGHT - 4, WIDTH, 4);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let y = 5; y < PITCH_PADDING; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }
    for (let y = HEIGHT - PITCH_PADDING; y < HEIGHT - 4; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }
}

function drawFloodlights() {
    const towers = [
        { x: 30, h: -30 },
        { x: WIDTH - 30, h: -30 }
    ];

    towers.forEach(t => {
        ctx.fillStyle = '#333';
        ctx.fillRect(t.x - 3, t.h, 6, PITCH_PADDING + 15);

        ctx.fillStyle = '#444';
        ctx.fillRect(t.x - 10, t.h - 5, 20, 10);

        const grad = ctx.createRadialGradient(t.x, PITCH_PADDING, 5, t.x, PITCH_PADDING, 300);
        grad.addColorStop(0, 'rgba(255,255,200,0.12)');
        grad.addColorStop(0.3, 'rgba(255,255,200,0.04)');
        grad.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(t.x - 120, PITCH_PADDING);
        ctx.lineTo(t.x + 120, PITCH_PADDING);
        ctx.lineTo(t.x + 250, HEIGHT - PITCH_PADDING);
        ctx.lineTo(t.x - 250, HEIGHT - PITCH_PADDING);
        ctx.closePath();
        ctx.fill();

        if (t.x < WIDTH / 2) {
            ctx.beginPath();
            ctx.moveTo(t.x - 80, PITCH_PADDING + 5);
            ctx.lineTo(t.x + 80, PITCH_PADDING + 5);
            ctx.lineTo(t.x + 180, HEIGHT - PITCH_PADDING);
            ctx.lineTo(t.x - 180, HEIGHT - PITCH_PADDING);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255,255,200,0.03)';
            ctx.fill();
        }
    });
}

function drawCrowd(time) {
    const excited = goalScored !== null;
    crowd.forEach(m => {
        const bob = Math.sin(time * 0.002 * m.speed + m.phase) * m.bob * (excited ? 2 : 1);
        const yy = m.y + bob;

        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(m.x, yy, m.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = m.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(m.x + 1, yy + 3, m.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

function drawPitch(time) {
    const pitchGrad = ctx.createLinearGradient(0, PITCH_PADDING, 0, HEIGHT - PITCH_PADDING);
    pitchGrad.addColorStop(0, '#1a551a');
    pitchGrad.addColorStop(0.5, '#1e5e1e');
    pitchGrad.addColorStop(1, '#1a551a');
    ctx.fillStyle = pitchGrad;
    ctx.fillRect(PITCH_PADDING, PITCH_PADDING, WIDTH - PITCH_PADDING * 2, HEIGHT - PITCH_PADDING * 2);

    ctx.fillStyle = '#1e5e1e';
    for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
            ctx.fillRect(
                PITCH_PADDING + (i * (WIDTH - PITCH_PADDING * 2)) / 10,
                PITCH_PADDING,
                (WIDTH - PITCH_PADDING * 2) / 10,
                HEIGHT - PITCH_PADDING * 2
            );
        }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(PITCH_PADDING, PITCH_PADDING, WIDTH - PITCH_PADDING * 2, HEIGHT - PITCH_PADDING * 2);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, PITCH_PADDING);
    ctx.lineTo(WIDTH / 2, HEIGHT - PITCH_PADDING);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(WIDTH / 2, HEIGHT / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(PITCH_PADDING, HEIGHT / 2 - 110, 90, 220);
    ctx.strokeRect(WIDTH - PITCH_PADDING - 90, HEIGHT / 2 - 110, 90, 220);

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff88';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(PITCH_PADDING - 6, HEIGHT / 2 - GOAL_WIDTH / 2, 6, GOAL_WIDTH);
    ctx.fillRect(WIDTH - PITCH_PADDING, HEIGHT / 2 - GOAL_WIDTH / 2, 6, GOAL_WIDTH);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(PITCH_PADDING - 12, HEIGHT / 2 - GOAL_WIDTH / 2 - 4, 6, GOAL_WIDTH + 8);
    ctx.fillRect(WIDTH - PITCH_PADDING + 6, HEIGHT / 2 - GOAL_WIDTH / 2 - 4, 6, GOAL_WIDTH + 8);
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.beginPath();
    ctx.arc(WIDTH / 2 + 20, HEIGHT / 2 + 10, 120, 0, Math.PI * 2);
    ctx.fill();
}

function updateHUD() {
    document.getElementById('player-score').textContent = playerScore;
    document.getElementById('opponent-score').textContent = opponentScore;
    const mins = Math.floor(timer / 60);
    const secs = timer % 60;
    document.getElementById('match-timer').textContent =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function scoreGoal(team) {
    if (gameState !== 'PLAYING') return;
    gameState = 'GOAL';
    goalScored = team;
    celebrationTimer = 120;

    if (team === 'player') playerScore++;
    else opponentScore++;

    updateHUD();
    triggerShake(12);
    playCheer();

    const scoreEl = document.getElementById(team === 'player' ? 'player-score' : 'opponent-score');
    scoreEl.classList.add('pop');
    setTimeout(() => scoreEl.classList.remove('pop'), 300);

    const alert = document.getElementById('goal-alert');
    alert.classList.remove('hidden');
    setTimeout(() => {
        alert.classList.add('hidden');
        goalScored = null;
        resetPositions();
        gameState = 'PLAYING';
    }, 2000);
}

function resetPositions() {
    ball.reset();
    heldBy = null;
    players.forEach(p => p.reset());
}

function updateControlledPlayer() {
    const playerTeam = players.filter(p => p.team === 'player');
    let closest = playerTeam[0];
    let minDist = Infinity;
    playerTeam.forEach(p => {
        p.isControlled = false;
        const dist = Math.sqrt((ball.x - p.x) ** 2 + (ball.y - p.y) ** 2);
        const weight = (p.role === 'gk' && ball.x < WIDTH / 3) ? 0.7 : 1.0;
        if (dist * weight < minDist) {
            minDist = dist * weight;
            closest = p;
        }
    });
    if (closest) closest.isControlled = true;
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= p.decay;
        return p.life > 0;
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// --- Game Loop ---
function gameLoop(time) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    if (shakeTime > 0) {
        ctx.translate(
            (Math.random() - 0.5) * shakeIntensity,
            (Math.random() - 0.5) * shakeIntensity
        );
        shakeTime--;
    }

    drawStadium();
    drawCrowd(time);
    drawFloodlights();
    drawPitch(time);

    updateParticles();

    if (gameState === 'PLAYING' || gameState === 'GOAL') {
        updateControlledPlayer();
        players.forEach(p => p.update(ball));
        ball.update();
    }

    players.sort((a, b) => a.y - b.y).forEach(p => p.draw());
    ball.draw();
    drawParticles();

    if (goalScored && celebrationTimer > 0) {
        celebrationTimer--;
        if (celebrationTimer % 4 === 0) {
            const cx = WIDTH / 2 + (Math.random() - 0.5) * 300;
            const cy = HEIGHT / 2 + (Math.random() - 0.5) * 200;
            emitParticles(cx, cy, ['#ff4444', '#4488ff', '#00ff88', '#ffaa00'][Math.floor(Math.random() * 4)], 3);
        }
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// --- Match Control ---
function startMatch() {
    playerScore = 0;
    opponentScore = 0;
    timer = 60;
    updateHUD();
    initTeams();
    resetPositions();
    particles = [];
    goalScored = null;
    goalFlash = 0;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('result-text').style.color = '';
    gameState = 'PLAYING';
    if (matchTimerId) clearInterval(matchTimerId);
    matchTimerId = setInterval(() => {
        if (gameState === 'PLAYING') {
            timer--;
            updateHUD();
            if (timer <= 0) endGame();
        }
    }, 1000);
    initAudio();
    playWhistle();
}

function endGame() {
    gameState = 'END';
    clearInterval(matchTimerId);
    const res = document.getElementById('result-text');
    const isWin = playerScore > opponentScore;
    const isDraw = playerScore === opponentScore;
    res.textContent = isWin ? 'YOU WIN!' : (isDraw ? 'DRAW!' : 'AI WINS!');
    res.style.color = isWin ? '#00ff88' : (isDraw ? '#ffaa00' : '#ff4444');
    document.getElementById('final-player-score').textContent = playerScore;
    document.getElementById('final-opponent-score').textContent = opponentScore;
    document.getElementById('game-over-screen').classList.remove('hidden');
    if (isWin) playCheer();
}

document.getElementById('start-btn').addEventListener('click', startMatch);
document.getElementById('restart-btn').addEventListener('click', startMatch);

initTeams();
generateCrowd();
drawPitch(0);
updateHUD();
requestAnimationFrame(gameLoop);
