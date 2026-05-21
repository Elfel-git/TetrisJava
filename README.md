# 🧱 Tetris Building - Công Trường Pixel 2D

**Môn học:** Kỹ năng nghề nghiệp – SS004  
**Giảng viên hướng dẫn:** ThS. Nguyễn Văn Toàn  
**Nhóm thực hiện:** 3 co gai & Đồng đội  

### 👥 Thành viên nhóm:
* **25521001:** Nguyễn Ngọc Linh – *Trưởng nhóm*
* **23520808:** Võ Trọng Kiên
* **24521095:** Võ Phan Kiều My
* **25520767:** La Duy Khải
* **25520924:** Nguyễn Minh Khuê

---

## 📝 Giới thiệu dự án

**Tetris Building** là một trò chơi xếp hình 2D mang phong cách đồ họa **Pixel Art** độc đáo lấy chủ đề công trường xây dựng. Trò chơi kế thừa cơ chế Tetris cổ điển và mang đến đột phá với hệ thống vật lý vật liệu xây dựng thực tế.

### 🌟 Điểm cấu trúc & Gameplay nổi bật:
* **Cơ chế Vữa chảy (Mortar Physics):** Khối vữa mềm (`M`) sau 3.5 giây sẽ tự động hóa lỏng, len lỏi chảy xuống các khoảng trống bên dưới để gia cố công trình.
* **Phản ứng kết dính (Glue Reaction):** Khi gạch thường tiếp xúc với vữa chảy, chúng sẽ hóa thành **Gạch cứng liên kết (`S`, `X`)** với lớp xi măng bảo vệ.
* **Độ bền khối đúp (Durability):** Các khối đã kết dính xi măng đòi hỏi người chơi phải ăn hàng (Clear line) tới **2 lần** mới có thể phá hủy hoàn toàn.
* **Easter Egg thú vị:** Hệ thống lưu trữ lịch sử offline cho phép tương tác trực tiếp với NPC Ông chú thợ xây (Click để phát âm thanh búa đập và hiệu ứng rung lắc).

---

## 🎮 Hướng dẫn điều khiển (Controls)

| Phím bấm | Hành động trên công trường |
| :--- | :--- |
| `A` / `ArrowLeft` ⬅️ | Di chuyển khối sang trái |
| `D` / `ArrowRight` ➡️ | Di chuyển khối sang phải |
| `W` / `ArrowUp` ⬆️ | Xoay hướng khối gạch/vữa |
| `S` / `ArrowDown` ⬇️ | Ghìm phím để tăng tốc độ rơi tự do (Soft Drop) |
| *Nhả phím* `S` / `↓` | Khôi phục lại tốc độ rơi tự nhiên theo Level hiện tại |

---

## 🛠️ Hướng dẫn cài đặt và Khởi chạy (Installation & Setup)

Dự án hiện tại được phát triển song song dưới **2 phiên bản kiến trúc** khác nhau. Người kiểm thử có thể lựa chọn một trong hai cách chạy dưới đây:

### 🌐 PHƯƠNG ÁN 1: Bản Kiến trúc Web Client-Server (Flask API + HTML5/JS) - *Khuyên dùng*
*Kiến trúc chia tách Backend tính toán logic vật lý riêng và Frontend Canvas render đồ họa pixel hoàn hảo.*

#### **Bước 1: Cài đặt các thư viện Python bổ trợ**
Mở Terminal/Command Prompt tại thư mục dự án và chạy lệnh:
```bash
pip install flask flask-cors
```
Bước 2: Khởi động Lõi Game (Backend Server)
Chạy file backend Flask để mở cổng tiếp nhận dữ liệu logic game (Cổng 5000):
```bash
python server.py
```
Lưu ý: Giữ nguyên cửa sổ Terminal này không được tắt trong suốt quá trình chơi.

Bước 3: Mở giao diện đồ họa (Frontend)
Cách 1: Nhấp đúp chuột trái trực tiếp vào file index.html trong thư mục để mở trên trình duyệt.

Cách 2: Sử dụng extension Live Server của VS Code để khởi chạy file index.html.

🐍 PHƯƠNG ÁN 2: Bản Giao diện Cửa sổ Truyền thống (Pygame)
Phiên bản xử lý nguyên khối (Monolithic), thích hợp chạy ứng dụng cửa sổ ngoại tuyến cục bộ.
Bước 1: Cài đặt thư viện đồ họa Pygame
```bash
pip install pygame
```
Bước 2: Khởi chạy game trực tiếp
```bash
```
python #1 Tính chất vữa

⚙️ Thông số kỹ thuật hệ thống (Technical Specifications)
1. Cấu trúc Ma trận bàn chơi (Grid Matrix)
Kích thước lưới: 10 × 15 ô (Chiều ngang 10 ô, Chiều cao hiển thị 15 ô).

Kích thước Pixel: CELL_SIZE = 35px chuẩn hiển thị, đảm bảo không bị mờ lưới răng cưa trên màn hình máy tính.

2. Hệ thống tính điểm và thăng cấp (Scoring & Levels)
Điểm số được tính toán tự động dựa trên số lượng hàng công trình được nghiệm thu cùng lúc nhân với cấp độ nguy hiểm (Level) hiện tại:

Số hàng xóa cùng lúc,Số điểm ghi được
1 Hàng (Single),100×Level
2 Hàng (Double),300×Level
3 Hàng (Triple),500×Level
4 Hàng (Tetris Building),800×Level

Cứ mỗi 10 hàng được dọn sạch, người chơi sẽ được thăng lên 1 Cấp (Level = lines_done // 10 + 1).Tốc độ rơi tự nhiên của khối gạch sẽ tự động tăng dần khi thăng cấp theo công thức: $\text{Tốc độ} = 500ms - (\text{Level} - 1) \times 40ms$ (Giới hạn tối đa là 100ms).
