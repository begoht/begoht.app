# BeGO Admin Dashboard Modules

Responsibility map for `admin-dashboard.html`:

- `admin-dashboard.state.js`: shared state and environment base URL.
- `admin-dashboard.api.js`: token, user session and API helpers.
- `admin-dashboard.utils.js`: formatting, DOM helpers, charts and search helpers.
- `admin-dashboard.rows.js`: shared table row builders for trips, wallets, packages, credits and monitoring.
- `admin-dashboard.users.js`: users by responsibility, separated into passengers, drivers and admins.
- `admin-dashboard.render.js`: section renderers and dashboard refresh output.
- `admin-dashboard.finance.js`: commission, fares, wallet discount and payment methods.
- `admin-dashboard.launch.js`: launch countdown controls.
- `admin-dashboard.actions.js`: privileged mutations, withdrawals and trip reassignment.
- `admin-dashboard.core.js`: boot, navigation, events and data loading.
- `../../css/admin-dashboard.css`: dashboard-specific dark BeGO theme and user role surfaces.

The files are loaded as classic browser scripts in this order from `admin-dashboard.html`.
Keep that order unless a dependency is moved intentionally.
