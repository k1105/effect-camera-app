interface SpriteFrame {
  frame: {x: number; y: number; w: number; h: number};
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: {x: number; y: number; w: number; h: number};
  sourceSize: {w: number; h: number};
}

interface SpriteSheetData {
  meta: {
    image: string;
    size: {w: number; h: number};
    scale: string;
  };
  frames: Record<string, SpriteFrame>;
}

export async function loadEffectsFromSpriteSheet(): Promise<ImageBitmap[]> {
  try {
    // スプライトシートのJSONデータを読み込み
    const response = await fetch("/assets/spritesheet.json");
    const spriteData: SpriteSheetData = await response.json();

    // スプライトシート画像を読み込み
    const imageResponse = await fetch("/assets/spritesheet.png");
    const imageBlob = await imageResponse.blob();
    const spriteSheetBitmap = await createImageBitmap(imageBlob);

    // 各フレームからエフェクトを抽出
    const effects: ImageBitmap[] = [];
    const frameNames = Object.keys(spriteData.frames).sort(); // 名前順でソート

    for (const frameName of frameNames) {
      const frame = spriteData.frames[frameName];
      const {x, y, w, h} = frame.frame;

      // スプライトシートから該当部分を切り出してImageBitmapを作成
      const effectBitmap = await createImageBitmap(
        spriteSheetBitmap,
        x,
        y,
        w,
        h
      );

      effects.push(effectBitmap);
    }

    console.log(
      `スプライトシートから ${effects.length} 個のエフェクトを読み込みました`
    );
    return effects;
  } catch (error) {
    console.error("スプライトシートの読み込みに失敗しました:", error);
    throw error;
  }
}
