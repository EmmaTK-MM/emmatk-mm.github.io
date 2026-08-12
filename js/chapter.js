/* Chapter page: curated storybook view (default) + full justified grid,
   shared lightbox. The curated view shows manifest `picks` — the most
   representative photos, each with a poetic caption. */

(async () => {
  const m = await Album.load();
  const slug = new URLSearchParams(location.search).get("c") || m.chapters[0].slug;
  let idx = m.chapters.findIndex(c => c.slug === slug);
  if (idx < 0) idx = 0; // unknown slug: land on the first chapter, nav stays sane
  const ch = m.chapters[idx];
  const showAll = new URLSearchParams(location.search).get("view") === "all";

  const cp = Album.copy(ch);
  const picks = (ch.picks || []).filter(pk => ch.photos.some(p => p[0] === pk[0]));
  const usePicks = picks.length > 0 && !showAll;

  document.title = `${cp.title} · Emma`;
  document.getElementById("topbarTitle").textContent = cp.title;
  document.getElementById("topbarCount").textContent = usePicks
    ? `${picks.length} MOMENTS` : `${ch.count} PHOTOGRAPHS`;
  document.getElementById("chDay").textContent = Album.dayLabel(m, ch);
  document.getElementById("chTitle").textContent = cp.title;
  document.getElementById("chEn").textContent = cp.sub;
  document.getElementById("chDates").textContent = Album.fmtDates(ch);

  /* ---------- prev / next chapter nav ---------- */
  const nav = document.getElementById("chapterNav");
  const mk = (c, cls, label) => `
    <a class="cn-link ${cls}" href="chapter.html?c=${c.slug}">
      <small>${label}</small><b>${Album.copy(c).title}</b><i>${Album.copy(c).sub}</i>
    </a>`;
  let navHtml = "";
  if (idx > 0) navHtml += mk(m.chapters[idx - 1], "prev", "← Previous chapter");
  if (idx < m.chapters.length - 1) navHtml += mk(m.chapters[idx + 1], "next", "Next chapter →");
  nav.innerHTML = navHtml;

  const gallery = document.getElementById("gallery");
  const findPhoto = i => ch.photos.find(p => p[0] === i);

  /* viewList: what the lightbox pages through in the current mode */
  let viewList = usePicks ? picks.map(pk => findPhoto(pk[0])) : ch.photos;
  const captionFor = k => {
    if (!usePicks) return "";
    return picks[k] ? picks[k][1] : "";
  };

  /* ---------- curated storybook view ---------- */
  function buildPicks() {
    gallery.className = "gallery picks-mode";
    const frag = document.createDocumentFragment();
    picks.forEach((pk, k) => {
      const p = findPhoto(pk[0]);
      if (!p) return;
      const fig = document.createElement("figure");
      fig.className = "pick g-item";
      fig.tabIndex = 0;
      fig.setAttribute("role", "button");
      fig.setAttribute("aria-label", `View photo: ${pk[1]}`);
      fig.dataset.i = k;
      const wrap = document.createElement("div");
      wrap.className = "pick-frame";
      const img = document.createElement("img");
      img.loading = k < 2 ? "eager" : "lazy";
      img.decoding = "async";
      img.alt = pk[1];
      img.style.aspectRatio = `${p[1]} / ${p[2]}`;
      img.src = Album.large(ch.slug, p);
      img.onload = () => img.classList.add("ld");
      if (img.complete && img.naturalWidth) img.classList.add("ld");
      wrap.appendChild(img);
      const cap = document.createElement("figcaption");
      cap.className = "pick-cap";
      cap.textContent = pk[1];
      fig.appendChild(wrap);
      fig.appendChild(cap);
      frag.appendChild(fig);
      if (k < picks.length - 1) {
        const sep = document.createElement("p");
        sep.className = "pick-sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "·";
        frag.appendChild(sep);
      }
    });
    const more = document.createElement("p");
    more.className = "view-all";
    more.innerHTML = `<a href="chapter.html?c=${ch.slug}&view=all">every photograph from this chapter · ${ch.count} →</a>`;
    frag.appendChild(more);
    gallery.replaceChildren(frag);
    const reveal = Album.makeReveal("seen", "0px 0px -4% 0px");
    gallery.querySelectorAll(".pick").forEach(el => reveal.observe(el));
  }

  /* ---------- full justified grid ---------- */
  const GAP = () => (innerWidth <= 760 ? 5 : 8);
  const TARGET_H = () => Math.max(150, Math.min(300, innerWidth * 0.21));
  let built = false;
  let revealObs = null;

  function buildGrid() {
    gallery.className = "gallery";
    const W = gallery.clientWidth;
    if (!W) return;
    const gap = GAP(), targetH = TARGET_H();
    const rows = [];
    let row = [], arSum = 0;
    for (const p of viewList) {
      const ar = p[1] / p[2];
      if (row.length) {
        // close the row on whichever side lands nearer the target height
        const hWith = (W - gap * row.length) / (arSum + ar);
        const hWithout = (W - gap * (row.length - 1)) / arSum;
        if (hWith < targetH &&
            Math.abs(hWithout - targetH) < Math.abs(hWith - targetH)) {
          rows.push([row, arSum]); row = []; arSum = 0;
        }
      }
      row.push(p); arSum += ar;
    }
    if (row.length) rows.push([row, arSum]);

    if (revealObs) revealObs.disconnect(); // old observer would pin detached nodes
    const frag = document.createDocumentFragment();
    rows.forEach(([r, sum]) => {
      const h = Math.min((W - gap * (r.length - 1)) / sum, targetH * 1.55);
      const div = document.createElement("div");
      div.className = "g-row";
      for (const p of r) {
        const w = h * (p[1] / p[2]);
        const item = document.createElement("figure");
        item.className = "g-item";
        item.tabIndex = 0;
        item.setAttribute("role", "button");
        const n = viewList.indexOf(p);
        item.setAttribute("aria-label", `View photo ${n + 1} of ${viewList.length}`);
        item.style.width = `${(100 * w) / W}%`;
        item.style.aspectRatio = `${p[1]} / ${p[2]}`;
        item.dataset.i = n;
        const img = document.createElement("img");
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = `${cp.title}, photograph ${n + 1}`;
        img.src = Album.thumb(ch.slug, p);
        img.onload = () => img.classList.add("ld");
        if (img.complete && img.naturalWidth) img.classList.add("ld");
        item.appendChild(img);
        div.appendChild(item);
      }
      frag.appendChild(div);
    });
    gallery.replaceChildren(frag);
    if (built) {
      // pure relayout (resize): show instantly, no re-run of the entrance animation
      gallery.querySelectorAll(".g-item").forEach(el => el.classList.add("seen"));
    } else {
      revealObs = Album.makeReveal("seen", "0px 0px 10% 0px");
      gallery.querySelectorAll(".g-item").forEach(el => revealObs.observe(el));
      built = true;
    }
  }

  if (usePicks) {
    buildPicks();
  } else {
    buildGrid();
    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(buildGrid, 180); });
    if (picks.length) {
      const back = document.createElement("p");
      back.className = "view-all";
      back.innerHTML = `<a href="chapter.html?c=${ch.slug}">← back to the chosen moments</a>`;
      gallery.parentElement.appendChild(back);
    }
  }

  /* ---------- lightbox ---------- */
  const lb = document.getElementById("lightbox");
  const imgA = document.getElementById("lbImg");
  const imgB = document.getElementById("lbImgB");
  const cap = document.getElementById("lbCaption");
  let cur = -1, active = imgA, idle = imgB;
  let lastFocus = null;

  const preload = i => {
    if (i >= 0 && i < viewList.length) {
      const im = new Image();
      im.src = Album.large(ch.slug, viewList[i]);
    }
  };
  const setCaption = i => {
    const extra = captionFor(i);
    cap.innerHTML = `<b>${cp.title}</b> ${i + 1} / ${viewList.length}` +
      (extra ? `<span class="lb-line">${extra}</span>` : "");
  };

  function show(i) {
    if (i < 0 || i >= viewList.length) return;
    cur = i;
    const src = Album.large(ch.slug, viewList[i]);
    idle.classList.remove("show");
    const target = idle;
    target.onload = () => {
      target.onload = null; // cached images still fire load: run the swap once only
      active.classList.remove("show");
      target.classList.add("show");
      [active, idle] = [target, active];
      setCaption(i);
      preload(i + 1); preload(i - 1);
    };
    target.onerror = () => { setCaption(i); };
    target.src = src;
    if (target.complete && target.naturalWidth && target.onload) target.onload();
  }

  function open(i) {
    lastFocus = document.activeElement;
    document.body.classList.add("lb-lock");
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    imgA.classList.remove("show"); imgB.classList.remove("show");
    active = imgA; idle = imgB;
    show(i);
    document.getElementById("lbClose").focus();
  }
  function close() {
    document.body.classList.remove("lb-lock");
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    if (lastFocus) lastFocus.focus();
  }

  const activate = e => {
    const item = e.target.closest(".g-item");
    if (item) open(+item.dataset.i);
  };
  gallery.addEventListener("click", activate);
  gallery.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      const item = e.target.closest(".g-item");
      if (item) { e.preventDefault(); open(+item.dataset.i); }
    }
  });
  document.getElementById("lbClose").addEventListener("click", close);
  document.getElementById("lbPrev").addEventListener("click", () => show(cur - 1));
  document.getElementById("lbNext").addEventListener("click", () => show(cur + 1));
  lb.querySelector(".lb-backdrop").addEventListener("click", close);
  addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(cur - 1);
    else if (e.key === "ArrowRight") show(cur + 1);
  });

  /* touch swipe */
  let tx0 = 0, ty0 = 0;
  lb.addEventListener("touchstart", e => {
    tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - tx0;
    const dy = e.changedTouches[0].clientY - ty0;
    if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      show(cur + (dx < 0 ? 1 : -1));
    } else if (dy > 70 && Math.abs(dy) > Math.abs(dx) * 1.4) {
      close();
    }
  }, { passive: true });
})();
