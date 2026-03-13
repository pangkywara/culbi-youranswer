export const SECRET_TIER = `
// ── 5: SECRET — SHINY V (ULTRA RARE) ──
    else {
      float bgx = 0.37 + p.x * 0.26;
      float bgy = 0.33 + p.y * 0.34;
      float shineStrength = 0.6; 

      float2 foilUV = fract(uv * 3.0);
      float foilBase = 0.5 + 0.25 * sin(foilUV.x * 18.85 + foilUV.y * 6.283) + 0.15 * sin((foilUV.x - foilUV.y) * 25.13) + 0.10 * cos((foilUV.x + foilUV.y) * 12.57);
      half3 foilC = half3(foilBase);

      float dAng = 133.0 * PI / 180.0;
      float2 dDir = float2(cos(dAng), sin(dAng));
      half3 navy = half3(0.055, 0.082, 0.18); 
      half3 tealA = half3(0.54, 0.60, 0.60);  
      half3 tealB = half3(0.47, 0.66, 0.66);  

      float radVal = 1.0 - mix(0.1, 0.25, smoothstep(0.12, 1.2, dist));
      half3 radC = half3(radVal);

      float sp1T = fract((uv.y + bgy * 6.0) / 2.45);
      half3 sp1 = sunpillar(sp1T);

      float dShift1 = bgx + bgy * 0.2;
      float dT1 = fract(dot(uv, dDir) / 0.36 + dShift1);
      float s1 = smoothstep(0.27, 0.375, dT1) * smoothstep(0.48, 0.375, dT1);
      half3 diag1 = mix(navy, mix(tealA, tealB, smoothstep(0.31, 0.375, dT1) * smoothstep(0.44, 0.375, dT1)), s1);

      half3 hl1     = hardLight3(radC, diag1);
      half3 hued1   = hueBlend(hl1, sp1);
      half3 mainOut = exclusion3(hued1, foilC);
      mainOut = cssFilter(mainOut, (fromCenter * 0.3 + 0.35) * shineStrength, 2.0, 1.5);

      float sp2T = fract((uv.y + bgy * 3.0) / 1.4 + 0.167);
      half3 sp2 = sunpillar(sp2T);

      float dShift2 = -(bgx + bgy * 0.2);
      float dT2 = fract(dot(uv, dDir) / 0.234 + dShift2);
      float s2 = smoothstep(0.27, 0.375, dT2) * smoothstep(0.48, 0.375, dT2);
      half3 diag2 = mix(navy, mix(tealA, tealB, smoothstep(0.31, 0.375, dT2) * smoothstep(0.44, 0.375, dT2)), s2);

      half3 hl2      = hardLight3(radC, diag2);
      half3 hued2    = hueBlend(hl2, sp2);
      half3 afterOut = exclusion3(hued2, foilC);
      afterOut = cssFilter(afterOut, (fromCenter * 0.5 + 0.8) * shineStrength, 1.6, 1.4);

      half3 shineResult = exclusion3(mainOut, afterOut);

      half3 glareC = cssFilter(mix(mix(half3(0.90, 0.90, 0.90), half3(0.428, 0.45, 0.473), smoothstep(0.05, 0.80, dist)), half3(0.14, 0.06, 0.10), smoothstep(0.80, 1.5, dist)), 0.88, 2.25, 0.7);
      
      color = mix(shineResult, min(shineResult, glareC), fromCenter * 0.55);
      color *= shineStrength; 
      alpha = opacity;
    }
`;