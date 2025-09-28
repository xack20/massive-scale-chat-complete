# Contributing to Massive Scale Chat Application

Thank you for your interest in contributing to our project! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## 📜 Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Docker and Docker Compose
- Git
- A GitHub account

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Click the 'Fork' button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/massive-scale-chat-complete.git
   cd massive-scale-chat-complete
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/xack20/massive-scale-chat-complete.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ./setup.sh
   ```

5. **Start development environment**
   ```bash
   ./start-dev.sh
   ```

## 💻 Development Process

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/video-chat`)
- `fix/` - Bug fixes (e.g., `fix/message-delivery`)
- `docs/` - Documentation updates (e.g., `docs/api-endpoints`)
- `refactor/` - Code refactoring (e.g., `refactor/auth-service`)
- `test/` - Test additions/updates (e.g., `test/user-service`)
- `perf/` - Performance improvements (e.g., `perf/message-caching`)

### Workflow

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, maintainable code
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Keep your fork updated**
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🔄 Pull Request Process

### Before Submitting

- [ ] Code follows our coding standards
- [ ] All tests pass (`npm test`)
- [ ] Documentation is updated
- [ ] Commit messages follow conventional format
- [ ] Branch is up-to-date with master

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No commented-out code
```

### Review Process

1. PRs require at least 1 review
2. Address all review comments
3. Keep PRs focused and small
4. Include tests for new features
5. Update documentation

## 📝 Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Enable strict mode
- Use meaningful variable names
- Prefer const over let
- Use async/await over callbacks
- Handle errors properly

```typescript
// Good
const getUserById = async (id: string): Promise<User> => {
  try {
    const user = await userService.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error) {
    logger.error('Error fetching user:', error);
    throw error;
  }
};

// Bad
function getUser(id) {
  return userService.findById(id);
}
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use proper TypeScript types
- Implement error boundaries
- Memoize expensive computations

```tsx
// Good
interface UserCardProps {
  user: User;
  onClick?: (user: User) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(user);
  }, [user, onClick]);

  return (
    <div onClick={handleClick}>
      {user.name}
    </div>
  );
};
```

### API Design

- Use RESTful conventions
- Version APIs properly
- Return consistent responses
- Include proper status codes
- Document all endpoints

### Database

- Always use migrations
- Index foreign keys
- Avoid N+1 queries
- Use transactions for consistency
- Document schema changes

## 🧪 Testing Requirements

### Unit Tests

- Minimum 80% code coverage
- Test edge cases
- Mock external dependencies
- Use descriptive test names

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Test implementation
    });

    it('should throw error with duplicate email', async () => {
      // Test implementation
    });
  });
});
```

### E2E Tests

- Test critical user flows
- Test across different browsers
- Include performance tests
- Test error scenarios

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Individual service tests
cd services/user-service && npm test
```

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for functions
- Document complex logic
- Include usage examples
- Keep README files updated

```typescript
/**
 * Sends a message to a conversation
 * @param conversationId - The ID of the conversation
 * @param content - The message content
 * @param attachments - Optional file attachments
 * @returns The created message
 * @throws {Error} If conversation doesn't exist
 * @example
 * const message = await sendMessage('123', 'Hello world');
 */
```

### API Documentation

- Document all endpoints
- Include request/response examples
- Specify error codes
- Note rate limits

## 🤝 Community

### Getting Help

- Check existing issues and PRs
- Join our Discord server
- Read the documentation
- Ask questions in discussions

### Reporting Issues

- Use issue templates
- Provide reproduction steps
- Include error messages
- Specify environment details

### Feature Requests

- Check if already requested
- Explain use case clearly
- Provide implementation ideas
- Be open to feedback

## 🏷️ Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Test updates
- `chore:` Build/tooling changes

### Examples

```bash
feat(auth): add OAuth2 integration

fix(messages): resolve duplicate message bug

docs(api): update endpoint documentation

perf(cache): implement Redis caching for messages
```

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Thank you for contributing to our project! Your efforts help make this application better for everyone.
