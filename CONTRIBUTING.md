# Contributing to The Planning Bord

Thank you for your interest in contributing to The Planning Bord! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- Docker and Docker Compose (for containerized development)
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/The-Planning-Bord.git
   cd The-Planning-Bord
   ```

2. **Environment Setup**
   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Update with your local configuration
   # Edit backend/.env and frontend/.env files
   ```

3. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

4. **Database Setup**
   ```bash
   cd ../backend
   npm run migrate
   npm run seed
   ```

5. **Start Development Servers**
   ```bash
   # Backend (port 5000)
   npm run dev
   
   # Frontend (port 3000) - in another terminal
   cd ../frontend
   npm start
   ```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📋 Development Workflow

### Branch Naming

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Critical fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add Microsoft OAuth integration
fix(inventory): resolve stock calculation error
docs(api): update OpenAPI specification
```

### Pre-commit Hooks

Our Husky pre-commit hooks will automatically:
- Run ESLint on staged files
- Format code with Prettier
- Validate commit messages
- Run type checks

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only

# Frontend tests
cd ../frontend
npm test                   # All tests
npm run test:coverage      # With coverage report
```

### Test Coverage

- Maintain minimum 80% code coverage
- Write tests for new features
- Update tests for changed functionality
- Include both positive and negative test cases

### Writing Tests

- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test edge cases and error conditions

## 🔒 Security Guidelines

### Code Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Validate all user inputs
- Implement proper authentication and authorization
- Use parameterized queries to prevent SQL injection

### Security Reporting

- **DO NOT** create public issues for security vulnerabilities
- Email security concerns to: security@planningbord.com
- Include detailed reproduction steps
- Use responsible disclosure practices

## 📊 Performance Guidelines

### Database

- Add indexes for frequently queried columns
- Use database query optimization
- Implement pagination for large datasets
- Monitor slow query logs

### Frontend

- Optimize bundle size
- Implement code splitting
- Use lazy loading for components
- Optimize images and assets

### API

- Implement rate limiting
- Use caching strategies
- Optimize response payloads
- Monitor API response times

## 🎨 Code Style

### JavaScript/Node.js

- Follow [StandardJS](https://standardjs.com/) style
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Keep functions small and focused

### React/Frontend

- Follow React best practices
- Use functional components with hooks
- Implement proper prop validation
- Follow component naming conventions

### CSS/Styling

- Use Tailwind CSS utilities
- Follow mobile-first approach
- Maintain consistent spacing and typography
- Ensure accessibility compliance

## 📚 Documentation

### Code Documentation

- Document complex business logic
- Add inline comments for non-obvious code
- Update API documentation for changes
- Include examples in documentation

### API Documentation

- Update OpenAPI specification
- Document request/response schemas
- Include authentication requirements
- Provide example requests

## 🔄 Pull Request Process

### Before Submitting

1. **Sync with main branch**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all tests**
   ```bash
   npm test
   npm run lint
   npm run security:check
   ```

3. **Update documentation**
   - Update README if needed
   - Update API documentation
   - Add/update code comments

### PR Requirements

- Use the PR template
- Include screenshots for UI changes
- Reference related issues
- Ensure CI/CD checks pass
- Request reviews from code owners

### Review Process

- All PRs require at least one approval
- Address review feedback promptly
- Keep PRs focused and reasonably sized
- Squash commits before merging

## 🐛 Bug Reporting

### Bug Report Template

When reporting bugs, include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots if applicable
- Error logs if available

## 📈 Feature Requests

### Feature Request Template

When suggesting features, include:

- Problem statement
- Proposed solution
- Use cases
- Alternatives considered
- Mockups or examples

## 🏷️ Issue Labels

We use the following labels:

### Type
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to docs
- `security` - Security-related issues

### Priority
- `high-priority` - Critical issues
- `medium-priority` - Important but not urgent
- `low-priority` - Nice to have

### Status
- `needs-triage` - Needs review and labeling
- `in-progress` - Currently being worked on
- `blocked` - Blocked by external factors
- `ready-for-review` - Ready for code review

## 📞 Getting Help

### Communication Channels

- **Issues**: GitHub Issues for bugs and features
- **Discussions**: GitHub Discussions for questions
- **Email**: team@planningbord.com for private matters
- **Security**: security@planningbord.com for security issues

### Code Owners

- Backend: @backend-team
- Frontend: @frontend-team
- DevOps: @devops-team
- Security: @security-team

## 🏆 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project documentation
- Team acknowledgments

Thank you for contributing to The Planning Bord! 🎉