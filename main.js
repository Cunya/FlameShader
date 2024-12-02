import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import vertexShader from './shaders/flame.vert?raw';
import fragmentShader from './shaders/flame.frag?raw';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a plane geometry for the flame
const geometry = new THREE.PlaneGeometry(2, 2);

// Load the mask texture
const textureLoader = new THREE.TextureLoader();
const maskTexture = textureLoader.load('/flame_mask.png');

// Create shader parameters object for GUI
const params = {
    flameHeight: 1.5,      // How high the flame goes
    flameSpread: 0.15,     // How much the flame spreads horizontally
    flameSpeed: 1.0,       // Speed of flame movement
    turbulence: 1.0,       // Amount of turbulence
    flickerSpeed: 3.0,     // Speed of flickering
    flickerIntensity: 0.15,// Amount of flickering
    sourceIntensity: 1.0,  // Intensity at source points
    noiseScale: 1.0,       // Scale of noise
    alphaFalloff: 0.2,     // How quickly flame fades out
    distortionAmount: 0.3, // Amount of flame distortion
    color1: '#ffeb94',     // Core color
    color2: '#ff8c27',     // Middle color
    color3: '#ff3800',     // Base color
};

// Create shader material
const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    uniforms: {
        uTime: { value: 0 },
        uMask: { value: maskTexture },
        uColor1: { value: new THREE.Color(params.color1) },
        uColor2: { value: new THREE.Color(params.color2) },
        uColor3: { value: new THREE.Color(params.color3) },
        uFlameHeight: { value: params.flameHeight },
        uFlameSpread: { value: params.flameSpread },
        uFlameSpeed: { value: params.flameSpeed },
        uTurbulence: { value: params.turbulence },
        uFlickerSpeed: { value: params.flickerSpeed },
        uFlickerIntensity: { value: params.flickerIntensity },
        uSourceIntensity: { value: params.sourceIntensity },
        uNoiseScale: { value: params.noiseScale },
        uAlphaFalloff: { value: params.alphaFalloff },
        uDistortionAmount: { value: params.distortionAmount }
    }
});

// Create mesh
const flame = new THREE.Mesh(geometry, material);
scene.add(flame);

// Position camera
camera.position.z = 5;

// Setup GUI
const gui = new GUI();

// Flame Shape folder
const shapeFolder = gui.addFolder('Flame Shape');
shapeFolder.add(params, 'flameHeight', 0.5, 3.0, 0.1)
    .onChange(value => material.uniforms.uFlameHeight.value = value);
shapeFolder.add(params, 'flameSpread', 0.0, 0.5, 0.01)
    .onChange(value => material.uniforms.uFlameSpread.value = value);
shapeFolder.add(params, 'distortionAmount', 0.0, 1.0, 0.05)
    .onChange(value => material.uniforms.uDistortionAmount.value = value);

// Movement folder
const movementFolder = gui.addFolder('Movement');
movementFolder.add(params, 'flameSpeed', 0.1, 3.0, 0.1)
    .onChange(value => material.uniforms.uFlameSpeed.value = value);
movementFolder.add(params, 'turbulence', 0.0, 2.0, 0.1)
    .onChange(value => material.uniforms.uTurbulence.value = value);
movementFolder.add(params, 'flickerSpeed', 0.1, 10.0, 0.1)
    .onChange(value => material.uniforms.uFlickerSpeed.value = value);
movementFolder.add(params, 'flickerIntensity', 0.0, 0.5, 0.01)
    .onChange(value => material.uniforms.uFlickerIntensity.value = value);

// Appearance folder
const appearanceFolder = gui.addFolder('Appearance');
appearanceFolder.add(params, 'sourceIntensity', 0.1, 2.0, 0.1)
    .onChange(value => material.uniforms.uSourceIntensity.value = value);
appearanceFolder.add(params, 'noiseScale', 0.5, 2.0, 0.1)
    .onChange(value => material.uniforms.uNoiseScale.value = value);
appearanceFolder.add(params, 'alphaFalloff', 0.1, 1.0, 0.05)
    .onChange(value => material.uniforms.uAlphaFalloff.value = value);

// Colors folder
const colorsFolder = gui.addFolder('Colors');
colorsFolder.addColor(params, 'color1')
    .onChange(value => material.uniforms.uColor1.value.set(value));
colorsFolder.addColor(params, 'color2')
    .onChange(value => material.uniforms.uColor2.value.set(value));
colorsFolder.addColor(params, 'color3')
    .onChange(value => material.uniforms.uColor3.value.set(value));

// Open all folders
shapeFolder.open();
movementFolder.open();
appearanceFolder.open();
colorsFolder.open();

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update time uniform
    material.uniforms.uTime.value = performance.now() * 0.001;
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();
