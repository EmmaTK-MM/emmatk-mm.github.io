/* Gentle background music with a floating toggle.
   Browsers require a user gesture before audio can play, so the track
   starts on the first tap/click/keypress — unless the visitor turned it
   off before (remembered in localStorage). Playback position carries
   across pages within a visit via sessionStorage. */

(() => {
  const PREF = "emma-music";       // "off" = visitor muted it
  const POS = "emma-music-pos";

  const audio = new Audio("audio/lullaby.mp3");
  audio.loop = true;
  audio.volume = 0.32;
  audio.preload = "auto";

  const btn = document.createElement("button");
  btn.id = "musicToggle";
  btn.type = "button";
  btn.setAttribute("aria-label", "Music on or off");
  btn.setAttribute("aria-pressed", "false");
  btn.innerHTML = "<span aria-hidden=\"true\">♪</span>";
  document.body.appendChild(btn);

  const wantsMusic = () => localStorage.getItem(PREF) !== "off";

  // Read the carried-over position ONCE, before the position-saver can
  // overwrite it with this page's early ~0s ticks. The seek itself must
  // wait for loadedmetadata: seeking a not-yet-loaded element is dropped
  // by the browser, which is what made chapters restart from the top.
  const savedPos = parseFloat(sessionStorage.getItem(POS) || "0");
  let resumed = false;
  const applyResume = () => {
    if (resumed) return;
    resumed = true;
    if (isFinite(savedPos) && savedPos > 1 &&
        audio.duration && savedPos < audio.duration - 2) {
      try { audio.currentTime = savedPos; } catch (_) { /* keep playing */ }
    }
  };
  if (audio.readyState >= 1) applyResume();
  else audio.addEventListener("loadedmetadata", applyResume, { once: true });

  function play() {
    audio.play().then(() => {
      btn.classList.add("playing");
      btn.setAttribute("aria-pressed", "true");
    }).catch(() => { /* gesture not accepted yet; next one will work */ });
  }
  function stop() {
    audio.pause();
    btn.classList.remove("playing");
    btn.setAttribute("aria-pressed", "false");
  }

  btn.addEventListener("click", e => {
    e.stopPropagation();
    if (audio.paused) {
      localStorage.setItem(PREF, "on");
      play();
    } else {
      localStorage.setItem(PREF, "off");
      stop();
    }
  });

  // start automatically on page load. Browsers reject this only on the very
  // first pageview before any interaction with the site; once the visitor
  // has tapped anything (including the link that opened this page), the
  // attempt succeeds and the music resumes where the last page left it.
  if (wantsMusic()) play();

  // fallback for that first blocked pageview: any gesture (except on the
  // toggle itself) starts the music; listeners stay armed so a rejected
  // play() simply retries on the next gesture
  const kick = e => {
    if (e.target && e.target.closest && e.target.closest("#musicToggle")) return;
    if (wantsMusic() && audio.paused) play();
  };
  window.__emmaAudio = audio;
  addEventListener("pointerdown", kick);
  addEventListener("keydown", kick);

  // keep the position fresh so the next page picks up mid-phrase
  const savePos = () => {
    if (!audio.paused) sessionStorage.setItem(POS, String(audio.currentTime));
  };
  addEventListener("pagehide", savePos);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") savePos();
  });
  audio.addEventListener("timeupdate", () => {
    // throttled by the browser to ~4Hz; cheap enough to keep always fresh
    if (!audio.paused) sessionStorage.setItem(POS, String(audio.currentTime));
  });
})();
