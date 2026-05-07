import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCZAQdUW7kpj71qYz4FQhTenVO9gKNIUfI",
  authDomain: "syntax-forge.firebaseapp.com",
  projectId: "syntax-forge",
  storageBucket: "syntax-forge.firebasestorage.app",
  messagingSenderId: "964194161766",
  appId: "1:964194161766:web:642a19d2ef9131f783c9a7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.register = async function() {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  if (!name || !email || !password) { alert("Please fill in all fields!"); return; }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    window.currentUser = name;
    window.currentUserName = name;
    closeModals();
    updateAuthUI();
    if (typeof robotSay === "function") robotSay("🎉 Welcome to Syntax Forge, " + name + "!");
  } catch (e) { alert("Registration failed: " + e.message); }
}

window.login = async function() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  if (!email || !password) { alert("Please enter email and password!"); return; }
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    window.currentUserName = document.getElementById("loginEmail").value.split("@")[0];
    window.currentUser = window.currentUserName;
    closeModals();
    updateAuthUI();
    if (typeof robotSay === "function") robotSay("👋 Welcome back, " + window.currentUser + "!");
    if (typeof window.loadHistory === "function") window.loadHistory();
  } catch (e) { alert("Login failed: " + e.message); }
}

window.logout = async function() {
  await signOut(auth);
  window.currentUser = null;
  window.currentUserName = null;
  updateAuthUI();
  if (typeof robotSay === "function") robotSay("👋 See you next time!");
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.currentUser = window.currentUserName || user.email.split("@")[0];
    updateAuthUI();
    if (typeof window.loadHistory === "function") window.loadHistory();
  } else {
    window.currentUser = null;
    updateAuthUI();
  }
});

window.saveHistory = async function(programName, language, memory) {
  if (!auth.currentUser) return;
  try {
    await addDoc(collection(db, "history"), {
      uid: auth.currentUser.uid,
      userName: window.currentUserName || auth.currentUser.email.split("@")[0],
      programName,
      language,
      memory,
      timestamp: new Date().toISOString()
    });
    setTimeout(() => {
      if (typeof window.loadHistory === "function") window.loadHistory();
    }, 500);
  } catch (e) { console.error("History save failed:", e); }
}

window.loadHistory = async function() {
  if (!auth.currentUser) return;
  try {
    const q = query(collection(db, "history"), where("uid", "==", auth.currentUser.uid));
    const snapshot = await getDocs(q);
    const list = document.getElementById("historyList");
    if (!list) return;
    list.innerHTML = `
      <table>
        <tr>
          <th>Program Name</th>
          <th>Language</th>
          <th>Timestamp</th>
          <th>Memory</th>
        </tr>
        ${snapshot.docs.map(doc => {
          const d = doc.data();
          return `<tr>
            <td>${d.programName}</td>
            <td>${d.language.toUpperCase()}</td>
            <td>${new Date(d.timestamp).toLocaleString()}</td>
            <td>${d.memory}</td>
          </tr>`;
        }).join("")}
      </table>`;
  } catch (e) { console.error("History load failed:", e); }
}

window.loadLeaderboard = async function() {
  try {
    const snapshot = await getDocs(collection(db, "history"));
    const runs = {};
    const names = {};
    snapshot.docs.forEach(doc => {
      const d = doc.data();
      runs[d.uid] = (runs[d.uid] || 0) + 1;
      names[d.uid] = d.userName || d.uid.substring(0, 8);
    });
    const table = document.getElementById("leaderboardTable");
    const entries = Object.entries(runs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    table.innerHTML = `
      <tr><th>Rank</th><th>User</th><th>Runs</th></tr>
      ${entries.map(([uid, count], i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${names[uid]}</td>
          <td>${count}</td>
        </tr>
      `).join("")}
    `;
  } catch(e) { console.error("Leaderboard load failed:", e); }
}