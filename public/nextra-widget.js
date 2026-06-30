(function (global) {
  "use strict";

  var BASE = "https://nextra-ai-consulting.vercel.app";
  var cfg = global.NextraWidgetConfig || {};
  var locale = cfg.locale || "fa";
  var side = cfg.position === "right" ? "right" : "left";
  var opp = side === "left" ? "right" : "left";

  var ACCENT = "#0EA5E9";
  var isOpen = false;

  function applyStyles(el, props) {
    Object.keys(props).forEach(function (k) {
      el.style.setProperty(k, props[k]);
    });
  }

  // ── iframe ──────────────────────────────────────────────────────────────────
  var frame = document.createElement("iframe");
  frame.src = BASE + "/embed?locale=" + encodeURIComponent(locale);
  frame.title = "Nextra AI";
  frame.setAttribute("allow", "clipboard-write");
  frame.setAttribute("loading", "lazy");

  var frameBase = {
    "position": "fixed",
    "bottom": "88px",
    "width": "360px",
    "max-width": "calc(100vw - 32px)",
    "height": "540px",
    "max-height": "calc(100dvh - 120px)",
    "border": "none",
    "border-radius": "16px",
    "box-shadow": "0 20px 60px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.07)",
    "z-index": "2147483646",
    "transition": "opacity 0.2s ease,transform 0.2s ease",
    "opacity": "0",
    "transform": "translateY(10px) scale(0.97)",
    "pointer-events": "none",
    "background": "#fff",
  };
  frameBase[side] = "16px";
  frameBase[opp] = "auto";
  applyStyles(frame, frameBase);

  // ── button ──────────────────────────────────────────────────────────────────
  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "باز کردن چت"); // باز کردن چت

  var btnBase = {
    "position": "fixed",
    "bottom": "20px",
    "width": "56px",
    "height": "56px",
    "border-radius": "50%",
    "border": "none",
    "cursor": "pointer",
    "z-index": "2147483647",
    "background": ACCENT,
    "box-shadow": "0 6px 20px -2px rgba(14,165,233,0.55)",
    "display": "flex",
    "align-items": "center",
    "justify-content": "center",
    "padding": "0",
    "transition": "transform 0.2s ease,box-shadow 0.2s ease",
    "outline": "none",
    "font-size": "0",
    "line-height": "0",
  };
  btnBase[side] = "20px";
  btnBase[opp] = "auto";
  applyStyles(btn, btnBase);

  var SVG_CHAT = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var SVG_X    = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  btn.innerHTML = SVG_CHAT;

  btn.addEventListener("mouseenter", function () {
    btn.style.setProperty("transform", "scale(1.1)");
    btn.style.setProperty("box-shadow", "0 10px 30px -2px rgba(14,165,233,0.7)");
  });
  btn.addEventListener("mouseleave", function () {
    btn.style.setProperty("transform", "scale(1)");
    btn.style.setProperty("box-shadow", "0 6px 20px -2px rgba(14,165,233,0.55)");
  });

  function openWidget() {
    isOpen = true;
    frame.style.setProperty("opacity", "1");
    frame.style.setProperty("transform", "translateY(0) scale(1)");
    frame.style.setProperty("pointer-events", "auto");
    btn.innerHTML = SVG_X;
    btn.setAttribute("aria-label", "بستن چت"); // بستن چت
  }

  function closeWidget() {
    isOpen = false;
    frame.style.setProperty("opacity", "0");
    frame.style.setProperty("transform", "translateY(10px) scale(0.97)");
    frame.style.setProperty("pointer-events", "none");
    btn.innerHTML = SVG_CHAT;
    btn.setAttribute("aria-label", "باز کردن چت"); // باز کردن چت
  }

  btn.addEventListener("click", function () {
    if (isOpen) closeWidget(); else openWidget();
  });

  function mount() {
    document.body.appendChild(frame);
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  // Public API — lets host pages call NextraWidget.open() / .close()
  global.NextraWidget = { open: openWidget, close: closeWidget };

})(window);
