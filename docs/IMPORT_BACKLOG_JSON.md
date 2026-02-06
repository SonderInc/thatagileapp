# Import Backlog (JSON format)

Import a backlog from a JSON file or pasted JSON. The importer validates the **strict hierarchy** (Company → Product → Epic → Feature → User Story → Task | Bug) using `src/utils/hierarchy.ts`, builds `parentId` and `childrenIds`, and supports **idempotency** (re-importing the same file does not duplicate items).

## JSON schema

```json
{
  "version": "1.0",
  "mode": "create-company" | "add-to-company" | "add-to-product" | "add-to-epic",
  "targetCompanyId": "company-xxx",
  "targetProductId": "item-xxx",
  "targetEpicId": "item-xxx",
  "items": [
    {
      "importId": "string unique within file",
      "type": "company|product|epic|feature|user-story|task|bug",
      "title": "string",
      "status": "funnel|backlog|to-do|in-progress|done",
      "parentImportId": "string|null",
      "fields": {
        "description": "string",
        "size": "small|medium|large|xlarge|xxlarge|?",
        "storyPoints": number,
        "acceptanceCriteria": "string",
        "estimatedDays": number,
        "actualHours": number,
        "priority": "low|medium|high|critical",
        "assignee": "string",
        "tags": ["string"],
        "sprintId": "string",
        "color": "string",
        "existingWorkItemId": "string"
      }
    }
  ]
}
```

### Top-level fields

| Field | Required | Description |
|-------|----------|-------------|
| `version` | Yes | Must be `"1.0"`. |
| `mode` | Yes | `"create-company"` — create a new company from the first `company`-type item and import into it; `"add-to-company"` — import into an existing company; `"add-to-product"` — import epics (and children) under an existing Product; `"add-to-epic"` — import feature(s) (and their user stories, tasks, bugs) under an existing Epic. |
| `targetCompanyId` | For add-to-company | Company id (e.g. `company-123`) to import into. If omitted when `mode=add-to-company`, the **current** tenant is used. |
| `targetProductId` | For add-to-product | Product WorkItem id (e.g. `item-1770201001767`) to attach root epics to. Can be set in JSON or in the UI. |
| `targetEpicId` | For add-to-epic | Epic WorkItem id to attach root feature(s) to. Can be set in JSON or in the UI (Admin → Import Backlog → Epic). |
| `items` | Yes | Array of backlog items. |

### Item fields

| Field | Required | Description |
|-------|----------|-------------|
| `importId` | Yes | Unique string within the file (used for parent refs and idempotency). |
| `type` | Yes | One of: `company`, `product`, `epic`, `feature`, `user-story`, `task`, `bug`. |
| `title` | Yes | Display title. |
| `status` | No | Default `backlog`. Any valid `WorkItemStatus` (e.g. `funnel`, `backlog`, `to-do`, `in-progress`, `done`). |
| `parentImportId` | No | `importId` of the parent item. Omit or `null` for root. In create-company/add-to-company, root must be `type: "company"`. In add-to-product, root must be `type: "epic"`. In add-to-epic, root must be `type: "feature"`. |
| `fields` | No | Optional fields (see below). |

### Optional `fields` (by type)

- **All:** `description`, `priority`, `assignee`, `tags`, `sprintId`, `color`
- **Epic / Feature:** `size` (`small`, `medium`, `large`, `xlarge`, `xxlarge`, `?`)
- **User Story:** `storyPoints`, `acceptanceCriteria`
- **Task / Bug:** `estimatedDays`, `actualHours`
- **Company (add-to-company only):** `existingWorkItemId` — see [Existing company root placeholder](#existing-company-root-placeholder-add-to-company).
- **Any (Cursor):** `cursorInstruction` — see [Cursor Instruction block](#cursor-instruction-block).

### Cursor Instruction block

You can attach a **Cursor instruction** to any item (e.g. Task/Bug) so it can be copied into Cursor in one click. The importer stores it in `WorkItem.description` using a canonical block and optionally in `WorkItem.metadata.cursorInstruction`.

- **Import:** If `fields.cursorInstruction` (string) is present, it is merged into the item's description with the canonical delimiters (`CURSOR INSTRUCTION` header and `==================`). If `fields.description` is also provided, the block is appended after a blank line and not duplicated if already present.
- **Export:** Exported JSON includes `fields.cursorInstruction` when the item has such a block (extracted from description).

Example Task with `cursorInstruction`:

```json
{
  "importId": "t1",
  "type": "task",
  "title": "Implement login API",
  "parentImportId": "s1",
  "fields": {
    "description": "Backend endpoint for email/password login.",
    "cursorInstruction": "CURSOR INSTRUCTION\n==================\nGoal:\nAdd POST /api/auth/login that accepts email and password, validates against DB, returns JWT.\nConstraints: Use existing auth middleware; rate-limit 5/min per IP.\n==================",
    "estimatedDays": 1
  }
}
```

## Hierarchy rules

- **Company** — top level only; no parent.
- **Product** — parent must be Company.
- **Epic** — parent must be Product.
- **Feature** — parent must be Epic.
- **User Story** — parent must be Feature.
- **Task / Bug** — parent must be User Story.

Validation uses `canBeChildOf(childType, parentType)` from `src/utils/hierarchy.ts`.

## Existing company root placeholder (add-to-company)

In **add-to-company** mode you can use the existing Company work item as the root instead of creating one:

- Include **exactly one** root item with `type: "company"` and `parentImportId: null`.
- That item **must** have `fields.existingWorkItemId` set to the target company's work item id (same as `targetCompanyId` when importing into the current tenant's Company node).
- The importer **does not create** a WorkItem for this item. It maps the item's `importId` → existing work item id so that:
  - Hierarchy validation still passes (company is the root).
  - Products can use `parentImportId` equal to that company's `importId`.
- All other items are created as usual. The **existing** Company work item's `childrenIds` is updated to include the ids of newly created products (merged with any existing children).

Example (add-to-company with existing root):

```json
{
  "version": "1.0",
  "mode": "add-to-company",
  "targetCompanyId": "company-wi-company-123",
  "items": [
    { "importId": "c1", "type": "company", "title": "Acme", "parentImportId": null, "fields": { "existingWorkItemId": "company-wi-company-123" } },
    { "importId": "p1", "type": "product", "title": "Widgets", "parentImportId": "c1" }
  ]
}
```

If `existingWorkItemId` does not equal `targetCompanyId`, the import fails with an error.

## add-to-product mode

Import epics (and their features, user stories, tasks, bugs) under an **existing Product** work item:

- **mode:** `"add-to-product"`.
- **targetProductId:** The Product WorkItem id (e.g. `item-1770201001767`). Can be set in JSON or in the UI (Import under Product → Product ID).
- **Root items:** Items with `parentImportId` null must be `type: "epic"`. They are attached to the target product; no company item in the JSON.
- **companyId** for created items is taken from the target product's `companyId`.
- The target product's `childrenIds` is updated to include the new epic ids (merged with existing).
- Hierarchy is enforced: epic → feature → user-story → task/bug.

Example (add-to-product):

```json
{
  "version": "1.0",
  "mode": "add-to-product",
  "targetProductId": "item-1770201001767",
  "items": [
    { "importId": "e1", "type": "epic", "title": "Launch v2", "parentImportId": null },
    { "importId": "f1", "type": "feature", "title": "Auth", "parentImportId": "e1" },
    { "importId": "s1", "type": "user-story", "title": "As a user I can log in", "parentImportId": "f1", "fields": { "storyPoints": 3 } }
  ]
}
```

## add-to-epic mode (import a feature)

Import one or more **features** (and their user stories, tasks, bugs) under an **existing Epic** work item:

- **mode:** `"add-to-epic"`.
- **targetEpicId:** The Epic WorkItem id. Can be set in JSON or in the UI (Admin → Import Backlog → Epic (import feature(s))).
- **Root items:** Items with `parentImportId` null must be `type: "feature"`. They are attached to the target epic.
- The target epic's `childrenIds` is updated to include the new feature ids (merged with existing).
- Hierarchy is enforced: feature → user-story → task/bug.

Example (import a single feature with JSON):

```json
{
  "version": "1.0",
  "mode": "add-to-epic",
  "targetEpicId": "item-1770201001767",
  "items": [
    { "importId": "f1", "type": "feature", "title": "User settings", "parentImportId": null, "fields": { "description": "Allow users to edit profile and preferences.", "size": "medium" } },
    { "importId": "s1", "type": "user-story", "title": "As a user I can change my display name", "parentImportId": "f1", "fields": { "storyPoints": 2 } },
    { "importId": "t1", "type": "task", "title": "Add name field to profile form", "parentImportId": "s1" }
  ]
}
```

## Idempotency

Each imported item gets:

- **WorkItem.id** — generated (e.g. `import-{companyId}-{slug(importId)}`), not the `importId` itself.
- **metadata.importId** — original `importId`.
- **metadata.importKey** — `{companyId}:{importId}`.

If an item with the same `metadata.importKey` already exists for that company, it is **skipped** (not duplicated).

## Example (minimal, add-to-company with placeholder)

```json
{
  "version": "1.0",
  "mode": "add-to-company",
  "targetCompanyId": "company-123",
  "items": [
    { "importId": "c1", "type": "company", "title": "Acme", "parentImportId": null, "fields": { "existingWorkItemId": "company-123" } },
    { "importId": "p1", "type": "product", "title": "Widgets", "parentImportId": "c1" },
    { "importId": "e1", "type": "epic", "title": "Launch v2", "parentImportId": "p1" },
    { "importId": "f1", "type": "feature", "title": "Auth", "parentImportId": "e1" },
    { "importId": "s1", "type": "user-story", "title": "As a user I can log in", "parentImportId": "f1", "fields": { "storyPoints": 3 } },
    { "importId": "t1", "type": "task", "title": "Add login form", "parentImportId": "s1" }
  ]
}
```

## UI

- **Admin → Import Backlog** opens the import page.
- **Import under:** Choose "Company" (add-to-company / create-company), "Product" (add-to-product), or "Epic (import feature(s))" (add-to-epic). When "Product" is selected, enter or select a Product ID; when "Epic" is selected, enter or select an Epic ID (used when not set in JSON).
- **Step 1:** Paste JSON or upload a `.json` file.
- **Step 2:** Click **Validate & preview** — see counts by type and first 10 titles; fix any validation errors.
- **Step 3:** Click **Confirm import** — items are created; parents get `childrenIds` updated.
- **Summary:** Created / skipped / errors. Re-importing the same file skips existing items (by `importKey`).

## Files

- **Validation & import:** `src/lib/import/workItemImporter.ts`
- **UI:** `src/pages/ImportBacklogPage.tsx`
- **Hierarchy rules:** `src/utils/hierarchy.ts`
