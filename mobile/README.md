# FordCast mobile

See the root README for setup, evidence, and outstanding acceptance gates.

Run `npm ci` then `npm run web` for the bundled prototype. Run `npm run typecheck`,
`npm run lint`, and `npm test -- --ci` before changing behavior. Expo Doctor validates
SDK compatibility; it does not validate forecast performance or native device behavior.

Native MapLibre requires a development build. No EAS project/account is configured.
The app displays inventory and historical observations, with every unvalidated crossing
Unknown. Drive routing and push notifications are not implemented.
