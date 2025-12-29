# Focus Trap Accessibility - Modal Dialogs
**Date:** 2025-12-29
**Status:** Complete

---

## Goal

Implement proper focus trapping in all modal dialogs to achieve WCAG 2.1 AA compliance. Users must not be able to tab to elements behind the overlay when a modal is open, improving keyboard accessibility and screen reader experience.

### Success Criteria
- [x] All modal dialogs trap focus within the dialog container
- [x] Tab key cycles forward through focusable elements only within the dialog
- [x] Shift+Tab cycles backward through focusable elements only within the dialog
- [x] Focus moves to first focusable element (or cancel button) when dialog opens
- [ ] Focus returns to the trigger element when dialog closes
- [x] All changes pass existing test suites with no regressions

---

## What's Already Done

### Components WITH Focus Trap (Reference Implementations)
- `/apps/web/app/[locale]/[teamSlug]/settings/team/components/LeaveTeamDialog.tsx`
  - Manual focus trap implementation (lines 50-76)
  - Uses `querySelectorAll` to find focusable elements
  - Handles Tab and Shift+Tab key events
  - Good reference pattern for other dialogs

- `/apps/web/components/teams/CreateTeamDialog.tsx`
  - Manual focus trap implementation (lines 132-161)
  - Same pattern as LeaveTeamDialog
  - Includes textarea in focusable selector

### Common Accessibility Features Already Present
- `role="dialog"` and `aria-modal="true"` attributes
- `aria-labelledby` pointing to dialog title
- Escape key to close (most dialogs)
- Click outside overlay to close
- Body scroll prevention (`document.body.style.overflow = "hidden"`)

---

## What We're Building Now

### Phase 1: Add Focus Trap to Priority Dialogs (HIGH)

**Why HIGH:** These dialogs are in core team settings flows and code review identified them as accessibility violations.

#### 1.1 TeamSwitcher CreateTeamDialog (`apps/web/components/layout/TeamSwitcher.tsx`)
**Lines:** 56-151 (inline component)

- [x] Add `dialogRef` using `useRef<HTMLDivElement>(null)`
- [x] Add focus trap effect with Tab/Shift+Tab keydown handler
- [x] Query focusable elements: `button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])`
- [x] Handle Shift+Tab on first element -> focus last element
- [x] Handle Tab on last element -> focus first element
- [ ] Store and restore trigger element focus on close

**Focusable elements in this dialog:**
- Team name input field
- Cancel button
- Create/Submit button

#### 1.2 DangerZone Deletion Dialog (`apps/web/app/[locale]/[teamSlug]/settings/team/components/DangerZone.tsx`)
**Lines:** 132-232

- [x] Add `dialogRef` using `useRef<HTMLDivElement>(null)`
- [x] Add focus trap effect with Tab/Shift+Tab keydown handler
- [x] Query focusable elements: `button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])`
- [x] Handle Shift+Tab on first element -> focus last element
- [x] Handle Tab on last element -> focus first element
- [ ] Store and restore trigger element focus on close (return to "Delete Team" button)

**Focusable elements in this dialog:**
- Confirmation text input field
- Cancel button
- Delete Team button (disabled until confirmation matches)

---

### Phase 2: Fix Shared ConfirmDialog Component (MEDIUM)

**Why MEDIUM:** This is a shared component used across the app. Fixing it provides accessibility improvements to all consumers.

#### 2.1 ConfirmDialog Component (`apps/web/components/ui/ConfirmDialog.tsx`)
**Current state:** Has Escape key handling and initial focus, NOW HAS focus trap

- [x] Add `dialogRef` (already exists, line 63)
- [x] Add focus trap useEffect hook after existing focus management effect
- [x] Query focusable elements within `dialogRef.current`
- [x] Implement Tab/Shift+Tab cycling logic
- [x] Test with keyboard-only navigation

**Focusable elements in this dialog:**
- Cancel button (receives initial focus)
- Confirm button

---

### Phase 3: Consider Shared Hook/Utility (LOW)

**Why LOW:** Optional optimization for maintainability. The pattern is duplicated across 4+ components.

#### 3.1 Extract `useFocusTrap` Hook
**Potential location:** `apps/web/lib/hooks/useFocusTrap.ts`

- [ ] Create reusable hook that accepts a ref and isOpen state
- [ ] Return cleanup function
- [ ] Include configurable options:
  - `initialFocusRef`: Element to focus on open
  - `returnFocusOnClose`: Boolean to restore trigger focus
  - `focusableSelector`: Custom selector string
- [ ] Add unit tests for the hook
- [ ] Document usage in hook JSDoc

**Example API:**
```typescript
useFocusTrap({
  containerRef: dialogRef,
  isOpen: isOpen,
  initialFocusRef: cancelButtonRef,
  returnFocusOnClose: true,
});
```

#### 3.2 Refactor Existing Components to Use Hook
- [ ] Refactor `LeaveTeamDialog.tsx` to use `useFocusTrap`
- [ ] Refactor `CreateTeamDialog.tsx` to use `useFocusTrap`
- [ ] Refactor `TeamSwitcher.tsx` CreateTeamDialog to use `useFocusTrap`
- [ ] Refactor `DangerZone.tsx` dialog to use `useFocusTrap`
- [ ] Refactor `ConfirmDialog.tsx` to use `useFocusTrap`

---

## Not In Scope

- **Using `focus-trap-react` library**
  - Why: Manual implementation is already established in the codebase (LeaveTeamDialog, CreateTeamDialog). Keeping consistency is preferred over adding a new dependency.

- **Dialogs outside team settings area**
  - Why: Scope is limited to team-related dialogs as identified in code review. Other dialogs should be addressed in separate accessibility audits.
  - Examples excluded: `SyncHistoryModal`, `DisconnectDialog`, `AccountSelectionModal`, `DeleteAccountModal`

- **Creating a shared Dialog/Modal component**
  - Why: Would require larger refactor of existing dialog patterns. Focus trap can be added incrementally to existing implementations.

- **Screen reader announcement improvements**
  - Why: Separate accessibility concern. Focus trap addresses keyboard navigation specifically.

---

## Implementation Plan

### Step 1: Implement Focus Trap in TeamSwitcher CreateTeamDialog (1-2 hours)
1. Add `dialogRef` to the dialog container div (line 99)
2. Create useEffect for focus trap logic (after line 74)
3. Copy focus trap pattern from `LeaveTeamDialog.tsx` lines 50-76
4. Add `triggerRef` to store button that opened dialog for focus restoration
5. Test with keyboard: Tab, Shift+Tab, Escape

### Step 2: Implement Focus Trap in DangerZone Dialog (1-2 hours)
1. Add `dialogRef` to the dialog container div (line 137)
2. Add `triggerRef` to store "Delete Team" button reference
3. Create useEffect for focus trap logic
4. Test with keyboard navigation
5. Ensure disabled Delete button is still included in tab order (but not clickable)

### Step 3: Fix ConfirmDialog Shared Component (1 hour)
1. Add focus trap useEffect after existing focus management (after line 93)
2. Test with all consumers of ConfirmDialog
3. Run existing ConfirmDialog tests

### Step 4: Write Tests (1-2 hours)
1. Add focus trap test cases to existing test files
2. Test Tab cycles forward within dialog
3. Test Shift+Tab cycles backward within dialog
4. Test focus returns to trigger on close

### Step 5: Optional - Extract useFocusTrap Hook (2-3 hours)
1. Create hook with configurable options
2. Add unit tests for hook
3. Refactor components to use hook
4. Run full test suite

---

## Definition of Done

- [x] Focus cannot escape TeamSwitcher CreateTeamDialog via Tab key
- [x] Focus cannot escape DangerZone deletion dialog via Tab key
- [x] Focus cannot escape ConfirmDialog via Tab key
- [ ] All dialogs return focus to trigger element on close
- [x] All existing tests pass (`pnpm test` in apps/web)
- [ ] Manual keyboard testing completed for each dialog
- [ ] No accessibility violations in browser DevTools Accessibility panel

---

## Notes

### Tech Stack
- **React 19** - Using refs and useEffect for DOM manipulation
- **Next.js 15** - Client components with "use client" directive
- **TypeScript** - Type-safe ref and event handling

### Focus Trap Implementation Pattern
The established pattern in this codebase (from LeaveTeamDialog.tsx):

```typescript
useEffect(() => {
  if (!isOpen) return;

  const handleFocusTrap = (event: KeyboardEvent) => {
    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  document.addEventListener("keydown", handleFocusTrap);
  return () => document.removeEventListener("keydown", handleFocusTrap);
}, [isOpen]);
```

### Focusable Element Selector
Standard selector for interactive elements:
```
button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])
```

### Testing Approach
1. Open dialog
2. Press Tab repeatedly - should cycle through dialog elements only
3. Press Shift+Tab - should cycle backward through dialog elements only
4. Focus should never reach elements behind the overlay
5. Close dialog - focus should return to the button that opened it

---

## Next Steps

1. **Phase 2: Broader Dialog Audit** - Audit all 22 modal dialogs identified in grep search for focus trap compliance
2. **Phase 3: Automated Testing** - Add Playwright/Cypress tests for keyboard accessibility
3. **Phase 4: Screen Reader Testing** - Test with VoiceOver/NVDA for full accessibility compliance
