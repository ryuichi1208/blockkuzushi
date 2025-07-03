// collision.c - 衝突判定をWebAssemblyで高速化
#include <emscripten/emscripten.h>
#include <stdbool.h>

// 矩形の衝突判定
EMSCRIPTEN_KEEPALIVE
bool check_collision(
    float x1, float y1, float w1, float h1,  // 矩形1
    float x2, float y2, float w2, float h2   // 矩形2
) {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
}

// ボールとブロックの衝突判定（複数ブロックを一度にチェック）
EMSCRIPTEN_KEEPALIVE
int check_ball_blocks_collision(
    float ball_x, float ball_y, float ball_w, float ball_h,
    float* blocks_data,  // [x, y, width, height, ...] の配列
    int block_count,
    int* hit_indices     // 衝突したブロックのインデックスを格納
) {
    int hit_count = 0;
    
    for (int i = 0; i < block_count; i++) {
        int idx = i * 4;
        float block_x = blocks_data[idx];
        float block_y = blocks_data[idx + 1];
        float block_w = blocks_data[idx + 2];
        float block_h = blocks_data[idx + 3];
        
        if (check_collision(
            ball_x, ball_y, ball_w, ball_h,
            block_x, block_y, block_w, block_h
        )) {
            hit_indices[hit_count++] = i;
        }
    }
    
    return hit_count;
}

// ボールの移動と壁との衝突判定を同時に行う
EMSCRIPTEN_KEEPALIVE
void update_ball_position(
    float* ball_x, float* ball_y,
    float* ball_vx, float* ball_vy,
    float dt,
    float canvas_width, float canvas_height,
    float ball_width, float ball_height
) {
    // 位置を更新
    *ball_x += *ball_vx * dt;
    *ball_y += *ball_vy * dt;
    
    // 左右の壁との衝突
    if (*ball_x <= 0 || *ball_x + ball_width >= canvas_width) {
        *ball_vx = -*ball_vx;
        *ball_x = *ball_x <= 0 ? 0 : canvas_width - ball_width;
    }
    
    // 上の壁との衝突
    if (*ball_y <= 0) {
        *ball_vy = -*ball_vy;
        *ball_y = 0;
    }
}

// パドルとボールの衝突判定と反射角度計算
EMSCRIPTEN_KEEPALIVE
bool check_paddle_collision(
    float ball_x, float ball_y, float ball_w, float ball_h,
    float paddle_x, float paddle_y, float paddle_w, float paddle_h,
    float* ball_vx, float* ball_vy,
    float ball_center_x
) {
    if (check_collision(
        ball_x, ball_y, ball_w, ball_h,
        paddle_x, paddle_y, paddle_w, paddle_h
    ) && *ball_vy > 0) {
        // 反射
        *ball_vy = -*ball_vy;
        
        // パドルの当たった位置によって反射角度を変える
        float hit_pos = (ball_center_x - paddle_x) / paddle_w;
        *ball_vx = (hit_pos - 0.5f) * 600.0f;
        
        return true;
    }
    return false;
}