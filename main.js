import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import vertexShader from './shaders/flame.vert?raw';
import fragmentShader from './shaders/flame.frag?raw';

// Global variables
let currentImageIndex = 0;
let maskImages = [];
const meshes = [];
const visibilitySettings = {};
let gui = null;

// Create scene
const scene = new THREE.Scene();

// Create orthographic camera
const frustumSize = 2;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    1000
);
camera.position.z = 1;

// Create renderer
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

// Create UI elements
const nextButton = document.createElement('button');
nextButton.textContent = 'Next Image';
nextButton.style.position = 'absolute';
nextButton.style.bottom = '20px';
nextButton.style.left = '20px';
nextButton.style.zIndex = '1000';

const imageNameDisplay = document.createElement('div');
imageNameDisplay.style.position = 'absolute';
imageNameDisplay.style.bottom = '60px';
imageNameDisplay.style.left = '20px';
imageNameDisplay.style.color = 'white';
imageNameDisplay.style.zIndex = '1000';

document.body.appendChild(nextButton);
document.body.appendChild(imageNameDisplay);

// Get mask images
async function getMaskImages() {
    try {
        const response = await fetch('/api/mask-images');
        if (!response.ok) {
            throw new Error('Failed to fetch mask images');
        }
        const images = await response.json();
        console.log('API response:', images);
        
        if (Array.isArray(images) && images.length > 0) {
            maskImages = images;
            console.log('Available mask images:', maskImages);
            return maskImages;
        } else {
            console.warn('No mask images found');
            return [];
        }
    } catch (e) {
        console.error('Error loading mask images:', e);
        return [];
    }
}

function createMeshForImage(imagePath) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const defaultUniforms = createDefaultUniforms();
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: defaultUniforms,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.imagePath = imagePath;
    mesh.visible = true;
    meshes.push(mesh);
    scene.add(mesh);
    
    // Load the texture for this mesh
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imagePath, 
        // Success callback
        (texture) => {
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            mesh.material.uniforms.uMask.value = texture;
            console.log('Texture loaded successfully:', imagePath);
            console.log('Current uniforms:', mesh.material.uniforms);
        },
        // Progress callback
        undefined,
        // Error callback
        (error) => {
            console.error('Error loading texture:', imagePath, error);
        }
    );

    return mesh;
}

function updateGUI() {
    if (gui) gui.destroy();
    gui = new GUI();

    if (meshes.length === 0) return;

    const mesh = meshes[currentImageIndex];
    if (!mesh || !mesh.material || !mesh.material.uniforms) return;

    const uniforms = mesh.material.uniforms;

    // Shape controls
    const shapeFolder = gui.addFolder('Shape Controls');
    shapeFolder.add(uniforms.uFlameHeight, 'value', 0.5, 3.0).name('Flame Height');
    shapeFolder.add(uniforms.uFlameSpread, 'value', 0.0, 1.0).name('Flame Spread');
    shapeFolder.add(uniforms.uDistortionAmount, 'value', 0.0, 1.0).name('Distortion');
    shapeFolder.add(uniforms.uBaseWidth, 'value', 0.1, 1.0).name('Base Width');
    shapeFolder.add(uniforms.uTipShape, 'value', 0.1, 1.0).name('Tip Shape');

    // Movement controls
    const moveFolder = gui.addFolder('Movement Controls');
    moveFolder.add(uniforms.uFlameSpeed, 'value', 0.1, 2.0).name('Flame Speed');
    moveFolder.add(uniforms.uTurbulence, 'value', 0.0, 1.0).name('Turbulence');
    moveFolder.add(uniforms.uFlickerSpeed, 'value', 0.1, 5.0).name('Flicker Speed');
    moveFolder.add(uniforms.uFlickerIntensity, 'value', 0.0, 1.0).name('Flicker Intensity');
    moveFolder.add(uniforms.uSwayAmount, 'value', 0.0, 0.5).name('Sway Amount');
    moveFolder.add(uniforms.uSwaySpeed, 'value', 0.1, 2.0).name('Sway Speed');

    // Appearance controls
    const appearanceFolder = gui.addFolder('Appearance Controls');
    appearanceFolder.add(uniforms.uSourceIntensity, 'value', 0.5, 3.0).name('Source Intensity');
    appearanceFolder.add(uniforms.uNoiseScale, 'value', 0.5, 4.0).name('Noise Scale');
    appearanceFolder.add(uniforms.uAlphaFalloff, 'value', 0.1, 1.0).name('Alpha Falloff');
    appearanceFolder.add(uniforms.uDetailLevel, 'value', 0.1, 2.0).name('Detail Level');
    appearanceFolder.add(uniforms.uBrightness, 'value', 0.5, 2.0).name('Brightness');
    appearanceFolder.add(uniforms.uContrast, 'value', 0.5, 2.0).name('Contrast');

    // Color controls
    const colorFolder = gui.addFolder('Color Controls');
    const color1 = { color: '#FF8019' }; // Bright orange
    const color2 = { color: '#FF4D0D' }; // Mid orange-red
    const color3 = { color: '#CC1A00' }; // Deep red

    colorFolder.addColor(color1, 'color').name('Core Color').onChange(value => {
        uniforms.uColor1.value.setStyle(value);
    });
    colorFolder.addColor(color2, 'color').name('Mid Color').onChange(value => {
        uniforms.uColor2.value.setStyle(value);
    });
    colorFolder.addColor(color3, 'color').name('Base Color').onChange(value => {
        uniforms.uColor3.value.setStyle(value);
    });
    
    colorFolder.add(uniforms.uColorMix, 'value', 0.0, 1.0).name('Color Mix');
    colorFolder.add(uniforms.uColorShift, 'value', 0.0, 1.0).name('Color Shift');

    // Layer visibility
    const visibilityFolder = gui.addFolder('Layer Visibility');
    meshes.forEach((m, index) => {
        const name = `Layer ${index + 1}`;
        visibilitySettings[name] = m.visible;
        visibilityFolder.add(visibilitySettings, name).onChange(value => {
            m.visible = value;
        });
    });
}

// Initialize the scene
async function init() {
    // Clear existing meshes
    meshes.forEach(mesh => scene.remove(mesh));
    meshes.length = 0;

    // Get mask images if not already loaded
    if (maskImages.length === 0) {
        maskImages = await getMaskImages();
    }

    // Create a mesh for each image
    if (Array.isArray(maskImages)) {
        for (const imagePath of maskImages) {
            createMeshForImage(imagePath);
        }
    } else {
        console.error('maskImages is not an array:', maskImages);
    }

    // Update GUI with new meshes
    updateGUI();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() / 1000;
    
    // Update time uniform for all meshes
    meshes.forEach(mesh => {
        if (mesh.material.uniforms.uTime) {
            mesh.material.uniforms.uTime.value = time;
        }
        if (mesh.material.uniforms.uResolution) {
            mesh.material.uniforms.uResolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
        }
    });
    
    renderer.render(scene, camera);
}

// Add resize handler
function handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    const frustumSize = 2;
    
    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    
    // Update resolution uniform for all meshes
    meshes.forEach(mesh => {
        if (mesh.material.uniforms.uResolution) {
            mesh.material.uniforms.uResolution.value = new THREE.Vector2(width, height);
        }
    });
}

window.addEventListener('resize', handleResize);

// Add next image button handler
nextButton.addEventListener('click', () => {
    if (maskImages.length === 0) {
        console.warn('No mask images available');
        return;
    }
    currentImageIndex = (currentImageIndex + 1) % maskImages.length;
    // Save settings for current meshes before proceeding
    meshes.forEach(mesh => {
        const imageName = mesh.imagePath.split('/').pop();
        saveSettings(imageName, mesh.material.uniforms);
    });
});

// Initial setup
getMaskImages().then(() => {
    init();
    animate();
});

function createDefaultUniforms() {
    return {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMask: { value: null },
        
        // Shape controls
        uFlameHeight: { value: 1.5 },
        uFlameSpread: { value: 0.5 },
        uDistortionAmount: { value: 0.3 },
        uBaseWidth: { value: 0.5 },
        uTipShape: { value: 0.3 },
        
        // Movement controls
        uFlameSpeed: { value: 1.0 },
        uTurbulence: { value: 0.5 },
        uFlickerSpeed: { value: 2.0 },
        uFlickerIntensity: { value: 0.2 },
        uSwayAmount: { value: 0.1 },
        uSwaySpeed: { value: 0.5 },
        
        // Appearance controls
        uSourceIntensity: { value: 2.0 },
        uNoiseScale: { value: 2.0 },
        uAlphaFalloff: { value: 0.5 },
        uDetailLevel: { value: 1.0 },
        uBrightness: { value: 1.5 },
        uContrast: { value: 1.2 },
        
        // Color controls
        uColor1: { value: new THREE.Color(1.0, 0.5, 0.1) },  // Bright orange
        uColor2: { value: new THREE.Color(1.0, 0.3, 0.05) }, // Mid orange-red
        uColor3: { value: new THREE.Color(0.8, 0.1, 0.0) },  // Deep red
        uColorMix: { value: 0.5 },
        uColorShift: { value: 0.3 }
    };
}

function applySettings(uniforms, settings) {
    Object.keys(settings).forEach(key => {
        if (uniforms[key]) {
            if (key.startsWith('uColor') && key !== 'uColorMix' && key !== 'uColorShift') {
                // Handle color values
                uniforms[key].value.setHex(settings[key]);
            } else {
                // Handle numeric values
                uniforms[key].value = settings[key];
            }
        }
    });
}

function saveSettings(imageName, uniforms) {
    const settings = {};
    Object.keys(uniforms).forEach(key => {
        if (key.startsWith('uColor') && key !== 'uColorMix' && key !== 'uColorShift') {
            // Handle color values
            settings[key] = uniforms[key].value.getHex();
        } else {
            // Handle numeric values
            settings[key] = uniforms[key].value;
        }
    });
    localStorage.setItem(`flameSettings_${imageName}`, JSON.stringify(settings));
}

// Initialize settings for a new mesh
function initializeSettings(mesh) {
    const imageName = mesh.imagePath.split('/').pop();
    const savedSettings = localStorage.getItem(`flameSettings_${imageName}`);
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        applySettings(mesh.material.uniforms, settings);
    } else {
        applySettings(mesh.material.uniforms, createDefaultUniforms());
    }
}
