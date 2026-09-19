# VAELO Setup Guide — macOS

This guide explains how to set up, compile, run, and package **VAELO** on macOS.

## Prerequisites

Make sure **Homebrew** is already installed on your Mac.

## 1. Install FNM and Node.js

Install **Fast Node Manager (FNM)**:

```bash
brew install fnm
```

Initialize FNM for the current Zsh terminal session:

```bash
eval "$(fnm env --shell zsh)"
```

Install the required Node.js version:

```bash
fnm install 24.18.0
```

Activate Node.js 24.18.0:

```bash
fnm use 24.18.0
```

You can verify the active Node.js version with:

```bash
node --version
```

It should show:

```text
v24.18.0
```

## 2. Check the VAELO Environment

From the root directory of the VAELO project, run:

```bash
node scripts/vaelo.cjs doctor
```

Make sure the environment check succeeds before continuing.

## 3. Install VAELO Dependencies

Run:

```bash
node scripts/vaelo.cjs install
```

Wait until this command completes successfully before proceeding.

## 4. Compile VAELO

Run:

```bash
node scripts/vaelo.cjs compile
```

Continue only after compilation finishes successfully.

## 5. Run VAELO

Start the application with:

```bash
node scripts/vaelo.cjs run
```

## 6. Package VAELO

To build/package the application for distribution, run:

```bash
node scripts/vaelo.cjs package
```

## Complete Command Sequence

Run the commands **one at a time** and continue only when the previous command succeeds:

```bash
brew install fnm
eval "$(fnm env --shell zsh)"
fnm install 24.18.0
fnm use 24.18.0
node scripts/vaelo.cjs doctor
node scripts/vaelo.cjs install
node scripts/vaelo.cjs compile
node scripts/vaelo.cjs run
```

To package VAELO separately:

```bash
node scripts/vaelo.cjs package
```

> **Important:** Run all `node scripts/vaelo.cjs ...` commands from the VAELO project root directory.
