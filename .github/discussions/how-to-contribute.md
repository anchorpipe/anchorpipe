# 🛠️ How to Contribute to anchorpipe

Thank you for your interest in contributing to anchorpipe! This guide will help you get started.

## Ways to Contribute

There are many ways to contribute beyond writing code:

### 💻 Code Contributions
- Implement features from our roadmap
- Fix bugs and issues
- Improve test coverage
- Refactor and optimize code
- Add documentation

### 📚 Documentation
- Improve existing documentation
- Write tutorials and guides
- Fix typos and clarify explanations
- Translate documentation
- Create examples and use cases

### 💡 Ideas and Feedback
- Suggest new features in [Ideas](https://github.com/anchorpipe/anchorpipe/discussions/categories/ideas)
- Provide feedback on existing features
- Report usability issues
- Share use cases and requirements

### 🧪 Testing
- Test new features and report bugs
- Write test cases
- Test on different platforms/environments
- Provide feedback on user experience

### 🤝 Community Support
- Answer questions in [Q&A](https://github.com/anchorpipe/anchorpipe/discussions/categories/q-a)
- Help other users
- Share your experiences in [Show and Tell](https://github.com/anchorpipe/anchorpipe/discussions/categories/show-and-tell)
- Welcome new contributors

### 📢 Advocacy
- Share anchorpipe with your network
- Write blog posts or tutorials
- Speak at conferences or meetups
- Create content (videos, podcasts, etc.)

## Getting Started with Code Contributions

### 1. Read the Documentation

- **Contributing Guide**: [CONTRIBUTING.md](https://github.com/anchorpipe/anchorpipe/blob/main/CONTRIBUTING.md)
- **Code of Conduct**: [CODE_OF_CONDUCT.md](https://github.com/anchorpipe/anchorpipe/blob/main/CODE_OF_CONDUCT.md)
- **Development Setup**: See our development documentation

### 2. Find an Issue

- Browse [open issues](https://github.com/anchorpipe/anchorpipe/issues)
- Check our [Project Board](https://github.com/orgs/anchorpipe/projects/3/views/2)
- Look for issues labeled `good first issue` or `help wanted`
- Or create a new issue for something you want to work on

### 3. Set Up Your Development Environment

```bash
# Clone the repository
git clone https://github.com/anchorpipe/anchorpipe.git
cd anchorpipe

# Install dependencies
npm install

# Set up local services (PostgreSQL, RabbitMQ, MinIO)
docker compose -f infra/docker-compose.yml up -d

# Run database migrations
npm run db:migrate:deploy

# Start development server
npm run dev
```

### 4. Create a Branch

```bash
# Create a new branch for your work
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/your-bug-fix
```

### 5. Make Your Changes

- Write clean, well-documented code
- Follow the project's coding standards
- Add tests for new features
- Update documentation as needed

### 6. Test Your Changes

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

# Build the project
npm run build
```

### 7. Commit Your Changes

**Important**: All commits must be signed off with DCO (Developer Certificate of Origin).

```bash
# Sign off your commit
git commit -s -m "Your commit message"

# Or use the automatic sign-off
git config --global alias.commit "commit -s"
```

### 8. Push and Create a Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a PR on GitHub
# Link to the related issue
# Provide a clear description of your changes
```

## Code Review Process

1. **Submit PR**: Create a pull request with a clear description
2. **CI Checks**: Wait for CI to pass (lint, typecheck, build, tests)
3. **Code Review**: Maintainers will review your code
4. **Address Feedback**: Make requested changes
5. **Approval**: Once approved, your PR will be merged

## Development Guidelines

### Code Style
- Follow ESLint and Prettier configurations
- Use TypeScript for type safety
- Write clear, self-documenting code
- Add comments for complex logic

### Testing
- Write unit tests for new features
- Add integration tests where appropriate
- Ensure all tests pass before submitting PR
- Aim for good test coverage

### Documentation
- Update README.md if needed
- Document new functions and classes
- Add JSDoc comments for public APIs
- Update relevant documentation files

## Project Structure

```
anchorpipe/
├── apps/          # Applications (web, CLI, etc.)
├── libs/          # Shared libraries
├── services/      # Backend services
├── infra/         # Infrastructure configs
├── docs/          # Documentation
└── .github/       # GitHub workflows and templates
```

## Questions?

- **Technical Questions**: Ask in [Q&A](https://github.com/anchorpipe/anchorpipe/discussions/categories/q-a)
- **Contribution Questions**: Post in [General](https://github.com/anchorpipe/anchorpipe/discussions/categories/general)
- **Process Questions**: Check [CONTRIBUTING.md](https://github.com/anchorpipe/anchorpipe/blob/main/CONTRIBUTING.md)

## Recognition

All contributors are:
- ✅ Recognized in release notes
- ✅ Listed in project documentation
- ✅ Credited for their work

See our [Contributor Rewards](https://github.com/anchorpipe/anchorpipe/blob/main/docs/governance/CONTRIBUTOR_REWARDS.md) for more details.

---

**Thank you for contributing to anchorpipe!** 🎉

Every contribution, no matter how small, makes a difference.

