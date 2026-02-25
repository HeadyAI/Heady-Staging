/**
 * Heady Graceful Shutdown — Clean lifecycle management
 * Handles SIGTERM, SIGINT, uncaught exceptions, and unhandled rejections.
 * Drains connections, flushes caches, and logs cleanly before exit.
 */

const shutdownHandlers = [];
let isShuttingDown = false;

/**
 * Register a cleanup handler to run during shutdown
 * @param {string} name - handler name for logging
 * @param {Function} fn - async cleanup function
 */
function onShutdown(name, fn) {
    shutdownHandlers.push({ name, fn });
}

/**
 * Execute all shutdown handlers in reverse registration order
 * @param {string} signal - the signal that triggered shutdown
 */
async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n🛑 [Heady] Graceful shutdown initiated (${signal})`);
    const start = Date.now();

    // Run handlers in reverse order (LIFO — most recently registered first)
    for (let i = shutdownHandlers.length - 1; i >= 0; i--) {
        const { name, fn } = shutdownHandlers[i];
        try {
            console.log(`  ↳ Shutting down: ${name}...`);
            await Promise.race([
                fn(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
            ]);
            console.log(`  ✓ ${name} shut down cleanly`);
        } catch (err) {
            console.error(`  ✗ ${name} shutdown error: ${err.message}`);
        }
    }

    const elapsed = Date.now() - start;
    console.log(`🛑 [Heady] Shutdown complete in ${elapsed}ms\n`);
    process.exit(0);
}

/**
 * Install global signal and error handlers
 * Call this once at app startup.
 */
function installShutdownHooks() {
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
        console.error('💥 [Heady] Uncaught Exception:', err.message);
        console.error(err.stack);
        gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        console.error('💥 [Heady] Unhandled Rejection:', reason);
        gracefulShutdown('unhandledRejection');
    });

    console.log('  ∞ Graceful Shutdown Hooks: INSTALLED');
}

module.exports = { onShutdown, gracefulShutdown, installShutdownHooks, isShuttingDown: () => isShuttingDown };
