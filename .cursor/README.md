# Cursor Kit - Chuyển đổi từ Claude Kit

## Tổng quan

Folder `.cursor/` này đã được chuyển đổi từ `.claude/` để sử dụng với **Cursor IDE**. Tất cả commands, modes, và skills đã được chuyển đổi và có thể sử dụng ngay.

## Cấu trúc

```
.cursor/
├── commands/          # 27+ lệnh tùy chỉnh (từ .claude/commands/)
├── modes/            # 7 chế độ hành vi (từ .claude/modes/)
├── rules/             # Quy tắc dự án
│   ├── *.mdc         # Rules chính (từ .cursorrules)
│   └── skills/       # Skills đã chuyển đổi (từ .claude/skills/)
├── settings.json      # Cấu hình Cursor IDE
└── README.md          # File này
```

## Commands

Tất cả 27+ commands đã được copy từ `.claude/commands/`:

- `/feature` - Phát triển tính năng đầy đủ
- `/fix` - Sửa lỗi và debug
- `/review` - Review code
- `/test` - Tạo tests
- `/doc` - Tạo tài liệu
- `/plan` - Lập kế hoạch
- `/brainstorm` - Brainstorming
- `/tdd` - Test-driven development
- ... và nhiều hơn nữa

Xem danh sách đầy đủ trong `.cursor/commands/`

## Modes

7 modes đã được copy từ `.claude/modes/`:

- `default` - Chế độ mặc định
- `brainstorm` - Sáng tạo, đặt câu hỏi
- `token-efficient` - Tiết kiệm token
- `deep-research` - Nghiên cứu sâu
- `implementation` - Tập trung code
- `review` - Phân tích phê bình
- `orchestration` - Điều phối đa nhiệm

**Lưu ý**: `.cursor/modes/` không phải folder chuẩn của Cursor IDE, nhưng được giữ lại để sử dụng như custom implementation.

## Rules

### Rules chính

- `code-conventions.mdc` - Quy tắc đặt tên và code style
- `documentation.mdc` - Tiêu chuẩn tài liệu MDX
- `security.mdc` - Quy tắc bảo mật
- `testing.mdc` - Tiêu chuẩn testing
- `git-conventions.mdc` - Quy ước Git
- `project-context.mdc` - Context dự án và tech stack

### Skills (đã chuyển đổi)

Tất cả skills từ `.claude/skills/` đã được chuyển đổi thành `.mdc` files trong `.cursor/rules/skills/`:

- **Languages**: Python, TypeScript, JavaScript
- **Frameworks**: FastAPI, Django, Next.js, React
- **Databases**: PostgreSQL, MongoDB
- **Methodology**: TDD, debugging, planning, etc.
- **Testing**: pytest, vitest
- **Security**: OWASP
- ... và nhiều hơn nữa

## Settings

File `settings.json` đã được cấu hình với:
- Permissions cho các lệnh bash
- Exclude patterns (loại trừ website/, node_modules/, etc.)
- Focus patterns (ưu tiên *.mdx, docs/, etc.)

## Sử dụng

### Commands

Sử dụng commands như bình thường trong Cursor IDE:

```
/feature Add user authentication
/fix "Error in payment processing"
/review src/auth/
/doc mdx getting-started.mdx
```

### Modes

Mặc dù `.cursor/modes/` không phải chuẩn, bạn có thể tham khảo các file này để hiểu cách modes hoạt động. Cursor IDE quản lý modes qua Settings → Chat → Custom Modes.

### Rules

Cursor IDE sẽ tự động đọc các file `.mdc` trong `.cursor/rules/` để áp dụng quy tắc cho dự án.

## So sánh với .claude/

| Thành phần | .claude/ | .cursor/ | Ghi chú |
|------------|----------|----------|---------|
| Commands | ✅ | ✅ | Đã copy đầy đủ |
| Modes | ✅ | ✅ | Đã copy (không chuẩn nhưng dùng được) |
| Skills | ✅ | ✅ | Đã chuyển thành rules/skills/*.mdc |
| Rules | ❌ | ✅ | Đã tạo từ .cursorrules |
| Agents | ✅ | ❌ | Cursor IDE không hỗ trợ agents |

## Lưu ý

1. **Modes**: Folder `.cursor/modes/` không phải chuẩn của Cursor IDE, nhưng được giữ lại để tham khảo và có thể dùng như custom implementation.

2. **Agents**: Cursor IDE không hỗ trợ agents như Claude Code, nên các agents từ `.claude/agents/` không được chuyển đổi.

3. **Skills**: Đã được chuyển đổi thành rules với format `.mdc` để Cursor IDE có thể đọc.

4. **Settings**: File `settings.json` đã được cấu hình phù hợp với Cursor IDE.

## Tài liệu tham khảo

- Xem `.cursor/STRUCTURE.md` để biết cấu trúc chuẩn của Cursor IDE
- Xem `.cursorrules` để biết quy tắc dự án đầy đủ
- Xem `.claude/CLAUDE.md` để biết context dự án gốc

---

**Chuyển đổi hoàn tất!** Bạn có thể sử dụng tất cả commands, modes, và rules như trước đây với `.claude/`.

