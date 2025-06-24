# Mini Google Drive 2.0

🌐 **Live Demo**: [https://mini-google-drive.vercel.app](https://mini-google-drive.vercel.app)

Một ứng dụng quản lý file hiện đại sử dụng Google Drive API với giao diện thân thiện, responsive design và nhiều tính năng nâng cao.

## ✨ Tính năng nổi bật

### 🎯 **Core Features**
- **📁 File Management**: Upload, download, rename, delete files và folders
- **🔍 Advanced Search**: Tìm kiếm với filter theo loại file
- **📱 Mobile-First Design**: Responsive hoàn toàn với touch support
- **🗑️ Recycle Bin**: Khôi phục files đã xóa
- **⚡ Real-time Updates**: Cập nhật trạng thái upload real-time

### 🎨 **UI/UX Features**
- **🌙 Dark/Light Mode**: Toggle theme với localStorage persistence
- **📋 Grid/List View**: Chuyển đổi giữa grid và list layout
- **📱 Mobile Action Menu**: Touch-friendly interface cho mobile
- **🎭 Context Menu**: Right-click menu với keyboard shortcuts
- **💫 Loading Skeletons**: Smooth loading experience
- **🔔 Toast Notifications**: Modern notification system

### 🛠️ **Advanced Features**
- **✅ Multi-select**: Bulk operations với checkboxes
- **🎯 File Type Filters**: Lọc theo Images, Documents, Videos, Audio
- **🧭 Smart Breadcrumbs**: Navigation với dropdown cho deep folders
- **⌨️ Keyboard Shortcuts**: Full keyboard navigation support
- **📊 Storage Quota**: Real-time storage usage display
- **⚡ Virtual Scrolling**: Tối ưu cho danh sách file lớn (500+ files)
- **🖼️ Lazy Loading**: Thumbnail loading thông minh cho hiệu suất cao
- **📱 PWA Support**: Progressive Web App với offline functionality

## 🏗️ Cấu trúc dự án

```
mini-google-drive/
├── client/                    # Frontend Application
│   ├── css/
│   │   └── main.css          # Main stylesheet với dark/light theme
│   ├── js/                   # Modular JavaScript (16 modules)
│   │   ├── app.js            # Main application entry
│   │   ├── fileManager.js    # File operations
│   │   ├── uploadManager.js  # Upload handling
│   │   ├── searchManager.js  # Search & filtering
│   │   ├── dialogManager.js  # Modern dialogs
│   │   ├── themeManager.js   # Dark/light theme
│   │   ├── viewManager.js    # Grid/list view
│   │   ├── contextMenuManager.js # Right-click menu
│   │   ├── multiSelectManager.js # Bulk operations
│   │   ├── mobileActionManager.js # Mobile interface
│   │   ├── recycleBinManager.js   # Recycle bin
│   │   └── ... (6 more modules)
│   ├── index.html            # Main page
│   └── recycle-bin.html      # Recycle bin page
├── server/                   # Backend API
│   ├── config/
│   │   └── config.js         # Environment configuration
│   ├── routes/
│   │   └── fileRoutes.js     # API endpoints
│   ├── utils/
│   │   └── driveService.js   # Google Drive integration
│   └── index.js              # Express server
├── .env.example              # Environment template
├── .vercelignore             # Vercel deployment rules
├── package.json              # Dependencies & scripts
├── README.md                 # Documentation
└── vercel.json               # Vercel configuration
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

**Safe Start (Recommended for Windows):**
```powershell
# Tự động kiểm tra và kill process đang dùng port 3001
.\server-start.ps1
```

Ứng dụng sẽ chạy tại `http://localhost:3001`

### 🛠️ Server Management

Dự án bao gồm script PowerShell `server-start.ps1` để quản lý server an toàn:

**Tính năng:**
- ✅ Tự động kiểm tra port 3001 có đang được sử dụng
- ✅ Kill process đang dùng port (nếu có)
- ✅ Start server một cách an toàn
- ✅ Error handling với thông báo rõ ràng

**Cách sử dụng:**
```powershell
# Chạy script (Windows PowerShell)
.\server-start.ps1

# Hoặc chạy trực tiếp
npm start
```

## 🚀 Deployment

### Vercel (Recommended)

Ứng dụng đã được tối ưu cho Vercel deployment:

1. **Push code lên GitHub**
2. **Import project vào Vercel**
3. **Set Environment Variables** trong Vercel Dashboard:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   SESSION_SECRET=your_session_secret
   NODE_ENV=production
   ```
4. **Deploy!**

**Live Demo**: [https://mini-google-drive.vercel.app](https://mini-google-drive.vercel.app)

### Features tối ưu cho Production:
- ✅ **Serverless Functions** với Vercel
- ✅ **Environment Variables** security
- ✅ **CORS & Security Headers** configured
- ✅ **File Upload** với /tmp directory support
- ✅ **Rate Limiting** protection
- ✅ **Error Handling** comprehensive

## 🎯 Sử dụng

### 📱 **Interface Features**
- **🎨 Theme Toggle**: Click icon moon/sun để chuyển dark/light mode
- **📋 View Toggle**: Click icon grid/list để chuyển đổi layout
- **🔍 Smart Search**: Search với file type filters (All, Images, Documents, etc.)
- **📱 Mobile Menu**: Long-press trên mobile để mở action menu
- **🎭 Context Menu**: Right-click để mở context menu với shortcuts

### 📁 **File Operations**
- **📤 Upload Files**: Drag & drop hoặc click "Tải lên tệp"
- **📂 Upload Folders**: Click "Tải lên thư mục" với folder structure
- **➕ Create Folder**: Click "Tạo thư mục" hoặc keyboard shortcuts
- **✏️ Rename**: Click icon edit hoặc context menu
- **📥 Download**: Click download icon hoặc context menu
- **🗑️ Delete**: Click delete icon → moves to Recycle Bin
- **♻️ Restore**: Từ Recycle Bin page

### ⌨️ **Keyboard Shortcuts**
- `Ctrl + F`: Focus search box
- `Ctrl + Shift + N` / `Insert`: Create new folder
- `Esc`: Close dialogs/clear search
- `F5`: Refresh file list
- `Delete`: Delete selected files
- `Enter`: Open folder/download file
- `Space`: Toggle selection (multi-select mode)

## 🔧 API Endpoints

### 📁 **File Management**
- `GET /api/files?parentId=xxx` - List files in folder
- `POST /api/upload` - Upload single file
- `GET /api/download/:id` - Download file
- `DELETE /api/delete/:id` - Move to trash
- `PUT /api/rename/:id` - Rename file/folder

### 📂 **Folder Operations**
- `POST /api/create-folder` - Create new folder
- `GET /api/folderinfo/:id` - Get folder information

### 🔍 **Search & Storage**
- `GET /api/search?q=xxx` - Search files and folders
- `GET /api/storage` - Get storage quota information
- `GET /api/upload-config` - Get upload configuration

### 🗑️ **Recycle Bin**
- `GET /api/trash` - List trashed files
- `POST /api/restore/:id` - Restore from trash
- `DELETE /api/permanent-delete/:id` - Permanently delete
- `DELETE /api/empty-trash` - Empty entire trash

## 🛠️ Tech Stack

### **Frontend**
- **Vanilla JavaScript ES6+** - 16 modular components
- **CSS3** - Custom properties, flexbox, grid
- **HTML5** - Semantic markup
- **Material Design Icons** - Icon system
- **Responsive Design** - Mobile-first approach

### **Backend**
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Google APIs** - Drive integration
- **Multer** - File upload handling
- **Express Validator** - Input validation

### **Security & Performance**
- **Helmet** - Security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - API protection
- **Compression** - Response compression
- **Session Management** - Secure sessions

### **Deployment**
- **Vercel** - Serverless deployment
- **Environment Variables** - Secure configuration
- **Serverless Functions** - Auto-scaling

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

## 🎯 Development Status

### ✅ **Phase 1: Core Features (COMPLETED)**
- ✅ File upload/download/delete/rename
- ✅ Folder management
- ✅ Google Drive API integration
- ✅ Search functionality
- ✅ Security implementation

### ✅ **Phase 2: UI/UX Enhancement (COMPLETED)**
- ✅ Dark/Light mode toggle
- ✅ Grid/List view options
- ✅ Multi-select with checkboxes
- ✅ Context menu system
- ✅ Mobile-responsive design
- ✅ Loading skeletons
- ✅ Toast notifications
- ✅ Modern dialog system

### ✅ **Phase 3: Advanced Features (COMPLETED)**
- ✅ Recycle Bin functionality
- ✅ Enhanced file type filters (8 categories với emojis)
- ✅ Smart breadcrumb navigation
- ✅ Mobile action menu
- ✅ Pagination system cho large folders (performance optimization)
- ✅ Enhanced CSS với modern styling
- ✅ Server management script
- ✅ Bug fixes (sortManager.js error trong recycle-bin)
- ✅ Virtual Scrolling cho danh sách file lớn (500+ files)
- ✅ Lazy Loading thumbnails với hiệu suất cao
- ✅ PWA Support (Service Worker, Offline functionality, App Installation)
- ✅ Move files between folders với drag & drop

### 🚀 **Phase 4: Future Enhancements**
- [ ] PWA support (offline functionality)
- [ ] File versioning
- [ ] Real-time collaboration
- [ ] Multi-user support
- [ ] Advanced file sharing
- [ ] Performance optimizations (pagination, lazy loading)

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

## 🤝 Contributing

Mọi contribution đều được chào đón! Vui lòng:
1. Fork repo
2. Tạo feature branch
3. Commit changes
4. Push và tạo Pull Request

---

## 📊 **Project Stats**

- **🌟 Version**: 2.4.0 (Production Ready)
- **📅 Last Updated**: January 2, 2025
- **🚀 Live Demo**: [mini-google-drive.vercel.app](https://mini-google-drive.vercel.app)
- **📱 Mobile Support**: ✅ Fully Responsive
- **🌙 Dark Mode**: ✅ Available
- **♿ Accessibility**: ✅ Keyboard Navigation
- **🔒 Security**: ✅ Production Grade
- **⚡ Performance**: ✅ Virtual Scrolling for 500+ files
- **📱 PWA**: ✅ Offline Support & App Installation

## 📋 **Project Documentation**

- **🗂️ [Development Plan](plan.md)** - Current progress and roadmap
- **📝 [Changelog](CHANGELOG.md)** - Detailed change history  
- **🔍 [Code Audit Report](CODE_AUDIT_REPORT.md)** - Technical analysis

## 👨‍💻 **Developer**

**Phát triển bởi**: [phmhuy1710](https://github.com/PhmHuy1710)
**Repository**: [mini-google-drive](https://github.com/PhmHuy1710/mini-google-drive)
**Tech Stack**: Node.js + Express + Vanilla JS + Google Drive API
**Deployment**: Vercel Serverless Functions
