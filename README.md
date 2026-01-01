# sveltekit-route-list

A CLI tool to view and analyze all routes in your SvelteKit application.

## Installation

### Global Installation
```bash
npm install -g sveltekit-route-list
```

### Local Installation (Dev Dependency)
```bash
npm install --save-dev sveltekit-route-list
```

## Usage

Run the command in your SvelteKit project root:

```bash
sveltekit-route-list
```

Or specify a custom routes directory:

```bash
sveltekit-route-list path/to/your/routes
```

If installed locally, add to your `package.json` scripts:

```json
{
  "scripts": {
    "routes": "sveltekit-route-list"
  }
}
```

Then run:
```bash
npm run routes
```

## Features

- 📋 Lists all pages, endpoints, and layouts
- 🔄 Shows HTTP methods for API endpoints
- 📁 Displays file types (+page.svelte, +server.ts, etc.)
- 🎯 Handles dynamic routes ([param], [...rest], [[optional]])
- 📊 Beautiful table output with route statistics

## Output Example

```
Scanning routes in: /your-project/src/routes

┌────────────┬──────────────┬──────────┬───────────────────┐
│ Methods    │ Path         │ Type     │ Files             │
├────────────┼──────────────┼──────────┼───────────────────┤
│ GET        │ /            │ page     │ +page.svelte      │
│ GET        │ /about       │ page     │ +page.svelte      │
│ GET|POST   │ /api/users   │ endpoint │ +server.ts        │
│ GET        │ /blog/:slug  │ page     │ +page.svelte      │
└────────────┴──────────────┴──────────┴───────────────────┘

Total routes: 4
Total layouts: 1
```

## Supported Route Types

- `+page.svelte` - Page components
- `+page.server.ts/js` - Page server load functions
- `+server.ts/js` - API endpoints
- `+layout.svelte` - Layout components
- `+layout.server.ts/js` - Layout server functions

## Dynamic Routes

The tool automatically converts SvelteKit route syntax:
- `[param]` → `:param` (required parameter)
- `[[optional]]` → `:optional?` (optional parameter)
- `[...rest]` → `:rest*` (rest parameter)

## Requirements

- Node.js >= 14.0.0
- A SvelteKit project

## License

MIT
