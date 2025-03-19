import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import vertexShader from './shaders/flame.vert?raw';
import fragmentShader from './shaders/flame.frag?raw';

// Global variables
let maskImages = [];
const meshes = [];
let visibilitySettings = {};  
let gui = null;

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

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
const imageNameDisplay = document.createElement('div');
imageNameDisplay.style.position = 'absolute';
imageNameDisplay.style.bottom = '20px';
imageNameDisplay.style.left = '20px';
imageNameDisplay.style.color = 'white';
imageNameDisplay.style.zIndex = '1000';

document.body.appendChild(imageNameDisplay);

// Get mask images
async function getMaskImages() {
    try {
        // Use hardcoded list directly
        const images = [
            './flame_mask.png',
            './flame_mask_2.png',
            './flame_mask_3.png',
            './flame_mask_4.png',
            './flame_mask_5.png',
            './flame_mask_6.png'
        ];
        
        console.log('Using hardcoded image list:', images);
        maskImages = images;
        return images;
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
    defaultUniforms.uResolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    
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
    
    // Load the texture for this mesh
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imagePath, 
        // Success callback
        (texture) => {
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            material.uniforms.uMask.value = texture;
            material.needsUpdate = true;
            
            // Get resolution value safely
            const resolution = material.uniforms.uResolution.value;
            console.log('Texture loaded for mesh', index, {
                visible: mesh.visible,
                renderOrder: mesh.renderOrder,
                textureLoaded: true,
                uniforms: {
                    uMask: material.uniforms.uMask.value !== null,
                    uTime: material.uniforms.uTime.value,
                    uResolution: resolution instanceof THREE.Vector2 ? 
                        [resolution.x, resolution.y] : 
                        [resolution.x, resolution.y]
                }
            });
            
            // Add mesh to scene only after texture is loaded
            scene.add(mesh);
            
            // Initialize settings after texture is loaded
            initializeSettings(mesh);
        },
        undefined,
        (error) => {
            console.error('Error loading texture:', imagePath, error);
            // Remove mesh from meshes array if texture loading fails
            const meshIndex = meshes.indexOf(mesh);
            if (meshIndex !== -1) {
                meshes.splice(meshIndex, 1);
            }
        }
    );

    return mesh;
}

function updateGUI() {
    if (gui) gui.destroy();
    gui = new GUI({ 
        autoPlace: true,
        width: 300,
        title: 'Flame Settings',
        closed: true  // Ensure GUI starts closed
    });

    if (meshes.length === 0) {
        console.warn('No meshes available for GUI');
        return;
    }

    // Add visibility controls for each mesh
    const visibilityFolder = gui.addFolder('Layer Visibility');
    meshes.forEach((mesh, index) => {
        const imageName = mesh.imagePath.split('/').pop();
        visibilityFolder.add(mesh, 'visible')
            .name(imageName)
            .onChange((value) => {
                console.log(`Layer ${imageName} visibility:`, value);
            });
    });
    visibilityFolder.close(); // Close visibility folder

    // Add uniform controls for each mesh
    meshes.forEach((mesh, index) => {
        const imageName = mesh.imagePath.split('/').pop();
        const uniforms = mesh.material.uniforms;
        const meshFolder = gui.addFolder(imageName);

        // Shape controls
        const shapeFolder = meshFolder.addFolder('Shape');
        shapeFolder.add(uniforms.uFlameHeight, 'value', 0.1, 3.0).name('Height')
            .onChange(() => saveSettings(imageName, uniforms));
        shapeFolder.add(uniforms.uFlameSpread, 'value', 0.1, 1.0).name('Spread')
            .onChange(() => saveSettings(imageName, uniforms));
        shapeFolder.add(uniforms.uBaseWidth, 'value', 0.1, 1.0).name('Base Width')
            .onChange(() => saveSettings(imageName, uniforms));
        shapeFolder.add(uniforms.uTipShape, 'value', 0.1, 1.0).name('Tip Shape')
            .onChange(() => saveSettings(imageName, uniforms));
        shapeFolder.close(); // Close shape folder

        // Movement controls
        const moveFolder = meshFolder.addFolder('Movement');
        moveFolder.add(uniforms.uFlameSpeed, 'value', 0.1, 2.0).name('Speed')
            .onChange(() => saveSettings(imageName, uniforms));
        moveFolder.add(uniforms.uSwayAmount, 'value', 0.0, 0.5).name('Sway Amount')
            .onChange(() => saveSettings(imageName, uniforms));
        moveFolder.add(uniforms.uSwaySpeed, 'value', 0.1, 2.0).name('Sway Speed')
            .onChange(() => saveSettings(imageName, uniforms));
        moveFolder.close(); // Close movement folder

        // Appearance controls
        const appearanceFolder = meshFolder.addFolder('Appearance');
        appearanceFolder.add(uniforms.uSourceIntensity, 'value', 0.1, 5.0).name('Source Intensity')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.add(uniforms.uNoiseScale, 'value', 0.1, 5.0).name('Noise Scale')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.add(uniforms.uAlphaFalloff, 'value', 0.1, 2.0).name('Alpha Falloff')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.add(uniforms.uDetailLevel, 'value', 0.0, 1.0).name('Detail Level')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.add(uniforms.uBrightness, 'value', 0.1, 3.0).name('Brightness')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.add(uniforms.uContrast, 'value', 0.1, 3.0).name('Contrast')
            .onChange(() => saveSettings(imageName, uniforms));
        appearanceFolder.close(); // Close appearance folder

        // Color controls
        const colorFolder = meshFolder.addFolder('Colors');
        colorFolder.addColor({ color: uniforms.uColor1.value.getHex() }, 'color')
            .name('Color 1')
            .onChange((value) => {
                uniforms.uColor1.value.setHex(value);
                saveSettings(imageName, uniforms);
            });
        colorFolder.addColor({ color: uniforms.uColor2.value.getHex() }, 'color')
            .name('Color 2')
            .onChange((value) => {
                uniforms.uColor2.value.setHex(value);
                saveSettings(imageName, uniforms);
            });
        colorFolder.addColor({ color: uniforms.uColor3.value.getHex() }, 'color')
            .name('Color 3')
            .onChange((value) => {
                uniforms.uColor3.value.setHex(value);
                saveSettings(imageName, uniforms);
            });
        colorFolder.add(uniforms.uColorMix, 'value', 0.0, 1.0).name('Color Mix')
            .onChange(() => saveSettings(imageName, uniforms));
        colorFolder.add(uniforms.uColorShift, 'value', -0.5, 0.5).name('Color Shift')
            .onChange(() => saveSettings(imageName, uniforms));
        colorFolder.close(); // Close color folder

        meshFolder.close(); // Close mesh folder
    });

    // Ensure GUI stays closed
    gui.close();
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
        console.log('Loading mask images...');
        maskImages = await getMaskImages();
        console.log('Loaded mask images:', maskImages);
    }

    // Create a mesh for each image
    if (Array.isArray(maskImages) && maskImages.length > 0) {
        console.log('Creating meshes for', maskImages.length, 'images');
        
        maskImages.forEach((imagePath, index) => {
            console.log('Creating mesh for image:', imagePath);
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
        console.warn('No mask images available, creating default mesh');
        // Create a default mesh if no images are available
        const mesh = createMeshForImage('./flame_mask.png', 0);
        mesh.visible = true;
        visibilitySettings['flame_mask.png'] = true;
    }

    // Update GUI with new meshes
    console.log('Updating GUI...');
    updateGUI();

    // Ensure GUI stays closed after initialization
    setTimeout(() => {
        if (gui) {
            gui.close();
            // Force close all folders
            gui.controllers.forEach(controller => {
                if (controller.folder) {
                    controller.folder.close();
                }
            });
        }
    }, 100);

    console.log('Initialization complete');
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
            
            // Update resolution as Vector2
            if (mesh.material.uniforms.uResolution) {
                const resolution = mesh.material.uniforms.uResolution.value;
                if (resolution instanceof THREE.Vector2) {
                    resolution.set(window.innerWidth, window.innerHeight);
                } else {
                    resolution.x = window.innerWidth;
                    resolution.y = window.innerHeight;
                }
            }
            
            // Log mesh state periodically
            if (timeInSeconds % 5 < 0.1 && index === 0) {
                const resolution = mesh.material.uniforms.uResolution.value;
                console.log('Mesh states:', {
                    time: timeInSeconds,
                    resolution: resolution instanceof THREE.Vector2 ? 
                        [resolution.x, resolution.y] : 
                        [resolution.x, resolution.y],
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
            const resolution = mesh.material.uniforms.uResolution.value;
            if (resolution instanceof THREE.Vector2) {
                resolution.set(width, height);
            } else {
                resolution.x = width;
                resolution.y = height;
            }
        }
    });
}

// Ensure window resize listener is added
window.removeEventListener('resize', onWindowResize); // Remove old handler if it exists
window.addEventListener('resize', onWindowResize);

// Initialize the scene
init().then(() => {
    // Start the animation loop after initialization
    animate(0);
}).catch(error => {
    console.error('Failed to initialize scene:', error);
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
                const color = new THREE.Color();
                color.setHex(settings[key]);
                uniforms[key].value.copy(color);
            } else if (key === 'uResolution') {
                // Handle resolution value
                const value = uniforms[key].value;
                if (value instanceof THREE.Vector2) {
                    value.set(settings[key][0], settings[key][1]);
                } else {
                    value.x = settings[key][0];
                    value.y = settings[key][1];
                }
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
        } else if (key === 'uResolution') {
            // Handle resolution value
            const value = uniforms[key].value;
            settings[key] = value instanceof THREE.Vector2 ? 
                [value.x, value.y] : 
                [value.x, value.y];
        } else {
            // Handle numeric values
            settings[key] = uniforms[key].value;
        }
    });
    try {
        localStorage.setItem(`flame_settings_${imageName}`, JSON.stringify(settings));
        console.log('Saved settings for', imageName, settings);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

function initializeSettings(mesh) {
    const imageName = mesh.imagePath.split('/').pop();
    try {
        const savedSettings = localStorage.getItem(`flame_settings_${imageName}`);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            applySettings(mesh.material.uniforms, settings);
            console.log('Loaded settings for', imageName, settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}
