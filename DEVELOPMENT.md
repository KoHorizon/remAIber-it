# Development Guidelines

Rules and conventions for contributing to this project.

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── Library/         # Library feature (categories, banks)
│   │   ├── PracticeSession/ # Practice session feature
│   │   ├── BankDetail/      # Bank detail feature
│   │   └── modals/          # Modal components
│   ├── context/             # React contexts
│   ├── styles/              # Global styles & themes
│   ├── utils/               # Utility functions
│   └── types/               # TypeScript types
backend/
├── cmd/                     # Entry points
├── internal/                # Internal packages
└── pkg/                     # Public packages
```

---

## UI Components

### Use the UI Library

Always use components from `src/components/ui/` instead of raw HTML elements:

```tsx
// Good
import { Button, Modal, Chip, Dropdown, Input } from "../ui";

<Button variant="primary" size="sm" onClick={handleClick}>Save</Button>
<Modal title="Confirm" onClose={onClose}>{content}</Modal>

// Bad
<button className="btn btn-primary btn-sm">Save</button>
<div className="modal-overlay">...</div>
```

### Available UI Components

| Component | Usage |
|-----------|-------|
| `Button` | All buttons. Props: `variant` (primary/secondary/ghost/danger), `size` (sm/md/lg) |
| `Modal` | Modal dialogs. Props: `title`, `onClose`, `actions`, `variant` (default/delete) |
| `Dropdown` | Select dropdowns. Props: `options`, `value`, `onChange`, `emptyValue` |
| `Input` | Text inputs. Props: `label`, plus native input props |
| `Chip` | Tags/filters. Props: `label`, `isActive`, `badges`, `actions`, `isEditing` |
| `AddChip` | Inline creation chips. Props: `label`, `isCreating`, `createValue`, callbacks |
| `IconButton` | Icon-only buttons. Props: `icon`, `label`, `variant` |

### Adding New UI Components

1. Create in `src/components/ui/`
2. Use existing CSS variables (never hardcode colors)
3. Export from `src/components/ui/index.ts`
4. Keep props minimal - only what's needed

---

## Styling

### Theme System

All colors are defined in `src/styles/theme.css`. Never hardcode colors.

```css
/* Good */
.my-component {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border);
}

/* Bad */
.my-component {
    background: #faf7f2;
    color: #2d2a26;
    border: 1px solid #d9d0c3;
}
```

### Available CSS Variables

**Backgrounds:** `--bg-primary`, `--bg-secondary`, `--bg-elevated`, `--bg-hover`, `--bg-active`

**Borders:** `--border`, `--border-subtle`, `--border-hover`

**Text:** `--text-primary`, `--text-secondary`, `--text-muted`

**Accent:** `--accent`, `--accent-hover`, `--accent-muted`, `--accent-subtle`

**Status:** `--success`, `--warning`, `--error`, `--info` (each has `-muted` variant)

**Mastery:** `--mastery-excellent`, `--mastery-good`, `--mastery-fair`, `--mastery-needs-work`, `--mastery-none` (each has `-bg` variant)

**Type badges:** `--type-theory`, `--type-code`, `--type-cli` (each has `-bg` variant)

**Layout:** `--radius-sm/md/lg/xl`, `--shadow-sm/md/lg`, `--transition-fast/transition/transition-slow`

### Adding a New Theme

1. Copy an existing theme block in `src/styles/theme.css`
2. Change selector to `[data-theme="your-theme-name"]`
3. Update all color values
4. Apply with: `document.documentElement.setAttribute("data-theme", "your-theme-name")`

---

## Component Patterns

### Feature Folder Structure

Large features should be organized in folders:

```
Library/
├── index.tsx           # Main component, exports
├── LibraryHeader.tsx   # Sub-components
├── LibraryFilters.tsx
├── CategoryChips.tsx
├── LibraryTable.tsx
├── useLibraryFilters.ts # Custom hooks
├── types.ts            # Feature-specific types
└── Library.css         # Feature styles
```

### State Management

- Use `LibraryContext` for library data (folders, categories, banks)
- Keep component state local when possible
- Lift state up only when needed by siblings

### Callback Signatures

Keep callbacks simple - don't pass unused parameters:

```tsx
// Good
onDelete: (category: Category) => void

// Bad
onDelete: (e: React.MouseEvent, category: Category) => void  // if e is unused
```

### Inline Creation Pattern

For creating items (categories, workspaces), use inline creation instead of modals:

```tsx
const [isCreating, setIsCreating] = useState(false);
const [name, setName] = useState("");

// Use AddChip component
<AddChip
  label="+ Category"
  isCreating={isCreating}
  createValue={name}
  placeholder="Category name..."
  onStartCreate={() => setIsCreating(true)}
  onCreateChange={setName}
  onCreateSave={handleCreate}
  onCreateCancel={handleCancel}
/>
```

---

## TypeScript

### Type Definitions

- Define shared types in `src/types/index.ts`
- Feature-specific types go in feature folder (e.g., `Library/types.ts`)
- Export types alongside components when tightly coupled

### Props Types

Define props inline for components:

```tsx
type Props = {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
};

export function Chip({ label, isActive = false, onClick }: Props) {
  // ...
}
```

---

## Code Style

### File Naming

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils: `camelCase.ts`
- CSS: Match component name (`Library.css` for `Library/index.tsx`)

### Imports Order

1. React/external libraries
2. Components
3. Hooks/context
4. Utils
5. Types
6. CSS

```tsx
import { useState, useEffect } from "react";
import { Button, Modal } from "../ui";
import { useLibrary } from "../../context/LibraryContext";
import { formatDate } from "../../utils";
import type { Category } from "../../types";
import "./Library.css";
```

### Component Structure

```tsx
// 1. Imports
// 2. Types
// 3. Constants
// 4. Component
export function MyComponent({ prop1, prop2 }: Props) {
  // State
  const [value, setValue] = useState("");

  // Hooks
  const { data } = useContext();

  // Handlers
  function handleClick() { }

  // Render
  return ( );
}
```

---

## Don'ts

- Don't hardcode colors - use CSS variables
- Don't create modals for simple creation - use inline patterns
- Don't pass fake events (`{} as React.MouseEvent`) - simplify callback signatures
- Don't duplicate UI logic - use/extend UI components
- Don't add unused props "for future use"
- Don't use `index` as React key when items can reorder
- Don't mix feature code across folders

---

## Backend (Go)

### API Conventions

- RESTful endpoints
- JSON request/response bodies
- Error responses: `{ "error": "message" }`

### File Structure

```
internal/
├── api/        # HTTP handlers
├── models/     # Data models
├── storage/    # Database operations
└── grader/     # Grading logic
```

---

## Git

### Commit Messages

```
feat: add theme switching
fix: chip click not registering near edges
refactor: extract Chip component to ui library
chore: clean up unused re-exports
```

### Before Committing

1. Test the feature in browser
2. Check for TypeScript errors
3. Remove console.logs
4. Verify no hardcoded colors added
