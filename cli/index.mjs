#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { parseArgs, styleText } from 'node:util'
import { join } from 'node:path';
import { stripIndents } from './utils.mjs';
import { build } from './build.mjs';

async function readPackageJSON() {
    const packageJSON = await readFile(join(import.meta.dirname, '..', 'package.json'), 'utf-8');
    return JSON.parse(packageJSON);
}

const { version, description, main } = await readPackageJSON();

const options = {
    help: { type: 'boolean', short: 'h', description: 'Show help' },
    version: { type: 'boolean', short: 'v', description: 'Show version' },
    build: {
        type: 'boolean',
        short: 'b',
        description: 'Build the project',
    },
    name: {
        type: 'string',
        short: 'n',
        default: 'webviewjs',
        description: 'Project name',
    },
    output: {
        type: 'string',
        short: 'o',
        default: join(process.cwd(), 'dist'),
        description: 'Output directory',
    },
    input: {
        type: 'string',
        short: 'i',
        default: join(process.cwd(), main),
        description: 'Entry file',
    },
    resources: {
        type: 'string',
        short: 'r',
        description: 'Resources mapping json file path'
    },
    'dry-run': {
        type: 'boolean',
        short: 'd',
        description: 'Dry run',
    }
};

const args = parseArgs({
    strict: true,
    args: process.argv.slice(2),
    options
});

let stdErr = false;


const logger = (message) => {
    console.log(message);
    process.exit(+stdErr);
}

const defaultValuesOptionNames = new Set(Object.keys(options).filter(k => !!options[k].default));

if (!Object.keys(args.values).filter(k => !defaultValuesOptionNames.has(k)).length) {
    args.values.help = true;
    stdErr = true;
}

if (args.values.help) {
    const message = stripIndents`WebviewJS: ${styleText('greenBright', description)}
    
    ${styleText('dim', 'Usage:')} ${styleText('greenBright', 'webview [options]')}
    
    ${styleText('dim', 'Options:')}
${Object.entries(options).map(([name, { short, default: defaultValue, type }]) => {
        const msg = `    ${styleText('greenBright', `  -${short}, --${name}`)} - ${styleText('dim', options[name].description || `${type} option`)}`;

        if (defaultValue) {
            return `${msg} (default: ${styleText('blueBright', defaultValue)})`;
        }

        return msg;
    }).join('\n')}
    `;

    logger(message);
} else if (args.values.version) {
    logger(`- WebviewJS v${version}\n- Node.js ${process.version}\n- Operating System: ${process.platform} ${process.arch}`);
} else if (args.values.build) {
    const isDry = !!args.values['dry-run'];
    const { output, input, resources } = args.values;

    if (isDry) {
        logger(`Dry run: building ${input} to ${output}`);
    } else {
        const projectName = args.values.name || 'webviewjs';
        const target = build(input, output, prettify(projectName), resources);
        logger(styleText('greenBright', `\nBuilt ${input} to ${target}. You can now run the executable using ${styleText(['cyanBright', 'bold'], target)}`));
    }
}

function prettify(str) {
    // remove stuff like @, /, whitespace, etc
    return str.replace(/[^a-zA-Z0-9]/g, '');
}