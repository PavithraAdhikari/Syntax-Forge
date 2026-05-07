const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const WebSocket = require("ws");
const https = require("https");

const app = express();
const PORT = 5001;
const IS_WINDOWS = process.platform === "win32";

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const CODE_DIR = path.join(__dirname, "codes");
if (!fs.existsSync(CODE_DIR)) fs.mkdirSync(CODE_DIR);

// Detect python command
function getPythonCmd() {
  try { execSync("python --version", { stdio: "pipe", shell: true }); return "python"; } catch(e) {}
  try { execSync("python3 --version", { stdio: "pipe", shell: true }); return "python3"; } catch(e) {}
  return "python";
}
const PYTHON = getPythonCmd();
console.log(`Platform: ${process.platform} | Python: ${PYTHON}`);

// ================= COMPILE (SYNTAX CHECK ONLY) =================
app.post("/compile", (req, res) => {
  const { code, language } = req.body;
  const filePath = path.join(CODE_DIR, `code-${Date.now()}.${getExt(language)}`);

  try {
    fs.writeFileSync(filePath, code);
  } catch(e) {
    return res.json({ output: "❌ Failed to write code file: " + e.message });
  }

  let checkCmd = null;

  if (language === "python") {
    checkCmd = { command: PYTHON, args: ["-m", "py_compile", filePath] };
  } else if (language === "javascript") {
    checkCmd = { command: "node", args: ["--check", filePath] };
  } else if (language === "cpp") {
    checkCmd = { command: "g++", args: [filePath, "-fsyntax-only"] };
  } else if (language === "c") {
    checkCmd = { command: "gcc", args: [filePath, "-fsyntax-only"] };
  } else if (language === "java") {
    checkCmd = { command: "javac", args: [filePath] };
  } else {
    try { fs.unlinkSync(filePath); } catch(_) {}
    return res.json({ output: "✅ Syntax check not available for this language. Click Run to execute." });
  }

  try {
    const proc = spawn(checkCmd.command, checkCmd.args, {
      shell: true,  // always use shell:true on Windows for reliability
      stdio: "pipe"
    });

    let errOutput = "";
    proc.stderr.on("data", d => errOutput += d.toString());
    proc.stdout.on("data", d => errOutput += d.toString());

    proc.on("close", (code) => {
      try { fs.unlinkSync(filePath); } catch (_) {}
      if (code === 0) {
        res.json({ output: "✅ Compilation successful! No syntax errors found.\nClick ▶ Run to execute your code." });
      } else {
        res.json({ output: "❌ Compilation error:\n" + errOutput });
      }
    });

    proc.on("error", (err) => {
      try { fs.unlinkSync(filePath); } catch (_) {}
      res.json({ output: "❌ Could not run compiler: " + err.message });
    });

  } catch(e) {
    try { fs.unlinkSync(filePath); } catch(_) {}
    res.json({ output: "❌ Server error: " + e.message });
  }
});


// ================= EXPLAIN =================
app.post("/explain", (req, res) => {
  const { code, language } = req.body;
  const prompt = `Explain the following ${language} code in simple terms, line by line:\n\n${code}`;

  const payload = JSON.stringify({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }]
  });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  const options = {
    hostname: "api.groq.com",
    path: "/openai/v1/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = "";
    apiRes.on("data", chunk => data += chunk);
    apiRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        const explanation = parsed.choices[0].message.content;
        res.json({ explanation });
      } catch (e) {
        res.json({ explanation: "Failed to parse explanation." });
      }
    });
  });

  apiReq.on("error", (e) => {
    res.json({ explanation: "API request failed: " + e.message });
  });

  apiReq.write(payload);
  apiReq.end();
});


// ================= WEBSOCKET (INTERACTIVE RUN) =================
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  let childProcess = null;

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "start") {
        const timestamp = Date.now();
        const ext = getExt(data.language);
        const filePath = path.join(CODE_DIR, `code-${timestamp}.${ext}`);
        fs.writeFileSync(filePath, data.code);

        let runCmd;
        try {
          runCmd = buildAndGetRunCmd(data.language, filePath, timestamp, ws);
        } catch (err) {
          ws.send(JSON.stringify({ type: "output", data: "❌ Build error:\n" + err.message + "\n" }));
          ws.send(JSON.stringify({ type: "exit", code: 1 }));
          return;
        }

        if (!runCmd) return;
        spawnProcess(runCmd, ws, (proc) => { childProcess = proc; });
      }

      // stdin — send raw keystrokes to process
      if (data.type === "stdin" && childProcess) {
        try { childProcess.stdin.write(data.data); } catch(e) {}
      }

    } catch(e) {
      console.error("WebSocket message error:", e.message);
    }
  });

  ws.on("close", () => {
    if (childProcess) {
      try { childProcess.kill(); } catch(e) {}
    }
  });
});


// ================= BUILD + RUN HELPERS =================
function buildAndGetRunCmd(language, filePath, timestamp, ws) {
  const code = fs.readFileSync(filePath, "utf8");
  if (isMalicious(code)) {
    throw new Error("⚠️ Code contains potentially unsafe operations and cannot be executed.");
  }

  if (language === "python") {
    // -u = unbuffered so output streams in real time
    return { command: PYTHON, args: ["-u", filePath], shell: true };
  }

  if (language === "javascript") {
    return { command: "node", args: [filePath], shell: true };
  }

  if (language === "cpp") {
    const exe = path.join(CODE_DIR, `code-${timestamp}${IS_WINDOWS ? ".exe" : ""}`);
    try {
      execSync(`g++ "${filePath}" -o "${exe}"`, { stdio: "pipe", shell: true });
    } catch (err) {
      throw new Error(err.stderr ? err.stderr.toString() : err.message);
    }
    return { command: exe, args: [], shell: true };
  }

  if (language === "c") {
    const exe = path.join(CODE_DIR, `code-${timestamp}${IS_WINDOWS ? ".exe" : ""}`);
    try {
      execSync(`gcc "${filePath}" -o "${exe}"`, { stdio: "pipe", shell: true });
    } catch (err) {
      throw new Error(err.stderr ? err.stderr.toString() : err.message);
    }
    return { command: exe, args: [], shell: true };
  }

  if (language === "java") {
    try {
      execSync(`javac "${filePath}"`, { stdio: "pipe", shell: true });
    } catch (err) {
      throw new Error(err.stderr ? err.stderr.toString() : err.message);
    }
    const className = path.basename(filePath, ".java");
    return { command: "java", args: ["-cp", path.dirname(filePath), className], shell: true };
  }

  if (language === "sql") {
    ws.send(JSON.stringify({ type: "output", data: "SQL execution is not supported in live mode.\n" }));
    ws.send(JSON.stringify({ type: "exit", code: 0 }));
    return null;
  }

  throw new Error(`Unsupported language: ${language}`);
}

function spawnProcess(runCmd, ws, onProcess) {
  const proc = spawn(runCmd.command, runCmd.args, {
    stdio: "pipe",
    shell: runCmd.shell !== undefined ? runCmd.shell : true
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=128" }
  });

  onProcess(proc);
// Kill process after 10 seconds
const timeout = setTimeout(() => {
  try { proc.kill(); } catch(e) {}
  ws.send(JSON.stringify({ type: "output", data: "\r\n⏱️ Execution timed out (10s limit).\n" }));
  ws.send(JSON.stringify({ type: "exit", code: 1 }));
}, 10000);

proc.on("close", () => clearTimeout(timeout));
  proc.stdout.on("data", (d) => {
    ws.send(JSON.stringify({ type: "output", data: d.toString() }));
  });

  proc.stderr.on("data", (d) => {
    ws.send(JSON.stringify({ type: "output", data: d.toString() }));
  });

  proc.on("close", (code) => {
    ws.send(JSON.stringify({ type: "exit", code: code || 0 }));
  });

  proc.on("error", (err) => {
    console.error("Spawn error:", err);
    ws.send(JSON.stringify({ type: "output", data: "❌ Run error: " + err.message + "\n" }));
    ws.send(JSON.stringify({ type: "exit", code: 1 }));
  });
}
// ================= SECURITY SCANNER =================
function isMalicious(code) {
  const banned = [
    /import\s+os/,
    /import\s+subprocess/,
    /import\s+sys/,
    /__import__/,
    /exec\s*\(/,
    /eval\s*\(/,
    /open\s*\(/,
    /fs\.readFile/,
    /fs\.writeFile/,
    /require\s*\(\s*['"]fs['"]\s*\)/,
    /require\s*\(\s*['"]child_process['"]\s*\)/,
    /Runtime\.getRuntime/,
    /ProcessBuilder/,
  ];
  return banned.some(pattern => pattern.test(code));
}

// ================= EXTENSION HELPER =================
function getExt(lang) {
  const map = {
    python: "py",
    javascript: "js",
    cpp: "cpp",
    c: "c",
    java: "java",
    sql: "sql"
  };
  return map[lang] || "txt";
}
