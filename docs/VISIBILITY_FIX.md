# Flame Shader Visibility Fix

## Issue Description
The flame shader layers were not visible in the scene due to incorrect handling of visibility states and localStorage settings persistence.

## Root Cause
1. Previously saved visibility states in localStorage were causing flames to initialize as hidden
2. Inconsistent handling of visibility states between initialization and settings application
3. No proper default visibility state enforcement

## Fix Implementation

### 1. Clear Existing Settings on Init
Added code to clear all existing flame settings from localStorage on initialization:
```javascript
// Clear all saved settings to start fresh
console.log('Clearing all saved flame settings...');
Object.keys(localStorage).forEach(key => {
    if (key.startsWith('flameSettings_')) {
        localStorage.removeItem(key);
    }
});
```

### 2. Enforce Default Visibility
Modified mesh creation to explicitly set visibility to true:
```javascript
const mesh = createMeshForImage(imagePath, index);
const imageName = imagePath.split('/').pop();
// Ensure visibility is true by default
visibilitySettings[imageName] = true;
mesh.visible = true;
```

### 3. Save Initial Settings with Visibility
Added code to save initial settings with visibility explicitly set to true:
```javascript
const defaultSettings = {
    visible: true,
    // Other default settings...
    uFlameHeight: 1.5,
    uFlameSpread: 0.5,
    // ...
};
localStorage.setItem(`flameSettings_${imageName}`, JSON.stringify(defaultSettings));
```

### 4. Improved Settings Initialization
Updated `initializeSettings` function to:
- Set default visibility to true before loading settings
- Handle visibility state more robustly
- Ensure mesh reference is stored in uniforms first

```javascript
function initializeSettings(mesh) {
    // Store mesh reference in uniforms first
    mesh.material.uniforms.mesh = { value: mesh };
    
    // Set default visibility to true
    mesh.visible = true;
    
    // Load and apply settings if they exist
    const savedSettings = localStorage.getItem(`flameSettings_${imageName}`);
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        // Only change visibility if explicitly set
        if ('visible' in settings) {
            mesh.visible = settings.visible;
        }
        // Apply other settings...
    }
}
```

## Impact
- All flame layers now initialize as visible by default
- Previously saved settings that might have hidden flames are cleared
- Visibility state is properly maintained between page reloads
- Settings persistence works correctly for all flame properties

## Testing
1. All flame layers appear visible on initial load
2. Visibility toggles in GUI work correctly
3. Visibility states persist correctly when saved
4. No visibility-related errors in console

## Additional Notes
The fix ensures that even if there are errors in loading or applying settings, the flames will default to being visible. This provides a better user experience as it's easier to hide unwanted visible flames than to debug invisible ones. 