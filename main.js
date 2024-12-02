import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import vertexShader from './shaders/flame.vert?raw';
import fragmentShader from './shaders/flame.frag?raw';

// Settings management
const SETTINGS_KEY = 'flameSettings';
let currentImageIndex = 0;
let maskImages = [];

// Default settings for new images
const defaultSettings = {
    uFlameHeight: 1.5,
    uFlameSpread: 0.2,
    uFlameSpeed: 1.0,
    uTurbulence: 0.5,
    uFlickerSpeed: 2.0,
    uFlickerIntensity: 0.2,
    uSourceIntensity: 1.0,
    uNoiseScale: 1.0,
    uAlphaFalloff: 0.3,
    uDistortionAmount: 0.2,
    uColor1: 0xffeb3b,
    uColor2: 0xff9800,
    uColor3: 0xff5722
};

// Function to get all mask images
async function getMaskImages() {
    try {
        const response = await fetch('/api/mask-images', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new TypeError("Expected JSON response but got " + contentType);
        }
        
        const data = await response.json();
        console.log('API response:', data); // Debug log
        
        if (Array.isArray(data) && data.length > 0) {
            maskImages = data;
            console.log('Available mask images:', maskImages);
        } else {
            console.warn('No mask images found, using default');
            maskImages = ['/flame_mask.png'];
        }
        
        // Load the first image
        loadMaskTexture(currentImageIndex);
    } catch (e) {
        console.error('Error loading mask images:', e);
        // Fallback to default mask
        maskImages = ['/flame_mask.png'];
        loadMaskTexture(0);
    }
}

let settingsStore = {};

// Load saved settings
try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
        settingsStore = JSON.parse(savedSettings);
    }
} catch (e) {
    console.warn('Failed to load saved settings:', e);
}

// Scene setup
const scene = new THREE.Scene();

// Create camera with aspect ratio-aware frustum
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 2;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0,
    1
);

// Create a plane geometry that matches the camera frustum
const geometry = new THREE.PlaneGeometry(frustumSize * aspect, frustumSize);

// Load the mask texture
const textureLoader = new THREE.TextureLoader();
let maskTexture = null;

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
    uniforms: {
        uTime: { value: 0 },
        uMask: { value: null },
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
    },
    transparent: true
});

// Create mesh
const flame = new THREE.Mesh(geometry, material);
scene.add(flame);

// Create renderer and set size
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create next image button
const nextButton = document.createElement('button');
nextButton.textContent = 'Next Image';
nextButton.style.position = 'absolute';
nextButton.style.bottom = '20px';
nextButton.style.right = '20px';
nextButton.style.padding = '10px 20px';
nextButton.style.fontSize = '16px';
nextButton.style.backgroundColor = '#4CAF50';
nextButton.style.color = 'white';
nextButton.style.border = 'none';
nextButton.style.borderRadius = '5px';
nextButton.style.cursor = 'pointer';
nextButton.style.zIndex = '1000';

// Add image name display
const imageNameDisplay = document.createElement('div');
imageNameDisplay.style.position = 'absolute';
imageNameDisplay.style.bottom = '60px';
imageNameDisplay.style.right = '20px';
imageNameDisplay.style.color = 'white';
imageNameDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
imageNameDisplay.style.padding = '5px 10px';
imageNameDisplay.style.borderRadius = '3px';
imageNameDisplay.style.zIndex = '1000';

document.body.appendChild(nextButton);
document.body.appendChild(imageNameDisplay);

// Setup GUI
let gui = new GUI();
let guiControllers = [];
let guiFolders = {};

function updateGUI() {
    // Destroy and recreate the entire GUI
    if (gui) gui.destroy();
    gui = new GUI();
    guiControllers = [];
    guiFolders = {};

    // Create new folders
    guiFolders.flame = gui.addFolder('Flame Shape');
    guiFolders.movement = gui.addFolder('Movement');
    guiFolders.appearance = gui.addFolder('Appearance');
    guiFolders.colors = gui.addFolder('Colors');

    // Add controllers to Flame Shape folder
    guiControllers.push(
        guiFolders.flame.add(material.uniforms.uFlameHeight, 'value', 0.5, 3.0)
            .name('Height')
            .onChange(saveSettings),
        guiFolders.flame.add(material.uniforms.uFlameSpread, 'value', 0.0, 1.0)
            .name('Spread')
            .onChange(saveSettings),
        guiFolders.flame.add(material.uniforms.uDistortionAmount, 'value', 0.0, 1.0)
            .name('Distortion')
            .onChange(saveSettings)
    );

    // Add controllers to Movement folder
    guiControllers.push(
        guiFolders.movement.add(material.uniforms.uFlameSpeed, 'value', 0.1, 3.0)
            .name('Speed')
            .onChange(saveSettings),
        guiFolders.movement.add(material.uniforms.uTurbulence, 'value', 0.0, 2.0)
            .name('Turbulence')
            .onChange(saveSettings),
        guiFolders.movement.add(material.uniforms.uFlickerSpeed, 'value', 0.1, 5.0)
            .name('Flicker Speed')
            .onChange(saveSettings),
        guiFolders.movement.add(material.uniforms.uFlickerIntensity, 'value', 0.0, 1.0)
            .name('Flicker Intensity')
            .onChange(saveSettings)
    );

    // Add controllers to Appearance folder
    guiControllers.push(
        guiFolders.appearance.add(material.uniforms.uSourceIntensity, 'value', 0.1, 3.0)
            .name('Source Intensity')
            .onChange(saveSettings),
        guiFolders.appearance.add(material.uniforms.uNoiseScale, 'value', 0.1, 3.0)
            .name('Noise Scale')
            .onChange(saveSettings),
        guiFolders.appearance.add(material.uniforms.uAlphaFalloff, 'value', 0.0, 1.0)
            .name('Alpha Falloff')
            .onChange(saveSettings)
    );

    // Add controllers to Colors folder
    guiControllers.push(
        guiFolders.colors.addColor(material.uniforms.uColor1, 'value')
            .name('Core Color')
            .onChange(saveSettings),
        guiFolders.colors.addColor(material.uniforms.uColor2, 'value')
            .name('Mid Color')
            .onChange(saveSettings),
        guiFolders.colors.addColor(material.uniforms.uColor3, 'value')
            .name('Base Color')
            .onChange(saveSettings)
    );

    // Open all folders
    Object.values(guiFolders).forEach(folder => folder.open());
}

// Function to load mask texture
function loadMaskTexture(index) {
    if (maskImages.length === 0) return;
    
    const imagePath = maskImages[index];
    textureLoader.load(imagePath, (texture) => {
        maskTexture = texture;
        material.uniforms.uMask.value = texture;
        
        // Update image name display
        imageNameDisplay.textContent = imagePath.split('/').pop();
        
        // Load saved settings for this image or use defaults
        const imageSettings = settingsStore[imagePath] || { ...defaultSettings };
        
        // Update material uniforms with settings
        Object.entries(imageSettings).forEach(([key, value]) => {
            if (material.uniforms[key]) {
                if (key.startsWith('uColor')) {
                    material.uniforms[key].value.setHex(value);
                } else {
                    material.uniforms[key].value = value;
                }
            }
        });
        
        // Update GUI with new settings
        updateGUI();
    });
}

// Function to save current settings
function saveSettings() {
    const currentImage = maskImages[currentImageIndex];
    const currentSettings = {};
    
    // Save only the properties we care about
    Object.keys(defaultSettings).forEach(key => {
        if (material.uniforms[key]) {
            if (key.startsWith('uColor')) {
                currentSettings[key] = material.uniforms[key].value.getHex();
            } else {
                currentSettings[key] = material.uniforms[key].value;
            }
        }
    });
    
    settingsStore[currentImage] = currentSettings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsStore));
}

// Add resize handler
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 2;
    
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    
    // Update plane geometry to match new aspect ratio
    flame.geometry.dispose();
    flame.geometry = new THREE.PlaneGeometry(frustumSize * aspect, frustumSize);
    
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Add some basic CSS to remove margins and padding
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';

// Handle next image button click
nextButton.addEventListener('click', () => {
    if (maskImages.length <= 1) {
        console.log('Only one mask image available');
        return;
    }
    currentImageIndex = (currentImageIndex + 1) % maskImages.length;
    loadMaskTexture(currentImageIndex);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    material.uniforms.uTime.value = performance.now() / 1000;
    renderer.render(scene, camera);
}

// Initial setup
getMaskImages().then(() => {
    updateGUI();
    animate();
});
