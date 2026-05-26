# So sánh Engine dịch — Soniox vs OpenAI vs Qwen Live

App có 3 engine, mỗi cái mạnh một kiểu. Trang này giúp bạn chọn cái phù hợp.

## Tóm tắt nhanh

| Engine | Giá | Tốc độ (first final) | Chất lượng dịch | Dùng khi nào |
|---|---|---|---|---|
| **Soniox** | ~$0.12/giờ | Rất nhanh | Khá | **Muốn rẻ, dịch text nhẹ nhàng** |
| **OpenAI Realtime** | ~$4/giờ | ~6.9s | **Tự nhiên nhất** | **Muốn bản dịch hay** (talk, lecture) |
| **Qwen Live Flash** | Free preview | **~3.8s** ⚡ | Khá tốt | **Muốn nhanh, mượt, miễn phí** |

> Số liệu tốc độ đo trên 1 sample audio tiếng Nhật → Việt, audio sạch (không có tiếng vỗ tay đầu). Single run, có sai số.

---

## 1. Soniox — rẻ nhất

**Chọn khi**: muốn dùng lâu dài với chi phí thấp, nội dung đơn giản (meeting, conference), không quá nặng về ngữ điệu.

- **Giá**: ~$0.12/giờ — rẻ gấp 30 lần OpenAI
- **Ngôn ngữ nguồn**: tự động phát hiện (không cần chọn)
- **Đầu ra**: chỉ text dịch
- **Dual panel**: có (hiện cả source transcript + translation)

Engine này đã có từ bản đầu, ổn định, ít lỗi nhất.

---

## 2. OpenAI Realtime — chất lượng dịch tự nhiên nhất

**Chọn khi**: nghe diễn thuyết, podcast, kể chuyện — những nội dung cần bản dịch đọc lên thấy mượt, có hồn.

- **Giá**: ~$4/giờ (đặt budget cap $5-10/tháng để khỏi lỡ tay)
- **Tốc độ**: first text xuất hiện ~2.7s sau khi nói, câu hoàn chỉnh đầu tiên ~6.9s
- **Chất lượng**: idiomatic, tự nhiên như người Việt. Ví dụ với câu "皆さん、こんにちは" sẽ ra "Này, mọi người, xin chào lại nhé" thay vì dịch cứng nhắc "Mọi người, xin chào".
- **Dual panel**: có (hiện source + translation)

**Điểm yếu**: chậm nhất trong 3 engine (~3 giây chậm hơn Qwen Live), giá đắt nhất.

---

## 3. Qwen Live Flash — nhanh & mượt, đang miễn phí

**Chọn khi**: muốn theo dõi real-time nhanh nhất, hoặc đang tiết kiệm tiền (model đang preview, miễn phí).

- **Giá**: free preview (giá sẽ thay đổi khi rời preview)
- **Tốc độ**: ⚡ **nhanh nhất** — first text ~2.6s, câu hoàn chỉnh ~3.8s (nhanh hơn OpenAI ~3 giây)
- **Streaming**: text "nhả" ra từng chữ rất mượt (effect typewriter)
- **Chất lượng**: tốt, gần bằng OpenAI nhưng đôi lúc dịch nhầm hướng chủ thể (ví dụ "tôi kể cho các bạn nghe" → "tôi lắng nghe câu chuyện của các bạn"). Câu dài thì giữ ngữ cảnh tốt hơn cả OpenAI.
- **Dual panel**: ❌ **không có** (model chỉ trả về translation, không trả source transcript)
- **Ngôn ngữ nguồn**: **phải chọn rõ** (không có auto). Setting → Source language.

**Điểm yếu**: không thấy được source transcript song song; preview nên không cam kết giá tương lai; cần chọn source language trước (auto không hoạt động ổn định trên mic thật).

---

## Em nên chọn cái nào?

- **Mới dùng app, muốn rẻ** → Soniox
- **Dịch talk/lecture quan trọng, không tiếc tiền** → OpenAI
- **Muốn nhanh + miễn phí + dịch tốt** → Qwen Live (nhớ chọn source language trong Settings)

App cho phép chuyển engine bất cứ lúc nào trong **Settings → Engine**, không cần restart.

---

## Note kỹ thuật

- Tất cả engine đều gửi audio thẳng tới nhà cung cấp tương ứng, app **không có server riêng**. Key lưu trong keychain máy, không ai khác đọc được.
- Bản dịch chỉ hiện text — TTS (đọc thành tiếng) đã tắt vì loa máy phát ra sẽ vọng vào mic gây lặp vô hạn.
- Hướng dẫn lấy API key: [api-key-guide-vi.md](api-key-guide-vi.md)
- Benchmark chi tiết: xem `plans/reports/benchmark-260525-2057-final-three-way.md` trong [desktop repo](https://github.com/phuc-nt/my-translator).
