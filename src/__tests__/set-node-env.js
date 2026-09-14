// src/__tests__/set-node-env.js
// Must run before any React module is required.
// In this sandbox environment NODE_ENV is "production" even inside Jest,
// which causes react.development.js to skip exporting `act`.
// Setting it to "test" here (before the module registry is populated) fixes that.
'use strict';
process.env.NODE_ENV = 'test';
