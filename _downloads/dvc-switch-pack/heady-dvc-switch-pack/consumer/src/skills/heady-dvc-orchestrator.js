/**
 * Heady Skill: heady-dvc-orchestrator
 * Exposes deterministic DVC data pulling and importing to HeadyConductor.
 * Version: 1.0.0
 */
const { execSync } = require('child_process');

class DvcOrchestrator {
    constructor(logger) {
        this.logger = logger || console;
    }

    pullLatentMemory() {
        this.logger.info('[Heady-DVC] Initiating latent memory sync...');
        try {
            const output = execSync('dvc pull', { encoding: 'utf-8', stdio: 'pipe' });
            this.logger.info(`[Heady-DVC] Sync complete: ${output.trim()}`);
            return { status: 'success', detail: output.trim() };
        } catch (error) {
            this.logger.error(`[Heady-DVC] Sync failed: ${error.stderr || error.message}`);
            throw new Error(`DVC pull failed: ${error.stderr || error.message}`);
        }
    }

    importDataset(registryUrl, dataPath, localPath) {
        this.logger.info(`[Heady-DVC] Importing ${dataPath} from ${registryUrl}...`);
        try {
            const cmd = `dvc import ${registryUrl} ${dataPath} -o ${localPath}`;
            const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
            this.logger.info('[Heady-DVC] Import successful.');
            return { status: 'success', detail: output.trim() };
        } catch (error) {
            this.logger.error(`[Heady-DVC] Import failed: ${error.stderr || error.message}`);
            throw new Error(`DVC import failed: ${error.stderr || error.message}`);
        }
    }

    updateImports() {
        this.logger.info('[Heady-DVC] Updating all imports to latest registry...');
        try {
            const output = execSync(
                'find data/registry -name "*.dvc" -exec dvc update {} +',
                { encoding: 'utf-8', stdio: 'pipe', shell: true }
            );
            this.logger.info('[Heady-DVC] All imports updated.');
            return { status: 'success', detail: output.trim() };
        } catch (error) {
            this.logger.error(`[Heady-DVC] Update failed: ${error.stderr || error.message}`);
            throw new Error(`DVC update failed: ${error.stderr || error.message}`);
        }
    }

    status() {
        try {
            const output = execSync('dvc status', { encoding: 'utf-8', stdio: 'pipe' });
            return { status: 'success', detail: output.trim() };
        } catch (error) {
            return { status: 'error', detail: error.stderr || error.message };
        }
    }
}

module.exports = DvcOrchestrator;
