# Resource actions

Code in this directory builds the actions that appear in a resource's kebab and Actions menus.

## How an action reaches a menu

A menu mounts [`ActionServiceProvider`][asp] with a context object keyed by context ID. For a
resource menu that key is the resource's `group~version~Kind` reference, for example
`apps~v1~Deployment`. [`ActionsLoader`][loader] collects every extension registered for that context
ID, calls each provider hook, concatenates the results, and applies any `console.action/filter`
registered for the same context ID. The menu renderer then orders the result using each action's
`insertBefore` and `insertAfter`.

Two extension types contribute providers, and both land in the same menu:

- `console.action/resource-provider` — keyed by a model. This is what the providers in
  [`providers/`](./providers) register as.
- `console.action/provider` — keyed by a context ID string. A plugin can pass a `group~version~Kind`
  reference here to target a resource menu.

See [console-extensions.md][ext-docs] for the extension schemas.

## The three layers

**Providers** (`providers/`) are the hooks registered in `console-extensions.json`. They take the
resource as their only argument and return `[Action[], loaded, error]`. A provider decides which
actions a resource gets and in what order.

**Action hooks** (`hooks/`) are the reusable building blocks providers compose. They are plain
exported hooks, not extensions. Most take `(kind, resource, filterActions)` and return the requested
actions keyed by creator name, so a provider can place each one individually:

```ts
const [commonActions, isReady] = useCommonActions(kindObj, resource, [
  CommonActionCreator.ModifyCount,
  CommonActionCreator.AddStorage,
] as const);
```

Pass `filterActions` as a `const` array. The returned object is typed from it, so requesting
`ModifyCount` and reading `.Delete` is a compile error.

**Action factories** (`creators/`) are plain functions for actions that need no React state. Use one
when a hook would add nothing.

### Why the action hooks are not extensions

Registering them as `console.action/provider` under invented context IDs has been considered and
rejected. The extension contract is `(scope) => [Action[], loaded, error]`: one argument, a flat
array. Providers need more than that contract can carry. They request subsets of a hook's actions,
interleave actions from several hooks into one specific order, include an action only when a runtime
predicate holds — `deployment-provider` offers `ModifyCount` only when the Deployment has no HPA —
and pass extra arguments such as a delete-modal message or an edit path. Routing these through the
extension registry would lose all of that, and would add context ID strings to the plugin API
without enabling anything a plugin cannot already do.

## Extending from a plugin

A plugin does not need anything registered here. Against a resource's `group~version~Kind` context
ID it can already:

- **add** an action, by registering `console.action/resource-provider` or `console.action/provider`
  — `knative-plugin` adds "Make Serverless" to `apps~v1~Deployment`, which it does not own;
- **position** it relative to a Console action, with `insertBefore` or `insertAfter` naming that
  action's `id`;
- **hide** a Console action, by registering `console.action/filter` that returns `false` for its
  `id`. When several filters match one context ID, an action survives if any of them returns true.

## Conventions

- **Action `id`s are API.** Filters select on them and `insertBefore`/`insertAfter` anchor to them,
  including from other packages. Renaming one silently breaks those callers; treat it as a breaking
  change.
- **Mint each action in one place.** An action duplicated across providers gets a second `id` to
  keep in sync, or the same `id` twice in one menu.
- **Return `[actions, isReady]` and have callers respect `isReady`.** Hooks return an empty object
  until the model and resource are available.

[asp]: ../../../console-shared/src/components/actions/ActionServiceProvider.tsx
[loader]: ../../../console-shared/src/components/actions/loader/ActionsLoader.tsx
[ext-docs]: ../../../console-dynamic-plugin-sdk/docs/console-extensions.md
