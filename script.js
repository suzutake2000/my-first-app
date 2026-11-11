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
    sky.addColorStop(0, "#090f22");
    sky.addColorStop(0.58, "#182344");
    sky.addColorStop(1, "#39264e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const horizonGlow = ctx.createRadialGradient(width * 0.62, groundY - 30, 8, width * 0.62, groundY - 30, width * 0.68);
    horizonGlow.addColorStop(0, "rgba(255, 67, 159, .25)");
    horizonGlow.addColorStop(0.45, "rgba(104, 67, 181, .12)");
    horizonGlow.addColorStop(1, "rgba(9, 15, 34, 0)");
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 0, width, groundY);

    ctx.save();
    ctx.translate(-cameraX * 0.08, 0);
    for (let i = 0; i < 64; i++) {
        const x = (i * 173 + 41) % WORLD_WIDTH;
        const y = 16 + (i * 71 % Math.max(30, Math.floor(groundY * 0.62)));
        const radius = i % 9 === 0 ? 1.5 : 0.8;
        ctx.globalAlpha = 0.35 + (i % 5) * 0.12;
        ctx.fillStyle = i % 7 === 0 ? "#ff8fc9" : "#c8e9ff";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    const moonX = width * 0.78;
    const moonY = Math.max(56, groundY * 0.27);
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 72);
    moonGlow.addColorStop(0, "rgba(123, 227, 255, .24)");
    moonGlow.addColorStop(1, "rgba(123, 227, 255, 0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b9e8ff";
    ctx.shadowColor = "#73d9ff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.translate(-cameraX * 0.2, 0);
    for (let i = 0; i < 28; i++) {
        const x = i * 148 + 20;
        const buildingHeight = 70 + (i * 53 % 115);
        const buildingWidth = 94 + (i * 17 % 38);
        const building = ctx.createLinearGradient(x, groundY - buildingHeight, x, groundY);
        building.addColorStop(0, i % 2 ? "#1c2948" : "#202747");
        building.addColorStop(1, "#111a33");
        ctx.fillStyle = building;
        ctx.fillRect(x, groundY - buildingHeight, buildingWidth, buildingHeight);
        ctx.fillStyle = i % 3 === 0 ? "rgba(255, 89, 171, .7)" : "rgba(66, 226, 238, .62)";
        ctx.fillRect(x, groundY - buildingHeight, buildingWidth, 2);

        if (i % 4 === 1) {
            ctx.strokeStyle = "rgba(117, 153, 205, .6)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + buildingWidth * 0.7, groundY - buildingHeight);
            ctx.lineTo(x + buildingWidth * 0.7, groundY - buildingHeight - 22);
            ctx.stroke();
            ctx.fillStyle = "#ff69b4";
            ctx.fillRect(x + buildingWidth * 0.7 - 2, groundY - buildingHeight - 25, 4, 4);
        }

        for (let row = 0; row < Math.floor(buildingHeight / 19); row++) {
            for (let column = 0; column < 3; column++) {
                if ((i * 7 + row * 3 + column) % 4 === 0) continue;
                ctx.fillStyle = (i + row + column) % 5 === 0 ? "rgba(255, 198, 111, .7)" : "rgba(76, 195, 220, .5)";
                ctx.fillRect(x + 12 + column * 22, groundY - buildingHeight + 12 + row * 19, 5, 7);
            }
        }
    }
    ctx.restore();

    const road = ctx.createLinearGradient(0, groundY, 0, height);
    road.addColorStop(0, "#111a32");
    road.addColorStop(1, "#090f20");
    ctx.fillStyle = road;
    ctx.fillRect(0, groundY, width, height - groundY);
    const roadEdge = ctx.createLinearGradient(0, 0, width, 0);
    roadEdge.addColorStop(0, "#4ce8dd");
    roadEdge.addColorStop(0.5, "#a46aff");
    roadEdge.addColorStop(1, "#ff6d9d");
    ctx.fillStyle = roadEdge;
    ctx.fillRect(0, groundY, width, 3);
    ctx.save();
    ctx.translate(-cameraX, 0);
    ctx.strokeStyle = "rgba(87, 206, 232, .13)";
    ctx.lineWidth = 1;
    for (let x = Math.floor(cameraX / 42) * 42; x < cameraX + width; x += 42) {
        ctx.beginPath();
        ctx.moveTo(x, groundY + 10);
        ctx.lineTo(x - 25, height);
        ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 95, 173, .1)";
    for (let y = groundY + 21; y < height; y += 17) {
        ctx.beginPath();
        ctx.moveTo(cameraX, y);
        ctx.lineTo(cameraX + width, y);
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
        const x = enemy.x;
        const bob = Math.sin(elapsed * 8 + enemy.startX) * 1.5;
        const y = groundY - 29 + bob;

        ctx.fillStyle = "rgba(7, 10, 25, .48)";
        ctx.beginPath();
        ctx.ellipse(x + 14, groundY - 2, 19, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.shadowColor = "#ff3f91";
        ctx.shadowBlur = 12;

        ctx.fillStyle = "#fb4d91";
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 10);
        ctx.lineTo(x + 1, y + 5);
        ctx.lineTo(x + 10, y + 8);
        ctx.lineTo(x + 15, y + 1);
        ctx.lineTo(x + 19, y + 8);
        ctx.lineTo(x + 28, y + 5);
        ctx.lineTo(x + 25, y + 12);
        ctx.closePath();
        ctx.fill();

        const shell = ctx.createLinearGradient(x, y + 8, x + 29, y + 27);
        shell.addColorStop(0, "#db397f");
        shell.addColorStop(0.5, "#922c6f");
        shell.addColorStop(1, "#432655");
        ctx.fillStyle = shell;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 11);
        ctx.lineTo(x + 9, y + 7);
        ctx.lineTo(x + 21, y + 7);
        ctx.lineTo(x + 28, y + 13);
        ctx.lineTo(x + 26, y + 23);
        ctx.lineTo(x + 20, y + 28);
        ctx.lineTo(x + 8, y + 27);
        ctx.lineTo(x + 2, y + 21);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ff8fc6";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#211b38";
        ctx.beginPath();
        ctx.roundRect(x + 6, y + 13, 18, 8, 3);
        ctx.fill();
        ctx.shadowColor = "#ff355f";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#ff536d";
        ctx.beginPath();
        ctx.moveTo(x + 9, y + 15);
        ctx.lineTo(x + 14, y + 16);
        ctx.lineTo(x + 12, y + 18);
        ctx.lineTo(x + 8, y + 18);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 18, y + 16);
        ctx.lineTo(x + 23, y + 15);
        ctx.lineTo(x + 22, y + 18);
        ctx.lineTo(x + 17, y + 18);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#b83478";
        ctx.fillRect(x + 6, y + 25, 6, 4);
        ctx.fillRect(x + 19, y + 25, 6, 4);
        ctx.fillStyle = "#ff9acb";
        ctx.fillRect(x + 5, y + 28, 8, 2);
        ctx.fillRect(x + 18, y + 28, 8, 2);
        ctx.fillStyle = "#6ef5f0";
        ctx.fillRect(x + 13, y + 22, 4, 2);
        ctx.restore();
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

        const running = player.grounded && Math.abs(player.vx) > 0;
        const stride = running ? Math.sin(elapsed * 16) * 2 : 0;

        ctx.save();
        ctx.shadowColor = "#39dfff";
        ctx.shadowBlur = 13;

        ctx.fillStyle = "#f451a5";
        ctx.beginPath();
        ctx.moveTo(px + 11, py + 13);
        ctx.lineTo(px + 5, py + 17 + Math.sin(elapsed * 10) * 2);
        ctx.lineTo(px - 5, py + 20 + Math.sin(elapsed * 10) * 3);
        ctx.lineTo(px + 4, py + 24);
        ctx.lineTo(px + 13, py + 22);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#20233f";
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 15);
        ctx.lineTo(px + 21, py + 14);
        ctx.lineTo(px + 27, py + 23);
        ctx.lineTo(px + 23, py + 29);
        ctx.lineTo(px + 8, py + 28);
        ctx.lineTo(px + 4, py + 21);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#5c83bb";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#303454";
        ctx.beginPath();
        ctx.moveTo(px + 5, py + 9);
        ctx.lineTo(px + 9, py + 3);
        ctx.lineTo(px + 20, py + 1);
        ctx.lineTo(px + 28, py + 7);
        ctx.lineTo(px + 26, py + 15);
        ctx.lineTo(px + 8, py + 16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#53e9f2";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const visor = ctx.createLinearGradient(px + 10, py + 8, px + 26, py + 12);
        visor.addColorStop(0, "#377b9e");
        visor.addColorStop(0.55, "#8ffcff");
        visor.addColorStop(1, "#42d5dc");
        ctx.fillStyle = visor;
        ctx.beginPath();
        ctx.moveTo(px + 11, py + 8);
        ctx.lineTo(px + 24, py + 7);
        ctx.lineTo(px + 25, py + 11);
        ctx.lineTo(px + 12, py + 13);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#56f3ef";
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 16);
        ctx.lineTo(px + 2, py + 24 + stride);
        ctx.lineTo(px + 8, py + 26);
        ctx.lineTo(px + 12, py + 19);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#252844";
        ctx.fillRect(px + 8, py + 26, 7, 5 + stride);
        ctx.fillRect(px + 19, py + 26, 7, 5 - stride);
        ctx.fillStyle = "#ff6ba8";
        ctx.fillRect(px + 6, py + 30 + stride, 10, 3);
        ctx.fillRect(px + 18, py + 30 - stride, 10, 3);
        ctx.fillStyle = "#c8ffff";
        ctx.fillRect(px + 18, py + 16, 5, 2);
        ctx.restore();
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
