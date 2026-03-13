export const EPIC_TIER = `
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
`;