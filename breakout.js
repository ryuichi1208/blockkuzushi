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
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw(ctx) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
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
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // ブロックの縁を描画
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// メインのゲームクラス
class BreakoutGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = GameState.MENU;
        this.score = 0;
        this.lives = 3;
        this.level = 3; // デフォルトレベル
        this.selectedLevel = 3; // 選択されたレベル
        
        // ゲームオブジェクト
        this.paddle = null;
        this.ball = null;
        this.blocks = [];
        
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
        
        // ゲームループの開始
        this.lastTime = 0;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
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
        // パドルの初期化（幅を広げる）
        const paddleWidth = 120;
        const paddleHeight = 10;
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
        const baseSpeed = 200 + (this.selectedLevel - 1) * 50; // レベル1: 200, レベル5: 400
        this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * baseSpeed;
        this.ball.vy = -(baseSpeed + 100);
        
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
                blockWidth = 60;
                blockHeight = 24;
                blockCols = Math.floor((this.canvas.width - 20) / (blockWidth + blockPadding));
                blockRows = Math.floor((paddleTop - offsetTop - safeMargin) / (blockHeight + blockPadding));
                break;
            case 2: // ふつう
                blockWidth = 45;
                blockHeight = 18;
                blockCols = Math.floor((this.canvas.width - 20) / (blockWidth + blockPadding));
                blockRows = Math.floor((paddleTop - offsetTop - safeMargin) / (blockHeight + blockPadding));
                break;
            case 3: // 標準
                blockWidth = 30;
                blockHeight = 12;
                blockCols = Math.floor(this.canvas.width / (blockWidth + blockPadding));
                blockRows = Math.floor((paddleTop - offsetTop - safeMargin) / (blockHeight + blockPadding));
                break;
            case 4: // むずかしい
                blockWidth = 25;
                blockHeight = 10;
                blockCols = Math.floor(this.canvas.width / (blockWidth + blockPadding));
                blockRows = Math.floor((paddleTop - offsetTop - safeMargin) / (blockHeight + blockPadding));
                break;
            case 5: // 超むずかしい
                blockWidth = 20;
                blockHeight = 8;
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
        this.showMessage('スペースキーでゲーム開始');
        this.showLevelSelector();
    }

    nextLevel() {
        this.level++;
        this.initGameObjects();
        this.state = GameState.PLAYING;
        this.hideMessage();
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
                this.showMessage('ゲームオーバー<br>スペースキーでリトライ');
                this.sounds.gameOver();
            } else {
                // ボールをリセット（レベルに応じた速度）
                this.ball.x = this.paddle.x + this.paddle.width / 2 - this.ball.radius;
                this.ball.y = this.paddle.y - this.ball.height - 5;
                const baseSpeed = 200 + (this.selectedLevel - 1) * 50;
                this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * baseSpeed;
                this.ball.vy = -(baseSpeed + 100);
                this.state = GameState.PAUSED;
                this.showMessage('ボールを失いました<br>スペースキーで続行');
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
        
        // 全ブロック破壊チェック
        if (this.blocks.length === 0) {
            this.state = GameState.GAME_CLEAR;
            this.showMessage('レベルクリア！<br>スペースキーで次のレベルへ');
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
        if (this.state === GameState.PLAYING) {
            this.updatePaddle(dt);
            this.updateBall(dt);
        }
    }

    draw() {
        // 背景をクリア
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景画像を描画（ブロックが1つでも壊れたら表示）
        if (this.backgroundLoaded && this.totalBlocks && this.blocks.length < this.totalBlocks) {
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
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
}

// ゲームの開始
window.addEventListener('DOMContentLoaded', () => {
    new BreakoutGame();
});