Frontend dev environment notes
===============================

Use Node LTS 18 or 20 for local development to avoid issues with react-scripts/fork-ts-checker-webpack-plugin on very new Node versions (eg Node 22) which can cause RPC/IPC errors such as ``RpcIpcMessagePortClosedError``.

Quick setup:

1. Install Node via nvm (Node Version Manager):
   - nvm install 18
   - nvm use 18

2. Install packages and run dev server (from `frontend-web`):
   - npm ci
   - npm start

If you see an IPC error from fork-ts-checker (message port closed), switch to Node 18 and re-install packages. If the issue persists, clear node_modules and reinstall:

   - rm -rf node_modules package-lock.json
   - npm ci

Optional: You can set .nvmrc to auto-select node version with `nvm use`.

Notes:
 - We recommend keeping Node at LTS versions (18/20) for development and CI to ensure compatibility with dependencies like `react-scripts` and `fork-ts-checker-webpack-plugin`.
 - Upgrading `react-scripts` or `fork-ts-checker-webpack-plugin` might restore newer Node compatibility but may require additional testing.
