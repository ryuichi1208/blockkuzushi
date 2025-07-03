// wasm-loader.js - WebAssemblyモジュールのローダー

class WASMCollisionDetector {
    constructor() {
        this.module = null;
        this.ready = false;
        this.checkCollision = null;
        this.checkBallBlocksCollision = null;
        this.updateBallPosition = null;
        this.checkPaddleCollision = null;
    }

    async init() {
        try {
            // WebAssemblyモジュールを読み込む
            const response = await fetch('collision.wasm');
            const wasmBuffer = await response.arrayBuffer();
            
            // Emscriptenが生成したJSファイルを動的に読み込む
            const script = document.createElement('script');
            script.src = 'collision.js';
            
            return new Promise((resolve, reject) => {
                script.onload = () => {
                    // Emscriptenモジュールが準備できるまで待つ
                    Module.onRuntimeInitialized = () => {
                        // C関数をラップ
                        this.checkCollision = Module.cwrap('check_collision', 
                            'boolean', ['number', 'number', 'number', 'number', 
                                       'number', 'number', 'number', 'number']);
                        
                        this.checkBallBlocksCollision = Module.cwrap('check_ball_blocks_collision',
                            'number', ['number', 'number', 'number', 'number', 
                                      'number', 'number', 'number']);
                        
                        this.updateBallPosition = Module.cwrap('update_ball_position',
                            null, ['number', 'number', 'number', 'number', 
                                  'number', 'number', 'number', 'number', 'number']);
                        
                        this.checkPaddleCollision = Module.cwrap('check_paddle_collision',
                            'boolean', ['number', 'number', 'number', 'number',
                                       'number', 'number', 'number', 'number',
                                       'number', 'number', 'number']);
                        
                        this.module = Module;
                        this.ready = true;
                        resolve();
                    };
                };
                
                script.onerror = reject;
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('WebAssembly初期化エラー:', error);
            throw error;
        }
    }

    // 複数ブロックとの衝突を一度にチェック
    checkBlockCollisions(ball, blocks) {
        if (!this.ready) return [];
        
        const blockCount = blocks.length;
        const blocksDataSize = blockCount * 4 * 4; // 4 floats per block
        const hitIndicesSize = blockCount * 4;     // int array
        
        // メモリを確保
        const blocksDataPtr = this.module._malloc(blocksDataSize);
        const hitIndicesPtr = this.module._malloc(hitIndicesSize);
        
        // ブロックデータを配列に変換
        const blocksData = new Float32Array(blockCount * 4);
        blocks.forEach((block, i) => {
            const idx = i * 4;
            blocksData[idx] = block.x;
            blocksData[idx + 1] = block.y;
            blocksData[idx + 2] = block.width;
            blocksData[idx + 3] = block.height;
        });
        
        // WebAssemblyメモリにコピー
        this.module.HEAPF32.set(blocksData, blocksDataPtr / 4);
        
        // 衝突判定を実行
        const hitCount = this.checkBallBlocksCollision(
            ball.x, ball.y, ball.width, ball.height,
            blocksDataPtr, blockCount, hitIndicesPtr
        );
        
        // 結果を取得
        const hitIndices = [];
        if (hitCount > 0) {
            const indices = new Int32Array(this.module.HEAP32.buffer, hitIndicesPtr, hitCount);
            for (let i = 0; i < hitCount; i++) {
                hitIndices.push(indices[i]);
            }
        }
        
        // メモリを解放
        this.module._free(blocksDataPtr);
        this.module._free(hitIndicesPtr);
        
        return hitIndices;
    }
}

// 使用例をbreakout.jsに統合するためのコード
/*
// ゲーム開始時に初期化
const wasmCollision = new WASMCollisionDetector();
await wasmCollision.init();

// 衝突判定で使用
if (wasmCollision.ready) {
    const hitIndices = wasmCollision.checkBlockCollisions(this.ball, this.blocks);
    // 衝突したブロックを処理
    hitIndices.forEach(index => {
        const block = this.blocks[index];
        // ブロック破壊処理
    });
}
*/