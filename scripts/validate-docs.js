#!/usr/bin/env node

/**
 * Documentation Validation Script
 * 
 * This script validates the documentation system for consistency,
 * completeness, and accuracy.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  aiDocsPath: './ai-docs',
  humanDocsPath: './human-docs',
  requiredFiles: [
    'ai-docs/context/project-evolution.md',
    'ai-docs/context/decision-log.md',
    'ai-docs/context/technical-debt.md',
    'ai-docs/context/learning-context.md',
    'ai-docs/tracking/component-status.md',
    'ai-docs/tracking/dependency-graph.md',
    'ai-docs/tracking/test-coverage-map.md',
    'ai-docs/tracking/performance-metrics.md',
    'ai-docs/concerns/security-concerns.md',
    'ai-docs/concerns/scalability-concerns.md',
    'ai-docs/concerns/maintainability-concerns.md',
    'ai-docs/concerns/deployment-concerns.md',
    'human-docs/getting-started/quick-start.md',
    'human-docs/getting-started/installation.md',
    'human-docs/getting-started/first-soundbite.md',
    'human-docs/architecture/system-overview.md',
    'human-docs/operations/monitoring.md'
  ]
};

/**
 * Check if file exists and is readable
 */
function validateFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File does not exist' };
    }
    
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return { valid: false, error: 'Path is not a file' };
    }
    
    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.trim().length === 0) {
      return { valid: false, error: 'File contains only whitespace' };
    }
    
    return { valid: true, size: stats.size, lines: content.split('\n').length };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate markdown structure
 */
function validateMarkdown(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for basic markdown structure
    const hasHeaders = /^#+\s/.test(content);
    const hasContent = content.trim().length > 100; // Minimum content length
    
    if (!hasHeaders) {
      return { valid: false, error: 'No markdown headers found' };
    }
    
    if (!hasContent) {
      return { valid: false, error: 'Insufficient content' };
    }
    
    // Check for common markdown issues
    const issues = [];
    
    // Check for broken links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];
      
      if (!linkText.trim()) {
        issues.push('Empty link text');
      }
      
      if (!linkUrl.trim()) {
        issues.push('Empty link URL');
      }
    }
    
    // Check for code blocks
    const codeBlocks = content.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
      codeBlocks.forEach((block, index) => {
        if (block.trim() === '```' || block.trim() === '``````') {
          issues.push(`Empty code block at position ${index}`);
        }
      });
    }
    
    return { 
      valid: issues.length === 0, 
      issues: issues,
      headers: (content.match(/^#+\s/g) || []).length,
      links: (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
      codeBlocks: (content.match(/```[\s\S]*?```/g) || []).length
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate AI documentation specific requirements
 */
function validateAIDocumentation(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Check for required sections based on file type
    const fileName = path.basename(filePath, '.md');
    
    switch (fileName) {
      case 'project-evolution':
        if (!content.includes('## Development Timeline')) {
          issues.push('Missing Development Timeline section');
        }
        if (!content.includes('## Current State')) {
          issues.push('Missing Current State section');
        }
        break;
        
      case 'decision-log':
        if (!content.includes('## ADR-')) {
          issues.push('Missing ADR entries');
        }
        if (!content.includes('**Status**:')) {
          issues.push('Missing status information');
        }
        break;
        
      case 'technical-debt':
        if (!content.includes('## High Priority Issues')) {
          issues.push('Missing High Priority Issues section');
        }
        if (!content.includes('## Resolved Issues')) {
          issues.push('Missing Resolved Issues section');
        }
        break;
        
      case 'component-status':
        if (!content.includes('## Real-Time Component Status')) {
          issues.push('Missing Real-Time Component Status section');
        }
        if (!content.includes('✅') && !content.includes('❌')) {
          issues.push('Missing status indicators');
        }
        break;
        
      case 'performance-metrics':
        if (!content.includes('## Performance Overview')) {
          issues.push('Missing Performance Overview section');
        }
        if (!content.includes('## Current Performance Status')) {
          issues.push('Missing Current Performance Status section');
        }
        break;
    }
    
    return { valid: issues.length === 0, issues: issues };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate human documentation specific requirements
 */
function validateHumanDocumentation(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Check for required sections based on file type
    const fileName = path.basename(filePath, '.md');
    
    switch (fileName) {
      case 'quick-start':
        if (!content.includes('## What is SoundBite?')) {
          issues.push('Missing What is SoundBite section');
        }
        if (!content.includes('## Quick Start')) {
          issues.push('Missing Quick Start section');
        }
        break;
        
      case 'installation':
        if (!content.includes('## System Requirements')) {
          issues.push('Missing System Requirements section');
        }
        if (!content.includes('## Installation Steps')) {
          issues.push('Missing Installation Steps section');
        }
        break;
        
      case 'first-soundbite':
        if (!content.includes('## Step 1:')) {
          issues.push('Missing step-by-step instructions');
        }
        if (!content.includes('```bash')) {
          issues.push('Missing code examples');
        }
        break;
        
      case 'system-overview':
        if (!content.includes('## Architecture Overview')) {
          issues.push('Missing Architecture Overview section');
        }
        if (!content.includes('## Core Components')) {
          issues.push('Missing Core Components section');
        }
        break;
        
      case 'monitoring':
        if (!content.includes('## Monitoring Overview')) {
          issues.push('Missing Monitoring Overview section');
        }
        if (!content.includes('## Key Metrics')) {
          issues.push('Missing Key Metrics section');
        }
        break;
    }
    
    return { valid: issues.length === 0, issues: issues };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate cross-references between files
 */
function validateCrossReferences() {
  const issues = [];
  
  try {
    // Check for broken internal links
    CONFIG.requiredFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        
        while ((match = linkRegex.exec(content)) !== null) {
          const linkUrl = match[2];
          
          // Check for internal markdown links
          if (linkUrl.endsWith('.md') && !linkUrl.startsWith('http')) {
            const targetPath = path.resolve(path.dirname(filePath), linkUrl);
            if (!fs.existsSync(targetPath)) {
              issues.push(`Broken link in ${filePath}: ${linkUrl}`);
            }
          }
        }
      }
    });
    
    return { valid: issues.length === 0, issues: issues };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Generate validation report
 */
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: CONFIG.requiredFiles.length,
    validFiles: 0,
    invalidFiles: 0,
    issues: [],
    summary: {}
  };
  
  results.forEach(result => {
    if (result.valid) {
      report.validFiles++;
    } else {
      report.invalidFiles++;
      report.issues.push({
        file: result.file,
        error: result.error,
        details: result.details
      });
    }
  });
  
  // Generate summary
  report.summary = {
    overallHealth: report.validFiles / report.totalFiles,
    criticalIssues: report.issues.filter(issue => issue.error.includes('does not exist')).length,
    contentIssues: report.issues.filter(issue => issue.error.includes('content')).length,
    structureIssues: report.issues.filter(issue => issue.error.includes('structure')).length
  };
  
  return report;
}

/**
 * Main validation function
 */
function main() {
  console.log('🔍 Starting documentation validation...');
  
  const results = [];
  
  // Validate each required file
  CONFIG.requiredFiles.forEach(filePath => {
    console.log(`📄 Validating ${filePath}...`);
    
    const fileValidation = validateFile(filePath);
    if (!fileValidation.valid) {
      results.push({
        file: filePath,
        valid: false,
        error: fileValidation.error,
        details: 'File validation failed'
      });
      return;
    }
    
    const markdownValidation = validateMarkdown(filePath);
    if (!markdownValidation.valid) {
      results.push({
        file: filePath,
        valid: false,
        error: markdownValidation.error,
        details: markdownValidation.issues
      });
      return;
    }
    
    // Validate specific documentation type
    let typeValidation = { valid: true, issues: [] };
    if (filePath.startsWith('ai-docs/')) {
      typeValidation = validateAIDocumentation(filePath);
    } else if (filePath.startsWith('human-docs/')) {
      typeValidation = validateHumanDocumentation(filePath);
    }
    
    if (!typeValidation.valid) {
      results.push({
        file: filePath,
        valid: false,
        error: 'Type-specific validation failed',
        details: typeValidation.issues
      });
      return;
    }
    
    results.push({
      file: filePath,
      valid: true,
      size: fileValidation.size,
      lines: fileValidation.lines,
      headers: markdownValidation.headers,
      links: markdownValidation.links,
      codeBlocks: markdownValidation.codeBlocks
    });
  });
  
  // Validate cross-references
  console.log('🔗 Validating cross-references...');
  const crossRefValidation = validateCrossReferences();
  if (!crossRefValidation.valid) {
    results.push({
      file: 'cross-references',
      valid: false,
      error: 'Cross-reference validation failed',
      details: crossRefValidation.issues
    });
  }
  
  // Generate and display report
  const report = generateReport(results);
  
  console.log('\n📊 Validation Report');
  console.log('==================');
  console.log(`Total Files: ${report.totalFiles}`);
  console.log(`Valid Files: ${report.validFiles}`);
  console.log(`Invalid Files: ${report.invalidFiles}`);
  console.log(`Overall Health: ${(report.summary.overallHealth * 100).toFixed(1)}%`);
  
  if (report.issues.length > 0) {
    console.log('\n❌ Issues Found:');
    report.issues.forEach(issue => {
      console.log(`  - ${issue.file}: ${issue.error}`);
      if (issue.details && Array.isArray(issue.details)) {
        issue.details.forEach(detail => {
          console.log(`    * ${detail}`);
        });
      }
    });
  } else {
    console.log('\n✅ All documentation files are valid!');
  }
  
  // Save report to file
  const reportFile = path.join(CONFIG.aiDocsPath, 'validation-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  
  // Exit with appropriate code
  process.exit(report.invalidFiles > 0 ? 1 : 0);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  validateFile,
  validateMarkdown,
  validateAIDocumentation,
  validateHumanDocumentation,
  validateCrossReferences,
  generateReport
};
