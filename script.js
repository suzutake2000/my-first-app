const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const coinCount = document.querySelector("#coin-count");
const lifeCount = document.querySelector("#life-count");
const progressFill = document.querySelector("#progress-fill");
const progressLabel = document.querySelector("#progress-label");
const message = document.querySelector("#game-message");
const messageTitle = document.querySelector("#message-title");
const messageText = document.querySelector("#message-text");
const messageIcon = document.querySelector("#message-icon");

const WORLD_WIDTH = 3200;
const PLAYER_SIZE = 30;
const input = { left: false, right: false };
let width = 0;
let height = 0;
let groundY = 0;
let lastTime = 0;
let elapsed = 0;
let cameraX = 0;
let status = "playing";
let coins = [];
let enemies = [];
let player;

const platforms = [
    { x: 340, offset: 92, width: 130 },
    { x: 665, offset: 135, width: 125 },
    { x: 1015, offset: 90, width: 155 },
    { x: 1405, offset: 125, width: 145 },
    { x: 1785, offset: 85, width: 135 },
    { x: 2135, offset: 135, width: 160 },
    { x: 2550, offset: 95, width: 145 },
];

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    groundY = height - 46;
}

function resetGame() {
    player = { x: 70, y: groundY - PLAYER_SIZE, vx: 0, vy: 0, grounded: true, lives: 3, score: 0, invulnerable: 0 };
    coins = Array.from({ length: 25 }, (_, index) => {
        const x = 245 + index * 116;
        const platform = platforms.find(item => x > item.x + 10 && x < item.x + item.width - 10);
        const alternate = index % 4 === 2;
        return {
            x,
            y: platform ? groundY - platform.offset - 27 : groundY - (alternate ? 105 : 63),
            collected: false,
        };
    });
    enemies = [560, 890, 1260, 1630, 1990, 2380, 2790].map((x, index) => ({
        x, startX: x, direction: index % 2 ? -1 : 1, alive: true,
    }));
    cameraX = 0;
    elapsed = 0;
    status = "playing";
    message.hidden = true;
    updateHud();
}

function updateHud() {
    coinCount.textContent = String(player.score);
    lifeCount.textContent = String(player.lives);
    const progress = Math.min(100, Math.max(0, (player.x / (WORLD_WIDTH - 100)) * 100));
    progressFill.style.width = `${progress}%`;
    progressLabel.textContent = progress < 5 ? "スタート地点" : progress > 94 ? "ゴール間近！" : "ゴールまで";
}

function endGame(won) {
    status = won ? "won" : "lost";
    messageIcon.textContent = won ? "🏁" : "💫";
    messageTitle.textContent = won ? "ゴール！" : "ゲームオーバー";
    messageText.textContent = won
        ? `${player.score}枚のコインを集めてクリアしました。`
        : "ライフがなくなりました。もう一度挑戦しよう！";
    message.hidden = false;
}

function hurtPlayer() {
    if (player.invulnerable > 0) return;
    player.lives -= 1;
    player.invulnerable = 1.25;
    player.vy = -260;
    player.vx = player.x < WORLD_WIDTH - 300 ? -100 : 100;
    if (player.lives <= 0) endGame(false);
    updateHud();
}

function update(delta) {
    if (status !== "playing") return;
    const dt = Math.min(delta, 1 / 30);
    elapsed += dt;
    player.invulnerable = Math.max(0, player.invulnerable - dt);

    player.vx = (Number(input.right) - Number(input.left)) * 245;
    player.x = Math.max(0, Math.min(WORLD_WIDTH - 55, player.x + player.vx * dt));
    const previousBottom = player.y + PLAYER_SIZE;
    player.vy += 1200 * dt;
    player.y += player.vy * dt;
    player.grounded = false;

    const floorTop = groundY - PLAYER_SIZE;
    if (previousBottom <= groundY && player.y >= floorTop) {
        player.y = floorTop;
        player.vy = 0;
        player.grounded = true;
    }

    for (const platform of platforms) {
        const top = groundY - platform.offset;
        const overlapsX = player.x + PLAYER_SIZE > platform.x && player.x < platform.x + platform.width;
        if (overlapsX && player.vy >= 0 && previousBottom <= top && player.y + PLAYER_SIZE >= top) {
            player.y = top - PLAYER_SIZE;
            player.vy = 0;
            player.grounded = true;
        }
    }

    for (const coin of coins) {
        if (coin.collected) continue;
        if (Math.abs(player.x + PLAYER_SIZE / 2 - coin.x) < 22 && Math.abs(player.y + PLAYER_SIZE / 2 - coin.y) < 23) {
            coin.collected = true;
            player.score += 1;
        }
    }

    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        enemy.x += enemy.direction * 48 * dt;
        if (Math.abs(enemy.x - enemy.startX) > 48) enemy.direction *= -1;
        const overlaps = player.x + PLAYER_SIZE - 4 > enemy.x && player.x + 4 < enemy.x + 29
            && player.y + PLAYER_SIZE > groundY - 30 && player.y < groundY;
        if (!overlaps) continue;
        if (player.vy > 0 && previousBottom <= groundY - 17) {
            enemy.alive = false;
            player.vy = -410;
            player.score += 2;
        } else {
            hurtPlayer();
        }
    }

    if (player.x >= WORLD_WIDTH - 110) endGame(true);
    cameraX = Math.max(0, Math.min(WORLD_WIDTH - width, player.x - width * .35));
    updateHud();
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#1a294c");
    sky.addColorStop(1, "#263356");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(-cameraX * .2, 0);
    for (let i = 0; i < 12; i++) {
        const x = i * 190 + 25;
        const buildingHeight = 75 + (i * 37 % 100);
        ctx.fillStyle = i % 2 ? "#243252" : "#202d4d";
        ctx.fillRect(x, groundY - buildingHeight, 118, buildingHeight);
        ctx.fillStyle = "#526084";
        for (let row = 0; row < Math.floor(buildingHeight / 23); row++) {
            ctx.fillRect(x + 13, groundY - buildingHeight + 13 + row * 23, 4, 5);
            ctx.fillRect(x + 34, groundY - buildingHeight + 13 + row * 23, 4, 5);
        }
    }
    ctx.restore();

    ctx.fillStyle = "#1c2948";
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.fillStyle = "#45e6d0";
    ctx.fillRect(0, groundY, width, 3);
    ctx.save();
    ctx.translate(-cameraX, 0);
    ctx.strokeStyle = "rgba(102, 127, 174, .14)";
    ctx.lineWidth = 1;
    for (let x = Math.floor(cameraX / 42) * 42; x < cameraX + width; x += 42) {
        ctx.beginPath();
        ctx.moveTo(x, groundY + 10);
        ctx.lineTo(x - 25, height);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPlatform(platform) {
    const top = groundY - platform.offset;
    ctx.fillStyle = "#3e5078";
    ctx.fillRect(platform.x, top, platform.width, 12);
    ctx.fillStyle = "#45e6d0";
    ctx.fillRect(platform.x, top, platform.width, 3);
    ctx.fillStyle = "rgba(12, 19, 38, .45)";
    ctx.fillRect(platform.x + 5, top + 12, platform.width - 10, 5);
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    ctx.save();
    ctx.translate(-cameraX, 0);

    for (const platform of platforms) drawPlatform(platform);
    for (const coin of coins) {
        if (coin.collected) continue;
        const pulse = 1 + Math.sin(elapsed * 5 + coin.x) * .12;
        ctx.beginPath();
        ctx.ellipse(coin.x, coin.y, 7 * pulse, 10 / pulse, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd85e";
        ctx.fill();
        ctx.strokeStyle = "#fff0a5";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const y = groundY - 26;
        ctx.fillStyle = "#ff6d9d";
        ctx.beginPath();
        ctx.roundRect(enemy.x, y + 5, 29, 21, 8);
        ctx.fill();
        ctx.fillStyle = "#ffe5ee";
        ctx.fillRect(enemy.x + 7, y + 10, 4, 5);
        ctx.fillRect(enemy.x + 18, y + 10, 4, 5);
        ctx.fillStyle = "#283253";
        ctx.fillRect(enemy.x + 8, y + 12, 2, 3);
        ctx.fillRect(enemy.x + 19, y + 12, 2, 3);
    }

    const goalX = WORLD_WIDTH - 105;
    ctx.fillStyle = "#b9c9e8";
    ctx.fillRect(goalX, groundY - 104, 4, 104);
    ctx.fillStyle = "#45e6d0";
    ctx.beginPath();
    ctx.moveTo(goalX + 4, groundY - 103);
    ctx.lineTo(goalX + 54, groundY - 87);
    ctx.lineTo(goalX + 4, groundY - 70);
    ctx.closePath();
    ctx.fill();

    if (player.invulnerable <= 0 || Math.floor(elapsed * 12) % 2 === 0) {
        const px = player.x;
        const py = player.y;
        ctx.fillStyle = "#45e6d0";
        ctx.beginPath();
        ctx.roundRect(px, py + 4, PLAYER_SIZE, PLAYER_SIZE - 4, 8);
        ctx.fill();
        ctx.fillStyle = "#152541";
        ctx.fillRect(px + 17, py + 11, 4, 5);
        ctx.fillRect(px + 24, py + 11, 3, 5);
        ctx.fillStyle = "#c5fff5";
        ctx.fillRect(px + 5, py + 1, 18, 5);
        ctx.fillStyle = "#9cfff0";
        ctx.fillRect(px + 4, py + PLAYER_SIZE - 3, 8, 4);
        ctx.fillRect(px + 19, py + PLAYER_SIZE - 3, 8, 4);
    }
    ctx.restore();
}

function frame(timestamp) {
    const delta = lastTime ? (timestamp - lastTime) / 1000 : 0;
    lastTime = timestamp;
    update(delta);
    draw();
    requestAnimationFrame(frame);
}

function jump() {
    if (status === "playing" && player.grounded) {
        player.vy = -455;
        player.grounded = false;
    }
}

window.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") input.right = true;
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
        if (!event.repeat) jump();
    }
    if (event.code === "Enter" && status !== "playing") resetGame();
});

window.addEventListener("keyup", event => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = false;
    if (event.code === "ArrowRight" || event.code === "KeyD") input.right = false;
});

window.addEventListener("blur", () => { input.left = false; input.right = false; });
window.addEventListener("resize", resizeCanvas);
document.querySelector("#restart-button").addEventListener("click", resetGame);
document.querySelector("#play-again").addEventListener("click", resetGame);

for (const button of document.querySelectorAll("[data-control]")) {
    const control = button.dataset.control;
    button.addEventListener("pointerdown", event => {
        event.preventDefault();
        if (control === "jump") jump();
        else input[control] = true;
        button.setPointerCapture(event.pointerId);
    });
    const release = () => { if (control !== "jump") input[control] = false; };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
}

resizeCanvas();
resetGame();
requestAnimationFrame(frame);
