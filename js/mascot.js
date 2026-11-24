/* ============================================================
   MESIN MASKOT "LUMI" — teman pendamping skrining
   ------------------------------------------------------------
   Maskot dibuat dari SVG murni sehingga ringan, tajam di semua
   resolusi, dan bisa dianimasikan lewat CSS + JS.

   State animasi yang tersedia:
   - idle     : bernapas, berkedip, mengapung pelan
   - wave     : melambaikan tangan (ajakan bermain)
   - bounce   : lompat kecil gembira
   - cheer    : kedua tangan ke atas + percikan bintang
   - talk     : mulut bergerak saat teks diketik di bubble
   - worried  : ekspresi khawatir (dipakai saat validasi gagal)
   - think    : merenung (menoleh ke atas)

   Cara pakai:
     const lumi = createMascot(document.querySelector("#slot"));
     lumi.setState("wave");
     lumi.say("Hai! Ayo main bareng aku!");
   ============================================================ */

(function () {
  "use strict";

  const REDUCED_MOTION = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE_POINTER = window.matchMedia &&
    window.matchMedia("(pointer: fine)").matches;

  let uidCounter = 0;
  const activeMascots = [];

  function svgTemplate(uid) {
    return '' +
'<svg class="m-svg" viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' +
'  <defs>' +
'    <radialGradient id="mg-body-' + uid + '" cx="38%" cy="28%" r="80%">' +
'      <stop offset="0%" stop-color="#C4B5FD"/>' +
'      <stop offset="45%" stop-color="#8B5CF6"/>' +
'      <stop offset="100%" stop-color="#6D28D9"/>' +
'    </radialGradient>' +
'    <radialGradient id="mg-blush-' + uid + '" cx="50%" cy="50%" r="50%">' +
'      <stop offset="0%" stop-color="#F9A8D4" stop-opacity="0.85"/>' +
'      <stop offset="100%" stop-color="#F9A8D4" stop-opacity="0"/>' +
'    </radialGradient>' +
'  </defs>' +
'  <ellipse class="m-shadow" cx="110" cy="192" rx="48" ry="8" fill="#3B0764" opacity="0.14"/>' +
'  <g class="m-root">' +
'    <g class="m-body">' +
'      <g class="m-arm m-arm-l" transform="translate(58,102)">' +
'        <g class="m-arm-inner"><path d="M0 0 C -14 6 -23 18 -26 33" stroke="url(#mg-body-' + uid + ')" stroke-width="17" stroke-linecap="round" fill="none"/></g>' +
'      </g>' +
'      <g class="m-arm m-arm-r" transform="translate(162,102)">' +
'        <g class="m-arm-inner"><path d="M0 0 C 14 6 23 18 26 33" stroke="url(#mg-body-' + uid + ')" stroke-width="17" stroke-linecap="round" fill="none"/></g>' +
'      </g>' +
'      <path class="m-blob" d="M110 26 C 152 26 176 58 176 100 C 176 148 148 182 110 182 C 72 182 44 148 44 100 C 44 58 68 26 110 26 Z" fill="url(#mg-body-' + uid + ')"/>' +
'      <ellipse class="m-belly" cx="110" cy="152" rx="30" ry="17" fill="#EDE9FE" opacity="0.42"/>' +
'      <ellipse class="m-foot" cx="88" cy="184" rx="13" ry="7" fill="#5B21B6"/>' +
'      <ellipse class="m-foot" cx="132" cy="184" rx="13" ry="7" fill="#5B21B6"/>' +
'      <path class="m-antenna" d="M110 26 C 108 15 115 8 125 6" stroke="#4C1D95" stroke-width="4" fill="none" stroke-linecap="round"/>' +
'      <ellipse class="m-leaf" cx="130" cy="6" rx="9" ry="5" fill="#6EE7B7" transform="rotate(-28 130 6)"/>' +
'      <g class="m-face" transform="translate(110,92)">' +
'        <g class="m-eyes">' +
'          <g class="m-eye" transform="translate(-26,0)">' +
'            <circle class="m-eye-white" r="12.5" fill="#FFFFFF"/>' +
'            <circle class="m-pupil" r="6" fill="#2E1065"/>' +
'            <circle class="m-shine" cx="-2.5" cy="-4" r="2.4" fill="#FFFFFF"/>' +
'          </g>' +
'          <g class="m-eye" transform="translate(26,0)">' +
'            <circle class="m-eye-white" r="12.5" fill="#FFFFFF"/>' +
'            <circle class="m-pupil" r="6" fill="#2E1065"/>' +
'            <circle class="m-shine" cx="-2.5" cy="-4" r="2.4" fill="#FFFFFF"/>' +
'          </g>' +
'        </g>' +
'        <ellipse class="m-brow m-brow-l" cx="-26" cy="-17" rx="8" ry="2.6" fill="#4C1D95" opacity="0"/>' +
'        <ellipse class="m-brow m-brow-r" cx="26" cy="-17" rx="8" ry="2.6" fill="#4C1D95" opacity="0"/>' +
'        <ellipse class="m-blush m-blush-l" cx="-38" cy="14" rx="10" ry="6" fill="url(#mg-blush-' + uid + ')"/>' +
'        <ellipse class="m-blush m-blush-r" cx="38" cy="14" rx="10" ry="6" fill="url(#mg-blush-' + uid + ')"/>' +
'        <path class="m-mouth m-mouth-smile" d="M -9 16 Q 0 25 9 16" stroke="#2E1065" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
'        <g class="m-mouth m-mouth-open"><ellipse cx="0" cy="20" rx="8" ry="6" fill="#2E1065"/><ellipse cx="0" cy="23" rx="4" ry="2.6" fill="#F472B6"/></g>' +
'        <path class="m-mouth m-mouth-worried" d="M -8 22 Q 0 15 8 22" stroke="#2E1065" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
'      </g>' +
'      <g class="m-sparkles">' +
'        <path class="m-spark m-spark-1" d="M16 36 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#FDE047"/>' +
'        <path class="m-spark m-spark-2" d="M204 52 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#F9A8D4"/>' +
'        <path class="m-spark m-spark-3" d="M196 128 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z" fill="#93C5FD"/>' +
'        <path class="m-spark m-spark-4" d="M12 118 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z" fill="#A7F3D0"/>' +
'      </g>' +
'    </g>' +
'  </g>' +
'</svg>';
  }

  /* ---------- efek global: confetti ---------- */

  const FX_COLORS = ["#8B5CF6", "#A78BFA", "#F9A8D4", "#6EE7B7", "#FDE047", "#93C5FD", "#F472B6"];

  function ensureFxLayer() {
    let layer = document.getElementById("fx-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "fx-layer";
      layer.setAttribute("aria-hidden", "true");
      document.body.appendChild(layer);
    }
    return layer;
  }

  function confetti(x, y, count) {
    if (REDUCED_MOTION) return;
    count = count || 22;
    const layer = ensureFxLayer();
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "fx-confetti";
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.setProperty("--dx", Math.round(Math.random() * 280 - 140) + "px");
      p.style.setProperty("--rot", Math.round(Math.random() * 720 - 360) + "deg");
      p.style.setProperty("--dur", Math.round(850 + Math.random() * 900) + "ms");
      p.style.setProperty("--delay", Math.round(Math.random() * 160) + "ms");
      p.style.background = FX_COLORS[i % FX_COLORS.length];
      const shape = i % 3;
      if (shape === 0) p.style.borderRadius = "50%";
      else if (shape === 1) p.style.clipPath = "polygon(50% 0, 100% 100%, 0 100%)";
      layer.appendChild(p);
      window.setTimeout(function () {
        if (p.parentNode) p.parentNode.removeChild(p);
      }, 2000);
    }
  }

  function celebration() {
    if (REDUCED_MOTION) return;
    const w = window.innerWidth;
    confetti(w * 0.18, window.innerHeight * 0.22, 26);
    window.setTimeout(function () { confetti(w * 0.5, window.innerHeight * 0.14, 30); }, 220);
    window.setTimeout(function () { confetti(w * 0.82, window.innerHeight * 0.24, 26); }, 440);
    window.setTimeout(function () { confetti(w * 0.35, window.innerHeight * 0.1, 22); }, 700);
    window.setTimeout(function () { confetti(w * 0.66, window.innerHeight * 0.12, 22); }, 950);
  }

  /* ---------- mesin maskot ---------- */

  function createMascot(container, opts) {
    opts = opts || {};
    if (!container) throw new Error("createMascot: container wajib ada");
    const uid = "m" + (++uidCounter);
    const name = opts.name || (window.SITE_CONFIG && window.SITE_CONFIG.namaMaskot) || "Lumi";

    const wrap = document.createElement("div");
    wrap.className = "mascot-wrap " + (opts.variant === "hero" ? "mascot-hero" : "mascot-companion");
    wrap.innerHTML =
      '<div class="m-bubble" role="status" aria-live="polite">' +
      '  <span class="m-bubble-name">' + name + "</span>" +
      '  <span class="m-bubble-text"></span>' +
      "</div>" +
      '<div class="mascot-stage">' + svgTemplate(uid) + "</div>";
    container.appendChild(wrap);

    const root = wrap.querySelector(".m-root");
    const svg = wrap.querySelector(".m-svg");
    const bubble = wrap.querySelector(".m-bubble");
    const bubbleText = wrap.querySelector(".m-bubble-text");
    const pupils = Array.prototype.slice.call(wrap.querySelectorAll(".m-pupil"));

    let state = "idle";
    let sayTimer = null;
    let typeTimer = null;
    let stateTimer = null;
    let bubbleHideTimer = null;

    function setState(next, ms) {
      if (stateTimer) { window.clearTimeout(stateTimer); stateTimer = null; }
      state = next;
      svg.classList.remove("is-wave", "is-bounce", "is-cheer", "is-talk", "is-worried", "is-think");
      if (next !== "idle") svg.classList.add("is-" + next);
      if (ms && !REDUCED_MOTION) {
        stateTimer = window.setTimeout(function () { setState("idle"); }, ms);
      }
    }

    function stopTyping() {
      if (typeTimer) { window.clearInterval(typeTimer); typeTimer = null; }
      svg.classList.remove("is-talk");
    }

    function clearBubbleNow() {
      if (sayTimer) { window.clearTimeout(sayTimer); sayTimer = null; }
      stopTyping();
      if (bubbleHideTimer) { window.clearTimeout(bubbleHideTimer); bubbleHideTimer = null; }
      bubble.classList.remove("is-show");
    }

    /** Tampilkan bubble dengan efek mesin ketik; maskot ikut "bicara". */
    function say(text, opts2) {
      opts2 = opts2 || {};
      const hold = typeof opts2.hold === "number" ? opts2.hold : 3400;
      const speed = typeof opts2.speed === "number" ? opts2.speed : 20;
      clearBubbleNow();
      bubbleText.textContent = "";
      bubble.classList.add("is-show");
      if (REDUCED_MOTION) {
        bubbleText.textContent = text;
        sayTimer = window.setTimeout(clearBubbleNow, hold);
        return;
      }
      let i = 0;
      svg.classList.add("is-talk");
      typeTimer = window.setInterval(function () {
        i += 1;
        bubbleText.textContent = text.slice(0, i);
        if (i >= text.length) {
          stopTyping();
          sayTimer = window.setTimeout(clearBubbleNow, hold);
        }
      }, speed);
    }

    /* Reaksi cepat siap pakai */
    function wave(ms) { setState("wave", ms || 1500); }
    function bounce(ms) { setState("bounce", ms || 1000); }
    function cheer(ms) { setState("cheer", ms || 1800); }
    function worried(ms) { setState("worried", ms || 1600); }
    function think(ms) { setState("think", ms || 2400); }
    function idle() { setState("idle"); }

    /* Kedip mata acak (lapisan kedua di atas animasi CSS) */
    (function scheduleBlink() {
      window.setTimeout(function () {
        svg.classList.add("is-blink-now");
        window.setTimeout(function () { svg.classList.remove("is-blink-now"); }, 160);
        scheduleBlink();
      }, 2400 + Math.random() * 3600);
    })();

    /* Mata mengikuti kursor (hanya perangkat pointer presisi) */
    if (FINE_POINTER && !REDUCED_MOTION) {
      let raf = null;
      document.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = window.requestAnimationFrame(function () {
          raf = null;
          const rect = svg.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height * 0.42;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const px = (dx / dist) * 3.2;
          const py = (dy / dist) * 3.2;
          pupils.forEach(function (p) {
            p.style.transform = "translate(" + px + "px," + py + "px)";
          });
        });
      }, { passive: true });
    }

    activeMascots.push({ wrap: wrap, api: null });
    const api = {
      el: wrap,
      say: say,
      clearBubble: clearBubbleNow,
      setState: setState,
      wave: wave,
      bounce: bounce,
      cheer: cheer,
      worried: worried,
      think: think,
      idle: idle,
      name: name,
    };
    activeMascots[activeMascots.length - 1].api = api;
    return api;
  }

  window.MascotFX = {
    createMascot: createMascot,
    confetti: confetti,
    celebration: celebration,
    reducedMotion: REDUCED_MOTION,
  };
})();
