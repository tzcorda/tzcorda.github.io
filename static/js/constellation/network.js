/* Constellation network hero.
   Renders the SVG research map from the JSON emitted by _includes/c-data.html:
   {items, portfolios, typeLabels, projects, methods}. Layout is deterministic
   (hash-jittered by id) so positions are stable across reloads.
   Interaction model: hover previews a card, click pins it (click the node again
   or the map background to close); hub centers pin the program card, which
   links to the portfolio page; the legend lists short portfolio names on their
   own row and dims everything else while one is active (click again to clear).
   Nodes drift a few px around their anchors unless the user prefers reduced
   motion. */
(function () {
  "use strict";
  const dataEl = document.getElementById("c-data");
  const svg = document.getElementById("net");
  if (!dataEl || !svg) return;

  const DATA = JSON.parse(dataEl.textContent);
  const ITEMS = DATA.items;
  const TYPE_LABELS = DATA.typeLabels;
  const METHODS = DATA.methods || [];
  const METHOD_LABELS = {};
  METHODS.forEach(m => { METHOD_LABELS[m.key] = m.label; });
  const PF = {};
  DATA.portfolios.forEach(p => { PF[p.key] = p; });
  const PF_HREF = svg.dataset.pfHref || "/portfolios/{key}/";
  const pfHref = k => PF_HREF.replace("{key}", k);

  const isWall = it => !it.portfolio || it.portfolio.length === 0;

  function hash(n) { return ((n * 2654435761) % 4294967296) / 4294967296; }
  const nodes = {};
  const byHub = {};
  ITEMS.forEach(it => { if (!isWall(it)) it.portfolio.forEach(k => (byHub[k] = byHub[k] || []).push(it.id)); });
  const wallItems = ITEMS.filter(isWall);
  const MISC = { x: 1055, y: 306 };
  const MISC_LABEL = { x: 1055, y: 372 };
  const MISC_SPOTS = [[1055, 248], [1000, 340], [1110, 340]];
  ITEMS.forEach(it => {
    if (isWall(it)) {
      const s = MISC_SPOTS[wallItems.indexOf(it) % MISC_SPOTS.length];
      nodes[it.id] = { x: s[0], y: s[1], wall: true };
    } else if (it.portfolio.length === 1) {
      const k = it.portfolio[0], hub = PF[k];
      const ring = byHub[k].filter(id => ITEMS.find(i => i.id === id).portfolio.length === 1);
      const idx = ring.indexOf(it.id);
      const a = (idx / ring.length) * Math.PI * 2 + hash(it.id) * 0.5 + (k === "durability" ? 0.4 : 2.1);
      const r = 70 + hash(it.id + 7) * 45;
      nodes[it.id] = { x: hub.hub_x + Math.cos(a) * r * 1.25, y: hub.hub_y + Math.sin(a) * r * 0.9 };
    } else {
      let sx = 0, sy = 0, w = 0;
      it.portfolio.forEach((k, i) => {
        const wt = i === 0 ? 1.25 : 1;
        sx += PF[k].hub_x * wt; sy += PF[k].hub_y * wt; w += wt;
      });
      nodes[it.id] = { x: sx / w + (hash(it.id) - 0.5) * 90, y: sy / w + (hash(it.id + 3) - 0.5) * 70 };
    }
  });
  function keepOutOfLabels(n) {
    if (!n.wall) {
      DATA.portfolios.forEach(h => {
        const dx = n.x - h.hub_x;
        if (Math.abs(dx) < 100 && n.y > h.hub_y + 28 && n.y < h.hub_y + 72) {
          n.x = h.hub_x + (dx >= 0 ? 112 : -112);
        }
      });
      const dxm = n.x - MISC_LABEL.x;
      if (Math.abs(dxm) < 70 && n.y > MISC_LABEL.y - 16 && n.y < MISC_LABEL.y + 12) {
        n.x = MISC_LABEL.x + (dxm >= 0 ? 80 : -80);
      }
    }
    n.x = Math.max(50, Math.min(1150, n.x));
    n.y = Math.max(56, Math.min(612, n.y));
  }
  const MIN_D = 27;
  const obstacles = [];
  DATA.portfolios.forEach(h => obstacles.push({ x: h.hub_x, y: h.hub_y, d: 50 }));
  DATA.projects.forEach(pr => { if (pr.net_x != null) obstacles.push({ x: pr.net_x, y: pr.net_y, d: 30 }); });
  obstacles.push({ x: MISC.x, y: MISC.y, d: 34 });
  const allIds = ITEMS.map(i => i.id);
  for (let pass = 0; pass < 50; pass++) {
    let moved = false;
    for (let i = 0; i < allIds.length; i++) {
      const a = nodes[allIds[i]];
      obstacles.forEach(o => {
        const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy) || 0.01;
        if (d < o.d) { a.x = o.x + dx / d * o.d; a.y = o.y + dy / d * o.d; moved = true; }
      });
      for (let j = i + 1; j < allIds.length; j++) {
        const b = nodes[allIds[j]];
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= MIN_D) continue;
        if (d < 0.01) { dx = hash(allIds[i] + allIds[j]) - 0.5; dy = 0.3; d = Math.hypot(dx, dy); }
        const push = (MIN_D - d) / 2 / d;
        a.x -= dx * push; a.y -= dy * push;
        b.x += dx * push; b.y += dy * push;
        moved = true;
      }
    }
    Object.values(nodes).forEach(keepOutOfLabels);
    if (!moved) break;
  }

  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  const gEdges = el("g", {}), gRel = el("g", {}), gMisc = el("g", {}), gHubs = el("g", {}), gNodes = el("g", {});

  const hubEdges = [];
  ITEMS.forEach(it => {
    if (isWall(it)) return;
    it.portfolio.forEach(k => {
      hubEdges.push({
        line: el("line", {
          x1: nodes[it.id].x, y1: nodes[it.id].y, x2: PF[k].hub_x, y2: PF[k].hub_y,
          stroke: PF[k].color, "stroke-opacity": 0.20, "stroke-width": 1, "data-edge": it.id, "data-pf": k, class: "edge"
        }, gEdges),
        id: it.id
      });
    });
  });
  const relEdges = [];
  const seenRel = new Set();
  ITEMS.forEach(it => (it.related || []).forEach(r => {
    const key = [Math.min(it.id, r.id), Math.max(it.id, r.id)].join("-");
    if (seenRel.has(key) || !nodes[r.id]) return;
    seenRel.add(key);
    relEdges.push({
      line: el("line", {
        x1: nodes[it.id].x, y1: nodes[it.id].y, x2: nodes[r.id].x, y2: nodes[r.id].y,
        stroke: "#C0392B", "stroke-opacity": 0.25, "stroke-width": 0.8, "stroke-dasharray": "0.1 5", "stroke-linecap": "round"
      }, gRel),
      a: it.id, b: r.id
    });
  }));
  const relProjEdges = [];
  ITEMS.forEach(it => {
    if (!it.related_project) return;
    const pr = DATA.projects.find(p => p.key === it.related_project);
    if (!pr || pr.net_x == null) return;
    relProjEdges.push({
      line: el("line", {
        x1: nodes[it.id].x, y1: nodes[it.id].y, x2: pr.net_x, y2: pr.net_y,
        stroke: "#C0392B", "stroke-opacity": 0.25, "stroke-width": 0.8, "stroke-dasharray": "0.1 5", "stroke-linecap": "round"
      }, gRel),
      id: it.id, projpf: pr.portfolio
    });
  });
  const projEdges = [];
  ITEMS.forEach(it => {
    if (!it.project) return;
    const pr = DATA.projects.find(p => p.key === it.project);
    if (!pr || pr.net_x == null) return;
    projEdges.push({
      line: el("line", {
        x1: nodes[it.id].x, y1: nodes[it.id].y, x2: pr.net_x, y2: pr.net_y,
        stroke: PF[pr.portfolio].color, "stroke-opacity": 0.45, "stroke-width": 1.2,
        "stroke-dasharray": "2 3", class: "pedge", "data-edge": it.id, "data-proj": pr.key
      }, gRel),
      id: it.id, projpf: pr.portfolio
    });
  });
  DATA.portfolios.forEach(h => {
    const g = el("g", { "data-hub": h.key, style: "cursor:pointer" }, gHubs);
    el("circle", { cx: h.hub_x, cy: h.hub_y, r: 26, fill: h.color, "fill-opacity": 0.12, stroke: h.color, "stroke-width": 1.5 }, g);
    el("circle", { cx: h.hub_x, cy: h.hub_y, r: 7, fill: h.color }, g);
    const t = el("text", { x: h.hub_x, y: h.hub_y + 44, "text-anchor": "middle", fill: h.color, style: "font:600 12.5px 'Libre Franklin',sans-serif;letter-spacing:.02em" }, g);
    const words = h.title.split(" ");
    el("tspan", { x: h.hub_x, dy: 0 }, t).textContent = words.slice(0, Math.ceil(words.length / 2)).join(" ");
    el("tspan", { x: h.hub_x, dy: 14 }, t).textContent = words.slice(Math.ceil(words.length / 2)).join(" ");
    el("text", { x: h.hub_x, y: h.hub_y - 34, "text-anchor": "middle", fill: h.color, style: "font:500 10px 'Libre Franklin',sans-serif;letter-spacing:.15em" }, g).textContent = h.num;
    el("circle", { cx: h.hub_x, cy: h.hub_y, r: 26, fill: "transparent" }, g);
  });
  DATA.projects.forEach(pr => {
    if (pr.net_x == null) return;
    const hub = PF[pr.portfolio], c = hub.color;
    const g = el("g", { "data-projpf": pr.portfolio, "data-proj": pr.key, style: "cursor:pointer" }, gHubs);
    el("line", { x1: pr.net_x, y1: pr.net_y, x2: hub.hub_x, y2: hub.hub_y, stroke: c, "stroke-opacity": 0.5, "stroke-width": 1.4 }, g);
    el("circle", { cx: pr.net_x, cy: pr.net_y, r: 11, fill: "none", stroke: c, "stroke-width": 1.5 }, g);
    el("circle", { cx: pr.net_x, cy: pr.net_y, r: 4.5, fill: c }, g);
    el("text", { x: pr.net_x, y: pr.net_y - 18, "text-anchor": "middle", fill: c, style: "font:500 10.5px 'Libre Franklin',sans-serif;letter-spacing:.08em" }, g).textContent = pr.label;
    el("circle", { cx: pr.net_x, cy: pr.net_y, r: 16, fill: "transparent" }, g);
  });
  const nodeEls = {};
  ITEMS.forEach(it => {
    const n = nodes[it.id];
    const c = isWall(it) ? "#9AAAB9" : PF[it.portfolio[0]].color;
    const g = el("g", { "data-id": it.id, style: "cursor:pointer" }, gNodes);
    nodeEls[it.id] = g;
    el("circle", { cx: n.x, cy: n.y, r: 6.5, fill: c, "fill-opacity": 0.92, stroke: "#FBFCFD", "stroke-width": 1.5 }, g);
    el("circle", { cx: n.x, cy: n.y, r: 13, fill: "transparent" }, g);
  });
  const miscEdges = [];
  if (wallItems.length) {
    wallItems.forEach(it => {
      miscEdges.push({
        line: el("line", { x1: nodes[it.id].x, y1: nodes[it.id].y, x2: MISC.x, y2: MISC.y, stroke: "#9AAAB9", "stroke-opacity": 0.5, "stroke-width": 1.2 }, gMisc),
        id: it.id
      });
    });
    el("circle", { cx: MISC.x, cy: MISC.y, r: 14, fill: "#9AAAB9", "fill-opacity": 0.12, stroke: "#9AAAB9", "stroke-width": 1.5 }, gMisc);
    el("circle", { cx: MISC.x, cy: MISC.y, r: 4.5, fill: "#9AAAB9" }, gMisc);
    el("text", { x: MISC_LABEL.x, y: MISC_LABEL.y, "text-anchor": "middle", fill: "#5E7186", style: "font:600 12.5px 'Libre Franklin',sans-serif;letter-spacing:.02em" }, gMisc)
      .textContent = "Miscellaneous";
  }

  const panel = document.getElementById("panel");
  let pinned = null;
  let hoverFreeze = false;
  const frozen = () => hoverFreeze || !!pinned;
  const byId = id => ITEMS.find(i => i.id == id);
  const projByKey = key => DATA.projects.find(p => p.key === key);

  const escAttr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  function itemPanelHTML(it) {
    const color = isWall(it) ? "#9AAAB9" : PF[it.portfolio[0]].color;
    const chips = (isWall(it)
      ? "<span>other</span>"
      : it.portfolio.map(k => '<span style="color:' + PF[k].color + ";border-color:" + PF[k].color + '">' + PF[k].num + "</span>").join(""))
      + (it.methods || []).map(m => '<span class="m">' + METHOD_LABELS[m] + "</span>").join("");
    const link = it.url ? '<a class="go" href="' + escAttr(it.url) + '" target="_blank" rel="noopener">Open &rarr;</a>' : "";
    const kicker = it.kicker || TYPE_LABELS[it.type];
    const venueParts = [];
    if (it.venue && !it.kicker && it.venue.toLowerCase() !== TYPE_LABELS[it.type].toLowerCase()) venueParts.push(it.venue);
    if (it.coauthors) venueParts.push("with " + it.coauthors);
    const venue = venueParts.length ? '<div class="venue">' + venueParts.join(" &middot; ") + "</div>" : "";
    return '<div class="ty" style="color:' + color + '">' + kicker + " &middot; " + (it.year_display || it.year) + "</div>" +
      "<h3>" + (it.title_short || it.title) + "</h3>" + venue +
      '<div class="blurb">' + it.blurb + "</div>" +
      '<div class="pf">' + chips + "</div>" + link;
  }
  function hubPanelHTML(h) {
    const n = ITEMS.filter(i => !isWall(i) && i.portfolio.includes(h.key)).length;
    return '<div class="ty">Research area ' + h.num + " &middot; " + n + " outputs</div>" +
      "<h3>" + h.title + "</h3>" +
      '<div class="blurb">' + h.blurb + "</div>" +
      (h.anchor ? '<div class="anchor">' + h.anchor + "</div>" : "") +
      '<a class="go" href="' + pfHref(h.key) + '">Go to Research page &rarr;</a>';
  }
  function projPanelHTML(pr) {
    const h = PF[pr.portfolio];
    const link = pr.url
      ? '<a class="go" href="' + escAttr(pr.url) + '" target="_blank" rel="noopener">Open &rarr;</a>'
      : '<a class="go" href="' + pfHref(pr.portfolio) + '">Go to Research page &rarr;</a>';
    const mhost = pr.map_host || ((pr.host && pr.host !== "Your Org") ? pr.host : "");
    const venue = mhost ? '<div class="venue">' + mhost + "</div>" : "";
    const chips = [pr.portfolio].concat(pr.also || [])
      .map(k => '<span style="color:' + PF[k].color + ";border-color:" + PF[k].color + '">' + PF[k].num + "</span>").join("")
      + (pr.methods || []).map(m => '<span class="m">' + METHOD_LABELS[m] + "</span>").join("");
    return '<div class="ty" style="color:' + h.color + '">Initiative &middot; ' + pr.years + "</div>" +
      "<h3>" + pr.title + "</h3>" + venue +
      '<div class="blurb">' + (pr.map_blurb || pr.blurb) + "</div>" +
      '<div class="pf">' + chips + "</div>" + link;
  }
  /* readable text colour for a card filled with a hub colour: white or near
     black, whichever contrasts more with that colour */
  function textOn(hex) {
    const n = parseInt(hex.slice(1), 16);
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
    return 1.05 / (L + 0.05) >= (L + 0.05) / 0.06 ? "#fff" : "#16171A";
  }
  function showItem(it) {
    panel.style.display = "block";
    panel.classList.remove("hub");
    panel.style.background = "";
    panel.style.color = "";
    panel.style.borderLeftColor = isWall(it) ? "#9AAAB9" : PF[it.portfolio[0]].color;
    panel.innerHTML = itemPanelHTML(it);
  }
  function showHub(h) {
    panel.style.display = "block";
    panel.classList.add("hub");
    panel.style.background = h.color;
    panel.style.color = textOn(h.color);
    panel.style.borderLeftColor = "rgba(255,255,255,.55)";
    panel.innerHTML = hubPanelHTML(h);
  }
  function tint(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const mix = v => Math.round(v + (255 - v) * f);
    return "rgb(" + mix(n >> 16 & 255) + "," + mix(n >> 8 & 255) + "," + mix(n & 255) + ")";
  }
  function showProj(pr) {
    panel.style.display = "block";
    panel.classList.remove("hub");
    panel.style.background = tint(PF[pr.portfolio].color, 0.87);
    panel.style.color = "#16171A";
    panel.style.borderLeftColor = PF[pr.portfolio].color;
    panel.innerHTML = projPanelHTML(pr);
  }
  function hidePanel() {
    panel.style.display = "none";
    panel.classList.remove("hub");
    panel.style.background = "";
    panel.style.color = "";
    panel.style.borderLeftColor = "";
  }
  function highlightEdges(id) {
    document.querySelectorAll(".edge").forEach(l => l.setAttribute("stroke-opacity", l.dataset.edge == id ? 0.85 : 0.07));
    document.querySelectorAll(".pedge").forEach(l => l.setAttribute("stroke-opacity", l.dataset.edge == id ? 0.9 : 0.1));
  }
  function resetEdges() {
    document.querySelectorAll(".edge").forEach(l => l.setAttribute("stroke-opacity", 0.20));
    document.querySelectorAll(".pedge").forEach(l => l.setAttribute("stroke-opacity", 0.45));
  }
  function restorePinned() {
    // a pinned card takes clicks (its link works); a hover preview does not
    panel.classList.toggle("pinned", !!pinned);
    if (!pinned) { hidePanel(); resetEdges(); return; }
    if (pinned.kind === "item") { const it = byId(pinned.id); showItem(it); highlightEdges(it.id); }
    else if (pinned.kind === "proj") { showProj(projByKey(pinned.key)); resetEdges(); }
    else { showHub(PF[pinned.key]); resetEdges(); }
  }

  /* Put the card on the side opposite the hovered or clicked element, so it
     never covers what the pointer is on (a covered dot loses the hover, which
     hides the card, which gives the hover back: the card blinks). */
  function placePanel(g) {
    const s = svg.getBoundingClientRect(), r = g.getBoundingClientRect();
    panel.classList.toggle("left", r.left + r.width / 2 > s.left + s.width / 2);
  }

  svg.addEventListener("mouseover", e => {
    if (pinned) return;
    const gi = e.target.closest("g[data-id]");
    const gh = e.target.closest("g[data-hub]");
    const gp = e.target.closest("g[data-proj]");
    if (!gi && !gh && !gp) return;
    hoverFreeze = true;
    placePanel(gi || gp || gh);
    if (gi) { const it = byId(gi.dataset.id); highlightEdges(it.id); showItem(it); }
    else if (gp) showProj(projByKey(gp.dataset.proj));
    else showHub(PF[gh.dataset.hub]);
  });
  svg.addEventListener("mouseout", e => {
    if (pinned) return;
    if (!e.target.closest("g[data-id]") && !e.target.closest("g[data-hub]") && !e.target.closest("g[data-proj]")) return;
    hoverFreeze = false;
    restorePinned();
  });
  svg.addEventListener("click", e => {
    const gi = e.target.closest("g[data-id]");
    const gh = e.target.closest("g[data-hub]");
    const gp = e.target.closest("g[data-proj]");
    if (gi) {
      const id = +gi.dataset.id;
      pinned = (pinned && pinned.kind === "item" && pinned.id === id) ? null : { kind: "item", id };
    } else if (gh) {
      const key = gh.dataset.hub;
      pinned = (pinned && pinned.kind === "hub" && pinned.key === key) ? null : { kind: "hub", key };
    } else if (gp) {
      const key = gp.dataset.proj;
      pinned = (pinned && pinned.kind === "proj" && pinned.key === key) ? null : { kind: "proj", key };
    } else {
      pinned = null;
    }
    if (gi || gp || gh) placePanel(gi || gp || gh);
    if (!pinned) hoverFreeze = !!(gi || gh || gp);
    restorePinned();
  });

  /* Buttons in the top row, in this order: [key, label, [types]].
     Edit this list to choose which buttons appear. Every item whose type is
     not listed in any of them is shown by the "Other" button; set OTHER_LABEL
     to "" to drop that button. */
  const TYPE_CHIPS = [
    ["peer", "Journal articles", ["academic-peer-review"]],
    ["teach", "Teaching", ["teaching"]],
    ["pos", "Project positions", ["project-position"]]
  ];
  const OTHER_LABEL = "Other";
  const TYPE_GROUPS = {};
  const NAMED_TYPES = new Set();
  TYPE_CHIPS.forEach(([k, , types]) => { TYPE_GROUPS[k] = types; types.forEach(t => NAMED_TYPES.add(t)); });
  const chipDefs = [["all", "All"]].concat(TYPE_CHIPS.map(([k, l]) => [k, l]));
  if (OTHER_LABEL) chipDefs.push(["other", OTHER_LABEL]);
  const chipsEl = document.getElementById("chips");
  const typeRow = document.createElement("div");
  typeRow.className = "chip-row";
  const methodRow = document.createElement("div");
  methodRow.className = "chip-row";
  const pfRow = document.createElement("div");
  pfRow.className = "chip-row";
  chipsEl.appendChild(typeRow);
  if (METHODS.length) chipsEl.appendChild(methodRow);
  chipsEl.appendChild(pfRow);
  chipDefs.forEach(([k, l], i) => {
    const b = document.createElement("button");
    b.className = "chip" + (i === 0 ? " on" : "");
    b.textContent = l;
    b.dataset.k = k;
    typeRow.appendChild(b);
  });
  METHODS.forEach(m => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = m.label;
    b.dataset.m = m.key;
    methodRow.appendChild(b);
  });
  DATA.portfolios.forEach(p => {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.pf = p.key;
    b.innerHTML = '<span class="dot" style="background:' + p.color + '"></span>' + p.num + " " + p.short;
    pfRow.appendChild(b);
  });

  const active = { k: null, m: null, pf: null };
  const chipRow = c => (c.dataset.pf ? "pf" : c.dataset.m ? "m" : "k");
  const kickerEl = document.querySelector(".hero-head .kicker");
  const kickerBase = kickerEl ? kickerEl.textContent : "";

  function applyFilter() {
    const pf = active.pf;
    let wallShown = false;
    let shown = 0;
    const vis = {};
    document.querySelectorAll("g[data-id]").forEach(g => {
      const it = byId(g.dataset.id);
      let show = true;
      if (active.k) show = active.k === "other" ? !NAMED_TYPES.has(it.type) : TYPE_GROUPS[active.k].includes(it.type);
      if (show && active.m) show = (it.methods || []).includes(active.m);
      if (show && pf) show = !isWall(it) && it.portfolio.includes(pf);
      if (show && isWall(it)) wallShown = true;
      vis[it.id] = show;
      if (show) shown++;
      g.style.opacity = show ? 1 : (pf ? 0.08 : 0.12);
    });
    gMisc.style.opacity = wallShown ? 1 : (pf ? 0.08 : 0.12);
    document.querySelectorAll("g[data-hub]").forEach(g => { g.style.opacity = (!pf || g.dataset.hub === pf) ? 1 : 0.12; });
    document.querySelectorAll("g[data-projpf]").forEach(g => { g.style.opacity = (!pf || g.dataset.projpf === pf) ? 1 : 0.12; });
    document.querySelectorAll(".edge").forEach(l => { l.style.opacity = (!pf || l.dataset.pf === pf) ? 1 : 0.06; });
    relEdges.forEach(re => { re.line.style.opacity = (vis[re.a] && vis[re.b]) ? 1 : (pf ? 0.08 : 0.12); });
    projEdges.forEach(pe => { pe.line.style.opacity = (vis[pe.id] && (!pf || pe.projpf === pf)) ? 1 : (pf ? 0.08 : 0.12); });
    relProjEdges.forEach(re => { re.line.style.opacity = (vis[re.id] && (!pf || re.projpf === pf)) ? 1 : (pf ? 0.08 : 0.12); });
    if (kickerEl) {
      const any = active.k || active.m || active.pf;
      kickerEl.textContent = any
        ? kickerBase.replace(/\d+ outputs/i, "showing " + shown + " of " + ITEMS.length + " outputs")
        : kickerBase;
    }
  }
  chipsEl.addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    if (b.dataset.k === "all") {
      active.k = active.m = active.pf = null;
    } else {
      const row = chipRow(b);
      const val = b.dataset.pf || b.dataset.m || b.dataset.k;
      active[row] = (active[row] === val) ? null : val;
    }
    chipsEl.querySelectorAll(".chip").forEach(c => {
      const val = c.dataset.pf || c.dataset.m || c.dataset.k;
      c.classList.toggle("on", c.dataset.k === "all"
        ? !(active.k || active.m || active.pf)
        : active[chipRow(c)] === val);
    });
    applyFilter();
  });

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    const drift = {};
    ITEMS.forEach(it => {
      drift[it.id] = {
        amp: nodes[it.id].wall ? 1.5 : 2 + hash(it.id + 11) * 2,
        w1: 0.45 + hash(it.id + 5) * 0.35, w2: 0.4 + hash(it.id + 17) * 0.35,
        p1: hash(it.id + 23) * Math.PI * 2, p2: hash(it.id + 29) * Math.PI * 2,
        dx: 0, dy: 0
      };
    });
    const step = t => {
      if (!frozen()) {
        const s = t / 1000;
        ITEMS.forEach(it => {
          const d = drift[it.id];
          d.dx = d.amp * Math.sin(s * d.w1 + d.p1);
          d.dy = d.amp * Math.cos(s * d.w2 + d.p2);
          nodeEls[it.id].setAttribute("transform", "translate(" + d.dx + " " + d.dy + ")");
        });
        hubEdges.forEach(he => {
          const n = nodes[he.id], d = drift[he.id];
          he.line.setAttribute("x1", n.x + d.dx);
          he.line.setAttribute("y1", n.y + d.dy);
        });
        miscEdges.forEach(me => {
          const n = nodes[me.id], d = drift[me.id];
          me.line.setAttribute("x1", n.x + d.dx);
          me.line.setAttribute("y1", n.y + d.dy);
        });
        projEdges.forEach(pe => {
          const n = nodes[pe.id], d = drift[pe.id];
          pe.line.setAttribute("x1", n.x + d.dx);
          pe.line.setAttribute("y1", n.y + d.dy);
        });
        relProjEdges.forEach(re => {
          const n = nodes[re.id], d = drift[re.id];
          re.line.setAttribute("x1", n.x + d.dx);
          re.line.setAttribute("y1", n.y + d.dy);
        });
        relEdges.forEach(re => {
          const na = nodes[re.a], da = drift[re.a], nb = nodes[re.b], db = drift[re.b];
          re.line.setAttribute("x1", na.x + da.dx);
          re.line.setAttribute("y1", na.y + da.dy);
          re.line.setAttribute("x2", nb.x + db.dx);
          re.line.setAttribute("y2", nb.y + db.dy);
        });
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
})();