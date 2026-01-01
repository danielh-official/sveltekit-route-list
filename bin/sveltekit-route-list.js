#!/usr/bin/env node

import { readdir, stat, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { dirname } from 'path';

const ROUTE_FILES = ['+page.svelte', '+page.server.ts', '+page.server.js', '+server.ts', '+server.js'];
const LAYOUT_FILES = ['+layout.svelte', '+layout.server.ts', '+layout.server.js'];

/**
 * Convert a file path to a route path
 * @param {string} filePath - Relative path from routes directory
 * @returns {string} - Route path
 */
function pathToRoute(filePath) {
	// Remove the filename part
	let route = dirname(filePath);
	
	// Replace Windows backslashes with forward slashes
	route = route.replace(/\\/g, '/');
	
	// Handle root route
	if (route === '.' || route === '') {
		return '/';
	}
	
	// Convert dynamic segments
	route = route
		.replace(/\[\.\.\.(\w+)\]/g, ':$1*')  // [...rest] -> :rest*
		.replace(/\[\[(\w+)\]\]/g, ':$1?')     // [[optional]] -> :optional?
		.replace(/\[(\w+)\]/g, ':$1');         // [param] -> :param
	
	return '/' + route;
}

/**
 * Extract HTTP methods from a server file
 * @param {string} filePath - Full path to the server file
 * @returns {Promise<string[]>} - Array of HTTP methods
 */
async function extractMethods(filePath) {
	try {
		const content = await readFile(filePath, 'utf-8');
		const methods = [];
		
		// Look for exported functions like: export function GET, export const POST, etc.
		const methodRegex = /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/g;
		let match;
		
		while ((match = methodRegex.exec(content)) !== null) {
			methods.push(match[1]);
		}
		
		return methods.length > 0 ? methods : ['GET'];
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (error) {
		return ['GET'];
	}
}

/**
 * Recursively scan directory for route files
 * @param {string} dir - Directory to scan
 * @param {string} baseDir - Base routes directory
 * @param {Array} routes - Accumulator for routes
 */
async function scanRoutes(dir, baseDir, routes = []) {
	const entries = await readdir(dir, { withFileTypes: true });
	
	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		
		if (entry.isDirectory()) {
			// Skip special directories
			if (entry.name.startsWith('_') || entry.name.startsWith('.')) {
				continue;
			}
			
			await scanRoutes(fullPath, baseDir, routes);
		} else if (entry.isFile()) {
			const relativePath = relative(baseDir, fullPath);
			
			// Check if it's a page file
			if (ROUTE_FILES.includes(entry.name)) {
				const route = pathToRoute(relativePath);
				let methods = ['GET'];
				let type = 'page';
				
				// If it's a server file, extract methods
				if (entry.name.includes('server') || entry.name === '+server.ts' || entry.name === '+server.js') {
					methods = await extractMethods(fullPath);
					type = entry.name.startsWith('+server') ? 'endpoint' : 'page';
				}
				
				// Check if route already exists (e.g., both +page.svelte and +page.server.ts)
				const existingRoute = routes.find(r => r.path === route);
				if (existingRoute) {
					// Merge methods if it's a server file
					if (methods.length > 0 && methods[0] !== 'GET') {
						existingRoute.methods = [...new Set([...existingRoute.methods, ...methods])];
					}
					existingRoute.files.push(entry.name);
				} else {
					routes.push({
						methods,
						path: route,
						type,
						files: [entry.name],
						location: relativePath
					});
				}
			}
			
			// Check if it's a layout file
			if (LAYOUT_FILES.includes(entry.name)) {
				const route = pathToRoute(relativePath);
				let methods = [];
				
				if (entry.name.includes('server')) {
					methods = await extractMethods(fullPath);
				}
				
				const existingLayout = routes.find(r => r.path === route && r.type === 'layout');
				if (existingLayout) {
					if (methods.length > 0) {
						existingLayout.methods = [...new Set([...existingLayout.methods, ...methods])];
					}
					existingLayout.files.push(entry.name);
				} else {
					routes.push({
						methods: methods.length > 0 ? methods : [],
						path: route,
						type: 'layout',
						files: [entry.name],
						location: relativePath
					});
				}
			}
		}
	}
	
	return routes;
}

/**
 * Format routes as a table
 * @param {Array} routes - Array of route objects
 */
function formatTable(routes) {
	// Sort routes by path
	routes.sort((a, b) => {
		// Pages first, then endpoints, then layouts
		const typeOrder = { page: 0, endpoint: 1, layout: 2 };
		const typeCompare = typeOrder[a.type] - typeOrder[b.type];
		if (typeCompare !== 0) return typeCompare;
		
		return a.path.localeCompare(b.path);
	});
	
	// Calculate column widths
	const methodsWidth = Math.max(10, ...routes.map(r => r.methods.join('|').length));
	const pathWidth = Math.max(10, ...routes.map(r => r.path.length));
	const typeWidth = Math.max(8, ...routes.map(r => r.type.length));
	const filesWidth = Math.max(15, ...routes.map(r => r.files.join(', ').length));
	
	// Print header
	console.log('\n┌─' + '─'.repeat(methodsWidth) + '─┬─' + '─'.repeat(pathWidth) + '─┬─' + '─'.repeat(typeWidth) + '─┬─' + '─'.repeat(filesWidth) + '─┐');
	console.log('│ ' + 'Methods'.padEnd(methodsWidth) + ' │ ' + 'Path'.padEnd(pathWidth) + ' │ ' + 'Type'.padEnd(typeWidth) + ' │ ' + 'Files'.padEnd(filesWidth) + ' │');
	console.log('├─' + '─'.repeat(methodsWidth) + '─┼─' + '─'.repeat(pathWidth) + '─┼─' + '─'.repeat(typeWidth) + '─┼─' + '─'.repeat(filesWidth) + '─┤');
	
	// Print routes
	routes.forEach(route => {
		const methods = route.methods.length > 0 ? route.methods.join('|') : '-';
		const files = route.files.join(', ');
		
		console.log('│ ' + methods.padEnd(methodsWidth) + ' │ ' + route.path.padEnd(pathWidth) + ' │ ' + route.type.padEnd(typeWidth) + ' │ ' + files.padEnd(filesWidth) + ' │');
	});
	
	console.log('└─' + '─'.repeat(methodsWidth) + '─┴─' + '─'.repeat(pathWidth) + '─┴─' + '─'.repeat(typeWidth) + '─┴─' + '─'.repeat(filesWidth) + '─┘');
	console.log(`\nTotal routes: ${routes.filter(r => r.type !== 'layout').length}`);
	console.log(`Total layouts: ${routes.filter(r => r.type === 'layout').length}\n`);
}

/**
 * Main function
 */
async function main() {
	const args = process.argv.slice(2);
	const routesDir = args[0] || join(process.cwd(), 'src', 'routes');
	
	try {
		const stats = await stat(routesDir);
		
		if (!stats.isDirectory()) {
			console.error(`Error: ${routesDir} is not a directory`);
			process.exit(1);
		}
		
		console.log(`Scanning routes in: ${routesDir}\n`);
		
		const routes = await scanRoutes(routesDir, routesDir);
		
		if (routes.length === 0) {
			console.log('No routes found.');
			return;
		}
		
		formatTable(routes);
		
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.error(`Error: Directory not found: ${routesDir}`);
			console.error('Usage: node route-list.js [path/to/routes]');
		} else {
			console.error('Error:', error.message);
		}
		process.exit(1);
	}
}

main();
