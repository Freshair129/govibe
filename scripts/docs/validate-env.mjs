import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const workspaceDir = process.cwd();
const globalDir = path.join(os.homedir(), '.govibe');

async function checkExists(p, isDirectory = false) {
    try {
        const stat = await fs.stat(p);
        if (isDirectory && !stat.isDirectory()) {
            return { exists: false, error: `${p} exists but is not a directory` };
        }
        if (!isDirectory && !stat.isFile()) {
            return { exists: false, error: `${p} exists but is not a file` };
        }
        return { exists: true };
    } catch (err) {
        return { exists: false, error: `${p} is missing` };
    }
}

async function validateEnv() {
    if (process.env.CI) {
        console.log('🤖 CI environment detected. Skipping local environment structure validation.');
        process.exit(0);
    }

    let failed = false;
    const errors = [];

    console.log('🔍 Validating GoVibe Environment Structure...');

    // 1. Global Checks
    const globalProfile = path.join(globalDir, 'machine_profile.json');
    const globalCheck = await checkExists(globalProfile);
    if (!globalCheck.exists) {
        errors.push(`[GLOBAL] Missing machine profile: ${globalCheck.error}`);
        failed = true;
    } else {
        console.log('✅ [GLOBAL] machine_profile.json verified.');
    }

    // 2. Local Workspace .govibe/ Checks
    const brainDir = path.join(workspaceDir, '.govibe', 'brain');
    const requiredBrainPaths = [
        { path: brainDir, isDir: true },
        { path: path.join(brainDir, 'skills'), isDir: true },
        { path: path.join(brainDir, 'rca'), isDir: true },
        { path: path.join(brainDir, 'sessions'), isDir: true },
        { path: path.join(brainDir, 'MEMORY.md'), isDir: false },
    ];

    for (const item of requiredBrainPaths) {
        const check = await checkExists(item.path, item.isDir);
        if (!check.exists) {
            errors.push(`[WORKSPACE] Brain component missing: ${check.error}`);
            failed = true;
        }
    }
    if (!failed) console.log('✅ [WORKSPACE] .govibe/brain/ verified.');

    // 3. Local Model Checks
    const localModelDir = path.join(workspaceDir, 'local_model');
    const scannedModelsJson = path.join(localModelDir, 'auto_scanned_models.json');
    const modelCheck = await checkExists(scannedModelsJson);
    if (!modelCheck.exists) {
        errors.push(`[WORKSPACE] Missing model state: ${modelCheck.error}`);
        failed = true;
    } else {
        console.log('✅ [WORKSPACE] local_model/ verified.');
    }

    // 4. Knowledge Block Checks
    const kBlockDir = path.join(workspaceDir, '.govibe-knowledge-block');
    const subdirs = ['adr', 'api', 'architecture', 'data-model', 'domain', 'feature', 'report', 'spec', 'templates'];
    const requiredKBlockPaths = [
        { path: path.join(kBlockDir, 'SCHEMA.md'), isDir: false }
    ];
    for (const sub of subdirs) {
        requiredKBlockPaths.push({ path: path.join(kBlockDir, sub), isDir: true });
    }

    for (const item of requiredKBlockPaths) {
        const check = await checkExists(item.path, item.isDir);
        if (!check.exists) {
            errors.push(`[WORKSPACE] Knowledge Block missing: ${check.error}`);
            failed = true;
        }
    }
    if (!failed) console.log('✅ [WORKSPACE] .govibe-knowledge-block/ verified.');

    // 5. Git Governance check
    const gitignorePath = path.join(workspaceDir, '.gitignore');
    try {
        const gitignore = await fs.readFile(gitignorePath, 'utf8');
        if (!gitignore.includes('.govibe/brain/')) {
            errors.push('[GIT] .gitignore is missing rule to exclude local memory: .govibe/brain/');
            failed = true;
        }
        if (!gitignore.includes('local_model/')) {
            errors.push('[GIT] .gitignore is missing rule to exclude local models: local_model/');
            failed = true;
        }
        if (!failed) console.log('✅ [GIT] .gitignore rules verified.');
    } catch (err) {
        errors.push(`[GIT] Missing .gitignore file: ${err.message}`);
        failed = true;
    }

    // Output results
    console.log('\n--- Validation Result ---');
    if (failed) {
        console.error('❌ Environment validation failed! Found structural issues:');
        errors.forEach(err => console.error(`  - ${err}`));
        process.exit(1);
    } else {
        console.log('🎉 Environment conforms to GoVibe Directory Governance Standard!');
        process.exit(0);
    }
}

validateEnv().catch(console.error);
