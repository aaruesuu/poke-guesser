// js/dom.js
import {
    formatDisplayName,
    normalizePokemonName,
    formatDebut,
    formatGenderRate,
  } from "./utils.js";
  import { allPokemonData } from "../all-pokemon-data.js";
  
  const allPokemonNames = Object.keys(allPokemonData);
  
  // --- 主要DOM参照 ---
  const modeSelectionScreen = document.getElementById('mode-selection-screen');
  const gameContainer = document.getElementById('game-container');
  const scoreScreen = document.getElementById('score-screen');
  
  const classicModeButton = document.getElementById('classic-mode-button');
  const scoreAttackButton = document.getElementById('score-attack-button');
  const baseStatsModeButton = document.getElementById('base-stats-mode-button');
  
  const guessButton = document.getElementById('guess-button');
  const nextQuestionButton = document.getElementById('next-question-button');
  const backToMenuButton = document.getElementById('back-to-menu-button');
  const playAgainButton = document.getElementById('play-again-button');
  const homeButton = document.getElementById('home-button');
  
  const howToPlayButton = document.getElementById('how-to-play-button');
  const howToPlayButtonHome = document.getElementById('how-to-play-button-home');
  const aboutSiteButton = document.getElementById('about-site-button');
  const aboutSiteButtonHome = document.getElementById('about-site-button-home');
  
  const modalOverlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  const modalCloseButton = document.getElementById('modal-close-button');
  
  const resultModalOverlay = document.getElementById('result-modal-overlay');
  const resultModal = document.getElementById('result-modal');
  const resultModalCloseButton = document.getElementById('result-modal-close-button');
  
  const hamburgerMenu = document.getElementById('hamburger-menu');
  const navMenu = document.getElementById('nav-menu');
  
  const guessInput = document.getElementById('guess-input');
  const resultHistory = document.getElementById('result-history');
  const gameControls = document.getElementById('game-controls');
  const inputArea = document.getElementById('input-area');
  const suggestionsBox = document.getElementById('suggestions-box');
  
  const randomStartModeButton = document.getElementById('random-start-mode-button');
  const randomStartButton = document.getElementById('random-start-button');
  
  const postGamePlayAgainButton = document.getElementById('post-game-play-again');
  const postGameBackToMenuButton = document.getElementById('post-game-back-to-menu');
  const gameTitle = document.getElementById('game-title');
  const gameStatus = document.getElementById('game-status');
  
  // 初期化：イベントワイヤリング
  export function initDOM(handlers) {
    const { onStartClassic, onStartRandom, onGuess, onRandomStart, onPlayAgain, onBackToMenu } = handlers;
  
    if (hamburgerMenu && navMenu) {
      hamburgerMenu.addEventListener('click', () => {
        hamburgerMenu.classList.toggle('is-active');
        navMenu.classList.toggle('is-active');
      });
      navMenu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          hamburgerMenu.classList.remove('is-active');
          navMenu.classList.remove('is-active');
        });
      });
    }
  
    if (classicModeButton) classicModeButton.addEventListener('click', onStartClassic);
    if (randomStartModeButton) randomStartModeButton.addEventListener('click', onStartRandom);
    if (scoreAttackButton) scoreAttackButton.addEventListener('click', () => {});
    if (baseStatsModeButton) baseStatsModeButton.addEventListener('click', () => {});
  
    if (randomStartButton) randomStartButton.addEventListener('click', onRandomStart);
    if (guessButton) guessButton.addEventListener('click', onGuess);
    if (backToMenuButton) backToMenuButton.addEventListener('click', onBackToMenu);
    if (playAgainButton) playAgainButton.addEventListener('click', onPlayAgain);
    if (homeButton) homeButton.addEventListener('click', onBackToMenu);
    if (postGamePlayAgainButton) postGamePlayAgainButton.addEventListener('click', onPlayAgain);
    if (postGameBackToMenuButton) postGameBackToMenuButton.addEventListener('click', onBackToMenu);
  
    if (guessInput) guessInput.addEventListener('input', handleInput);
    document.addEventListener('click', (event) => {
      if (!gameControls.contains(event.target)) {
        suggestionsBox.classList.add('hidden');
      }
    });
  
    const rulesContent = `
      <h4>【基本ルール】</h4>
      ポケモンの様々な情報から、正解のポケモンが何かを当てるゲームです。<br>
      回答したポケモンの情報が、正解のポケモンと比べてどう違うかが色のヒントで表示されます。<br><br>
      <span class="color-hint" style="background:var(--c-correct); color:white;">緑色</span>：正解と完全に一致しています。<br>
      <span class="color-hint" style="background:var(--c-partial);">黄色</span>：正解と部分的に一致しています。（タイプなど）<br>
      <span class="color-hint" style="background:var(--c-wrong); color:white;">灰色</span>：正解とは一致していません。<br><br>
      ▲▼の記号は、正解のポケモンの数値が、回答したポケモンの数値よりも大きいか(▲)小さいか(▼)を示します。
      <h4>【各モードについて】</h4>
      <b>クラシックモード:</b> 10回の回答で1匹のポケモンを当てるモードです。<br>
      <b>ランダムモード:</b> 初回のみランダムヒント（ノーカウント）を表示します。
    `;
    if (howToPlayButton) howToPlayButton.addEventListener('click', openHowToPlayModal);
    if (howToPlayButtonHome) howToPlayButtonHome.addEventListener('click', openHowToPlayModal);
  
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
  
    if (resultModalCloseButton) {
      resultModalCloseButton.addEventListener('click', () => {
        resultModalOverlay.classList.add('hidden');
        const el = document.getElementById('post-game-actions');
        if (el) el.classList.remove('hidden');
      });
    }
    if (resultModalOverlay) {
      resultModalOverlay.addEventListener('click', (e) => {
        if (e.target === resultModalOverlay) {
          resultModalOverlay.classList.add('hidden');
          const el = document.getElementById('post-game-actions');
          if (el) el.classList.remove('hidden');
        }
      });
    }
  }
  
  // 画面切替
  export function switchScreen(targetScreen) {
    const screens = [modeSelectionScreen, gameContainer, scoreScreen];
    screens.forEach(screen => {
      if (screen.id === targetScreen) {
        screen.classList.remove('hidden');
      } else {
        screen.classList.add('hidden');
      }
    });
  }
  
  // ステータス表示
  export function setGameStatus(text) { gameStatus.textContent = text || ""; }
  export function setGameTitle(text) { gameTitle.textContent = text || ""; }
  export function updateStatusUI(text) { gameStatus.textContent = text || ""; }
  
  // 結果カードの1行（ヒストリー）を描画
  export function renderResult(pokemon, comparisonResult, gameMode) {
    const row = document.createElement('div');
    row.classList.add('result-row');
    row.classList.add(gameMode === 'baseStats' ? 'result-row-stats' : 'result-row-classic');
  
    // --- ヘッダー ---
    const { main: mainName, form: formName } = formatDisplayName(pokemon.name);
    const displayNameHTML = formName ? `${mainName}<br><span class="form-name">${formName}</span>` : mainName;
    const header = document.createElement('div');
    header.classList.add('result-header');
    header.innerHTML = `
      <img src="${pokemon.sprite}" alt="${pokemon.name}" class="result-sprite">
      <div class="result-name">${displayNameHTML}</div>
    `;
    row.appendChild(header);
  
    // --- ボディ ---
    const bodyContainer = document.createElement('div');
    bodyContainer.classList.add('result-body');
  
    const formatCombinedField = (items) => {
      const filtered = items.filter(item => item && item !== 'なし');
      return filtered.length > 0 ? filtered.join(' / ') : '—';
    };
  
    const totalStats =
      pokemon.stats.hp + pokemon.stats.attack + pokemon.stats.defense +
      pokemon.stats.spAttack + pokemon.stats.spDefense + pokemon.stats.speed;
  
    if (gameMode === 'baseStats') {
      // 種族値モード（使わない想定だが残しておく）
      bodyContainer.innerHTML = `
        <div class="${comparisonResult.stats.hp.class}">
          <div class="value-wrapper"><span>${pokemon.stats.hp}</span><span class="${comparisonResult.stats.hp.symbolClass}">${comparisonResult.stats.hp.symbol}</span></div>
        </div>
        <div class="${comparisonResult.stats.attack.class}">
          <div class="value-wrapper"><span>${pokemon.stats.attack}</span><span class="${comparisonResult.stats.attack.symbolClass}">${comparisonResult.stats.attack.symbol}</span></div>
        </div>
        <div class="${comparisonResult.stats.defense.class}">
          <div class="value-wrapper"><span>${pokemon.stats.defense}</span><span class="${comparisonResult.stats.defense.symbolClass}">${comparisonResult.stats.defense.symbol}</span></div>
        </div>
        <div class="${comparisonResult.stats.spAttack.class}">
          <div class="value-wrapper"><span>${pokemon.stats.spAttack}</span><span class="${comparisonResult.stats.spAttack.symbolClass}">${comparisonResult.stats.spAttack.symbol}</span></div>
        </div>
        <div class="${comparisonResult.stats.spDefense.class}">
          <div class="value-wrapper"><span>${pokemon.stats.spDefense}</span><span class="${comparisonResult.stats.spDefense.symbolClass}">${comparisonResult.stats.spDefense.symbol}</span></div>
        </div>
        <div class="${comparisonResult.stats.speed.class}">
          <div class="value-wrapper"><span>${pokemon.stats.speed}</span><span class="${comparisonResult.stats.speed.symbolClass}">${comparisonResult.stats.speed.symbol}</span></div>
        </div>
      `;
    } else {
      // クラシック/ランダム
      bodyContainer.innerHTML = `
        <div class="${comparisonResult.debut.class}">
          <div class="value-wrapper">
            <span>${formatDebut(pokemon.debutGen, pokemon.debutTitle)}</span>
            <span class="${comparisonResult.debut.symbolClass}">${comparisonResult.debut.symbol}</span>
          </div>
        </div>
        <div class="${comparisonResult.totalStats.class}">
          <div class="value-wrapper"><span>${totalStats}</span><span class="${comparisonResult.totalStats.symbolClass}">${comparisonResult.totalStats.symbol}</span></div>
        </div>
        <div class="${comparisonResult.types} full-width">${formatCombinedField([pokemon.type1, pokemon.type2])}</div>
        <div class="${comparisonResult.abilities} full-width">${formatCombinedField([pokemon.ability1, pokemon.ability2, pokemon.hiddenAbility])}</div>
        <div class="${comparisonResult.height.class}">
          <div class="value-wrapper"><span>${pokemon.height}m</span><span class="${comparisonResult.height.symbolClass}">${comparisonResult.height.symbol}</span></div>
        </div>
        <div class="${comparisonResult.weight.class}">
          <div class="value-wrapper"><span>${pokemon.weight}kg</span><span class="${comparisonResult.weight.symbolClass}">${comparisonResult.weight.symbol}</span></div>
        </div>
        <div class="${comparisonResult.genderRate}">${formatGenderRate(pokemon.genderRate)}</div>
        <div class="${comparisonResult.evolutionCount}">${pokemon.evolutionCount}</div>
        <div class="${comparisonResult.eggGroups} full-width">${formatCombinedField([pokemon.eggGroup1, pokemon.eggGroup2])}</div>
      `;
    }
  
    row.appendChild(bodyContainer);
    resultHistory.insertAdjacentElement('afterbegin', row);
  }
  
  // 結果モーダル
  export function showResultModal(pokemon, verdict, gameMode, guessesLeft) {
    const verdictEl = resultModal.querySelector('#result-modal-verdict span');
    verdictEl.textContent = verdict;
  
    const scoreEl = resultModal.querySelector('#result-modal-score');
    scoreEl.textContent = '';
  
    const crackerImages = resultModal.querySelectorAll('.verdict-cracker-img');
    if (verdict === '正解') {
      crackerImages.forEach(img => img.classList.remove('hidden'));
      if (gameMode === 'classic' || gameMode === 'randomStart') {
        const guessesTaken = 10 - guessesLeft;
        scoreEl.textContent = `${guessesTaken}回でクリア！`;
      }
    } else {
      crackerImages.forEach(img => img.classList.add('hidden'));
    }
  
    const setData = (field, value) => {
      const el = resultModal.querySelector(`[data-field="${field}"]`);
      if (el) el.textContent = value;
    };
  
    resultModal.querySelector('[data-field="sprite"]').src = pokemon.sprite;
  
    const { main: mainName, form: formName } = formatDisplayName(pokemon.name);
    setData('name', mainName);
    setData('form', formName);
  
    // 図鑑番号（フォームはベース形に合わせる）
    let nationalNo = pokemon.id;
    if (pokemon.name.includes('（')) {
      const baseName = pokemon.name.split('（')[0];
      const allPokemonArray = Object.values(allPokemonData);
      const candidateForms = allPokemonArray.filter(p => p.name.startsWith(baseName));
      if (candidateForms.length > 0) {
        const baseForm = candidateForms.reduce((minPokemon, currentPokemon) => {
          return currentPokemon.id < minPokemon.id ? currentPokemon : minPokemon;
        });
        nationalNo = baseForm.id;
      }
    }
    setData('nationalNo', nationalNo ? `No. ${String(nationalNo).padStart(4, '0')}` : '---');
  
    // 左カラム（2列グリッド）
    const profileLeft = resultModal.querySelector('.profile-left');
    const formatCombinedField = (items) => {
      const filtered = items.filter(item => item && item !== 'なし');
      return filtered.length > 0 ? filtered.join(' / ') : '—';
    };
    const totalStats =
      pokemon.stats.hp + pokemon.stats.attack + pokemon.stats.defense +
      pokemon.stats.spAttack + pokemon.stats.spDefense + pokemon.stats.speed;
  
    profileLeft.innerHTML = `
      <div class="modal-grid-item"><span class="modal-grid-label">世代/作品</span><span class="modal-grid-value">${formatDebut(pokemon.debutGen, pokemon.debutTitle)}</span></div>
      <div class="modal-grid-item"><span class="modal-grid-label">合計種族値</span><span class="modal-grid-value">${totalStats}</span></div>
      <div class="modal-grid-item full-width"><span class="modal-grid-label">タイプ</span><span class="modal-grid-value">${formatCombinedField([pokemon.type1, pokemon.type2])}</span></div>
      <div class="modal-grid-item full-width"><span class="modal-grid-label">特性</span><span class="modal-grid-value">${formatCombinedField([pokemon.ability1, pokemon.ability2, pokemon.hiddenAbility])}</span></div>
      <div class="modal-grid-item"><span class="modal-grid-label">高さ</span><span class="modal-grid-value">${pokemon.height} m</span></div>
      <div class="modal-grid-item"><span class="modal-grid-label">重さ</span><span class="modal-grid-value">${pokemon.weight} kg</span></div>
      <div class="modal-grid-item"><span class="modal-grid-label">性別比</span><span class="modal-grid-value">${formatGenderRate(pokemon.genderRate)}</span></div>
      <div class="modal-grid-item"><span class="modal-grid-label">進化数</span><span class="modal-grid-value">${pokemon.evolutionCount}</span></div>
      <div class="modal-grid-item full-width"><span class="modal-grid-label">タマゴグループ</span><span class="modal-grid-value">${formatCombinedField([pokemon.eggGroup1, pokemon.eggGroup2])}</span></div>
    `;
  
    // 右カラム（種族値グラフ）は非表示継続（クラシック/ランダム）
    const profileDetails = resultModal.querySelector('.profile-left'); profileDetails.classList.add('pair-grid');
    const profileStats = resultModal.querySelector('.profile-right');
    if (gameMode === 'classic' || gameMode === 'randomStart') {
      profileStats.classList.add('hidden');
      profileDetails.style.gridColumn = '1 / -1';
    } else {
      profileStats.classList.remove('hidden');
      profileDetails.style.gridColumn = '';
    }
  
    resultModalOverlay.classList.remove('hidden');
  }
  
  // リスト操作・UIヘルパ
  export function clearResults() { resultHistory.innerHTML = ""; }
  export function blurGuessInput(){ if (guessInput) guessInput.blur(); }
  export function getGuessInputValue(){ return guessInput ? guessInput.value.trim() : ""; }
  export function clearGuessInput(){ if (guessInput) guessInput.value = ""; }
  
  // サジェスト
  let suggestionRequestToken = 0;
  function handleInput() {
    const currentToken = ++suggestionRequestToken;
    const inputText = guessInput.value.trim();
    if (inputText.length === 0) {
      suggestionsBox.classList.add('hidden');
      return;
    }
  
    suggestionsBox.style.width = `${guessInput.offsetWidth}px`;
  
    const inputTextKana = normalizePokemonName(inputText);
    const suggestions = allPokemonNames
      .filter(name => normalizePokemonName(name).startsWith(inputTextKana))
      .slice(0, 100);
  
    if (currentToken !== suggestionRequestToken) return;
  
    if (suggestions.length > 0) {
      const itemsHtml = suggestions.map(name => {
        const pokemon = allPokemonData[name];
        const spriteUrl = pokemon ? pokemon.sprite : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
        return `
          <div class="suggestion-item" data-name="${name}">
            <img src="${spriteUrl}" alt="${name}" class="suggestion-sprite">
            <span>${name}</span>
          </div>
        `;
      }).join('');
  
      suggestionsBox.innerHTML = itemsHtml;
      suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          guessInput.value = item.dataset.name;
          suggestionsBox.classList.add('hidden');
          guessInput.focus();
        });
      });
      suggestionsBox.classList.remove('hidden');
    } else {
      suggestionsBox.classList.add('hidden');
    }
  }
  
  // モーダル（読みやすいフォント用のラッパーを維持）
  export function openModal(title, content) {
    const titleHTML = title ? `<h3>${title}</h3>` : '';
    modalContent.innerHTML = `${titleHTML}<div class="modal-body">${content}</div>`;
    modalOverlay.classList.remove('hidden');
  }
  export function closeModal() { modalOverlay.classList.add('hidden'); }

  // ===== 「遊び方」モーダル（アコーディオン付き） =====
function openHowToPlayModal() {
    const howToContent = `
      <p class="lead">
        ポケモンの様々な情報から、正解のポケモンを推理するゲームです。ヒントの色や▲▼の矢印を手がかりに当ててください！
      </p>
  
      <div class="accordion" role="region" aria-label="遊び方の詳細">
        <!-- 1) ルール説明 -->
        <section class="accordion-item">
          <h4 class="accordion-header">
            <button class="accordion-trigger" aria-expanded="false" aria-controls="acc-panel-rules" id="acc-btn-rules">
              ルール説明
              <span class="accordion-icon" aria-hidden="true"></span>
            </button>
          </h4>
          <div id="acc-panel-rules" class="accordion-panel" role="region" aria-labelledby="acc-btn-rules" hidden>
            <div class="accordion-panel-inner">
              <p>
                回答したポケモンの情報が、正解とどれだけ近いかを<strong>色</strong>で表示します。
              </p>
              <ul class="bullets">
                <li><span class="legend legend-green">緑</span>：完全一致（例：タイプや特性が全て一致）</li>
                <li><span class="legend legend-yellow">黄</span>：部分一致（例：タイプ片方一致／世代一致だが作品違い）</li>
                <li><span class="legend legend-gray">灰</span>：不一致（数値項目には <strong>▲/▼</strong> を付与）</li>
              </ul>
              <p class="note">▲ は「正解の方が大きい」、▼ は「正解の方が小さい」を表します。</p>
            </div>
          </div>
        </section>
  
        <!-- 2) 比較項目等の補足情報 -->
        <section class="accordion-item">
          <h4 class="accordion-header">
            <button class="accordion-trigger" aria-expanded="false" aria-controls="acc-panel-metrics" id="acc-btn-metrics">
              比較項目等の補足情報
              <span class="accordion-icon" aria-hidden="true"></span>
            </button>
          </h4>
          <div id="acc-panel-metrics" class="accordion-panel" role="region" aria-labelledby="acc-btn-metrics" hidden>
            <div class="accordion-panel-inner">
              <ul class="bullets">
                <li><strong>世代/作品</strong>：<span class="legend legend-green">緑</span>＝世代も作品も一致、<span class="legend legend-yellow">黄</span>＝世代のみ一致、<span class="legend legend-gray">灰＋▲/▼</span>＝世代が違う</li>
                <li><strong>タイプ/特性/タマゴG</strong>：完全一致で <span class="legend legend-green">緑</span>、一部一致で <span class="legend legend-yellow">黄</span>、一致なしは <span class="legend legend-gray">灰</span></li>
                <li><strong>合計種族値・高さ・重さ</strong>：一致で <span class="legend legend-green">緑</span>、不一致は <span class="legend legend-gray">灰</span>＋▲/▼</li>
                <li><strong>性別比・進化数</strong>：一致で <span class="legend legend-green">緑</span>、不一致は <span class="legend legend-gray">灰</span></li>
              </ul>
            </div>
          </div>
        </section>
  
        <!-- 3) クラシックモードとは -->
        <section class="accordion-item">
          <h4 class="accordion-header">
            <button class="accordion-trigger" aria-expanded="false" aria-controls="acc-panel-classic" id="acc-btn-classic">
              クラシックモードとは
              <span class="accordion-icon" aria-hidden="true"></span>
            </button>
          </h4>
          <div id="acc-panel-classic" class="accordion-panel" role="region" aria-labelledby="acc-btn-classic" hidden>
            <div class="accordion-panel-inner">
              <ul class="bullets">
                <li>1問につき<strong>最大10回</strong>まで回答できます。</li>
                <li>履歴カードで、各項目の一致度を確認しながら推理を進めます。</li>
              </ul>
            </div>
          </div>
        </section>
  
        <!-- 4) ランダムモードとは -->
        <section class="accordion-item">
          <h4 class="accordion-header">
            <button class="accordion-trigger" aria-expanded="false" aria-controls="acc-panel-random" id="acc-btn-random">
              ランダムモードとは
              <span class="accordion-icon" aria-hidden="true"></span>
            </button>
          </h4>
          <div id="acc-panel-random" class="accordion-panel" role="region" aria-labelledby="acc-btn-random" hidden>
            <div class="accordion-panel-inner">
              <ul class="bullets">
                <li>開始時に<strong>ノーカウントのランダムヒント</strong>が1回表示されます。</li>
                <li>以降はクラシックと同様に推理して当てます。</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    `;
  
  // 既存の openModal を使って差し込む（モーダルのフォントは .modal-body で非ドット）
  openModal('遊び方', howToContent);

  // アコーディオンのイベント初期化
  const accRoot = document.querySelector('#modal .modal-body .accordion') || document.querySelector('#modal .accordion') || document.querySelector('.accordion');
  setupAccordion(accRoot);
}
  
/** アコーディオン初期化（複数同時オープン可 / アクセシビリティ配慮） */
function setupAccordion(root) {
  if (!root) return;
  const triggers = Array.from(root.querySelectorAll('.accordion-trigger'));

  // 初期状態：全部閉じる
  triggers.forEach((btn) => {
    const panelId = btn.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    if (!panel) return;
    btn.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    panel.style.maxHeight = '0px';
  });

  // クリックで開閉（アニメーション付き）
  triggers.forEach((btn) => {
    const panelId = btn.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    if (!panel) return;

    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));

      if (!expanded) {
        panel.hidden = false;
        // いったんオートで高さ確定してから代入
        panel.style.maxHeight = panel.scrollHeight + 'px';
      } else {
        // 閉じアニメ：現在の高さ → 0
        panel.style.maxHeight = panel.scrollHeight + 'px';
        requestAnimationFrame(() => {
          panel.style.maxHeight = '0px';
        });
        panel.addEventListener('transitionend', () => {
          panel.hidden = true;
        }, { once: true });
      }
    });

    // キーボードナビ（任意：↑↓で隣へ、Home/End で先頭/末尾）
    btn.addEventListener('keydown', (e) => {
      const idx = triggers.indexOf(btn);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = triggers[idx + 1] || triggers[0];
        next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = triggers[idx - 1] || triggers[triggers.length - 1];
        prev.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        triggers[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        triggers[triggers.length - 1].focus();
      }
    });
  });
}
  
  
  // 可視状態ヘルパ
  export function showInputArea(){ if (inputArea) inputArea.classList.remove('hidden'); }
  export function hideInputArea(){ if (inputArea) inputArea.classList.add('hidden'); }
  export function showRandomStartButton(){ if (randomStartButton) randomStartButton.classList.remove('hidden'); }
  export function hideRandomStartButton(){ if (randomStartButton) randomStartButton.classList.add('hidden'); }
  export function hideNextQuestionButton(){ if (nextQuestionButton) nextQuestionButton.classList.add('hidden'); }
  export function hideBackToMenuButton(){ if (backToMenuButton) backToMenuButton.classList.add('hidden'); }
  export function showBackToMenuButton(){ if (backToMenuButton) backToMenuButton.classList.remove('hidden'); }
  export function showPlayAgainButton(){ if (playAgainButton) playAgainButton.classList.remove('hidden'); }
  export function hidePostGameActions(){ const el = document.getElementById('post-game-actions'); if (el) el.classList.add('hidden'); }
  export function showPostGameActions(){ const el = document.getElementById('post-game-actions'); if (el) el.classList.remove('hidden'); }
  export function hideSuggestions(){ const el = suggestionsBox; if (el) el.classList.add('hidden'); }  