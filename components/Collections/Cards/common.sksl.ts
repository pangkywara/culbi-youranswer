export const COMMON_TIER = `
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
`;