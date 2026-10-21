# Outside the template

For a project `develop` sorted as `same-stack` or `other-stack` (its Workflow B), with the project map it passes. There is no `ApiClient`, `runEffect` or `ApiError`; the project's own HTTP client and error path do their jobs, and its conventions win over the skill's.

- **Still holds:** the contract comes from the request, an OpenAPI file or the existing code; one function per endpoint in the project's API module, through its one HTTP client; a typed response with the project's validation (Effect Schema, zod, or its own types); every status the UI handles reaches it as a distinct, typed case; mutations invalidate exactly the data they change; tests for success and for each error the UI shows, with the project's network mocking.
- **Template-only, skipped here:** `ApiClient`, `runEffect`, the `ApiError` union, `@/test/render`, and the retry rule (the project's query client settings apply). MSW imports follow the installed major: `msw/http` for MSW 3, the `msw` root for MSW 2.
- **New libraries** (a second HTTP client, a validation library, MSW) are a question for the user.
- **Gates:** skip them here. `develop` runs `verify-project.sh` once over the whole suite after the change (Workflow B, step 5), and reports.
