// ================= TERMINAL =================
let terminal;
let terminalFallback;

function logFallback(message) {
  const outputEl = document.getElementById("output");
  if (!outputEl) return;
  outputEl.style.display = "block";
  outputEl.textContent += message + "\n";
  outputEl.scrollTop = outputEl.scrollHeight;
}

function initLiveTerminal() {
  if (terminal) return;
  if (typeof Terminal === "function") {
    terminal = new Terminal({ cursorBlink: true });
    terminal.open(document.getElementById("liveTerminal"));
    terminal.onData((data) => {
      if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
        liveSocket.send(JSON.stringify({ type: "stdin", data }));
        terminal.write(data);
      }
    });
    terminal.writeln('Live terminal ready. Click "▶ Run" to execute.');
    terminalFallback = null;
  } else {
    terminalFallback = true;
    logFallback("xterm.js not loaded; using fallback output view.");
  }
}

function terminalWrite(text) {
  if (!terminal && !terminalFallback) initLiveTerminal();
  if (terminal) {
    terminal.write(text.replace(/\n/g, "\r\n"));
  } else {
    logFallback(text);
  }
}

function terminalWriteln(text) {
  if (!terminal && !terminalFallback) initLiveTerminal();
  if (terminal) {
    terminal.writeln(text);
  } else {
    logFallback(text);
  }
}


// ================= EDITOR =================
let editor;
let isMonaco = false;

function initializeEditor() {
  const editorContainer = document.getElementById("editor");
  const fallbackTextarea = document.getElementById("editorFallback");

  function useFallback() {
    editorContainer.classList.add("hidden");
    fallbackTextarea.classList.remove("hidden");
    editor = {
      getValue: () => fallbackTextarea.value,
      setValue: (v) => { fallbackTextarea.value = v; },
    };
  }

  if (typeof window.require === "function") {
    try {
      window.require.config({
        paths: { vs: "https://unpkg.com/monaco-editor@0.44.0/min/vs" },
      });
      window.require(["vs/editor/editor.main"], function () {
        isMonaco = true;
        editorContainer.classList.remove("hidden");
        fallbackTextarea.classList.add("hidden");
        editor = monaco.editor.create(editorContainer, {
        value: "// Write code here",
        language: "javascript",
        theme: "vs-dark",
        automaticLayout: true,
        fontSize: 16,
        mouseWheelZoom: true,
        });
      });
      return;
    } catch (e) {
      console.warn("Monaco failed, fallback used");
    }
  }
  useFallback();
}

function getEditorCode() {
  if (editor && typeof editor.getValue === "function") {
    return editor.getValue();
  }
  return document.getElementById("editorFallback").value;
}


// ================= COMPILE =================
async function compileCode() {
  robotReact("compile");
  const code = getEditorCode();
  const language = document.getElementById("language").value;

  if (!code.trim()) {
    terminalWriteln("⚠️ Source code is empty.");
    return;
  }

  if (!terminal && !terminalFallback) initLiveTerminal();
  terminal && terminal.clear();
  terminalWriteln("⚙️ Compiling... please wait.");

  try {
    const res = await fetch("/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, code })
    });
    const data = await res.json();
    terminal && terminal.clear();
    terminalWriteln(data.output || "No output.");
    if (data.output && data.output.startsWith("✅")) {
      robotReact("compile_ok");
    } else if (data.output && data.output.startsWith("❌")) {
      robotReact("error");
    }
  } catch (err) {
    terminalWriteln("❌ Compile request failed: " + err.message);
    robotReact("error");
  }
}


// ================= LIVE RUN =================
let liveSocket;

function startLiveSession() {
  robotReact("run");
  document.getElementById("statRuns").innerText =
    parseInt(document.getElementById("statRuns").innerText || 0) + 1;

  const code = getEditorCode();
  const language = document.getElementById("language").value;

  if (!code.trim()) {
    terminalWriteln("⚠️ Provide code to execute.");
    return;
  }

  if (!terminal && !terminalFallback) initLiveTerminal();
  if (liveSocket) liveSocket.close();

  terminal && terminal.clear();
  terminalWriteln("🔌 Connecting...");

  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  liveSocket = new WebSocket(wsUrl);

  liveSocket.onopen = () => {
    terminal && terminal.clear();
    terminalWriteln("▶ Running...\r\n");
    liveSocket.send(JSON.stringify({ type: "start", language, code }));
  };

  liveSocket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "output") {
      terminalWrite(msg.data);
    } else if (msg.type === "exit") {
      robotReact(msg.code === 0 ? "success" : "error");
      terminalWriteln(`\r\n--- Exited with code ${msg.code} ---`);
      if (msg.code === 0) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        if (window.saveHistory) {
          const lang = document.getElementById("language").value;
          const mem = Math.floor(Math.random() * 512 + 128) + " KB";
          window.saveHistory("Program - " + new Date().toLocaleTimeString(), lang, mem);
        }
      }
    } else if (msg.type === "error") {
      terminalWriteln(`\r\n❌ Error: ${msg.err}`);
      robotReact("error");
    }
  };

  liveSocket.onclose = () => {
    terminalWriteln("\r\n🔌 Disconnected.");
  };
}


// ================= EXPLAIN =================
async function explainCode() {
  robotReact("explain");
  const code = getEditorCode();
  const language = document.getElementById("language").value;

  if (!code.trim()) {
    alert("No code to explain!");
    return;
  }

  const content = document.getElementById("explanationContent");
  content.innerText = "Fetching explanation...";

  try {
    const res = await fetch("/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language })
    });
    const data = await res.json();
    content.innerText = data.explanation || "No explanation received.";
  } catch (err) {
    content.innerText = "Failed to fetch explanation: " + err.message;
  }
}


// ================= THEME =================
function toggleThemePicker() {
  const picker = document.getElementById("themePicker");
  picker.classList.toggle("hidden");
}

function applyTheme(theme) {
  const themes = {
    instagram: {
      bar1: "linear-gradient(90deg,#833ab4,#fd1d1d,#fcb045)",
      bar2: "linear-gradient(90deg,#6a1a8a,#c0392b)",
      bg: "#1a0533"
    },
    twitter: {
      bar1: "linear-gradient(90deg,#0d8bd9,#1da1f2)",
      bar2: "linear-gradient(90deg,#0a6fa8,#0d8bd9)",
      bg: "#0a1628"
    },
    duolingo: {
      bar1: "linear-gradient(90deg,#2d6a04,#58cc02)",
      bar2: "linear-gradient(90deg,#1e4d02,#3a8c01)",
      bg: "#0a1f0a"
    },
    github: {
      bar1: "linear-gradient(90deg,#161b22,#21262d)",
      bar2: "linear-gradient(90deg,#21262d,#30363d)",
      bg: "#0d1117"
    },
    synthwave: {
      bar1: "linear-gradient(90deg,#2d0057,#7b2fff,#ff00ff)",
      bar2: "linear-gradient(90deg,#1a003a,#4a00b0)",
      bg: "#0d0015"
    },
    ocean: {
      bar1: "linear-gradient(90deg,#0072ff,#00c6ff)",
      bar2: "linear-gradient(90deg,#004ea8,#0072ff)",
      bg: "#001628"
    }
  };

  const t = themes[theme];
  if (!t) return;

  document.querySelector(".top-bar").style.background = t.bar1;
  document.querySelector(".second-bar").style.background = t.bar2;
  document.body.style.background = t.bg;

  const emojis = {
    instagram: "💜", twitter: "🐦",
    duolingo: "🦉", github: "🐙",
    synthwave: "🌆", ocean: "🌊"
  };
  document.getElementById("robotBody").innerText = emojis[theme] || "🤖";
  robotSay(`${emojis[theme]} ${theme.charAt(0).toUpperCase() + theme.slice(1)} theme applied!`, 4000);
  document.getElementById("themePicker").classList.add("hidden");
}


// ================= UI =================
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  if (id === "history" && window.loadHistory) window.loadHistory();
  if (id === "leaderboard" && window.loadLeaderboard) window.loadLeaderboard();
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  sidebar.classList.toggle("hidden");
  overlay.classList.toggle("hidden");
}

function updateLangStat() {
  const lang = document.getElementById("language").value;
  document.getElementById("statLang").innerText = lang.toUpperCase();
}

function updateAuthUI() {
  const authArea = document.getElementById("authArea");
  const userArea = document.getElementById("userArea");
  const userAvatar = document.getElementById("userAvatar");
  const userNameDisplay = document.getElementById("userNameDisplay");

  if (window.currentUser) {
    authArea.classList.add("hidden");
    userArea.classList.remove("hidden");
    userAvatar.innerText = window.currentUser.charAt(0).toUpperCase();
    userNameDisplay.innerText = window.currentUser;
  } else {
    authArea.classList.remove("hidden");
    userArea.classList.add("hidden");
  }
}

function showLogin() {
  document.getElementById("loginModal").classList.remove("hidden");
}

function showRegister() {
  document.getElementById("registerModal").classList.remove("hidden");
}

function closeModals() {
  document.getElementById("loginModal").classList.add("hidden");
  document.getElementById("registerModal").classList.add("hidden");
}


// ================= ROBOT =================
const tips = [
  "💡 Tip: Use meaningful variable names — future you will thank present you!",
  "⚡ Tip: Always test your code with edge cases like 0, empty strings, or large numbers!",
  "🧠 Tip: Comments make your code readable. Write WHY, not WHAT!",
  "🔥 Tip: Break big problems into small functions. Divide and conquer!",
  "🐛 Tip: When stuck, try explaining your code out loud. It helps find bugs!",
  "📚 Tip: Read error messages carefully — they usually tell you exactly what's wrong!",
  "🎯 Tip: DRY principle — Don't Repeat Yourself. Reuse code with functions!",
  "🚀 Tip: Practice every day, even 15 minutes makes a huge difference!",
  "🔍 Tip: Use the Explain button to understand code you didn't write!",
  "✨ Tip: Clean code is better than clever code. Keep it simple!"
];

let tipIndex = 0;
let idleTimer = null;

function robotSay(message, duration = 4000) {
  const bubble = document.getElementById("robotBubble");
  if (!bubble) return;
  bubble.innerText = message;
  bubble.classList.add("visible");
  clearTimeout(robotSay._timer);
  if (duration > 0) {
    robotSay._timer = setTimeout(() => {
      bubble.classList.remove("visible");
    }, duration);
  }
}

function robotReact(event) {
  const body = document.getElementById("robotBody");
  if (!body) return;

  const reactions = {
    success:    { emoji: "🎉", msg: "Woohoo! Code ran perfectly! You're on fire! 🔥" },
    error:      { emoji: "😟", msg: "Oops! There's an error. Every bug is a lesson! 💪" },
    compile:    { emoji: "⚙️", msg: "Compiling... fingers crossed! 🤞" },
    compile_ok: { emoji: "✅", msg: "Compiled successfully! Click ▶ Run to execute! 🚀" },
    run:        { emoji: "🚀", msg: "Running your code! Let's gooo! 🚀" },
    explain:    { emoji: "🤔", msg: "Let me think about this code... 🧠" },
    idle:       { emoji: "😴", msg: "Psst... are you still there? Try writing some code! 👀" },
  };

  const r = reactions[event];
  if (!r) return;
  body.innerText = r.emoji;
  robotSay(r.msg, event === "idle" ? 6000 : 4000);
  setTimeout(() => { body.innerText = "🤖"; }, 5000);
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => robotReact("idle"), 120000);
}


// ================= TUTORIAL =================
const tutorialSteps = [
  "👋 Hey there! I'm <b>ForgeBot</b> — your coding companion!<br><br>Let me show you around Syntax Forge!",
  "📝 This is your <b>Code Editor</b> on the left.<br><br>Pick your language from the dropdown and start typing!",
  "▶️ Hit <b>Run</b> to execute your code live.<br><br>Output appears on the right. You can type input directly in the terminal!",
  "⚙️ Use <b>Compile</b> first to check for syntax errors before running.",
  "💡 Stuck on what your code does? Hit <b>Explain</b> and I'll break it down for you!",
  "🎨 Click the <b>Customize</b> button to change the color theme of the whole app!",
  "🚀 That's it! You're all set.<br><br>Happy coding! Every expert was once a beginner! 💪"
];

let tutorialStep = 0;

function showTutorial() {
  tutorialStep = 0;
  document.getElementById("tutorialOverlay").classList.remove("hidden");
  updateTutorial();
  robotSay("I'll guide you through the app! 🗺️", 8000);
}

function updateTutorial() {
  document.getElementById("tutorialText").innerHTML = tutorialSteps[tutorialStep];
  const dots = document.getElementById("tutorialDots");
  dots.innerHTML = tutorialSteps.map((_, i) =>
    `<div class="tutorial-dot ${i === tutorialStep ? "active" : ""}"></div>`
  ).join("");
}

function nextTutorial() {
  if (tutorialStep < tutorialSteps.length - 1) {
    tutorialStep++;
    updateTutorial();
  } else {
    skipTutorial();
  }
}

function prevTutorial() {
  if (tutorialStep > 0) {
    tutorialStep--;
    updateTutorial();
  }
}

function skipTutorial() {
  document.getElementById("tutorialOverlay").classList.add("hidden");
  localStorage.setItem("codebotVisited", "true");
  robotSay("You're all set! I'm here if you need tips 😊", 4000);
}


// ================= INIT =================
window.addEventListener("load", () => {
  initializeEditor();
  initLiveTerminal();
  updateAuthUI();

  setInterval(() => {
    const code = getEditorCode();
    document.getElementById("statLines").innerText = code.split("\n").length;
  }, 1000);

  let seconds = 0;
  setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    document.getElementById("statTime").innerText = `${m}:${s}`;
  }, 1000);

  setInterval(() => {
    const bubble = document.getElementById("robotBubble");
    if (bubble && !bubble.classList.contains("visible")) {
      robotSay(tips[tipIndex++ % tips.length], 5000);
    }
  }, 45000);

  document.addEventListener("mousemove", resetIdleTimer);
  document.addEventListener("keydown", resetIdleTimer);
  resetIdleTimer();

  const isFirstVisit = !localStorage.getItem("codebotVisited");
  if (isFirstVisit) {
    setTimeout(() => showTutorial(), 1500);
  } else {
    setTimeout(() => robotSay("👋 Welcome back! Ready to code?", 4000), 1000);
  }
});