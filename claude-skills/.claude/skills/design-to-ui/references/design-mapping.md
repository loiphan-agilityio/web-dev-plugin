# Design mapping

Source: the template's `src/styles/index.css`, `components.json` and `src/components/ui/*.tsx`. Class strings quoted below are copied from those files, except the two page classes (`space-y-6`, the page title), which come from the `develop-feature` skill's `references/ui-states.md`, section Page composition.

## Colors → semantic tokens

Map each design color by the **role** it plays, then set that variable's value in `:root` (see Token editing below). Components use only the utility on the left.

| Design element | Utility in TSX | Variable in `:root` |
|---|---|---|
| Page background | `bg-background` | `--background` |
| Body text, headings | `text-foreground` | `--foreground` |
| Card / panel surface and its text | `bg-card`, `text-card-foreground` | `--card`, `--card-foreground` |
| Dropdown, popover, toast surface | `bg-popover`, `text-popover-foreground` | `--popover`, `--popover-foreground` |
| Subtle surface (table header, skeleton, footer strip) | `bg-muted` | `--muted` |
| Secondary text, captions, placeholders | `text-muted-foreground` | `--muted-foreground` |
| Main call to action, active nav, links | `bg-primary`, `text-primary` | `--primary` |
| Text and icons on the primary color | `text-primary-foreground` | `--primary-foreground` |
| Secondary button surface and its text | `bg-secondary`, `text-secondary-foreground` | `--secondary`, `--secondary-foreground` |
| Highlighted menu item, selected item | `bg-accent`, `text-accent-foreground` | `--accent`, `--accent-foreground` |
| Error text, destructive action | `text-destructive` | `--destructive` |
| Dividers, table and box borders | `border` (color comes from the base layer) | `--border` |
| Input borders | `border-input` | `--input` |
| Focus ring | `ring-ring` | `--ring` |

What the shipped components actually read, so you know what a value change moves:

- The base layer sets the default border color and focus outline for everything: `@apply border-border outline-ring/50;`.
- Ghost and outline buttons hover with `hover:bg-muted`, not `bg-accent` (`button.tsx`). A design whose button hover differs from its menu highlight changes `--muted`, which also moves skeletons, `CardFooter` (`bg-muted/50`) and every subtle surface; if that is wrong for the rest of the design, keep `--muted` and record the hover difference under **Design gaps**.
- The destructive button is tinted, not solid: `bg-destructive/10 text-destructive hover:bg-destructive/20`. A solid red button in the design is a variant difference: use the closest variant and record it under **Design gaps** rather than restyling `components/ui`.
- `Card` draws its outline with `ring-1 ring-foreground/10`, not `--border`, so the card outline follows `--foreground`.
- Toasts read `"--normal-bg": "var(--popover)"` and `"--normal-border": "var(--border)"` (`sonner.tsx`).
- Charts and a sidebar have their own variables (`--chart-1` … `--chart-5`, `--sidebar-*`); set them only when the design has those parts.

## Spacing

Tailwind 4 spacing is in 4px units: the class number is the pixel value divided by 4. Any multiple of 0.25 works (`p-3.25` is 13px), so a whole-pixel value never needs `p-[13px]`.

| Design px | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 |
|---|---|---|---|---|---|---|---|---|---|---|
| Class number | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 |

So 16px padding is `p-4`, a 24px gap is `gap-6`, 32px between sections is `space-y-8`. Round each design value to the 4px rhythm (13px → `3`, 23px → `6`): designs drift by a pixel or two, and the rhythm keeps screens consistent. Use an exact off-rhythm step (`p-3.25`) only when the value is clearly intentional, and list it under **Design gaps**. Put spacing between siblings on the parent (`gap-*`, `space-y-*`), as the todos page does with `className="space-y-6"`.

## Type

| Class | `text-xs` | `text-sm` | `text-base` | `text-lg` | `text-xl` | `text-2xl` | `text-3xl` | `text-4xl` |
|---|---|---|---|---|---|---|---|---|
| px | 12 | 14 | 16 | 18 | 20 | 24 | 30 | 36 |

Round to the nearest size. A size off this scale needs an arbitrary value (`text-[13px]`): use it only when clearly intentional, and list it under **Design gaps**. Weights: `font-normal` 400, `font-medium` 500, `font-semibold` 600, `font-bold` 700. Headings use the heading font, as the todos page title does: `className="font-heading text-2xl font-semibold"`.

`Input` is `text-base` on small screens and `md:text-sm` from `md` up (`input.tsx`). Leave it: below 16px, iOS Safari zooms the page when an input gets focus.

## Radius

The scale derives from one variable. In `:root`:

```css
  --radius: 0.625rem;
```

In `@theme inline`:

```css
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
```

`Button`, `Input` and `Alert` use `rounded-lg` (exactly `--radius`); `Card` uses `rounded-xl` (`--radius` × 1.4); `Skeleton` uses `rounded-md`. So set `--radius` to the design's button and input corner radius, converted to rem (px ÷ 16: 8px → `0.5rem`), and every rounded corner follows, except that small buttons cap theirs (`xs` / `icon-xs` at 10px, `sm` / `icon-sm` at 12px, `button.tsx`). Never edit the `--radius-*` lines. If the design's card radius is not about 1.4 times its button radius, keep the derived value and note it under **Design gaps**.

## Design elements → shadcn components

| Design element | Component | In the template? |
|---|---|---|
| Buttons: primary, secondary, outlined, borderless, text link, destructive | `Button` with `variant` `default` / `secondary` / `outline` / `ghost` / `link` / `destructive` | yes |
| Button heights 24 / 28 / 32 / 36px | `Button` `size` `xs` / `sm` / `default` / `lg` (`h-6` / `h-7` / `h-8` / `h-9`); icon-only: `icon-xs` / `icon-sm` / `icon` / `icon-lg` | yes |
| Panel with title, description, action, footer | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`; `size="sm"` for tighter padding | yes |
| Text field with label, hint, error | `Input` inside `Field` with `FieldLabel`, `FieldDescription`, `FieldError` (forms: `develop-feature` skill, `references/forms.md`) | yes |
| Multi-line text field | `Textarea`: `pnpm dlx shadcn@latest add textarea` | no |
| Tag, pill, status chip, count | `Badge`: `pnpm dlx shadcn@latest add badge` | no |
| Inline message or banner | `Alert` (`variant` `default` / `destructive`), `AlertTitle`, `AlertDescription`, `AlertAction` | yes |
| Divider line | `Separator` | yes |
| Loading placeholder | `Skeleton`, shaped like the content it replaces | yes |
| Toast | `toast` from `sonner` (`import { toast } from 'sonner';`); `<Toaster richColors />` is already mounted in `src/app/providers.tsx` | yes |
| Anything else (dialog, dropdown menu, select, checkbox, tabs, table, avatar, tooltip) | `pnpm dlx shadcn@latest add <name>`; the `shadcn` companion skill covers usage | no |

- Pick the closest `size`; a design height between two sizes takes the nearer one and goes under **Design gaps**.
- `Alert` renders `role="alert"`. Never use it for an empty state: empty is not an error, and the state tests check that no alert is shown.
- `CardTitle` is a `div`: put the real heading element inside it.

## Icons (lucide-react)

Named imports from `lucide-react`, as `sonner.tsx` does, written in the app's style (single quotes and a semicolon, `.prettierrc.json`; generated `components/ui` files use double quotes):

```tsx
import { CircleCheckIcon, InfoIcon } from 'lucide-react';
```

```tsx
<CircleCheckIcon className="size-4" />
```

- Size with `size-*` (`size-4` is 16px, `size-5` is 20px). Inside a `Button` you usually set nothing: the button sizes its icons itself (`[&_svg:not([class*='size-'])]:size-4`).
- Color comes from the text color (`text-muted-foreground` on the icon or its parent), never a raw color.
- Decorative icon next to text: add nothing. lucide-react sets `aria-hidden="true"` itself when the icon has no `aria-*`, `role` or `title`. A standalone icon that carries meaning (a status icon with no text) gets an `aria-label`.
- Icon-only button: `size="icon"` (or another `icon-*` size) and an `aria-label` naming the action. `jsx-a11y` lint and the role-based tests both need the name.
- No exact lucide match: take the closest icon and record the substitution under **Design gaps**.

## Token editing

Edit only `src/styles/index.css`, and only the value on the right side of the colon. The variable names are what every component and utility reads; renaming one breaks them silently.

The `@theme inline` block maps each variable to a utility. Leave these lines alone:

```css
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
```

The `:root` block holds the values. These are the lines you change:

```css
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
```

Replace `oklch(0.205 0 0)` with the design's value exactly as the design gives it; a hex color is valid here. Do the same for each role you mapped in the color table, and for `--radius`. Change the matching lines in `.dark` only when the design shows a dark version:

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
```

When you change a surface color, check its `-foreground` partner still reads on it (`--primary` with `--primary-foreground`, `--card` with `--card-foreground`).

**A new role** (success, warning) is two edits: a variable in `:root` (and `.dark` if dark is in scope), and a mapping line in `@theme inline` following this existing one:

```css
  --color-destructive: var(--destructive);
```

Then `bg-<name>` / `text-<name>` work in TSX. Add a `-foreground` variable and mapping too when text sits on the new color.

**Fonts** are two lines. The import at the top of the file:

```css
@import '@fontsource-variable/geist';
```

and the family in `@theme inline`:

```css
  --font-heading: var(--font-sans);
  --font-sans: 'Geist Variable', sans-serif;
```

A different family needs a new `@fontsource` dependency: ask the user before adding it. Once approved, add the package with pnpm, replace the import, and change the value of `--font-sans` (and `--font-heading` if headings use a second family).
