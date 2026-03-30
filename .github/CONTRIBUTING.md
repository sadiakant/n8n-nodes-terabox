# Contributing to n8n-nodes-terabox

Thank you for your interest in contributing to the TeraBox n8n node! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## Getting Started

### Prerequisites

- Node.js >= 18.17
- npm or pnpm
- Git
- n8n (for testing)

### Quick Start

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/n8n-nodes-terabox.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Development Mode

```bash
npm run dev
```

This watches for changes and rebuilds automatically.

### 3. Build for Production

```bash
npm run build
```

### 4. Lint Code

```bash
npm run lint
```

### 5. Format Code

```bash
npm run format
```

---

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node.js version, n8n version)
   - Error messages or logs

### Suggesting Features

1. Check existing feature requests
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Proposed implementation (if applicable)

### Submitting Code

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Test your changes** thoroughly
3. **Run linting** and fix any issues:
   ```bash
   npm run lint
   ```
4. **Run formatting**:
   ```bash
   npm run format
   ```
5. **Build successfully**:
   ```bash
   npm run build
   ```

### PR Requirements

- Clear title describing the change
- Detailed description of what was changed and why
- Reference any related issues
- Screenshots or examples if applicable
- All CI checks passing

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

---

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Define proper types and interfaces
- Avoid `any` type when possible
- Use strict mode

### Code Style

- Follow existing code patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Error Handling

- Always handle errors gracefully
- Provide clear error messages
- Use appropriate error types
- Log errors for debugging

### Example Pattern

```typescript
import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

export async function exampleOperation(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	try {
		const param = this.getNodeParameter('param', itemIndex) as string;

		if (!param) {
			throw new NodeOperationError(this.getNode(), 'Parameter is required', { itemIndex });
		}

		const result = await someApiCall(param);

		return {
			json: { success: true, data: result },
			pairedItem: { item: itemIndex },
		};
	} catch (error) {
		if (this.continueOnFail()) {
			return {
				json: { success: false, error: error.message },
				pairedItem: { item: itemIndex },
			};
		}
		throw error;
	}
}
```

---

## Testing

### Manual Testing

1. Build the node:
   ```bash
   npm run build
   ```
2. Link to n8n:
   ```bash
   npm link
   ```
3. Test in n8n UI

### Test Checklist

- [ ] Feature works as expected
- [ ] No regressions in existing functionality
- [ ] Error handling works correctly
- [ ] Edge cases handled
- [ ] Documentation updated

---

## Documentation

### When to Update Documentation

- Adding new features
- Changing existing behavior
- Fixing bugs that affect usage
- Adding new parameters

### Documentation Files

- `README.md` - Main documentation
- `docs/AUTHORIZATION_GUIDE.md` - Authentication instructions
- `docs/OPERATIONS_GUIDE.md` - Operations documentation
- `docs/TROUBLESHOOTING_GUIDE.md` - Troubleshooting guide

### Documentation Style

- Use clear, concise language
- Include code examples
- Add tables for parameters
- Link to related documentation

---

## Project Structure

```
n8n-nodes-terabox/
├── credentials/          # Credential definitions
├── docs/                 # Documentation files
├── nodes/               # Node implementations
│   └── Terabox/
│       ├── resources/   # Operation implementations
│       └── utils/       # Utility functions
└── .github/            # GitHub configuration
```

---

## Adding New Operations

### 1. Create Operation File

Create a new file in `nodes/Terabox/resources/`:

```typescript
import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { teraboxApiRequest } from '../utils/api';

export async function newOperation(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const result = await teraboxApiRequest.call(this, 'GET', '/api/endpoint');

	return {
		json: result,
		pairedItem: { item: itemIndex },
	};
}
```

### 2. Update Node Definition

Add the operation to `Terabox.node.ts`:

```typescript
// In description.properties
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  options: [
    // ... existing options
    {
      name: 'New Operation',
      value: 'newOperation',
      description: 'Description of the operation',
    },
  ],
}

// In execute method
if (operation === 'newOperation') {
  const result = await newOperation.call(this, i);
  returnData.push(result);
}
```

### 3. Update Documentation

- Add operation to `docs/OPERATIONS_GUIDE.md`
- Update README.md if significant

---

## Questions?

If you have questions about contributing:

1. Check existing documentation
2. Search existing issues
3. Create a new issue with your question
4. Join our Telegram group for help

---

## Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!
