export const SHADER_HELPERS = `
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

  half hardLight(half bg, half fg) {
    return fg < 0.5 ? 2.0 * bg * fg : 1.0 - 2.0 * (1.0 - bg) * (1.0 - fg);
  }

  half3 hardLight3(half3 bg, half3 fg) {
    return half3(hardLight(bg.r,fg.r), hardLight(bg.g,fg.g), hardLight(bg.b,fg.b));
  }

  half3 exclusion3(half3 a, half3 b) {
    return a + b - 2.0 * a * b;
  }

  half3 hueBlend(half3 bg, half3 fg) {
    float bgLum  = dot(bg, half3(0.299, 0.587, 0.114));
    float fgLum  = max(dot(fg, half3(0.299, 0.587, 0.114)), 0.001);
    return fg * (bgLum / fgLum);
  }

  half3 cssFilter(half3 c, float bright, float contrast, float sat) {
    c = c * bright;
    c = clamp((c - 0.5) * contrast + 0.5, 0.0, 1.0);
    float g = dot(c, half3(0.299, 0.587, 0.114));
    return clamp(mix(half3(g), c, sat), 0.0, 1.0);
  }

  half softLight(half bg, half fg) {
    if (fg <= 0.5) return bg - (1.0 - 2.0 * fg) * bg * (1.0 - bg);
    half d = bg <= 0.25 ? ((16.0 * bg - 12.0) * bg + 4.0) * bg : sqrt(bg);
    return bg + (2.0 * fg - 1.0) * (d - bg);
  }

  half3 softLight3(half3 bg, half3 fg) {
    return half3(softLight(bg.r,fg.r), softLight(bg.g,fg.g), softLight(bg.b,fg.b));
  }

  half3 colorBurn3(half3 bg, half3 fg) {
    half r = fg.r <= 0.0 ? 0.0 : max(0.0, 1.0 - (1.0 - bg.r) / fg.r);
    half g = fg.g <= 0.0 ? 0.0 : max(0.0, 1.0 - (1.0 - bg.g) / fg.g);
    half b = fg.b <= 0.0 ? 0.0 : max(0.0, 1.0 - (1.0 - bg.b) / fg.b);
    return half3(r, g, b);
  }

  half3 colorDodge3(half3 bg, half3 fg) {
    half r = fg.r >= 1.0 ? 1.0 : min(1.0, bg.r / (1.0 - fg.r));
    half g = fg.g >= 1.0 ? 1.0 : min(1.0, bg.g / (1.0 - fg.g));
    half b = fg.b >= 1.0 ? 1.0 : min(1.0, bg.b / (1.0 - fg.b));
    return half3(r, g, b);
  }

  half3 satBlend(half3 bg, half3 fg) {
    float bgL = dot(bg, half3(0.299, 0.587, 0.114));
    float fgSat = max(max(fg.r, fg.g), fg.b) - min(min(fg.r, fg.g), fg.b);
    float bgSat = max(max(bg.r, bg.g), bg.b) - min(min(bg.r, bg.g), bg.b);
    if (bgSat < 0.001) return half3(bgL);
    half3 r = half3(bgL) + (bg - half3(bgL)) * (fgSat / bgSat);
    float rL = dot(r, half3(0.299, 0.587, 0.114));
    return clamp(r + (bgL - rL), 0.0, 1.0);
  }

  float arGlitter(float2 uv, float2 off) {
    float2 gUV = (uv + off) * 4.0;
    float g1 = hash21(floor(gUV * 50.0));
    float g2 = hash21(floor(gUV * 18.0) + 777.0);
    float base = 0.35 + g1 * 0.35 + g2 * 0.1;
    base += step(0.93, g1) * 0.3;
    return base;
  }

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
`;