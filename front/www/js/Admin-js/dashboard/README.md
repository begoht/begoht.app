# BeGO Admin Dashboard Modules

Responsibility map for `admin-dashboard.html`:

- `admin-dashboard.state.js`: shared state and environment base URL.
- `admin-dashboard.api.js`: token, user session and API helpers.
- `admin-dashboard.utils.js`: formatting, DOM helpers, charts and search helpers.
- `admin-dashboard.rows.js`: table row builders.
- `admin-dashboard.render.js`: section renderers and dashboard refresh output.
- `admin-dashboard.finance.js`: commission, fares, wallet discount and payment methods.
- `admin-dashboard.launch.js`: launch countdown controls.
- `admin-dashboard.actions.js`: privileged mutations, withdrawals and trip reassignment.
- `admin-dashboard.core.js`: boot, navigation, events and data loading.

The files are loaded as classic browser scripts in this order from `admin-dashboard.html`.
Keep that order unless a dependency is moved intentionally.
