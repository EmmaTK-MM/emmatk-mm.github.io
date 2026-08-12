/* Landing page: hero slideshow, stats, chapter cards */

(async () => {
  const m = await Album.load();

  /* ---------- hero slideshow ----------
     HERO lists [slug, photoIndex] pairs, hand-picked covers.
     Falls back to each chapter's first photo if an index is missing. */
  const HERO = [
    ["yunzhao", 9],     // couple with the ultrasound: where it begins
    ["fiftydays", 3],   // parents leaning over the newborn, white bed
    ["halfyear", 2],    // wide lavender dreamscape
    ["oneshoot", 1],    // first birthday in red and gold
    ["christmas", 3],   // whole family and the dog by the tree
  ];
  const slides = document.getElementById("heroSlides");
  const heroSrcs = [];
  for (const [slug, idx] of HERO) {
    const ch = m.chapters.find(c => c.slug === slug);
    if (!ch || !ch.photos.length) continue;
    const p = ch.photos.find(p => p[0] === idx) || ch.photos[0];
    heroSrcs.push(Album.large(slug, p));
  }
  heroSrcs.forEach((src, i) => {
    const d = document.createElement("div");
    d.className = "hero-slide";
    d.style.backgroundImage = `url("${src}")`;
    slides.appendChild(d);
  });
  const slideEls = [...slides.children];
  let cur = 0;
  if (slideEls.length) slideEls[0].classList.add("on");
  // preload every hero image up front so a crossfade never lands on an
  // image that has not arrived yet (which reads as a dark gap)
  heroSrcs.slice(1).forEach(src => { const im = new Image(); im.src = src; });
  if (slideEls.length > 1) {
    setInterval(() => {
      slideEls[cur].classList.remove("on");
      cur = (cur + 1) % slideEls.length;
      // restart the ken burns animation cleanly
      const el = slideEls[cur];
      el.classList.remove("on");
      void el.offsetWidth;
      el.classList.add("on");
    }, 6800);
  }

  // hide preloader once the first hero image is ready (or after 2.5 s)
  const pre = document.getElementById("preloader");
  const done = () => pre.classList.add("gone");
  if (heroSrcs.length) {
    const img = new Image();
    img.onload = done;
    img.onerror = done;
    img.src = heroSrcs[0];
    setTimeout(done, 2500);
  } else done();

  /* ---------- hero dates ---------- */
  const mins = m.chapters.map(c => c.date_min).filter(Boolean).sort();
  const maxs = m.chapters.map(c => c.date_max).filter(Boolean).sort();
  if (mins.length) {
    document.getElementById("heroDates").textContent =
      `${mins[0].slice(0, 7).replace("-", ".")} — ${maxs[maxs.length - 1].slice(0, 7).replace("-", ".")}`;
  }

  /* ---------- stats with count-up ---------- */
  const totalPhotos = m.chapters.reduce((s, c) => s + c.count, 0);
  const b = Album.birthDate(m);
  const days = b && maxs.length
    ? Math.round((new Date(maxs[maxs.length - 1] + "T00:00:00") - b) / 864e5) + 1 : 0;
  const stats = [
    [totalPhotos, "PHOTOGRAPHS"],
    [m.chapters.length, "CHAPTERS"],
    [days, "DAYS OF EMMA"],
  ];
  const statsEl = document.getElementById("stats");
  for (const [n, label] of stats) {
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

  /* ---------- chapter cards ---------- */
  // hand-tunable covers: slug -> [photoIndexA, photoIndexB]
  const COVERS = {
    yunzhao:   [9, 6],
    birth:     [8, 59],
    yuezi:     [12, 1],
    fiftydays: [3, 6],
    hundred:   [3, 8],
    banquet:   [11, 8],
    halfyear:  [5, 3],
    christmas: [3, 6],
    oneshoot:  [1, 6],
    party:     [5, 3],
    spring:    [11, 3],
    family:    [4, 11],
  };
  const list = document.getElementById("chapterList");
  m.chapters.forEach((ch, i) => {
    if (!ch.photos.length) return;
    const pick = k => {
      const want = (COVERS[ch.slug] || [])[k];
      return ch.photos.find(p => p[0] === want) || ch.photos[Math.min(k * 7 + 1, ch.photos.length - 1)] || ch.photos[0];
    };
    const pA = pick(0), pB = pick(1);
    const c = Album.copy(ch);
    const card = document.createElement("a");
    card.className = "chapter-card";
    card.href = `chapter.html?c=${ch.slug}`;
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
})();
