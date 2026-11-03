(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const EASE_IN_OUT = "cubic-bezier(.77,0,.175,1)";
  const EASE_OUT = "cubic-bezier(.23,1,.32,1)";

  const once = (el, threshold, fn) => {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { threshold });
    io.observe(el);
  };

  /* header: firmer frame once the page has moved */
  const top = document.getElementById("top");
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none";
  document.body.prepend(sentinel);
  if ("IntersectionObserver" in window && top) {
    new IntersectionObserver(([e]) => top.classList.toggle("is-stuck", !e.isIntersecting)).observe(sentinel);
  }

  /* brand mark: the satellite makes one orbit when the pointer arrives */
  document.querySelectorAll(".brand").forEach((brand) => {
    const spin = brand.querySelector(".mark-spin");
    if (!spin || !spin.animate) return;
    let running = null;
    brand.addEventListener("pointerenter", () => {
      if (!finePointer.matches || reduce.matches || running) return;
      running = spin.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 720, easing: EASE_IN_OUT });
      running.onfinish = running.oncancel = () => { running = null; };
    });
  });

  /* brand mark orbit follows the scroll; fallback where scroll timelines do not exist */
  const orbit = document.querySelector(".brand .mark-orbit");
  if (orbit && !(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"))) {
    let ticking = false;
    const turn = () => {
      ticking = false;
      if (reduce.matches) { orbit.style.transform = ""; return; }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const deg = max > 0 ? (window.scrollY / max) * 360 : 0;
      orbit.style.transform = `rotate(${deg.toFixed(1)}deg)`;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(turn); } }, { passive: true });
    turn();
  }

  /* one authored entrance for the demo panel; observe the parent, the clipped element reports no intersection */
  document.querySelectorAll(".reveal").forEach((el) => once(el.parentElement, 0.08, () => el.classList.add("is-in")));

  /* demo: the same inquiries without and with a system */
  const demo = document.getElementById("bandeja");
  if (demo) {
    const list = demo.querySelector(".rows");
    const buttons = demo.querySelectorAll("[data-set]");
    const live = document.getElementById("demo-live");
    const rows = Array.from(list.children);
    rows.forEach((row, i) => { row.dataset.off = String(i); });
    let touched = false;

    const order = (state) => rows.slice().sort((a, b) => Number(a.dataset[state]) - Number(b.dataset[state]));

    const setState = (state) => {
      if (demo.dataset.state === state) return;
      const first = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
      rows.forEach((r) => r.getAnimations().forEach((a) => a.cancel()));
      demo.dataset.state = state;
      order(state).forEach((r) => list.appendChild(r));
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.set === state)));
      if (live) {
        live.textContent = state === "on"
          ? "Con sistema: cinco consultas resueltas por el sistema y una derivada a una persona."
          : "Sin sistema: seis consultas esperando respuesta.";
      }
      if (reduce.matches) return;
      rows.forEach((r, i) => {
        const dy = first.get(r) - r.getBoundingClientRect().top;
        if (Math.abs(dy) < 1) return;
        r.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
          { duration: 560, easing: EASE_IN_OUT, delay: i * 28, fill: "backwards" });
      });
    };

    buttons.forEach((b) => b.addEventListener("click", () => { touched = true; setState(b.dataset.set); }));

    once(demo, 0.55, () => {
      window.setTimeout(() => { if (!touched) setState("on"); }, 1100);
    });
  }

  /* what we build: tabs with a crossfade between examples */
  const tablist = document.querySelector('[role="tablist"]');
  if (tablist) {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t) => t.addEventListener("click", () => select(t, false)));
    tablist.addEventListener("keydown", (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length], true);
    });
  }

  /* the instrument: a measured dial, turned by the scroll where the browser can */
  const ticks = document.getElementById("ticks");
  if (ticks) {
    const ns = "http://www.w3.org/2000/svg";
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * Math.PI * 2;
      const major = k % 5 === 0;
      const r1 = major ? 166 : 176;
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", (200 + Math.sin(a) * r1).toFixed(2));
      line.setAttribute("y1", (200 - Math.cos(a) * r1).toFixed(2));
      line.setAttribute("x2", (200 + Math.sin(a) * 186).toFixed(2));
      line.setAttribute("y2", (200 - Math.cos(a) * 186).toFixed(2));
      if (major) line.setAttribute("class", "major");
      ticks.appendChild(line);
    }
    const rot = document.querySelector(".dial-rot");
    const scrollDriven = window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");
    if (rot && rot.animate && !scrollDriven) {
      once(rot.closest(".dial-wrap"), 0.4, () => {
        if (reduce.matches) return;
        rot.animate([{ transform: "rotate(-120deg)" }, { transform: "rotate(30deg)" }], { duration: 2200, easing: EASE_OUT, fill: "forwards" });
      });
    }
  }

  /* the intelligence layer: links drawn from each channel to the hub, signals travel along them */
  const net = document.getElementById("net");
  if (net) {
    const svg = net.querySelector("svg.links");
    const hub = net.querySelector(".hub");
    const nodes = Array.from(net.querySelectorAll(".node"));
    const narrow = window.matchMedia("(max-width: 719px)");
    let links = [];
    let geo = [];
    let active = nodes;
    let visible = false;
    let timer = 0;

    const place = () => {
      nodes.forEach((n) => {
        const spec = narrow.matches ? n.dataset.m : n.dataset.d;
        n.hidden = spec === "hide";
        if (n.hidden) return;
        const [x, y] = spec.split(",");
        n.style.setProperty("--x", x + "%");
        n.style.setProperty("--y", y + "%");
      });
    };

    const center = (el) => ({ x: el.offsetLeft, y: el.offsetTop });

    const draw = () => {
      place();
      const w = net.clientWidth;
      const h = net.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svg.textContent = "";
      const c = center(hub);
      active = nodes.filter((n) => !n.hidden);
      geo = active.map((n) => {
        const p = center(n);
        return { x1: p.x, y1: p.y, x2: c.x, y2: c.y, len: Math.hypot(c.x - p.x, c.y - p.y) };
      });
      links = geo.map((g, i) => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", g.x1); line.setAttribute("y1", g.y1);
        line.setAttribute("x2", g.x2); line.setAttribute("y2", g.y2);
        line.setAttribute("class", "link draw");
        line.style.setProperty("--len", g.len.toFixed(1));
        line.style.setProperty("--i", String(i));
        svg.appendChild(line);
        return line;
      });
    };

    const light = (i, on) => {
      active[i].classList.toggle("is-on", on);
      if (links[i]) links[i].classList.toggle("is-on", on);
    };

    const pulse = () => {
      if (!visible || document.hidden || reduce.matches) return;
      const i = Math.floor(Math.random() * active.length);
      const g = geo[i];
      const inbound = Math.random() < 0.62;
      const from = inbound ? [g.x1, g.y1] : [g.x2, g.y2];
      const to = inbound ? [g.x2, g.y2] : [g.x1, g.y1];
      const dot = document.createElement("span");
      dot.className = "pulse";
      net.insertBefore(dot, hub);
      light(i, true);
      const anim = dot.animate([
        { transform: `translate(${from[0]}px, ${from[1]}px)`, opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { opacity: 1, offset: 0.88 },
        { transform: `translate(${to[0]}px, ${to[1]}px)`, opacity: 0 }
      ], { duration: Math.max(900, g.len * 3.2), easing: EASE_IN_OUT });
      anim.onfinish = anim.oncancel = () => { dot.remove(); light(i, false); };
      timer = window.setTimeout(pulse, 520 + Math.random() * 620);
    };

    draw();
    if ("ResizeObserver" in window) {
      let raf = 0;
      new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }).observe(net);
    }

    once(net, 0.3, () => {
      net.classList.add("is-in");
      if (reduce.matches) return;
      net.classList.add("is-drawing");
      window.setTimeout(() => net.classList.remove("is-drawing"), 1600);
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        window.clearTimeout(timer);
        if (visible) timer = window.setTimeout(pulse, 900);
      }, { threshold: 0.2 }).observe(net);
    }
    document.addEventListener("visibilitychange", () => {
      window.clearTimeout(timer);
      if (!document.hidden && visible) timer = window.setTimeout(pulse, 600);
    });

    nodes.forEach((n) => {
      n.addEventListener("pointerenter", () => { const i = active.indexOf(n); if (finePointer.matches && i > -1) { net.classList.add("is-hover"); light(i, true); } });
      n.addEventListener("pointerleave", () => { const i = active.indexOf(n); net.classList.remove("is-hover"); if (i > -1) light(i, false); });
    });
  }

  /* method: the line fills as the sequence is read (fallback where scroll timelines do not exist) */
  const method = document.getElementById("method");
  if (method && !(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"))) {
    once(method, 0.35, () => method.classList.add("is-in"));
  }
})();
