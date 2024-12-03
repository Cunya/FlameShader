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
    // Flame Shape
    uFlameHeight: 1.5,
    uFlameSpread: 0.2,
    uDistortionAmount: 0.2,
    uBaseWidth: 0.5,
    uTipShape: 0.3,
    
    // Movement
    uFlameSpeed: 1.0,
    uTurbulence: 0.5,
    uFlickerSpeed: 2.0,
    uFlickerIntensity: 0.2,
    uSwayAmount: 0.1,
    uSwaySpeed: 0.5,
    
    // Appearance
    uSourceIntensity: 1.0,
    uNoiseScale: 1.0,
    uAlphaFalloff: 0.3,
    uDetailLevel: 1.0,
    uBrightness: 1.0,
    uContrast: 1.0,
    
    // Colors
    uColor1: 0xffeb3b,  // Core color (yellow)
    uColor2: 0xff9800,  // Mid color (orange)
    uColor3: 0xff5722,  // Base color (red)
    uColorMix: 0.5,     // Blend between colors
    uColorShift: 0.0    // Shift color gradient
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

// Initialize material with all uniforms
const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
        uTime: { value: 0 },
        uMask: { value: null },
        // Flame Shape
        uFlameHeight: { value: defaultSettings.uFlameHeight },
        uFlameSpread: { value: defaultSettings.uFlameSpread },
        uDistortionAmount: { value: defaultSettings.uDistortionAmount },
        uBaseWidth: { value: defaultSettings.uBaseWidth },
        uTipShape: { value: defaultSettings.uTipShape },
        // Movement
        uFlameSpeed: { value: defaultSettings.uFlameSpeed },
        uTurbulence: { value: defaultSettings.uTurbulence },
        uFlickerSpeed: { value: defaultSettings.uFlickerSpeed },
        uFlickerIntensity: { value: defaultSettings.uFlickerIntensity },
        uSwayAmount: { value: defaultSettings.uSwayAmount },
        uSwaySpeed: { value: defaultSettings.uSwaySpeed },
        // Appearance
        uSourceIntensity: { value: defaultSettings.uSourceIntensity },
        uNoiseScale: { value: defaultSettings.uNoiseScale },
        uAlphaFalloff: { value: defaultSettings.uAlphaFalloff },
        uDetailLevel: { value: defaultSettings.uDetailLevel },
        uBrightness: { value: defaultSettings.uBrightness },
        uContrast: { value: defaultSettings.uContrast },
        // Colors
        uColor1: { value: new THREE.Color(defaultSettings.uColor1) },
        uColor2: { value: new THREE.Color(defaultSettings.uColor2) },
        uColor3: { value: new THREE.Color(defaultSettings.uColor3) },
        uColorMix: { value: defaultSettings.uColorMix },
        uColorShift: { value: defaultSettings.uColorShift }
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
        guiFolders.flame.add(material.uniforms.uFlameHeight, 'value', 0.1, 5.0)
            .name('Height')
            .onChange(saveSettings),
        guiFolders.flame.add(material.uniforms.uFlameSpread, 'value', 0.0, 2.0)
            .name('Spread')
            .onChange(saveSettings),
        guiFolders.flame.add(material.uniforms.uDistortionAmount, 'value', 0.0, 2.0)
            .name('Distortion')
            .onChange(saveSettings),
        guiFolders.flame.add(material.uniforms.uBaseWidth, 'value', 0.1, 2.0)
            .name('Base Width')
            .onChange(saveSettings),
        guiFolders.flame.add(material.uniforms.uTipShape, 'value', 0.0, 1.0)
            .name('Tip Shape')
            .onChange(saveSettings)
    );

    // Add controllers to Movement folder
    guiControllers.push(
        guiFolders.movement.add(material.uniforms.uFlameSpeed, 'value', 0.1, 5.0)
            .name('Speed')
            .onChange(saveSettings),
        guiFolders.movement.add(material.uniforms.uTurbulence, 'value', 0.0, 3.0)
            .name('Turbulence')
            .onChange(saveSettings),
        guiFolders.movement.add(material.uniforms.uFlickerSpeed, 'value', 0.1, 10.0)
            .name('Flicker Speed')
            .onChange(saveSettings),
        guiFolders.movement.add(material.uniforms.uFlickerIntensity, 'value', 0.0, 2.0)
            .name('Flicker Intensity')
            .onChange(saveSettings),
        guiFolders.movement.add(material.uniforms.uSwayAmount, 'value', 0.0, 1.0)
            .name('Sway Amount')
            .onChange(saveSettings),
        guiFolders.movement.add(material.uniforms.uSwaySpeed, 'value', 0.0, 2.0)
            .name('Sway Speed')
            .onChange(saveSettings)
    );

    // Add controllers to Appearance folder
    guiControllers.push(
        guiFolders.appearance.add(material.uniforms.uSourceIntensity, 'value', 0.1, 5.0)
            .name('Source Intensity')
            .onChange(saveSettings),
        guiFolders.appearance.add(material.uniforms.uNoiseScale, 'value', 0.1, 5.0)
            .name('Noise Scale')
            .onChange(saveSettings),
        guiFolders.appearance.add(material.uniforms.uAlphaFalloff, 'value', 0.0, 2.0)
            .name('Alpha Falloff')
            .onChange(saveSettings),
        guiFolders.appearance.add(material.uniforms.uDetailLevel, 'value', 0.1, 3.0)
            .name('Detail Level')
            .onChange(saveSettings),
        guiFolders.appearance.add(material.uniforms.uBrightness, 'value', 0.0, 2.0)
            .name('Brightness')
            .onChange(saveSettings),
        guiFolders.appearance.add(material.uniforms.uContrast, 'value', 0.5, 2.0)
            .name('Contrast')
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
            .onChange(saveSettings),
        guiFolders.colors.add(material.uniforms.uColorMix, 'value', 0.0, 1.0)
            .name('Color Mix')
            .onChange(saveSettings),
        guiFolders.colors.add(material.uniforms.uColorShift, 'value', -1.0, 1.0)
            .name('Color Shift')
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
                if (key.startsWith('uColor') && key !== 'uColorMix' && key !== 'uColorShift') {
                    // Handle color values
                    material.uniforms[key].value.setHex(value);
                } else {
                    // Handle numeric values
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
            if (key.startsWith('uColor') && key !== 'uColorMix' && key !== 'uColorShift') {
                // Handle color values
                currentSettings[key] = material.uniforms[key].value.getHex();
            } else {
                // Handle numeric values
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
