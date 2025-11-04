# GitHub Discussions Setup Guide

This guide will help you set up GitHub Discussions for the anchorpipe project.

## Prerequisites

- Repository admin access
- Discussions enabled in repository settings

## Step 1: Enable Discussions

1. Go to: `Settings` → `General` → Scroll to `Features`
2. Check `Discussions`
3. Click `Set up discussions`

## Step 2: Create Categories

Go to: `Settings` → `General` → `Discussions` → `Categories`

Create these categories in order:

### 1. 📢 Announcements
- **Name**: `📢 Announcements`
- **Description**: `Official project announcements, release notes, major updates, and important news from the anchorpipe team.`
- **Emoji**: `📢`

### 2. 💬 General
- **Name**: `💬 General`
- **Description**: `Casual conversation, introductions, off-topic discussions, and community bonding.`
- **Emoji**: `💬`

### 3. ❓ Q&A
- **Name**: `❓ Q&A`
- **Description**: `Ask questions about using anchorpipe, troubleshooting issues, understanding features, or getting help with integration.`
- **Emoji**: `❓`

### 4. 💡 Ideas
- **Name**: `💡 Ideas`
- **Description**: `Propose new features, suggest improvements, brainstorm enhancements, and discuss potential directions for anchorpipe.`
- **Emoji**: `💡`

### 5. 🌟 Show and Tell
- **Name**: `🌟 Show and Tell`
- **Description**: `Share your successes, interesting use cases, custom integrations, dashboards, or anything cool you've built with anchorpipe.`
- **Emoji**: `🌟`

### 6. 📋 RFCs
- **Name**: `📋 RFCs`
- **Description**: `Request for Comments. Formal proposals for significant changes, new features, or architectural modifications.`
- **Emoji**: `📋`

### 7. 👥 Community
- **Name**: `👥 Community`
- **Description**: `Discuss community-related topics such as governance, events, meetups, contributor onboarding, and organizational matters.`
- **Emoji**: `👥`

## Step 3: Create Initial Discussions

After categories are created, use the content files in this directory to create discussions:

### To Create Discussions via Web Interface:

1. Go to the Discussions tab
2. Select the appropriate category
3. Click "New discussion"
4. Copy content from the `.md` files in `.github/discussions/`
5. Paste and format as needed
6. Post the discussion
7. Pin the discussion (click the pin icon)

### Discussions to Create:

1. **Welcome to anchorpipe!** (General category)
   - File: `welcome-to-anchorpipe.md`
   - Pin: Yes
   - Lock: No

2. **How to Contribute** (General category)
   - File: `how-to-contribute.md`
   - Pin: Yes
   - Lock: No

3. **Epic 0 Completion Announcement** (Announcements category)
   - File: `epic-0-completion-announcement.md`
   - Pin: Yes
   - Lock: No

4. **Project Roadmap** (Announcements category)
   - File: `project-roadmap.md`
   - Pin: Yes
   - Lock: Yes (or moderated comments)

## Step 4: Update README

Update the README.md to reflect the completed G0 status:

```markdown
## 📋 Project Status

**Current Phase**: Security Foundation (Gate GA)

- ✅ Foundation (Gate G0) - COMPLETE
- ✅ Repository setup and development environment
- ✅ PostgreSQL schema and migrations
- ✅ CI/CD pipeline
- ✅ Basic authentication system
- ✅ API Gateway / BFF
- ✅ Message queue (RabbitMQ)
- ✅ Object storage (S3-compatible)
- ✅ Basic telemetry and logging
- 🎯 Security Foundation (Gate GA) - In Progress
```

## Step 5: Configure Moderation

1. Go to: `Settings` → `General` → `Discussions`
2. Configure:
   - Discussion moderation settings
   - Spam filtering
   - Notification settings

3. Assign moderators (if needed)

## Verification Checklist

- [ ] Discussions enabled
- [ ] All 7 categories created
- [ ] Welcome discussion created and pinned
- [ ] How to Contribute discussion created and pinned
- [ ] Epic 0 announcement created and pinned
- [ ] Project Roadmap created and pinned
- [ ] README updated
- [ ] Moderation configured

## Next Steps

After setup:
1. Monitor discussions for initial activity
2. Respond to questions promptly
3. Update pinned topics as needed
4. Celebrate community contributions!

---

**Questions?** Create an issue or reach out to maintainers.

