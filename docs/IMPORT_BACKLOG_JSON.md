# Import Backlog (JSON format)

Import a backlog from a JSON file or pasted JSON. The importer validates the **strict hierarchy** (Company → Product → Epic → Feature → User Story → Task | Bug) using `src/utils/hierarchy.ts`, builds `parentId` and `childrenIds`, and supports **idempotency** (re-importing the same file does not duplicate items).

## JSON schema

```json
{
  "version": "1.0",
  "mode": "create-company" | "add-to-company",
  "targetCompanyId": "company-xxx",
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
| `mode` | Yes | `"create-company"` — create a new company from the first `company`-type item and import into it; `"add-to-company"` — import into an existing company. |
| `targetCompanyId` | For add-to-company | Company id (e.g. `company-123`) to import into. If omitted when `mode=add-to-company`, the **current** tenant is used. |
| `items` | Yes | Array of backlog items. |

### Item fields

| Field | Required | Description |
|-------|----------|-------------|
| `importId` | Yes | Unique string within the file (used for parent refs and idempotency). |
| `type` | Yes | One of: `company`, `product`, `epic`, `feature`, `user-story`, `task`, `bug`. |
| `title` | Yes | Display title. |
| `status` | No | Default `backlog`. Any valid `WorkItemStatus` (e.g. `funnel`, `backlog`, `to-do`, `in-progress`, `done`). |
| `parentImportId` | No | `importId` of the parent item. Omit or `null` for root; root items must be `type: "company"`. |
| `fields` | No | Optional fields (see below). |

### Optional `fields` (by type)

- **All:** `description`, `priority`, `assignee`, `tags`, `sprintId`, `color`
- **Epic / Feature:** `size` (`small`, `medium`, `large`, `xlarge`, `xxlarge`, `?`)
- **User Story:** `storyPoints`, `acceptanceCriteria`
- **Task / Bug:** `estimatedDays`, `actualHours`
- **Company (add-to-company only):** `existingWorkItemId` — see [Existing company root placeholder](#existing-company-root-placeholder-add-to-company).

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
- **Step 1:** Paste JSON or upload a `.json` file.
- **Step 2:** Click **Validate & preview** — see counts by type and first 10 titles; fix any validation errors.
- **Step 3:** Click **Confirm import** — items are created; parents get `childrenIds` updated.
- **Summary:** Created / skipped / errors. Re-importing the same file skips existing items (by `importKey`).

## Files

- **Validation & import:** `src/lib/import/workItemImporter.ts`
- **UI:** `src/pages/ImportBacklogPage.tsx`
- **Hierarchy rules:** `src/utils/hierarchy.ts`
