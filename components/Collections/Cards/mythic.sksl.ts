export const MYTHIC_TIER = `
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
`;