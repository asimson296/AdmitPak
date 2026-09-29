/**
 * AdmitPak — Pappu the Mascot Tour
 */

(function () {
  const TOUR_KEY = "admitpak_pappu_tour_v1";

  const STEPS = [
    { emoji: "👋", text: "Dear Student... AdmitPak par khush aamdeed! Mera naam hai Pappu — is website ka developer.", anim: "wave" },
    { emoji: "🤦", text: "Kisi bhi Pakistani university ki admission ke mutaliq malomat hasil karne ke liye mujhe kafi time lagta tha. Kai pages scroll karne pdutay thay, kabhi malomat na milti thi ya mujh se miss bhi ho jati thi...", anim: "sad" },
    { emoji: "✊", text: "Jab main ne dekha ke dosray Pakistani undergraduates isi tarah ke masle ka samna kar rahe hain, to main ne is website ko banane ka faisla kiya. Din raat kaam kiya, coding ki, data collect kiya, structure banaya aur finally is ka pehla version upload kar diya.", anim: "punch" },
    { emoji: "🫵", text: "Ab main yahan par aap ko samjhane ke liye mojood hoon ke is ko kaise use krna hai. Kya aap tayyar hain? ...OK!", anim: "point" },
    { emoji: "👆", text: "First 'Universities': Yahan par aap NUST, FAST, LUMS, COMSATS, UET Lahore, GIKI, NED aur Punjab University ki mukammal malomat hasil kar saktay hain.", highlight: ".main-nav a[href*='universities']", anim: "point" },
    { emoji: "👈", text: "Second 'Saved': Yahan par un universities ko dekh saktay hain jin ko aap track kartay hain.", highlight: ".main-nav a[href*='saved']", anim: "point" },
    { emoji: "💬", text: "Third 'Feedback': Yahan par aap koi issue, koi new feature ya kisi bhi tarah ki baat likh saktay hain. Main aap ki baat ko mukammal focus se padhoon ga.", highlight: "#feedback-fab", anim: "point" },
    { emoji: "✉️", text: "Fourth 'admitpak.pk@gmail.com': Agar aap ne koi personal baat krni ho, salah deni ho, ya mashwara lena ho, to aap is email ko use kar saktay hain.", anim: "point" },
    { emoji: "👍", text: "Last 'Pappu (me)': Agar aap ko kisi cheez ki samajh na aaye, to aap mujhe press kar ke meri khidmat dobara hasil kar saktay hain. Main aap ke liye har time hazir hoon.", highlight: "#pappu-mascot", anim: "praise" },
    { emoji: "🙏", text: "Apnay doston ko bhi is ke baray mein batayein aur un ko bhi share karein takay woh bhi is se faida le sakain. Aap ke tawajjo ka shukriya!", anim: "praise" }
  ];

  // ---------- Text-to-Speech ----------
  let speechEnabled = true;
  let voiceReady = false;
  let preferredVoice = null;

  const MALE_HINTS = [
    "male","microsoft ravi","microsoft hemant","microsoft prabhat",
    "google uk english male","microsoft david","microsoft mark",
    "microsoft george","microsoft james","microsoft ryan","microsoft guy",
    "daniel","alex","fred","oliver","thomas","rishi","rishi (en-in)",
    "google हिन्दी","microsoft kumar","microsoft hemant"
  ];
  const FEMALE_HINTS = [
    "female","microsoft zira","microsoft hazel","microsoft susan",
    "microsoft heera","microsoft kalpana","microsoft swara",
    "samantha","karen","tessa","moira","fiona","veena","victoria",
    "google uk english female","google us english","catherine"
  ];

  function scoreVoice(v) {
    let score = 0;
    const name = (v.name || "").toLowerCase();
    const lang = (v.lang || "").toLowerCase();

    // Language priority
    if (lang.startsWith("ur")) score += 100;      // Urdu
    else if (lang.startsWith("hi")) score += 80;  // Hindi
    else if (lang.includes("pk") || lang.includes("in")) score += 50;
    else if (lang.startsWith("en-gb")) score += 30;
    else if (lang.startsWith("en")) score += 20;

    // Male preference (strong)
    if (MALE_HINTS.some(h => name.includes(h))) score += 200;
    if (FEMALE_HINTS.some(h => name.includes(h))) score -= 150;

    return score;
  }

  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Sort by score, pick highest
    const scored = voices.map(v => ({ v, s: scoreVoice(v) }))
                         .sort((a, b) => b.s - a.s);
    preferredVoice = scored[0].v;
    voiceReady = true;
  }

  if ("speechSynthesis" in window) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  // Roman Urdu → phonetic respelling for better TTS pronunciation
  const PRONUNCIATION_MAP = [
    [/\bDear Student\b/gi, "Dear Stu-dent"],
    [/\bAdmitPak\b/g, "Ad-mit Pack"],
    [/\bAssalam-o-Alaikum\b/gi, "As-sa-laam-o A-lai-kum"],
    [/\bPappu\b/g, "Pup-poo"],
    [/\bNUST\b/g, "Nust"],
    [/\bFAST\b/g, "Fast"],
    [/\bLUMS\b/g, "Lums"],
    [/\bCOMSATS\b/g, "Com-sats"],
    [/\bUET\b/g, "U-E-T"],
    [/\bGIKI\b/g, "Gikki"],
    [/\bNED\b/g, "Ned"],
    [/\bPIEAS\b/g, "Pee-as"],
    [/\bHEC\b/g, "H-E-C"],
    [/\bmatric\b/gi, "mat-ric"],
    [/\bFSc\b/g, "F-S-C"],
    [/\bshukriya\b/gi, "shuk-ri-yaa"],
    [/\btawajjo\b/gi, "ta-waj-jo"],
    [/\btavon\b/gi, "ta-waj-jo"],
    [/\bmashwara\b/gi, "mash-wa-raa"],
    [/\bmalomat\b/gi, "ma-loo-maat"],
    [/\bmutaliq\b/gi, "mo-taa-lik"],
    [/\bmotlq\b/gi, "mo-taa-lik"]
  ];

  function respellForTTS(text) {
    let out = text;
    for (const [pattern, replacement] of PRONUNCIATION_MAP) {
      out = out.replace(pattern, replacement);
    }
    return out;
  }

  function speak(text) {
    if (!speechEnabled || !("speechSynthesis" in window)) return;
    // Browser blocks speech before first user interaction
    if (!userHasInteracted) return;
    try {
      window.speechSynthesis.cancel(); // stop any previous speech
      const utter = new SpeechSynthesisUtterance(respellForTTS(text));
      if (!voiceReady) pickVoice();
      if (preferredVoice) utter.voice = preferredVoice;
      utter.rate = 0.9;
      utter.pitch = 0.9;
      utter.volume = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (err) {
      // Silent fail — speech is optional
    }
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
  }

  function pauseSpeaking() {
    if (!("speechSynthesis" in window)) return false;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      try {
        window.speechSynthesis.pause();
        isPaused = true;
        return true;
      } catch { return false; }
    }
    return false;
  }

  function resumeSpeaking() {
    if (!("speechSynthesis" in window)) return false;
    if (window.speechSynthesis.paused) {
      try {
        window.speechSynthesis.resume();
        isPaused = false;
        return true;
      } catch { return false; }
    }
    return false;
  }

  function replayCurrent() {
    const step = STEPS[currentIdx];
    if (step) speak(step.text);
  }

  function hasCompleted() { try { return localStorage.getItem(TOUR_KEY) === "true"; } catch { return false; } }
  function markCompleted() { try { localStorage.setItem(TOUR_KEY, "true"); } catch {} }
  function resetTour() { try { localStorage.removeItem(TOUR_KEY); } catch {} }

  let mascotEl, bubbleEl, bubbleTextEl, expressionEl, nextBtn, skipBtn;
  let userHasInteracted = false;
  let isPaused = false;
  let currentIdx = 0;
  let highlightedEl = null;
  let animTimer = null;

  function updatePauseBtn() {
    const btn = document.getElementById("pappu-pause");
    if (!btn) return;
    btn.textContent = isPaused ? "▶" : "⏸";
    btn.title = isPaused ? "Resume voice" : "Pause voice";
  }

  function buildUI() {
    if (document.getElementById("pappu-mascot")) return;

    mascotEl = document.createElement("div");
    mascotEl.id = "pappu-mascot";
    mascotEl.className = "pappu-mascot";
    mascotEl.setAttribute("role", "button");
    mascotEl.setAttribute("aria-label", "Pappu — guide");
    mascotEl.innerHTML =
      '<div class="pappu-avatar">' +
        '<img src="/images/mascot/pappu.webp" alt="Pappu" loading="lazy">' +
      '</div>' +
      '<div class="pappu-expression" id="pappu-expression">👋</div>' +
      '<div class="pappu-pulse"></div>' +
      '<div class="pappu-name">Pappu</div>';
    document.body.appendChild(mascotEl);

    bubbleEl = document.createElement("div");
    bubbleEl.id = "pappu-bubble";
    bubbleEl.className = "pappu-bubble";
    bubbleEl.hidden = true;
    bubbleEl.innerHTML =
      '<div class="pappu-bubble-content">' +
        '<p class="pappu-bubble-text" id="pappu-bubble-text"></p>' +
        '<div class="pappu-bubble-actions">' +
          '<button type="button" class="pappu-btn-icon" id="pappu-voice" title="Toggle voice">🔊</button>' +
          '<button type="button" class="pappu-btn-icon" id="pappu-pause" title="Pause voice">⏸</button>' +
          '<button type="button" class="pappu-btn-icon" id="pappu-replay" title="Replay this message">↻</button>' +
          '<button type="button" class="pappu-btn-skip" id="pappu-skip">Skip</button>' +
          '<button type="button" class="pappu-btn-next" id="pappu-next">Next →</button>' +
        '</div>' +
      '</div>' +
      '<div class="pappu-bubble-tail"></div>';
    document.body.appendChild(bubbleEl);

    bubbleTextEl = document.getElementById("pappu-bubble-text");
    expressionEl = document.getElementById("pappu-expression");
    nextBtn = document.getElementById("pappu-next");
    skipBtn = document.getElementById("pappu-skip");

    mascotEl.addEventListener("click", function () {
      if (bubbleEl.hidden) startTour();
      else nextStep();
    });
    nextBtn.addEventListener("click", function () {
      // If voice hasn't been unlocked yet, this click unlocks it
      // AND speaks the current step WITHOUT advancing.
      if (!userHasInteracted) {
        userHasInteracted = true;
        const step = STEPS[currentIdx];
        if (step) speak(step.text);
        nextBtn.textContent = "Next →";
        return;
      }
      nextStep();
    });

    skipBtn.addEventListener("click", endTour);

    const voiceBtn = document.getElementById("pappu-voice");
    if (voiceBtn) {
      voiceBtn.addEventListener("click", function () {
        speechEnabled = !speechEnabled;
        voiceBtn.textContent = speechEnabled ? "🔊" : "🔇";
        if (speechEnabled) {
          replayCurrent();
        } else {
          stopSpeaking();
          isPaused = false;
          updatePauseBtn();
        }
      });
    }

    const pauseBtn = document.getElementById("pappu-pause");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", function () {
        if (!("speechSynthesis" in window)) return;

        // Chrome-on-Linux pause/resume is broken.
        // Workaround: pause = cancel speech, resume = re-speak from start.
        if (isPaused) {
          // RESUME: re-speak current step
          isPaused = false;
          updatePauseBtn();
          replayCurrent();
        } else {
          // PAUSE: stop the speech
          try { window.speechSynthesis.cancel(); } catch {}
          isPaused = true;
          updatePauseBtn();
        }
      });
    }

    const replayBtn = document.getElementById("pappu-replay");
    if (replayBtn) {
      replayBtn.addEventListener("click", function () {
        isPaused = false;
        updatePauseBtn();
        replayCurrent();
      });
    }


  }

  function clearHighlight() {
    if (highlightedEl) {
      highlightedEl.classList.remove("pappu-highlight");
      highlightedEl = null;
    }
  }

  function highlightSelector(selector) {
    clearHighlight();
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add("pappu-highlight");
    highlightedEl = el;
    const rect = el.getBoundingClientRect();
    if (rect.top < 60 || rect.bottom > window.innerHeight - 40) {
      try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
    }
  }

  function runAnim(name) {
    if (!mascotEl || !name) return;
    if (animTimer) clearTimeout(animTimer);
    mascotEl.classList.remove("pappu-anim-wave","pappu-anim-sad","pappu-anim-punch","pappu-anim-point","pappu-anim-praise");
    void mascotEl.offsetWidth;
    mascotEl.classList.add("pappu-anim-" + name);
    animTimer = setTimeout(function () {
      mascotEl.classList.remove("pappu-anim-" + name);
    }, 2000);
  }

  function showStep(idx) {
    const step = STEPS[idx];
    if (!step) return endTour();

    isPaused = false;
    expressionEl.textContent = step.emoji;
    bubbleTextEl.textContent = step.text;
    updatePauseBtn();

    // First step: change button to hint at voice
    if (idx === 0 && !userHasInteracted) {
      nextBtn.textContent = "🔊 Start with Voice →";
    } else if (idx === STEPS.length - 1) {
      nextBtn.textContent = "Finish ✓";
    } else {
      nextBtn.textContent = "Next →";
    }

    highlightSelector(step.highlight || null);
    runAnim(step.anim || "wave");

    bubbleEl.hidden = false;
    bubbleEl.classList.remove("pappu-pop");
    void bubbleEl.offsetWidth;
    bubbleEl.classList.add("pappu-pop");

    // Speak the text out loud
    speak(step.text);
  }

  function startTour() { currentIdx = 0; showStep(currentIdx); }
  function nextStep() { currentIdx++; if (currentIdx >= STEPS.length) return endTour(); showStep(currentIdx); }
  function endTour() {
    markCompleted();
    clearHighlight();
    stopSpeaking();
    if (bubbleEl) bubbleEl.hidden = true;
    if (mascotEl) mascotEl.classList.remove("pappu-anim-wave","pappu-anim-sad","pappu-anim-punch","pappu-anim-point","pappu-anim-praise");
  }

  function autoStart() {
    // Always auto-start the tour — every visit
    setTimeout(startTour, 1800);
  }

  window.addEventListener("beforeunload", stopSpeaking);

  document.addEventListener("DOMContentLoaded", function () { buildUI(); autoStart(); });

  window.AdmitPakPappu = {
    start: function () { resetTour(); buildUI(); startTour(); },
    reset: resetTour
  };
})();
