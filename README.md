# Tin học Thầy Diễn

Trang học Tin học lớp 3–12 (GDPT 2018, sách Kết nối tri thức). Nội dung là bản soạn mẫu, chờ Thầy duyệt.

## Cách đưa lên GitHub Pages
1. Tạo kho (repository) mới trên GitHub, ví dụ `tinhoc-thaydien`.
2. Bấm **Add file → Upload files**, kéo thả `index.html`, `README.md`, `.gitignore` và các thư mục `img`, `am-thanh`, `hinh`, rồi bấm **Commit changes**.
3. Vào **Settings → Pages**: mục *Source* chọn **Deploy from a branch**, nhánh **main**, thư mục **/(root)**, bấm **Save**.
4. Sau 1–2 phút, trang chạy tại `https://<tên-tài-khoản>.github.io/tinhoc-thaydien/`.

## Lưu ý
- Bản này **đã kết nối Supabase** (Project URL + Publishable key; khoá này được phép công khai, quyền đọc ghi do RLS quản lý). Học sinh đăng nhập bằng mã do Thầy cấp, tiến độ lưu trên máy chủ.
- Link kho giáo án Google Drive đã được gỡ khỏi trang.
- **Không** đưa lên GitHub thư mục `supabase/`, khoá `sb_secret_…` hay mật khẩu cơ sở dữ liệu.
- Tên học sinh chỉ lưu trên máy của học sinh, không gửi lên máy chủ.
- Thư mục `am-thanh/` chứa nhạc nền và hiệu ứng (MP3). Học sinh tự bật trong ⚙️ Cài đặt; giáo viên đặt chính sách âm thanh cho lớp.
