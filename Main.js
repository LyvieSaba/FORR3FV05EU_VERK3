import * as THREE from 'three';

// Scene
const W = 40, D = 28; // size of map

const renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 100);
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

// Floor
const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x777777 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Obstacles the car can hit
const obstacles = [];
function addBox(x, z, w, d, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), new THREE.MeshStandardMaterial({ color }));
  mesh.position.set(x, 1, z);
  scene.add(mesh);
  obstacles.push(new THREE.Box3().setFromObject(mesh));
}
// Walls
addBox(0, -D / 2, W, 0.3, 0x555555);
addBox(0, D / 2, W, 0.3, 0x555555);
addBox(-W / 2, 0, 0.3, D, 0x555555);
addBox(W / 2, 0, 0.3, D, 0x555555);


// The car sem er cube
const car = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 4.2), new THREE.MeshStandardMaterial({ color: 0xff3333 }));
car.position.set(-14, 0.5, 0);
scene.add(car);

let heading = Math.PI / 2; // where the car is looking
let steer = 0;
const velocity = new THREE.Vector3();

const keys = {};
addEventListener('keydown', (e) => (keys[e.code] = true));
addEventListener('keyup', (e) => (keys[e.code] = false));

// Collisions
const RADIUS = 1.2; // the car is treated as a circle
function hitsSomething(x, z) {
  return obstacles.some((b) => {
    const dx = x - THREE.MathUtils.clamp(x, b.min.x, b.max.x);
    const dz = z - THREE.MathUtils.clamp(z, b.min.z, b.max.z);
    return dx * dx + dz * dz < RADIUS * RADIUS;
  });
}

// Driving and drifting
function updateCar(dt) {
  const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  let speed = velocity.dot(forward);

  if (keys.KeyW) speed += 12 * dt;
  if (keys.KeyS) speed -= 18 * dt;
  speed *= 1 - 0.4 * dt; // slow down a little every frame
  speed = THREE.MathUtils.clamp(speed, -6, 25);

  steer = THREE.MathUtils.damp(steer, (keys.KeyA ? 0.5 : 0) - (keys.KeyD ? 0.5 : 0), 8, dt);
  heading += steer * speed * 0.15 * dt * (keys.Space ? 1.8 : 1);

  const grip = keys.Space ? 1 : 6; // less grip makes the car drift
  const target = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(speed);
  velocity.lerp(target, 1 - Math.exp(-grip * dt));

  // Check x and z so the car slides along walls
  const nx = car.position.x + velocity.x * dt;
  const nz = car.position.z + velocity.z * dt;
  if (!hitsSomething(nx, car.position.z)) car.position.x = nx; else velocity.x *= -0.3;
  if (!hitsSomething(car.position.x, nz)) car.position.z = nz; else velocity.z *= -0.3;
  car.rotation.y = heading;
}

// Camera follows the car
function updateCamera(dt) {
  const behind = new THREE.Vector3(-Math.sin(heading) * 7, 3, -Math.cos(heading) * 7).add(car.position);
  camera.position.lerp(behind, 1 - Math.exp(-4 * dt));
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -W / 2 + 0.5, W / 2 - 0.5);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -D / 2 + 0.5, D / 2 - 0.5);
  camera.lookAt(car.position);
}

// Game loop
const timer = new THREE.Timer();
renderer.setAnimationLoop((time) => {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.05);
  updateCar(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
