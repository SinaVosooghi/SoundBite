# Technical Debt Tracking

## High Priority Issues

### 1. GitHub Environment Context Interference
**Status**: Partially Resolved  
**Priority**: High  
**Description**: GitHub Environment context interferes with OIDC token generation  
**Impact**: Monitoring workflow failures, deployment issues  
**Workaround**: Temporarily disabled environment context in workflows  
**Next Steps**: 
- Research GitHub Environment + OIDC compatibility
- Implement proper environment-based OIDC configuration
- Re-enable environment context once resolved

### 2. Docker Build Test Reliability
**Status**: Resolved  
**Priority**: High  
**Description**: Docker containers fail to start due to missing AWS credentials  
**Impact**: CI pipeline failures  
**Resolution**: Added proper AWS credentials to Docker run commands  
**Verification**: ✅ Fixed in latest CI runs

### 3. YAML Syntax Issues in Workflows
**Status**: Resolved  
**Priority**: High  
**Description**: Backtick characters in AWS CLI queries cause YAML parsing errors  
**Impact**: Workflow file validation failures  
**Resolution**: Replaced backticks with single quotes in all AWS CLI queries  
**Verification**: ✅ Fixed in monitoring workflow

## Medium Priority Issues

### 4. Inconsistent Yarn Version Management
**Status**: Resolved  
**Priority**: Medium  
**Description**: CI and local environments used different Yarn versions  
**Impact**: Lockfile mismatches, CI failures  
**Resolution**: Standardized on Yarn 4.9.4 across all environments  
**Verification**: ✅ All pipelines now use consistent version

### 5. Jest Configuration Path Issues
**Status**: Resolved  
**Priority**: Medium  
**Description**: Jest couldn't find test files due to incorrect path configuration  
**Impact**: Test failures in CI  
**Resolution**: Updated Jest configuration with correct paths  
**Verification**: ✅ Tests now run successfully

### 6. Missing Test Files in Git
**Status**: Resolved  
**Priority**: Medium  
**Description**: Test setup files were ignored by .gitignore  
**Impact**: CI test failures  
**Resolution**: Updated .gitignore and added test files to repository  
**Verification**: ✅ Test files now tracked in Git

## Low Priority Issues

### 7. Documentation File Management
**Status**: In Progress  
**Priority**: Low  
**Description**: Large documentation commits can break CI due to unexpected file changes  
**Impact**: CI failures after documentation updates  
**Mitigation**: Implemented context-aware documentation system  
**Next Steps**: 
- Create documentation update automation
- Implement pre-commit hooks for documentation validation

### 8. Monitoring Workflow Environment Context
**Status**: Partially Resolved  
**Priority**: Low  
**Description**: Monitoring workflow uses hardcoded dev environment instead of dynamic environment selection  
**Impact**: Limited environment flexibility  
**Workaround**: Currently uses dev environment for all monitoring  
**Next Steps**: 
- Implement dynamic environment selection
- Re-enable environment context once OIDC issues resolved

### 9. CDK Stack Name Management
**Status**: Resolved  
**Priority**: Low  
**Description**: GitHub variable CDK_STACKS was using incorrect stack name  
**Impact**: Deployment failures  
**Resolution**: Updated variable to use correct stack name (SoundBite-dev-API)  
**Verification**: ✅ Deploy workflow now works correctly

## Resolved Issues

### ✅ Yarn Lockfile Mismatches
**Resolution**: Regenerated lockfiles and standardized Yarn version  
**Date**: September 2025

### ✅ Jest Test Configuration
**Resolution**: Fixed Jest paths and test file discovery  
**Date**: September 2025

### ✅ Docker Build Test Failures
**Resolution**: Added proper AWS credentials to Docker test commands  
**Date**: September 2025

### ✅ OIDC Authentication Issues
**Resolution**: Implemented direct AWS CLI approach for OIDC  
**Date**: September 2025

### ✅ YAML Syntax Errors
**Resolution**: Replaced backticks with single quotes in AWS CLI queries  
**Date**: September 2025

## Future Considerations

### 1. Production Environment Setup
**Priority**: Medium  
**Description**: Need to set up production environment with proper OIDC configuration  
**Dependencies**: Resolve GitHub Environment + OIDC issues

### 2. Comprehensive Monitoring
**Priority**: Medium  
**Description**: Implement full monitoring suite with alerts and dashboards  
**Dependencies**: Resolve monitoring workflow environment issues

### 3. Performance Optimization
**Priority**: Low  
**Description**: Optimize Lambda cold starts and API Gateway performance  
**Dependencies**: Production environment setup

### 4. Security Hardening
**Priority**: Medium  
**Description**: Implement additional security measures and compliance checks  
**Dependencies**: Production environment setup
