import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import yaml from 'js-yaml';
import { updatedConfig } from '../utils/templates/astro/astroConfig.js';
import { pagesWorkflow } from '../utils/templates/workflow/pagesWorkflow.js';
import { buildArtifacts } from '../utils/templates/workflow/buildArtifacts.js';
import { wranglerConfig } from '../utils/templates/wranglerConfig.js';
import Logger from '../utils/logger.js';
import Spinner from '../utils/spinner.js';
/**
 * Run the `npm create astro@latest` command to create a new Astro project.
 * @param {string} appDir - The directory where the project will be created.
 * @param {string} projectName - The name of the new project.
 * @returns {Promise} - A promise that resolves when process exits.
 * */
async function runAstroCreate(appDir, projectName) {
  return new Promise((resolve, reject) => {
    const astroProcess = spawn(
      'npm',
      [
        'create',
        'astro@latest',
        projectName,
        '--',
        '--template',
        'basics',
        '--no-git',
        '--install',
        '--add',
        'cloudflare',
        '--yes',
      ],
      {
        cwd: appDir,
        stdio: 'pipe',
        shell: true,
      },
    );

    astroProcess.on('error', (error) => reject(new Error(error.message)));
    astroProcess.on('exit', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`Astro project creation process failed with code ${code}`),
        );
    });
  });
}

/**
 * Get the directory of the newly created project.
 * @param {string} appDir - The root directory where the project is created.
 * @returns {Promise<string>} - The full path of the most recently created project directory.
 * @throws {Error} If no project directories are found.
 */
async function getCreatedProjectDir(appDir) {
  const projectRoot = path.join(appDir);
  const directories = fs
    .readdirSync(projectRoot)
    .filter((subdir) =>
      fs.lstatSync(path.join(projectRoot, subdir)).isDirectory(),
    );

  if (directories.length === 0) {
    throw new Error('No project directories found in the specified location.');
  }

  const sortedDirectories = directories
    .map((dir) => ({
      name: dir,
      modifiedTime: fs.statSync(path.join(projectRoot, dir)).mtime.getTime(),
    }))
    .sort((a, b) => b.modifiedTime - a.modifiedTime);

  return path.join(projectRoot, sortedDirectories[0].name);
}

/**
 * Update the Astro configuration file with Cloudflare integration.
 * @param {string} projectDir - The directory of the Astro project.
 * @throws {Error} If failed to update Astro configuration.
 */
function updateAstroConfig(projectDir) {
  const configFilePath = path.join(projectDir, 'astro.config.mjs');
  const configContent = `
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';${updatedConfig}
`;
  try {
    fs.writeFileSync(configFilePath, configContent, 'utf-8');
    Logger.info('Configuration updated successfully!');
    return true;
  } catch (error) {
    throw new Error(`Failed to update Astro configuration: ${error.message}`);
  }
}

/**
 * Update the `preview` script in the `package.json` file.
 * @param {string} projectDir - The directory of the Astro project.
 * @throws {Error} If failed to update `package.json` file.
 */
function updatePreviewScript(projectDir) {
  const packageJsonPath = path.join(projectDir, 'package.json');

  const previewCommand =
    'wrangler pages dev --persist-to=../../.wrangler/.test/state';

  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts.preview = previewCommand;

    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      'utf-8',
    );
    Logger.info('Preview script updated successfully!');
    return true;
  } catch (error) {
    throw new Error(`Failed to update package.json.`);
  }
}

/**
 * Update the GitHub Actions workflow for deploying the project.
 * @param {string} rootDir - The root directory of the project.
 * @param {string} projectDir - The directory of the Astro project.
 * @throws {Error} If failed to update workflow script.
 */
function updateWorkflowScript(rootDir, projectDir) {
  const workflowPath = path.join(rootDir, '.github', 'workflows', 'deploy.yml');
  const projectName = path.basename(projectDir);
  const workflowContent = pagesWorkflow(projectName);
  const buildSteps = buildArtifacts(projectName);

  try {
    const workflowContentRaw = fs.readFileSync(workflowPath, 'utf-8');
    const existingWorkflow = yaml.load(workflowContentRaw);

    const deployJobName = `deploy_${projectName}`;

    existingWorkflow.jobs[deployJobName] = workflowContent;

    if (existingWorkflow.jobs.build) {
      existingWorkflow.jobs.build.steps.push(buildSteps);
    } else {
      existingWorkflow.jobs.build = { steps: [buildSteps] };
    }

    fs.writeFileSync(workflowPath, yaml.dump(existingWorkflow), 'utf-8');
    Logger.info('Workflow script updated successfully!');
    return true;
  } catch (error) {
    throw new Error(`Failed to update workflow script.`);
  }
}

/**
 * Install the `wrangler` package in the project.
 * @param {string} rootDir - The root directory of the project.
 * @param {Spinner} spinner - The spinner instance.
 * @throws {Error} If failed to install wrangler.
 */
const installWranglerPkg = (projectDir, spinner) => {
  return new Promise((resolve, reject) => {
    try {
      spinner.start('🌤️ Installing wrangler...');

      const addWranglerProcess = spawn(
        `npm`,
        ['add', 'wrangler', '--save-dev'],
        {
          cwd: projectDir,
          stdio: 'pipe',
          shell: true,
          env: { ...process.env },
        },
      );

      addWranglerProcess.stderr.on('data', (data) => {
        Logger.warn(`Unexpected output: ${data.toString()}`);
      });

      addWranglerProcess.on('error', (error) => {
        reject(new Error(`Process spawn error: ${error.message}`));
      });

      addWranglerProcess.on('exit', (code) => {
        spinner.stop();
        if (code === 0) {
          Logger.info('Wrangler installed successfully!');
          resolve();
        } else {
          reject(new Error(`Wrangler installation exited with code ${code}`));
        }
      });
    } catch (error) {
      spinner.stop();
      reject(new Error(`Failed to install wrangler: ${error.message}`));
    }
  });
};

/**
 * Configure wrangler.config.json file to the project.
 * @param {string} rootDir - The root directory of the project.
 * @throws {Error} If failed to configure wrangler.config.json file.
 */
const addWranflerConfig = (projectDir) => {
  const wranglerConfigFilePath = path.join(projectDir, 'wrangler.config.json');
  try {
    const projectName = path.basename(projectDir);
    const wranglerConfigContent = wranglerConfig(projectName);

    fs.writeFileSync(
      wranglerConfigFilePath,
      JSON.stringify(wranglerConfigContent, null, 2),
      'utf-8',
    );
    Logger.info('Wrangler config added successfully!');
    return true;
  } catch (error) {
    throw new Error(`Failed to add wrangler.config.json.`);
  }
};
/**
 * Create a new Astro project with flarekit configurations.
 * @param {string} rootDir - The root directory for the project.
 * @throws {Error} If failed to create project.
 */
export async function addAstroProject(rootDir) {
  const spinner = new Spinner();
  const appDir = path.join(rootDir, 'apps');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = (query) =>
    new Promise((resolve) =>
      rl.question(query, (prompt) =>
        resolve(prompt.trim().replace(/\s+/g, '-').toLowerCase()),
      ),
    );

  try {
    const projectName = await promptUser('\n📝 Enter the project name: ');
    rl.close();

    const projectPath = path.join(appDir, projectName);

    if (fs.existsSync(projectPath)) {
      throw new Error(`Project with name "${projectName}" already exists.`);
    }

    spinner.start('🔥 Creating your Astro app...');
    await runAstroCreate(appDir, projectName);
    spinner.stop();

    const projectDir = await getCreatedProjectDir(appDir);
    updateAstroConfig(projectDir);
    await installWranglerPkg(projectDir, spinner);
    addWranflerConfig(projectDir);
    updatePreviewScript(projectDir);
    updateWorkflowScript(rootDir, projectDir);

    Logger.success('Astro project created and configured successfully!');
    return projectDir;
  } catch (error) {
    spinner.stop();
    console.error(`\nError: ${error.message}`);
    throw error;
  }
}
