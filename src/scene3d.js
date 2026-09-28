/* ==========================================================================
   scene3d.js — cinematic 3D background for the home hero.

   Why raw WebGL instead of three.js: the whole scene is one flat-shaded
   icosphere + two hairline orbit rings = 3 draw calls. Shipping three.js
   (~600 kB) for that would cost more than it gives; this module is ~10 kB,
   lazy-loaded via dynamic import, and owns every optimisation knob:

     · nothing moves on the main thread except 3 matrices per frame
     · devicePixelRatio capped (1.75 desktop / 1.5 small screens)
     · pauses when the hero is off-screen (IntersectionObserver) or the tab
       is hidden; one static frame is enough for prefers-reduced-motion
     · zero per-frame allocations (all scratch matrices pre-allocated)
     · scroll + pointer motion are lerped (exp smoothing), never jumpy
     · theme colours swap live when data-theme flips — no context rebuild
     · WebGL context-loss recovery + self-disposal when the canvas unmounts
     · GLSL ES 1.00 shaders work on both WebGL1 and WebGL2
   ========================================================================== */

/* ------------------------------ geometry ------------------------------- */

function buildIcosphere(subdivisions) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(norm);
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let s = 0; s < subdivisions; s += 1) {
    const cache = new Map();
    const mid = (a, b) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      let idx = cache.get(key);
      if (idx === undefined) {
        idx = verts.length;
        verts.push(norm(verts[a].map((v, i) => v + (verts[b][i] - v) / 2)));
        cache.set(key, idx);
      }
      return idx;
    };
    const next = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b); const bc = mid(b, c); const ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  /* flat shading: duplicate verts per face with one face normal */
  const out = new Float32Array(faces.length * 18);
  let o = 0;
  for (const [ia, ib, ic] of faces) {
    const a = verts[ia]; const b = verts[ib]; const c = verts[ic];
    const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
    const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    for (const v of [a, b, c]) { out[o] = v[0]; out[o + 1] = v[1]; out[o + 2] = v[2]; out[o + 3] = nx; out[o + 4] = ny; out[o + 5] = nz; o += 6; }
  }
  return out;
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
}

function buildTorus(R, r, segsR, segsT) {
  const out = new Float32Array(segsR * segsT * 6 * 6);
  let o = 0;
  const point = (u, v) => {
    const cu = Math.cos(u); const su = Math.sin(u); const cv = Math.cos(v); const sv = Math.sin(v);
    const x = (R + r * cv) * cu; const y = (R + r * cv) * su; const z = r * sv;
    const cx = R * cu; const cy = R * su;
    return [x, y, z, x - cx, y - cy, z];
  };
  for (let i = 0; i < segsR; i += 1) {
    for (let j = 0; j < segsT; j += 1) {
      const u0 = (i / segsR) * Math.PI * 2; const u1 = ((i + 1) / segsR) * Math.PI * 2;
      const v0 = (j / segsT) * Math.PI * 2; const v1 = ((j + 1) / segsT) * Math.PI * 2;
      const p00 = point(u0, v0); const p10 = point(u1, v0); const p01 = point(u0, v1); const p11 = point(u1, v1);
      for (const [a, b, c] of [[p00, p10, p11], [p00, p11, p01]]) {
        /* smooth normals for the ring (glossy hairline) */
        for (const p of [a, b, c]) {
          const nl = Math.hypot(p[3], p[4], p[5]) || 1;
          out[o] = p[0]; out[o + 1] = p[1]; out[o + 2] = p[2];
          out[o + 3] = p[3] / nl; out[o + 4] = p[4] / nl; out[o + 5] = p[5] / nl;
          o += 6;
        }
      }
    }
  }
  return out;
}

/* ------------------------------ shaders -------------------------------- */

const VERT = `
attribute vec3 aPos;
attribute vec3 aNrm;
uniform mat4 uProj;
uniform mat4 uMV;
uniform mat3 uNrm;
varying vec3 vN;
varying vec3 vV;
varying float vFog;
void main() {
  vN = normalize(uNrm * aNrm);
  vec4 mv = uMV * vec4(aPos, 1.0);
  vV = -mv.xyz;
  float d = length(mv.xyz);
  vFog = 1.0 - smoothstep(2.55, 4.45, d);
  gl_Position = uProj * mv;
}`;

const FRAG = `
precision mediump float;
varying vec3 vN;
varying vec3 vV;
varying float vFog;
uniform vec3 uBase;
uniform vec3 uRim;
uniform vec3 uLight;
uniform float uAlpha;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float diff = max(dot(n, normalize(uLight)), 0.0);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.2);
  vec3 col = uBase * (0.40 + 0.60 * diff) + uRim * rim * 0.5;
  float a = vFog * uAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(col, a);
}`;

/* ------------------------- minimal mat4 (no three.js) ------------------- */

function mPerspective(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2); const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect; out[5] = f;
  out[10] = (far + near) * nf; out[11] = -1;
  out[14] = 2 * far * near * nf;
}

/* out = T(tx,ty,tz) · Ry(ry) · Rx(rx) · S(s) — column major, no allocation */
function mModel(out, tx, ty, tz, rx, ry, s) {
  const cy = Math.cos(ry); const sy = Math.sin(ry);
  const cx = Math.cos(rx); const sx = Math.sin(rx);
  out[0] = cy * s; out[1] = sy * sx * s; out[2] = sy * cx * s; out[3] = 0;
  out[4] = 0; out[5] = cx * s; out[6] = -sx * s; out[7] = 0;
  out[8] = -sy * s; out[9] = cy * sx * s; out[10] = cy * cx * s; out[11] = 0;
  out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
}

/* ----------------------------- the scene -------------------------------- */

const THEMES = {
  warm: {
    sphere: [0.72, 0.81, 0.88], rim: [0.18, 0.27, 0.37],
    ring1: [0.42, 0.53, 0.64], ring2: [0.58, 0.67, 0.75],
  },
  dim: {
    sphere: [0.20, 0.30, 0.43], rim: [0.84, 0.91, 0.97],
    ring1: [0.55, 0.68, 0.80], ring2: [0.44, 0.56, 0.70],
  },
};
const LIGHT_DIR = [-0.45, 0.75, 0.62];

export function mountHeroScene(canvas) {
  /* Feature + environment guards — jsdom/old browsers bail out silently and
     the plain CSS hero remains, exactly as before. */
  if (typeof window === 'undefined' || !canvas || !canvas.parentElement) return null;

  const GL_OPTS = {
    alpha: true, antialias: true, depth: true, stencil: false,
    premultipliedAlpha: false, powerPreference: 'low-power',
  };
  let gl = null;
  try {
    gl = canvas.getContext('webgl2', GL_OPTS) || canvas.getContext('webgl', GL_OPTS);
  } catch { gl = null; }
  if (!gl || typeof gl.createShader !== 'function') { canvas.remove(); return null; }

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDim = () => document.documentElement.getAttribute('data-theme') === 'dim';

  /* ---- GL state ---- */
  let prog = null; let loc = null;
  const meshes = {}; /* sphere, ring1, ring2 → { buf, count } */

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`shader: ${gl.getShaderInfoLog(sh)}`);
    return sh;
  }

  function initGL() {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos'); gl.bindAttribLocation(prog, 1, 'aNrm');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`link: ${gl.getProgramInfoLog(prog)}`);
    loc = {
      proj: gl.getUniformLocation(prog, 'uProj'), mv: gl.getUniformLocation(prog, 'uMV'),
      nrm: gl.getUniformLocation(prog, 'uNrm'), base: gl.getUniformLocation(prog, 'uBase'),
      rim: gl.getUniformLocation(prog, 'uRim'), light: gl.getUniformLocation(prog, 'uLight'),
      alpha: gl.getUniformLocation(prog, 'uAlpha'),
    };
    gl.useProgram(prog);
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);

    const make = (data) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return { buf, count: data.length / 6 };
    };
    meshes.sphere = make(buildIcosphere(2));          /* 960 verts, flat shaded */
    meshes.ring1 = make(buildTorus(1.52, 0.013, 36, 8));
    meshes.ring2 = make(buildTorus(1.86, 0.009, 36, 8));

    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.uniform3fv(loc.light, LIGHT_DIR);
  }

  try { initGL(); } catch { canvas.remove(); return null; }

  /* ---- scratch state (pre-allocated once) ---- */
  const P = new Float32Array(16); const M = new Float32Array(16); const N3 = new Float32Array(9);
  let width = 0; let height = 0; let dpr = 1;

  const state = {
    p: 0, targetP: 0,        /* scroll progress through the hero 0..1 */
    mx: 0, my: 0, px: 0, py: 0, /* pointer parallax raw / lerped */
    cx: 1, cy: 0, s: 1,      /* current layout  */
    tcx: 1, tcy: 0, ts: 1,   /* target layout   */
    visible: true, dead: false, raf: 0, last: 0, t0: 0,
  };
  state.t0 = performance.now();

  function resize() {
    const host = canvas.parentElement; if (!host) return;
    width = host.clientWidth; height = host.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, width < 720 ? 1.5 : 1.75);
    const px = Math.max(1, Math.round(width * dpr)); const py = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== px || canvas.height !== py) { canvas.width = px; canvas.height = py; }
    const aspect = width / Math.max(1, height);
    /* narrow viewports need a wider lens or the orbit rings blow past the frame */
    const fov = aspect < 0.75 ? 56 : 38;
    mPerspective(P, fov * Math.PI / 180, aspect, 0.1, 20);
    /* keep the object right-of-centre behind the showcase; on phones tuck it
       down beside the toolbox window so the headline stays readable */
    const wide = aspect > 1.02;
    state.tcx = wide ? 0.98 : 0;
    state.tcy = wide ? -0.02 : -0.85;
    state.ts = wide ? 1 : 0.82;
  }

  function draw(now) {
    const dt = Math.min(0.1, Math.max(0.001, (now - state.last) / 1000));
    state.last = now;
    const t = (now - state.t0) / 1000;

    /* read scroll fresh every frame (no listeners, no layout forcing beyond
       one cached host height) and ease toward it — the VECTRUS lerp */
    const host = canvas.parentElement;
    const span = Math.max(1, (host ? host.offsetHeight : 1) * 0.95);
    state.targetP = Math.min(1, Math.max(0, (window.scrollY || 0) / span));
    const k = 1 - Math.exp(-dt * 8);
    state.p += (state.targetP - state.p) * k;
    state.cx += (state.tcx - state.cx) * k;
    state.cy += (state.tcy - state.cy) * k;
    state.s += (state.ts - state.s) * k;
    state.px += (state.mx - state.px) * (1 - Math.exp(-dt * 6));
    state.py += (state.my - state.py) * (1 - Math.exp(-dt * 6));

    const p = state.p;
    const theme = isDim() ? THEMES.dim : THEMES.warm;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.proj, false, P);
    gl.uniform3fv(loc.rim, theme.rim);

    /* camera sits at z=4.1 (view folded into the model translation) */
    const zed = -4.1;
    const rise = p * 1.55;                    /* scroll lifts the object out of frame */
    const spin = t * 0.14 + p * 2.3;          /* idle drift + scroll spin */

    const drawMesh = (mesh, tx, ty, tz, rx, ry, s, color, alpha) => {
      mModel(M, tx, ty, zed + tz, rx, ry, s);
      N3[0] = M[0]; N3[1] = M[1]; N3[2] = M[2];
      N3[3] = M[4]; N3[4] = M[5]; N3[5] = M[6];
      N3[6] = M[8]; N3[7] = M[9]; N3[8] = M[10];
      gl.uniformMatrix4fv(loc.mv, false, M);
      gl.uniformMatrix3fv(loc.nrm, false, N3);
      gl.uniform3fv(loc.base, color);
      gl.uniform1f(loc.alpha, alpha);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    };

    const cx = state.cx + state.px * 0.10;
    const cy = state.cy + rise + state.py * 0.08;
    const sc = state.s * (1 + p * 0.06);

    drawMesh(meshes.sphere, cx, cy, 0, 0.16 + state.py * 0.12, spin, sc * 0.94, theme.sphere, (0.96 - p * 0.82));
    drawMesh(meshes.ring1, cx, cy, 0, 1.15 + state.py * 0.05 + t * 0.03, spin * 0.6, sc, theme.ring1, (0.62 - p * 0.52));
    drawMesh(meshes.ring2, cx, cy, -0.1, 1.42 - t * 0.02, spin * 0.45, sc, theme.ring2, (0.42 - p * 0.36));
  }

  /* ---- loop + lifecycle ---- */
  function frame(now) {
    if (state.dead || !canvas.isConnected) { dispose(); return; }
    if (!document.hidden && (state.visible || IO === null)) draw(now);
    state.raf = requestAnimationFrame(frame);
  }

  function staticFrame(reason) {
    if (reason !== 'init' && state.dead) return;
    state.last = performance.now();
    resize(); draw(state.last);
    canvas.classList.add('ready');
  }

  let RO = null; let IO = null; let MO = null;
  const RO_C = typeof ResizeObserver === 'function' ? ResizeObserver : null;
  const IO_C = typeof IntersectionObserver === 'function' ? IntersectionObserver : null;
  const MO_C = typeof MutationObserver === 'function' ? MutationObserver : null;

  if (RO_C) { RO = new RO_C(() => { resize(); if (reduced()) staticFrame('resize'); }); RO.observe(canvas.parentElement); }
  else window.addEventListener('resize', resize, { passive: true });

  if (IO_C) { IO = new IO_C(([e]) => { state.visible = e.isIntersecting; }, { threshold: 0.02 }); IO.observe(canvas); }

  const themeChanged = () => { if (reduced()) staticFrame('theme'); };
  if (MO_C) { MO = new MO_C(themeChanged); MO.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); }

  const onPointer = (e) => {
    const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    state.mx = nx; state.my = ny;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const onLost = (e) => { e.preventDefault(); cancelAnimationFrame(state.raf); };
  const onRestored = () => { try { initGL(); } catch { dispose(); return; } resize(); state.last = performance.now(); state.raf = requestAnimationFrame(frame); };
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  function dispose() {
    if (state.dead) return;
    state.dead = true;
    cancelAnimationFrame(state.raf);
    RO?.disconnect(); IO?.disconnect(); MO?.disconnect();
    window.removeEventListener('pointermove', onPointer);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ }
    canvas.remove();
  }

  resize();
  if (reduced()) { staticFrame('init'); return { dispose }; }
  state.last = performance.now();
  /* fade in once the first real frame lands */
  state.raf = requestAnimationFrame((now) => {
    draw(now);
    canvas.classList.add('ready');
    state.raf = requestAnimationFrame(frame);
  });
  return { dispose };
}
