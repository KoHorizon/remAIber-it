# remAIber-it — Claude Instructions

Full-stack flashcard/practice app: React+Vite frontend (`frontend/`), Go backend (`backend/`).

For complete conventions, see `DEVELOPMENT.md`.

---

## Frontend conventions

### Context hooks
Import from the `src/context/` barrel only. Never merge into a monolithic hook.
- `useLibraryData()` — folders, categories, banks, loading/error state
- `useLibraryActions()` — all CRUD callbacks (stable, never cause re-renders)
- `useLibrarySelection()` — selectedFolderId, selectedCategoryId, selectFolder, selectCategory

### UI components
Use `src/components/ui/` (Button, Modal, Chip, IconButton, Input, Dropdown, Tooltip, AddChip).
Never use raw `<button>` or layout `<div>` unless documented as an exception in DEVELOPMENT.md.

### Colors / CSS
Only `var(--*)` variables from `src/styles/theme.css`. No hardcoded hex or rgb values.
Exceptions: inline code pink `#e06c75`, terminal palette (intentional dark theme).

### Key files
- `src/types/index.ts` — all shared TypeScript types
- `src/api/index.ts` — all API calls
- `src/utils/mastery.ts`, `src/utils/gradingTemplates.ts`, `src/utils/formatText.tsx` — shared utils

---

## Workflow rules

- **Never commit** unless explicitly asked.
- Remove `console.log` before finishing. `console.error` in catch blocks is fine.
- Read `DEVELOPMENT.md` before making UI or architectural changes.
