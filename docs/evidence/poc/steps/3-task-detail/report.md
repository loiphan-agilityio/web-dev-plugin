TASK-2 is implemented. `pnpm check` passes: lint, typecheck, 107 tests in 17 files, build and Storybook build, with coverage at 96.7% lines.

## Result
**Did:**
- **Detail page:** `/tasks/:id` loads with `GET /tasks/:id`. It shows loading, error with retry, and "Task not found" with a link back to the list. A non-numeric id also shows "Task not found" without calling the server.
- **Edit form:** it has every field including status and sends only the changed fields (`changedFields` in `patch.ts`). It uses the same validation as create, shows 422 field errors next to the fields, and shows a "Task updated" toast. Save is disabled until something changes.
- **List rows:** each row has a status select (`PATCH {status}`) and the title links to the detail page. After a change the row and the filters update through list invalidation, so a row leaves a filtered list when its status no longer matches.
- **Delete:** the Delete button opens a confirmation dialog (I added the shadcn `alert-dialog` with the CLI). It then calls `DELETE`, goes back to `/tasks` and shows a "Task deleted" toast.
- **404 on PATCH or DELETE:** the shared mutation hooks show the "This task no longer exists" toast and invalidate the list. The detail page then goes back to `/tasks`. A row's status change stays on the list.
- **Files:**
  - Code: `schemas.ts` (`TaskEdit`, `TaskPatch`), `patch.ts`, `api.ts`, `queries.ts`, `mocks.ts` (GET/PATCH/DELETE handlers plus pending, error and 422 mocks) and `routes.tsx`.
  - Components: `task-row`, `task-edit-form`, `delete-task-button` and `task-detail-page`. Each has a unit test and a story. `task-list` now renders `TaskRow`.
  - Tests: they cover success, validation, 422, 500, 404 on update and delete, and the page flows.
  - Test helper: I added an optional `route` option to `renderWithProviders` in `src/test/render.tsx`, so a component that reads route params can render at `/tasks/3` with the pattern `/tasks/:id`.

**Saw:**
- The row used to show status as a Badge. It is now a select, because the ticket asks for direct status change.
- The first `tsc` run failed: readonly `Partial` fields in `changedFields`, and `data` possibly undefined in the detail page. I fixed both.
- The `tasks-page` test and its mocks were already in place, so I extended them rather than adding new files.

**Not done:** nothing in the ticket was excluded. I did not run the app in a browser. The checks are the tests and the builds.

**Blocked by:** nothing.

**Next:** please confirm these choices, which the ticket left open:
1. **Delete errors that are not 404:** these show an error toast and stay on the page.
2. **Saving with no changes:** the Save button is disabled instead of sending an empty PATCH.
3. **Status control:** it is a select on each row, not a badge or a menu.
4. **PATCH response for the edit form:** I assumed the server returns the full updated task. It is decoded with the `Task` schema.