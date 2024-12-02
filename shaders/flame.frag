uniform float uTime;
uniform sampler2D uMask;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

// Flame parameters
uniform float uFlameHeight;      // Controls how high the flame goes
uniform float uFlameSpread;      // Controls how much the flame spreads horizontally
uniform float uFlameSpeed;       // Controls the speed of the flame movement
uniform float uTurbulence;       // Controls how turbulent the flame is
uniform float uFlickerSpeed;     // Controls the speed of flame flickering
uniform float uFlickerIntensity; // Controls how much the flame flickers
uniform float uSourceIntensity;  // Controls the intensity at source points
uniform float uNoiseScale;       // Controls the scale of the noise
uniform float uAlphaFalloff;     // Controls how quickly the flame fades out
uniform float uDistortionAmount; // Controls the amount of flame distortion

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
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i); 
    vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

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
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
    // Sample the mask texture as a source of flame
    vec4 sourceMask = texture2D(uMask, vUv);
    
    // Create vertical distortion that increases with height
    float verticalDistortion = snoise(vec3(
        vUv.x * uNoiseScale * 4.0, 
        vUv.y * uNoiseScale * 2.0 + uTime * uFlameSpeed * 0.5, 
        uTime * 0.2
    )) * uDistortionAmount;
    
    // Calculate distance from the bottom of the source
    float sourceGradient = 1.0 - vUv.y;
    
    // Create upward flame movement with adjustable speed and scale
    float baseNoise = snoise(vec3(
        vUv.x * uNoiseScale * 3.0, 
        vUv.y * uNoiseScale * 4.0 - uTime * uFlameSpeed * 1.5, 
        uTime * 0.5
    )) * uTurbulence;
    
    float detailNoise = snoise(vec3(
        vUv.x * uNoiseScale * 6.0, 
        vUv.y * uNoiseScale * 8.0 - uTime * uFlameSpeed * 2.0, 
        uTime * 0.7 + 1000.0
    )) * uTurbulence;
    
    // Combine noises for organic movement
    float combinedNoise = baseNoise * 0.6 + detailNoise * 0.4;
    
    // Create flame spread with adjustable amount
    float spread = uFlameSpread * (1.0 - vUv.y); // Spread increases as we go up
    vec2 spreadUV = vec2(
        vUv.x + verticalDistortion * (1.0 - vUv.y) + combinedNoise * spread,
        vUv.y
    );
    
    // Sample the mask again with spread coordinates for the flame boundary
    float flameSource = texture2D(uMask, spreadUV).r;
    
    // Create vertical gradient with adjustable height
    float gradient = pow(1.0 - vUv.y, 1.0 / uFlameHeight);
    
    // Add edge flickering with adjustable speed and intensity
    float edgeFlicker = snoise(vec3(vUv.x * 10.0, uTime * uFlickerSpeed, 0.0)) * uFlickerIntensity;
    float edgeMask = (1.0 - abs(vUv.x - 0.5) * 2.0) * gradient;
    
    // Calculate flame intensity based on distance from source
    float sourceInfluence = smoothstep(0.0, 0.5, flameSource);
    float heightFalloff = smoothstep(1.0, 0.0, vUv.y / uFlameHeight);
    
    float flameIntensity = sourceInfluence * heightFalloff * (combinedNoise * 0.5 + 0.5);
    flameIntensity *= 1.0 + edgeFlicker * edgeMask;
    
    // Add extra intensity near source points
    flameIntensity = mix(flameIntensity, 1.0, smoothstep(0.0, 0.2, sourceMask.r * uSourceIntensity) * (1.0 - vUv.y));
    
    // Adjust intensity for more natural flame look
    flameIntensity = pow(flameIntensity, 1.2);
    
    // Color mixing based on intensity with more natural transitions
    vec3 color;
    if (flameIntensity > 0.8) {
        color = mix(uColor2, uColor1, pow((flameIntensity - 0.8) / 0.2, 0.5));
    } else if (flameIntensity > 0.4) {
        color = mix(uColor3, uColor2, pow((flameIntensity - 0.4) / 0.4, 0.7));
    } else {
        color = uColor3 * pow(flameIntensity / 0.4, 1.5);
    }
    
    // Add subtle glow
    float glow = smoothstep(0.0, 0.4, flameIntensity);
    color += glow * uColor2 * 0.3;
    
    // Calculate alpha with adjustable falloff
    float alpha = flameIntensity * smoothstep(0.0, uAlphaFalloff, flameIntensity);
    
    gl_FragColor = vec4(color, alpha);
}
