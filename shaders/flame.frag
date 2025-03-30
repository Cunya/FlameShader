uniform float uTime;
uniform sampler2D uMask;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uFlameHeight;
uniform float uFlameSpread;
uniform float uFlameSpeed;
uniform float uTurbulence;
uniform float uFlickerSpeed;
uniform float uFlickerIntensity;
uniform float uSourceIntensity;
uniform float uNoiseScale;
uniform float uAlphaFalloff;
uniform float uDistortionAmount;
uniform float uBaseWidth;
uniform float uTipShape;
uniform float uSwayAmount;
uniform float uSwaySpeed;
uniform float uDetailLevel;
uniform float uBrightness;
uniform float uContrast;
uniform float uColorMix;
uniform float uColorShift;

varying vec2 vUv;

//
// Description : Array and textureless GLSL 2D/3D/4D simplex 
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
// 

vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) { 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    // Permutations
    i = mod289(i); 
    vec4 p = permute(permute(permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
    // Apply sway effect to UV
    vec2 uv = vUv;
    float sway = sin(uTime * uSwaySpeed) * uSwayAmount;
    uv.x += sway * (1.0 - uv.y);

    // Sample the mask texture
    float sourceMask = texture2D(uMask, uv).r;
    
    // Create base noise for movement
    float noise = snoise(vec3(
        uv.x * uNoiseScale * 4.0,
        uv.y * uNoiseScale * 4.0 - uTime * uFlameSpeed,
        uTime * 0.5
    )) * uTurbulence;
    
    // Add detail noise
    float detailNoise = snoise(vec3(
        uv.x * uNoiseScale * 8.0,
        uv.y * uNoiseScale * 8.0 - uTime * uFlameSpeed * 1.5,
        uTime * 0.7
    )) * uTurbulence * 0.5;
    
    // Combine noises with detail level
    float combinedNoise = mix(noise, noise * 0.7 + detailNoise * 0.3, uDetailLevel);
    
    // Calculate vertical falloff
    float heightGradient = 1.0 - pow(uv.y, 1.0 / uFlameHeight);
    
    // Calculate horizontal spread
    float spread = uFlameSpread * (1.0 - uv.y);
    float xOffset = combinedNoise * spread;
    
    // Sample the mask with offset
    vec2 offsetUV = vec2(uv.x + xOffset, uv.y);
    float offsetMask = texture2D(uMask, offsetUV).r;
    
    // Base shape with width control
    float baseShape = smoothstep(0.0, uBaseWidth, 1.0 - abs((uv.x - 0.5) * 2.0));
    baseShape *= pow(1.0 - uv.y, uTipShape);
    
    // Add flicker
    float flicker = snoise(vec3(0.0, uTime * uFlickerSpeed, 0.0)) * uFlickerIntensity;
    
    // Calculate final intensity
    float intensity = offsetMask * heightGradient * (combinedNoise * 0.5 + 0.5);
    intensity *= baseShape;
    intensity *= (1.0 + flicker);
    intensity = clamp(intensity * uBrightness, 0.0, 1.0);
    intensity = pow(intensity, 1.0 / uContrast);
    
    // Color mixing with shift
    float colorPos = uv.y + combinedNoise * 0.2 + uColorShift;
    vec3 color1 = mix(uColor2, uColor1, smoothstep(0.2, 0.8, colorPos));
    vec3 color2 = mix(uColor3, uColor2, smoothstep(0.0, 0.4, colorPos));
    vec3 finalColor = mix(color1, color2, uColorMix);
    
    // Calculate alpha with falloff and source intensity
    float alpha = intensity * uSourceIntensity;
    alpha *= smoothstep(1.0, 0.0, pow(uv.y, uAlphaFalloff));
    
    gl_FragColor = vec4(finalColor * intensity, alpha);
}
