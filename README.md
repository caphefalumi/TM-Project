# Teams Management Platform

A comprehensive project management platform with Jira-like features for team collaboration and task tracking.

## 1. Install and Run the Project

### Prerequisites

- Bun (v1.0+ recommended)
- MongoDB (local or Atlas)
- Vite (for frontend dev)

### Installation

1. Clone the repository:

   ```pwsh
   git clone https://github.com/caphefalumi/TM-Project
   cd TM-Project
   ```

2. Install dependencies for both client and server:

   ```pwsh
   bun install
   cd client
   bun install
   cd ../server
   bun install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in the `server` folder and fill in your credentials.
   - **Important:** Set a secure `CSRF_SECRET` in production for CSRF protection.

4. Start the website:

   ```pwsh
   bun run app
   ```

5. Visit `http://localhost:5173` in your browser.

## 2. Features

### Core Features

- **User Authentication**
  - Local registration with email and password
  - Google OAuth integration
  - Email verification
  - Password reset functionality

- **Team Management**
  - Create and manage teams
  - Team categories and descriptions
  - Role-based permissions
  - Custom roles support

- **Task Management**
  - Create and assign tasks
  - Dynamic task forms with custom fields
  - Task priorities (Urgent, High, Medium, Low, Optional)
  - Task categories (Report, Development, Design, Marketing, Other)
  - Due dates and start dates
  - Task submission and approval workflow

- **Announcements & Notifications**
  - Team-wide announcements
  - Real-time notifications
  - Notification center

### New Jira-like Features

#### Task Status Workflow
- **Status Tracking**: Move tasks through different states
  - To Do
  - In Progress
  - In Review
  - Done
  - Blocked
- **Visual Status Indicators**: Color-coded status chips for easy identification

#### Comments System
- **Task Discussions**: Add comments to any task
- **Edit & Delete**: Manage your own comments
- **Activity Tracking**: All comments are logged in task history
- **Real-time Updates**: See comments from team members

#### Time Tracking
- **Estimate Hours**: Set estimated time for task completion
- **Log Work**: Record actual time spent on tasks
- **Progress Tracking**: Visual progress bars showing time spent vs. estimated
- **Remaining Time**: Automatically calculate remaining hours

#### Sprint Management
- **Create Sprints**: Define sprint periods with start and end dates
- **Sprint Goals**: Set objectives for each sprint
- **Sprint Status**: Track sprints through planned, active, and completed states
- **Task Assignment**: Assign tasks to specific sprints

#### Task Dependencies
- **Blocking Tasks**: Mark tasks that block other tasks
- **Blocked By**: Identify tasks blocked by dependencies
- **Dependency Visualization**: See task relationships

#### Activity History
- **Complete Audit Log**: Track all changes to tasks
- **Activity Timeline**: Chronological view of task updates
- **User Attribution**: See who made each change
- **Change Details**: View old and new values for updates

## 3. API Endpoints

### Task Management
- `PATCH /api/tasks/:taskId/status` - Update task status
- `PATCH /api/tasks/:taskId/assignee` - Update task assignee
- `POST /api/tasks/:taskId/log-time` - Log time on a task
- `PATCH /api/tasks/:taskId/estimate` - Update time estimate
- `POST /api/tasks/:taskId/dependency` - Add task dependency
- `DELETE /api/tasks/:taskId/dependency` - Remove task dependency
- `PATCH /api/tasks/:taskId/sprint` - Assign task to sprint
- `GET /api/tasks/:taskId/activity` - Get task activity history

### Comments
- `POST /api/comments/tasks/:taskId/comments` - Add a comment
- `GET /api/comments/tasks/:taskId/comments` - Get all comments
- `PATCH /api/comments/comments/:commentId` - Update a comment
- `DELETE /api/comments/comments/:commentId` - Delete a comment

### Sprints
- `POST /api/sprints` - Create a sprint
- `GET /api/sprints/team/:teamId` - Get all sprints for a team
- `GET /api/sprints/:sprintId` - Get sprint details
- `PATCH /api/sprints/:sprintId` - Update a sprint
- `DELETE /api/sprints/:sprintId` - Delete a sprint
- `POST /api/sprints/:sprintId/start` - Start a sprint
- `POST /api/sprints/:sprintId/complete` - Complete a sprint

## 4. Security

### CSRF Protection

The application implements CSRF (Cross-Site Request Forgery) protection for all state-changing requests:

- **Backend:** Uses `csrf-csrf` middleware with double-submit cookie pattern
- **Frontend:** Automatically includes CSRF tokens in all POST, PUT, PATCH, and DELETE requests
- **Configuration:** Set `CSRF_SECRET` in your `.env` file for production

**How it works:**
1. Client fetches CSRF token from `/api/csrf-token` on app initialization
2. Token is automatically included in request headers for non-GET requests
3. Server validates the token for all protected endpoints

### Other Security Features

- **MongoDB Injection Protection:** Express-mongo-sanitize middleware
- **JWT Authentication:** Secure token-based authentication with refresh tokens
- **Rate Limiting:** Configured for API endpoints
- **Cookie Security:** httpOnly cookies with sameSite protection
- **CORS:** Configured for trusted origins only

## 5. Testing

Run tests:

```bash
cd client
bun run test
```

Run tests with coverage:

```bash
cd client
bun run test:coverage
```

## 6. Credits

**Contributors:**

- Hồ Quốc Khánh ([khanhkelvin08122006@gmail.com](mailto:khanhkelvin08122006@gmail.com))
- Đặng Duy Toàn ([dangduytoan13l@gmail.com](mailto:dangduytoan13l@gmail.com))
- Phan Lê Minh Hiếu ([hphan5283@gmail.com](mailto:hphan5283@gmail.com))

## 7. License

This project is licensed under the terms specified in the LICENSE file.
