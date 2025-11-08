# Teams Management Platform

## 1. Install and Run the Project

### Prerequisites

- Node.js (v18+ recommended) or Bun (v1.0+ recommended)
- MongoDB (local or Atlas)
- Nuxt 3 (for frontend)

### Installation

1. Clone the repository:

   ```pwsh
   git clone https://github.com/caphefalumi/TM-Project
   cd TM-Project
   ```

2. Install dependencies for both client and server:

   ```pwsh
   npm install
   cd client
   npm install
   cd ../server
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in the `server` folder and fill in your credentials (see sample in attachments).
   - Copy `.env.example` to `.env` in the `client` folder for client-side environment variables.

4. Start the website:

   ```pwsh
   npm run app
   ```

   Or run client and server separately:
   
   ```pwsh
   # Terminal 1 - Start the client (Nuxt dev server)
   cd client
   npm run dev
   
   # Terminal 2 - Start the server
   cd server
   npm run server
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

## 3. Technology Stack

**Frontend:**
- Nuxt 3 (SPA mode)
- Vue 3
- Vuetify 3
- Pinia (state management)
- vue3-google-login (OAuth)

**Backend:**
- Node.js/Bun
- MongoDB

## 4. Credits

**Contributors:**

- Hồ Quốc Khánh ([khanhkelvin08122006@gmail.com](mailto:khanhkelvin08122006@gmail.com))
- Đặng Duy Toàn ([dangduytoan13l@gmail.com](mailto:dangduytoan13l@gmail.com))
- Phan Lê Minh Hiếu ([hphan5283@gmail.com](mailto:hphan5283@gmail.com))
