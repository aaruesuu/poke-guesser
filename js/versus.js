import { allPokemonData } from "./all-pokemon-data.js";
import { comparePokemon } from "./compare.js";
import {
  renderResult,
  setGameStatus,
  setGameTitle,
  showInputArea,
  hideInputArea,
  showResultsArea,
  hideResultsArea,
  hideRandomStartButton,
  hidePostGameActions,
  showResultModal,
  renderMaskedVersusGuess,
} from "./dom.js";

// Firebase Imports
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, doc, getDoc, runTransaction,
  onSnapshot, serverTimestamp, collection, addDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const V90 = 90 * 1000;

const DEBUG_FIXED_ANSWER = false;

const TURN_MODAL_TYPES = {
  BATTLE_START: "battle-start",
  YOUR_TURN: "your-turn",
  OPPONENT_TURN: "opponent-turn",
};

const TURN_MODAL_CONFIG = {
  [TURN_MODAL_TYPES.BATTLE_START]: {
    id: "versus-battle-start-modal",
    defaultText: "バトルスタート",
    bannerClass: "battle-start",
    duration: 2200,
  },
  [TURN_MODAL_TYPES.YOUR_TURN]: {
    id: "versus-your-turn-modal",
    defaultText: "あなたの番",
    bannerClass: "your-turn",
    duration: 2200,
  },
  [TURN_MODAL_TYPES.OPPONENT_TURN]: {
    id: "versus-opponent-turn-modal",
    defaultText: "相手の番",
    bannerClass: "opponent-turn",
    duration: 2200,
  },
};

function ensureFirebase() {
  if (getApps().length) return getApps()[0];
  if (globalThis.firebaseApp) return globalThis.firebaseApp;
  if (!globalThis.FIREBASE_CONFIG) return null;
  const app = initializeApp(globalThis.FIREBASE_CONFIG);
  globalThis.firebaseApp = app;
  return app;
}

function now() { return Date.now(); }

const state = {
  roomId: null,
  code: null,
  me: null, // Auth UID
  correct: null,
  currentSeed: null, // ★追加: 現在適用中のseedを保持
  unsubRoom: null,
  unsubGuesses: null,
  interval: null,
  roomData: null,
  lastAdvanceAttempt: 0,
  turnNoticeShownFor: null,
  turnModalTimeouts: {},
  turnModalCallbacks: {},
  pendingTurnModal: null,
  resultModalShown: false,
  holdHideBanner: false,
  showingOpponentModal: false,
};

function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function sixDigit() {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, "0");
}

function chooseAnswerBySeed(seed) {
  const names = Object.keys(allPokemonData).sort();
  const a = 1103515245, c = 12345, m = 2**31;
  let x = (typeof seed === "number" ? seed : seed.split("").reduce((s,ch)=> (s*31 + ch.charCodeAt(0))>>>0, 0)) >>> 0;
  x = (a * x + c) % m;
  const idx = x % names.length;
  return allPokemonData[names[idx]];
}

function ensureLobbyRoot() {
  let root = document.getElementById("versus-lobby-area");
  if (!root) {
    root = document.createElement("div");
    root.id = "versus-lobby-area";

    const header  = document.getElementById("game-header-area");
    const results = document.getElementById("results-area");

    if (results && results.parentNode) {
      results.parentNode.insertBefore(root, results);
    } else if (header && header.parentNode) {
      header.parentNode.insertBefore(root, header.nextSibling);
    } else {
      (document.getElementById("game-container") || document.body).appendChild(root);
    }
  }
  root.style.display = "";
  return root;
}

function setLobbyContent(html) { ensureLobbyRoot().innerHTML = html; }
function hideLobby() { const r = document.getElementById("versus-lobby-area"); if (r) r.style.display = "none"; }
function showToast(msg) {
  let t = document.getElementById("versus-toast");
  if (!t) { t = document.createElement("div"); t.id = "versus-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => { t.style.display = "none"; }, 900);
}

let app = null;
let db  = null;

function ensureDB(){
  if (db) return db;
  app = ensureFirebase();
  if (!app) throw new Error("Firebase 未初期化です。");
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false
  });
  return db;
}

function startInterval() {
  stopInterval();
  state.interval = setInterval(onTick, 250);
}
function stopInterval() {
  if (state.interval) { clearInterval(state.interval); state.interval = null; }
}

function ensureTurnModal(type) {
  const config = TURN_MODAL_CONFIG[type];
  if (!config) return null;

  let overlay = document.getElementById(config.id);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = config.id;
    overlay.className = "versus-modal-overlay hidden";
    overlay.innerHTML = `
      <div class="versus-turn-modal-content" role="alertdialog" aria-live="assertive">
        <div class="versus-turn-banner ${config.bannerClass}">
          <span class="versus-turn-text">${config.defaultText}</span>
        </div>
      </div>
    `;
    overlay.addEventListener("click", () => hideModal(type));
    document.body.appendChild(overlay);
  }
  return overlay;
}

function clearModalTimeout(type) {
  if (state.turnModalTimeouts[type]) {
    clearTimeout(state.turnModalTimeouts[type]);
    delete state.turnModalTimeouts[type];
  }
}

function scheduleModalHide(type, duration, callback) {
  clearModalTimeout(type);
  if (callback) {
    state.turnModalCallbacks[type] = callback;
  } else {
    delete state.turnModalCallbacks[type];
  }
  if (typeof duration !== "number" || duration <= 0) return;
  state.turnModalTimeouts[type] = setTimeout(() => {
    delete state.turnModalTimeouts[type];
    hideModal(type);
  }, duration);
}

function showModal(type, text) {
  const config = TURN_MODAL_CONFIG[type];
  if (!config) return null;
  Object.keys(TURN_MODAL_CONFIG).forEach((key) => {
    if (key !== type) hideModal(key, { runCallback: false });
  });
  const overlay = ensureTurnModal(type);
  if (!overlay) return null;
  const textEl = overlay.querySelector(".versus-turn-text");
  if (textEl) textEl.textContent = text || config.defaultText;
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  const banner = overlay.querySelector(".versus-turn-banner");
  if (banner) {
    banner.classList.remove("animate");
    void banner.offsetWidth;
    banner.classList.add("animate");
  }
  return overlay;
}

function hideModal(type, { runCallback = true } = {}) {
  const config = TURN_MODAL_CONFIG[type];
  if (!config) return;
  const overlay = document.getElementById(config.id);
  const callback = state.turnModalCallbacks[type];
  if (!overlay) {
    if (runCallback && typeof callback === "function") {
      delete state.turnModalCallbacks[type];
      try { callback(); } catch (err) { console.warn("[Versus] turn modal callback failed", err); }
    } else {
      delete state.turnModalCallbacks[type];
    }
    return;
  }
  clearModalTimeout(type);
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  if (runCallback && typeof callback === "function") {
    delete state.turnModalCallbacks[type];
    try { callback(); } catch (err) { console.warn("[Versus] turn modal callback failed", err); }
  } else {
    delete state.turnModalCallbacks[type];
  }
}

function hideAllTurnModals(options = { runCallback: false }) {
  Object.keys(TURN_MODAL_CONFIG).forEach((type) => hideModal(type, options));
}

function queueTurnModal(turnNumber, mine) {
  state.pendingTurnModal = { turnNumber, mine };
}

function flushPendingTurnModal() {
  if (!state.pendingTurnModal) return;
  const { turnNumber, mine } = state.pendingTurnModal;
  state.pendingTurnModal = null;
  if (mine) {
    showTurnModal(turnNumber);
  } else {
    showOpponentModal();
  }
}

function showTurnModal(turnNumber) {
  state.pendingTurnModal = null;
  showModal(TURN_MODAL_TYPES.YOUR_TURN);
  state.turnNoticeShownFor = turnNumber;
  scheduleModalHide(TURN_MODAL_TYPES.YOUR_TURN, TURN_MODAL_CONFIG[TURN_MODAL_TYPES.YOUR_TURN].duration);
}

function showOpponentModal() {
  state.pendingTurnModal = null;
  state.showingOpponentModal = true;
  state.holdHideBanner = true;
  showModal(TURN_MODAL_TYPES.OPPONENT_TURN);
  scheduleModalHide(
    TURN_MODAL_TYPES.OPPONENT_TURN,
    TURN_MODAL_CONFIG[TURN_MODAL_TYPES.OPPONENT_TURN].duration,
    () => {
      state.showingOpponentModal = false;
      state.holdHideBanner = false;
    },
  );
}

function showBattleStartModal(onComplete) {
  state.holdHideBanner = true;
  state.showingOpponentModal = false;
  showModal(TURN_MODAL_TYPES.BATTLE_START);
  scheduleModalHide(
    TURN_MODAL_TYPES.BATTLE_START,
    TURN_MODAL_CONFIG[TURN_MODAL_TYPES.BATTLE_START].duration,
    () => {
      state.holdHideBanner = false;
      if (typeof onComplete === "function") onComplete();
    },
  );
}

function hideTurnModal() {
  hideAllTurnModals({ runCallback: false });
  state.pendingTurnModal = null;
  state.holdHideBanner = false;
  state.showingOpponentModal = false;
}

function onTick() {
  const d = state.roomData;
  if (!d) return;

  if (d.status === "playing") {
    const left = (d.endsAt || 0) - now();
    const mine = d.turnOf === state.me;
    setGameStatus(`${mine ? "あなた" : "相手"}の番です（残り ${fmtClock(left)}）`);
    if (left <= 0 && (now() - (state.lastAdvanceAttempt || 0) > 1500)) {
      state.lastAdvanceAttempt = now();
      forceAdvanceTurnIfExpired().catch(()=>{});
    }
  }
}

async function joinRoomByCode(code) {
  state.roomId = code;
  state.code   = code;
  await claimRoomAsync(code);
  return { roomId: code };
}

function opponentId(playersMap, me) {
  if (!playersMap) return null;
  const ids = Object.keys(playersMap);
  return ids.find(id => id !== me) || null;
}

async function maybeStartMatch(roomRef) {
  await runTransaction(ensureDB(), async (tx) => {
    const rs = await tx.get(roomRef);
    const data = rs.data();
    if (data.status !== "lobby") return;

    const playersMap = data.players || {};
    const playerIds = Object.keys(playersMap);
    
    if (playerIds.length !== 2) return;

    const first = playerIds[Math.floor(Math.random() * playerIds.length)];

    const seed = Math.floor(Math.random() * 2**31);
    const endsAt = now() + V90;
    tx.update(roomRef, { status: "playing", seed, turnOf: first, turnNumber: 1, endsAt });
  });
}

function listenRoom(onState, onGuess) {
  const db = ensureDB();
  const roomRef = doc(db, "rooms", state.roomId);

  try { state.unsubRoom && state.unsubRoom(); } catch {}
  try { state.unsubGuesses && state.unsubGuesses(); } catch {}
  state.unsubRoom = null;
  state.unsubGuesses = null;

  state.unsubRoom = onSnapshot(roomRef, async (snap) => {
    if (!snap.exists()) {
      hideInputArea();
      hideResultsArea();
      setGameTitle("対戦ロビー");
      setGameStatus("ホストの準備を待っています…");
      state.roomData = null;
      return;
    }

    const data = snap.data() || {};
    const prevStatus = state.roomData ? state.roomData.status : null;
    state.roomData = data;

    // ★修正: 正解データの同期ロジック
    // seedが存在し、かつ手持ちのseedと異なる場合にのみ更新する
    if (DEBUG_FIXED_ANSWER) {
        if (!state.correct) {
            const fixed = Object.values(allPokemonData).find(p => p.id === 149) || Object.values(allPokemonData)[0];
            state.correct = fixed;
        }
    } else {
        if (typeof data.seed === 'number') {
            // 初回、またはseedが変わった時（＝新しい対戦が始まった時）に正解を更新
            if (state.currentSeed !== data.seed) {
                state.correct = chooseAnswerBySeed(data.seed);
                state.currentSeed = data.seed;
                // seedが変わったら履歴などの状態もクリアするのが安全
                if (prevStatus === "ended" || prevStatus === "lobby") {
                    state.resultModalShown = false;
                }
            }
        }
    }

    // Lobby Logic
    if (data.status === "lobby") {
      const playersMap = data.players || {};
      const playerIds = Object.keys(playersMap);
      const playerCount = playerIds.length;
      
      state.turnNoticeShownFor = null;
      state.resultModalShown = false;
      hideTurnModal();

      // Auto-join logic
      if (state.me && !playersMap[state.me] && playerCount < 2) {
          try {
             await claimRoomAsync(state.roomId);
          } catch(e) {
             console.warn("[Versus] auto-join failed", e);
          }
      }

      const iAmCreator = data.creatorId && state.me && state.me === data.creatorId;
      if (playerCount === 2 && iAmCreator) {
        try {
          await maybeStartMatch(roomRef);
        } catch (err) {
          if (!(err && err.code === "failed-precondition")) {
            console.warn("[Versus] maybeStartMatch failed", err);
          }
        }
      }

      hideInputArea();
      hideResultsArea();
      setGameTitle("対戦ロビー");
      setGameStatus(playerCount >= 2 ? "準備中…" : "相手の参加を待っています…");
    }

    if (data.status === "playing") {
      hideLobby();
      hideRandomStartButton();
      showInputArea();
      showResultsArea();
      hidePostGameActions();
      state.resultModalShown = false;
      
      setGameTitle("対戦モード");

      const left = (data.endsAt || 0) - now();
      const mine = data.turnOf === state.me;
      setGameStatus(`${mine ? "あなた" : "相手"}の番です（残り ${fmtClock(left)}）`);

      const currentTurn = data.turnNumber || 1;
      
      if (prevStatus !== "playing") {
        if ((currentTurn || 0) <= 1) {
          queueTurnModal(currentTurn, mine);
          showBattleStartModal(() => flushPendingTurnModal());
        } else if (mine) {
          showTurnModal(currentTurn);
        } else {
          showOpponentModal();
        }
      } else if (mine && state.turnNoticeShownFor !== currentTurn && !state.pendingTurnModal) {
        showTurnModal(currentTurn);
      } else if (!mine && !state.holdHideBanner && !state.showingOpponentModal && !state.pendingTurnModal) {
        hideTurnModal();
      }

      try { startInterval && startInterval(); } catch {}
    }

    if (data.status === "ended") {
      try { stopInterval && stopInterval(); } catch {}
      const win = data.winner === state.me;
      setGameTitle("対戦モード");
      showResultsArea();
      setGameStatus(`対戦終了：${win ? "Win" : "Lose"}`);
      hideTurnModal();
      state.turnNoticeShownFor = null;
      hideInputArea();
      
      if (!state.resultModalShown && state.correct) {
        const verdict = win ? "勝利" : "敗北";
        showResultModal(state.correct, verdict, "versus", 0);
        state.resultModalShown = true;
      }
    }

    onState && onState(data);
  });

  const q = query(collection(roomRef, "guesses"), orderBy("ts", "asc"));
  state.unsubGuesses = onSnapshot(q, (qs) => {
    qs.docChanges().forEach((ch) => {
      if (ch.type !== "added") return;
      const g = ch.doc.data();

      if (onGuess) {
        onGuess(g);
        return;
      }

      if (g.masked && g.by !== state.me) {
        renderMaskedVersusGuess(false);
        return;
      }

      const guessed = Object.values(allPokemonData).find(p => p.id === g.id);
      if (!guessed || !state.correct) return;
      const result = comparePokemon(guessed, state.correct);
      const row = renderResult(guessed, result, "classic", !!g.isCorrect);

      const targetRow = row || document.querySelector(".result-row");
      if (targetRow) {
        targetRow.classList.add(g.by === state.me ? "by-me" : "by-opponent");
        const trig = targetRow.querySelector(".accordion-trigger");
        if (trig && trig.hasAttribute("disabled")) trig.removeAttribute("disabled");
      }
    });
  });
}


async function postGuess(guessName) {
  const rs = await getDoc(doc(ensureDB(), "rooms", state.roomId));
  if (!rs.exists()) return;
  const data = rs.data();
  if (data.status !== "playing") return;
  if (data.turnOf !== state.me) return;

  const guessed = Object.values(allPokemonData).find(p => p.name === guessName);
  if (!guessed) return;

  const isCorrect = (state.correct && guessed.id === state.correct.id);
  const turnNumber = data.turnNumber || 1;
  
  await addDoc(collection(ensureDB(), "rooms", state.roomId, "guesses"), {
    by: state.me,
    playerId: state.me, // For rules
    name: guessed.name,
    id: guessed.id,
    isCorrect,
    turnNumber,
    ts: serverTimestamp()
  });

  if (isCorrect) {
    const roomRef = doc(ensureDB(), "rooms", state.roomId);
    await runTransaction(ensureDB(), async (tx) => {
      const s = await tx.get(roomRef);
      const r = s.data();
      if (r.status === "playing") {
        tx.update(roomRef, { status: "ended", winner: state.me, endedAt: serverTimestamp() });
      }
    });
  } else {
    const roomRef = doc(ensureDB(), "rooms", state.roomId);
    await runTransaction(ensureDB(), async (tx) => {
      const s = await tx.get(roomRef);
      if (!s.exists()) return;
      const r = s.data();
      if (r.status !== "playing") return;
      if (r.turnOf !== state.me) return;
      
      const other = opponentId(r.players, state.me) || state.me;
      tx.update(roomRef, {
        turnOf: other,
        turnNumber: (r.turnNumber || 1) + 1,
        endsAt: now() + V90
      });
    });
    showOpponentModal();
  }
}


async function forceAdvanceTurnIfExpired() {
  const roomRef = doc(ensureDB(), "rooms", state.roomId);
  await runTransaction(ensureDB(), async (tx) => {
    const rs = await tx.get(roomRef);
    if (!rs.exists()) return;
    const data = rs.data();
    if (data.status !== "playing") return;
    if (now() <= (data.endsAt || 0)) return;
    const playersMap = data.players || {};
    const other = opponentId(playersMap, data.turnOf) || data.turnOf;
    tx.update(roomRef, {
      turnOf: other,
      turnNumber: (data.turnNumber || 1) + 1,
      endsAt: now() + V90
    });
  });
}

function boot() {
  const app = ensureFirebase();
  const auth = getAuth(app);
  
  // Set default UI to loading/offline state
  const setInitialUI = (enabled) => {
     const root = document.getElementById("versus-lobby-area");
     if(root) {
        root.querySelectorAll('#vs-create, #vs-join, #vs-code')
            .forEach(el => { el.disabled = !enabled; });
        if(!enabled) setGameStatus("認証中...");
     }
  };

  // Render HTML first
  renderLobbyHTML();
  setInitialUI(false);

  // Authenticate
  onAuthStateChanged(auth, (user) => {
    if (user) {
      state.me = user.uid;
      setInitialUI(true);
      setGameStatus("ルームを作成 or ルームに参加");
    } else {
      signInAnonymously(auth).catch((e) => {
        console.error("Auth failed", e);
        showToast("認証に失敗しました");
      });
    }
  });
}

function renderLobbyHTML() {
  const html = `
    <div class="vlobby-card">
      <div class="vlobby-body">
        <section class="vlobby-panel vlobby-create">
          <h4 class="vlobby-panel-title">ルームを作成</h4>
          <p class="vlobby-panel-description">表示されたコードを共有してください</p>
            <div class="vlobby-code">
              <span id="vs-my-code">------</span>
            </div>
            <div class="vlobby-actions">
              <button id="vs-create" class="vlobby-btn primary" disabled>コード生成</button>
            </div>
        </section>
      <div class="vlobby-divider" role="presentation"><span>or</span></div>
        <section class="vlobby-panel vlobby-join">
          <h4 class="vlobby-panel-title">ルームに参加</h4>
          <p class="vlobby-panel-description">コード（数字6桁）を入力してください</p>
          <div class="vlobby-join-input">
            <input
              id="vs-code"
              class="vlobby-input"
              inputmode="numeric"
              pattern="\\d{6}"
              maxlength="6"
              autocomplete="one-time-code"
              placeholder="123456"
              aria-label="6桁のルームコード"
              disabled
            />
          </div>
          <div class="vlobby-actions">
            <button id="vs-join" class="vlobby-btn ghost small" disabled>参加する</button>
          </div>
          <p id="vlobby-error" class="vlobby-error" aria-live="polite" style="display:none;"></p>
        </section>
      </div>
    </div>
  `;
  setLobbyContent(html);

  const root = ensureLobbyRoot();

  root.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("#vs-create, #vs-join");
    if (!btn || btn.disabled) return;

    if (btn.id === "vs-create") {
      try {
        const { code } = await createRoom();
        const created  = root.querySelector("#create-result");
        const codeSpan = root.querySelector("#vs-my-code");
        if (created)  created.style.display = "";
        if (codeSpan) codeSpan.textContent = code;

        listenRoom(handleRoomState, handleGuessAdded);
      } catch (e) {
        console.error(e);
        showToast("ルーム作成に失敗しました");
      }
      return;
    }

    if (btn.id === "vs-join") {
      const input = root.querySelector("#vs-code");
      const code = (input?.value || "").trim();
      if (!/^\d{6}$/.test(code)) { alert("6桁の数字を入力してください"); return; }

      try {
        await joinRoomByCode(code);
        listenRoom(handleRoomState, handleGuessAdded);
      } catch (e) {
        console.error(e);
        showToast("参加に失敗しました");
      }
      return;
    }
  });
}

function handleRoomState(_data) {

}

function handleGuessAdded(g) {
  if (g.masked && g.by !== state.me) {
    renderMaskedVersusGuess(false);
    return;
  }

  const guessed = Object.values(allPokemonData).find(p => p.id === g.id);
  if (!guessed || !state.correct) return;
  const result = comparePokemon(guessed, state.correct);

  const row = renderResult(guessed, result, "classic", !!g.isCorrect);

  const targetRow = row || document.querySelector(".result-row");
  if (targetRow) {
    targetRow.classList.add(g.by === state.me ? "by-me" : "by-opponent");
    const trig = targetRow.querySelector(".accordion-trigger");
    if (trig && trig.hasAttribute("disabled")) trig.removeAttribute("disabled");
  }
}


function handleGuess(guessRaw) {
  const name = (guessRaw || "").trim();
  if (!name) return;
  postGuess(name).catch((e)=> console.warn("[Versus] postGuess failed", e));
}

async function claimRoomAsync(code) {
  const me = state.me;
  const roomRef = doc(ensureDB(), "rooms", code);
  try {
    await runTransaction(ensureDB(), async (tx) => {
      const rs = await tx.get(roomRef);
      if (rs.exists()) {
        const data = rs.data() || {};
        const playersMap = data.players || {};
        
        // Add self if not exists
        if (!playersMap[me]) {
            playersMap[me] = true;
            tx.update(roomRef, {
              players: playersMap,
            });
        }
      } else {
        // Map structure for players
        const playersMap = { [me]: true };
        tx.set(roomRef, {
          code,
          status: "lobby",
          creatorId: me,
          players: playersMap,
          createdAt: serverTimestamp(),
        });
      }
    });
  } catch (e) {
    console.warn("[Versus] claimRoomAsync failed", e);
    throw e;
  }
}

async function createRoom() {
  const me = state.me;
  const code = sixDigit();
  state.roomId = code;
  state.code   = code;
  await claimRoomAsync(code);
  return { roomId: code, code };
}

function teardown() {
  try { stopInterval(); } catch {}
  try { state.unsubRoom && state.unsubRoom(); } catch {}
  try { state.unsubGuesses && state.unsubGuesses(); } catch {}
  state.unsubRoom = null;
  state.unsubGuesses = null;

  const root = document.getElementById('versus-lobby-area');
  if (root && root.parentNode) {
    root.parentNode.removeChild(root);
  }

  const skillBar = document.getElementById('versus-skill-bar');
  if (skillBar) skillBar.classList.add('hidden');
  
  hideTurnModal();

  state.turnNoticeShownFor = null;
  state.resultModalShown = false;
  state.turnModalTimeouts = {};
  state.turnModalCallbacks = {};
  state.pendingTurnModal = null;

  state.roomId = null; 
  state.code = null;
  state.correct = null;
  state.currentSeed = null; // ★追加: teardownでもリセット
}

export const PGVersus = { boot, handleGuess, forceAdvanceTurnIfExpired, teardown };
globalThis._pgVersus = PGVersus;