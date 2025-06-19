# Mini Google Drive 2.0

Một ứng dụng quản lý file hiện đại sử dụng Google Drive API với giao diện thân thiện và nhiều tính năng mới.

## 🚀 Tính năng mới (Phiên bản 2.0)

### ✅ Đã hoàn thành
- **🔒 Bảo mật**: Credentials được di chuyển ra file `.env`, thêm rate limiting, CORS, helmet
- **📁 Đổi tên file/folder**: Click vào icon bút chì để đổi tên
- **🔍 Tìm kiếm**: Search bar với highlight kết quả và định vị file
- **🎨 UI/UX cải tiến**: Responsive design, animations mượt mà
- **⚡ Performance**: Code được tách module, error handling tốt hơn
- **⌨️ Keyboard shortcuts**: Ctrl+F (search), Ctrl+Shift+N/Insert (new folder), Esc (close), F5 (refresh)

### 🏗️ Cấu trúc mới
```
mini-google-drive/
├── client/
│   ├── js/           # JavaScript modules
│   ├── css/          # Stylesheets  
│   └── index.html    # Main HTML
├── server/
│   ├── config/       # Configuration
│   ├── routes/       # API routes
│   ├── utils/        # Utilities
│   └── index.js      # Main server
└── temp/             # Temporary upload files
```

## 📋 Cài đặt

### 1. Clone repository
```bash
git clone https://github.com/PhmHuy1710/mini-google-drive.git
cd mini-google-drive
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Tạo file .env
Tạo file `.env` trong thư mục gốc với nội dung:

```env
# Google Drive API Credentials
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
GOOGLE_REFRESH_TOKEN=your-refresh-token-here

# Server Configuration
PORT=3001
NODE_ENV=development

# Session Secret
SESSION_SECRET=your-session-secret-here
```

### 4. Lấy Google Drive API credentials

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Enable Google Drive API
4. Tạo OAuth 2.0 credentials
5. Sử dụng [OAuth Playground](https://developers.google.com/oauthplayground) để lấy refresh token

### 5. Chạy ứng dụng

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Ứng dụng sẽ chạy tại `http://localhost:3001`

## 🎯 Sử dụng

### Tính năng chính
- **Upload file**: Kéo thả hoặc click nút "Tải lên tệp"
- **Upload folder**: Click "Tải lên thư mục"  
- **Tạo thư mục**: Click "Tạo thư mục" hoặc Ctrl+Shift+N hoặc Insert
- **Đổi tên**: Hover vào file/folder và click icon bút chì
- **Tìm kiếm**: Gõ vào search box hoặc Ctrl+F
- **Download**: Click icon download
- **Xóa**: Click icon xóa (có xác nhận)

### Keyboard shortcuts
- `Ctrl + F`: Focus vào search box
- `Ctrl + Shift + N`: Tạo thư mục mới (tránh conflict với browser)
- `Insert`: Tạo thư mục mới (phím thay thế)
- `Esc`: Đóng modal hoặc clear search
- `F5`: Refresh dữ liệu

## 🔧 API Endpoints

### Files
- `GET /api/files?parentId=xxx` - List files
- `POST /api/upload` - Upload file
- `GET /api/download/:id` - Download file
- `DELETE /api/delete/:id` - Delete file
- `PUT /api/rename/:id` - Rename file

### Folders
- `POST /api/create-folder` - Create folder
- `GET /api/folderinfo/:id` - Get folder info

### Search & Storage
- `GET /api/search?q=xxx` - Search files
- `GET /api/storage` - Get storage quota

## 🔐 Bảo mật

- Environment variables cho credentials
- Rate limiting (100 requests/15 minutes)
- Input validation với express-validator
- CORS protection
- Helmet security headers
- Session management

## 🎨 Customization

### Thay đổi quota hiển thị
Trong `client/js/uiUtils.js`, sửa:
```javascript
const MY_QUOTA_GB = 15; // Đặt quota bạn muốn hiển thị
```

### Thay đổi upload limit
Trong `server/routes/fileRoutes.js`, sửa multer config:
```javascript
limits: {
  fileSize: 100 * 1024 * 1024, // 100MB
  files: 10 // Max files per upload
}
```

## 🐛 Troubleshooting

### Lỗi thường gặp

1. **"Environment variable not set"**
   - Kiểm tra file `.env` có đúng format
   - Đảm bảo tất cả credentials được điền

2. **"Permission denied"**
   - Kiểm tra Google Drive API credentials
   - Refresh token có thể đã hết hạn

3. **"Upload failed"**
   - Kiểm tra dung lượng Drive
   - File size có vượt quá limit không

### Debug mode
Đặt `NODE_ENV=development` trong `.env` để xem chi tiết lỗi.

## 🚧 Roadmap (Những gì sẽ làm tiếp)

### Phase 2 (2-3 tuần tới)
- [ ] Dark mode toggle
- [ ] File preview (ảnh, PDF, video)
- [ ] Multi-select với checkbox
- [ ] Copy/Move file giữa folders
- [ ] Grid view option
- [ ] Better mobile experience

### Phase 3 (1-2 tháng tới)  
- [ ] Multi-user support
- [ ] File versioning
- [ ] Real-time collaboration
- [ ] Offline support (PWA)

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

## 🤝 Contributing

Mọi contribution đều được chào đón! Vui lòng:
1. Fork repo
2. Tạo feature branch
3. Commit changes
4. Push và tạo Pull Request

---

**Phát triển bởi**: phmhuy1710
**Phiên bản**: 2.0.0  
