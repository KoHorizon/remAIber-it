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

### Exceptions — When NOT to use `<Modal>`

Some modals have layouts too custom to fit the `<Modal>` component and are intentionally hand-rolled:

- `DeleteConfirmModal` — custom danger confirm button with scoped CSS (`delete-modal-btn-confirm`)
- `CreateBankModal` — bank type selector + language grid as custom radio-style controls
- `MoveCategoryModal` — scrollable option list as the body, no standard actions slot

Do not migrate these to `<Modal>`. For new modals, use `<Modal>` unless the layout or footer controls are fundamentally incompatible with its `title`/`children`/`actions` pattern.

### Exceptions — Raw `<button>` is acceptable

The following custom control classes are intentionally outside the `Button` variant system and should stay as raw `<button>` elements:

- `template-btn` — preset selector chips in grading settings
- `toggle-switch` — toggle controls in session config
- `stepper-btn` — +/- steppers in session config

`SimulationView/` (segmented controls and pills, each with its own complete CSS):

- `simulation-type-btn` — the Theory/Code/CLI segmented control
- `simulation-save-chip` — category and bank pickers in the save panel
- `grading-pill` — the collapsed grading-rules handle, with its own chevron rotation
- `simulation-save-btn` / `simulation-back-btn` — the two slide-transition triggers on the result card

`AIGenerateView/` (same reasoning):

- `aigen-type-btn` — the bank-type segmented control
- `aigen-preset-btn` — preset chips; functionally the same control as `template-btn`
- `aigen-bank-option` — the destination bank list, a two-line row with a count
- `aigen-direction-toggle` — a two-position segmented toggle
- `aigen-grading-toggle` — disclosure row for the per-question grading prompt
- `aigen-add-content-btn` / `aigen-add-question` — dashed-outline "add" affordances
- `aigen-action-btn` / `aigen-content-card-delete` — 28×28 icon buttons with their own
  border and hover rules. Deliberately **not** `IconButton`: that injects
  `btn btn-ghost btn-icon`, and since those rules have the same specificity as the
  `aigen-*` ones, which border wins depends on CSS source order.

None of the above is "a `<Button variant>` written by hand" — each is a bespoke control whose
CSS defines its full appearance, so routing it through `Button` would mean fighting the base
styles rather than reusing them. Icon-only ones carry `title` and `aria-label`.

All other buttons must use `<Button variant="...">`.

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

### Intentional hardcoded color exceptions

The "never hardcode colors" rule has two accepted exceptions:

- **`#e06c75`** — inline code pink (`<code>` elements rendered by `renderFormattedText`). No theme variable maps to this color; it is intentionally fixed across all themes.
- **Terminal component palette** (`TerminalEditor.css`, `TerminalDisplay.css`, `TerminalInput.css`) — the terminal chrome uses a hardcoded dark background (`#0d1117`, `#2d2a24`, etc.) because it is always dark regardless of the active theme, by design.

All other color values must use `var(--*)` variables.

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

- Use the split context hooks from `src/context/` for library data:
  - `useLibraryData()` — read data (folders, categories, banks, isLoading, error)
  - `useLibraryActions()` — CRUD mutations (create/update/delete/refresh)
  - `useLibrarySelection()` — workspace/category selection state
- Subscribe only to the hook(s) you need — don't import all three if one suffices
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
import { useLibraryData, useLibraryActions } from "../../context";
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

### Linting

`npm run lint` (frontend). `eslint.config.js` enforces the mechanically
checkable parts of this document — nothing more:

| Rule | Convention it enforces |
|------|------------------------|
| `react/no-array-index-key` | "Don't use `index` as React key when items can reorder" |
| `no-console` (allows `console.error`) | "Remove `console.log` calls" |
| `react-hooks/exhaustive-deps`, `rules-of-hooks` | correct hook usage |
| `@typescript-eslint/no-unused-vars` | leading `_` for deliberately unused |

Two things are deliberately **off**, so don't re-enable them casually:

- **React Compiler rules** (`react-hooks/refs`, `set-state-in-effect`,
  `immutability`) — they flag ~17 existing places. Worth adopting, but as its
  own refactor, not as 17 suppressions.
- **`react-refresh/only-export-components`** — it wants one component per file,
  which contradicts colocating each context's provider with its hooks.

Everything else here (CSS variables over hex, `ui/` components over raw
`<button>`, the context-hook split, feature folder layout) a linter can't see
and still depends on review.

When suppressing `react/no-array-index-key`, say why the list can't reorder —
that comment is the documentation the convention was otherwise missing.

---

## Frontend tests

Vitest. `npm test` runs once, `npm run test:watch` watches. Tests sit beside what they cover
(`useSimulation.ts` → `useSimulation.test.ts`).

**The default environment is `node`.** Anything needing a DOM opts in per file with a docblock on
line 1, so pure util tests aren't paying for jsdom:

```ts
// @vitest-environment jsdom
```

There is **no `@testing-library/jest-dom`**, so its matchers do not exist — `toBeInTheDocument`,
`toHaveTextContent` and friends will fail as "not a function". Assert on the DOM directly instead:

```ts
expect(screen.getByRole("dialog").textContent).toMatch(/discard the 1 question/);
expect(screen.queryByRole("dialog")).toBeNull();
```

There is also no global setup file, so a jsdom test must `afterEach(cleanup)` itself.

Two things worth copying from the existing tests:

- **Mock the heavy editors** in any render test that mounts a code or CLI view. Monaco and the
  terminal emulator are slow to boot and irrelevant to almost everything:
  ```ts
  vi.mock("../CodeEditor", () => ({ CodeEditor: () => null }));
  vi.mock("../TerminalEditor", () => ({ TerminalEditor: () => null }));
  ```
- **When writing a test before the module exists**, create the module as a stub returning the right
  shape with no-op mutators first. A test that fails with "failed to resolve import" hasn't shown
  you anything about your assertions; one that fails on the assertion has.

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
3. Remove `console.log` calls (`console.error` in catch blocks is fine)
4. Verify no hardcoded colors added (see exceptions in Styling section)
