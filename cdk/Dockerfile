# Dockerfile for AWS CDK Infra
# Use Node 22 Alpine for a small, secure image
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies (only what is needed for CDK)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Copy the rest of the infra code
COPY . .

# Set default command to help (override with cdk deploy, etc.)
CMD ["yarn", "cdk", "--help"]
