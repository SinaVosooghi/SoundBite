#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

/**
 * Script to lint and test only changed files
 * This script is used by Husky pre-commit hooks to optimize CI/CD performance
 */

function getChangedFiles() {
  try {
    // Get staged files that are TypeScript or JavaScript
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACMR', { 
      encoding: 'utf8' 
    }).trim().split('\n').filter(Boolean);
    
    // Filter for TypeScript and JavaScript files
    const relevantFiles = stagedFiles.filter(file => 
      file.match(/\.(ts|js|tsx|jsx)$/) && 
      !file.includes('node_modules') &&
      !file.includes('dist/') &&
      !file.includes('build/')
    );
    
    return relevantFiles;
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

function runLintOnFiles(files) {
  if (files.length === 0) {
    console.log('✅ No TypeScript/JavaScript files to lint');
    return true;
  }

  console.log(`🔍 Linting ${files.length} changed file(s):`);
  files.forEach(file => console.log(`  - ${file}`));

  try {
    // Run ESLint on changed files
    const filesStr = files.join(' ');
    execSync(`npx eslint ${filesStr} --fix`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Linting passed');
    return true;
  } catch (error) {
    console.error('❌ Linting failed');
    return false;
  }
}

function runTestsOnFiles(files) {
  if (files.length === 0) {
    console.log('✅ No files to test');
    return true;
  }

  // Find test files related to changed files
  const testFiles = files
    .map(file => {
      // Convert src/file.ts to test/file.spec.ts or test/file.e2e-spec.ts
      const testPath = file.replace(/^src\//, 'test/').replace(/\.ts$/, '.spec.ts');
      const e2eTestPath = file.replace(/^src\//, 'test/').replace(/\.ts$/, '.e2e-spec.ts');
      return [testPath, e2eTestPath];
    })
    .flat()
    .filter(testFile => {
      try {
        execSync(`test -f ${testFile}`, { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    });

  if (testFiles.length === 0) {
    console.log('✅ No related test files found');
    return true;
  }

  console.log(`🧪 Running tests for ${testFiles.length} test file(s):`);
  testFiles.forEach(file => console.log(`  - ${file}`));

  try {
    // Run Jest on specific test files
    const testFilesStr = testFiles.join(' ');
    execSync(`npx jest ${testFilesStr} --passWithNoTests`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Tests passed');
    return true;
  } catch (error) {
    console.error('❌ Tests failed');
    return false;
  }
}

function main() {
  console.log('🚀 Running pre-commit checks on changed files...\n');
  
  const changedFiles = getChangedFiles();
  
  if (changedFiles.length === 0) {
    console.log('✅ No relevant files changed, skipping checks');
    process.exit(0);
  }

  const lintPassed = runLintOnFiles(changedFiles);
  const testsPassed = runTestsOnFiles(changedFiles);

  if (lintPassed && testsPassed) {
    console.log('\n✅ All pre-commit checks passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Pre-commit checks failed. Please fix the issues above.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { getChangedFiles, runLintOnFiles, runTestsOnFiles };

