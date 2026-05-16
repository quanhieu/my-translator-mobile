# EAS (expo.dev) vs App Store Connect — vai trò & mối quan hệ

Hai dịch vụ tách biệt, làm hai việc khác nhau, nối với nhau ở bước "đưa file build lên Apple".

## Vai trò từng cái

### expo.dev (EAS — Expo Application Services) — bên *làm ra file app*

- Dịch vụ của Expo (công ty thứ ba, không phải Apple).
- `eas build` chạy trên **máy chủ cloud của Expo**, biên dịch source React Native thành file cài đặt: `.ipa` (iOS) hoặc `.apk`/`.aab` (Android).
- Quản lý **credentials** giùm: chứng chỉ ký iOS, provisioning profile, Android keystore.
- Lưu **artifact** (file build) tại link `https://expo.dev/artifacts/eas/XXXX.ipa`.
- Không liên quan tới phân phối tới người dùng cuối. Chỉ "sản xuất file".

### appstoreconnect.apple.com — cổng *phân phối của Apple*

- Dịch vụ của **Apple**, gắn với tài khoản Apple Developer ($99/năm).
- Nơi: tạo app record, điền metadata (tên, mô tả, screenshots), quản lý **TestFlight** (beta), submit **App Store review**, xem doanh thu.
- App chỉ tới được iPhone người dùng qua đây (TestFlight hoặc App Store). Apple bắt buộc mọi app iOS công khai phải đi qua cổng này.

## Mối quan hệ — chúng nối ở đâu

```
  source code (máy bạn)
        │
        │  eas build --platform ios
        ▼
  ┌─────────────────┐
  │   expo.dev/EAS  │   build cloud → tạo file .ipa, ký bằng cert Apple
  └─────────────────┘
        │
        │  eas submit --platform ios   ← bước "cầu nối"
        ▼
  ┌──────────────────────┐
  │  App Store Connect   │   nhận .ipa → TestFlight → App Store review
  │      (Apple)         │
  └──────────────────────┘
        │
        ▼
   iPhone người dùng (qua TestFlight / App Store)
```

Điểm nối chính là lệnh **`eas submit`**: lấy file `.ipa` mà EAS vừa build, dùng Apple API key để **upload lên App Store Connect**. Sau bước đó EAS xong việc; mọi thứ còn lại (beta review, TestFlight External, App Store review) diễn ra hoàn toàn trong App Store Connect.

## Vì sao cần Apple credentials trong EAS

iOS bắt buộc file `.ipa` phải được **ký bằng chứng chỉ Apple** thì Apple mới nhận. Vì vậy dù EAS build ở cloud, nó vẫn cần truy cập tài khoản Apple Developer (qua App Store Connect API key) để: (1) tạo/ký chứng chỉ, (2) upload. Đây là lý do lúc đầu nó hỏi Apple ID / API key.

## So sánh với Android (để rõ tương phản)

- EAS build ra `.apk` → tự tải về và up lên GitHub Release, không qua Google.
- Không cần "App Store Connect bản Android" vì không lên Play Store. Đây là lý do Android nhanh và $0, còn iOS phải qua Apple.

## Tóm tắt một câu

> **expo.dev = nhà máy đóng gói app** (sản xuất file `.ipa`).
> **App Store Connect = cửa khẩu của Apple** (kiểm duyệt và phát hành tới iPhone).
> `eas submit` là chiếc xe tải chở file từ nhà máy ra cửa khẩu.

## Liên quan

- Quy trình iOS chi tiết: [ios-release-guide.md](ios-release-guide.md)
- Quy trình Android: [android-release-guide.md](android-release-guide.md)
- Khác biệt dev client / Metro / production: [react-native-dev-vs-production.md](react-native-dev-vs-production.md)
