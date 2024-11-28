# Repository Synchronization Setup

This repository is configured to automatically synchronize between GitHub and Gitea. This ensures that both repositories stay in sync and maintain the same history, branches, tags, issues, and pull requests.

## Sync Features

### Code Synchronization

- All branches and their history
- Tags and releases
- Commit messages and authors
- Force push protection

### Issue Synchronization

- Issue creation and updates
- Issue comments
- Labels and status changes
- Issue closure and reopening

### Pull Request Synchronization

- PR creation and updates
- PR reviews and comments
- PR status changes (open/closed)
- Review comments and feedback

### Milestone Synchronization

- Milestone creation and updates
- Due dates and descriptions
- Milestone state changes (open/closed)
- Milestone deletion

### Project Board Synchronization

- Project board creation
- Project columns and their order
- Project cards and their content
- Card movements between columns

## Sync Workflows

### GitHub to Gitea Sync

The GitHub workflow ([.github/workflows/sync-to-gitea.yml](.github/workflows/sync-to-gitea.yml)) syncs changes from GitHub to Gitea:

- Triggers on:
  - Push to any branch
  - Tag creation
  - PR merges to main/master
  - Issue creation/modification
  - Issue comments
  - PR creation/modification
  - PR reviews and comments
  - Milestone creation/modification/deletion
  - Project board changes (creation, updates, card movements)
- Uses Gitea API for issue/PR sync
- Uses force push for code sync

### Gitea to GitHub Sync

The Gitea workflow ([.gitea/workflows/sync-to-github.yml](.gitea/workflows/sync-to-github.yml)) syncs changes from Gitea to GitHub:

- Triggers on:
  - Push to any branch
  - Tag creation
  - Issue creation/modification
  - Issue comments
  - PR creation/modification
  - PR comments
  - Milestone creation/modification/deletion
  - Project board changes (creation, updates, card movements)
- Uses GitHub CLI for better integration:
  - Direct API access for issue/PR management
  - Native project board integration
  - Built-in milestone management
  - Efficient comment synchronization
- Uses regular push for code sync
- Handles complex synchronization:
  - Preserves milestone relationships with issues
  - Maintains project board structure and card positions
  - Syncs project automations where possible

### Publishing Workflow

The publishing workflow ([.gitea/workflows/publish.yml](.gitea/workflows/publish.yml)) handles extension publishing:

- Triggers on:
  - Tag creation matching `v*` pattern (e.g., v1.0.0)

The workflow consists of three sequential jobs:

1. **Build**:
   - Checks out the code
   - Sets up Node.js and pnpm
   - Installs dependencies
   - Runs package analysis
   - Builds and packages the extension (.vsix)

2. **Publish**:
   - Publishes to VS Code Marketplace using `VSCODE_MARKETPLACE_TOKEN`
   - Publishes to Open VSX Registry using `OVSX_TOKEN`
   - Both marketplaces use the same built .vsix package

3. **Release**:
   - Creates a Gitea release for the tag
   - Attaches the .vsix file to the release
   - Generates release notes

The workflow ensures that:

- The extension is properly built and tested before publishing
- The same package is published to both marketplaces
- A release is created with the packaged extension
- All steps are properly sequenced and dependent on previous steps' success

## Required Secrets

### GitHub Repository Secrets

- `GITEA_TOKEN`: Personal access token from Gitea (requires: `repo`, `issues`, `pull-requests`, `project`, `write:milestone` permissions)
- `GITEA_USERNAME`: Your Gitea username
- `GITEA_REPO`: Full repository path in Gitea (e.g., `username/repo`)
- `GITEA_API_URL`: Your Gitea instance API URL
- `VSCODE_MARKETPLACE_TOKEN`: Token for publishing to VS Code Marketplace
- `OVSX_TOKEN`: Token for publishing to Open VSX Registry

### Gitea Repository Secrets

- `GITHUB_TOKEN`: Personal access token from GitHub (requires: `repo`, `workflow`, `issues`, `pull-requests`, `project`, `write:packages` permissions)
- `GITHUB_REPO`: Full repository path on GitHub (e.g., `username/repo`)
- `VSCODE_MARKETPLACE_TOKEN`: Token for publishing to VS Code Marketplace
- `OVSX_TOKEN`: Token for publishing to Open VSX Registry

## Token Permission Requirements

### GitHub Token Permissions

The GitHub token needs these specific permissions:

- `repo`: Full control of private repositories
- `workflow`: Workflow access
- `issues`: Read/write access to issues
- `pull-requests`: Read/write access to pull requests
- `project`: Full control of organization projects and project boards
- `write:packages`: Write access to packages

### Gitea Token Permissions

The Gitea token needs these specific permissions:

- `repo`: Repository access
- `issues`: Issues access
- `pull-requests`: Pull request access
- `project`: Project board access
- `write:milestone`: Milestone management access

### Marketplace Token Permissions

- `VSCODE_MARKETPLACE_TOKEN`: Get from [Visual Studio Marketplace](https://dev.azure.com/)
  - Requires publisher access to your organization
  - Used for publishing extensions to VS Code Marketplace

- `OVSX_TOKEN`: Get from [Open VSX Registry](https://open-vsx.org/)
  - Create a personal access token with publish rights
  - Used for publishing extensions to Open VSX Registry

## Best Practices

1. **Primary Repository**: Choose one repository (GitHub or Gitea) as your primary development platform to avoid sync conflicts.

2. **Issue Management**:
   - Create issues in your primary platform
   - Add labels before comments for better sync
   - Use consistent label names across platforms

3. **Pull Requests**:
   - Open PRs from your primary platform
   - Review on either platform (comments will sync)
   - Merge from the primary platform

4. **Milestone Management**:
   - Create milestones from your primary platform
   - Keep milestone titles consistent
   - Update due dates and descriptions from primary platform
   - Close milestones from primary platform

5. **Project Board Management**:
   - Set up project board structure in primary platform
   - Keep column names consistent
   - Move cards only from primary platform
   - Archive completed cards from primary platform

6. **Branch Protection**:
   - Enable branch protection on both platforms
   - Use consistent protection rules
   - Consider using signed commits

7. **Sync Verification**:
   - Regularly check sync status
   - Verify issue/PR numbers match
   - Monitor sync job logs
   - Verify milestone synchronization
   - Check project board consistency

## Troubleshooting

If synchronization issues occur:

1. Check the workflow logs on both platforms
2. Verify that all required secrets are properly set
3. Ensure both tokens have sufficient permissions:
   - For GitHub: `repo`, `workflow`, `issues`, `pull-requests`, `project`, `write:packages`
   - For Gitea: `repo`, `issues`, `pull-requests`, `project`, `write:milestone`
4. Try triggering a manual sync
5. If necessary, reset the secondary repository to match the primary

### Common Issues

1. **Milestone Sync Issues**:
   - Verify milestone titles match exactly
   - Check due dates are in correct format
   - Ensure milestone states are consistent

2. **Project Board Issues**:
   - Verify column names match exactly
   - Check card content is properly formatted
   - Ensure project board permissions are correct

## Notes

- The sync is bi-directional but not simultaneous
- Issue and PR numbers may differ between platforms
- Force push is used selectively to ensure consistency
- Comments and reviews sync with a slight delay
- Label colors and descriptions may vary between platforms
- Webhook events might cause temporary duplicate notifications
- Milestone due dates might show slight time differences due to timezone handling
- Project board card order might need manual adjustment occasionally
- Project board automations may need to be configured separately on each platform
- Archived cards might not maintain their archive status across platforms
