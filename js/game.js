// js/game.js
import { normalizePokemonName } from "./utils.js";
import { comparePokemon } from "./compare.js";
import {
    clearResults, hideBackToMenuButton, hideInputArea, hideNextQuestionButton,
    hidePostGameActions, hideRandomStartButton, hideSuggestions,
    renderResult, setGameStatus, setGameTitle, showInputArea, showRandomStartButton,
    showResultModal, switchScreen, updateStatusUI,
    // 入力＆モーダル（ここが重要）
    getGuessInputValue, clearGuessInput, blurGuessInput, openModal
  } from "./dom.js";

import { allPokemonData } from "../all-pokemon-data.js";

// === DEBUG: 正解ポケモン固定（開発中のみ有効にしてください） ===
const DEBUG_FIXED_ANSWER = true;           // ← 本番戻すときは false に
const DEBUG_FIXED_NAME = 'カイリュー';       // 名前で固定
const DEBUG_FIXED_ID = 149;                // 予備として全国図鑑番号（カイリューは 149）
// =======================================================

let gameMode = null;
let guessesLeft = 10;
let gameOver = false;
const allPokemonNames = Object.keys(allPokemonData);
let correctPokemon = null;
let answeredPokemonNames = new Set();
let correctCount = 0;
let totalGuesses = 0;
let correctlyAnsweredPokemon = [];

export function initGame() {
  switchScreen('mode-selection-screen');
  setGameTitle('');
  setGameStatus('');
}

export const Handlers = {
  onStartClassic: () => startGame('classic'),
  onStartRandom:  () => startGame('randomStart'),
  onGuess:        () => handleGuess(),
  onRandomStart:  () => handleRandomStart(),
  onPlayAgain:    () => startGame(gameMode || 'classic'),
  onBackToMenu:   () => { resetGame(); switchScreen('mode-selection-screen'); },
};

function startGame(mode) {
  gameMode = mode;
  resetGame();
  switchScreen('game-container');
  setupUIForMode();
  initRound();
}

function initRound() {
    // --- 正解を決める（デバッグで固定 or ランダム） ---
    if (DEBUG_FIXED_ANSWER) {
      // 名前優先で探し、見つからなければIDでフォールバック
      const byName = allPokemonData[DEBUG_FIXED_NAME];
      const byId   = Object.values(allPokemonData).find(p => p.id === DEBUG_FIXED_ID);
      correctPokemon = byName || byId || null;
    }
  
    // 固定できなかった場合は従来通りランダム
    if (!correctPokemon) {
      const name = allPokemonNames[Math.floor(Math.random() * allPokemonNames.length)];
      correctPokemon = allPokemonData[name];
    }
  
    // --- ここから下は従来処理そのまま ---
    guessesLeft = 10;
    gameOver = false;
    answeredPokemonNames = new Set();
    clearResults();
    setGameStatus(`残り回数：${guessesLeft}`);
}
  

function resetGame() {
  gameOver = false;
  guessesLeft = 10;
  correctCount = 0;
  totalGuesses = 0;
  correctlyAnsweredPokemon = [];
  clearResults();
  showInputArea();
  hideNextQuestionButton();
  hideBackToMenuButton();
  hidePostGameActions();
  setGameStatus('');
}

function isCorrectAnswer(guessed, correct) {
  if (!guessed || !correct) return false;
  if (guessed.id === correct.id) return true;
  if (normalizePokemonName(guessed.name) === normalizePokemonName(correct.name)) return true;
  return false;
}

function handleGuess() {
  if (gameOver) return;

  const guessRaw = getGuessInputValue();
  if (!guessRaw) return;

  let guessedPokemon = Object.values(allPokemonData).find(p => p.name === guessRaw);
  if (!guessedPokemon) {
    const guessName = normalizePokemonName(guessRaw);
    guessedPokemon = Object.values(allPokemonData).find(p => normalizePokemonName(p.name) === guessName);
  }

  if (!guessedPokemon) {
    hideSuggestions();
    openModal(null, "入力されたポケモンが見つかりませんでした");
    blurGuessInput();
    return;
  }

  const comparisonResult = comparePokemon(guessedPokemon, correctPokemon);
  if (!comparisonResult) return;

  // ★ gameMode を渡す（UIクラス切替に使われる）
  renderResult(guessedPokemon, comparisonResult, gameMode);

  // ★ 残り回数の管理
  if (gameMode === 'classic' || gameMode === 'randomStart') {
    guessesLeft--;
    setGameStatus(`残り回数：${guessesLeft}`);
  } else {
    totalGuesses++;
  }

  if (isCorrectAnswer(guessedPokemon, correctPokemon)) {
    endGame(true);
  } else if ((gameMode === 'classic' || gameMode === 'randomStart') && guessesLeft <= 0) {
    endGame(false);
  }

  hideSuggestions();
  clearGuessInput();
  blurGuessInput();
}

function handleRandomStart() {
  // 正解以外のランダム1件を表示（ノーカウント）
  let randomGuess;
  do {
    const randomName = allPokemonNames[Math.floor(Math.random() * allPokemonNames.length)];
    randomGuess = allPokemonData[randomName];
  } while (isCorrectAnswer(randomGuess, correctPokemon));

  const comparisonResult = comparePokemon(randomGuess, correctPokemon);
  renderResult(randomGuess, comparisonResult, gameMode);

  // ★ 初回はノーカウント → 表示は10回のまま
  setGameStatus(`残り回数：${guessesLeft}`);

  hideRandomStartButton();
  showInputArea();
}

// ——— ここから先は既存の endGame / setupUIForMode 等はそのまま ———
function setupUIForMode() {
  hideRandomStartButton();
  showInputArea();

  if (gameMode === 'classic' || gameMode === 'scoreAttack') {
    setGameTitle(gameMode === 'classic' ? 'クラシックモード' : 'スコアアタック');
  } else if (gameMode === 'baseStats') {
    setGameTitle('種族値アタック');
  } else if (gameMode === 'randomStart') {
    setGameTitle('ランダムモード');
    showRandomStartButton();
    hideInputArea();
  }
  setGameStatus('');
}

function endGame(isWin) {
  gameOver = true;
  // 右カラムグラフは非表示の設計なので、モーダルに gameMode / guessesLeft を渡すだけ
  showResultModal(correctPokemon, isWin ? "正解" : "残念", gameMode, guessesLeft);
}
