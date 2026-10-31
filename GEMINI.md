# Model Orchestration & Cost-Optimization Rules

## 🎯 Core Directive: Tiered Model Execution (Quy tắc Phân cấp Model Tiết kiệm Chi phí)

Khi xử lý các yêu cầu phát triển trong dự án này, hệ thống tuân thủ nghiêm ngặt nguyên tắc **Phân cấp Model (Model Tiering)** nhằm tối ưu chi phí và hiệu năng:

---

### 1. 🧠 Model Cao cấp (Expensive / High-Tier Models — Claude Sonnet, Gemini Pro, Thinking Models)
* **Phạm vi trách nhiệm:** **Chỉ Lập Kế Hoạch & Thiết Kế Kiến Trúc (Planning & Architecture Only)**.
* **Nhiệm vụ cụ thể:**
  - Tiếp nhận và phân tích sâu yêu cầu của người dùng.
  - Thiết kế kiến trúc giải pháp, rà soát logic hệ thống, phòng ngừa rủi ro và xung đột mã nguồn.
  - Lập Kế hoạch thực thi (Implementation Plan) chi tiết từng bước: chỉ rõ tên file, vị trí sửa đổi, các dependency và điều kiện kiểm thử.
  - Nghiệm thu, tổng hợp kết quả và phản hồi cho người dùng.
* ⛔ **Quy định nghiêm ngặt:** Không sử dụng model cao cấp đắt tiền để trực tiếp gõ mã nguồn dài, viết hàng loạt component, hoặc lặp lại các lệnh sửa file/terminal cơ bản khi có thể ủy quyền cho subagent.

---

### 2. ⚡ Model Tiết kiệm (Cost-Effective Models — Flash, Flash-Lite)
* **Phạm vi trách nhiệm:** **Thực thi Toàn bộ Mã nguồn & Kiểm thử (Execution & Implementation)**.
* **Nhiệm vụ cụ thể:**
  - Sau khi Model cao cấp hoàn thành bản Kế hoạch (Plan), công việc thực thi phải được bàn giao cho Subagent.
  - Gọi công cụ `invoke_subagent` với:
    - `Model: 'flash'` cho các tác vụ viết code component, xử lý logic, refactor file, tích hợp API.
    - `Model: 'flash_lite'` cho các tác vụ đọc/tra cứu file, chạy lệnh terminal (`run_command`), kiểm tra cú pháp, sửa đổi nhỏ (CSS, config).
  - Subagent `flash` tự chạy `npm run build` hoặc test để xác nhận mã nguồn không có lỗi trước khi báo cáo hoàn thành.

---

### 3. 🔄 Quy trình chuẩn 3 bước (Standard 3-Step Workflow)

```
[User Request]
      │
      ▼
┌────────────────────────────────────────────────────────┐
│  BƯỚC 1: ARCHITECT / PLANNER (Model Cao Cấp)           │
│  - Phân tích yêu cầu                                   │
│  - Thiết kế kiến trúc & Viết Actionable Plan           │
└──────────────────────────┬─────────────────────────────┘
                           │ invoke_subagent(Model: 'flash' / 'flash_lite')
                           ▼
┌────────────────────────────────────────────────────────┐
│  BƯỚC 2: BUILDER / WORKER (Model Flash / Flash-Lite)   │
│  - Thực thi code: write_file, edit_file                │
│  - Chạy lệnh test & build: npm run build               │
│  - Fix lỗi phát sinh & Báo cáo kết quả                 │
└──────────────────────────┬─────────────────────────────┘
                           │ Trả kết quả về Parent Agent
                           ▼
┌────────────────────────────────────────────────────────┐
│  BƯỚC 3: REVIEW & RESPONSE (Model Cao Cấp)             │
│  - Nghiệm thu nhanh kết quả                            │
│  - Báo cáo súc tích cho người dùng                     │
└────────────────────────────────────────────────────────┘
```
