# Teams Management Platform

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
   - Copy `.env.example` to `.env` in the `server` and `client` folders and fill in your credentials.

4. Start the website:

   ```pwsh
   bun run app
   ```

5. Visit `http://localhost:5173` in your browser.

## 2. Use the Project

- Register or log in (local or Google OAuth)
- Create or join teams
- Assign tasks, set priorities, and track progress
- Manage roles and permissions (admin features)
- Receive notifications and announcements

**Authentication:**

- Local: Register with email and password
- Google: Use your Google account

## 3. Credits

**Contributors:**

- Hồ Quốc Khánh ([khanhkelvin08122006@gmail.com](mailto:khanhkelvin08122006@gmail.com))
- Đặng Duy Toàn ([dangduytoan13l@gmail.com](mailto:dangduytoan13l@gmail.com))
- Phan Lê Minh Hiếu ([hphan5283@gmail.com](mailto:hphan5283@gmail.com))
