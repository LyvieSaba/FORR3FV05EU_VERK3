import * as THREE from 'three';

// Scene
const SIZE = 20; // the room is 20 by 20
const HEIGHT = 3;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8c7d3c);
scene.fog = new THREE.FogExp2(0x8c7d3c, 0.08); // yellow fog for the Backrooms feel

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 100);

// Dim light for the whole room
scene.add(new THREE.AmbientLight(0xfff2b0, 0.4));

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(SIZE, SIZE),
  new THREE.MeshStandardMaterial({ color: 0x9c8c4a })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Ceiling
const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(SIZE, SIZE),
  new THREE.MeshStandardMaterial({ color: 0xd8cc8a })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = HEIGHT;
scene.add(ceiling);

// Walls
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xd4c26a });
for (const [x, z, w, d] of [
  [0, -SIZE / 2, SIZE, 0.2],
  [0, SIZE / 2, SIZE, 0.2],
  [-SIZE / 2, 0, 0.2, SIZE],
  [SIZE / 2, 0, 0.2, SIZE],
]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, HEIGHT, d), wallMaterial);
  wall.position.set(x, HEIGHT / 2, z);
  wall.receiveShadow = true;
  scene.add(wall);
}

// Pillars the player can not walk through
const obstacles = [];
for (const [x, z] of [[-4, -3], [3, 2], [-2, 5]]) {
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(1, HEIGHT, 1), wallMaterial);
  pillar.position.set(x, HEIGHT / 2, z);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  scene.add(pillar);
  obstacles.push(new THREE.Box3().setFromObject(pillar));
}

// The Entity is a black box in the corner for now
const entity = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 2.2, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x111111 })
);
entity.position.set(8, 1.1, 8);
entity.castShadow = true;
scene.add(entity);
obstacles.push(new THREE.Box3().setFromObject(entity));

// The player is a box for now
const player = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 1.7, 0.6),
  new THREE.MeshStandardMaterial({ color: 0x3366ff })
);
player.position.set(0, 0.85, -7);
player.castShadow = true;
scene.add(player);

// Light attached to the player so it moves with him
const playerLight = new THREE.PointLight(0xffe9a0, 8, 8);
playerLight.position.set(0.4, 0.5, 0.3);
playerLight.castShadow = true;
player.add(playerLight);

// Controls
const keys = {};
addEventListener('keydown', (e) => (keys[e.code] = true));
addEventListener('keyup', (e) => (keys[e.code] = false));

const WALK_SPEED = 3;
const TURN_SPEED = 2.5;
const RADIUS = 0.4; // the player is treated as a circle

// Returns true if the player would be inside an obstacle
function hitsSomething(x, z) {
  return obstacles.some((b) => {
    const dx = x - THREE.MathUtils.clamp(x, b.min.x, b.max.x);
    const dz = z - THREE.MathUtils.clamp(z, b.min.z, b.max.z);
    return dx * dx + dz * dz < RADIUS * RADIUS;
  });
}

function updatePlayer(dt) {
  // A and D turn the player
  if (keys.KeyA) player.rotation.y += TURN_SPEED * dt;
  if (keys.KeyD) player.rotation.y -= TURN_SPEED * dt;

  // W and S walk forward and back
  let move = 0;
  if (keys.KeyW) move = 1;
  if (keys.KeyS) move = -1;

  const nx = player.position.x + Math.sin(player.rotation.y) * move * WALK_SPEED * dt;
  const nz = player.position.z + Math.cos(player.rotation.y) * move * WALK_SPEED * dt;

  // Only move if the new spot is not inside an obstacle
  if (!hitsSomething(nx, player.position.z)) player.position.x = nx;
  if (!hitsSomething(player.position.x, nz)) player.position.z = nz;

  // Keep the player inside the walls
  const limit = SIZE / 2 - RADIUS;
  player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
  player.position.z = Math.max(-limit, Math.min(limit, player.position.z));
}

// The Entity always turns to look at the player
function updateEntity() {
  entity.lookAt(player.position.x, entity.position.y, player.position.z);
}

// Camera stays behind the player
function updateCamera(dt) {
  const behind = new THREE.Vector3(
    player.position.x - Math.sin(player.rotation.y) * 4,
    2.3,
    player.position.z - Math.cos(player.rotation.y) * 4
  );
  camera.position.lerp(behind, 1 - Math.exp(-5 * dt));
  camera.lookAt(player.position.x, 1.2, player.position.z);
}

// Game loop
const timer = new THREE.Timer();
renderer.setAnimationLoop((time) => {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.05);
  updatePlayer(dt);
  updateEntity();
  updateCamera(dt);
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});