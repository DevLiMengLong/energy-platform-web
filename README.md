# energy-platform-web

Portal shell and micro frontends for the energy platform.

## Scope

- `apps/portal`: portal shell, authentication entry, workspace layout, and micro frontend container.
- `apps/platform-admin`: platform management micro frontend.
- `apps/basic-info`: basic information micro frontend.
- `packages/shared`: shared API client, route contracts, types, and UI helpers.

## Architecture Constraints

- The first release uses Portal Shell + micro frontend architecture.
- Subsystems must be independently mountable under the portal.
- Cross-subsystem integration should use route contracts, shared auth context, and backend APIs.

## Runtime Targets

- Node.js 22+
- npm workspaces
- Vue 3 + Vite
