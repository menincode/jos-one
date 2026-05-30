# Cấu trúc chuẩn của folder .cursor

## Tổng quan

Folder `.cursor` chứa các cấu hình và định nghĩa tùy chỉnh cho Cursor IDE, giúp tối ưu hóa workflow phát triển.

## Cấu trúc thư mục chuẩn

**Cấu trúc chuẩn của Cursor IDE:**

```
.cursor/
├── commands/          # ✅ CHUẨN: Định nghĩa các lệnh tùy chỉnh
│   ├── doc.md        # Lệnh tạo tài liệu
│   ├── feature.md    # Lệnh phát triển tính năng
│   └── ...
│
├── rules/             # ✅ KHUYẾN NGHỊ: Định nghĩa các quy tắc dự án
│   ├── naming-conventions.mdc
│   ├── code-style.mdc
│   └── security.mdc
│
├── settings.json      # ✅ CHUẨN: Cấu hình Cursor IDE
└── cursor.json        # ⚠️ TÙY CHỌN: Cấu hình chính
```

**Lưu ý:**

- `commands/` và `rules/` là các thư mục được Cursor IDE hỗ trợ chính thức
- `modes/` **KHÔNG phải** folder chuẩn (xem phần giải thích bên dưới)

## Chi tiết từng thành phần

### 1. `commands/` - Thư mục lệnh tùy chỉnh

Chứa các file Markdown định nghĩa lệnh tùy chỉnh mà bạn có thể gọi trong Cursor.

**Cấu trúc file lệnh:**

```markdown
# /command-name - Mô tả ngắn gọn

## Purpose

Mô tả mục đích của lệnh

## Usage
```

/command-name [arguments]

```

## Arguments
- `$ARGUMENTS`: Mô tả các tham số

## Workflow
1. Bước 1
2. Bước 2
...

## Output
Mô tả kết quả đầu ra
```

**Ví dụ các lệnh phổ biến:**

- `doc.md` - Tạo/update tài liệu
- `feature.md` - Phát triển tính năng mới
- `fix.md` - Sửa lỗi và debug
- `review.md` - Review code
- `test.md` - Tạo test cases
- `ship.md` - Commit và tạo PR

### 2. `rules/` - Thư mục quy tắc dự án

Chứa các file `.mdc` định nghĩa quy tắc cho dự án. Đây là cách khuyến nghị để tổ chức các quy tắc thay vì sử dụng file `.cursorrules` ở root.

**Mục đích:**

- Tổ chức quy tắc theo chủ đề (naming, style, security, etc.)
- Dễ dàng quản lý và bảo trì
- Hỗ trợ nhiều file quy tắc thay vì một file lớn

**Format file `.mdc`:**

File `.mdc` (Markdown Cursor) sử dụng cú pháp Markdown chuẩn:

```markdown
# Naming Conventions

## Overview

Quy tắc đặt tên cho dự án này.

## Files

- Python: `snake_case.py`
- TypeScript: `kebab-case.ts`
- Components: `PascalCase.tsx`

## Functions

- Python: `snake_case()`
- TypeScript: `camelCase()`

## Classes

- Tất cả: `PascalCase`

## Constants

- Tất cả: `UPPER_SNAKE_CASE`
```

**Ví dụ các file quy tắc phổ biến:**

- `naming-conventions.mdc` - Quy tắc đặt tên
- `code-style.mdc` - Phong cách code
- `security.mdc` - Quy tắc bảo mật
- `testing.mdc` - Quy tắc testing
- `documentation.mdc` - Quy tắc tài liệu

**Mối quan hệ với `.cursorrules`:**

- `.cursorrules` ở root vẫn được hỗ trợ
- Khuyến nghị chuyển sang `.cursor/rules/*.mdc` để tổ chức tốt hơn
- Có thể sử dụng cả hai, nhưng `.cursor/rules/` có ưu tiên cao hơn

### 3. `settings.json` - File cấu hình

Cấu hình quyền truy cập, patterns loại trừ và focus patterns.

**Cấu trúc mẫu:**

```json
{
  "permissions": {
    "allow": ["Bash(git:*)", "Bash(npm:*)", "Read(*)", "Write(*)", "Edit(*)"],
    "deny": ["Write(website/**)", "Edit(website/**)"]
  },
  "excludePatterns": [
    "website/**",
    "node_modules/**",
    ".next/**",
    "dist/**",
    "build/**"
  ],
  "focusPatterns": ["**/*.mdx", "**/*.md", "docs/**", "src/content/docs/**"]
}
```

**Giải thích các trường:**

- **`permissions.allow`**: Danh sách quyền được phép

  - `Bash(command:*)` - Cho phép chạy lệnh bash
  - `Read(*)` - Cho phép đọc file
  - `Write(*)` - Cho phép ghi file
  - `Edit(*)` - Cho phép chỉnh sửa file

- **`permissions.deny`**: Danh sách quyền bị từ chối

  - Dùng để hạn chế truy cập vào các thư mục cụ thể

- **`excludePatterns`**: Patterns loại trừ khỏi context

  - Các file/thư mục không được đưa vào context của AI
  - Giúp giảm token usage và tăng tốc độ

- **`focusPatterns`**: Patterns tập trung
  - Các file/thư mục được ưu tiên trong context
  - Hữu ích khi làm việc với tài liệu hoặc code cụ thể

### 4. `cursor.json` - File cấu hình chính (tùy chọn)

File cấu hình chính cho Cursor IDE, có thể thay thế hoặc bổ sung cho `settings.json`.

**Mối quan hệ giữa `settings.json` và `cursor.json`:**

- `settings.json` - Cấu hình quyền và patterns (phổ biến hơn)
- `cursor.json` - Cấu hình chính cho Cursor (nếu có)
- Cả hai có thể tồn tại cùng lúc, Cursor sẽ merge các cấu hình

### 5. `.cursorignore` - File loại trừ (ở root project)

Tương tự như `.gitignore`, file này xác định các file và thư mục mà Cursor sẽ bỏ qua trong quá trình quét hoặc tìm kiếm.

**Ví dụ nội dung:**

```
node_modules/
.next/
dist/
build/
*.log
.env.local
```

## Thư mục tùy chọn / Custom

### `modes/` - Thư mục chế độ hành vi (KHÔNG PHẢI CHUẨN)

**Lưu ý quan trọng**: Thư mục `.cursor/modes/` **KHÔNG phải** là phần chuẩn của Cursor IDE.

**Thực tế:**

- Cursor IDE có các chế độ (Agent, Ask, Manual, Custom) nhưng chúng được quản lý qua **Settings → Chat → Custom Modes**
- Không cần tạo folder `.cursor/modes/` trong dự án
- Folder này có thể là custom implementation từ các toolkit khác (như Claude Kit)

**Nếu bạn thấy folder này trong project:**

- Có thể là từ Claude Kit (`.claude/modes/`) được copy sang
- Hoặc là custom implementation của team
- Cursor IDE sẽ **không tự động đọc** folder này

**Cách quản lý modes trong Cursor IDE (chuẩn):**

1. Vào **Cursor Settings** → **Chat** → **Custom Modes**
2. Tạo và cấu hình modes qua UI
3. Không cần tạo folder trong project

## File bổ sung (tùy chọn)

### `.cursorrules` (ở root project)

File này không nằm trong `.cursor/` nhưng liên quan chặt chẽ. Nó chứa:

- Quy tắc coding conventions
- Tech stack information
- Architecture guidelines
- Documentation standards

**Lưu ý quan trọng:**

- `.cursorrules` vẫn được hỗ trợ và hoạt động
- **Khuyến nghị**: Chuyển sang `.cursor/rules/*.mdc` để tổ chức tốt hơn
- Có thể sử dụng cả hai, nhưng `.cursor/rules/` có ưu tiên cao hơn

**Cách migrate từ `.cursorrules` sang `rules/`:**

1. **Tạo thư mục `rules/`**:

   ```bash
   mkdir -p .cursor/rules
   ```

2. **Chia nhỏ `.cursorrules`** thành các file `.mdc`:

   - `naming-conventions.mdc` - Quy tắc đặt tên
   - `code-style.mdc` - Phong cách code
   - `security.mdc` - Quy tắc bảo mật
   - `architecture.mdc` - Hướng dẫn kiến trúc

3. **Di chuyển nội dung** từ `.cursorrules` vào các file tương ứng

4. **Giữ lại `.cursorrules`** (tùy chọn) hoặc xóa sau khi đã migrate xong

## Best Practices

### 1. Tổ chức lệnh

- Mỗi lệnh một file riêng
- Đặt tên file trùng với tên lệnh (không có dấu `/`)
- Sử dụng format Markdown chuẩn

### 2. Định nghĩa Mode

- Mỗi mode một file riêng
- Mô tả rõ ràng khi nào sử dụng
- Định nghĩa behavior cụ thể

### 3. Cấu hình Settings

- Chỉ cho phép các quyền cần thiết
- Loại trừ các thư mục build và dependencies
- Tập trung vào các file quan trọng

### 4. Bảo trì

- Cập nhật lệnh khi workflow thay đổi
- Thêm mode mới khi cần behavior khác
- Review settings định kỳ để tối ưu

## Ví dụ cấu trúc đầy đủ

```
.cursor/
├── commands/          # CHUẨN: Lệnh tùy chỉnh
│   ├── doc.md
│   ├── feature.md
│   └── ...
│
├── rules/             # KHUYẾN NGHỊ: Quy tắc dự án
│   ├── naming-conventions.mdc
│   ├── code-style.mdc
│   └── ...
│
├── modes/             # KHÔNG CHUẨN: Custom implementation
│   └── ...            # (Chỉ nếu bạn dùng custom toolkit)
│
├── settings.json      # CHUẨN: Cấu hình Cursor IDE
├── cursor.json        # TÙY CHỌN: Cấu hình chính
└── STRUCTURE.md        # Tài liệu này
```

**Ở root project:**

```
project-root/
├── .cursor/
│   └── ...
├── .cursorrules (tùy chọn, khuyến nghị chuyển sang .cursor/rules/)
└── .cursorignore (tùy chọn)
```

## Tài liệu tham khảo

- [Cursor IDE Documentation](https://cursor.sh/docs)
- [Cursor Rules Guide](https://cursor.sh/docs/cursor-rules)
- [Custom Commands](https://cursor.sh/docs/custom-commands)

## Lưu ý quan trọng

### Sự khác biệt giữa `.cursor/` và `.claude/`

**`.cursor/` - Cho Cursor IDE:**

- Folder cấu hình cho **Cursor IDE** (cursor.sh)
- Chứa: `commands/`, `modes/`, `rules/`, `settings.json`
- File quy tắc: `.cursorrules` hoặc `.cursor/rules/*.mdc`

**`.claude/` - Cho Claude Code:**

- Folder cấu hình cho **Claude Code** (claude.ai/code)
- Chứa: `commands/`, `modes/`, `agents/`, `skills/`, `CLAUDE.md`
- File quy tắc: `CLAUDE.md` (khác hoàn toàn)

**Không nhầm lẫn:**

- Đây là **hai hệ thống khác nhau**
- `.cursor/` dành cho Cursor IDE
- `.claude/` dành cho Claude Code
- Cấu trúc và cách sử dụng khác nhau

### Tương thích và phiên bản

- Cấu trúc này có thể thay đổi tùy theo phiên bản Cursor IDE
- Luôn kiểm tra tài liệu chính thức để có thông tin mới nhất
- Thư mục `rules/` là tính năng mới, được khuyến nghị sử dụng
- File `.cursorrules` ở root vẫn được hỗ trợ để tương thích ngược

---

**Lưu ý**: Cấu trúc này có thể thay đổi tùy theo phiên bản Cursor IDE. Luôn kiểm tra tài liệu chính thức để có thông tin mới nhất.
