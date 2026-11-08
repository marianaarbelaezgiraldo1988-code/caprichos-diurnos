const game = document.getElementById('game');
const playerEl = document.getElementById('player');
const obstaclesEl = document.getElementById('obstacles');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const titleEl = document.getElementById('panel-title');
const textEl = document.getElementById('panel-text');
const startBtn = document.getElementById('start-btn');

const lanes = [39, 50, 61];
const obstacleTypes = [
  { name: 'enemy1', src: 'assets/enemy1.png', className: 'enemy1' },
  { name: 'enemy2', src: 'assets/enemy2.png', className: 'enemy2' },
  { name: 'enemy3', src: 'assets/enemy3.png', className: 'enemy3' },
  { name: 'tronco', src: 'assets/tronco.png', className: 'log-obstacle' }
];
const keys = { left: false, right: false };
let playerLane = 1, obstacles = [], score = 0, speed = 27;
let spawnTimer = 0, running = false, lastTime = 0, animationId = 0;

function resetGame() {
  playerLane = 1;
  obstacles = [];
  score = 0;
  speed = 27;
  spawnTimer = 0;
  lastTime = 0;
  keys.left = false;
  keys.right = false;
  scoreEl.textContent = '0';
  playerEl.style.left = lanes[playerLane] + '%';
  obstaclesEl.replaceChildren();
}

function movePlayer(dir) {
  if (!running) return;
  const nextLane = Math.max(0, Math.min(2, playerLane + dir));
  if (nextLane === playerLane) return;
  playerLane = nextLane;
  // CSS transition makes lane changes glide instead of snapping.
  playerEl.style.left = lanes[playerLane] + '%';
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * lanes.length);
  const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
  const img = document.createElement('img');
  img.className = 'sprite obstacle ' + type.className;
  img.src = type.src;
  img.alt = type.name === 'tronco' ? 'Tronco' : 'Obstáculo';
  img.draggable = false;
  img.style.left = lanes[lane] + '%';
  img.style.top = '-12%';
  obstaclesEl.appendChild(img);
  obstacles.push({ el: img, lane, top: -12, passed: false });
}

function overlaps(a, b) {
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  const insetX = Math.min(ar.width, br.width) * .2;
  const insetY = Math.min(ar.height, br.height) * .2;
  return ar.left + insetX < br.right - insetX && ar.right - insetX > br.left + insetX &&
         ar.top + insetY < br.bottom - insetY && ar.bottom - insetY > br.top + insetY;
}

function endGame() {
  running = false;
  cancelAnimationFrame(animationId);
  titleEl.textContent = '¡Fin del viaje!';
  textEl.textContent = `Conseguiste ${score} puntos. ¿Intentamos superar tu récord?`;
  startBtn.textContent = 'VOLVER A JUGAR';
  overlay.classList.remove('hidden');
}

function update(dt) {
  speed = Math.min(48, speed + dt * .45);
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = Math.max(.62, 1.15 - score * .008);
  }

  for (const obstacle of obstacles) {
    obstacle.top += speed * dt;
    obstacle.el.style.top = obstacle.top + '%';
    if (!obstacle.passed && obstacle.top > 83) {
      obstacle.passed = true;
      score++;
      scoreEl.textContent = score;
    }
    if (obstacle.lane === playerLane && overlaps(playerEl, obstacle.el)) {
      endGame();
      return;
    }
  }

  obstacles = obstacles.filter(obstacle => {
    if (obstacle.top > 115) {
      obstacle.el.remove();
      return false;
    }
    return true;
  });
}

function frame(time) {
  if (!running) return;
  const dt = Math.min((time - (lastTime || time)) / 1000, .04);
  lastTime = time;
  update(dt);
  if (running) animationId = requestAnimationFrame(frame);
}

function startGame() {
  cancelAnimationFrame(animationId);
  resetGame();
  overlay.classList.add('hidden');
  running = true;
  animationId = requestAnimationFrame(frame);
}

function keyDown(e) {
  const key = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
  if ((key === 'arrowleft' || key === 'a') && !keys.left) {
    keys.left = true;
    movePlayer(-1);
  }
  if ((key === 'arrowright' || key === 'd') && !keys.right) {
    keys.right = true;
    movePlayer(1);
  }
}

function keyUp(e) {
  const key = e.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') keys.left = false;
  if (key === 'arrowright' || key === 'd') keys.right = false;
}

window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);
window.addEventListener('blur', () => { keys.left = false; keys.right = false; });
document.getElementById('left-btn').addEventListener('click', () => movePlayer(-1));
document.getElementById('right-btn').addEventListener('click', () => movePlayer(1));
startBtn.addEventListener('click', startGame);
resetGame();
