import React, { useMemo, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import {
  Canvas,
  Rect,
  Shader,
  Skia,
  Group,
  LinearGradient,
  vec,
  Image,
  useImage,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';

// ─── SHADERS ──────────────────────────────────────────────────────────────────

const HOLO_SRC = `
  uniform float2 resolution;
  uniform float2 pointer;
  uniform float  opacity;
  uniform float  mode;
  uniform float  fromCenter;

  const float PI = 3.14159265358979;

  float hash21(float2 p) {
    float2 q = fract(p * float2(127.1, 311.7));
    q += dot(q, q + 45.32);
    return fract(q.x * q.y);
  }

  half3 hsv2rgb(float h, float s, float v) {
    half3 c = clamp(abs(mod(h * 6.0 + half3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return v * mix(half3(1.0), c, s);
  }

  half3 rainbow(float t) {
    return 0.5 + 0.5 * cos(2.0 * PI * (t + half3(0.0, 0.333, 0.667)));
  }

  // ── Blend mode helpers (match CSS blend modes exactly) ──

  half hardLight(half bg, half fg) {
    return fg < 0.5 ? 2.0 * bg * fg : 1.0 - 2.0 * (1.0 - bg) * (1.0 - fg);
  }
  half3 hardLight3(half3 bg, half3 fg) {
    return half3(hardLight(bg.r,fg.r), hardLight(bg.g,fg.g), hardLight(bg.b,fg.b));
  }

  half3 exclusion3(half3 a, half3 b) {
    return a + b - 2.0 * a * b;
  }

  // Hue blend: takes hue from fg, saturation+luminosity from bg (CSS "hue" mode)
  half3 hueBlend(half3 bg, half3 fg) {
    float bgLum  = dot(bg, half3(0.299, 0.587, 0.114));
    float fgLum  = max(dot(fg, half3(0.299, 0.587, 0.114)), 0.001);
    return fg * (bgLum / fgLum);
  }

  // CSS filter: brightness → contrast → saturate
  half3 cssFilter(half3 c, float bright, float contrast, float sat) {
    c = c * bright;
    c = clamp((c - 0.5) * contrast + 0.5, 0.0, 1.0);
    float g = dot(c, half3(0.299, 0.587, 0.114));
    return clamp(mix(half3(g), c, sat), 0.0, 1.0);
  }

  // CSS soft-light blend mode (W3C compositing spec)
  half softLight(half bg, half fg) {
    if (fg <= 0.5) {
      return bg - (1.0 - 2.0 * fg) * bg * (1.0 - bg);
    }
    half d = bg <= 0.25 ? ((16.0 * bg - 12.0) * bg + 4.0) * bg : sqrt(bg);
    return bg + (2.0 * fg - 1.0) * (d - bg);
  }
  half3 softLight3(half3 bg, half3 fg) {
    return half3(softLight(bg.r,fg.r), softLight(bg.g,fg.g), softLight(bg.b,fg.b));
  }

  // CSS color-burn blend: 1 - min(1, (1-bg)/fg)
  half colorBurn(half bg, half fg) {
    if (fg <= 0.0) return 0.0;
    return max(0.0, 1.0 - (1.0 - bg) / fg);
  }
  half3 colorBurn3(half3 bg, half3 fg) {
    return half3(colorBurn(bg.r,fg.r), colorBurn(bg.g,fg.g), colorBurn(bg.b,fg.b));
  }

  // CSS color-dodge blend: min(1, bg / (1 - fg))
  half colorDodge(half bg, half fg) {
    if (fg >= 1.0) return 1.0;
    return min(1.0, bg / (1.0 - fg));
  }
  half3 colorDodge3(half3 bg, half3 fg) {
    return half3(colorDodge(bg.r,fg.r), colorDodge(bg.g,fg.g), colorDodge(bg.b,fg.b));
  }

  // CSS saturation blend: saturation from fg, hue+luminosity from bg
  half3 satBlend(half3 bg, half3 fg) {
    float bgL = dot(bg, half3(0.299, 0.587, 0.114));
    float fgMax = max(max(fg.r, fg.g), fg.b);
    float fgMin = min(min(fg.r, fg.g), fg.b);
    float fgSat = fgMax - fgMin;
    float bgMax = max(max(bg.r, bg.g), bg.b);
    float bgMin = min(min(bg.r, bg.g), bg.b);
    float bgSat = bgMax - bgMin;
    if (bgSat < 0.001) return half3(bgL);
    half3 r = half3(bgL) + (bg - half3(bgL)) * (fgSat / bgSat);
    float rL = dot(r, half3(0.299, 0.587, 0.114));
    r = r + (bgL - rL);
    return clamp(r, 0.0, 1.0);
  }

  // Procedural glitter texture: mimics glitter.png tiled at 25% (4x)
  float arGlitter(float2 uv, float2 off) {
    float2 gUV = (uv + off) * 4.0;
    float g1 = hash21(floor(gUV * 50.0));
    float g2 = hash21(floor(gUV * 18.0) + 777.0);
    float base = 0.35 + g1 * 0.35 + g2 * 0.1;
    base += step(0.93, g1) * 0.3;
    return base;
  }

  // Rainbow Holo palette: 7 CSS colors from rainbow-holo.css
  // hsl(0,57%,37%) hsl(40,53%,39%) hsl(90,60%,35%) hsl(180,60%,35%)
  // hsl(180,60%,35%) hsl(210,57%,39%) hsl(280,55%,31%)
  half3 rbHoloColor(float t) {
    float seg = fract(t) * 7.0;
    int si = int(floor(seg));
    float sf = fract(seg);
    half3 c0, c1;
    if      (si == 0) { c0 = half3(0.581,0.159,0.159); c1 = half3(0.597,0.459,0.183); }
    else if (si == 1) { c0 = half3(0.597,0.459,0.183); c1 = half3(0.350,0.560,0.140); }
    else if (si == 2) { c0 = half3(0.350,0.560,0.140); c1 = half3(0.140,0.560,0.560); }
    else if (si == 3) { c0 = half3(0.140,0.560,0.560); c1 = half3(0.140,0.560,0.560); }
    else if (si == 4) { c0 = half3(0.140,0.560,0.560); c1 = half3(0.168,0.390,0.612); }
    else if (si == 5) { c0 = half3(0.168,0.390,0.612); c1 = half3(0.367,0.140,0.481); }
    else              { c0 = half3(0.367,0.140,0.481); c1 = half3(0.581,0.159,0.159); }
    return mix(c0, c1, sf);
  }

  // CSS luminosity blend: luminance from fg (source), hue+sat from bg (backdrop)
  half3 lumBlend(half3 bg, half3 fg) {
    float tl = dot(fg, half3(0.299, 0.587, 0.114));
    float cl = dot(bg, half3(0.299, 0.587, 0.114));
    half3 r = bg + (tl - cl);
    float l = dot(r, half3(0.299, 0.587, 0.114));
    float n = min(min(r.r, r.g), r.b);
    float x = max(max(r.r, r.g), r.b);
    if (n < 0.0) r = half3(l) + (r - half3(l)) * (l / (l - n + 0.001));
    if (x > 1.0) r = half3(l) + (r - half3(l)) * ((1.0 - l) / (x - l + 0.001));
    return r;
  }

  // Sunpillar hues from base.css :root variables
  // hsl(2,100%,73%) hsl(53,100%,69%) hsl(93,100%,69%) hsl(176,100%,76%) hsl(228,100%,74%) hsl(283,100%,73%)
  // Mapped to HSV hue: 0.0056, 0.1472, 0.2583, 0.4889, 0.6333, 0.7861
  half3 sunpillar(float t) {
    float f = fract(t) * 6.0;
    int idx = int(floor(f));
    float fr = fract(f);
    float h0, h1, v0, v1;
    if (idx == 0)      { h0=0.0056; h1=0.1472; v0=0.73; v1=0.69; }
    else if (idx == 1) { h0=0.1472; h1=0.2583; v0=0.69; v1=0.69; }
    else if (idx == 2) { h0=0.2583; h1=0.4889; v0=0.69; v1=0.76; }
    else if (idx == 3) { h0=0.4889; h1=0.6333; v0=0.76; v1=0.74; }
    else if (idx == 4) { h0=0.6333; h1=0.7861; v0=0.74; v1=0.73; }
    else               { h0=0.7861; h1=1.0056; v0=0.73; v1=0.73; }
    return hsv2rgb(mix(h0, h1, fr), 1.0, mix(v0, v1, fr));
  }

  half4 main(float2 fc) {
    float2 uv   = fc / resolution;
    float2 p    = pointer / resolution;
    float  dist = distance(uv, p);

    half3 color = half3(0.0);
    float alpha = 0.0;

    // ── 0: COMMON — REVERSE HOLO ──
    if (mode < 0.5) {

      // Layer 2 (base): linear-gradient
      float2 rhLinUV = (uv + p) / 2.0;
      float rhGradT = 0.5 + dot(rhLinUV - 0.5, float2(-0.7071, -0.7071)) / 1.4142;
      rhGradT = clamp(rhGradT, 0.0, 1.0);

      float rhLinV;
      if      (rhGradT < 0.15) rhLinV = 0.0;
      else if (rhGradT < 0.50) rhLinV = (rhGradT - 0.15) / 0.35;
      else if (rhGradT < 0.85) rhLinV = 1.0 - (rhGradT - 0.50) / 0.35;
      else                     rhLinV = 0.0;
      half3 rhLinear = half3(rhLinV);

      // Layer 1 (top): radial-gradient
      float rhFC = max(max(distance(p, float2(0,0)), distance(p, float2(1,0))),
                       max(distance(p, float2(0,1)), distance(p, float2(1,1))));
      float rhRN = dist / max(rhFC * 1.2, 0.001);

      float rhRadV;
      if      (rhRN < 0.05) rhRadV = 1.0;
      else if (rhRN < 0.50) rhRadV = 1.0 - (rhRN - 0.05) / 0.45;
      else if (rhRN < 0.80) rhRadV = (rhRN - 0.50) / 0.30;
      else                  rhRadV = 1.0;
      half3 rhRadial = half3(rhRadV);

      // Soft-light blend
      half3 rhShine = softLight3(rhLinear, rhRadial);

      // REDUCED: Lowered brightness from 0.55 to 0.42 to tone down the overall shine
      rhShine = cssFilter(rhShine, 0.42, 1.5, 1.0);

      // ──────────────────────────────────────────────────────────────────────────
      //  GLARE 
      // ──────────────────────────────────────────────────────────────────────────

      // Main glare
      float rhGM = mix(0.8, 0.5, smoothstep(0.10, 0.20, rhRN));
      rhGM = mix(rhGM, 0.0, smoothstep(0.20, 0.90, rhRN));
      
      // REDUCED: Lowered brightness of main glare from 0.7 to 0.55
      rhGM = clamp((rhGM * 0.55 - 0.5) * 1.5 + 0.5, 0.0, 1.0);

      // :after glare
      float rhGA = mix(1.0, 0.5, smoothstep(0.10, 0.20, rhRN));
      rhGA = mix(rhGA, 0.0, smoothstep(0.20, 1.20, rhRN));
      rhGA = clamp((rhGA - 0.5) * 1.5 + 0.5, 0.0, 1.0);

      float rhGlare = max(rhGM, rhGA);

      half3 rhOverlaid = hardLight3(half3(rhGlare), rhShine);
      float rhGStr = fromCenter * 0.65;
      color = mix(rhShine, rhOverlaid, rhGStr);

      // REDUCED: Lowered multiplier from 1.5 to 1.2 to reduce total layer opacity
      alpha = clamp(1.2 * opacity - fromCenter, 0.0, 1.0);
    }

    // ── 1: RARE — AMAZING RARE ──
    else if (mode < 1.5) {
      float bgx = 0.37 + p.x * 0.26;
      float bgy = 0.33 + p.y * 0.34;

      // ──────────────────────────────────────────────────────────────────────────
      //  MAIN SHINE (card__shine)
      // ──────────────────────────────────────────────────────────────────────────

      // Layer 3 (bottom): Radial gradient at pointer
      half3 arDark  = half3(0.08, 0.12, 0.09);
      half3 arGray  = half3(0.76, 0.82, 0.80);
      
      // REDUCED: Lowered from 0.95 to 0.65 to reduce white shine intensity
      half3 arWhite = half3(0.65); 
      
      half3 radL = mix(arDark, arGray, smoothstep(0.10, 0.50, dist));
      radL = mix(radL, arWhite, smoothstep(0.50, 0.90, dist));
      
      float rA = mix(1.0, 0.1, smoothstep(0.10, 0.50, dist));
      rA = mix(rA, 0.98, smoothstep(0.50, 0.90, dist));
      radL = radL * rA;

      float glit2 = arGlitter(uv, float2(0.55, 0.55));
      half3 cb2 = colorBurn3(radL, half3(glit2));

      float glit1 = arGlitter(uv, float2(0.40, 0.45));
      half3 arMainOut = softLight3(cb2, half3(glit1));

      float arGr = dot(arMainOut, half3(0.299, 0.587, 0.114));
      arMainOut = mix(half3(arGr), arMainOut, 0.9);

      // ──────────────────────────────────────────────────────────────────────────
      //  :BEFORE LAYER
      // ──────────────────────────────────────────────────────────────────────────

      float2 arFoilUV = fract(uv * 3.0);
      float arFoilVal = 0.5
        + 0.25 * sin(arFoilUV.x * 18.85 + arFoilUV.y * 6.283)
        + 0.15 * sin((arFoilUV.x - arFoilUV.y) * 25.13);

      // REDUCED: Lowered from 0.90 range to 0.70 range to tone down the foil highlights
      half3 arWW = half3(0.70, 0.67, 0.62); 
      half3 arMV = half3(0.355, 0.272, 0.322);
      half3 arBk = half3(0.0);
      half3 arBR = mix(arWW, arMV, smoothstep(0.10, 0.50, dist));
      arBR = mix(arBR, arBk, smoothstep(0.50, 0.60, dist));

      half3 arBefore = colorBurn3(arBR, half3(arFoilVal));

      half3 arLightened = max(arMainOut, arBefore);
      arMainOut = mix(arMainOut, arLightened, 0.5);

      // ──────────────────────────────────────────────────────────────────────────
      //  :AFTER LAYER
      // ──────────────────────────────────────────────────────────────────────────

      float arPX = 0.5 + (0.5 - bgx) * 3.0;
      float arPY = 0.5 + (0.5 - bgy) * 3.0;

      float arImgU = (uv.x - arPX * (1.0 - 4.0)) / 4.0;
      float arImgV = (uv.y - arPY * (1.0 - 8.0)) / 8.0;

      float2 arDir = float2(0.731, 0.682);
      float arGT = dot(float2(arImgU, arImgV), arDir);
      half3 arSP = sunpillar(fract(arGT / 0.35));

      arSP = arSP * max(0.0, 0.75 - fromCenter * 0.5);
      arMainOut = satBlend(arMainOut, arSP);

      // ──────────────────────────────────────────────────────────────────────────
      //  GLARE
      // ──────────────────────────────────────────────────────────────────────────

      float arGlA = mix(1.0, 0.85, smoothstep(0.10, 0.20, dist));
      arGlA = mix(arGlA, 0.35, smoothstep(0.20, 0.90, dist));
      half3 arGlareC = half3(arGlA);

      half3 arMult = arMainOut * arGlareC;
      float arGlStr = fromCenter * 0.7;
      color = mix(arMainOut, arMult, arGlStr);
      alpha = opacity;
    }

    // ── 2: EPIC — V-MAX ──
    //
    // 1:1 translation of v-max.css (unmasked variant):
    //
    //   card__shine:
    //     bg-layers: foil(vmaxbg@60%×30%) + rainbow(-33°,1100²) + diagonal(133°,600²) + radial(200²)
    //     bg-blend: difference, luminosity, soft-light, (normal)
    //     filter: brightness(fc·0.4+0.4) contrast(2) saturate(1)
    //     overall: color-dodge (Skia Rect blendMode)
    //
    //   card__shine:after:
    //     bg-layers: sunpillar(0°,200%×700%) + diagonal(133°,300%×100%)
    //     bg-blend: hue, hard-light
    //     mix-blend-mode: lighten
    //     opacity: 0.3 + fromCenter * 0.5
    //     filter: saturate(1.5)
    //
    //   card__glare:
    //     radial(white 75%→black 120%) via hard-light, baked in
    //
    else if (mode < 2.5) {
      float bgx = 0.37 + p.x * 0.26;
      float bgy = 0.33 + p.y * 0.34;

      // ──────────────────────────────────────────────────────────────────────────
      //  MAIN SHINE (card__shine) — 4 layers composited bottom→top
      // ──────────────────────────────────────────────────────────────────────────

      // Layer 1 (bottom): Pastel radial gradient at pointer
      // radial-gradient(farthest-corner at pointer,
      //   hsla(189,76%,77%,0.5), hsla(147,59%,77%,0.5),
      //   hsla(271,55%,69%,0.5), hsla(355,56%,72%,0.5))
      // bg-size: 200% 200% → wider transitions; ×0.6 for hsla alpha
      half3 pCyan   = half3(0.357, 0.535, 0.567);
      half3 pGreen  = half3(0.380, 0.544, 0.470);
      half3 pPurple = half3(0.418, 0.312, 0.517);
      half3 pPink   = half3(0.526, 0.338, 0.353);
      float rd = dist * 0.6;
      half3 radLayer = mix(pCyan, pGreen, smoothstep(0.0, 0.25, rd));
      radLayer = mix(radLayer, pPurple, smoothstep(0.25, 0.50, rd));
      radLayer = mix(radLayer, pPink, smoothstep(0.50, 0.75, rd));

      // Layer 2: Diagonal stripes at 133°
      // repeating-linear-gradient(133deg,
      //   hsla(227,53%,12%,0.5) 0%, hsl(180,10%,50%) 2.5%, hsl(83,50%,35%) 5%,
      //   hsl(180,10%,50%) 7.5%, hsla(227,53%,12%,0.5) 10%, ... 15%)
      // bg-size: 600% 600% → period = 0.15 × 6.0 = 0.90
      float vmAng = 133.0 * PI / 180.0;
      float2 vmDir = float2(cos(vmAng), sin(vmAng));
      float vmShift = bgx + bgy * 0.2;
      float vmDT = fract(dot(uv, vmDir) / 0.90 + vmShift);
      half3 vmNavy  = half3(0.056, 0.084, 0.184);
      half3 vmTeal  = half3(0.45, 0.55, 0.55);
      half3 vmOlive = half3(0.391, 0.525, 0.175);
      // Stops: navy(0)→teal(.167)→olive(.333)→teal(.5)→navy(.667)→navy(1)
      half3 diagC; float diagA;
      if (vmDT < 0.167)      { diagC = mix(vmNavy, vmTeal,  vmDT / 0.167);           diagA = mix(0.5, 1.0, vmDT / 0.167); }
      else if (vmDT < 0.333) { diagC = mix(vmTeal, vmOlive, (vmDT-0.167) / 0.167);  diagA = 1.0; }
      else if (vmDT < 0.5)   { diagC = mix(vmOlive, vmTeal, (vmDT-0.333) / 0.167);  diagA = 1.0; }
      else if (vmDT < 0.667) { diagC = mix(vmTeal, vmNavy,  (vmDT-0.5)   / 0.167);  diagA = mix(1.0, 0.5, (vmDT-0.5)/0.167); }
      else                   { diagC = vmNavy; diagA = 0.5; }
      // Soft-light blend onto radial, weighted by diagonal alpha
      half3 sl2 = softLight3(radLayer, diagC);
      half3 layer2 = mix(radLayer, sl2, diagA);

      // Layer 3: Rainbow diagonal at -33°
      // repeating-linear-gradient(-33deg, 5 holo colors at 6% spacing)
      // bg-size: 1100% 1100% → period = 0.36 × 11.0 = 3.96
      float rAng = -33.0 * PI / 180.0;
      float2 rDir = float2(cos(rAng), sin(rAng));
      float rT = fract(dot(uv, rDir) / 3.96 + bgx + bgy * 0.2);
      half3 rb0 = half3(0.799, 0.163, 0.141);  // hsl(2,70%,47%)
      half3 rb1 = half3(0.424, 0.510, 0.856);  // hsl(228,60%,64%)
      half3 rb2 = half3(0.176, 0.604, 0.576);  // hsl(176,55%,39%)
      half3 rb3 = half3(0.112, 0.588, 0.136);  // hsl(123,68%,35%)
      half3 rb4 = half3(0.710, 0.248, 0.893);  // hsl(283,75%,57%)
      float rSeg = rT * 5.0;
      int ri = int(floor(rSeg));
      float rf = fract(rSeg);
      half3 rbow;
      if (ri == 0)      rbow = mix(rb0, rb1, rf);
      else if (ri == 1) rbow = mix(rb1, rb2, rf);
      else if (ri == 2) rbow = mix(rb2, rb3, rf);
      else if (ri == 3) rbow = mix(rb3, rb4, rf);
      else              rbow = mix(rb4, rb0, rf);
      // Luminosity blend: rainbow onto layer2
      half3 layer3 = lumBlend(layer2, rbow);

      // Layer 4 (top): Foil texture (vmaxbg.jpg procedural approximation)
      // bg-size: 60% 30%, centered, blended via difference
      float2 vmFoilUV = fract(uv * float2(1.667, 3.333));
      float vmFoilVal = 0.5
        + 0.3  * sin(vmFoilUV.x * 15.7 + vmFoilUV.y * 9.42)
        + 0.15 * cos(vmFoilUV.x * 7.85 - vmFoilUV.y * 22.0)
        + 0.10 * sin((vmFoilUV.x + vmFoilUV.y) * 18.85);
      half3 vmFoilC = half3(vmFoilVal);
      // Difference blend: abs(result - foil)
      half3 vmMainOut = abs(layer3 - vmFoilC);

      // CSS filter: brightness(fromCenter*0.4+0.4) contrast(2) saturate(1)
      vmMainOut = cssFilter(vmMainOut, fromCenter * 0.4 + 0.4, 2.0, 1.0);

      // ──────────────────────────────────────────────────────────────────────────
      //  :AFTER LAYER (card__shine:after)
      //  2 layers: sunpillar(0°, 200%×700%) + diagonal(133°, 300%×100%)
      //  bg-blend: hue (sunpillar onto diagonal)
      //  mix-blend-mode: lighten onto main
      // ──────────────────────────────────────────────────────────────────────────

      // Diagonal base (same teal stripes as shiny-v, period = 0.12 × 3.0 = 0.36)
      float vmDS2 = bgx + bgy * 0.2;
      float vmDT2 = fract(dot(uv, vmDir) / 0.36 + vmDS2);
      half3 vmN2 = half3(0.055, 0.082, 0.18);
      half3 vmTA = half3(0.54, 0.60, 0.60);
      half3 vmTB = half3(0.47, 0.66, 0.66);
      float vmS2 = smoothstep(0.27, 0.375, vmDT2) * smoothstep(0.48, 0.375, vmDT2);
      half3 vmDiag2 = mix(vmN2, mix(vmTA, vmTB, smoothstep(0.31, 0.375, vmDT2) * smoothstep(0.44, 0.375, vmDT2)), vmS2);

      // Shifted sunpillar (--space: 6%, 7 stops → 42% period, bg-size 200%×700%)
      // Period in element coords = 0.42 × 7.0 = 2.94, +1/6 offset for :after
      float vmSP = fract((uv.y + bgy * 6.0) / 2.94 + 0.167);
      half3 vmSPc = sunpillar(vmSP);

      // Hue blend: sunpillar hue onto diagonal luminance
      half3 vmAfterOut = hueBlend(vmDiag2, vmSPc);

      // filter: saturate(1.5)
      float vmAG = dot(vmAfterOut, half3(0.299, 0.587, 0.114));
      vmAfterOut = clamp(mix(half3(vmAG), vmAfterOut, 1.5), 0.0, 1.0);

      // Lighten blend: max(main, after) at :after opacity
      float vmAfterA = 0.3 + fromCenter * 0.5;
      half3 vmLighten = max(vmMainOut, vmAfterOut);
      half3 vmShineResult = mix(vmMainOut, vmLighten, vmAfterA);

      // ──────────────────────────────────────────────────────────────────────────
      //  GLARE LAYER (baked — CSS uses hard-light blend)
      //  radial: hsla(0,0%,100%,0.75) 0% → hsl(0,0%,0%) 120%
      //  mix-blend-mode: hard-light
      //  opacity: 0.2 + fromCenter * 0.8
      // ──────────────────────────────────────────────────────────────────────────

      half3 vmGlareC = half3(max(0.0, 0.75 * (1.0 - smoothstep(0.0, 1.2, dist))));
      half3 vmGlareHL = hardLight3(vmShineResult, vmGlareC);
      float vmGlareA = 0.2 + fromCenter * 0.8;
      color = mix(vmShineResult, vmGlareHL, vmGlareA);
      alpha = opacity;
    }

    // ── 3: LEGENDS — RAINBOW HOLO ──
    //
    // 1:1 translation of rainbow-holo.css (unmasked variant):
    //
    //   card__shine:
    //     bg-layers: linear(-45°,clr1→clr5) + glitter(25%) + linear(-30°,7clrs×3)
    //     bg-blend: luminosity, soft-light
    //     bg-size: 200%, 25%, 400%
    //     filter: brightness(fc*0.25+0.5) contrast(2.2) saturate(0.75)
    //     overall: color-dodge (Skia Rect blendMode)
    //
    //   card__shine:before:
    //     foil(illusion-mask, 33% tile), brightness(2.5)
    //     opacity: (fromCenter+0.4)*0.5
    //     mix-blend-mode: darken
    //
    //   card__shine:after:
    //     glitter(25%) + linear(-60°,7clrs×3), soft-light blend
    //     filter: brightness(fc*0.3+0.55) contrast(2) saturate(1)
    //     mix-blend-mode: color-dodge
    //
    //   card__glare:
    //     radial(gray80%→teal25%α@30%→dark@120%) via hard-light
    //     filter: brightness(0.9) contrast(1.75)
    //     opacity: fromCenter * 0.9
    //
    else if (mode < 3.5) {

      // ──────────────────────────────────────────────────────────────────────────
      //  MAIN SHINE — 3 bg-layers composited bottom→top
      //  Layer 3 (base): rainbow -30°, 400%×400%
      //  Layer 2 (mid):  glitter 25%×25% (4× tile), soft-light
      //  Layer 1 (top):  -45° gradient clr1→clr5, 200%×200%, luminosity
      // ──────────────────────────────────────────────────────────────────────────

      // Layer 3 (base): linear-gradient(-30deg, 7 colors × 3 repeats + wrap)
      // bg-size: 400%×400%, bg-pos: (25%+pointer-x/2, 25%+pointer-y/2)
      float2 rb3Pos = float2(0.25 + p.x * 0.5, 0.25 + p.y * 0.5);
      float2 rb3Img = (uv + rb3Pos * 3.0) / 4.0;
      // CSS -30°: dir=(sin-30, -cos-30)=(-0.5, -0.866), length=1.366
      float rb3T = 0.5 + dot(rb3Img - 0.5, float2(-0.5, -0.866)) / 1.366;
      rb3T = clamp(rb3T, 0.0, 1.0);
      half3 rbBase = rbHoloColor(fract(rb3T * 3.0));

      // Layer 2 (mid): glitter (25%×25% = 4× tile), soft-light blend onto base
      float rbGlit1 = arGlitter(uv, float2(0.0, 0.0));
      half3 rbSoftLit = softLight3(rbBase, half3(rbGlit1));

      // Layer 1 (top): linear-gradient(-45deg, clr-1, clr-5)
      // bg-size: 200%×200%, bg-pos: (25%+50%*fromLeft, 25%+50%*fromTop)
      float2 rb1Img = (uv + float2(0.25 + 0.5 * p.x, 0.25 + 0.5 * p.y)) / 2.0;
      // CSS -45°: t = 1.0 - 0.5*(imgU+imgV)
      float rb1T = clamp(1.0 - 0.5 * (rb1Img.x + rb1Img.y), 0.0, 1.0);
      half3 rbClr1 = half3(0.581, 0.159, 0.159); // hsl(0,57%,37%)
      half3 rbClr5 = half3(0.140, 0.560, 0.560); // hsl(180,60%,35%)
      half3 rbDiag = mix(rbClr1, rbClr5, rb1T);

      // Luminosity blend: -45° gradient onto soft-lit result
      half3 rbMainShine = lumBlend(rbSoftLit, rbDiag);

      // ──────────────────────────────────────────────────────────────────────────
      //  :BEFORE — foil (illusion-mask, 33% tile)
      //  filter: brightness(2.5) contrast(1)
      //  opacity: (fromCenter + 0.4) * 0.5
      //  mix-blend-mode: darken
      // ──────────────────────────────────────────────────────────────────────────
      float2 rbFoilUV = fract(uv * 3.0);
      float rbFoilV = 0.5
        + 0.25 * sin(rbFoilUV.x * 18.85 + rbFoilUV.y * 6.283)
        + 0.15 * sin((rbFoilUV.x - rbFoilUV.y) * 25.13)
        + 0.10 * cos((rbFoilUV.x + rbFoilUV.y) * 12.57);
      // filter: brightness(2.5)
      rbFoilV = clamp(rbFoilV * 2.5, 0.0, 1.0);
      float rbFoilOp = clamp((fromCenter + 0.4) * 0.5, 0.0, 1.0);
      // Darken blend at opacity
      half3 rbDarken = min(rbMainShine, half3(rbFoilV));
      rbMainShine = mix(rbMainShine, rbDarken, rbFoilOp);

      // ──────────────────────────────────────────────────────────────────────────
      //  :AFTER — glitter(25%) + rainbow(-60°, 400%×400%)
      //  bg-blend: soft-light (glitter onto rainbow)
      //  filter: brightness(fc*0.3+0.55) contrast(2) saturate(1)
      //  mix-blend-mode: color-dodge onto main
      // ──────────────────────────────────────────────────────────────────────────

      // Rainbow at -60°, bg-size 400%×400%, bg-pos: pointer-x pointer-y
      float2 rbAftImg = (uv + p * 3.0) / 4.0;
      // CSS -60°: dir=(sin-60, -cos-60)=(-0.866, -0.5), length=1.366
      float rbAftT = 0.5 + dot(rbAftImg - 0.5, float2(-0.866, -0.5)) / 1.366;
      rbAftT = clamp(rbAftT, 0.0, 1.0);
      half3 rbAftRainbow = rbHoloColor(fract(rbAftT * 3.0));

      // Glitter soft-light onto rainbow
      float rbGlit2 = arGlitter(uv, float2(0.0, 0.0));
      half3 rbAftResult = softLight3(rbAftRainbow, half3(rbGlit2));

      // :after filter: brightness(fc*0.3+0.55) contrast(2) saturate(1)
      rbAftResult = cssFilter(rbAftResult, fromCenter * 0.2 + 0.45, 2.0, 1.0);

      // Color-dodge blend :after onto main
      rbMainShine = colorDodge3(rbMainShine, rbAftResult);

      // ──────────────────────────────────────────────────────────────────────────
      //  PARENT FILTER: brightness(fc*0.25+0.5) contrast(2.2) saturate(0.75)
      //  Applied to entire card__shine element after pseudo compositing
      // ──────────────────────────────────────────────────────────────────────────
      rbMainShine = cssFilter(rbMainShine, fromCenter * 0.25 + 0.5, 2.2, 0.75);

      // ──────────────────────────────────────────────────────────────────────────
      //  GLARE (baked — hard-light blend)
      //  radial: gray(80%) → teal(85%,25%α)@30% → dark(25%)@120%
      //  filter: brightness(0.9) contrast(1.75)
      //  opacity: fromCenter * 0.9
      // ──────────────────────────────────────────────────────────────────────────
      // Farthest-corner circle radius
      float rbFC = max(max(distance(p, float2(0,0)), distance(p, float2(1,0))),
                       max(distance(p, float2(0,1)), distance(p, float2(1,1))));
      float rbGN = dist / max(rbFC, 0.001);

      // Gray channel interpolation between 3 stops
      float rbGlGray = mix(0.80, 0.855, smoothstep(0.0, 0.30, rbGN));
      rbGlGray = mix(rbGlGray, 0.25, smoothstep(0.30, 1.20, rbGN));
      // Alpha channel: 1.0 → 0.25 @ 30% → 1.0 @ 120%
      float rbGlAlpha = mix(1.0, 0.25, smoothstep(0.0, 0.30, rbGN));
      rbGlAlpha = mix(rbGlAlpha, 1.0, smoothstep(0.30, 1.20, rbGN));

      // filter: brightness(0.9) contrast(1.75)
      rbGlGray = clamp((rbGlGray * 0.9 - 0.5) * 1.75 + 0.5, 0.0, 1.0);

      // Hard-light blend modulated by alpha × element opacity
      half3 rbGlHL = hardLight3(rbMainShine, half3(rbGlGray));
      float rbGlStr = rbGlAlpha * fromCenter * 0.9;
      color = mix(rbMainShine, rbGlHL, rbGlStr);
      alpha = opacity;
    }

// ── 4: MYTHIC — RADIANT HOLO ──
    else if (mode < 4.5) {
      float bgx = 0.37 + p.x * 0.26;
      float bgy = 0.33 + p.y * 0.34;

      // ... [Stripe Logic remains identical] ...
      float rdPeriod = 0.252;
      float rdPosX = ((bgx - 0.5) * 1.5) + 0.5;
      float rdPosY = ((bgy - 0.5) * 1.5) + 0.5;
      float rdShift = rdPosX * 0.5 + rdPosY * 0.3;

      float2 dir45  = float2( 0.7071, 0.7071);
      float2 dirM45 = float2( 0.7071,-0.7071);

      float tM45 = fract(dot(uv, dirM45) / rdPeriod + rdShift);
      float bM = floor(tM45 * 10.0);
      float gM;
      if      (bM < 1.0) gM = 0.10; else if (bM < 2.0) gM = 0.20;
      else if (bM < 3.0) gM = 0.35; else if (bM < 4.0) gM = 0.425;
      else if (bM < 5.0) gM = 0.50; else if (bM < 6.0) gM = 0.425;
      else if (bM < 7.0) gM = 0.35; else if (bM < 8.0) gM = 0.20;
      else if (bM < 9.0) gM = 0.10; else gM = 0.0;
      half3 stripeM = half3(gM);

      float t45 = fract(dot(uv, dir45) / rdPeriod + rdShift);
      float b45 = floor(t45 * 10.0);
      float g45;
      if      (b45 < 1.0) g45 = 0.10; else if (b45 < 2.0) g45 = 0.20;
      else if (b45 < 3.0) g45 = 0.35; else if (b45 < 4.0) g45 = 0.425;
      else if (b45 < 5.0) g45 = 0.50; else if (b45 < 6.0) g45 = 0.425;
      else if (b45 < 7.0) g45 = 0.35; else if (b45 < 8.0) g45 = 0.20;
      else if (b45 < 9.0) g45 = 0.10; else g45 = 0.0;
      half3 stripe45 = half3(g45);

      half3 rdDarkened = min(stripeM, stripe45);

      // ──────────────────────────────────────────────────────────────────────────
      //  MODIFIED: RADIAL GLOW (Topmost layer)
      // ──────────────────────────────────────────────────────────────────────────
      float2 rdRadCenter = p * 0.5 + 0.25;
      float rdRadDist = distance(uv, rdRadCenter);
      
      // Muted the teal glow and the base white center
      half3 rdGlowC = half3(0.50, 0.70, 0.68); // Was (0.80, 1.0, 0.97)
      half3 rdRadial = mix(half3(0.45), rdGlowC, smoothstep(0.20, 1.30, rdRadDist)); // Was half3(0.95)

      half3 rdMainBg = exclusion3(rdDarkened, rdRadial);

      // ... [:BEFORE Logic remains identical] ...
      float rdGlit = arGlitter(uv * 1.667, float2(0.0, 0.0));
      float rdBefD = rdRadDist / 3.5;
      float rdBefGray = mix(0.58, 0.20, smoothstep(0.10, 0.20, rdBefD));
      rdBefGray = mix(rdBefGray, 0.20, smoothstep(0.20, 0.50, rdBefD));
      float rdBefAlpha = mix(0.8, 0.9, smoothstep(0.10, 0.20, rdBefD));
      rdBefAlpha = mix(rdBefAlpha, 0.5, smoothstep(0.20, 0.50, rdBefD));
      half3 rdBefRad = half3(rdBefGray * rdBefAlpha);

      half3 rdBefore = colorDodge3(rdBefRad, half3(rdGlit));
      rdBefore = cssFilter(rdBefore, 0.66, 2.0, 0.5);
      half3 rdOverlayed = hardLight3(rdBefore, rdMainBg);

      // ... [:AFTER Logic remains identical] ...
      float2 rdFoilUV = fract(uv * 4.0);
      float rdFoilVal = 0.5 + 0.25 * sin(rdFoilUV.x * 18.85 + rdFoilUV.y * 6.283) + 0.15 * sin((rdFoilUV.x - rdFoilUV.y) * 25.13) + 0.10 * cos((rdFoilUV.x + rdFoilUV.y) * 12.57);

      float2 rdAftDir = float2(0.8192, -0.5736);
      float rdAftPosX = ((bgx - 0.5) * -2.5) + 0.5;
      float rdAPx = (uv.x * resolution.x + rdAftPosX * resolution.x * 3.0) * 0.8192 + uv.y * resolution.y * (-0.5736);
      float rdAftPhase = fract(rdAPx / 1200.0);

      half3 rdP0 = half3(0.99, 0.72, 0.71); half3 rdP1 = half3(0.68, 0.86, 1.00);
      half3 rdP2 = half3(1.00, 0.85, 0.70); half3 rdP3 = half3(0.72, 1.00, 0.91);
      half3 rdP4 = half3(0.99, 0.75, 0.96); half3 rdP5 = half3(0.71, 0.95, 0.99);

      float rdSeg = rdAftPhase * 6.0; int rdSi = int(floor(rdSeg)); float rdSf = fract(rdSeg);
      half3 rdRainbow;
      if (rdSi == 0) rdRainbow = mix(rdP0, rdP1, rdSf); else if (rdSi == 1) rdRainbow = mix(rdP1, rdP2, rdSf);
      else if (rdSi == 2) rdRainbow = mix(rdP2, rdP3, rdSf); else if (rdSi == 3) rdRainbow = mix(rdP3, rdP4, rdSf);
      else if (rdSi == 4) rdRainbow = mix(rdP4, rdP5, rdSf); else rdRainbow = mix(rdP5, rdP0, rdSf);

      half3 rdAftResult = abs(half3(rdFoilVal) - rdRainbow);
      rdAftResult = cssFilter(rdAftResult, 0.6, 3.0, 2.0);
      half3 rdResult = colorDodge3(rdOverlayed, rdAftResult);

      rdResult = cssFilter(rdResult, 0.5, 2.0, 1.75);

      // ──────────────────────────────────────────────────────────────────────────
      //  MODIFIED: GLARE
      // ──────────────────────────────────────────────────────────────────────────
      // Lowered from 1.0 peak to 0.7 to prevent the glare from blowing out to white
      float rdGlareGray = mix(0.5, 0.25, smoothstep(0.0, 1.1, dist)); 
      
      float rdGlareAlpha = mix(0.33, 1.0, smoothstep(0.0, 1.1, dist));
      rdGlareGray = clamp((rdGlareGray - 0.5) * 1.5 + 0.5, 0.0, 1.0);

      half3 rdGlareHL = hardLight3(rdResult, half3(rdGlareGray));
      float rdGlareStr = rdGlareAlpha * fromCenter * 0.7;
      color = mix(rdResult, rdGlareHL, rdGlareStr);
      alpha = opacity;
    }

// ── 5: SECRET — SHINY V (ULTRA RARE) ──
    else {
      // ── CSS variable mapping ──
      float bgx = 0.37 + p.x * 0.26;
      float bgy = 0.33 + p.y * 0.34;

      // --- STRENGTH CONTROL ---
      // Adjust this to reduce overall "opacity" (0.0 = invisible, 1.0 = full)
      float shineStrength = 0.6; 

      // ── Foil texture simulation ──
      float2 foilUV = fract(uv * 3.0);
      float foilBase = 0.5
        + 0.25 * sin(foilUV.x * 18.85 + foilUV.y * 6.283)
        + 0.15 * sin((foilUV.x - foilUV.y) * 25.13)
        + 0.10 * cos((foilUV.x + foilUV.y) * 12.57);
      half3 foilC = half3(foilBase);

      // ── Diagonal stripes (133°) ──
      float dAng = 133.0 * PI / 180.0;
      float2 dDir = float2(cos(dAng), sin(dAng));
      half3 navy = half3(0.055, 0.082, 0.18); 
      half3 tealA = half3(0.54, 0.60, 0.60);  
      half3 tealB = half3(0.47, 0.66, 0.66);  

      // ── Radial gradient at pointer ──
      float radVal = 1.0 - mix(0.1, 0.25, smoothstep(0.12, 1.2, dist));
      half3 radC = half3(radVal);

      // ──────────────────────────────────────────────────────────────────────────
      //  MAIN SHINE LAYER
      // ──────────────────────────────────────────────────────────────────────────
      float sp1T = fract((uv.y + bgy * 6.0) / 2.45);
      half3 sp1 = sunpillar(sp1T);

      float dShift1 = bgx + bgy * 0.2;
      float dT1 = fract(dot(uv, dDir) / 0.36 + dShift1);
      float s1 = smoothstep(0.27, 0.375, dT1) * smoothstep(0.48, 0.375, dT1);
      half3 diag1 = mix(navy, mix(tealA, tealB, smoothstep(0.31, 0.375, dT1) * smoothstep(0.44, 0.375, dT1)), s1);

      half3 hl1     = hardLight3(radC, diag1);
      half3 hued1   = hueBlend(hl1, sp1);
      half3 mainOut = exclusion3(hued1, foilC);

      // Muted brightness in filter
      mainOut = cssFilter(mainOut, (fromCenter * 0.3 + 0.35) * shineStrength, 2.0, 1.5);

      // ──────────────────────────────────────────────────────────────────────────
      //  :AFTER LAYER
      // ──────────────────────────────────────────────────────────────────────────
      float sp2T = fract((uv.y + bgy * 3.0) / 1.4 + 0.167);
      half3 sp2 = sunpillar(sp2T);

      float dShift2 = -(bgx + bgy * 0.2);
      float dT2 = fract(dot(uv, dDir) / 0.234 + dShift2);
      float s2 = smoothstep(0.27, 0.375, dT2) * smoothstep(0.48, 0.375, dT2);
      half3 diag2 = mix(navy, mix(tealA, tealB, smoothstep(0.31, 0.375, dT2) * smoothstep(0.44, 0.375, dT2)), s2);

      half3 hl2      = hardLight3(radC, diag2);
      half3 hued2    = hueBlend(hl2, sp2);
      half3 afterOut = exclusion3(hued2, foilC);

      // Muted brightness in filter
      afterOut = cssFilter(afterOut, (fromCenter * 0.5 + 0.8) * shineStrength, 1.6, 1.4);

      half3 shineResult = exclusion3(mainOut, afterOut);

      // ──────────────────────────────────────────────────────────────────────────
      //  GLARE LAYER
      // ──────────────────────────────────────────────────────────────────────────
      half3 glareWarm = half3(0.90, 0.90, 0.90);
      half3 glareMid  = half3(0.428, 0.45, 0.473);
      half3 glareDark = half3(0.14, 0.06, 0.10);
      half3 glareC = mix(glareWarm, glareMid, smoothstep(0.05, 0.80, dist));
      glareC = mix(glareC, glareDark, smoothstep(0.80, 1.5, dist));
      glareC = cssFilter(glareC, 0.88, 2.25, 0.7);
      
      // Reduced glare opacity as well
      float glareAlpha = fromCenter * 0.55; 

      half3 darkened = min(shineResult, glareC);
      color = mix(shineResult, darkened, glareAlpha);
      
      // Final Opacity Clamp (For Color-Dodge, this acts as the "Fill" percentage)
      color *= shineStrength; 
      
      alpha = opacity;
    }
    return half4(color, clamp(alpha, 0.0, 1.0));
  }
`;

const GLARE_SRC = `
  uniform float2 resolution;
  uniform float2 pointer;
  uniform float  opacity;
  half4 main(float2 fc) {
    float2 uv = fc / resolution;
    float dist = distance(uv, pointer / resolution);
    float inner = 1.0 - smoothstep(0.0, 0.15, dist);
    float outer = 1.0 - smoothstep(0.15, 0.9, dist);
    return half4(half3(inner * 0.85 + outer * 0.12), (inner * 0.75 + outer * 0.15) * opacity * 0.55);
  }
`;

export const holoEffect  = Skia.RuntimeEffect.Make(HOLO_SRC)!;
export const glareEffect = Skia.RuntimeEffect.Make(GLARE_SRC)!;

// ─── TYPES & CONFIG ───────────────────────────────────────────────────────────

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legends' | 'Mythic' | 'Secret';

interface Props {
  title: string;
  rarity: Rarity;
  imageUri: string | number;
  cardWidth?: number;
  /** Called on tap with the card's on-screen rect (from measureInWindow) */
  onPress?: (x: number, y: number, w: number, h: number) => void;
}

export function getRarityConfig(rarity: Rarity) {
switch (rarity) {
    case 'Secret':  
      return { mode: 5, label: 'Secret', badgeColor: '#E63946', bgColors: ['#f2f2f2', '#e0e0e0', '#d0d0d0'], glowColor: 'transparent' };
    case 'Mythic':  
      return { mode: 4, label: 'Mythic', badgeColor: '#FFB703', bgColors: ['#1a140a', '#1e180e', '#140e06'], glowColor: 'transparent' };
    case 'Legends': 
      return { mode: 3, label: 'Legendary', badgeColor: '#00B4D8', bgColors: ['#1a0e0e', '#0e1a14', '#0e0e1a'], glowColor: 'transparent' };
    case 'Epic':    
      return { mode: 2, label: 'Epic', badgeColor: '#8338EC', bgColors: ['#0e1530', '#0a1028', '#08101e'], glowColor: 'transparent' };
    case 'Rare':    
      return { mode: 1, label: 'Rare', badgeColor: '#2A9D8F', bgColors: ['#0a1a12', '#0e1e16', '#081410'], glowColor: 'transparent' };
    default:        
      return { mode: 0, label: 'Common', badgeColor: '#6C757D', bgColors: ['#1a1a2e', '#16213e', '#0f3460'], glowColor: 'transparent' };
  }
}

// ─── SPRING CONFIGS (match Card.svelte) ───────────────────────────────────────

// Svelte springInteractSettings: { stiffness: 0.066, damping: 0.25 }
// → RN Reanimated equivalent: responsive, slightly underdamped
const INTERACT_SPRING = { damping: 20, stiffness: 180, mass: 1 };

// Svelte springPopoverSettings: { stiffness: 0.033, damping: 0.45 }
// → slower, more elastic pop
const POPOVER_SPRING = { damping: 14, stiffness: 90, mass: 1 };

// Svelte snap-back: { stiffness: 0.01, damping: 0.06 }
// → very slow, wobbly return
const SNAP_SPRING = { damping: 8, stiffness: 30, mass: 1.2 };

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function CulturalCardItem({ title, rarity, imageUri, cardWidth = 160, onPress }: Props) {
  const width  = cardWidth;
  const height = Math.round(width * 1.4);
  const BR     = Math.round(width * 0.07);
  const cfg    = useMemo(() => getRarityConfig(rarity), [rarity]);
  const cardArt = useImage(imageUri);

  // Ref used to measure the card's on-screen position for hero animation
  const containerRef = useRef<View>(null);

  // ── Shared values ──
  const rotateX  = useSharedValue(0);
  const rotateY  = useSharedValue(0);
  const pointerX = useSharedValue(width  / 2);
  const pointerY = useSharedValue(height / 2);
  const opacity  = useSharedValue(0);

  const fromCenter = useDerivedValue(() => {
    const dx = (pointerX.value - width  / 2) / (width  / 2);
    const dy = (pointerY.value - height / 2) / (height / 2);
    return Math.min(Math.sqrt(dx * dx + dy * dy), 1.0);
  });

  // ── Gestures ──

  // Measure card position then fire onPress with page coords
  const handleTap = () => {
    containerRef.current?.measureInWindow((x, y, w, h) => {
      onPress?.(x, y, w, h);
    });
  };

  // Pan: finger-tracking tilt (matches CSS interact logic)
  const panGesture = Gesture.Pan()
    .onBegin(() => { opacity.value = withSpring(1, INTERACT_SPRING); })
    .onUpdate((e) => {
      const centerX = (e.x / width)  * 100 - 50;
      const centerY = (e.y / height) * 100 - 50;
      rotateY.value  = -(centerX / 3.5);
      rotateX.value  =   centerY / 3.5;
      pointerX.value = e.x;
      pointerY.value = e.y;
    })
    .onFinalize(() => {
      rotateX.value  = withSpring(0, SNAP_SPRING);
      rotateY.value  = withSpring(0, SNAP_SPRING);
      pointerX.value = withSpring(width  / 2, SNAP_SPRING);
      pointerY.value = withSpring(height / 2, SNAP_SPRING);
      opacity.value  = withSpring(0, SNAP_SPRING);
    });

  // Tap: measure position and open overlay
  const tapGesture = Gesture.Tap().onEnd(() => { runOnJS(handleTap)(); });

  const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);

  // ── Animated styles ──
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
    shadowOpacity: opacity.value * 0.6,
  }));

  const uniforms = useDerivedValue(() => ({
    resolution:  [width, height],
    pointer:     [pointerX.value, pointerY.value],
    opacity:     opacity.value,
    mode:        cfg.mode,
    fromCenter:  fromCenter.value,
  }));

  return (
    <View ref={containerRef} style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.card, { width, height, borderRadius: BR, shadowColor: cfg.glowColor }, cardStyle]}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group>
              <Rect x={0} y={0} width={width} height={height}>
                <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={[...cfg.bgColors]} />
              </Rect>
              {cardArt && <Image image={cardArt} x={0} y={0} width={width} height={height} fit="cover" />}
              <Rect x={0} y={0} width={width} height={height} blendMode="colorDodge">
                <Shader source={holoEffect} uniforms={uniforms} />
              </Rect>
              {/* All modes bake custom glare; external overlay disabled */}
              {cfg.mode !== 5 && cfg.mode !== 4 && cfg.mode !== 3 && cfg.mode !== 2 && cfg.mode !== 1 && cfg.mode !== 0 && (
                <Rect x={0} y={0} width={width} height={height} blendMode="overlay">
                  <Shader source={glareEffect} uniforms={useDerivedValue(() => ({ resolution: [width, height], pointer: [pointerX.value, pointerY.value], opacity: opacity.value }))} />
                </Rect>
              )}
            </Group>
          </Canvas>

          <View style={[styles.badge, { backgroundColor: cfg.badgeColor }]}>
            <Text style={[styles.badgeText, { fontSize: width * 0.045 }]}>{cfg.label.toUpperCase()}</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    borderRadius: 8,
  },
  card: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderWidth: 0,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  badge: { position: 'absolute', top: '5%', right: '5%', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, zIndex: 10 },
  badgeText: { color: '#FFF', fontWeight: '900' },
});