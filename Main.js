import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { animate } from 'animejs';
import 'animejs/adapters/three';

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

// One loading manager that every loader uses
const manager = new THREE.LoadingManager();

const gltfLoader = new GLTFLoader(manager);

const textureLoader = new THREE.TextureLoader(manager);

// Load a texture and make it repeat
function loadTexture(file, repeatX, repeatY) {
  const texture = textureLoader.load(file);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

// Dim light for the whole room
scene.add(new THREE.AmbientLight(0xfff2b0, 0.4));

// Ceiling lights
const ceilingLights = [];
for (const [x, z] of [[-4, -6], [4, 0], [-3, 7]]) {
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.05, 0.6),
    new THREE.MeshBasicMaterial({ color: 0xfffbe0 })
  );
  panel.position.set(x, HEIGHT - 0.03, z);
  scene.add(panel);

  const light = new THREE.PointLight(0xfff4c0, 6, 12);
  light.position.set(x, HEIGHT - 0.3, z);
  scene.add(light);
  ceilingLights.push(light);
}

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(SIZE, SIZE),
  new THREE.MeshStandardMaterial({ map: loadTexture('textures/carpet.jpg', 10, 10) })
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
const wallMaterial = new THREE.MeshStandardMaterial({ map: loadTexture('textures/wallpaper.jpg', 10, 1.5) });for (const [x, z, w, d] of [
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
const pillarMaterial = new THREE.MeshStandardMaterial({ map: loadTexture('textures/wallpaper.jpg', 0.5, 1.5) });
const obstacles = [];
for (const [x, z] of [[-4, -3], [3, 2], [-2, 5]]) {
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(1, HEIGHT, 1), pillarMaterial);  pillar.position.set(x, HEIGHT / 2, z);
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  scene.add(pillar);
  obstacles.push(new THREE.Box3().setFromObject(pillar));
}

// The Entity is a group so the body and the eyes move together
const entity = new THREE.Group();

const entityBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 2.2, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x111111 })
);
entityBody.name = 'body';
entityBody.position.y = 1.1;
entityBody.castShadow = true;
entity.add(entityBody);

// Two glowing eyes are children of the body
const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05), eyeMaterial);
leftEye.position.set(-0.12, 0.85, 0.16);
const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.05), eyeMaterial);
rightEye.position.set(0.12, 0.85, 0.16);
entityBody.add(leftEye, rightEye);

entity.position.set(8, 0, 8);
scene.add(entity);
obstacles.push(new THREE.Box3().setFromObject(entityBody));

// Animation clip that makes the Entity sway slowly from side to side
const swayClip = new THREE.AnimationClip('sway', 4, [
  new THREE.NumberKeyframeTrack('body.rotation[z]', [0, 2, 4], [-0.1, 0.1, -0.1]),
]);
const entityMixer = new THREE.AnimationMixer(entity);
entityMixer.clipAction(swayClip).play();

// The player is a group so the model and the light move together
const player = new THREE.Group();
player.position.set(0, 0, -7);
scene.add(player);

// Light attached to the player so it moves with him
const playerLight = new THREE.PointLight(0xffe9a0, 8, 8);
playerLight.position.set(0.4, 1.3, 0.3);
playerLight.castShadow = true;
player.add(playerLight);

// Load the character
let mixer;
const actions = {};
let currentAction;

gltfLoader.load('models/Soldier.glb', (gltf) => {
  const model = gltf.scene;
  model.rotation.y = Math.PI; // turn the model so it faces forward

  // Scale the model so it is about 1.7 meters tall
  const height = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;
  model.scale.multiplyScalar(1.7 / height);

  model.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  player.add(model);

  // Get the animations from the model
  mixer = new THREE.AnimationMixer(model);
  for (const clip of gltf.animations) {
    actions[clip.name] = mixer.clipAction(clip);
  }
  currentAction = actions.Idle;
  currentAction.play();
});

// Smoothly switch from the current animation to a new one
function playAnimation(name) {
  const next = actions[name];
  if (next === currentAction) return;
  next.reset();
  next.play();
  currentAction.crossFadeTo(next, 0.3, false);
  currentAction = next;
}


// Controls only work after Byrja is clicked
let started = false;
const keys = {};
addEventListener('keydown', (e) => {
  if (started) keys[e.code] = true;
});
addEventListener('keyup', (e) => (keys[e.code] = false));

const WALK_SPEED = 1.8;
const RUN_SPEED = 4.5;
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

  // Hold Shift to run
  const running = keys.ShiftLeft && move !== 0;
  const speed = running ? RUN_SPEED : WALK_SPEED;

  const nx = player.position.x + Math.sin(player.rotation.y) * move * speed * dt;
  const nz = player.position.z + Math.cos(player.rotation.y) * move * speed * dt;

  // Only move if the new spot is not inside an obstacle
  if (!hitsSomething(nx, player.position.z)) player.position.x = nx;
  if (!hitsSomething(player.position.x, nz)) player.position.z = nz;

  // Keep the player inside the walls
  const limit = SIZE / 2 - RADIUS;
  player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
  player.position.z = Math.max(-limit, Math.min(limit, player.position.z));

    // Pick the right animation
  if (mixer) {
    if (move === 0) playAnimation('Idle');
    else if (running) playAnimation('Run');
    else playAnimation('Walk');
    mixer.update(dt);
  }
}

// The Entity always turns to look at the player and keeps swaying
function updateEntity(dt) {
  entity.lookAt(player.position.x, 0, player.position.z);
  entityMixer.update(dt);
}
// Camera stays behind the player
function updateCamera(dt) {
  const behind = new THREE.Vector3(
    player.position.x - Math.sin(player.rotation.y) * 4,
    2.3,
    player.position.z - Math.cos(player.rotation.y) * 4
  );
  camera.position.lerp(behind, 1 - Math.exp(-5 * dt));
  // Keep the camera inside the walls so it never ends up behind one
  const camLimit = SIZE / 2 - 0.3;
  camera.position.x = Math.max(-camLimit, Math.min(camLimit, camera.position.x));
  camera.position.z = Math.max(-camLimit, Math.min(camLimit, camera.position.z));
  camera.lookAt(player.position.x, 1.2, player.position.z);
}

// Anime.js makes one ceiling light flicker on and off
animate(ceilingLights[1], {
  intensity: [
    { to: 0.5, duration: 80 },
    { to: 6, duration: 60 },
    { to: 0, duration: 150 },
    { to: 6, duration: 90 },
    { to: 2, duration: 70 },
    { to: 6, duration: 120 },
  ],
  ease: 'linear',
  loop: true,
  loopDelay: 1800,
});

// Sound
const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader(manager);

// Humming lights that you hear everywhere
const hum = new THREE.Audio(listener);
audioLoader.load('sounds/hum.wav', (buffer) => {
  hum.setBuffer(buffer);
  hum.setLoop(true);
  hum.setVolume(0.4);
});

// 3D sound that comes from the Entity and gets louder when you are close
const drone = new THREE.PositionalAudio(listener);
entity.add(drone);
audioLoader.load('sounds/drone.wav', (buffer) => {
  drone.setBuffer(buffer);
  drone.setLoop(true);
  drone.setRefDistance(2);
  drone.setVolume(1);
});

// Loading screen
const loadingScreen = document.getElementById('loading');
const barFill = document.getElementById('bar-fill');
const loadingText = document.getElementById('loading-text');
const startButton = document.getElementById('start-button');

// Show how much has loaded
manager.onProgress = (url, loaded, total) => {
  const percent = Math.round((loaded / total) * 100);
  barFill.style.width = percent + '%';
  loadingText.textContent = 'Loading... ' + percent + '%';
};

// Show the Byrja button when everything is loaded
manager.onLoad = () => {
  loadingText.textContent = 'Ready';
  startButton.hidden = false;
};

// Byrja hides the loading screen and starts the sound
startButton.addEventListener('click', () => {
  loadingScreen.classList.add('hide');
  started = true;
  hum.play();
  drone.play();
});

// Game loop
const timer = new THREE.Timer();
renderer.setAnimationLoop((time) => {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.05);
  updatePlayer(dt);
  updateEntity(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});