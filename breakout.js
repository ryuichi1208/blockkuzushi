// ゲーム状態の定義
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    GAME_CLEAR: 'game_clear'
};

// ゲームオブジェクトの基底クラス
class GameObject {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    // 衝突判定
    intersects(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }
}

// ボールクラス
class Ball extends GameObject {
    constructor(x, y, radius) {
        super(x - radius, y - radius, radius * 2, radius * 2);
        this.radius = radius;
        this.vx = 0;
        this.vy = 0;
        this.trail = []; // 軌跡用
        this.rotation = 0;
    }

    update(dt) {
        // 軌跡の更新
        this.trail.push({
            x: this.getCenterX(),
            y: this.getCenterY(),
            life: 1.0
        });
        
        // 古い軌跡をフェードアウト
        this.trail = this.trail.filter(point => {
            point.life -= dt * 4;
            return point.life > 0;
        });
        
        // 最大20ポイントまで
        if (this.trail.length > 20) {
            this.trail.shift();
        }
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // 回転（速度に応じて）
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.rotation += (speed / 100) * dt;
    }

    draw(ctx) {
        const centerX = this.getCenterX();
        const centerY = this.getCenterY();
        
        // 軌跡の描画
        ctx.save();
        this.trail.forEach((point, index) => {
            if (index === 0) return;
            
            const prevPoint = this.trail[index - 1];
            const gradient = ctx.createLinearGradient(prevPoint.x, prevPoint.y, point.x, point.y);
            gradient.addColorStop(0, `rgba(0, 255, 255, ${prevPoint.life * 0.3})`);
            gradient.addColorStop(1, `rgba(0, 255, 255, ${point.life * 0.3})`);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.radius * point.life;
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        });
        ctx.restore();
        
        // プラズマボール本体
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        
        // 外側のグロー
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        glowGradient.addColorStop(0.3, 'rgba(0, 255, 255, 0.5)');
        glowGradient.addColorStop(0.6, 'rgba(0, 100, 255, 0.3)');
        glowGradient.addColorStop(1, 'rgba(0, 50, 255, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // コア
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.5, '#00ffff');
        coreGradient.addColorStop(1, '#0080ff');
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 内部のエネルギー波
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        
        // 光の粒子
        for (let i = 0; i < 3; i++) {
            const angle = this.rotation * 2 + (i * Math.PI * 2 / 3);
            const x = Math.cos(angle) * this.radius * 0.5;
            const y = Math.sin(angle) * this.radius * 0.5;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    getCenterX() {
        return this.x + this.radius;
    }

    getCenterY() {
        return this.y + this.radius;
    }
}

// パドルクラス
class Paddle extends GameObject {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.speed = 500;
    }

    moveLeft(dt, minX) {
        this.x = Math.max(minX, this.x - this.speed * dt);
    }

    moveRight(dt, maxX) {
        this.x = Math.min(maxX - this.width, this.x + this.speed * dt);
    }

    moveTo(x) {
        this.x = x - this.width / 2;
    }

    draw(ctx) {
        // メタリックグラデーション
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.2, '#e8e8e8');
        gradient.addColorStop(0.5, '#d0d0d0');
        gradient.addColorStop(0.8, '#b8b8b8');
        gradient.addColorStop(1, '#a0a0a0');
        
        // メインパドル
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // メタリックハイライト
        const highlightGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height * 0.4);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        ctx.fillStyle = highlightGradient;
        ctx.fillRect(this.x + 2, this.y + 1, this.width - 4, this.height * 0.3);
        
        // エネルギーラインの発光効果
        const energyGradient = ctx.createLinearGradient(this.x, this.y + this.height/2 - 2, this.x + this.width, this.y + this.height/2 - 2);
        energyGradient.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
        energyGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.8)');
        energyGradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
        
        // グロー効果
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';
        ctx.fillStyle = energyGradient;
        ctx.fillRect(this.x, this.y + this.height/2 - 2, this.width, 4);
        
        // エッジのハイライト
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // コーナーの装飾
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x - 2, this.y, 4, this.height);
        ctx.fillRect(this.x + this.width - 2, this.y, 4, this.height);
    }
}

// ブロッククラス
class Block extends GameObject {
    constructor(x, y, width, height, color, points) {
        super(x, y, width, height);
        this.color = color;
        this.points = points;
        this.hits = 1;
    }

    hit() {
        this.hits--;
        return this.hits <= 0;
    }

    draw(ctx) {
        // グラデーション効果
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        const baseColor = this.color;
        gradient.addColorStop(0, this.lightenColor(baseColor, 40));
        gradient.addColorStop(0.5, baseColor);
        gradient.addColorStop(1, this.darkenColor(baseColor, 30));
        
        // メインブロック
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 3D効果 - ハイライト
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(this.x, this.y, this.width, 2);
        ctx.fillRect(this.x, this.y, 2, this.height);
        
        // 3D効果 - シャドウ
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(this.x, this.y + this.height - 2, this.width, 2);
        ctx.fillRect(this.x + this.width - 2, this.y, 2, this.height);
        
        // 光沢効果
        const glossGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height * 0.5);
        glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        ctx.fillStyle = glossGradient;
        ctx.fillRect(this.x + 4, this.y + 2, this.width - 8, this.height * 0.3);
        
        // ネオン風の輪郭
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.lightenColor(baseColor, 20);
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
    
    // 色を明るくする
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    // 色を暗くする
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R > 0 ? R : 0) * 0x10000 +
            (G > 0 ? G : 0) * 0x100 +
            (B > 0 ? B : 0)).toString(16).slice(1);
    }
}

// メインのゲームクラス
class BreakoutGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 花火用キャンバス
        this.fireworksCanvas = document.getElementById('fireworksCanvas');
        this.fireworksCtx = this.fireworksCanvas.getContext('2d');
        
        this.state = GameState.MENU;
        this.score = 0;
        this.lives = 3;
        this.level = 1; // デフォルトレベル
        this.selectedLevel = 1; // 選択されたレベル
        
        // ゲームオブジェクト
        this.paddle = null;
        this.ball = null;
        this.blocks = [];
        
        // WebAssembly衝突判定
        this.wasmCollision = null;
        
        // WebGLレンダラー
        this.webglRenderer = null;
        this.useWebGL = false;
        
        // Canvas2D花火システム
        this.canvas2DFireworks = [];
        this.nextFireworkTime = 0;
        
        // 入力状態
        this.keys = {};
        this.mouseX = 0;
        
        // 背景画像
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'img/test.png';
        this.backgroundLoaded = false;
        this.backgroundImage.onload = () => {
            this.backgroundLoaded = true;
        };
        
        // タイトル画像
        this.titleImage = new Image();
        this.titleImage.src = 'img/title.png';
        this.titleImageLoaded = false;
        this.titleImage.onload = () => {
            this.titleImageLoaded = true;
        };
        
        // AudioContextを一度だけ作成して再利用
        this.audioContext = null;
        
        // モバイルデバイスかどうかを判定
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                        ('ontouchstart' in window);
        
        // サウンドエフェクト
        this.sounds = {
            blockHit: () => this.playSound(440, 0.1),  // A4音
            paddleHit: () => this.playSound(330, 0.1), // E4音
            gameOver: () => this.playSound(110, 0.5),  // A2音
            levelClear: () => this.playSound(880, 0.3) // A5音
        };
        
        // UI要素
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.levelElement = document.getElementById('level');
        this.messageElement = document.getElementById('gameMessage');
        this.levelSelectorElement = document.getElementById('levelSelector');
        
        // イベントリスナーの設定
        this.setupEventListeners();
        this.setupLevelButtons();
        
        // WebAssemblyモジュールの初期化
        this.initWASM();
        
        // WebGLレンダラーの初期化
        this.initWebGL();
        
        // ゲームループの開始
        this.lastTime = 0;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        
        // 初期メッセージを表示
        this.showMessage(this.isMobile ? 'タップでゲーム開始' : 'スペースキーでゲーム開始');
    }
    
    // WebAssemblyモジュールの初期化
    async initWASM() {
        try {
            // ローカルファイルプロトコルの場合はWASMを無効化
            if (window.location.protocol === 'file:') {
                console.log('ローカルファイルのため、WebAssemblyを無効化します');
                console.log('HTTPサーバーで実行するとWebAssemblyが有効になります');
                return;
            }
            
            if (typeof WASMCollisionDetector !== 'undefined') {
                this.wasmCollision = new WASMCollisionDetector();
                await this.wasmCollision.init();
                console.log('WebAssembly衝突判定を有効化しました');
            }
        } catch (error) {
            console.warn('WebAssembly初期化エラー:', error);
            console.log('JavaScript衝突判定を使用します');
        }
    }
    
    // WebGLレンダラーの初期化
    initWebGL() {
        try {
            // WebGLサポートの確認
            const webglSupported = this.checkWebGLSupport();
            if (!webglSupported) {
                console.log('WebGLがこのブラウザでサポートされていません。Canvas2Dを使用します');
                return;
            }
            
            if (typeof WebGLRenderer !== 'undefined') {
                this.webglRenderer = new WebGLRenderer(this.canvas);
                if (this.webglRenderer.init()) {
                    this.useWebGL = true;
                    // パーティクルシステムの初期化
                    this.webglRenderer.particleSystem = new ParticleSystem(this.webglRenderer);
                    // 花火システムの初期化
                    this.webglRenderer.fireworksSystem = new FireworksSystem(this.webglRenderer);
                    console.log('WebGLレンダラーを有効化しました');
                    console.log('花火システムを有効化しました');
                } else {
                    console.log('WebGL初期化に失敗しました。Canvas2Dを使用します');
                    this.useWebGL = false;
                }
            }
        } catch (error) {
            console.warn('WebGL初期化エラー:', error);
            console.log('Canvas2Dレンダラーを使用します');
            this.useWebGL = false;
        }
    }
    
    // WebGLサポートの確認
    checkWebGLSupport() {
        try {
            const testCanvas = document.createElement('canvas');
            const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    // Web Audio APIを使用したシンプルな音生成（AudioContextを再利用）
    playSound(frequency, duration) {
        try {
            // AudioContextを初回のみ作成
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            // 音が鳴らせない場合は無視
            console.warn('Audio playback failed:', e);
        }
    }

    setupEventListeners() {
        // キーボードイベント
        window.addEventListener('keydown', (e) => {
            // 矢印キーとスペースキーのデフォルト動作を防ぐ
            if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            this.keys[e.key] = true;
            this.handleKeyPress(e.key);
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // マウスイベント
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
        });
        
        // タッチイベント
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            
            // メニュー画面でのみタップでゲーム開始（ゲーム中は一時停止しない）
            if (this.state === GameState.MENU) {
                this.startGame();
            } else if (this.state === GameState.PAUSED) {
                this.state = GameState.PLAYING;
                this.hideMessage();
            } else if (this.state === GameState.GAME_OVER) {
                this.resetGame();
            } else if (this.state === GameState.GAME_CLEAR) {
                this.nextLevel();
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
        });
    }

    setupLevelButtons() {
        const levelButtons = document.querySelectorAll('.level-btn');
        levelButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                if (this.state === GameState.MENU) {
                    // 現在のアクティブボタンを解除
                    document.querySelector('.level-btn.active').classList.remove('active');
                    // 新しいボタンをアクティブに
                    button.classList.add('active');
                    // レベルを設定
                    this.selectedLevel = parseInt(button.dataset.level);
                    this.level = this.selectedLevel;
                    this.updateUI();
                    // 効果音を鳴らす
                    this.playSound(550, 0.1);
                }
            });
        });
    }

    handleKeyPress(key) {
        if (key === ' ') {
            if (this.state === GameState.MENU) {
                this.startGame();
            } else if (this.state === GameState.PLAYING) {
                this.state = GameState.PAUSED;
                this.showMessage('一時停止中');
            } else if (this.state === GameState.PAUSED) {
                this.state = GameState.PLAYING;
                this.hideMessage();
            } else if (this.state === GameState.GAME_OVER) {
                this.resetGame();
            } else if (this.state === GameState.GAME_CLEAR) {
                this.nextLevel();
            }
        } else if (key === 'r' || key === 'R') {
            this.resetGame();
        }
    }

    initGameObjects() {
        // パドルの初期化（モバイルではさらに幅を広げる）
        const paddleWidth = this.isMobile ? 150 : 120;
        const paddleHeight = this.isMobile ? 15 : 10;
        this.paddle = new Paddle(
            this.canvas.width / 2 - paddleWidth / 2,
            this.canvas.height - 50,
            paddleWidth,
            paddleHeight
        );
        
        // レベルに応じたボール速度の設定
        this.ball = new Ball(
            this.canvas.width / 2,
            this.paddle.y - 20,
            8
        );
        const baseSpeed = 300 + (this.selectedLevel - 1) * 80;  // レベル1: 300, レベル2: 380, レベル3: 460
        this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * baseSpeed;
        this.ball.vy = -(baseSpeed + 150);
        
        // レベルに応じたブロックの初期化
        this.blocks = [];
        
        // レベルごとのブロック設定
        let blockWidth, blockHeight, blockRows, blockCols;
        const blockPadding = 1;
        const offsetTop = 10;
        const paddleTop = this.paddle.y;  // パドルの上端位置
        const safeMargin = 80;  // パドルからの安全マージン
        
        switch(this.selectedLevel) {
            case 1: // かんたん
                blockWidth = 100;  // さらに大きく
                blockHeight = 40;
                blockCols = Math.floor((this.canvas.width - 40) / (blockWidth + blockPadding));
                blockRows = Math.floor((paddleTop - offsetTop - safeMargin) / (blockHeight + blockPadding));
                break;
            case 2: // ふつう
                blockWidth = 60;
                blockHeight = 24;
                blockCols = Math.floor((this.canvas.width - 20) / (blockWidth + blockPadding));
                blockRows = Math.floor((paddleTop - offsetTop - safeMargin) / (blockHeight + blockPadding));
                break;
            case 3: // むずかしい
                blockWidth = 40;
                blockHeight = 16;
                blockCols = Math.floor(this.canvas.width / (blockWidth + blockPadding));
                blockRows = Math.floor((paddleTop - offsetTop - safeMargin) / (blockHeight + blockPadding));
                break;
        }
        
        const offsetLeft = (this.canvas.width - (blockCols * (blockWidth + blockPadding))) / 2;
        
        const colors = ['#ff6b6b', '#f06292', '#ba68c8', '#7986cb', '#64b5f6', 
                       '#4fc3f7', '#4dd0e1', '#4db6ac', '#81c784', '#aed581'];
        const points = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
        
        for (let r = 0; r < blockRows; r++) {
            for (let c = 0; c < blockCols; c++) {
                const x = offsetLeft + c * (blockWidth + blockPadding);
                const y = offsetTop + r * (blockHeight + blockPadding);
                this.blocks.push(new Block(x, y, blockWidth, blockHeight, colors[r % colors.length], points[r % 10]));
            }
        }
        
        // 最初の全ブロック数を記憶
        this.totalBlocks = this.blocks.length;
    }

    startGame() {
        this.level = this.selectedLevel;
        this.initGameObjects();
        this.state = GameState.PLAYING;
        this.hideMessage();
        this.hideLevelSelector();
    }

    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = this.selectedLevel;
        this.updateUI();
        this.state = GameState.MENU;
        this.showMessage(this.isMobile ? 'タップでゲーム開始' : 'スペースキーでゲーム開始');
        this.showLevelSelector();
    }

    nextLevel() {
        if (this.level >= 3) {
            // 最終レベルクリア後はリセット
            this.resetGame();
        } else {
            this.level++;
            this.initGameObjects();
            this.state = GameState.PLAYING;
            this.hideMessage();
        }
    }

    updateBall(dt) {
        if (!this.ball) return;
        
        this.ball.update(dt);
        
        // 壁との衝突判定
        if (this.ball.x <= 0 || this.ball.x + this.ball.width >= this.canvas.width) {
            this.ball.vx = -this.ball.vx;
            this.ball.x = Math.max(0, Math.min(this.canvas.width - this.ball.width, this.ball.x));
        }
        
        if (this.ball.y <= 0) {
            this.ball.vy = Math.abs(this.ball.vy);
        }
        
        // 下に落ちた場合
        if (this.ball.y > this.canvas.height) {
            this.lives--;
            this.updateUI();
            
            if (this.lives <= 0) {
                this.state = GameState.GAME_OVER;
                this.showMessage(this.isMobile ? 'ゲームオーバー<br>タップでリトライ' : 'ゲームオーバー<br>スペースキーでリトライ');
                this.sounds.gameOver();
            } else {
                // ボールをリセット（レベルに応じた速度）
                this.ball.x = this.paddle.x + this.paddle.width / 2 - this.ball.radius;
                this.ball.y = this.paddle.y - this.ball.height - 5;
                const baseSpeed = 300 + (this.selectedLevel - 1) * 80;
                this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * baseSpeed;
                this.ball.vy = -(baseSpeed + 150);
                this.state = GameState.PAUSED;
                this.showMessage(this.isMobile ? 'ボールを失いました<br>タップで続行' : 'ボールを失いました<br>スペースキーで続行');
            }
        }
        
        // パドルとの衝突判定
        if (this.ball.intersects(this.paddle) && this.ball.vy > 0) {
            this.ball.vy = -Math.abs(this.ball.vy);
            
            // パドルの当たった位置によって反射角度を変える
            const hitPos = (this.ball.getCenterX() - this.paddle.x) / this.paddle.width;
            this.ball.vx = (hitPos - 0.5) * 600;
            
            // パドルに当たった時の効果音
            this.sounds.paddleHit();
        }
        
        // ブロックとの衝突判定
        if (this.wasmCollision && this.wasmCollision.ready) {
            // WebAssemblyを使用した高速な衝突判定
            const hitIndices = this.wasmCollision.checkBlockCollisions(this.ball, this.blocks);
            
            if (hitIndices.length > 0) {
                // 最初に衝突したブロックを処理
                const index = hitIndices[0];
                const block = this.blocks[index];
                
                if (block.hit()) {
                    this.blocks.splice(index, 1);
                    this.score += block.points;
                    this.updateUI();
                    this.sounds.blockHit();
                    
                    // WebGLパーティクルエフェクト
                    if (this.useWebGL && this.webglRenderer.particleSystem) {
                        const hexColor = parseInt(block.color.replace('#', ''), 16);
                        const r = ((hexColor >> 16) & 255) / 255;
                        const g = ((hexColor >> 8) & 255) / 255;
                        const b = (hexColor & 255) / 255;
                        this.webglRenderer.particleSystem.emit(
                            block.x + block.width / 2,
                            block.y + block.height / 2,
                            [r, g, b],
                            15
                        );
                    }
                }
                
                // 反射方向の決定
                const ballCenterX = this.ball.getCenterX();
                const ballCenterY = this.ball.getCenterY();
                const blockCenterX = block.x + block.width / 2;
                const blockCenterY = block.y + block.height / 2;
                
                if (Math.abs(ballCenterX - blockCenterX) > Math.abs(ballCenterY - blockCenterY)) {
                    this.ball.vx = -this.ball.vx;
                } else {
                    this.ball.vy = -this.ball.vy;
                }
            }
        } else {
            // JavaScript版のフォールバック
            for (let i = this.blocks.length - 1; i >= 0; i--) {
                const block = this.blocks[i];
                if (this.ball.intersects(block)) {
                    if (block.hit()) {
                        this.blocks.splice(i, 1);
                        this.score += block.points;
                        this.updateUI();
                        
                        // ブロックが消えた時の効果音
                        this.sounds.blockHit();
                    }
                    
                    // 反射方向の決定
                    const ballCenterX = this.ball.getCenterX();
                    const ballCenterY = this.ball.getCenterY();
                    const blockCenterX = block.x + block.width / 2;
                    const blockCenterY = block.y + block.height / 2;
                    
                    if (Math.abs(ballCenterX - blockCenterX) > Math.abs(ballCenterY - blockCenterY)) {
                        this.ball.vx = -this.ball.vx;
                    } else {
                        this.ball.vy = -this.ball.vy;
                    }
                    
                    break;
                }
            }
        }
        
        // 全ブロック破壊チェック
        if (this.blocks.length === 0) {
            this.state = GameState.GAME_CLEAR;
            
            // 花火のグランドフィナーレを発動
            if (this.useWebGL && this.webglRenderer.fireworksSystem) {
                this.webglRenderer.fireworksSystem.createGrandFinale(this.level === 3 ? 3.0 : 1.5);
            } else {
                // Canvas2Dのグランドフィナーレ
                this.createCanvas2DGrandFinale();
            }
            
            // レベル3（最終レベル）クリア時は特別なメッセージ
            if (this.level === 3) {
                this.showMessage(this.isMobile ? 
                    '🎉 おめでとう！🎉<br>全レベルクリア！<br>スコア: ' + this.score + '<br>タップでもう一度' : 
                    '🎉 おめでとう！🎉<br>全レベルクリア！<br>スコア: ' + this.score + '<br>スペースキーでもう一度');
            } else {
                this.showMessage(this.isMobile ? 
                    '✨ おめでとう！✨<br>レベル' + this.level + 'クリア！<br>タップで次のレベルへ' : 
                    '✨ おめでとう！✨<br>レベル' + this.level + 'クリア！<br>スペースキーで次のレベルへ');
            }
            this.sounds.levelClear();
        }
    }

    updatePaddle(dt) {
        if (!this.paddle) return;
        
        // キーボード操作
        if (this.keys['ArrowLeft']) {
            this.paddle.moveLeft(dt, 0);
        }
        if (this.keys['ArrowRight']) {
            this.paddle.moveRight(dt, this.canvas.width);
        }
        
        // マウス操作
        if (this.mouseX > 0) {
            this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, 
                                                  this.mouseX - this.paddle.width / 2));
        }
    }

    update(dt) {
        // ゲームタイムの更新（常に更新）
        this.gameTime = (this.gameTime || 0) + dt;
        
        // 花火システムの更新（常に更新）
        if (this.useWebGL && this.webglRenderer.fireworksSystem) {
            this.webglRenderer.fireworksSystem.update(dt, this.gameTime);
        } else {
            // Canvas2D花火の更新
            this.updateCanvas2DFireworks(dt);
        }
        
        if (this.state === GameState.PLAYING) {
            this.updatePaddle(dt);
            this.updateBall(dt);
            
            // WebGLパーティクルシステムの更新
            if (this.useWebGL && this.webglRenderer.particleSystem) {
                this.webglRenderer.particleSystem.update(dt);
            }
        }
    }

    draw() {
        // 花火の描画（常に実行）
        if (!this.useWebGL) {
            this.drawCanvas2DFireworks();
        }
        
        if (this.useWebGL) {
            this.drawWebGL();
        } else {
            this.drawCanvas2D();
        }
    }
    
    drawCanvas2D() {
        // 背景をクリア
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景画像を描画（ブロックが1つでも壊れたら表示）
        if (this.backgroundLoaded && this.totalBlocks && this.blocks.length < this.totalBlocks) {
            this.ctx.globalAlpha = 0.7;
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalAlpha = 1.0;
        }
        
        // メニュー画面でタイトル画像を描画（ブロックの下に）
        if (this.state === GameState.MENU && this.titleImageLoaded) {
            // タイトル画像をCanvasの中央に描画
            const imgWidth = Math.min(600, this.canvas.width * 0.8);
            const imgHeight = (this.titleImage.height / this.titleImage.width) * imgWidth;
            const imgX = (this.canvas.width - imgWidth) / 2;
            const imgY = (this.canvas.height - imgHeight) / 2 - 50;
            
            this.ctx.globalAlpha = 0.8;
            this.ctx.drawImage(this.titleImage, imgX, imgY, imgWidth, imgHeight);
            this.ctx.globalAlpha = 1.0;
        }
        
        // ブロックの描画（不透明）- タイトル画像の上に描画される
        this.blocks.forEach(block => {
            block.draw(this.ctx);
        });
        
        // ゲームオブジェクトの描画
        if (this.paddle) {
            this.paddle.draw(this.ctx);
        }
        
        if (this.ball) {
            this.ball.draw(this.ctx);
        }
    }
    
    drawWebGL() {
        const gl = this.webglRenderer;
        
        // クリア
        gl.clear();
        
        // 花火の描画（背景として最初に描画）
        if (gl.fireworksSystem) {
            gl.fireworksSystem.draw();
        }
        
        // ブロックの描画
        this.blocks.forEach(block => {
            const hexColor = parseInt(block.color.replace('#', ''), 16);
            const r = ((hexColor >> 16) & 255) / 255;
            const g = ((hexColor >> 8) & 255) / 255;
            const b = (hexColor & 255) / 255;
            
            gl.drawRect(block.x, block.y, block.width, block.height, [r, g, b, 1.0]);
        });
        
        // パドルの描画
        if (this.paddle) {
            gl.drawRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, [1.0, 1.0, 1.0, 1.0]);
        }
        
        // ボールの描画
        if (this.ball) {
            gl.drawCircle(this.ball.x, this.ball.y, this.ball.radius, [1.0, 1.0, 1.0, 1.0]);
        }
        
        // パーティクルの描画
        if (gl.particleSystem) {
            gl.particleSystem.draw();
        }
    }

    updateUI() {
        this.scoreElement.textContent = this.score;
        this.livesElement.textContent = this.lives;
        this.levelElement.textContent = this.level;
    }

    showMessage(text) {
        this.messageElement.innerHTML = `<p>${text}</p>`;
        this.messageElement.classList.remove('hidden');
    }

    hideMessage() {
        this.messageElement.classList.add('hidden');
    }

    hideLevelSelector() {
        this.levelSelectorElement.classList.add('hidden');
    }

    showLevelSelector() {
        this.levelSelectorElement.classList.remove('hidden');
    }

    animate(currentTime) {
        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        
        this.update(dt);
        this.draw();
        
        requestAnimationFrame(this.animate);
    }
    
    // Canvas2D花火システム
    launchCanvas2DFirework() {
        const x = Math.random() * this.fireworksCanvas.width;
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        this.canvas2DFireworks.push({
            x: x,
            y: this.fireworksCanvas.height,
            vx: (Math.random() - 0.5) * 200, // 横方向の動きを増やす
            vy: -600 - Math.random() * 300, // より高く打ち上げる
            color: color,
            exploded: false,
            particles: [],
            trail: []
        });
    }
    
    updateCanvas2DFireworks(dt) {
        // 新しい花火の発射（より頻繁に、複数同時発射）
        if (this.gameTime > this.nextFireworkTime) {
            // 1〜3発同時に発射
            const count = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                this.launchCanvas2DFirework();
            }
            this.nextFireworkTime = this.gameTime + 0.5 + Math.random() * 1.5; // 0.5〜2秒ごと
        }
        
        // 花火の更新
        for (let i = this.canvas2DFireworks.length - 1; i >= 0; i--) {
            const firework = this.canvas2DFireworks[i];
            
            if (!firework.exploded) {
                // 軌跡を追加
                firework.trail.push({
                    x: firework.x,
                    y: firework.y,
                    life: 1.0
                });
                
                if (firework.trail.length > 10) {
                    firework.trail.shift();
                }
                
                // 軌跡のフェード
                firework.trail.forEach(point => {
                    point.life -= dt * 3;
                });
                
                // 移動
                firework.x += firework.vx * dt;
                firework.y += firework.vy * dt;
                firework.vy += 200 * dt; // 重力
                
                // 爆発条件（より高い位置で爆発）
                if (firework.y <= 150 + Math.random() * 300 || firework.vy > 0) {
                    // 爆発！
                    firework.exploded = true;
                    const particleCount = 50 + Math.floor(Math.random() * 50); // より多くのパーティクル
                    
                    for (let j = 0; j < particleCount; j++) {
                        const angle = (Math.PI * 2 * j) / particleCount + Math.random() * 0.5;
                        const speed = 100 + Math.random() * 200;
                        
                        firework.particles.push({
                            x: firework.x,
                            y: firework.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            life: 1.0,
                            color: firework.color
                        });
                    }
                }
            } else {
                // パーティクルの更新
                let allDead = true;
                
                for (let j = firework.particles.length - 1; j >= 0; j--) {
                    const particle = firework.particles[j];
                    
                    particle.x += particle.vx * dt;
                    particle.y += particle.vy * dt;
                    particle.vy += 300 * dt; // 重力
                    particle.vx *= 0.98; // 空気抵抗
                    particle.life -= dt * 0.8;
                    
                    if (particle.life > 0) {
                        allDead = false;
                    }
                }
                
                if (allDead) {
                    this.canvas2DFireworks.splice(i, 1);
                }
            }
        }
    }
    
    drawCanvas2DFireworks() {
        // 花火キャンバスをクリア
        this.fireworksCtx.clearRect(0, 0, this.fireworksCanvas.width, this.fireworksCanvas.height);
        
        this.canvas2DFireworks.forEach(firework => {
            if (!firework.exploded) {
                // 軌跡の描画
                this.fireworksCtx.save();
                firework.trail.forEach((point, index) => {
                    if (index > 0 && point.life > 0) {
                        this.fireworksCtx.globalAlpha = point.life * 0.5;
                        this.fireworksCtx.fillStyle = firework.color;
                        this.fireworksCtx.beginPath();
                        this.fireworksCtx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                        this.fireworksCtx.fill();
                    }
                });
                this.fireworksCtx.restore();
                
                // 花火本体
                this.fireworksCtx.save();
                this.fireworksCtx.shadowBlur = 10;
                this.fireworksCtx.shadowColor = firework.color;
                this.fireworksCtx.fillStyle = '#ffffff';
                this.fireworksCtx.beginPath();
                this.fireworksCtx.arc(firework.x, firework.y, 4, 0, Math.PI * 2);
                this.fireworksCtx.fill();
                this.fireworksCtx.restore();
            } else {
                // パーティクルの描画
                firework.particles.forEach(particle => {
                    if (particle.life > 0) {
                        this.fireworksCtx.save();
                        this.fireworksCtx.globalAlpha = particle.life;
                        this.fireworksCtx.shadowBlur = 5;
                        this.fireworksCtx.shadowColor = particle.color;
                        this.fireworksCtx.fillStyle = particle.color;
                        this.fireworksCtx.beginPath();
                        this.fireworksCtx.arc(particle.x, particle.y, 2 + particle.life * 2, 0, Math.PI * 2);
                        this.fireworksCtx.fill();
                        this.fireworksCtx.restore();
                    }
                });
            }
        });
    }
    
    // Canvas2Dグランドフィナーレ
    createCanvas2DGrandFinale() {
        // 即座に大量の花火を打ち上げる
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                for (let j = 0; j < 5; j++) {
                    this.launchCanvas2DFirework();
                }
            }, i * 200);
        }
    }
}

// ゲームの開始
window.addEventListener('DOMContentLoaded', () => {
    new BreakoutGame();
});