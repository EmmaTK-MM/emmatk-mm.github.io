/* Gentle background music with a floating toggle.
   Browsers require a user gesture before audio can play, so the track
   starts on the first tap/click/keypress — unless the visitor turned it
   off before (remembered in localStorage). Playback position carries
   across pages within a visit via sessionStorage. */

(() => {
  const PREF = "emma-music";       // "off" = visitor muted it
  const POS = "emma-music-pos";

  const audio = new Audio("audio/gymnopedie.m4a");
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

  function play() {
    const t = parseFloat(sessionStorage.getItem(POS) || "0");
    if (isFinite(t) && t > 0 && t < 180) audio.currentTime = t;
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

  // any gesture (except on the toggle itself) starts the music while it is
  // paused and wanted; listeners stay armed so a rejected play() (e.g. the
  // gesture not granting activation) simply retries on the next gesture
  const kick = e => {
    if (e.target && e.target.closest && e.target.closest("#musicToggle")) return;
    if (wantsMusic() && audio.paused) play();
  };
  addEventListener("pointerdown", kick);
  addEventListener("keydown", kick);

  addEventListener("pagehide", () => {
    if (!audio.paused) sessionStorage.setItem(POS, String(audio.currentTime));
  });
})();
