# Changelog

## [Partially Fixed] - 2024-03-XX - Flame Shader First Layer Fix

### Bug Description
The flame shader was not rendering properly - none of the flame layers were showing up.

### Root Cause
The issue was in the localStorage key naming for flame settings. The code was trying to load settings using `flame_settings_` prefix but saving them with `flameSettings_` prefix, causing the saved settings to not be found and applied correctly.

When settings can't be loaded:
1. The first layer works because it uses default values when no settings are found
2. Subsequent layers fail because they depend on previously saved visibility states and layer-specific settings
3. The mismatch in localStorage keys means each layer after the first can't find its saved visibility state, defaulting to hidden

### Fix Details
Reverted the localStorage key naming in the settings functions:
```javascript
// Before (broken)
localStorage.setItem(`flame_settings_${imageName}`, JSON.stringify(settings));
const savedSettings = localStorage.getItem(`flame_settings_${imageName}`);

// After (fixed)
localStorage.setItem(`flameSettings_${imageName}`, JSON.stringify(settings));
const savedSettings = localStorage.getItem(`flameSettings_${imageName}`);
```

### Impact
- First flame shader layer now renders correctly
- Previously saved settings for the first layer are properly loaded and applied
- Additional layers still not rendering - requires further investigation
- The fix only restored access to the first layer's settings; subsequent layers may need additional fixes to their visibility state handling

### Testing
Verified that:
- First flame layer appears and animates correctly
- Previously saved settings for first layer are loaded correctly
- New settings for first layer are saved and persist between page reloads
- Note: Additional layers still need to be fixed, likely requiring proper initialization of their visibility states

### Additional Notes
The fix only restored access to the first layer's settings; subsequent layers may need additional fixes to their visibility state handling. 

## [Fixed] Flame Shader Rendering Issues - Layers 2-5
- **Bug Description**: Layers 2-5 were not showing up in the scene even after fixing the localStorage key naming.
- **Root Cause**: The mesh visibility state was not being properly tracked and applied due to missing mesh reference in uniforms.
- **Fix Details**: 
  - Added mesh reference to uniforms: `mesh: { value: null }` in `createDefaultUniforms`
  - Store mesh reference when creating mesh: `material.uniforms.mesh = { value: mesh }`
  - Enhanced `applySettings` to handle visibility state first, before other settings
  - Improved synchronization between mesh.visible property and visibilitySettings
- **Impact**: Layers 2-5 of the flame shader now render correctly.
- **Testing**: Verified that layers 2-5 appear and animate correctly, with proper visibility state persistence.

Note: Layer 6 still requires investigation and fixing. 

