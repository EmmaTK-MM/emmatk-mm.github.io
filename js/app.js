/* Single-page album: home + chapter views share one living document, so
   the background music never pauses between pages. A tiny pushState
   router intercepts internal links; ?c=<slug>[&view=all] deep-links a
   chapter, anything else is home. */

(async () => {
  const m = await Album.load();
  const $ = id => document.getElementById(id);
  const homeEl = $("viewHome");
  const chapEl = $("viewChapter");

  /* ════════ lightbox (bound once; state swapped per chapter) ════════ */
  let viewList = [];          // photos the lightbox pages through
  let viewCaps = [];          // caption per index ("" in grid mode)
  let lbTitle = "";
  const lb = $("lightbox");
  const imgA = $("lbImg"), imgB = $("lbImgB");
  const cap = $("lbCaption");
  let cur = -1, active = imgA, idle = imgB, lastFocus = null, lbSlug = "";

  const preload = i => {
    if (i >= 0 && i < viewList.length) {
      const im = new Image();
      im.src = Album.large(lbSlug, viewList[i]);
    }
  };
  const setCaption = i => {
    const extra = viewCaps[i] || "";
    cap.innerHTML = `<b>${lbTitle}</b> ${i + 1} / ${viewList.length}` +
      (extra ? `<span class="lb-line">${extra}</span>` : "");
  };
  function lbShow(i) {
    if (i < 0 || i >= viewList.length) return;
    cur = i;
    const src = Album.large(lbSlug, viewList[i]);
    idle.classList.remove("show");
    const target = idle;
    target.onload = () => {
      target.onload = null; // cached images still fire load: swap once only
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
  function lbOpen(i) {
    lastFocus = document.activeElement;
    document.body.classList.add("lb-lock");
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    imgA.classList.remove("show"); imgB.classList.remove("show");
    active = imgA; idle = imgB;
    lbShow(i);
    $("lbClose").focus();
  }
  function lbClose() {
    document.body.classList.remove("lb-lock");
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    if (lastFocus) lastFocus.focus();
  }
  $("lbClose").addEventListener("click", lbClose);
  $("lbPrev").addEventListener("click", () => lbShow(cur - 1));
  $("lbNext").addEventListener("click", () => lbShow(cur + 1));
  lb.querySelector(".lb-backdrop").addEventListener("click", lbClose);
  addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") lbClose();
    else if (e.key === "ArrowLeft") lbShow(cur - 1);
    else if (e.key === "ArrowRight") lbShow(cur + 1);
  });
  let tx0 = 0, ty0 = 0;
  lb.addEventListener("touchstart", e => {
    tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - tx0;
    const dy = e.changedTouches[0].clientY - ty0;
    if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      lbShow(cur + (dx < 0 ? 1 : -1));
    } else if (dy > 70 && Math.abs(dy) > Math.abs(dx) * 1.4) {
      lbClose();
    }
  }, { passive: true });

  /* ════════ home view (built once) ════════ */
  const HERO = [
    ["yunzhao", 9], ["fiftydays", 3], ["halfyear", 2],
    ["oneshoot", 1], ["christmas", 3],
  ];
  const COVERS = {
    yunzhao:   [9, 6],
    birth:     [8, 59],
    yuezi:     [12, 1],
    fiftydays: [3, 6],
    hundred:   [3, 8],
    banquet:   [136, 263],
    halfyear:  [5, 3],
    christmas: [3, 6],
    oneshoot:  [1, 6],
    party:     [5, 3],
    spring:    [11, 3],
    family:    [4, 11],
  };

  function buildHome() {
    const slides = $("heroSlides");
    const heroSrcs = [];
    for (const [slug, idx] of HERO) {
      const ch = m.chapters.find(c => c.slug === slug);
      if (!ch || !ch.photos.length) continue;
      const p = ch.photos.find(p => p[0] === idx) || ch.photos[0];
      heroSrcs.push(Album.large(slug, p));
    }
    heroSrcs.forEach(src => {
      const d = document.createElement("div");
      d.className = "hero-slide";
      d.style.backgroundImage = `url("${src}")`;
      slides.appendChild(d);
    });
    const slideEls = [...slides.children];
    let curSlide = 0;
    if (slideEls.length) slideEls[0].classList.add("on");
    heroSrcs.slice(1).forEach(src => { const im = new Image(); im.src = src; });
    if (slideEls.length > 1) {
      setInterval(() => {
        if (homeEl.hidden) return; // don't churn while a chapter is open
        slideEls[curSlide].classList.remove("on");
        curSlide = (curSlide + 1) % slideEls.length;
        const el = slideEls[curSlide];
        el.classList.remove("on");
        void el.offsetWidth;
        el.classList.add("on");
      }, 6800);
    }

    const pre = $("preloader");
    const done = () => pre.classList.add("gone");
    if (heroSrcs.length) {
      const img = new Image();
      img.onload = done;
      img.onerror = done;
      img.src = heroSrcs[0];
      setTimeout(done, 2500);
    } else done();

    const mins = m.chapters.map(c => c.date_min).filter(Boolean).sort();
    const maxs = m.chapters.map(c => c.date_max).filter(Boolean).sort();
    if (mins.length) {
      $("heroDates").textContent =
        `${mins[0].slice(0, 7).replace("-", ".")} — ${maxs[maxs.length - 1].slice(0, 7).replace("-", ".")}`;
    }

    const totalPhotos = m.chapters.reduce((s, c) => s + c.count, 0);
    const b = Album.birthDate(m);
    const days = b && maxs.length
      ? Math.round((new Date(maxs[maxs.length - 1] + "T00:00:00") - b) / 864e5) + 1 : 0;
    const statsEl = $("stats");
    for (const [n, label] of [[totalPhotos, "PHOTOGRAPHS"],
                              [m.chapters.length, "CHAPTERS"],
                              [days, "DAYS OF EMMA"]]) {
      const div = document.createElement("div");
      div.className = "stat";
      div.innerHTML = `<b data-n="${n}">0</b><span>${label}</span>`;
      statsEl.appendChild(div);
    }
    const countUp = el => {
      const target = +el.dataset.n;
      const t0 = performance.now();
      const tick = t => {
        const k = Math.min(1, (t - t0) / 1600);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString();
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const statObs = new IntersectionObserver((es, self) => {
      for (const e of es) if (e.isIntersecting) {
        e.target.querySelectorAll("b").forEach(countUp);
        self.disconnect();
      }
    }, { threshold: 0.4 });
    statObs.observe(statsEl);

    const list = $("chapterList");
    m.chapters.forEach((ch, i) => {
      if (!ch.photos.length) return;
      const pick = k => {
        const want = (COVERS[ch.slug] || [])[k];
        return ch.photos.find(p => p[0] === want) ||
               ch.photos[Math.min(k * 7 + 1, ch.photos.length - 1)] || ch.photos[0];
      };
      const pA = pick(0), pB = pick(1);
      const c = Album.copy(ch);
      const card = document.createElement("a");
      card.className = "chapter-card";
      card.href = `?c=${ch.slug}`;
      card.innerHTML = `
        <div class="card-photos">
          <div class="ph ph1" style="background-image:url('${Album.large(ch.slug, pA)}')"></div>
          <div class="ph ph2" style="background-image:url('${Album.thumb(ch.slug, pB)}')"></div>
        </div>
        <div class="card-text">
          <p class="card-num">Chapter ${String(i + 1).padStart(2, "0")}</p>
          <p class="card-day">${Album.dayLabel(m, ch)}</p>
          <h3 class="card-title">${c.title}</h3>
          <p class="card-en">${c.sub}</p>
          <div class="card-rule"></div>
          <p class="card-meta">${ch.picks && ch.picks.length
            ? `<b>${ch.picks.length}</b> moments · from ${ch.count} photographs`
            : `<b>${ch.count}</b> photographs`} · ${Album.fmtDates(ch)}</p>
          <span class="card-link">OPEN THE CHAPTER</span>
        </div>`;
      list.appendChild(card);
    });
    const reveal = Album.makeReveal();
    list.querySelectorAll(".chapter-card").forEach(el => reveal.observe(el));
  }
  buildHome();

  /* ════════ chapter view (rebuilt per navigation) ════════ */
  const gallery = $("gallery");
  const GAP = () => (innerWidth <= 760 ? 5 : 8);
  const TARGET_H = () => Math.max(150, Math.min(300, innerWidth * 0.21));
  let revealObs = null;
  let gridChapter = null;   // chapter currently laid out as a grid
  let gridBuilt = false;

  function renderChapter(slug, showAll) {
    let idx = m.chapters.findIndex(c => c.slug === slug);
    if (idx < 0) idx = 0;
    const ch = m.chapters[idx];
    const cp = Album.copy(ch);
    const picks = (ch.picks || []).filter(pk => ch.photos.some(p => p[0] === pk[0]));
    const usePicks = picks.length > 0 && !showAll;

    document.title = `${cp.title} · Emma`;
    $("topbarTitle").textContent = cp.title;
    $("topbarCount").textContent = usePicks
      ? `${picks.length} MOMENTS` : `${ch.count} PHOTOGRAPHS`;
    $("chDay").textContent = Album.dayLabel(m, ch);
    $("chTitle").textContent = cp.title;
    $("chEn").textContent = cp.sub;
    $("chDates").textContent = Album.fmtDates(ch);

    const mk = (c, cls, label) => `
      <a class="cn-link ${cls}" href="?c=${c.slug}">
        <small>${label}</small><b>${Album.copy(c).title}</b><i>${Album.copy(c).sub}</i>
      </a>`;
    let navHtml = "";
    if (idx > 0) navHtml += mk(m.chapters[idx - 1], "prev", "← Previous chapter");
    if (idx < m.chapters.length - 1) navHtml += mk(m.chapters[idx + 1], "next", "Next chapter →");
    $("chapterNav").innerHTML = navHtml;

    const findPhoto = i => ch.photos.find(p => p[0] === i);
    lbSlug = ch.slug;
    lbTitle = cp.title;
    // stray view-all link from a previous grid render
    const old = chapEl.querySelector(".gallery-wrap > .view-all");
    if (old) old.remove();

    if (usePicks) {
      viewList = picks.map(pk => findPhoto(pk[0]));
      viewCaps = picks.map(pk => pk[1]);
      gridChapter = null;
      buildPicks(ch, picks);
    } else {
      viewList = ch.photos;
      viewCaps = [];
      gridChapter = ch;
      gridBuilt = false;
      buildGrid(ch, cp);
      if (picks.length) {
        const back = document.createElement("p");
        back.className = "view-all";
        back.innerHTML = `<a href="?c=${ch.slug}">← back to the chosen moments</a>`;
        gallery.parentElement.appendChild(back);
      }
    }
  }

  function buildPicks(ch, picks) {
    gallery.className = "gallery picks-mode";
    if (revealObs) revealObs.disconnect();
    const frag = document.createDocumentFragment();
    picks.forEach((pk, k) => {
      const p = ch.photos.find(q => q[0] === pk[0]);
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
      const capEl = document.createElement("figcaption");
      capEl.className = "pick-cap";
      capEl.textContent = pk[1];
      fig.appendChild(wrap);
      fig.appendChild(capEl);
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
    more.innerHTML = `<a href="?c=${ch.slug}&view=all">every photograph from this chapter · ${ch.count} →</a>`;
    frag.appendChild(more);
    gallery.replaceChildren(frag);
    revealObs = Album.makeReveal("seen", "0px 0px -4% 0px");
    gallery.querySelectorAll(".pick").forEach(el => revealObs.observe(el));
  }

  function buildGrid(ch, cp) {
    gallery.className = "gallery";
    const W = gallery.clientWidth || chapEl.clientWidth || innerWidth - 52;
    if (!W) return;
    const gap = GAP(), targetH = TARGET_H();
    const rows = [];
    let row = [], arSum = 0;
    for (const p of ch.photos) {
      const ar = p[1] / p[2];
      if (row.length) {
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

    if (revealObs) revealObs.disconnect();
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
        const n = ch.photos.indexOf(p);
        item.setAttribute("aria-label", `View photo ${n + 1} of ${ch.photos.length}`);
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
    if (gridBuilt) {
      gallery.querySelectorAll(".g-item").forEach(el => el.classList.add("seen"));
    } else {
      revealObs = Album.makeReveal("seen", "0px 0px 10% 0px");
      gallery.querySelectorAll(".g-item").forEach(el => revealObs.observe(el));
      gridBuilt = true;
    }
  }

  let rt;
  addEventListener("resize", () => {
    if (!gridChapter || chapEl.hidden) return;
    clearTimeout(rt);
    rt = setTimeout(() => buildGrid(gridChapter, Album.copy(gridChapter)), 180);
  });

  gallery.addEventListener("click", e => {
    const item = e.target.closest(".g-item");
    if (item) lbOpen(+item.dataset.i);
  });
  gallery.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      const item = e.target.closest(".g-item");
      if (item) { e.preventDefault(); lbOpen(+item.dataset.i); }
    }
  });

  /* ════════ router ════════ */
  let homeScroll = 0;
  function route(fromNav) {
    const q = new URLSearchParams(location.search);
    const c = q.get("c");
    if (lb.classList.contains("open")) lbClose();
    if (c) {
      if (!homeEl.hidden) homeScroll = scrollY;
      homeEl.hidden = true;
      chapEl.hidden = false;
      document.body.className = "chapter-page";
      $("preloader").classList.add("gone");
      renderChapter(c, q.get("view") === "all");
      if (fromNav) scrollTo(0, 0);
    } else {
      chapEl.hidden = true;
      homeEl.hidden = false;
      document.body.className = "home";
      document.title = "Emma — A Family Album";
      if (fromNav) scrollTo(0, homeScroll);
    }
  }

  document.addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const a = e.target.closest("a[href]");
    if (!a || a.origin !== location.origin) return;
    if (a.hash) return; // in-page anchors (#story) keep native behavior
    const path = a.pathname.replace(/^.*\//, "");
    if (path && path !== "index.html" && path !== "chapter.html") return;
    e.preventDefault();
    const dest = a.search ? "./" + a.search : "./";
    if ("./" + location.search !== dest) {
      history.pushState(null, "", dest);
      route(true);
    }
  });
  addEventListener("popstate", () => route(true));
  route(false);
})();
