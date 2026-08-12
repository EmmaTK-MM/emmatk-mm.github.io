/* Shared helpers: manifest loading, date math, image paths */

const Album = (() => {
  let manifest = null;

  async function load() {
    if (manifest) return manifest;
    const res = await fetch("data/manifest.json");
    manifest = await res.json();
    // present chapters in true chronological order (EXIF-derived)
    manifest.chapters.sort((a, b) =>
      (a.date_min || "9999").localeCompare(b.date_min || "9999"));
    return manifest;
  }

  // Poetic English copy for every chapter (titles override the manifest).
  const COPY = {
    yunzhao:   { title: "Waiting for You",       sub: "the quiet months before hello" },
    birth:     { title: "Hello, World",          sub: "the day everything began" },
    yuezi:     { title: "The Softest Days",      sub: "small hours, gentle light" },
    fiftydays: { title: "Fifty Days of You",     sub: "learning each other by heart" },
    banquet:   { title: "The Hundred-Day Feast", sub: "a room warm with love and lanterns" },
    family:    { title: "The Family Portrait",   sub: "everyone she belongs to" },
    hundred:   { title: "One Hundred Days",      sub: "one hundred mornings of wonder" },
    halfyear:  { title: "Half a Year",           sub: "a garden of lavender dreams" },
    christmas: { title: "Her First Christmas",   sub: "candy stripes and quiet joy" },
    spring:    { title: "Spring Festival",       sub: "lanterns red as luck itself" },
    oneshoot:  { title: "Turning One",           sub: "crowned in red and gold" },
    party:     { title: "One Wonderful Year",    sub: "wishes, unicorns, and one small candle" },
  };
  const copy = ch => COPY[ch.slug] || { title: ch.en, sub: "" };

  // Emma's birth date = first day of the birth chapter (from EXIF).
  function birthDate(m) {
    const b = m.chapters.find(c => c.slug === "birth");
    return b && b.date_min ? new Date(b.date_min + "T00:00:00") : null;
  }

  // Day-counter label for a chapter; the chapters before and just after
  // her birth get their own words instead of numbers.
  function dayLabel(m, ch) {
    if (ch.slug === "yunzhao") return "Before day one";
    if (ch.slug === "yuezi") return "The first moon";
    const b = birthDate(m);
    if (!b || !ch.date_min) return "";
    const d1 = Math.max(1, Math.round((new Date(ch.date_min + "T00:00:00") - b) / 864e5) + 1);
    const d2 = Math.max(1, Math.round((new Date(ch.date_max + "T00:00:00") - b) / 864e5) + 1);
    return d1 === d2 ? `Day ${d1}` : `Days ${d1} – ${d2}`;
  }

  function fmtDates(ch) {
    if (!ch.date_min) return "";
    const f = s => s.replace(/-/g, ".");
    return ch.date_min === ch.date_max ? f(ch.date_min)
      : `${f(ch.date_min)} — ${f(ch.date_max)}`;
  }

  const pad = n => String(n).padStart(4, "0");
  const thumb = (slug, p) => `img/${slug}/t/${pad(p[0])}.webp`;
  const large = (slug, p) => `img/${slug}/l/${pad(p[0])}.webp`;

  function makeReveal(cls = "seen", margin = "0px 0px -6% 0px") {
    const obs = new IntersectionObserver((entries, self) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add(cls);
          self.unobserve(e.target);
        }
      }
    }, { rootMargin: margin, threshold: 0.06 });
    return obs;
  }

  return { load, birthDate, dayLabel, fmtDates, thumb, large, makeReveal, pad, copy };
})();
