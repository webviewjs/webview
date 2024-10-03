import { execSync } from 'node:child_process';
import { copyFileSync, constants, writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { execPath } from 'node:process'

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const NODE_SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

const filename = (path) => path.split(sep).pop();

function writeSeaConfig(main, dest, resources) {
    const config = {
        main,
        output: join(dirname(dest), 'sea-prep.blob'),
        disableExperimentalSEAWarning: true,
        assets: resources
    };

    writeFileSync(dest, JSON.stringify(config, null, 2));
}

function run(command, args) {
    const cmd = !args?.length ? command : `${command} ${args.join(' ')}`;
    execSync(cmd, { stdio: 'inherit' });
}

function generateBlob(configPath) {
    run('node', ['--experimental-sea-config', configPath])

    return join(dirname(configPath), 'sea-prep.blob');
}

function copyNode(output, name) {
    const ext = isWindows ? '.exe' : '';
    const f = join(output, name + ext);
    copyFileSync(execPath, f, constants.COPYFILE_FICLONE);

    return f;
}

function removeSignature(path) {
    if (!isWindows && !isMac) return;

    if (isWindows) {
        try {
            run('signtool remove /s ' + path)
        } catch (e) {
            console.warn(`Failed to remove signature: ${e.message}`)
        }
    } else {
        run('codesign --remove-signature ' + path)
    }
}

function injectFuse(target, blob) {
    let args;

    if (isMac) {
        args = [`"${target}"`, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', NODE_SEA_FUSE, '--macho-segment-name', 'NODE_SEA'];
    } else {
        args = [target, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', NODE_SEA_FUSE];
    }

    run('npx', ['--yes', 'postject', ...args])
}

function sign(bin) {
    if (isWindows) {
        try {
            run('signtool', ['sign', '/fd', 'SHA256', bin])
        } catch (e) {
            console.warn(`Failed to sign: ${e.message}`)
        }
    } else if (isMac) {
        run('codesign', ['--sign', '-', bin])
    }
}

export function build(input, output, name, resources) {
    if (!existsSync(input)) {
        throw new Error('Input file does not exist');
    }

    if (resources && !existsSync(resources)) {
        throw new Error('Resources file does not exist');
    }

    if (!existsSync(output)) {
        mkdirSync(output, { recursive: true });
    }

    const assets = JSON.parse(readFileSync(resources, 'utf-8'));
    const configPath = join(output, 'sea-config.json');
    const execPath = copyNode(output, name);

    writeSeaConfig(input, configPath, assets);
    const blob = generateBlob(configPath);
    removeSignature(execPath);
    injectFuse(execPath, blob);
    sign(execPath);

    return execPath;
}