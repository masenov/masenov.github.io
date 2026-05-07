/* =============================================================
   particles.js — drifting dots + connecting lines overlay.
   Lightweight, no dependencies. Honors prefers-reduced-motion
   and re-reads color when the theme toggles.
   ============================================================= */

(function () {
  'use strict';

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  var canvas = document.getElementById('bg-particles');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var DPR = Math.max(1, window.devicePixelRatio || 1);
  var W = 0, H = 0;
  var particles = [];
  var mouse = { x: -9999, y: -9999, active: false };

  var COUNT_BASE   = 70;     // tuned for ~1440px wide
  var LINK_DIST    = 130;    // px between particles to draw a line
  var MOUSE_DIST   = 170;    // px from cursor to draw a line
  var SPEED        = 0.18;   // px / frame, very slow drift
  var DOT_RADIUS   = 1.6;
  var rgb = '136,136,136';   // updated from CSS var on init / theme change

  function readThemeColor() {
    var v = getComputedStyle(document.documentElement)
              .getPropertyValue('--muted').trim() || '#888888';
    rgb = hexToRgb(v) || rgb;
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(function (c) { return c + c; }).join('');
    }
    if (hex.length !== 6) return null;
    var n = parseInt(hex, 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var target = Math.round(COUNT_BASE * Math.min(1.2, Math.max(0.4, W / 1440)));
    while (particles.length < target) particles.push(spawn());
    while (particles.length > target) particles.pop();
  }

  function spawn() {
    var a = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(a) * SPEED * (0.5 + Math.random()),
      vy: Math.sin(a) * SPEED * (0.5 + Math.random())
    };
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;

      ctx.fillStyle = 'rgba(' + rgb + ',0.55)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var i2 = 0; i2 < particles.length; i2++) {
      var a = particles[i2];
      for (var j = i2 + 1; j < particles.length; j++) {
        var b = particles[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          var alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.18;
          ctx.strokeStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      if (mouse.active) {
        var mdx = a.x - mouse.x, mdy = a.y - mouse.y;
        var md2 = mdx * mdx + mdy * mdy;
        if (md2 < MOUSE_DIST * MOUSE_DIST) {
          var ma = (1 - Math.sqrt(md2) / MOUSE_DIST) * 0.32;
          ctx.strokeStyle = 'rgba(' + rgb + ',' + ma.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(step);
  }

  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  }, { passive: true });

  window.addEventListener('mouseleave', function () { mouse.active = false; });

  window.addEventListener('click', function (e) {
    var cx = e.clientX, cy = e.clientY;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var dx = p.x - cx, dy = p.y - cy;
      var d2 = dx * dx + dy * dy;
      if (d2 < 200 * 200 && d2 > 1) {
        var d = Math.sqrt(d2);
        var force = (1 - d / 200) * 1.4;
        p.vx += (dx / d) * force;
        p.vy += (dy / d) * force;
      }
    }
    setTimeout(function () {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (sp > SPEED * 1.2) {
          p.vx = (p.vx / sp) * SPEED * (0.5 + Math.random());
          p.vy = (p.vy / sp) * SPEED * (0.5 + Math.random());
        }
      }
    }, 700);
  });

  window.addEventListener('resize', resize);

  new MutationObserver(readThemeColor).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });

  readThemeColor();
  resize();
  requestAnimationFrame(step);
})();
