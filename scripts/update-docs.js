#!/usr/bin/env node

/**
 * Documentation Update Script
 * 
 * This script automatically updates the living documentation system
 * by syncing current project state with AI documentation files.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  aiDocsPath: './ai-docs',
  humanDocsPath: './human-docs',
  packageJsonPath: './package.json',
  gitInfoPath: './.git',
  timestamp: new Date().toISOString()
};

/**
 * Get current project information
 */
function getProjectInfo() {
  try {
    // Get package.json info
    const packageJson = JSON.parse(fs.readFileSync(CONFIG.packageJsonPath, 'utf8'));
    
    // Get git info
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    
    // Get AWS info (if available)
    let awsInfo = {};
    try {
      const awsAccount = execSync('aws sts get-caller-identity --query Account --output text', { encoding: 'utf8' }).trim();
      const awsRegion = execSync('aws configure get region', { encoding: 'utf8' }).trim();
      awsInfo = { account: awsAccount, region: awsRegion };
    } catch (error) {
      console.log('AWS CLI not available or not configured');
    }
    
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      git: {
        branch: gitBranch,
        commit: gitCommit,
        hasChanges: gitStatus.length > 0
      },
      aws: awsInfo,
      timestamp: CONFIG.timestamp
    };
  } catch (error) {
    console.error('Error getting project info:', error.message);
    return null;
  }
}

/**
 * Update component status
 */
function updateComponentStatus(projectInfo) {
  const statusFile = path.join(CONFIG.aiDocsPath, 'tracking', 'component-status.md');
  
  if (!fs.existsSync(statusFile)) {
    console.log('Component status file not found, skipping update');
    return;
  }
  
  let content = fs.readFileSync(statusFile, 'utf8');
  
  // Update last check timestamp
  content = content.replace(
    /Last Check: \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/,
    `Last Check: ${new Date().toISOString().replace('T', ' ').replace('Z', ' UTC')}`
  );
  
  // Update git information
  content = content.replace(
    /Git Branch: master/,
    `Git Branch: ${projectInfo.git.branch}`
  );
  
  content = content.replace(
    /Git Commit: [a-f0-9]+/,
    `Git Commit: ${projectInfo.git.commit.substring(0, 8)}`
  );
  
  // Update version information
  content = content.replace(
    /Version: \d+\.\d+\.\d+/,
    `Version: ${projectInfo.version}`
  );
  
  fs.writeFileSync(statusFile, content);
  console.log('✅ Updated component status');
}

/**
 * Update performance metrics
 */
function updatePerformanceMetrics(projectInfo) {
  const metricsFile = path.join(CONFIG.aiDocsPath, 'tracking', 'performance-metrics.md');
  
  if (!fs.existsSync(metricsFile)) {
    console.log('Performance metrics file not found, skipping update');
    return;
  }
  
  let content = fs.readFileSync(metricsFile, 'utf8');
  
  // Update last update timestamp
  content = content.replace(
    /Last Updated: \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/,
    `Last Updated: ${new Date().toISOString().replace('T', ' ').replace('Z', ' UTC')}`
  );
  
  // Update version information
  content = content.replace(
    /Application Version: \d+\.\d+\.\d+/,
    `Application Version: ${projectInfo.version}`
  );
  
  fs.writeFileSync(metricsFile, content);
  console.log('✅ Updated performance metrics');
}

/**
 * Update project evolution
 */
function updateProjectEvolution(projectInfo) {
  const evolutionFile = path.join(CONFIG.aiDocsPath, 'context', 'project-evolution.md');
  
  if (!fs.existsSync(evolutionFile)) {
    console.log('Project evolution file not found, skipping update');
    return;
  }
  
  let content = fs.readFileSync(evolutionFile, 'utf8');
  
  // Add current update to evolution
  const updateEntry = `
### Current Update (${new Date().toISOString().split('T')[0]})
- **Version**: ${projectInfo.version}
- **Git Branch**: ${projectInfo.git.branch}
- **Git Commit**: ${projectInfo.git.commit.substring(0, 8)}
- **Has Changes**: ${projectInfo.git.hasChanges ? 'Yes' : 'No'}
- **AWS Account**: ${projectInfo.aws.account || 'Not configured'}
- **AWS Region**: ${projectInfo.aws.region || 'Not configured'}
- **Update Type**: Documentation automation update
`;
  
  // Insert before the last section
  const lastSectionIndex = content.lastIndexOf('## ');
  if (lastSectionIndex !== -1) {
    content = content.slice(0, lastSectionIndex) + updateEntry + '\n' + content.slice(lastSectionIndex);
  } else {
    content += updateEntry;
  }
  
  fs.writeFileSync(evolutionFile, content);
  console.log('✅ Updated project evolution');
}

/**
 * Create session context file
 */
function createSessionContext(projectInfo) {
  const sessionDir = path.join(CONFIG.aiDocsPath, 'context', 'agent-sessions');
  
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  const sessionFile = path.join(sessionDir, `${new Date().toISOString().split('T')[0]}-documentation-update.md`);
  
  const sessionContent = `# Documentation Update Session - ${new Date().toISOString().split('T')[0]}

## Session Information
- **Date**: ${new Date().toISOString()}
- **Type**: Documentation automation update
- **Trigger**: Automated script execution

## Project State
- **Name**: ${projectInfo.name}
- **Version**: ${projectInfo.version}
- **Description**: ${projectInfo.description}
- **Git Branch**: ${projectInfo.git.branch}
- **Git Commit**: ${projectInfo.git.commit}
- **Has Changes**: ${projectInfo.git.hasChanges ? 'Yes' : 'No'}

## AWS Configuration
- **Account**: ${projectInfo.aws.account || 'Not configured'}
- **Region**: ${projectInfo.aws.region || 'Not configured'}

## Updates Performed
1. ✅ Updated component status
2. ✅ Updated performance metrics
3. ✅ Updated project evolution
4. ✅ Created session context

## Next Steps
- Monitor system health
- Review updated documentation
- Plan next documentation updates
- Continue development work

## Notes
This session was automatically generated by the documentation update script.
All updates were based on current project state and configuration.
`;
  
  fs.writeFileSync(sessionFile, sessionContent);
  console.log('✅ Created session context');
}

/**
 * Main execution function
 */
function main() {
  console.log('🚀 Starting documentation update...');
  
  // Get current project information
  const projectInfo = getProjectInfo();
  if (!projectInfo) {
    console.error('❌ Failed to get project information');
    process.exit(1);
  }
  
  console.log(`📊 Project: ${projectInfo.name} v${projectInfo.version}`);
  console.log(`🌿 Git Branch: ${projectInfo.git.branch}`);
  console.log(`📝 Git Commit: ${projectInfo.git.commit.substring(0, 8)}`);
  
  // Update documentation files
  try {
    updateComponentStatus(projectInfo);
    updatePerformanceMetrics(projectInfo);
    updateProjectEvolution(projectInfo);
    createSessionContext(projectInfo);
    
    console.log('✅ Documentation update completed successfully');
  } catch (error) {
    console.error('❌ Error updating documentation:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  getProjectInfo,
  updateComponentStatus,
  updatePerformanceMetrics,
  updateProjectEvolution,
  createSessionContext
};
