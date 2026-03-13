export const RARE_TIER = `
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
`;