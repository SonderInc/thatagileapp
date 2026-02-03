---
name: Feature board add-item type
overview: Ensure the Work Item modal opened from the Feature board "Add Item" button shows a create form for a Feature by passing allowedTypes so the type defaults to feature.
todos: []
isProject: false
---

# Feature board Add Item: create form for Feature

## Problem

On the Feature board, when the user taps "Add Item" (Funnel column), the modal opens but the form can default to **Company** instead of **Feature**.

**Cause:** [FeatureBoard.tsx](src/pages/FeatureBoard.tsx) passes `type="feature"` to `WorkItemModal` but does **not** pass `allowedTypes`. In [WorkItemModal.tsx](src/components/WorkItemModal.tsx), when there is no `parentId` and no `allowedTypes` prop, `allowedTypes` is set to `['company', 'product']`. The default type for a new item is then:

```ts
const defaultType = (type && (allowedTypes.includes(type) || type === 'user-story')) ? type : allowedTypes[0];
```

Since `'feature'` is not in `['company', 'product']`, `defaultType` becomes `allowedTypes[0]` = `'company'`, so the create form shows Company instead of Feature.

## Solution

Pass `allowedTypes={['feature']}` from the Feature board when rendering `WorkItemModal`. That way:

- `allowedTypes` is `['feature']`.
- `defaultType` becomes `'feature'` (because `type === 'feature'` and `allowedTypes.includes('feature')` is true).
- The Type dropdown in create mode only shows Feature (and can be hidden or read-only if desired; the modal already restricts options when `allowedTypes` has one element).

## Change

**File:** [src/pages/FeatureBoard.tsx](src/pages/FeatureBoard.tsx)

In the `WorkItemModal` usage (around lines 63–69), add the prop:

- `allowedTypes={['feature']}`

so the modal is explicitly for creating a Feature when opened from the Feature board. No changes to WorkItemModal itself are required.

## Result

- Tapping "Add Item" on the Feature board opens the create form with type **Feature** and status **Funnel** (already set via `defaultStatus`).
- The type selector, if shown, only offers Feature.

