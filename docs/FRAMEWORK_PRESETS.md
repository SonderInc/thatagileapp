# Framework Presets and Migration

Framework presets let a company admin choose a configuration (e.g. SAFe Essential, Large Solution, Portfolio, Full; LeSS; Spotify; Apple; DaD) without code branching. All behavior is driven by preset data.

## Data model

- **Company framework config**: `companies/{companyId}/settings/framework`  
  Stores `presetKey`, `presetVersion`, `enabledTypes`, `hierarchy`, `glossary`, `updatedAt`, `updatedBy`.  
  Applying a preset writes here and syncs to `companySettings/{companyId}` for backward compatibility.

- **Migration job**: `companies/{companyId}/frameworkMigrations/{jobId}`  
  Status: QUEUED | RUNNING | COMPLETED | FAILED | ROLLED_BACK. Mode: DRY_RUN | APPLY.  
  Summary: createdContainers, movedItems, flaggedForReview, invalidItems.

- **Migration report**: `companies/{companyId}/frameworkMigrationReports/{jobId}`  
  issues, reviewQueue, createdContainers, movedItems, generatedAt.

- **Move log (rollback)**: `companies/{companyId}/frameworkMigrationMoves/{jobId}/moves/{moveId}`  
  Append-only. Each entry: itemId, prev: { parentId }, next: { parentId }, movedAt, movedBy.

## Flow

1. **Apply preset** (Settings → Framework presets): selects preset and writes company framework config. No work items are changed.
2. **Run migration scan (dry run)**: callable `frameworkMigrateCompany` with mode DRY_RUN. Produces a report (invalid parents, suggested moves, review queue). No writes to work items.
3. **Apply migration**: same callable with mode APPLY. Performs only deterministic re-parents (high confidence); logs every move for rollback. Does not delete work items.
4. **Rollback**: callable `frameworkRollbackCompany` reverses moves from the move log and marks job ROLLED_BACK.

## Constraints

- No preset-specific branching in app or functions; all behavior from preset data.
- Migrations are idempotent and safe to re-run; no work items are deleted.
- Ambiguous cases go to “Needs Review”; only deterministic changes are automated.
