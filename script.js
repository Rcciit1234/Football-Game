const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const WIDTH = 900;
const HEIGHT = 600;
const PITCH_PADDING = 40;
const GOAL_WIDTH = 120;
const PLAYER_RADIUS = 15;
const BALL_RADIUS = 9;
const FRICTION = 0.97; // Slightly higher friction to slow ball faster
const PLAYER_SPEED = 2.8; // Reduced from 3.8
const PLAYER_ACCEL = 0.3; // Reduced from 0.45
const BALL_BOUNCE = 0.5; // Reduced from 0.7

// Set canvas dimensions
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Match State
let gameState = 'START';
let timer = 60;
let lastTime = 0;
let playerScore = 0;
let opponentScore = 0;
let matchTimerId = null;
let shakeTime = 0;
let heldBy = null; // Player currently holding the ball

function triggerShake() {
    shakeTime = 12;
}

// Controls
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

class Ball {
    constructor() {
        this.reset();
        this.particles = [];
        this.angle = 0;
    }

    reset() {
        this.x = WIDTH / 2;
        this.y = HEIGHT / 2;
        this.vx = 0;
        this.vy = 0;
        this.lastKickedBy = null;
    }

    update() {
        if (heldBy) {
            this.vx = 0;
            this.vy = 0;
            // Ball position relative to player facing direction
            this.x = heldBy.x + Math.cos(heldBy.angle) * (PLAYER_RADIUS + 2);
            this.y = heldBy.y + Math.sin(heldBy.angle) * (PLAYER_RADIUS + 2);
        } else {
            this.x += this.vx;
            this.y += this.vy;
            
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            this.angle += speed * 0.08;

            this.vx *= FRICTION;
            this.vy *= FRICTION;

            // Wall collisions
            if (this.y - BALL_RADIUS < PITCH_PADDING || this.y + BALL_RADIUS > HEIGHT - PITCH_PADDING) {
                this.vy *= -BALL_BOUNCE;
                this.y = this.y < HEIGHT / 2 ? PITCH_PADDING + BALL_RADIUS : HEIGHT - PITCH_PADDING - BALL_RADIUS;
                this.createImpactParticles(this.x, this.y, '#fff');
            }

            if (this.x - BALL_RADIUS < PITCH_PADDING || this.x + BALL_RADIUS > WIDTH - PITCH_PADDING) {
                const inGoalY = this.y > HEIGHT / 2 - GOAL_WIDTH / 2 && this.y < HEIGHT / 2 + GOAL_WIDTH / 2;
                
                if (!inGoalY) {
                    this.vx *= -BALL_BOUNCE;
                    this.x = this.x < WIDTH / 2 ? PITCH_PADDING + BALL_RADIUS : WIDTH - PITCH_PADDING - BALL_RADIUS;
                    this.createImpactParticles(this.x, this.y, '#fff');
                } else {
                    if (this.x < PITCH_PADDING) scoreGoal('opponent');
                    if (this.x > WIDTH - PITCH_PADDING) scoreGoal('player');
                }
            }
        }

        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            return p.life > 0;
        });
    }

    createImpactParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                color: color
            });
        }
    }

    draw() {
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Shadow
        ctx.beginPath();
        ctx.arc(this.x, this.y + 6, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        // Realistic Football Drawing
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Base sphere
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, BALL_RADIUS);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.8, '#eee');
        grad.addColorStop(1, '#ccc');
        ctx.fillStyle = grad;
        ctx.fill();
        
        // Pentagon Pattern
        ctx.fillStyle = '#111';
        for(let i=0; i<5; i++) {
            ctx.save();
            ctx.rotate((Math.PI * 2 / 5) * i);
            ctx.beginPath();
            // Draw a small pentagon-like shape
            const r = BALL_RADIUS * 0.5;
            for(let j=0; j<5; j++) {
                const px = r + Math.cos(j * Math.PI * 2 / 5) * 3;
                const py = Math.sin(j * Math.PI * 2 / 5) * 3;
                if(j===0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        // Center pentagon
        ctx.beginPath();
        for(let j=0; j<5; j++) {
            const px = Math.cos(j * Math.PI * 2 / 5) * 3.5;
            const py = Math.sin(j * Math.PI * 2 / 5) * 3.5;
            if(j===0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }
}

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
        this.skinColor = '#ffdbac';
        this.isControlled = false;
        this.kickAnim = 0;
        this.moveAnim = 0;
        this.angle = team === 'player' ? 0 : Math.PI;
        this.holdTime = 0; // Time spent holding the ball
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
        if (this.isControlled) {
            this.handleInput();
        } else {
            this.handleAI(ball);
        }

        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 0.2) {
            this.angle = Math.atan2(this.vy, this.vx);
            this.moveAnim += speed * 0.15;
        }

        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.88;
        this.vy *= 0.88;

        // Keep in bounds
        this.x = Math.max(PITCH_PADDING + PLAYER_RADIUS, Math.min(WIDTH - PITCH_PADDING - PLAYER_RADIUS, this.x));
        this.y = Math.max(PITCH_PADDING + PLAYER_RADIUS, Math.min(HEIGHT - PITCH_PADDING - PLAYER_RADIUS, this.y));

        // Ball interaction
        const dx = ball.x - this.x;
        const dy = ball.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Possession Logic
        if (heldBy === this) {
            this.holdTime += 0.016; // Approx 1 frame at 60fps
            
            // Release ball if SPACE is pressed or if AI hold time is up
            const shouldRelease = this.isControlled ? keys['Space'] : (this.holdTime > 1.2);
            
            if (shouldRelease) {
                let kickAngle;
                if (this.isControlled) {
                    kickAngle = this.angle;
                } else {
                    // AI Kick
                    if (this.role === 'gk') {
                        // Pass to teammate or clear
                        const targetGoalX = this.team === 'player' ? WIDTH - PITCH_PADDING : PITCH_PADDING;
                        kickAngle = Math.atan2(HEIGHT/2 - this.y, targetGoalX - this.x);
                    } else {
                        const targetGoalX = this.team === 'player' ? WIDTH - PITCH_PADDING : PITCH_PADDING;
                        kickAngle = Math.atan2(HEIGHT/2 - this.y, targetGoalX - this.x);
                    }
                }
                
                const power = (this.isControlled && keys['Space']) ? 15 : 9;
                ball.vx = Math.cos(kickAngle) * power;
                ball.vy = Math.sin(kickAngle) * power;
                this.kickAnim = 1;
                heldBy = null;
                this.holdTime = 0;
                ball.createImpactParticles(ball.x, ball.y, this.color);
                if(this.isControlled) triggerShake();
            }
        } else if (!heldBy && dist < PLAYER_RADIUS + BALL_RADIUS + 5) {
            // Grab the ball
            // GK always grabs if close. Field players grab if ball is relatively slow or they are controlled.
            const ballSpeed = Math.sqrt(ball.vx**2 + ball.vy**2);
            if (this.role === 'gk' || ballSpeed < 5 || this.isControlled) {
                heldBy = this;
                this.holdTime = 0;
            }
        }

        if (this.kickAnim > 0) this.kickAnim -= 0.1;
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

        const distToBall = Math.sqrt((ball.x - this.x)**2 + (ball.y - this.y)**2);
        
        // Better "Sense": Players detect ball within 250px
        const detectionRadius = 250;
        const isBallClose = distToBall < detectionRadius;

        if (this.role === 'gk') {
            // Smarter GK: Only move if ball is in our defensive third
            const isBallDangerous = this.team === 'player' ? ball.x < WIDTH / 3 : ball.x > (WIDTH * 2) / 3;
            
            if (isBallDangerous || distToBall < 100) {
                targetY = ball.y;
                // Stay within goal width
                targetY = Math.max(HEIGHT/2 - GOAL_WIDTH/2 - 20, Math.min(HEIGHT/2 + GOAL_WIDTH/2 + 20, targetY));
                
                // If ball is very close, GK moves out slightly to close the angle
                const pushForward = this.team === 'player' ? 20 : -20;
                targetX = this.startX + (distToBall < 80 ? pushForward : 0);
            } else {
                targetX = this.startX;
                targetY = HEIGHT / 2;
            }
        } else {
            // Outfield AI
            const myTeamPlayers = players.filter(p => p.team === this.team && p.role !== 'gk');
            
            // "Sense" logic: Closest 2 players chase, others mark or position
            const sortedByDist = myTeamPlayers.sort((a, b) => {
                const dA = Math.sqrt((ball.x - a.x)**2 + (ball.y - a.y)**2);
                const dB = Math.sqrt((ball.x - b.x)**2 + (ball.y - b.y)**2);
                return dA - dB;
            });

            if (sortedByDist[0] === this || (sortedByDist[1] === this && isBallClose)) {
                // Chase the ball
                targetX = ball.x;
                targetY = ball.y;
            } else {
                // Tactical support: move to a spot between home and ball, but stay in zone
                targetX = (this.startX * 0.7 + ball.x * 0.3);
                targetY = (this.startY * 0.7 + ball.y * 0.3);
            }
        }

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            const speedMult = isBallClose ? 1.2 : 0.8; // Sprint when ball is close
            this.vx += (dx / dist) * PLAYER_ACCEL * speedMult;
            this.vy += (dy / dist) * PLAYER_ACCEL * speedMult;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Shadow
        ctx.beginPath();
        ctx.ellipse(0, 12, PLAYER_RADIUS, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();

        // Limbs (Arms/Legs)
        const limbOsc = Math.sin(this.moveAnim) * 8;
        
        ctx.fillStyle = this.skinColor;
        // Legs
        ctx.fillRect(-8, -10 + limbOsc, 6, 12);
        ctx.fillRect(2, -10 - limbOsc, 6, 12);
        
        // Body/Jersey
        ctx.fillStyle = this.color;
        // Rounded torso
        ctx.beginPath();
        ctx.roundRect(-12, -8, 24, 16, 8);
        ctx.fill();
        
        // Arms
        ctx.fillStyle = this.color;
        ctx.fillRect(-14, -6 - limbOsc, 6, 10); // Left arm
        ctx.fillRect(8, -6 + limbOsc, 6, 10);  // Right arm
        
        // Hands
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(-14, 2 - limbOsc, 6, 4);
        ctx.fillRect(8, 2 + limbOsc, 6, 4);

        // Kicking leg effect
        if (this.kickAnim > 0) {
            ctx.fillStyle = '#eee';
            ctx.save();
            ctx.rotate(this.kickAnim * 0.5);
            ctx.fillRect(10, -3, 14, 6);
            ctx.restore();
        }

        // Head
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fillStyle = this.skinColor;
        ctx.fill();
        // Hair/Helmet look
        ctx.beginPath();
        ctx.arc(0, 0, 7, Math.PI, 0);
        ctx.fillStyle = '#333';
        ctx.fill();

        // Controlled indicator
        if (this.isControlled) {
            ctx.restore();
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            ctx.arc(0, 0, PLAYER_RADIUS + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            
            // Triangle above head
            ctx.beginPath();
            ctx.moveTo(0, -PLAYER_RADIUS - 15);
            ctx.lineTo(-5, -PLAYER_RADIUS - 25);
            ctx.lineTo(5, -PLAYER_RADIUS - 25);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Initialize Players (6x6)
const players = [];
const ball = new Ball();

function initTeams() {
    players.length = 0;
    // Player Team
    players.push(new Player(PITCH_PADDING + 30, HEIGHT/2, 'player', 'gk')); // GK
    players.push(new Player(180, 150, 'player'));
    players.push(new Player(180, 450, 'player'));
    players.push(new Player(320, HEIGHT/2, 'player'));
    players.push(new Player(400, 120, 'player'));
    players.push(new Player(400, 480, 'player'));
    
    // Opponent Team
    players.push(new Player(WIDTH - PITCH_PADDING - 30, HEIGHT/2, 'opponent', 'gk')); // GK
    players.push(new Player(WIDTH - 180, 150, 'opponent'));
    players.push(new Player(WIDTH - 180, 450, 'opponent'));
    players.push(new Player(WIDTH - 320, HEIGHT/2, 'opponent'));
    players.push(new Player(WIDTH - 400, 120, 'opponent'));
    players.push(new Player(WIDTH - 400, 480, 'opponent'));
}

function drawPitch() {
    ctx.fillStyle = '#1a4d1a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Grass stripes
    ctx.fillStyle = '#1e551e';
    for(let i=0; i<10; i++) {
        if(i % 2 === 0) ctx.fillRect(PITCH_PADDING + (i * (WIDTH - PITCH_PADDING*2)/10), PITCH_PADDING, (WIDTH - PITCH_PADDING*2)/10, HEIGHT - PITCH_PADDING*2);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
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

    // Goals
    ctx.fillStyle = '#fff';
    ctx.fillRect(PITCH_PADDING - 6, HEIGHT / 2 - GOAL_WIDTH / 2, 6, GOAL_WIDTH);
    ctx.fillRect(WIDTH - PITCH_PADDING, HEIGHT / 2 - GOAL_WIDTH / 2, 6, GOAL_WIDTH);
    
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff88';
    ctx.strokeRect(PITCH_PADDING - 6, HEIGHT / 2 - GOAL_WIDTH / 2, 6, GOAL_WIDTH);
    ctx.strokeRect(WIDTH - PITCH_PADDING, HEIGHT / 2 - GOAL_WIDTH / 2, 6, GOAL_WIDTH);
    ctx.shadowBlur = 0;
}

function scoreGoal(team) {
    if (gameState !== 'PLAYING') return;
    gameState = 'GOAL';
    let scoreEl = document.getElementById(team === 'player' ? 'player-score' : 'opponent-score');
    if(team === 'player') playerScore++; else opponentScore++;
    
    updateHUD();
    triggerShake();
    scoreEl.classList.add('pop');
    setTimeout(() => scoreEl.classList.remove('pop'), 300);

    const alert = document.getElementById('goal-alert');
    alert.classList.remove('hidden');
    setTimeout(() => {
        alert.classList.add('hidden');
        resetPositions();
        gameState = 'PLAYING';
    }, 2000);
}

function resetPositions() {
    ball.reset();
    heldBy = null;
    players.forEach(p => p.reset());
}

function updateHUD() {
    document.getElementById('player-score').textContent = playerScore;
    document.getElementById('opponent-score').textContent = opponentScore;
    const mins = Math.floor(timer / 60);
    const secs = timer % 60;
    document.getElementById('match-timer').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateControlledPlayer() {
    // Include GK in the potential controlled players if ball is in our half
    const playerTeam = players.filter(p => p.team === 'player');
    let closest = playerTeam[0];
    let minDist = Infinity;
    
    playerTeam.forEach(p => {
        p.isControlled = false;
        const dist = Math.sqrt((ball.x - p.x)**2 + (ball.y - p.y)**2);
        
        // Bonus for switching to GK when ball is very close to goal
        let weight = (p.role === 'gk' && ball.x < WIDTH / 3) ? 0.7 : 1.0;
        
        if (dist * weight < minDist) {
            minDist = dist * weight;
            closest = p;
        }
    });
    
    if (closest) closest.isControlled = true;
}

function gameLoop(time) {
    lastTime = time;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    ctx.save();
    if (shakeTime > 0) {
        ctx.translate((Math.random() - 0.5) * shakeTime, (Math.random() - 0.5) * shakeTime);
        shakeTime--;
    }
    
    drawPitch();

    if (gameState === 'PLAYING' || gameState === 'GOAL') {
        updateControlledPlayer();
        players.forEach(p => { p.update(ball); p.draw(); });
        ball.update();
        ball.draw();
    } else {
        players.forEach(p => p.draw());
        ball.draw();
    }
    
    ctx.restore();
    requestAnimationFrame(gameLoop);
}

function startMatch() {
    playerScore = 0; opponentScore = 0; timer = 60;
    updateHUD(); initTeams(); resetPositions();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    gameState = 'PLAYING';
    if (matchTimerId) clearInterval(matchTimerId);
    matchTimerId = setInterval(() => {
        if (gameState === 'PLAYING') {
            timer--; updateHUD();
            if (timer <= 0) endGame();
        }
    }, 1000);
}

function endGame() {
    gameState = 'END';
    clearInterval(matchTimerId);
    const res = document.getElementById('result-text');
    res.textContent = playerScore > opponentScore ? 'YOU WIN!' : (playerScore < opponentScore ? 'AI WINS!' : 'DRAW!');
    document.getElementById('final-player-score').textContent = playerScore;
    document.getElementById('final-opponent-score').textContent = opponentScore;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

document.getElementById('start-btn').addEventListener('click', startMatch);
document.getElementById('restart-btn').addEventListener('click', startMatch);

initTeams();
drawPitch();
requestAnimationFrame(gameLoop);
updateHUD();
