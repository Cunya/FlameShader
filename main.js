import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import vertexShader from './shaders/flame.vert?raw';
import fragmentShader from './shaders/flame.frag?raw';

// Global variables
let currentImageIndex = 0;
let maskImages = [];
const meshes = [];
let visibilitySettings = {};  
let gui = null;

// Create scene
const scene = new THREE.Scene();
scene.background = null;

// Create renderer
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    premultipliedAlpha: false
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

// Create orthographic camera
const frustumSize = 2;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    -1000,
    1000
);
camera.position.z = 1;

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

function createMeshForImage(imagePath, index) {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const defaultUniforms = createDefaultUniforms();
    
    // Ensure initial uniform values are set
    defaultUniforms.uTime.value = 0;
    defaultUniforms.uResolution.value.x = window.innerWidth;
    defaultUniforms.uResolution.value.y = window.innerHeight;
    
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: defaultUniforms,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.imagePath = imagePath;
    mesh.visible = true;
    mesh.position.set(0, 0, 0); // Ensure centered position
    mesh.renderOrder = index;
    meshes.push(mesh);
    scene.add(mesh);
    
    // Load the texture for this mesh
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imagePath, 
        // Success callback
        (texture) => {
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            material.uniforms.uMask.value = texture;
            material.needsUpdate = true;
            
            console.log('Texture loaded for mesh', index, {
                visible: mesh.visible,
                renderOrder: mesh.renderOrder,
                textureLoaded: true,
                uniforms: {
                    uMask: material.uniforms.uMask.value !== null,
                    uTime: material.uniforms.uTime.value,
                    uResolution: material.uniforms.uResolution.value.toArray()
                }
            });
            
            // Initialize settings after texture is loaded
            initializeSettings(mesh);
        },
        undefined,
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

    // Layer visibility
    const visibilityFolder = gui.addFolder('Layer Visibility');
    meshes.forEach((mesh, index) => {
        const imageName = mesh.imagePath.split('/').pop();
        if (visibilitySettings[imageName] === undefined) {
            visibilitySettings[imageName] = true;
        }
        mesh.visible = visibilitySettings[imageName];
        
        visibilityFolder.add(visibilitySettings, imageName)
            .name(`Layer ${index + 1} (${imageName})`)
            .onChange(value => {
                mesh.visible = value;
                console.log(`Layer ${imageName} visibility:`, value);
            });
    });
    visibilityFolder.open();

    // Add uniform controls for each mesh
    meshes.forEach((mesh, index) => {
        const imageName = mesh.imagePath.split('/').pop();
        const meshFolder = gui.addFolder(`Settings - Layer ${index + 1} (${imageName})`);
        
        if (!mesh.material || !mesh.material.uniforms) return;
        const uniforms = mesh.material.uniforms;
        
        // Shape controls
        const shapeFolder = meshFolder.addFolder('Shape');
        shapeFolder.add(uniforms.uFlameHeight, 'value', 0.5, 3.0).name('Height')
            .onChange(() => saveSettings(imageName, uniforms));
        shapeFolder.add(uniforms.uFlameSpread, 'value', 0.0, 1.0).name('Spread')
            .onChange(() => saveSettings(imageName, uniforms));
        shapeFolder.add(uniforms.uDistortionAmount, 'value', 0.0, 1.0).name('Distortion')
            .onChange(() => saveSettings(imageName, uniforms));
        shapeFolder.add(uniforms.uBaseWidth, 'value', 0.1, 1.0).name('Base Width')
            .onChange(() => saveSettings(imageName, uniforms));
        shapeFolder.add(uniforms.uTipShape, 'value', 0.1, 1.0).name('Tip Shape')
            .onChange(() => saveSettings(imageName, uniforms));

        // Movement controls
        const moveFolder = meshFolder.addFolder('Movement');
        moveFolder.add(uniforms.uFlameSpeed, 'value', 0.1, 2.0).name('Flame Speed')
            .onChange(() => saveSettings(imageName, uniforms));
        moveFolder.add(uniforms.uTurbulence, 'value', 0.0, 1.0).name('Turbulence')
            .onChange(() => saveSettings(imageName, uniforms));
        moveFolder.add(uniforms.uFlickerSpeed, 'value', 0.1, 5.0).name('Flicker Speed')
            .onChange(() => saveSettings(imageName, uniforms));
        moveFolder.add(uniforms.uFlickerIntensity, 'value', 0.0, 1.0).name('Flicker Intensity')
            .onChange(() => saveSettings(imageName, uniforms));
        moveFolder.add(uniforms.uSwayAmount, 'value', 0.0, 0.5).name('Sway Amount')
            .onChange(() => saveSettings(imageName, uniforms));
        moveFolder.add(uniforms.uSwaySpeed, 'value', 0.1, 2.0).name('Sway Speed')
            .onChange(() => saveSettings(imageName, uniforms));

        // Appearance controls
        const appearanceFolder = meshFolder.addFolder('Appearance');
        appearanceFolder.add(uniforms.uSourceIntensity, 'value', 0.5, 3.0).name('Source Intensity')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.add(uniforms.uNoiseScale, 'value', 0.5, 4.0).name('Noise Scale')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.add(uniforms.uAlphaFalloff, 'value', 0.1, 1.0).name('Alpha Falloff')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.add(uniforms.uDetailLevel, 'value', 0.1, 2.0).name('Detail Level')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.add(uniforms.uBrightness, 'value', 0.5, 2.0).name('Brightness')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.add(uniforms.uContrast, 'value', 0.5, 2.0).name('Contrast')
            .onChange(() => saveSettings(imageName, uniforms));

        // Color controls
        const colorFolder = meshFolder.addFolder('Color');
        const color1 = { color: '#FF8019' }; // Bright orange
        const color2 = { color: '#FF4D0D' }; // Mid orange-red
        const color3 = { color: '#CC1A00' }; // Deep red

        colorFolder.addColor(color1, 'color').name('Core Color').onChange(value => {
            uniforms.uColor1.value.setStyle(value);
            saveSettings(imageName, uniforms);
        });
        colorFolder.addColor(color2, 'color').name('Mid Color').onChange(value => {
            uniforms.uColor2.value.setStyle(value);
            saveSettings(imageName, uniforms);
        });
        colorFolder.addColor(color3, 'color').name('Base Color').onChange(value => {
            uniforms.uColor3.value.setStyle(value);
            saveSettings(imageName, uniforms);
        });
        
        colorFolder.add(uniforms.uColorMix, 'value', 0.0, 1.0).name('Color Mix')
            .onChange(() => saveSettings(imageName, uniforms));
        colorFolder.add(uniforms.uColorShift, 'value', 0.0, 1.0).name('Color Shift')
            .onChange(() => saveSettings(imageName, uniforms));
    });
}

// Initialize the scene
async function init() {
    console.log('Initializing scene...');
    
    // Clear existing meshes
    meshes.forEach(mesh => scene.remove(mesh));
    meshes.length = 0;
    
    // Reset visibility settings
    visibilitySettings = {};

    // Get mask images if not already loaded
    if (maskImages.length === 0) {
        maskImages = await getMaskImages();
    }

    // Create a mesh for each image
    if (Array.isArray(maskImages)) {
        console.log('Creating meshes for', maskImages.length, 'images');
        
        maskImages.forEach((imagePath, index) => {
            const mesh = createMeshForImage(imagePath, index);
            const imageName = imagePath.split('/').pop();
            visibilitySettings[imageName] = true;
            mesh.visible = true;
        });
        
        console.log('Created meshes:', meshes.map(m => ({
            path: m.imagePath,
            visible: m.visible,
            renderOrder: m.renderOrder
        })));
    } else {
        console.error('maskImages is not an array:', maskImages);
    }

    // Update GUI with new meshes
    updateGUI();
}

// Animation loop
function animate(time) {
    requestAnimationFrame(animate);
    
    const timeInSeconds = time * 0.001;
    
    // Update all meshes
    meshes.forEach((mesh, index) => {
        if (mesh && mesh.material && mesh.material.uniforms) {
            // Update time uniform
            mesh.material.uniforms.uTime.value = timeInSeconds;
            
            // Update resolution directly
            mesh.material.uniforms.uResolution.value.x = window.innerWidth;
            mesh.material.uniforms.uResolution.value.y = window.innerHeight;
            
            // Log mesh state periodically
            if (timeInSeconds % 5 < 0.1 && index === 0) {
                console.log('Mesh states:', {
                    time: timeInSeconds,
                    resolution: [
                        mesh.material.uniforms.uResolution.value.x,
                        mesh.material.uniforms.uResolution.value.y
                    ],
                    visible: mesh.visible,
                    renderOrder: mesh.renderOrder,
                    hasTexture: mesh.material.uniforms.uMask.value !== null,
                    position: mesh.position.toArray()
                });
            }
        }
    });
    
    renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 2;
    
    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update resolution for all meshes
    meshes.forEach(mesh => {
        if (mesh && mesh.material && mesh.material.uniforms) {
            mesh.material.uniforms.uResolution.value.x = window.innerWidth;
            mesh.material.uniforms.uResolution.value.y = window.innerHeight;
        }
    });
}

// Ensure window resize listener is added
window.removeEventListener('resize', handleResize); // Remove old handler if it exists
window.addEventListener('resize', onWindowResize);

// Start the animation loop
animate(0);

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
});

function createDefaultUniforms() {
    return {
        uTime: { value: 0 },
        uResolution: { value: { x: window.innerWidth, y: window.innerHeight } },
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
                const color = new THREE.Color();
                color.setHex(settings[key]);
                uniforms[key].value.copy(color);
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
            settings[key] = uniforms[key].value.getHexString();
        } else {
            // Handle numeric values
            settings[key] = uniforms[key].value;
        }
    });
    try {
        localStorage.setItem(`flameSettings_${imageName}`, JSON.stringify(settings));
        console.log('Saved settings for', imageName, settings);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

function initializeSettings(mesh) {
    const imageName = mesh.imagePath.split('/').pop();
    try {
        const savedSettings = localStorage.getItem(`flameSettings_${imageName}`);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            applySettings(mesh.material.uniforms, settings);
            console.log('Loaded settings for', imageName, settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}
