from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import time
import os 
import json
from datetime import datetime



app = Flask(__name__)
CORS(app) 

HISTORY_FILE = 'history.json'

# =====================================================================
#  1. CONSTANTS & GLOBALS
# =====================================================================
H = 15
W = 10

board = [[' '] * W for _ in range(H)]
mortar_placed_time = [[0] * W for _ in range(H)]
block_durability = [[1] * W for _ in range(H)]

score = 0
lines_done = 0
level = 1
high_score = 0
game_state = "PLAYING"

fall_time = 0
fall_speed = 500

game_start_time = 0  
total_paused_duration = 0
pause_start_time = 0

current_block = None
next_block = None

# =====================================================================
#  2. TEMPLATES
# =====================================================================
brick_templates = [
    [['B','B','B','B']],
    [[' ','G','G'],['G','G',' ']],
    [[' ','B',' '],['B','B','B']],
    [[' ','B','B'],['B','B',' ']],
    [['B','B',' '],[' ','B','B']],
    [['B',' ',' '],['B',' ',' '],['B','B',' ']],
    [[' ',' ','B'],[' ',' ','B'],['B','B',' ']]
]

mortar_templates = [
    [['M','M','M','M']],
    [[' ','V','V'],['V','V',' ']],
    [[' ','M',' '],['M','M','M']],
    [[' ','M','M'],['M','M',' ']],
    [['M','M',' '],[' ','M','M']],
    [['M',' ',' '],['M',' ',' '],['M','M',' ']],
    [[' ',' ','M'],[' ',' ','M'],['M','M',' ']]
]

# =====================================================================
#  3. CORE LOGIC ENGINE
# =====================================================================
def get_current_time_ms():
    return int(time.time() * 1000)

class Block:
    def __init__(self, is_brick=True):
        self.is_brick  = is_brick
        self.templates = brick_templates if is_brick else mortar_templates
        self.shape     = random.choice(self.templates)
        self.x         = W // 2 - 2
        self.y         = 0
        # Đồng bộ chuẩn: Nếu là gạch, chọn ngẫu nhiên 1 trong 3 mã B, G, R để gửi về client nạp ảnh
        self.brick_type = random.choice(['B', 'G', 'R']) if is_brick else 'M'

    def rotate(self):
        rotated    = list(zip(*self.shape[::-1]))
        self.shape = [list(row) for row in rotated]

def init_board():
    global board, mortar_placed_time, block_durability, score, lines_done, level, fall_speed, fall_time, current_block, next_block, game_state
    global game_start_time, total_paused_duration, pause_start_time
    board = [[' '] * W for _ in range(H)]
    mortar_placed_time = [[0] * W for _ in range(H)]
    block_durability = [[1] * W for _ in range(H)]
    score = 0
    lines_done = 0
    level = 1
    fall_speed = 500
    fall_time = get_current_time_ms()
    game_state = "PLAYING"
    
    game_start_time = get_current_time_ms()
    total_paused_duration = 0
    pause_start_time = 0
    
    current_block = Block(random.choices([True, False], weights=[0.75, 0.25])[0])
    next_block = Block(random.choices([True, False], weights=[0.75, 0.25])[0])

def can_move(block, dx, dy):
    for i, row in enumerate(block.shape):
        for j, cell in enumerate(row):
            if cell != ' ':
                tx = block.x + j + dx
                ty = block.y + i + dy
                if tx < 0 or tx >= W or ty >= H or ty < 0: return False
                if board[ty][tx] != ' ': return False
    return True

def place_block(block):
    current_time = get_current_time_ms()
    for i, row in enumerate(block.shape):
        for j, cell in enumerate(row):
            if cell != ' ':
                x_pos = block.x + j
                y_pos = block.y + i
                if 0 <= y_pos < H and 0 <= x_pos < W:
                    if not block.is_brick:
                        board[y_pos][x_pos] = 'M'
                        mortar_placed_time[y_pos][x_pos] = current_time
                    else:
                        board[y_pos][x_pos] = block.brick_type
                        if y_pos+1 < H and board[y_pos+1][x_pos] == 'M':
                            board[y_pos+1][x_pos] = 'X'
                            block_durability[y_pos+1][x_pos] = 2

def find_falling_brick_above(i, j):
    for above_i in range(i-1, -1, -1):
        if board[above_i][j] in ['B','G','R','S']: return above_i
    return None

def fill_random_hole(i, j):
    if board[i][j] == ' ' and random.random() < 0.6:
        board[i][j] = 'R'

def handle_mortar_flow():
    current_time = get_current_time_ms()
    for i in range(H-2, 0, -1):
        for j in range(0, W):  
            if board[i][j] == 'M' and current_time - mortar_placed_time[i][j] > 3500:
                below_i, below_j = i+1, j
                if below_i < H and board[below_i][below_j] == ' ':
                    brick_above = find_falling_brick_above(i, j)
                    if brick_above is not None:
                        brick_type = board[brick_above][j]
                        board[brick_above][j] = ' '
                        board[brick_above+1][j] = brick_type
                    board[below_i][below_j] = 'M'
                    mortar_placed_time[below_i][below_j] = current_time
                    board[i][j] = ' '
                    mortar_placed_time[i][j] = 0
                    fill_random_hole(i, j)
                elif below_i < H and board[below_i][below_j] in ['B','G','R']:
                    board[below_i][below_j] = 'X'
                    block_durability[below_i][below_j] = 2
                    board[i][j] = ' '
                elif below_i < H and board[below_i][below_j] == 'M':
                    board[below_i][below_j] = 'V'
                    block_durability[below_i][below_j] = 1
                    board[i][j] = ' '

def check_glue_reaction():
    for i in range(H):
        for j in range(0, W):  
            if board[i][j] in ['B','G','R']:
                for di in [-1,0,1]:
                    for dj in [-1,0,1]:
                        ni, nj = i+di, j+dj
                        if 0 <= ni < H and 0 <= nj < W and board[ni][nj] == 'X':
                            board[i][j] = 'S'
                            block_durability[i][j] = 2
                            return

def remove_lines():
    lines_removed = 0
    i = H-1
    while i >= 0:
        full_line = all(board[i][j] != ' ' for j in range(0, W)) 
        if full_line:
            for j in range(0, W):
                if block_durability[i][j] > 1:
                    block_durability[i][j] -= 1
                    if block_durability[i][j] == 1:
                        if board[i][j] in ['S','X']: board[i][j] = 'B'
                else:
                    board[i][j] = ' '
            for ii in range(i, 0, -1):
                for j in range(0, W):
                    board[ii][j] = board[ii-1][j]
                    block_durability[ii][j]   = block_durability[ii-1][j]
                    mortar_placed_time[ii][j] = mortar_placed_time[ii-1][j]
            for j in range(0, W):
                board[0][j] = ' '
                block_durability[0][j] = 1
                mortar_placed_time[0][j] = 0
            lines_removed += 1
        else:
            i -= 1
    return lines_removed

def get_render_board():
    render_board = [row[:] for row in board]
    if game_state == "PLAYING" and current_block is not None:
        cell_type = current_block.brick_type if current_block.is_brick else 'M'
        for i, row in enumerate(current_block.shape):
            for j, char in enumerate(row):
                if char != ' ':
                    x_pos = current_block.x + j
                    y_pos = current_block.y + i
                    if 0 <= y_pos < H and 0 <= x_pos < W:
                        render_board[y_pos][x_pos] = cell_type
    return render_board

def get_next_board():
    if next_block is None:
        return [[' ']*4 for _ in range(2)]
    render = [[' ']*4 for _ in range(4)]
    for i, row in enumerate(next_block.shape):
        for j, cell in enumerate(row):
            if i < 4 and j < 4:
                render[i][j] = cell if cell == ' ' else (next_block.brick_type if next_block.is_brick else 'M')
    return render

init_board()

# =====================================================================
#  4. API HISTORY
# =====================================================================
def read_history():
    if not os.path.exists(HISTORY_FILE): return []
    try:
        with open(HISTORY_FILE, 'r') as f: return json.load(f)
    except Exception: return []

def write_history(data):
    with open(HISTORY_FILE, 'w') as f: json.dump(data, f, indent=4)

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify(read_history())

@app.route('/api/history', methods=['POST'])
def save_history():
    new_record = request.json
    history = read_history()

    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    history.append({
        "score": new_record.get('score'),
        "level": new_record.get('level'),
        "time": new_record.get('time'),
        "date": current_date
    })
    history.sort(key=lambda x: x['score'], reverse=True)
    history = history[:3]
    write_history(history)
    return jsonify({"message": "Lưu thành công!", "history": history}), 201

# ... (các API history cũ) ...

@app.route('/api/history', methods=['DELETE'])
def clear_history():
    # Ghi đè một danh sách rỗng [] vào file json để xóa sạch
    write_history([])
    return jsonify({"message": "Đã xóa toàn bộ lịch sử!"}), 200

# =====================================================================
#  5. API GAME MECHANICS
# =====================================================================
@app.route('/game-state', methods=['GET'])
def get_state():
    global current_block, next_block, fall_time, fall_speed, score, lines_done, level, high_score, game_state
    global game_start_time, total_paused_duration
    
    current_time = get_current_time_ms()

    if game_state == "PLAYING":
        handle_mortar_flow()
        check_glue_reaction()

        if current_time - fall_time > fall_speed:
            if can_move(current_block, 0, 1):
                current_block.y += 1
            else:
                place_block(current_block)
                removed = remove_lines()
                lines_done += removed
                if removed == 1: score += 100 * level
                elif removed == 2: score += 300 * level
                elif removed == 3: score += 500 * level
                elif removed >= 4: score += 800 * level
                level = lines_done // 10 + 1   
                
                current_block = next_block
                next_block = Block(random.choices([True, False], weights=[0.75, 0.25])[0])
                # Luôn bám sát tốc độ chuẩn của Level hiện tại khi đổi khối
                fall_speed = max(100, 500 - (level - 1) * 40)

                if not can_move(current_block, 0, 0):
                    if score > high_score: high_score = score
                    game_state = "GAMEOVER"

            fall_time = current_time

    # Yêu cầu 5: Chống số âm khổng lồ khi bắt đầu load trang (Chỉ tính giây khi game_start_time > 0)
    if game_start_time > 0:
        duration_seconds = (get_current_time_ms() - game_start_time - total_paused_duration) // 1000
    else:
        duration_seconds = 0
        
    return jsonify({
        "board": get_render_board(),
        "next_board": get_next_board(),  
        "score": score,
        "level": level,
        "high_score": high_score,
        "status": game_state,
        "time": f"{duration_seconds}s"
    })

@app.route('/action', methods=['POST'])
def do_action():
    global current_block, fall_speed, game_state, fall_time, pause_start_time, total_paused_duration, level
    if current_block is None or game_state == "GAMEOVER": return jsonify({"status": "ignored"})
    
    data = request.json
    action = data.get('action')

    if game_state == "PAUSED":
        if action == 'RESUME':
            game_state = "PLAYING"
            resume_time = get_current_time_ms()
            total_paused_duration += (resume_time - pause_start_time)
            fall_time = resume_time
            return jsonify({"status": "resumed"})
        else:
            return jsonify({"status": "ignored_due_to_pause"})

    if game_state == "PLAYING":
        if action == 'LEFT' and can_move(current_block, -1, 0): current_block.x -= 1
        elif action == 'RIGHT' and can_move(current_block, 1, 0): current_block.x += 1
        elif action == 'ROTATE':
            current_block.rotate()
            if not can_move(current_block, 0, 0):
                for _ in range(3): current_block.rotate()
        elif action == 'DOWN': fall_speed = 50 
        # Yêu cầu 4: Nhận lệnh nhả phím khôi phục lại tốc độ rơi tự nhiên dựa trên Level
        elif action == 'RESET_SPEED':
            fall_speed = max(100, 500 - (level - 1) * 40)
        elif action == 'PAUSE':
            game_state = "PAUSED"
            pause_start_time = get_current_time_ms()
            return jsonify({"status": "paused"})

    return jsonify({"status": "success"})

@app.route('/restart', methods=['POST'])
def restart_game():
    init_board()
    return jsonify({"status": "restarted"})

if __name__ == '__main__':
    app.run(port=5000, debug=True, use_reloader=False)