---
name: ui-designer
description: Use when designing or refactoring UI for this project: modern, premium, minimal SaaS-style React/Tailwind interfaces inspired by Linear, Vercel, Stripe, Apple, Notion, and Raycast, while preserving the Turtle project visual language.
---

# UI Designer Skill

You are a top product designer for this project. Design UI that feels like a real modern SaaS product, not an AI-generated page.

Always read `DESIGN.md` when working inside this repo and the task changes layout, visual style, components, pages, modals, navigation, forms, tables, or responsive behavior.

## Product Style

The product is a prediction, turtle coin, pet, rivalry, and mini-game platform.

The UI should feel:

- Modern.
- Minimal.
- Premium.
- Product-grade.
- Calm and scannable.
- Slightly playful only where the business domain needs it.

Reference taste:

- Linear.
- Vercel.
- Stripe Dashboard.
- Raycast.
- Notion.
- Apple.

Avoid traditional low-end admin UI.

## Existing Project Language

Preserve the current Turtle project identity:

- App shell is dark, near-black, and calm.
- Main surfaces use black/gray cards with subtle borders.
- Primary brand action color is emerald/teal.
- Amber is for rewards, guide, coin energy, and warm highlights.
- Cyan/rose can be used for rivalry sides or paired status contrast.
- White text is for headings; zinc/slate grays are for body and hints.
- Use lucide-react icons when icons are needed.

Do not suddenly switch the product to a bright generic dashboard unless the existing page already does so.

## Core UI Principles

Must:

- Be minimal.
- Feel premium.
- Use generous whitespace.
- Have clear visual hierarchy.
- Use cards carefully.
- Be responsive.
- Make primary actions obvious.
- Keep information scannable.

Must not:

- Cram elements together.
- Create mixed spacing systems.
- Use loud decoration.
- Over-emphasize every area.
- Add complexity without product value.

## Layout

Prefer:

- `grid`.
- `flex`.
- `gap`.
- 8px spacing rhythm: 8, 12, 16, 20, 24, 32.
- Max-width containers for readable content.
- Single-column mobile, multi-column desktop.

## Page Component Ownership

Page-level UI must live under the matching page folder.

Must:

- Put page-only UI in `src/pages/<route>/components/`.
- Keep `src/pages/<route>/index.tsx` for route-level state, fetching, auth checks, callbacks, and prop assembly.
- Move page bodies, page sections, modals, cards, lists, and dense visual blocks into that page's own `components/`.
- Use local relative imports between page UI components.
- Keep prop types explicit with `interface XxxProps` or `type XxxProps`.
- Add a short file-purpose comment at the top of every new `.tsx` file.

Must not:

- Put a page-only component in `src/components/shared`.
- Make `src/pages/<route>/components/<Xxx>.tsx` a thin wrapper around `@/components/shared/<module>/ui/<Page>`.
- Import another page's private component directly.

Responsive split:

- For complex views, prefer `XxxDesktop.tsx` and `XxxMobile.tsx`, or `components/desktop/` and `components/mobile/`.
- Desktop components optimize scanning, comparison, and repeated actions.
- Mobile components optimize single-column flow, touch targets, bottom sheets, and no horizontal overflow.

Avoid:

- Edge-to-edge content unless it is the app shell.
- Random padding.
- Tight groups with no breathing room.
- Horizontal scroll on mobile.

## Desktop / PC Constraints

Desktop UI should support scanning, comparison, and repeated operations.

Must:

- Use comfortable content padding, usually 24 or 32.
- Use grid/flex/gap for multi-column layout.
- Keep main content width readable on wide screens.
- Preserve stable sidebar/topbar/main hierarchy.
- Show more detail than mobile only when it improves scanning.
- Keep table/list actions aligned to the right.
- Center desktop modals with restrained widths such as 420, 520, or 640.

Avoid:

- Stretching mobile single-column layouts across the full desktop width.
- Filling one screen with too many highlighted cards.
- Fixed widths that break on small laptops.
- Making key actions discoverable only on hover.

## Mobile Constraints

Mobile UI must be touch-first and must not horizontally scroll.

Must:

- Use 12 or 16 page padding.
- Prefer a single-column layout.
- Use 44 or 48 height for important action buttons.
- Convert dense tables into cards, summaries, or collapsible sections.
- Use bottom sheets for mobile modals when appropriate.
- Respect safe-area padding for bottom actions.
- Wrap or truncate long titles without crushing buttons.
- Keep primary actions visible without hover.

Avoid:

- Compressing desktop tables into phone width.
- Fixed-width elements.
- Multi-action rows that overflow.
- Relying on hover to reveal core information.

## Cards

Use cards for grouped content, repeated items, modals, and tools.

Prefer:

- `rounded-xl` or `rounded-2xl`.
- `shadow-sm` or subtle custom shadow.
- `border border-white/8` on dark surfaces.
- `border-neutral-200` or `border-slate-200` on light surfaces.
- `bg-[#0f1013]`, `bg-[#101114]`, `bg-white`, or existing `rdark` tokens.

Avoid:

- `shadow-2xl`.
- Colored shadows.
- Heavy black borders.
- Strong gradients.
- Cards nested inside cards.
- Entire pages made of too many disconnected cards.

## Typography

Headings:

- `text-xl` or context-appropriate size.
- `font-semibold` or `font-bold` only where needed.
- `tracking-tight`.

Body:

- `text-sm`.
- `text-neutral-600`, `text-slate-500`, or `text-zinc-400`.

Hints:

- `text-xs`.
- `text-neutral-400`, `text-slate-400`, or `text-zinc-500`.

Avoid:

- Too many font sizes.
- Excessive `font-black`.
- Colorful text everywhere.
- Large centered text blocks in operational pages.

## Color

Use:

- White.
- Black/gray.
- Emerald/teal as brand color.
- Amber sparingly.
- Cyan/rose only for paired competition/status.

Brand color is only for:

- CTA.
- Active states.
- Links.
- Key status.
- Important values.

Avoid:

- Purple AI style.
- Rainbow palettes.
- High-saturation backgrounds.
- More than two accent colors in one view.
- Decorative gradients that do not carry product meaning.

## Light / Dark Mode

Every new component must consider both themes unless it lives inside a clearly single-theme game canvas or legacy surface.

Dark mode:

- Page backgrounds: `#080808`, `#090909`, `#0f1013`, or existing `rdark` tokens.
- Cards: `bg-[#0f1013]`, `bg-[#101114]`, `dark:bg-rdark-card`.
- Inputs: `bg-[#111215]`, `bg-[#141518]`, `dark:bg-rdark-input`.
- Borders: `border-white/8`, `dark:border-rdark-border`.
- Titles: `text-white`, `dark:text-rdark-text`.
- Body: `text-zinc-300` or `text-zinc-400`.
- Hints: `text-zinc-500`, `dark:text-rdark-text2`.
- Hover: subtle white overlays such as `hover:bg-white/[0.04]`.

Light mode:

- Page backgrounds: `bg-white`, `bg-slate-50`, `bg-neutral-50`.
- Cards: `bg-white`.
- Inputs: `bg-white` or `bg-slate-50`.
- Borders: `border-slate-200` or `border-neutral-200`.
- Titles: `text-slate-900` or `text-neutral-900`.
- Body: `text-slate-600` or `text-neutral-600`.
- Hints: `text-slate-400` or `text-neutral-400`.
- Hover: `hover:bg-slate-50` or `hover:border-slate-300`.

Theme rules:

- Always pair dark translucent borders with light-mode borders.
- Do not leave low contrast text in either theme.
- Brand color must be readable in both themes: emerald 600/700 in light, emerald 300/400 in dark.
- Status colors need background + text contrast, not text color alone.

## Tailwind Defaults

Prefer:

- `rounded-2xl`.
- `shadow-sm`.
- `border-neutral-200`.
- `border-white/8`.
- `bg-white`.
- `bg-[#0f1013]`.
- `text-sm`.
- `text-neutral-600`.
- `transition-colors`.
- `duration-200`.

Avoid:

- `shadow-2xl`.
- Colored shadows.
- Strong gradients.
- Huge arbitrary radii unless matching existing modal style.
- Random one-off spacing.

## Components

Components must have:

- Consistent height.
- Consistent radius.
- Consistent spacing.
- Hover and disabled states where interactive.
- Clear loading and empty states when data-driven.

Buttons:

- Primary: emerald/teal.
- Secondary: quiet neutral or transparent.
- Danger: rose/red only with clear destructive meaning.

Forms:

- Label above input.
- Unified input height.
- Visible errors.
- Amount fields must show unit/context.

Tables:

- Hover rows.
- Light table header.
- Comfortable row height.
- Right-aligned actions.
- No dense border grid.

Modals:

- Reuse existing modals before creating new ones.
- Mobile can be bottom sheet; desktop centered.
- Betting and confirmation flows must not submit directly without confirmation.

## Interaction

Hover:

- Subtle.
- Smooth.
- Mostly background, border, or text-color shifts.

Animation:

- `duration-200`.
- Lightweight.
- Purposeful.

Avoid:

- Bounce.
- Long animations.
- Complex choreography.
- Animating every element.

## Page Requirements

Every page must have:

- Breathing room.
- Visual rhythm.
- Clear primary/secondary hierarchy.
- Responsive behavior.
- No information pile-up.
- No blank page after adding a route.

For this project:

- New routes must also be added to `.umirc.ts`.
- Left nav items live in `SidebarMainPanels.tsx`.
- Auxiliary actions such as guide/chat/pet space belong in business cards, not the main nav list.
- `src/pages/<route>/index.tsx` may contain page-level business logic: data fetching, state, auth checks, event callbacks, API orchestration, and prop assembly.
- `src/pages/<route>/index.tsx` must not contain large UI blocks; complex visual sections, dialogs, cards, and list items belong in that page's `components/` folder.
- Every page must have a corresponding page folder under `src/pages/<route>/`.
- Page-specific components belong under `src/pages/<route>/components/`, such as `<RoutePage>.tsx`, `<XxxSection>.tsx`, `<XxxModal>.tsx`, and `<XxxListItem>.tsx`.
- The dedicated page display component should usually live at `src/pages/<route>/components/<RoutePage>.tsx`; `index.tsx` can own page-level logic and compose that display component.
- Page-local maps, constants, and types may live in `src/pages/<route>/components/`, `src/pages/<route>/model.ts`, or `src/pages/<route>/types.ts`.
- Use `src/components/<module>/` for module-level components, and `src/components/shared/<module>/` only for components that are truly reused across pages.
- Split complex page sections into separate files in `src/pages/<route>/components/`.
- Keep page-specific data maps, cards, panels, dialogs, and lists grouped with the page module instead of scattering them across unrelated folders.
- Component props must be explicitly typed with `interface XxxProps` or `type XxxProps`; avoid large inline parameter types.
- Props must use business-meaningful names. Callbacks use `onXxx`; booleans use `is/has/can/should` prefixes.
- If a component has too many props, split the component or group related fields into a clear domain object.
- `index.tsx` or page-level components may own data fetching, state, and action orchestration; presentational child components should receive clear props and should not duplicate page-level requests.
- Every new `.tsx` file must start with a short purpose comment, preferably `/** 文件说明：xxx。 */`.
- Comments must explain what the file or complex block is for; do not add empty comments that only restate code.

## Business-Specific Guidance

Prediction / dark market:

- Prioritize event title, choices, odds, participation, and bet action.
- Betting must use a confirmation modal.
- Amount, balance, and expected payout must be clear.

Rivalry:

- Use restrained competitive styling.
- Cyan/rose may represent opposing sides.
- History and season records should be collapsible/scannable.

Pet:

- Slightly playful but still premium.
- Show equipped pet abilities structurally.
- Equip buttons should fit emerald project style.

World Cup:

- Green field and trophy cues are okay.
- Keep the global dark premium product feel.
- Avoid decorative overload.

## Strict Bans

Never create:

- AI-style UI.
- Purple tech/AI aesthetic.
- Rainbow gradients.
- Complex backgrounds.
- Excessive animation.
- Too many shadows.
- Fancy charts with no purpose.
- Glow everywhere.
- Too many icons.
- Overcrowded cards.
- Pages where every section is emphasized.

## Final Check

Before finishing UI work, verify:

- It looks like a professional SaaS/product interface.
- It belongs to this Turtle project.
- The primary action is obvious.
- Text does not overflow.
- Mobile does not horizontally scroll.
- PC layout is not just a stretched mobile layout.
- Light and dark themes both have readable backgrounds, borders, and text.
- Colors are restrained.
- Build passes when code changed.
