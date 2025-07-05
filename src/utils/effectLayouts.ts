export type LayoutType =
  | "center"
  | "circle"
  | "random"
  | "wave"
  | "grid"
  | "spiral";

export interface LayoutConfig {
  type: LayoutType;
  count?: number; // 配置する数（ランダムやグリッド用）
  radius?: number; // 円形配置の半径
  speed?: number; // アニメーション速度
  animated?: boolean; // アニメーション有効フラグ
  rotation?: number; // 螺旋配置の回転角（ラジアン）
  sizeRatio?: number; // 最初と最後のサイズ比（最初のサイズ / 最後のサイズ）
  rows?: number; // グリッド配置の行数
  cols?: number; // グリッド配置の列数
  scale?: number; // グリッド配置でのセル境界に対する比率（0.9で10%のマージン）
  amplitude?: number; // 波状配置の振幅
  maxScale?: number; // ランダム配置でのスケール上限値
}

export interface EffectLayout {
  id: number;
  config: LayoutConfig;
}

// 各エフェクトの配置設定
export const EFFECT_LAYOUTS: EffectLayout[] = [
  {
    id: 0,
    config: {type: "grid", rows: 1, cols: 5, animated: true, scale: 0.9},
  }, // 1行5列のグリッド（アニメーション付き）
  {
    id: 1,
    config: {
      type: "spiral",
      count: 30,
      radius: 1000,
      animated: true,
      rotation: Math.PI * 10.5,
      sizeRatio: 0.05,
    },
  }, // 螺旋配置（アニメーション付き）
  {
    id: 2,
    config: {type: "random", count: 8, animated: true, speed: 1, maxScale: 0.5},
  }, // ランダム配置
  {id: 3, config: {type: "wave", count: 6, speed: 0.1, amplitude: 1000}}, // 波状配置
  {
    id: 4,
    config: {
      type: "grid",
      rows: 3,
      cols: 3,
      speed: 1,
      animated: true,
      scale: 0.3,
    },
  }, // 3行3列のグリッド（アニメーション付き）
  {
    id: 5,
    config: {
      type: "grid",
      rows: 20,
      cols: 10,
      animated: true,
      scale: 0.2,
      speed: 0.3,
    },
  }, // 螺旋配置
  {id: 6, config: {type: "circle", radius: 300, count: 3}}, // 大きな円形
  {
    id: 7,
    config: {
      type: "random",
      count: 6,
      animated: true,
      speed: 0.5,
      maxScale: 0.6,
    },
  }, // 多数ランダム
];

// 配置計算関数
export function calculatePositions(
  layout: LayoutConfig,
  canvasWidth: number,
  canvasHeight: number,
  time: number = 0
): Array<{x: number; y: number; scale: number; rotation: number}> {
  const positions: Array<{
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }> = [];
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  switch (layout.type) {
    case "center": {
      positions.push({
        x: centerX,
        y: centerY,
        scale: 1,
        rotation: 0,
      });
      break;
    }

    case "circle": {
      const count = layout.count || 5;
      const radius = layout.radius || 200;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        positions.push({
          x,
          y,
          scale: 0.6,
          rotation: angle,
        });
      }
      break;
    }

    case "random": {
      const randomCount = layout.count || 8;
      const isAnimated = layout.animated || false;
      const randomSpeed = layout.speed || 1; // アニメーション速度（デフォルト1）
      const maxScale = layout.maxScale || 0.8; // スケール上限値（デフォルト0.8）

      // アニメーションの場合、表示する数を時間に基づいて計算
      let displayCount = randomCount;
      const baseAnimationCycle = 2000; // 基準アニメーション時間（2秒）
      const animationCycle = baseAnimationCycle / randomSpeed; // 速度に応じてアニメーション時間を調整

      if (isAnimated) {
        const animationProgress = (time % animationCycle) / animationCycle;
        // アニメーション進行度が0の時は全て非表示、1の時は全て表示
        // ステップを1つ増やして、進行度1.0で全て表示されるようにする
        displayCount = Math.floor(animationProgress * (randomCount + 1));
      }

      // アニメーションが無効の場合は、最初に配置を決定して固定
      // アニメーションが有効の場合は、アニメーション周期ごとに配置をリセット
      const seed = isAnimated ? Math.floor(time / animationCycle) : 0;

      // 重複を避けるための配置アルゴリズム
      const placedPositions: Array<{x: number; y: number; scale: number}> = [];
      const minDistance = 100; // 要素間の最小距離
      const maxAttempts = 100; // 各要素の最大試行回数

      for (let i = 0; i < displayCount; i++) {
        const elementSeed = seed * 1000 + i;

        // シードベースの疑似乱数生成器
        const seededRandom = (min: number, max: number, offset: number = 0) => {
          const x = Math.sin(elementSeed * (1.1 + offset)) * 10000;
          return min + (x - Math.floor(x)) * (max - min);
        };

        let attempts = 0;
        let validPosition = false;
        let x = 0,
          y = 0,
          scale = 0;

        // 重複しない位置を見つけるまで試行
        while (attempts < maxAttempts && !validPosition) {
          x = seededRandom(
            canvasWidth * 0.1,
            canvasWidth * 0.9,
            attempts * 0.1
          );
          y = seededRandom(
            canvasHeight * 0.1,
            canvasHeight * 0.9,
            attempts * 0.2
          );
          scale = seededRandom(0.4, maxScale, attempts * 0.3);

          // 既存の要素との距離をチェック
          validPosition = true;
          for (const placed of placedPositions) {
            const distance = Math.sqrt(
              Math.pow(x - placed.x, 2) + Math.pow(y - placed.y, 2)
            );
            const minRequiredDistance =
              minDistance + (scale + placed.scale) * 50; // スケールも考慮
            if (distance < minRequiredDistance) {
              validPosition = false;
              break;
            }
          }

          attempts++;
        }

        // 有効な位置が見つかった場合のみ追加
        if (validPosition) {
          placedPositions.push({x, y, scale});
          positions.push({
            x,
            y,
            scale,
            rotation: 0, // 回転を無効化
          });
        }
      }
      break;
    }

    case "wave": {
      const waveCount = layout.count || 6;
      const waveSpeed = layout.speed || 2;
      const waveAmplitude = layout.amplitude || 100; // 振幅のデフォルト値
      for (let i = 0; i < waveCount; i++) {
        const progress = i / (waveCount - 1);
        const x = centerX + (progress - 0.5) * canvasWidth * 0.6;
        const y =
          centerY +
          Math.sin(progress * Math.PI * 4 + time * waveSpeed * 0.01) *
            waveAmplitude;
        positions.push({
          x,
          y,
          scale: 0.5 + Math.sin(progress * Math.PI * 2) * 0.2,
          rotation: progress * Math.PI * 2,
        });
      }
      break;
    }

    case "grid": {
      const rows = layout.rows || 3;
      const cols = layout.cols || 3;
      const gridCount = rows * cols;
      const isAnimated = layout.animated || false;
      const cellScale = layout.scale || 0.8; // セル境界に対する比率（デフォルト0.8）
      const gridSpeed = layout.speed || 1; // アニメーション速度（デフォルト1）

      // countパラメーターが指定されている場合は、rowsとcolsを自動計算
      let actualRows = rows;
      let actualCols = cols;
      if (layout.count && !layout.rows && !layout.cols) {
        actualCols = Math.ceil(Math.sqrt(layout.count));
        actualRows = Math.ceil(layout.count / actualCols);
      }

      // アニメーションの場合、表示する数を時間に基づいて計算
      let displayCount = gridCount;
      const baseAnimationCycle = 2000; // 基準アニメーション時間（2秒）
      const animationCycle = baseAnimationCycle / gridSpeed; // 速度に応じてアニメーション時間を調整
      if (isAnimated) {
        const animationProgress = (time % animationCycle) / animationCycle;
        // アニメーション進行度が0の時は全て非表示、1の時は全て表示
        // ステップを1つ増やして、進行度1.0で全て表示されるようにする
        displayCount = Math.floor(animationProgress * (gridCount + 1));
      }

      // キャンバスを指定した行数・列数で分割
      const cellWidth = canvasWidth / actualCols;
      const cellHeight = canvasHeight / actualRows;

      for (let i = 0; i < displayCount; i++) {
        const col = i % actualCols;
        const row = Math.floor(i / actualCols);

        // 各セルの中心座標を計算
        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + cellHeight / 2;

        // アスペクト比を保持したスケール計算
        // セルの幅と高さの小さい方に合わせてスケールを決定
        const cellSize = Math.min(cellWidth, cellHeight);
        const scale = (cellSize * cellScale) / 200; // 200pxを基準としたスケール計算

        positions.push({
          x,
          y,
          scale,
          rotation: 0,
        });
      }
      break;
    }

    case "spiral": {
      const spiralCount = layout.count || 7;
      const spiralRadius = layout.radius || 150;
      const isAnimated = layout.animated || false;
      const totalRotation = layout.rotation || Math.PI * 4; // デフォルトは4π（2回転）
      const sizeRatio = layout.sizeRatio || 0.5; // デフォルトは0.5（最初のサイズは最後のサイズの半分）
      const spiralSpeed = layout.speed || 1; // アニメーション速度（デフォルト1）

      // アニメーションの場合、表示する数を時間に基づいて計算
      let displayCount = spiralCount;
      const baseAnimationCycle = 3000; // 基準アニメーション時間（3秒）
      const animationCycle = baseAnimationCycle / spiralSpeed; // 速度に応じてアニメーション時間を調整
      if (isAnimated) {
        const animationProgress = (time % animationCycle) / animationCycle;
        // アニメーション進行度が0の時は全て非表示、1の時は全て表示
        // ステップを1つ増やして、進行度1.0で全て表示されるようにする
        displayCount = Math.floor(animationProgress * (spiralCount + 1));
      }

      for (let i = 0; i < displayCount; i++) {
        const angle = (i / spiralCount) * totalRotation;
        const radius = (i / spiralCount) * spiralRadius;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        // サイズ比に基づくスケール計算
        const normalizedIndex = i / spiralCount;
        const minScale = sizeRatio;
        const maxScale = 1.0;
        const scale = minScale + (maxScale - minScale) * normalizedIndex;

        positions.push({
          x,
          y,
          scale,
          rotation: angle,
        });
      }
      break;
    }
  }

  return positions;
}

// エフェクトIDからレイアウト設定を取得
export function getLayoutForEffect(effectId: number): LayoutConfig {
  const layout = EFFECT_LAYOUTS.find((l) => l.id === effectId);
  return layout?.config || {type: "center"};
}
