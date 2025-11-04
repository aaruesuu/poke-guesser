// js/compare.js
export function comparePokemon(guessed, correct) {
  if (!guessed || !correct) {
    console.error("comparePokemon was called with invalid data:", { guessed, correct });
    return {};
  }

  // 数値比較（▲/▼ のための共通ヘルパ）
  const createNumericComparison = (guessedValue, correctValue) => {
    let symbol = '';
    let symbolClass = '';
    if (guessedValue > correctValue) {
      symbol = '▼';           // 正解が小さい（=もっと低い）
      symbolClass = 'text-blue';
    } else if (guessedValue < correctValue) {
      symbol = '▲';           // 正解が大きい（=もっと高い）
      symbolClass = 'text-red';
    }
    return {
      class: guessedValue === correctValue ? 'bg-green' : 'bg-gray',
      symbol,
      symbolClass
    };
  };

  // セット比較（タイプ・特性・タマゴG 統合）
  const compareSets = (guessedItems, correctItems) => {
    const guessedSet = new Set(guessedItems.filter(i => i && i !== 'なし'));
    const correctSet = new Set(correctItems.filter(i => i && i !== 'なし'));

    if (correctSet.size === 0) {
      return guessedSet.size === 0 ? 'bg-green' : 'bg-gray';
    }
    if (guessedSet.size === 0) return 'bg-gray';

    const intersectionSize = new Set([...guessedSet].filter(i => correctSet.has(i))).size;

    if (guessedSet.size === correctSet.size && intersectionSize === correctSet.size) {
      return 'bg-green'; // 完全一致
    } else if (intersectionSize > 0) {
      return 'bg-yellow'; // 部分一致
    } else {
      return 'bg-gray'; // 不一致
    }
  };

  // ★ 世代/作品 比較（世代が違うときは▲/▼、世代一致=黄、作品まで一致=緑）
  const compareDebut = (gGen, gTitle, cGen, cTitle) => {
    const g = typeof gGen === 'number' ? gGen : null;
    const c = typeof cGen === 'number' ? cGen : null;
    if (g === null || c === null) {
      return { class: 'bg-gray', symbol: '', symbolClass: '' };
    }
    if (g === c) {
      const sameTitle = (gTitle || '') === (cTitle || '');
      return {
        class: sameTitle ? 'bg-green' : 'bg-yellow',
        symbol: '',
        symbolClass: ''
      };
    }
    const cmp = createNumericComparison(g, c);
    return { class: 'bg-gray', symbol: cmp.symbol, symbolClass: cmp.symbolClass };
  };

  // --- クラシック/ランダム用の比較結果 ---
  const result = {};

  // 1) 世代/作品（先頭セル）
  result.debut = compareDebut(
    guessed.debutGen, guessed.debutTitle,
    correct.debutGen, correct.debutTitle
  );

  // 2) 統合項目
  result.types = compareSets([guessed.type1, guessed.type2], [correct.type1, correct.type2]);
  result.abilities = compareSets(
    [guessed.ability1, guessed.ability2, guessed.hiddenAbility],
    [correct.ability1, correct.ability2, correct.hiddenAbility]
  );
  result.eggGroups = compareSets(
    [guessed.eggGroup1, guessed.eggGroup2],
    [correct.eggGroup1, correct.eggGroup2]
  );

  // 3) 数値・単純一致
  result.height = createNumericComparison(guessed.height, correct.height);
  result.weight = createNumericComparison(guessed.weight, correct.weight);

  const gTotal =
    guessed.stats.hp + guessed.stats.attack + guessed.stats.defense +
    guessed.stats.spAttack + guessed.stats.spDefense + guessed.stats.speed;
  const cTotal =
    correct.stats.hp + correct.stats.attack + correct.stats.defense +
    correct.stats.spAttack + correct.stats.spDefense + correct.stats.speed;
  result.totalStats = createNumericComparison(gTotal, cTotal);

  result.evolutionCount = guessed.evolutionCount === correct.evolutionCount ? 'bg-green' : 'bg-gray';
  result.genderRate = guessed.genderRate === correct.genderRate ? 'bg-green' : 'bg-gray';

  return result;
}


// // js/compare.js
// // 比較関数群（クラシック用）: debut（世代/作品）, 数値, セット

// /**
//  * 数値比較（▲/▼の記号つき）
//  * @param {number} guessedValue
//  * @param {number} correctValue
//  * @returns {{class:string, symbol:string, symbolClass:string}}
//  */
// function createNumericComparison(guessedValue, correctValue) {
//   let symbol = "";
//   let symbolClass = "";
//   if (Number.isFinite(guessedValue) && Number.isFinite(correctValue)) {
//     if (guessedValue > correctValue) {
//       symbol = "▼"; // 正解の方が小さい
//       symbolClass = "text-blue";
//     } else if (guessedValue < correctValue) {
//       symbol = "▲"; // 正解の方が大きい
//       symbolClass = "text-red";
//     }
//   }
//   return {
//     class:
//       Number.isFinite(guessedValue) &&
//       Number.isFinite(correctValue) &&
//       guessedValue === correctValue
//         ? "bg-green"
//         : "bg-gray",
//     symbol,
//     symbolClass,
//   };
// }

// /**
//  * 集合（タイプ/特性/タマゴG）比較
//  * @param {string[]} guessedItems
//  * @param {string[]} correctItems
//  * @returns {"bg-green"|"bg-yellow"|"bg-gray"}
//  */
// function compareSets(guessedItems, correctItems) {
//   const g = new Set((guessedItems || []).filter((i) => i && i !== "なし"));
//   const c = new Set((correctItems || []).filter((i) => i && i !== "なし"));
//   if (c.size === 0) return g.size === 0 ? "bg-green" : "bg-gray";
//   if (g.size === 0) return "bg-gray";
//   let inter = 0;
//   for (const x of g) if (c.has(x)) inter++;
//   if (inter === c.size && g.size === c.size) return "bg-green"; // 完全一致
//   if (inter > 0) return "bg-yellow"; // 部分一致
//   return "bg-gray";
// }

// /**
//  * debut（世代/作品）比較
//  * - debutTitle完全一致 → 緑
//  * - debutGenのみ一致 → 黄
//  * - それ以外 → 灰
//  * @param {{debutGen?:number, debutTitle?:string}} guessed
//  * @param {{debutGen?:number, debutTitle?:string}} correct
//  * @returns {{class:"bg-green"|"bg-yellow"|"bg-gray", debutTitleHit:boolean, debutGenHit:boolean}}
//  */
// function compareDebut(guessed, correct) {
//   const gGen = guessed?.debutGen ?? null;
//   const gTitle = guessed?.debutTitle ?? null;
//   const cGen = correct?.debutGen ?? null;
//   const cTitle = correct?.debutTitle ?? null;

//   const titleHit = !!(gTitle && cTitle && gTitle === cTitle);
//   const genHit = !!(gGen && cGen && gGen === cGen);

//   return {
//     class: titleHit ? "bg-green" : genHit ? "bg-yellow" : "bg-gray",
//     debutTitleHit: titleHit,
//     debutGenHit: genHit && !titleHit,
//   };
// }

// /**
//  * クラシック用の総合比較
//  * @param {object} guessed - 回答ポケモン
//  * @param {object} correct - 正解ポケモン
//  * @returns {object} 比較結果オブジェクト
//  */
// export function comparePokemon(guessed, correct) {
//   if (!guessed || !correct) {
//     console.error("comparePokemon invalid args:", { guessed, correct });
//     return null;
//   }
//   const res = {};

//   // debut（世代/作品）
//   res.debut = compareDebut(guessed, correct);

//   // 合計種族値（数値比較）
//   const gTotal =
//     guessed.stats.hp +
//     guessed.stats.attack +
//     guessed.stats.defense +
//     guessed.stats.spAttack +
//     guessed.stats.spDefense +
//     guessed.stats.speed;
//   const cTotal =
//     correct.stats.hp +
//     correct.stats.attack +
//     correct.stats.defense +
//     correct.stats.spAttack +
//     correct.stats.spDefense +
//     correct.stats.speed;
//   res.totalStats = createNumericComparison(gTotal, cTotal);

//   // セット系
//   res.types = compareSets([guessed.type1, guessed.type2], [
//     correct.type1,
//     correct.type2,
//   ]);
//   res.abilities = compareSets(
//     [guessed.ability1, guessed.ability2, guessed.hiddenAbility],
//     [correct.ability1, correct.ability2, correct.hiddenAbility]
//   );
//   res.eggGroups = compareSets([guessed.eggGroup1, guessed.eggGroup2], [
//     correct.eggGroup1,
//     correct.eggGroup2,
//   ]);

//   // 数値系
//   res.height = createNumericComparison(guessed.height, correct.height);
//   res.weight = createNumericComparison(guessed.weight, correct.weight);

//   // イコール判定系
//   res.genderRate =
//     guessed.genderRate === correct.genderRate ? "bg-green" : "bg-gray";
//   res.evolutionCount =
//     guessed.evolutionCount === correct.evolutionCount ? "bg-green" : "bg-gray";

//   return res;
// }
