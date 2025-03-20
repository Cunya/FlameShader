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

// Log renderer setup - with safe color access
console.log('Renderer setup:', {
    size: {
        width: renderer.domElement.width,
        height: renderer.domElement.height
    },
    pixelRatio: renderer.getPixelRatio(),
    alpha: renderer.getClearAlpha(),
    clearColor: '0x000000' // Use the known clear color value
});

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

// Log camera setup
console.log('Camera setup:', {
    frustumSize,
    aspect,
    position: camera.position.toArray(),
    near: camera.near,
    far: camera.far,
    left: camera.left,
    right: camera.right,
    top: camera.top,
    bottom: camera.bottom
});

// Create UI elements
const imageNameDisplay = document.createElement('div');
imageNameDisplay.style.position = 'absolute';
imageNameDisplay.style.bottom = '20px';
imageNameDisplay.style.left = '20px';
imageNameDisplay.style.color = 'white';
imageNameDisplay.style.zIndex = '1000';

document.body.appendChild(imageNameDisplay);

// Define available blending modes
const BLEND_MODES = {
    'Additive': THREE.AdditiveBlending,
    'Normal': THREE.NormalBlending,
    'Multiply': THREE.MultiplyBlending,
    'Subtract': THREE.SubtractiveBlending,
    'Screen': THREE.CustomBlending
};

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
    defaultUniforms.uTime.value = 0.0;
    defaultUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    
    console.log(`Creating material for ${imagePath} with uniforms:`, {
        resolution: [defaultUniforms.uResolution.value.x, defaultUniforms.uResolution.value.y],
        colors: {
            color1: '#' + defaultUniforms.uColor1.value.getHexString(),
            color2: '#' + defaultUniforms.uColor2.value.getHexString(),
            color3: '#' + defaultUniforms.uColor3.value.getHexString()
        }
    });
    
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
    mesh.blendMode = 'Additive'; // Store current blend mode name
    
    // Store mesh reference in uniforms immediately
    material.uniforms.mesh = { value: mesh };
    
    meshes.push(mesh);
    
    console.log(`Created mesh for ${imagePath}:`, {
        visible: mesh.visible,
        position: mesh.position.toArray(),
        renderOrder: mesh.renderOrder,
        geometry: {
            vertices: geometry.attributes.position.count,
            type: geometry.type
        },
        material: {
            type: material.type,
            transparent: material.transparent,
            blending: material.blending,
            side: material.side,
            uniformsReady: Object.keys(material.uniforms).every(key => 
                material.uniforms[key] && material.uniforms[key].value !== undefined
            )
        }
    });
    
    // Load the texture for this mesh
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imagePath, 
        // Success callback
        (texture) => {
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            material.uniforms.uMask.value = texture;
            material.needsUpdate = true;
            
            console.log(`Texture loaded for ${imagePath}:`, {
                texture: {
                    size: `${texture.image.width}x${texture.image.height}`,
                    minFilter: texture.minFilter,
                    magFilter: texture.magFilter
                },
                material: {
                    needsUpdate: material.needsUpdate,
                    visible: mesh.visible,
                    uniformsReady: Object.keys(material.uniforms).every(key => 
                        material.uniforms[key] && material.uniforms[key].value !== undefined
                    )
                }
            });
            
            // Add mesh to scene only after texture is loaded
            scene.add(mesh);
            console.log(`Added mesh to scene: ${imagePath}`);
            
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

    // Visibility controls
    const visibilityFolder = gui.addFolder('Visibility');
    meshes.forEach((mesh, index) => {
        const imageName = mesh.imagePath.split('/').pop();
        visibilityFolder.add(mesh, 'visible')
            .name(imageName)
            .onChange((value) => {
                console.log(`Layer ${imageName} visibility changed to:`, value);
                // Save settings when visibility changes
                saveSettings(imageName, mesh.material.uniforms);
            });
            
        // Add blend mode control for each layer
        visibilityFolder.add(mesh, 'blendMode', Object.keys(BLEND_MODES))
            .name(imageName + ' Blend')
            .onChange((value) => {
                mesh.material.blending = BLEND_MODES[value];
                mesh.material.needsUpdate = true;
                console.log(`Layer ${imageName} blend mode changed to:`, value);
                saveSettings(imageName, mesh.material.uniforms);
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

    // Add dump settings button at the bottom
    gui.add({ dumpSettings: () => dumpAllSettings() }, 'dumpSettings').name('Dump Settings');

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

    // Clear all saved settings to start fresh
    console.log('Clearing all saved flame settings...');
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('flameSettings_')) {
            localStorage.removeItem(key);
        }
    });

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
            // Ensure visibility is true by default
            visibilitySettings[imageName] = true;
            mesh.visible = true;
            
            // Save initial settings with visibility true
            const defaultSettings = {
                visible: true,
                // Add other default settings here
                uFlameHeight: 1.5,
                uFlameSpread: 0.5,
                uDistortionAmount: 0.3,
                uBaseWidth: 0.5,
                uTipShape: 0.3,
                uFlameSpeed: 1.0,
                uTurbulence: 0.5,
                uFlickerSpeed: 2.0,
                uFlickerIntensity: 0.2,
                uSwayAmount: 0.1,
                uSwaySpeed: 0.5,
                uSourceIntensity: 2.0,
                uNoiseScale: 2.0,
                uAlphaFalloff: 0.5,
                uDetailLevel: 1.0,
                uBrightness: 1.5,
                uContrast: 1.2
            };
            localStorage.setItem(`flameSettings_${imageName}`, JSON.stringify(defaultSettings));
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
    
    console.log('Window resized:', {
        size: { width, height },
        camera: {
            aspect,
            left: camera.left,
            right: camera.right,
            top: camera.top,
            bottom: camera.bottom
        }
    });
    
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
            console.log(`Updated resolution for ${mesh.imagePath}:`, [resolution.x, resolution.y]);
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
    console.log('Creating default uniforms with mesh reference');
    
    // Create default colors with proper initialization
    const color1 = new THREE.Color();
    const color2 = new THREE.Color();
    const color3 = new THREE.Color();
    
    // Set colors using RGB values to avoid potential hex parsing issues
    color1.setRGB(1.0, 0.5, 0.1);  // Bright orange
    color2.setRGB(1.0, 0.3, 0.05); // Mid orange-red
    color3.setRGB(0.8, 0.1, 0.0);  // Deep red
    
    console.log('Default colors:', {
        color1: '#' + color1.getHexString(),
        color2: '#' + color2.getHexString(),
        color3: '#' + color3.getHexString()
    });
    
    // Create resolution vector
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    
    const uniforms = {
        mesh: { value: null },
        uTime: { value: 0.0 },
        uResolution: { value: resolution },
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
        
        // Color controls - ensure colors are properly initialized
        uColor1: { value: color1 },
        uColor2: { value: color2 },
        uColor3: { value: color3 },
        uColorMix: { value: 0.5 },
        uColorShift: { value: 0.3 }
    };
    
    console.log('Created uniforms with values:', {
        resolution: [uniforms.uResolution.value.x, uniforms.uResolution.value.y],
        colors: {
            color1: '#' + uniforms.uColor1.value.getHexString(),
            color2: '#' + uniforms.uColor2.value.getHexString(),
            color3: '#' + uniforms.uColor3.value.getHexString()
        },
        shape: {
            height: uniforms.uFlameHeight.value,
            spread: uniforms.uFlameSpread.value,
            baseWidth: uniforms.uBaseWidth.value,
            tipShape: uniforms.uTipShape.value
        }
    });
    
    return uniforms;
}

function applySettings(uniforms, settings) {
    Object.keys(settings).forEach(key => {
        if (key === 'visible' || key === 'visibility') {
            // Skip visibility as it's handled separately
            return;
        }
        
        if (uniforms[key]) {
            if (key.startsWith('uColor') && key !== 'uColorMix' && key !== 'uColorShift') {
                try {
                    // Handle color values
                    if (typeof settings[key] === 'string') {
                        // Handle hex string format
                        uniforms[key].value.set(settings[key]);
                    } else if (typeof settings[key] === 'number') {
                        // Handle numeric format
                        uniforms[key].value.setHex(settings[key]);
                    }
                    console.log(`Applied color for ${key}:`, uniforms[key].value);
                } catch (error) {
                    console.error(`Error setting color for ${key}:`, error);
                    // Set a default color if there's an error
                    uniforms[key].value.setRGB(1, 1, 1);
                }
            } else if (key === 'uResolution') {
                // Handle resolution value
                const value = uniforms[key].value;
                if (value instanceof THREE.Vector2) {
                    value.set(settings[key][0], settings[key][1]);
                } else {
                    value.x = settings[key][0];
                    value.y = settings[key][1];
                }
            } else if (typeof settings[key] !== 'undefined') {
                // Handle numeric values and ensure the value exists
                uniforms[key].value = settings[key];
            }
        }
    });
}

function saveSettings(imageName, uniforms) {
    const settings = {};
    console.log('Preparing to save settings for', imageName);
    
    // Get the mesh from uniforms
    const mesh = uniforms.mesh?.value;
    if (mesh) {
        settings.visible = mesh.visible;
        settings.blendMode = mesh.blendMode;
        console.log('Saving visibility state:', settings.visible);
        console.log('Saving blend mode:', settings.blendMode);
    }
    
    Object.keys(uniforms).forEach(key => {
        if (key === 'mesh') {
            // Skip mesh uniform as we already handled visibility
            return;
        }
        if (key.startsWith('uColor') && key !== 'uColorMix' && key !== 'uColorShift') {
            // Handle color values - save as hex string
            settings[key] = '#' + uniforms[key].value.getHexString();
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
        localStorage.setItem(`flameSettings_${imageName}`, JSON.stringify(settings));
        console.log('Successfully saved settings for', imageName, 'with visibility:', settings.visible);
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

function initializeSettings(mesh) {
    const imageName = mesh.imagePath.split('/').pop();
    console.log('Initializing settings for', imageName);
    try {
        // Store mesh reference in uniforms first
        mesh.material.uniforms.mesh = { value: mesh };
        console.log('Stored mesh reference in uniforms');
        
        // Set default visibility to true
        mesh.visible = true;
        
        const savedSettings = localStorage.getItem(`flameSettings_${imageName}`);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            console.log('Found saved settings:', settings);
            
            // Apply visibility state if explicitly set
            if ('visible' in settings) {
                mesh.visible = settings.visible;
                console.log('Applied visibility from settings:', mesh.visible);
            }
            
            // Apply blend mode if saved
            if ('blendMode' in settings && BLEND_MODES[settings.blendMode]) {
                mesh.blendMode = settings.blendMode;
                mesh.material.blending = BLEND_MODES[settings.blendMode];
                mesh.material.needsUpdate = true;
                console.log('Applied blend mode from settings:', settings.blendMode);
            }
            
            // Apply other settings
            applySettings(mesh.material.uniforms, settings);
            console.log('Successfully applied all settings for', imageName, 'final visibility:', mesh.visible);
        } else {
            console.log('No saved settings found for', imageName);
            // Save initial state with visibility true
            saveSettings(imageName, mesh.material.uniforms);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        // Ensure mesh is visible even if there's an error
        mesh.visible = true;
        console.log('Error occurred, defaulting to visible');
    }
}

function dumpAllSettings() {
    const allSettings = {};
    meshes.forEach((mesh, index) => {
        const imageName = mesh.imagePath.split('/').pop();
        const uniforms = mesh.material.uniforms;
        allSettings[imageName] = {
            visibility: mesh.visible,
            shape: {
                flameHeight: uniforms.uFlameHeight.value,
                flameSpread: uniforms.uFlameSpread.value,
                baseWidth: uniforms.uBaseWidth.value,
                tipShape: uniforms.uTipShape.value
            },
            movement: {
                flameSpeed: uniforms.uFlameSpeed.value,
                swayAmount: uniforms.uSwayAmount.value,
                swaySpeed: uniforms.uSwaySpeed.value
            },
            appearance: {
                sourceIntensity: uniforms.uSourceIntensity.value,
                noiseScale: uniforms.uNoiseScale.value,
                alphaFalloff: uniforms.uAlphaFalloff.value,
                detailLevel: uniforms.uDetailLevel.value,
                brightness: uniforms.uBrightness.value,
                contrast: uniforms.uContrast.value
            },
            colors: {
                color1: '#' + uniforms.uColor1.value.getHexString(),
                color2: '#' + uniforms.uColor2.value.getHexString(),
                color3: '#' + uniforms.uColor3.value.getHexString(),
                colorMix: uniforms.uColorMix.value,
                colorShift: uniforms.uColorShift.value
            }
        };
    });
    
    // Create and download settings file
    const blob = new Blob([JSON.stringify(allSettings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flame_settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Also log to console for easy copying
    console.log('Current Settings:', JSON.stringify(allSettings, null, 2));
}
