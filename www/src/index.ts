import * as wasm from "curvature";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI, { Controller } from 'lil-gui';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

await wasm.default();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('draco/');
dracoLoader.setDecoderConfig({ type: 'js' });

const teaPot = new TeapotGeometry(0.1, 30, true, true, true, true,);
let bunny: THREE.BufferGeometry;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', onWindowResize);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 15);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = true;
controls.enableDamping = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x443333);

const guiState = {
  model: "teapot",
  min: 0,
  max: 0,
};
const gui = new GUI();

let minController: Controller | undefined;
let maxController: Controller | undefined;

const makeModel = (geometry: THREE.BufferGeometry, option?: { max?: number, min?: number }) => {
  let curvature = wasm.get_curvature(new Float64Array(geometry.getAttribute("position").array as Float32Array),
    geometry.index!.array as Uint32Array);

  const min = curvature.reduce((a, b) => a < b ? a : b);
  const max = curvature.reduce((a, b) => a > b ? a : b);

  guiState.min = option?.min || min;
  guiState.max = option?.max || max;

  const color: number[] = [];
  const k = 0.6666 / (guiState.max - guiState.min);

  curvature.forEach((item: number) => color.push(...new THREE.Color().setHSL(THREE.MathUtils.clamp((guiState.max - item) * k, 0, 0.6666), 1, 0.5, "srgb-linear").toArray()));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(color), 3));

  minController?.destroy();
  maxController?.destroy();

  minController = gui.add(guiState, 'min', min, max).onChange((min: any) => {
    const color: number[] = [];
    const k = 0.6666 / (guiState.max - min);
    curvature.forEach((val: number) => color.push(...new THREE.Color().setHSL(THREE.MathUtils.clamp((guiState.max - val) * k, 0, 0.6666), 1, 0.5, "srgb-linear").toArray()));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(color), 3));
    geometry.getAttribute("color").needsUpdate = true;
  });
  console.log(max)
  maxController = gui.add(guiState, 'max', min, max).onChange((max: any) => {
    const color: number[] = [];
    const k = 0.6666 / (max - guiState.min);
    curvature.forEach((val: number) => color.push(...new THREE.Color().setHSL(THREE.MathUtils.clamp((max - val) * k, 0, 0.6666), 1, 0.5, "srgb-linear").toArray()));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(color), 3));
    geometry.getAttribute("color").needsUpdate = true;
  });
  console.log(gui)
  const material = new THREE.MeshBasicMaterial({ color: 0x606060, vertexColors: true });
  return new THREE.Mesh(geometry, material);
}

const showBunny = () => {
  const add = () => {
    scene.clear();
    camera.position.set(0.1, 0.2, 0.5);
    camera.lookAt(0, 0.1, 0);
    controls.target.set(0, 0.1, 0);
    scene.add(makeModel(bunny, { max: 430 }));
  };

  if (bunny) {
    add()
  } else {
    dracoLoader.load('public/bunny.drc', (geometry) => {
      bunny = geometry;
      add();
      dracoLoader.dispose();
    });
  }
}

const showTeaPot = () => {
  scene.clear();
  camera.position.set(0.4, 0.2, 0.8);
  camera.lookAt(0, 0.05, 0);
  controls.target.set(0, 0.05, 0);
  scene.add(makeModel(teaPot, { max: 80 }));
}

gui.add(guiState, 'model').options(['teapot', 'bunny']).onChange((val: string) => {
  if (val === "bunny") {
    showBunny();
  } else {
    showTeaPot();
  }
});

showTeaPot();

animate();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  render();
  requestAnimationFrame(animate);
}

function render() {
  renderer.render(scene, camera);
}


