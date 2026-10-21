# Visual check

Look at the built page next to the design and fix the differences. This step only reads the running app: no Playwright, no new dependency, no change to the template or its config. The tests from step 4 remain the proof of behavior; this check is for the look.

## 1. Find a browser tool before starting the dev server

A dev server with nothing to look at it is wasted time and a stray process, so check first. Two browsers can do this check; use the first one present.

- **The built-in browser of the Claude desktop app**, only with the `mcp__Claude_Browser__*` prefix and a `preview_start` tool. The pane cannot open a server Claude starts from its shell, but `preview_start` with a `name` makes the desktop app start the server from `.claude/launch.json` itself, and the pane can open that one. Load the tools in ONE ToolSearch call (query `mcp__Claude_Browser__`, `max_results` 64) if they are deferred, and read the built-in browser skill first if it is listed. Follow section 3A.
  The `mcp__remote-devices__Claude_Browser__*` prefix (a cloud session linked to the user's computer) cannot reach a dev server in Claude's environment: treat it as no browser, and never expose or tunnel the dev server to get around that.
- **Claude in Chrome**: tools named `mcp__claude-in-chrome__*`. Before it is turned on, the only one present may be `enable__mcp__claude-in-chrome`; call that first and the others appear. Load what you need in ONE ToolSearch call:
  ```
  ToolSearch with query "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp"
  ```
  Add `mcp__claude-in-chrome__read_console_messages` to the same call if you want to see runtime errors, `mcp__claude-in-chrome__javascript_tool` if the design shows dark mode (section 4), and a window-resize tool if the deferred tool names include one (section 3, step 4).
  Chrome reaches the dev server only when it runs on the same machine as Claude's shell. From a cloud session `localhost` does not resolve: if the URL does not load, go to section 2.
  If the Claude in Chrome skill is installed, read it before the first browser call; it has the session rules (tabs, permissions, when to stop). Follow section 3B.

## 2. No browser tool: skip

Neither browser, or it cannot load the page (headless and CI runs land here):

- Do not start the dev server. If you already started it, stop it.
- Ask the user to open the page and compare it with the design: give the route and the command (`pnpm dev:mock`).
- Record **"visual check not done"** under **Not done** in the Result, and stop this step.

## 3. Compare and fix

`pnpm dev:mock` serves the API from `src/mocks` with MSW (CLAUDE.md, Commands), so data screens show their mocked success state without a backend.

### 3A. Built-in browser: open the page

1. **Add the dev server to `.claude/launch.json`** (create the file if it is missing; keep other entries). A fixed port with `--strictPort`, so the preview opens the server it started and not another app on the usual port:
   ```json sketch
   {
     "version": "0.0.1",
     "configurations": [
       {
         "name": "dev-mock",
         "runtimeExecutable": "pnpm",
         "runtimeArgs": ["dev:mock", "--port", "5173", "--strictPort"],
         "port": 5173
       }
     ]
   }
   ```
   If port 5173 is taken, pick another free one in both places. Name the file under **Did**: it is a new project file the user may want to commit.
2. **`preview_start` with `name: "dev-mock"`**, then `navigate` to the page's route on that origin. If the server does not come up, read `preview_logs` and go to section 2.
3. **Widths:** `resize_window` with the design's width (custom `width` and `height`), then preset `mobile` (375px); `computer` with action `"screenshot"` at each. Reset with preset `desktop` when done.
4. Continue at step 5 below.

### 3B. Claude in Chrome: open the page

1. **Start the dev server in the background** (Bash with `run_in_background`):
   ```
   pnpm dev:mock
   ```
2. **Read the real URL and port from Vite's output.** Do not assume one: Vite moves to another port when the usual one is busy.
3. **Open the page in a NEW tab.** Never reuse or navigate the user's tabs: `tabs_context_mcp` first, then `tabs_create_mcp`, then `navigate`.
4. **Screenshot at the design's width and at 375px** (`computer` with action `"screenshot"`). For the width, use the window-resize tool you loaded in section 1 if there was one (do not guess a tool name); otherwise ask the user to resize the window or use the browser's device mode, and if that is not possible, record the widths you could not check under **Not done**.

### Both browsers: compare

5. **Compare with the design region by region**, using the inventory from step 1:
   - layout: order, alignment, columns, what wraps where;
   - spacing: padding, gaps, section spacing;
   - color: surfaces, text, borders, the primary color;
   - typography: size, weight, line height, font family;
   - missing or extra elements, and text content;
   - icons: right icon, size, color.
6. **Fix in the code**, tokens first (`src/styles/index.css`), then component classes. The token and component rules from `references/design-mapping.md` still hold: no raw colors to "make it match", no edits to `src/components/ui/`.
7. **Repeat at most 3 rounds.** Pixel-perfect is not the goal; the design's structure, spacing rhythm, colors and type are. Whatever still differs after round 3 goes under **Not done** as remaining differences, each with a one-line reason (a rounded value, a variant difference, a missing asset).
8. **Clean up:** close the tab you opened (`tabs_close_mcp`) and stop the background dev server.

States the design does not show (loading, error, empty) are proven by the tests; you do not need to force them in the browser.

## 4. Dark mode

Check dark mode only if the design shows a dark version. Nothing in the app adds the `.dark` class, so add it to the root element for the check and remove it afterwards (Claude in Chrome: `javascript_tool`); do not ship a toggle. The check proves the tokens; the app still shows only the light theme, which the Result reports under **Design gaps** (`design-mapping.md`, Dark mode).

## 5. Things that end the session

- **Dialogs:** do not click anything likely to raise `alert` / `confirm` / `prompt` (a "Delete" button with a confirmation). A JavaScript dialog blocks the browser tools until the user dismisses it by hand.
- **Blocked:** a login wall, a site-permission prompt, an extension that does not respond, or tool calls that fail 2 or 3 times: stop, tell the user what you tried, and ask how to proceed. Do not retry the same failing action.
