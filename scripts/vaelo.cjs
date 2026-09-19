/* Copyright (c) Microsoft Corporation. MIT License. VAELO additions. */
'use strict';
try { require('../vaelo/launcher.cjs').main(require('node:path').resolve(__dirname, '..')); }
catch (error) { console.error(error.message); process.exitCode = 1; }
