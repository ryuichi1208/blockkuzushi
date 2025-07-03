# WebAssemblyを使った部分的な高速化

このプロジェクトでは、ゲームの計算負荷が高い衝突判定部分をWebAssemblyで高速化するサンプルを含んでいます。

## セットアップ

### 1. Emscripten SDKのインストール

```bash
# Emscripten SDKをインストール
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### 2. WebAssemblyモジュールのビルド

```bash
# プロジェクトディレクトリで
make

# または直接コンパイル
emcc -O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' -s ALLOW_MEMORY_GROWTH=1 collision.c -o collision.js
```

## 実装されている機能

### C言語側 (collision.c)

1. **check_collision**: 基本的な矩形同士の衝突判定
2. **check_ball_blocks_collision**: ボールと複数ブロックの衝突を一度にチェック
3. **update_ball_position**: ボールの位置更新と壁との衝突判定
4. **check_paddle_collision**: パドルとボールの衝突判定と反射角度計算

### JavaScript側 (wasm-loader.js)

- WebAssemblyモジュールの非同期読み込み
- C関数のラップとメモリ管理
- 複数ブロックの衝突判定を効率的に処理

## 使用方法

```javascript
// 1. HTMLにスクリプトを追加
<script src="wasm-loader.js"></script>

// 2. ゲーム初期化時にWASMモジュールを読み込む
const wasmCollision = new WASMCollisionDetector();
await wasmCollision.init();

// 3. 衝突判定で使用
if (wasmCollision.ready) {
    // 複数ブロックとの衝突を一度にチェック
    const hitIndices = wasmCollision.checkBlockCollisions(this.ball, this.blocks);
    
    // 衝突したブロックを処理
    hitIndices.forEach(index => {
        const block = this.blocks[index];
        if (block.hit()) {
            this.blocks.splice(index, 1);
            this.score += block.points;
        }
    });
}
```

## パフォーマンスのメリット

1. **バッチ処理**: 複数のブロックとの衝突判定を一度に実行
2. **メモリ効率**: 連続したメモリ領域での処理により、キャッシュ効率が向上
3. **最適化**: C言語の-O3最適化により、JavaScriptより高速な実行

## 注意事項

- WebAssemblyのロードは非同期なので、ゲーム開始前に初期化が必要
- フォールバック: WASMが利用できない場合は既存のJavaScript実装を使用
- メモリ管理: 大量のオブジェクトを処理する場合は、メモリの確保と解放に注意

## ブラウザサポート

現代のブラウザはすべてWebAssemblyをサポートしています：
- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+