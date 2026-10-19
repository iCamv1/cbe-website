/* ============================================================
   CBE Website — visual effects (progressive enhancement)
   1. Hero sheen: a small WebGL shader drifting soft cyan light
      streaks over the hero photo, like reflections on polished alloy.
   2. Card spotlight: a cursor-following glow on cards (desktop only).
   Everything here is optional: no WebGL, reduced motion, data saver
   or a hidden tab simply means the effect does nothing.
   ============================================================ */
(() => {
  'use strict';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;

  /* ── 1. Hero sheen ───────────────────────────────────────────── */
  function initHeroSheen() {
    if (reduceMotion || saveData) return;
    const hero = document.querySelector('.hero-v2, .finder-hero');
    const under = hero && (hero.querySelector('.hero-bg-img') || hero.querySelector('.finder-hero-bg'));
    if (!hero || !under) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'hero-sheen';
    canvas.setAttribute('aria-hidden', 'true');
    under.insertAdjacentElement('afterend', canvas);

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!gl) { canvas.remove(); return; }

    const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
    const frag = `
      precision mediump float;
      uniform vec2 r; uniform float t;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(7.,3.);a*=.5;}return v;}
      void main(){
        vec2 uv=gl_FragCoord.xy/r; uv.x*=r.x/r.y;
        float n=fbm(uv*1.4+vec2(t*.025,-t*.012));
        // slow diagonal streaks, warped by the noise so they read as reflections, not stripes
        float d=uv.x*.8-uv.y*1.1+n*1.6;
        float s1=pow(max(0.,sin(d*2.2+t*.11)),8.);
        float s2=pow(max(0.,sin(d*3.7-t*.07+1.7)),14.)*.6;
        float sheen=(s1+s2)*smoothstep(.0,.6,n);
        // fade to nothing at the top so the header stays clean, and at the bottom edge
        float v=smoothstep(.0,.25,uv.y/(r.x/r.y))*smoothstep(1.05,.55,uv.y/(r.x/r.y));
        vec3 col=mix(vec3(0.,.70,.85),vec3(.55,.85,1.),sheen)*sheen*.22*v;
        gl_FragColor=vec4(col,0.);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = sh(gl.VERTEX_SHADER, vert), fs = sh(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) { canvas.remove(); return; }
    const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const p = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't');
    gl.blendFunc(gl.ONE, gl.ONE); gl.enable(gl.BLEND);

    const SCALE = 0.5; // half resolution: the effect is soft, nobody can tell
    function resize() {
      const w = Math.max(1, Math.round(hero.clientWidth * SCALE)), h = Math.max(1, Math.round(hero.clientHeight * SCALE));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(uR, w, h); }
    }
    let visible = true, running = false, last = 0, start = performance.now();
    const FRAME = 1000 / 30;
    function frame(now) {
      if (!visible || document.hidden) { running = false; return; }
      if (now - last >= FRAME) { last = now; resize(); gl.uniform1f(uT, (now - start) / 1000); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
      requestAnimationFrame(frame);
    }
    function wake() { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(frame); } }
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }).observe(hero);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('resize', resize, { passive: true });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); canvas.remove(); });
    requestAnimationFrame(() => { canvas.classList.add('is-on'); wake(); });
  }

  /* ── 2. Card spotlight (pointer devices only) ────────────────── */
  function initCardSpotlight() {
    if (reduceMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const SEL = '.why-card, .product-card, .cert-card, .quick-contact-card, .cta-card, .quality-item, .finish-card, .fb-card';
    document.addEventListener('pointermove', e => {
      const card = e.target.closest && e.target.closest(SEL);
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
    document.body.classList.add('has-spotlight');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { initHeroSheen(); initCardSpotlight(); });
  else { initHeroSheen(); initCardSpotlight(); }
})();
