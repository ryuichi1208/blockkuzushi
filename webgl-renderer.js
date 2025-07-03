// webgl-renderer.js - WebGLレンダラー

class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.shaderProgram = null;
        this.buffers = {};
        this.textures = {};
        this.particleSystem = null;
        
        // 行列演算用
        this.projectionMatrix = new Float32Array(16);
        this.modelViewMatrix = new Float32Array(16);
    }

    // WebGLコンテキストの初期化
    init() {
        try {
            // WebGLコンテキストの取得を試みる
            const contextOptions = {
                alpha: false,
                antialias: true,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false
            };
            
            this.gl = this.canvas.getContext('webgl', contextOptions) || 
                      this.canvas.getContext('experimental-webgl', contextOptions);
            
            if (!this.gl) {
                console.warn('WebGL not available in this browser');
                return false;
            }

            console.log('WebGL context created successfully');

            // 基本設定
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

            // シェーダーの初期化
            this.initShaders();
            
            // バッファの初期化
            this.initBuffers();
            
            // 投影行列の設定
            this.setProjectionMatrix();

            console.log('WebGL initialization completed');
            return true;
        } catch (error) {
            console.error('WebGL initialization failed:', error);
            return false;
        }
    }

    // 頂点シェーダー
    getVertexShaderSource() {
        return `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            attribute vec4 a_color;
            
            uniform mat4 u_projectionMatrix;
            uniform mat4 u_modelViewMatrix;
            
            varying vec2 v_texCoord;
            varying vec4 v_color;
            
            void main() {
                gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
                v_color = a_color;
            }
        `;
    }

    // フラグメントシェーダー
    getFragmentShaderSource() {
        return `
            precision mediump float;
            
            uniform sampler2D u_texture;
            uniform bool u_useTexture;
            
            varying vec2 v_texCoord;
            varying vec4 v_color;
            
            void main() {
                if (u_useTexture) {
                    gl_FragColor = texture2D(u_texture, v_texCoord) * v_color;
                } else {
                    gl_FragColor = v_color;
                }
                
                // グロー効果を追加
                float glow = 0.1 * (1.0 - length(v_texCoord - 0.5) * 2.0);
                gl_FragColor.rgb += vec3(glow);
            }
        `;
    }

    // シェーダーのコンパイル
    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    // シェーダープログラムの初期化
    initShaders() {
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, this.getVertexShaderSource());
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, this.getFragmentShaderSource());

        this.shaderProgram = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgram, vertexShader);
        this.gl.attachShader(this.shaderProgram, fragmentShader);
        this.gl.linkProgram(this.shaderProgram);

        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
            console.error('Shader program linking error:', this.gl.getProgramInfoLog(this.shaderProgram));
            return;
        }

        this.gl.useProgram(this.shaderProgram);

        // 属性の位置を取得
        this.shaderProgram.a_position = this.gl.getAttribLocation(this.shaderProgram, 'a_position');
        this.shaderProgram.a_texCoord = this.gl.getAttribLocation(this.shaderProgram, 'a_texCoord');
        this.shaderProgram.a_color = this.gl.getAttribLocation(this.shaderProgram, 'a_color');

        // ユニフォームの位置を取得
        this.shaderProgram.u_projectionMatrix = this.gl.getUniformLocation(this.shaderProgram, 'u_projectionMatrix');
        this.shaderProgram.u_modelViewMatrix = this.gl.getUniformLocation(this.shaderProgram, 'u_modelViewMatrix');
        this.shaderProgram.u_texture = this.gl.getUniformLocation(this.shaderProgram, 'u_texture');
        this.shaderProgram.u_useTexture = this.gl.getUniformLocation(this.shaderProgram, 'u_useTexture');
    }

    // バッファの初期化
    initBuffers() {
        // 矩形用の頂点バッファ
        this.buffers.rectVertices = this.gl.createBuffer();
        this.buffers.rectTexCoords = this.gl.createBuffer();
        this.buffers.rectColors = this.gl.createBuffer();
        
        // 基本的な矩形の頂点データ
        const vertices = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1
        ]);
        
        const texCoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1
        ]);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.rectVertices);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.rectTexCoords);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
    }

    // 投影行列の設定
    setProjectionMatrix() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 正射影行列を作成（2D用）
        this.projectionMatrix[0] = 2 / width;
        this.projectionMatrix[5] = -2 / height;
        this.projectionMatrix[10] = -1;
        this.projectionMatrix[12] = -1;
        this.projectionMatrix[13] = 1;
        this.projectionMatrix[15] = 1;
        
        this.gl.uniformMatrix4fv(this.shaderProgram.u_projectionMatrix, false, this.projectionMatrix);
    }

    // クリア
    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    // 矩形の描画
    drawRect(x, y, width, height, color) {
        // モデルビュー行列の設定
        this.setIdentityMatrix(this.modelViewMatrix);
        this.translateMatrix(this.modelViewMatrix, x, y);
        this.scaleMatrix(this.modelViewMatrix, width, height);
        
        this.gl.uniformMatrix4fv(this.shaderProgram.u_modelViewMatrix, false, this.modelViewMatrix);
        this.gl.uniform1i(this.shaderProgram.u_useTexture, 0);
        
        // 頂点データの設定
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.rectVertices);
        this.gl.enableVertexAttribArray(this.shaderProgram.a_position);
        this.gl.vertexAttribPointer(this.shaderProgram.a_position, 2, this.gl.FLOAT, false, 0, 0);
        
        // 色データの設定
        const colors = new Float32Array([
            color[0], color[1], color[2], color[3],
            color[0], color[1], color[2], color[3],
            color[0], color[1], color[2], color[3],
            color[0], color[1], color[2], color[3]
        ]);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.rectColors);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.shaderProgram.a_color);
        this.gl.vertexAttribPointer(this.shaderProgram.a_color, 4, this.gl.FLOAT, false, 0, 0);
        
        // 描画
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    // 円の描画（ボール用）
    drawCircle(x, y, radius, color) {
        const segments = 32;
        const vertices = [];
        const colors = [];
        
        // 中心点
        vertices.push(x + radius, y + radius);
        colors.push(...color);
        
        // 円周上の点
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            vertices.push(
                x + radius + Math.cos(angle) * radius,
                y + radius + Math.sin(angle) * radius
            );
            colors.push(...color);
        }
        
        // 頂点バッファに設定
        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.shaderProgram.a_position);
        this.gl.vertexAttribPointer(this.shaderProgram.a_position, 2, this.gl.FLOAT, false, 0, 0);
        
        // 色バッファに設定
        const colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.shaderProgram.a_color);
        this.gl.vertexAttribPointer(this.shaderProgram.a_color, 4, this.gl.FLOAT, false, 0, 0);
        
        // 単位行列を設定
        this.setIdentityMatrix(this.modelViewMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgram.u_modelViewMatrix, false, this.modelViewMatrix);
        this.gl.uniform1i(this.shaderProgram.u_useTexture, 0);
        
        // 描画
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, vertices.length / 2);
        
        // バッファの削除
        this.gl.deleteBuffer(vertexBuffer);
        this.gl.deleteBuffer(colorBuffer);
    }

    // 行列操作のヘルパー関数
    setIdentityMatrix(matrix) {
        for (let i = 0; i < 16; i++) {
            matrix[i] = i % 5 === 0 ? 1 : 0;
        }
    }

    translateMatrix(matrix, x, y) {
        matrix[12] += matrix[0] * x + matrix[4] * y;
        matrix[13] += matrix[1] * x + matrix[5] * y;
    }

    scaleMatrix(matrix, x, y) {
        matrix[0] *= x;
        matrix[1] *= x;
        matrix[4] *= y;
        matrix[5] *= y;
    }
}

// パーティクルシステム
class ParticleSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.particles = [];
    }

    emit(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 100 + Math.random() * 200;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                size: 3 + Math.random() * 3,
                color: [...color, 1.0]
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vy += 500 * dt; // 重力
            particle.life -= dt * 2;
            particle.color[3] = particle.life;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        this.particles.forEach(particle => {
            this.renderer.drawCircle(
                particle.x - particle.size / 2,
                particle.y - particle.size / 2,
                particle.size,
                particle.color
            );
        });
    }
}

// 花火システム
class FireworksSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.fireworks = [];
        this.explosions = [];
        this.nextFireworkTime = 0;
        this.colors = [
            [1.0, 0.3, 0.3],  // 赤
            [0.3, 1.0, 0.3],  // 緑
            [0.3, 0.3, 1.0],  // 青
            [1.0, 1.0, 0.3],  // 黄
            [1.0, 0.3, 1.0],  // マゼンタ
            [0.3, 1.0, 1.0],  // シアン
            [1.0, 0.6, 0.2],  // オレンジ
            [0.8, 0.4, 1.0],  // 紫
        ];
    }

    launchFirework(x = null, intensity = 1.0) {
        if (x === null) {
            x = Math.random() * this.renderer.canvas.width;
        }
        
        const targetY = 50 + Math.random() * 200;
        const color = this.colors[Math.floor(Math.random() * this.colors.length)];
        
        this.fireworks.push({
            x: x,
            y: this.renderer.canvas.height,
            vx: (Math.random() - 0.5) * 100,
            vy: -400 - Math.random() * 200,
            targetY: targetY,
            color: color,
            trail: [],
            intensity: intensity
        });
    }

    createExplosion(x, y, color, intensity = 1.0) {
        const particleCount = Math.floor(50 * intensity + Math.random() * 50);
        const explosion = {
            x: x,
            y: y,
            particles: []
        };

        // 多段階爆発
        for (let stage = 0; stage < 3; stage++) {
            const stageDelay = stage * 0.1;
            const stageRadius = 50 + stage * 30;
            
            for (let i = 0; i < particleCount / (stage + 1); i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = stageRadius + Math.random() * 100;
                const size = (3 - stage) + Math.random() * 3;
                
                explosion.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.0 - stageDelay,
                    maxLife: 1.0 - stageDelay,
                    size: size * intensity,
                    color: [...color, 1.0],
                    sparkle: Math.random() < 0.3,
                    delay: stageDelay
                });
            }
        }

        // キラキラ効果
        for (let i = 0; i < 20 * intensity; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 200 + Math.random() * 300;
            
            explosion.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5,
                maxLife: 0.5,
                size: 1 + Math.random() * 2,
                color: [1.0, 1.0, 1.0, 1.0],
                sparkle: true,
                delay: Math.random() * 0.2
            });
        }

        this.explosions.push(explosion);
    }

    update(dt, gameTime) {
        // 花火の打ち上げタイミング
        if (gameTime > this.nextFireworkTime) {
            this.launchFirework();
            this.nextFireworkTime = gameTime + 2 + Math.random() * 3;
        }

        // 打ち上げ中の花火を更新
        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            const firework = this.fireworks[i];
            
            // 軌跡を記録
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
            
            // 目標高度に達したら爆発
            if (firework.y <= firework.targetY || firework.vy > 0) {
                this.createExplosion(firework.x, firework.y, firework.color, firework.intensity);
                this.fireworks.splice(i, 1);
            }
        }

        // 爆発の更新
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            let allDead = true;
            
            for (let j = explosion.particles.length - 1; j >= 0; j--) {
                const particle = explosion.particles[j];
                
                if (particle.delay > 0) {
                    particle.delay -= dt;
                    allDead = false;
                    continue;
                }
                
                particle.x += particle.vx * dt;
                particle.y += particle.vy * dt;
                particle.vy += 300 * dt; // 重力
                particle.vx *= 0.98; // 空気抵抗
                
                particle.life -= dt * 0.8;
                particle.color[3] = particle.life / particle.maxLife;
                
                if (particle.sparkle) {
                    particle.color[3] *= (Math.sin(gameTime * 20) + 1) * 0.5;
                }
                
                if (particle.life > 0) {
                    allDead = false;
                }
            }
            
            if (allDead) {
                this.explosions.splice(i, 1);
            }
        }
    }

    draw() {
        // 打ち上げ中の花火を描画
        this.fireworks.forEach(firework => {
            // 軌跡
            firework.trail.forEach((point, index) => {
                if (index > 0 && point.life > 0) {
                    const prevPoint = firework.trail[index - 1];
                    const alpha = point.life * 0.5;
                    this.renderer.drawCircle(
                        point.x - 2,
                        point.y - 2,
                        4,
                        [...firework.color, alpha]
                    );
                }
            });
            
            // 花火本体（光る玉）
            this.renderer.drawCircle(
                firework.x - 4,
                firework.y - 4,
                8,
                [1.0, 1.0, 0.8, 1.0]
            );
        });

        // 爆発を描画
        this.explosions.forEach(explosion => {
            explosion.particles.forEach(particle => {
                if (particle.delay <= 0 && particle.life > 0) {
                    const size = particle.size * (particle.sparkle ? 
                        (0.5 + Math.random() * 0.5) : 1.0);
                    
                    this.renderer.drawCircle(
                        particle.x - size / 2,
                        particle.y - size / 2,
                        size,
                        particle.color
                    );
                    
                    // グロー効果
                    if (particle.life > 0.5) {
                        this.renderer.drawCircle(
                            particle.x - size,
                            particle.y - size,
                            size * 2,
                            [...particle.color.slice(0, 3), particle.color[3] * 0.3]
                        );
                    }
                }
            });
        });
    }

    // 特別な演出（レベルクリア時など）
    createGrandFinale(intensity = 2.0) {
        const centerX = this.renderer.canvas.width / 2;
        
        // 連続花火
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                for (let j = 0; j < 3; j++) {
                    const x = centerX + (j - 1) * 150;
                    this.launchFirework(x, intensity);
                }
            }, i * 300);
        }
    }
}