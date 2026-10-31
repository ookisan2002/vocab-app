# 🔥 Hướng dẫn cài đặt Firebase cho VocabMaster

## Bước 1: Tạo Firebase Project

1. Truy cập [https://console.firebase.google.com](https://console.firebase.google.com)
2. Bấm **"Create a project"** (hoặc **"Add project"**)
3. Đặt tên project (ví dụ: `vocab-master-app`)
4. Tắt Google Analytics nếu không cần → Bấm **"Create project"**

---

## Bước 2: Kích hoạt Google Authentication

1. Trong Firebase Console → chọn project vừa tạo
2. Menu bên trái: **Build → Authentication**
3. Bấm **"Get started"**
4. Tab **"Sign-in method"** → Bấm **"Google"**
5. Bật toggle **"Enable"**
6. Nhập **Project support email** (email của bạn)
7. Bấm **"Save"**

---

## Bước 3: Tạo Firestore Database

1. Menu bên trái: **Build → Firestore Database**
2. Bấm **"Create database"**
3. Chọn **"Start in production mode"** → **"Next"**
4. Chọn region gần nhất (ví dụ: `asia-southeast1` cho Việt Nam) → **"Enable"**
5. Sau khi tạo xong, vào tab **"Rules"** và paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. Bấm **"Publish"**

---

## Bước 4: Đăng ký Web App & Lấy Config

1. Menu bên trái: bấm biểu tượng ⚙️ (Project settings)
2. Kéo xuống phần **"Your apps"** → Bấm biểu tượng `</>` (Web)
3. Đặt tên app (ví dụ: `vocab-web`) → Bấm **"Register app"**
4. Copy toàn bộ config dạng:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc..."
};
```

---

## Bước 5: Thêm Config vào Dự án

1. Trong thư mục `d:\projects\vocab-app`, tạo file `.env.local` (copy từ `.env.example`)
2. Điền các giá trị từ Firebase config:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc...
```

---

## Bước 6: Thêm Domain vào Authorized Domains

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. Mặc định đã có `localhost` — dùng được ngay khi dev local
3. Nếu deploy lên hosting (Vercel/Netlify/...), thêm domain đó vào đây

---

## Bước 7: Chạy ứng dụng

```powershell
cd d:\projects\vocab-app
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`

---

## ✅ Kiểm tra hoạt động

- Bấm **"Đăng nhập Google"** → cửa sổ popup Google hiện ra
- Chọn tài khoản → đăng nhập thành công, hiện avatar + tên
- Học vài từ → thấy đèn xanh "Đã đồng bộ"
- Mở lại trang hoặc mở thiết bị khác cùng tài khoản → tiến độ được giữ nguyên

---

> **Lưu ý bảo mật:** File `.env.local` KHÔNG được commit lên Git. File `.gitignore` đã tự exclude nó.
