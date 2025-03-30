precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uMask;

// Shape controls
uniform float uFlameHeight;
uniform float uFlameSpread;
uniform float uDistortionAmount;
uniform float uBaseWidth;
uniform float uTipShape;

// Movement controls
uniform float uFlameSpeed;
uniform float uTurbulence;
uniform float uFlickerSpeed;
uniform float uFlickerIntensity;
uniform float uSwayAmount;
uniform float uSwaySpeed;

// Appearance controls
uniform float uSourceIntensity;
uniform float uNoiseScale;
uniform float uAlphaFalloff;
uniform float uDetailLevel;
uniform float uBrightness;
uniform float uContrast;

// Color controls
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uColorMix;
uniform float uColorShift;

// Noise functions
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec2 rotate2D(vec2 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(st * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    
    // Base flame shape
    float baseShape = 1.0 - pow(abs(uv.x) / uBaseWidth, uTipShape);
    baseShape *= 1.0 - (uv.y + 1.0) / uFlameHeight;
    
    // Add movement and distortion
    float time = uTime * uFlameSpeed;
    vec2 distortedUV = uv;
    distortedUV.x += sin(uv.y * 4.0 + time) * uSwayAmount;
    
    // Noise-based distortion
    vec2 noiseCoord = distortedUV * uNoiseScale;
    noiseCoord.y -= time * 0.5;
    float noise = fbm(noiseCoord);
    
    // Flicker effect
    float flicker = sin(time * uFlickerSpeed) * uFlickerIntensity;
    
    // Combine all effects
    float flame = baseShape;
    flame *= noise + flicker;
    flame *= uSourceIntensity;
    
    // Apply mask if available
    if (uMask != null) {
        vec2 maskUV = (uv + 1.0) * 0.5;
        float mask = texture2D(uMask, maskUV).r;
        flame *= mask;
    }
    
    // Color mixing
    vec3 color = mix(uColor1, uColor2, flame * uColorMix);
    color = mix(color, uColor3, pow(1.0 - flame, 2.0) * uColorShift);
    
    // Apply brightness and contrast
    color = (color - 0.5) * uContrast + 0.5;
    color *= uBrightness;
    
    // Alpha falloff
    float alpha = smoothstep(0.0, uAlphaFalloff, flame);
    
    gl_FragColor = vec4(color, alpha);
}
