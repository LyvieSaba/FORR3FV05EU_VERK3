import * as THREE from 'three';

// Scene
const SIZE = 20; // the room is 20 by 20
const HEIGHT = 3;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8c7d3c);
scene.fog = new THREE.FogExp2(0x8c7d3c, 0.08); // yellow fog for the Backrooms feel

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 8, -16);
camera.lookAt(0, 0, 0);

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

// Game loop
const timer = new THREE.Timer();
renderer.setAnimationLoop((time) => {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.05);
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
});