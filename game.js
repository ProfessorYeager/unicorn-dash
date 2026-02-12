class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.score = 0;
        this.isRunning = false;
        this.speed = 8; // Increased from 5 to 8

        this.player = new Player(this);
        this.background = new Background(this);
        this.obstacles = [];
        this.particles = [];
        this.ui = new UI(this);

        this.nextObstacleGap = Math.random() * 400 + 400; // Initialize gap

        this.bindEvents();
        this.lastTime = 0;
    }

    // ... (rest of class)

    handleObstacles() {
        let lastObstacleX = this.obstacles.length > 0 ? this.obstacles[this.obstacles.length - 1].x : 0;

        // Spawn first obstacle or if gap is met
        if (this.obstacles.length === 0 ||
            (this.width - lastObstacleX > this.nextObstacleGap)) {

            this.obstacles.push(new Obstacle(this));
            // Random gap between 300 and 900 for more variety
            this.nextObstacleGap = Math.random() * 600 + 300;
        }

        this.obstacles.forEach(obstacle => obstacle.update());
        this.obstacles = this.obstacles.filter(obstacle => !obstacle.markedForDeletion);
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') this.player.jump();
        });

        // Listen on window to catch clicks outside the canvas
        window.addEventListener('mousedown', () => {
            this.player.jump();
        });
        window.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling on mobile
            this.player.jump();
        }, { passive: false });

        document.getElementById('start-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent immediate jump on start
            this.start();
        });
        document.getElementById('restart-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.restart();
        });
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.ui.hideStartScreen();
        this.ui.showScore();

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    restart() {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        this.score = 0;
        this.speed = 5;
        this.player.reset();
        this.obstacles = [];
        this.particles = [];
        this.ui.hideGameOverScreen();

        this.isRunning = false;
        this.start();
    }

    gameOver() {
        this.isRunning = false;
        this.ui.showGameOverScreen(this.score);
    }

    update(deltaTime) {
        if (!this.isRunning) return;

        this.background.update();
        this.player.update(deltaTime);
        this.handleObstacles();
        this.handleParticles();
        this.checkCollisions();

        this.score++;
        this.ui.updateScore(this.score);

        // Speed increase
        // Check every 100 points (approx 1.5 seconds) for a gradual speed boost
        if (this.score % 100 === 0) {
            this.speed += 0.2;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.background.draw(this.ctx);
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
        this.particles.forEach(particle => particle.draw(this.ctx));
        this.player.draw(this.ctx);

    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleObstacles() {
        let lastObstacleX = this.obstacles.length > 0 ? this.obstacles[this.obstacles.length - 1].x : 0;

        // Spawn first obstacle or if gap is met
        if (this.obstacles.length === 0 ||
            (this.width - lastObstacleX > this.nextObstacleGap)) {

            this.obstacles.push(new Obstacle(this));
            // Random gap between 300 and 900 for more variety
            this.nextObstacleGap = Math.random() * 600 + 300;
        }

        this.obstacles.forEach(obstacle => obstacle.update());
        this.obstacles = this.obstacles.filter(obstacle => !obstacle.markedForDeletion);
    }

    handleParticles() {
        this.particles.forEach(particle => particle.update());
        this.particles = this.particles.filter(particle => !particle.markedForDeletion);
    }

    checkCollisions() {
        this.obstacles.forEach(obstacle => {
            const hitBoxX = this.player.x + 10;
            const hitBoxY = this.player.y + 10;
            const hitBoxW = this.player.width - 20;
            const hitBoxH = this.player.height - 20;

            if (
                hitBoxX < obstacle.x + obstacle.width &&
                hitBoxX + hitBoxW > obstacle.x &&
                hitBoxY < obstacle.y + obstacle.height &&
                hitBoxY + hitBoxH > obstacle.y
            ) {
                for (let i = 0; i < 30; i++) {
                    this.particles.push(new Particle(this, this.player.x + this.player.width / 2, this.player.y + this.player.height / 2));
                }
                this.gameOver();
            }
        });
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.width = 50;
        this.height = 50;
        this.x = 100;
        this.y = this.game.height - this.height - 50; // On ground
        this.vy = 0;
        this.weight = 1;
        this.jumpPower = 15;
        this.isJumping = false;
        this.rotation = 0;

        this.image = new Image();
        this.image.src = 'assets/cat_head.png';

        this.trail = [];
    }

    update(deltaTime) {
        // ALWAYS apply velocity first
        this.y += this.vy;

        // Check if player is on or below the ground
        if (this.y > this.game.height - this.height - 50) {
            this.y = this.game.height - this.height - 50;
            this.vy = 0;
            this.isJumping = false;
            this.rotation = 0; // Snap to upright
        } else {
            // Player is in the air
            this.vy += this.weight; // Apply gravity
            this.rotation += 5;     // Rotate while jumping

            // Add trail
            if (this.game.score % 5 === 0) {
                this.trail.push({ x: this.x, y: this.y, rotation: this.rotation, alpha: 0.8 });
            }
        }

        // Update trail
        this.trail.forEach(segment => segment.alpha -= 0.05);
        this.trail = this.trail.filter(segment => segment.alpha > 0);
    }

    draw(ctx) {
        // Draw trail
        this.trail.forEach(segment => {
            ctx.save();
            ctx.globalAlpha = segment.alpha * 0.5;
            ctx.translate(segment.x + this.width / 2, segment.y + this.height / 2);
            ctx.rotate(segment.rotation * Math.PI / 180);
            ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        });

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }

    jump() {
        if (!this.isJumping) {
            this.vy = -this.jumpPower; // GO UP (Negative Y)
            this.isJumping = true;
            // Creation jump particles
            for (let i = 0; i < 10; i++) {
                this.game.particles.push(new Particle(this.game, this.x + this.width / 2, this.y + this.height));
            }
        }
    }

    reset() {
        this.y = this.game.height - this.height - 50;
        this.vy = 0;
        this.isJumping = false;
        this.rotation = 0;
        this.trail = [];
    }
}

class Background {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.width = this.game.width;
        this.height = this.game.height;
        this.speed = 2;
        this.image = new Image();
        this.image.src = 'assets/background.png';
    }

    update() {
        this.x -= this.game.speed * 0.5; // Parallax
        if (this.x < -this.width) this.x = 0;
    }

    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        ctx.drawImage(this.image, this.x + this.width, this.y, this.width, this.height);

        ctx.fillStyle = '#6a0dad';
        ctx.fillRect(0, this.game.height - 50, this.game.width, 50);

        ctx.fillStyle = '#9d00ff';
        ctx.fillRect(0, this.game.height - 50, this.game.width, 5);
    }
}

class Obstacle {
    constructor(game) {
        this.game = game;
        this.width = 40;
        this.height = 40;
        this.x = this.game.width;
        this.y = this.game.height - this.height - 50;
        this.markedForDeletion = false;
        this.image = new Image();
        this.image.src = 'assets/spike.png';
    }

    update() {
        this.x -= this.game.speed;
        if (this.x < -this.width) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}

class Particle {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.size = Math.random() * 10 + 5;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`; // Rainbow
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.size *= 0.95;
        if (this.size < 0.5) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class UI {
    constructor(game) {
        this.game = game;
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.scoreDisplay = document.getElementById('score-display');
        this.finalScore = document.getElementById('final-score');
        this.currentScore = document.getElementById('score');
    }

    hideStartScreen() {
        this.startScreen.classList.add('hidden');
    }

    showGameOverScreen(score) {
        this.finalScore.innerText = score;
        this.gameOverScreen.classList.remove('hidden');
        this.scoreDisplay.classList.add('hidden');
    }

    hideGameOverScreen() {
        this.gameOverScreen.classList.add('hidden');
    }

    showScore() {
        this.scoreDisplay.classList.remove('hidden');
    }

    updateScore(score) {
        this.currentScore.innerText = score;
    }
}

window.addEventListener('load', () => {
    const game = new Game();
});
