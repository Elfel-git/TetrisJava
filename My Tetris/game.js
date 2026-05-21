// =======================================================
// 1. CẤU HÌNH CHUNG & TẢI TÀI NGUYÊN (ASSETS)
// =======================================================
const SERVER_URL = "http://127.0.0.1:5000";

const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas ? gameCanvas.getContext('2d') : null;
const CELL_SIZE = 35;
const gameOverOverlay = document.getElementById("gameOverOverlay");
const pauseOverlay    = document.getElementById("pauseOverlay");
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;
const NEXT_CELL = 14; 

// --- KHAI BÁO TỪNG FILE ẢNH ASSET THỰC TẾ THEO ĐÚNG TÊN CỦA BẠN ---
// Thay dấu \ thành /, và giữ nguyên khoảng trắng
const imgGach01   = new Image(); imgGach01.src   = "./assets/Gach01.png";
const imgGach02   = new Image(); imgGach02.src   = "./assets/Gach02.png";
const imgGach03   = new Image(); imgGach03.src   = "./assets/Gach03.png";
const imgVuaMem   = new Image(); imgVuaMem.src   = "./assets/Vuamem.png";
const imgVuaCung  = new Image(); imgVuaCung.src  = "./assets/Vuacung.png";
const imgGachCung = new Image(); imgGachCung.src = "./assets/Gachcung.png";
const imgVuaFill  = new Image(); imgVuaFill.src  = "./assets/Vuafill.png";

// Ánh xạ ký tự logic sang biến ảnh tương ứng để vẽ
const textures = {
    'B': imgGach01,
    'G': imgGach02,
    'R': imgGach03,
    'M': imgVuaMem,
    'V': imgVuaCung,
    'S': imgGachCung,
    'X': imgVuaFill
};

let isGameRunning = false;
let isPaused = false;
let animationFrameId = null; 

const mainMenuContent      = document.getElementById("mainMenuContent");
const gameScreenContent    = document.getElementById("gameScreenContent");
const historyScreenContent = document.getElementById("historyScreenContent");
const settingPopupGroup    = document.getElementById("settingPopupGroup");

// =======================================================
// HỆ THỐNG ÂM THANH (BGM)
// =======================================================
// Lưu ý: Đổi thành / nếu thư mục của bạn dùng dấu gạch chéo tiến
const bgMusic = new Audio("./music/bg music.mp3");
bgMusic.loop = true; // Lặp nhạc vô tận
let isMusicOn = true;

// Hàm kiểm tra và phát nhạc
function tryPlayMusic() {
    if (isMusicOn && bgMusic.paused) {
        bgMusic.play().catch(e => console.log("Nhạc đang chờ tương tác người dùng"));
    }
}

// Hàm xử lý khi người chơi bấm nút Bật/Tắt nhạc trong Settings
function toggleMusic() {
    isMusicOn = !isMusicOn;
    if (isMusicOn) {
        tryPlayMusic();
    } else {
        bgMusic.pause();
    }
    
    // Đổi độ mờ của icon
    const musicIcon = document.querySelector("#musicToggleBtn .music-icon");
    if (musicIcon) {
        musicIcon.style.opacity = isMusicOn ? "1" : "0.3";
    }
}

// Gắn sự kiện click cho nút bật tắt nhạc
const btnMusic = document.getElementById("musicToggleBtn");
if (btnMusic) {
    btnMusic.addEventListener("click", toggleMusic);
}

// =======================================================
// 2. KHỐI LUỒNG HOẠT ĐỘNG CHỨC NĂNG (Cập nhật startGameSession)
// =======================================================
async function startGameSession() {
    isPaused = false;
    isGameRunning = true;
    if (animationFrameId) clearTimeout(animationFrameId);

    // [MỚI CHÈN VÀO ĐÂY]: Phát nhạc ngay khi người chơi bấm nút Start
    tryPlayMusic();

    const waitImg = (img) => new Promise(resolve => {
        if (img.complete) return resolve(); 
        img.onload = resolve; 
        img.onerror = resolve;
    });

    // ... (Giữ nguyên phần Promise.all và logic fetch('/restart') bên dưới của bạn) ...
}

// =======================================================
// 2. KHỐI LUỒNG HOẠT ĐỘNG CHỨC NĂNG (GAME CORE SESSION)
// =======================================================
async function startGameSession() {
    isPaused = false;
    isGameRunning = true;
    if (animationFrameId) clearTimeout(animationFrameId);

    tryPlayMusic();

    const waitImg = (img) => new Promise(resolve => {
        if (img.complete) return resolve();
        img.onload = resolve;
        img.oneerror = resolve;
    });

    await Promise.all([
        waitImg(imgGach01),
        waitImg(imgGach02),
        waitImg(imgGach03),
    ])
    try {
        const res = await fetch(`${SERVER_URL}/restart`, { method: 'POST' });
        const data = await res.json();
        if (data.status === "restarted") {
            gameOverOverlay.style.display = "none";
            animationFrameId = setTimeout(runGameLoop, 100);
        }
    } catch {
        alert("Lỗi đồng bộ lõi game! Hãy chắc chắn server.py đang chạy.");
    }
}

function stopGameSession() {
    isGameRunning = false;
    isPaused = false;
    if (animationFrameId) clearTimeout(animationFrameId);
}

function pauseGameSession() {
    if (!isGameRunning) return;
    isPaused = true;
    fetch(`${SERVER_URL}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PAUSE' })
    }).catch(() => {});
}

function resumeGameSession() {
    isPaused = false;
    fetch(`${SERVER_URL}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESUME' })
    }).catch(() => {});
    runGameLoop();
}

// Yêu cầu 5: Hàm xử lý kết xuất khối gạch tiếp theo lên Next Canvas
function drawNextBlock(nextBoard) {
    if (!nextCtx || !nextBoard) return;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    for (let r = 0; r < nextBoard.length; r++) {
        for (let c = 0; c < nextBoard[r].length; c++) {
            const cell = nextBoard[r][c];
            if (cell !== ' ') {
                const x = c * NEXT_CELL + 10;
                const y = r * NEXT_CELL + 5;
                
                if (textures[cell]) {
                    nextCtx.drawImage(textures[cell], x, y, NEXT_CELL, NEXT_CELL);
                }
                nextCtx.strokeStyle = '#111116';
                nextCtx.lineWidth = 1;
                nextCtx.strokeRect(x, y, NEXT_CELL, NEXT_CELL);
            }
        }
    }
}

// =======================================================
// 3. VÒNG LẶP RENDER ĐỒ HỌA CHÍNH (TICK LOOP)
// =======================================================
async function runGameLoop() {
    if (!isGameRunning || !ctx || isPaused) return;

    try {
        const res = await fetch(`${SERVER_URL}/game-state`);
        const data = await res.json();

        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        
        if (data.board) {
            // [ĐÃ SỬA]: Quét linh hoạt theo độ dài mảng từ backend thay vì hardcode 15x10
            for (let r = 0; r < data.board.length; r++) {
                for (let c = 0; c < data.board[r].length; c++) {
                    const cell = data.board[r][c];
                    
                    if (cell !== ' ') {
                        const x = c * CELL_SIZE;
                        const y = r * CELL_SIZE;
                        
                        // [ĐÃ SỬA]: Gọi trực tiếp biến ảnh từ dictionary textures đã ánh xạ ở phần 1
                        if (textures[cell]) {
                            ctx.drawImage(textures[cell], x, y, CELL_SIZE, CELL_SIZE);
                        } else {
                            // Đổ màu dự phòng nếu thiếu ảnh
                            ctx.fillStyle = '#63AFF3'; 
                            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                        }
                        
                        ctx.strokeStyle = '#111116';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                    }
                }
            }
        }

        // Gọi hàm vẽ khối tiếp theo lên Next Canvas
        if (data.next_board) {
            drawNextBlock(data.next_board);
        }

        document.getElementById('scoreDisplay').innerText = `Score: ${data.score}`;
        document.getElementById('levelDisplay').innerText = `Level: ${data.level}`;

        if (data.status === "GAMEOVER") {
            isGameRunning = false;
            document.getElementById('finalScoreDisplay').innerText = `Final score: ${data.score}`;
            document.getElementById('finalLevelDisplay').innerText = `Level: ${data.level}`;
            gameOverOverlay.style.display = "flex";
            saveGameResult(data.score, data.level, data.time || "0s");
            return; // Dừng vòng lặp khi thua
        }

    } catch (err) {
        console.error("Lỗi đồng bộ khung hình:", err);
    }

    // Tiếp tục gọi lại hàm sau 100ms
    animationFrameId = setTimeout(runGameLoop, 100);
}

// Bắt phím bấm xuống (keydown)
document.addEventListener('keydown', async (e) => {
    if (!isGameRunning || isPaused) return;
    const keyMap = {
        'ArrowLeft': 'LEFT',  'a': 'LEFT',  'A': 'LEFT',
        'ArrowRight': 'RIGHT', 'd': 'RIGHT', 'D': 'RIGHT',
        'ArrowUp': 'ROTATE',  'w': 'ROTATE','W': 'ROTATE',
        'ArrowDown': 'DOWN',  's': 'DOWN',  'S': 'DOWN'
    };
    const action = keyMap[e.key];
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
    if (action) {
        await fetch(`${SERVER_URL}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        }).catch(() => {});
    }
});

// Yêu cầu 4: Bắt sự kiện nhả phím (keyup) để khôi phục lại tốc độ rơi tự nhiên của gạch
document.addEventListener('keyup', async (e) => {
    if (!isGameRunning || isPaused) return;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        await fetch(`${SERVER_URL}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RESET_SPEED' })
        }).catch(() => {});
    }
});

// Lịch sử offline
async function renderHistory() {
    const container = document.getElementById('historySlotsContainer');
    if (!container) return;
    container.innerHTML = '<div class="empty-history">Đang tải...</div>';
    try {
        const res = await fetch(`${SERVER_URL}/api/history`);
        const history = await res.json();
        container.innerHTML = '';
        if (history.length === 0) {
            container.innerHTML = '<div class="empty-history">NO HISTORY YET...<br>PLAY A GAME!</div>';
            return;
        }
        history.forEach((record, index) => {
            const playDate = record.date ? record.date : "--/--/----";
            container.insertAdjacentHTML('beforeend', `
                <div class="history-slot">
                    <div class="slot-rank">#${index + 1}</div>
                    <div class="slot-score">SCORE: ${record.score}</div>
                    <div class="slot-details">
                        LVL: ${record.level}<br>TIME: ${record.time}<br>
                        <span style="font-size: 14px; color: #555;">${playDate}</span>
                    
                    </div>
                </div>
            `);
        });
    } catch {
        container.innerHTML = '<div class="empty-history">LỖI KẾT NỐI SERVER BACKEND!</div>';
    }
}

async function saveGameResult(newScore, newLevel, newTime) {
    try {
        await fetch(`${SERVER_URL}/api/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: newScore, level: newLevel, time: newTime })
        });
    } catch (err) {
        console.error("Lỗi lưu điểm:", err);
    }
}

    // Khởi tạo file âm thanh (Nhớ đổi lại đường dẫn nếu file của bạn nằm ở thư mục khác)
    const easterEggSound = new Audio("./music/boong.mp3");

    // Lắng nghe sự kiện click vào khu vực ông chú

    document.getElementById("ongChuContainer").addEventListener("click", async function() {
    // 1. Hiệu ứng âm thanh và hình ảnh Easter Egg
    easterEggSound.currentTime = 0; 
    easterEggSound.play().catch(e => console.log("Âm thanh bị chặn:", e));

    const ongChuImg = this.querySelector(".snapedit-1779043254759-1-icon");
    if (ongChuImg) {
        ongChuImg.classList.remove("shake-animation");
        void ongChuImg.offsetWidth; // Trigger reflow để restart animation
        ongChuImg.classList.add("shake-animation");
    }

    // 2. [CẬP NHẬT] Hiện hộp thoại xác nhận xóa
    // Đợi 0.1s để hiệu ứng rung lắc kịp diễn ra trước khi bị hàm confirm() chặn màn hình
    setTimeout(async () => {
        const isConfirm = confirm("Ông chú hỏi: Bạn có chắc chắn muốn xóa sạch hồ sơ thầu (Lịch sử điểm) không?");
        if (isConfirm) {
            try {
                // Gọi API DELETE tới Server
                const res = await fetch(`${SERVER_URL}/api/history`, { method: 'DELETE' });
                if (res.ok) {
                    // Cập nhật lại giao diện bảng lịch sử ngay lập tức
                    renderHistory(); 
                }
            } catch (err) {
                console.error("Lỗi khi gọi API xóa lịch sử:", err);
                alert("Ông chú đang bận, không thể xóa lịch sử lúc này!");
            }
        }
    }, 100);
});