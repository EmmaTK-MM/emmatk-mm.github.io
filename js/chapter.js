/* Chapter gallery: justified rows, lazy loading, lightbox */

(async () => {
  const m = await Album.load();
  const slug = new URLSearchParams(location.search).get("c") || m.chapters[0].slug;
  const idx = m.chapters.findIndex(c => c.slug === slug);
  const ch = m.chapters[idx] || m.chapters[0];

  const cp = Album.copy(ch);
  document.title = `${cp.title} · Emma`;
  document.getElementById("topbarTitle").textContent = cp.title;
  document.getElementById("topbarCount").textContent = `${ch.count} PHOTOGRAPHS`;
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

  /* ---------- justified rows layout ----------
     Uses manifest [idx, w, h]; no image loading needed to lay out. */
  const gallery = document.getElementById("gallery");
  const photos = ch.photos;
  const GAP = () => (innerWidth <= 760 ? 5 : 8);
  const TARGET_H = () => Math.max(190, Math.min(300, innerWidth * 0.21));

  let built = false;
  function layout() {
    const W = gallery.clientWidth;
    if (!W) return;
    const gap = GAP(), targetH = TARGET_H();
    const rows = [];
    let row = [], arSum = 0;
    for (const p of photos) {
      const ar = p[1] / p[2];
      row.push(p); arSum += ar;
      if (arSum * targetH >= W - gap * (row.length - 1)) {
        rows.push([row, arSum]); row = []; arSum = 0;
      }
    }
    if (row.length) rows.push([row, arSum]);

    const frag = document.createDocumentFragment();
    rows.forEach(([r, sum]) => {
      const h = Math.min((W - gap * (r.length - 1)) / sum,
                         targetH * 1.55); // last short row: don't blow up
      const div = document.createElement("div");
      div.className = "g-row";
      for (const p of r) {
        const w = h * (p[1] / p[2]);
        const item = document.createElement("figure");
        item.className = "g-item";
        item.style.width = `${(100 * w) / W}%`;
        item.style.aspectRatio = `${p[1]} / ${p[2]}`;
        item.dataset.i = photos.indexOf(p);
        const img = document.createElement("img");
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = `${cp.title} · Emma`;
        img.src = Album.thumb(ch.slug, p);
        img.onload = () => img.classList.add("ld");
        if (img.complete) img.classList.add("ld");
        item.appendChild(img);
        div.appendChild(item);
      }
      frag.appendChild(div);
    });
    gallery.replaceChildren(frag);
    const reveal = Album.makeReveal("seen", "0px 0px 10% 0px");
    gallery.querySelectorAll(".g-item").forEach(el => reveal.observe(el));
    built = true;
  }
  layout();
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 180); });

  /* ---------- lightbox ---------- */
  const lb = document.getElementById("lightbox");
  const imgA = document.getElementById("lbImg");
  const imgB = document.getElementById("lbImgB");
  const cap = document.getElementById("lbCaption");
  let cur = -1, active = imgA, idle = imgB;

  const preload = i => {
    if (i >= 0 && i < photos.length) {
      const im = new Image();
      im.src = Album.large(ch.slug, photos[i]);
    }
  };

  function show(i, instant) {
    if (i < 0 || i >= photos.length) return;
    cur = i;
    const src = Album.large(ch.slug, photos[i]);
    idle.classList.remove("show");
    const target = idle;
    target.onload = () => {
      active.classList.remove("show");
      target.classList.add("show");
      [active, idle] = [target, active];
      cap.innerHTML = `<b>${cp.title}</b> ${i + 1} / ${photos.length}`;
      preload(i + 1); preload(i - 1);
    };
    target.onerror = () => {
      cap.innerHTML = `<b>${cp.title}</b> ${i + 1} / ${photos.length}`;
    };
    target.src = src;
    // cached or unchanged src fires no load event — invoke the handler directly
    if (target.complete && target.naturalWidth) target.onload();
  }

  function open(i) {
    document.body.classList.add("lb-lock");
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    imgA.classList.remove("show"); imgB.classList.remove("show");
    active = imgA; idle = imgB;
    show(i, true);
  }
  function close() {
    document.body.classList.remove("lb-lock");
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
  }

  gallery.addEventListener("click", e => {
    const item = e.target.closest(".g-item");
    if (item) open(+item.dataset.i);
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
