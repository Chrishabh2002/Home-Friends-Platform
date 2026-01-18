# 🏠 Home & Friends Productivity Platform - Application Architecture

## 1. Product Vision
A "gamified operating system" for shared living spaces (families, roommates, friends). It turns chores, expenses, and coordination into a fun, fair, and animated experience.
**Core Vibe:** Friendly, Cartoon-styled, Animated but Serious, Secure, and Scalable under the hood.

## 2. Technology Stack
### Frontend
- **Framework:** React 19 + Vite
- **Language:** TypeScript
- **Styling:** TailwindCSS (v4 if available, or v3.4) + Custom "Cartoon" Theme
- **Animations:** Framer Motion (Interactions), Lottie (Mascot/Celebrations)
- **State Management:** Zustand (Clean, minimal) or TanStack Query (Server state)

### Backend
- **Framework:** FastAPI (Python)
- **Reason:** Best-in-class performance (ASGI), native support for AI/LLM libraries, easy WebSocket integration, and clean Pydantic validation.
- **Language:** Python 3.11+

### Database & Storage
- **Primary DB:** PostgreSQL (Users, Groups, Tasks, Expenses, Chat History)
- **Cache / Real-time:** Redis (Pub/Sub for Chat, Caching Session Data)
- **Object Storage:** Local/S3 (User Avatars, Uploads)

### DevOps & Infrastructure
- **Containerization:** Docker + Docker Compose (Local Dev)
- **Auth:** OAuth2 + JWT (Access/Refresh Tokens) + Argon2 Hashing

---

## 3. Component Architecture

### High-Level Components
1.  **Client (SPA):** React App. Connects via HTTPS (Rest) and WSS (WebSockets).
2.  **API Gateway / Load Balancer:** Nginx (optional in dev, mandatory in prod).
3.  **Core API Service (FastAPI):**
    *   **Auth Module:** Handles Login, Signup, JWT issuance.
    *   **House Module:** Manages Groups, Invites, Member Roles.
    *   **Task Module:** CRUD Tasks, Logic for "Fairness", Assignments.
    *   **Finance Module:** Expense tracking, Budget logic, Balances.
    *   **Chat Module:** WebSocket endpoints, Message persistence.
    *   **AI Service:** Orchestrator for "Smart" features (Summaries, Suggestions).
4.  **Database (PostgreSQL):** Relational data.
5.  **Message Broker (Redis):** Handles WebSocket pub/sub distribution and background job queues (e.g., specific AI processing tasks).

---

## 4. Database Schema (PostgreSQL)

### Users
- `id`: UUID (PK)
- `email`: VARCHAR (Unique, Index)
- `password_hash`: VARCHAR
- `full_name`: VARCHAR
- `avatar_url`: VARCHAR
- `preferences`: JSONB (Notifications, AI settings)
- `created_at`: TIMESTAMP

### Groups (Homes)
- `id`: UUID (PK)
- `name`: VARCHAR
- `invite_code`: VARCHAR (Unique)
- `theme_settings`: JSONB
- `created_at`: TIMESTAMP

### GroupMembers
- `group_id`: UUID (FK)
- `user_id`: UUID (FK)
- `role`: ENUM ('admin', 'member')
- `joined_at`: TIMESTAMP
- **PK:** (group_id, user_id)

### Tasks
- `id`: UUID (PK)
- `group_id`: UUID (FK)
- `title`: VARCHAR
- `category`: ENUM ('cleaning', 'cooking', 'grocery', 'maintenance', 'other')
- `priority`: SMALLINT (1=Low, 2=Med, 3=High)
- `status`: ENUM ('pending', 'in_progress', 'completed')
- `assigned_to`: UUID (FK -> Users)
- `completed_by`: UUID (FK -> Users, nullable)
- `due_date`: TIMESTAMP
- `points_value`: INTEGER (Calculated by complexity)
- `created_at`: TIMESTAMP

### Expenses
- `id`: UUID (PK)
- `group_id`: UUID (FK)
- `paid_by`: UUID (FK -> Users)
- `amount`: DECIMAL(10, 2)
- `category`: VARCHAR
- `description`: TEXT
- `split_type`: ENUM ('equal', 'percentage', 'adjustment')
- `created_at`: TIMESTAMP

### ChatMessages
- `id`: UUID (PK)
- `group_id`: UUID (FK)
- `sender_id`: UUID (FK)
- `content`: TEXT
- `message_type`: ENUM ('text', 'image', 'system', 'reaction')
- `created_at`: TIMESTAMP (Index)

---

## 5. API Endpoints (Key Examples)

### Authentication
- `POST /auth/signup`
- `POST /auth/login` (Returns `{ access_token, refresh_token }`)
- `POST /auth/refresh`
- `GET /users/me`

### Groups
- `POST /groups` (Create)
- `POST /groups/join` (Join via code)
- `GET /groups/{id}/members`

### Tasks
- `GET /groups/{id}/tasks?status=pending`
- `POST /groups/{id}/tasks`
- `PATCH /tasks/{id}/status` (Triggers Gamification + Stats update)

### Expenses
- `GET /groups/{id}/expenses/stats`
- `POST /groups/{id}/expenses`

### Real-Time (WebSocket)
- `WS /ws/chat/{group_id}?token=...`
  - Events: `new_message`, `task_updated`, `member_joined`

---

## 6. AI System & Prompts

**Persona:** Friendly, cartoon helper.
**Privacy:** Only reads public shared data (Tasks, Expenses). Never implies spying.

### Prompt Templates

#### 1. Daily Summary (System Prompt)
```text
You are "Homie", the friendly smart home mascot. 
Context:
- Users: {user_names}
- Pending Tasks: {task_list}
- Recent Expenses: {expense_summary}

Goal: Write a fun, emoji-rich morning briefing for the group. 
- Highlight who is doing a great job (if any).
- Gently nudge about overdue tasks without being toxic.
- Keep it under 100 words.
```

#### 2. Fairness Analysis (System Prompt)
```text
Analyze the following workload data for the last 30 days:
{workload_json}

Identify:
1. Who is the "MVP" (Most Valuable Player)?
2. Is anyone under-contributing significantly?
3. Suggest 2 task reassignments to balance the load.

Output JSON: { "mvp_user_id": "...", "suggestions": [...] }
```

---

## 7. Folder Structure

### Root
- `/backend` (FastAPI)
- `/frontend` (React + Vite)
- `/infra` (Docker, Nginx)
- `ARCHITECTURE.md`

### Backend Structure
```
/backend
  /app
    /api
      /v1
        auth.py
        taasks.py
        groups.py
    /core (config, security)
    /models (sqlmodel/sqlalchemy classes)
    /services
      ai_service.py
      chat_service.py
    /schemas (pydantic models)
    main.py
  requirements.txt
```

### Frontend Structure
```
/frontend
  /src
    /assets (fonts, images, lotties)
    /components
      /ui (Button, Card - reusable generic)
      /features (TaskCard, ExpenseChart)
      /layout (Sidebar, Navbar)
    /hooks (useAuth, useSocket)
    /pages (Dashboard, Chat, Settings)
    /services (api client)
    /store (zustand stores)
    App.tsx
```

---

## 8. Development Roadmap

### Phase 1: Foundation (Current)
1.  **Setup:** Initialize Repo, Backend (FastAPI), Frontend (Vite).
2.  **Auth:** Implement JWT Auth (Signup/Login).
3.  **Groups:** Create/Join Groups.

### Phase 2: Core Features
4.  **Tasks:** CRUD, Assignment, Status updates.
5.  **Chat:** WebSocket integration for group chat.
6.  **Expenses:** Basic logging and total calculation.

### Phase 3: "Wow" Factors & Polish
7.  **Gamification:** Points logic, Badges, Lottie Animations.
8.  **AI Integration:** Stats aggregation, simple OpenAI/Gemini hook for "Morning Brief".
9.  **UI Polish:** Glassmorphism, smooth transitions.

---

## 9. Security & Scalability

### Security
- **Passwords:** Argon2 hashing.
- **Tokens:** Short-lived JWT Access Tokens, HttpOnly Refresh Cookies (optional) or Secure Storage.
- **Input Sanitization:** Pydantic validation on backend.
- **CORS:** Strict whitelist.

### 10. Frontend Screen List (User Flows)

#### A. Onboarding Flow
1.  **Landing Page:** "Use app" or "Join family". Cartoon mascot greeting.
2.  **Auth Screen:** Login / Register toggle. Simple form.
3.  **Setup/Join Group:**
    *   "Create a Home" (Name, Avatar).
    *   "Join a Home" (Enter 6-digit code).
4.  **Onboarding Survey:** "What are you good at?" (Cooking, Cleaning). Used for fairness logic.

#### B. Dashboard (Home)
*   **Header:** "Good Morning, [Name]!" (Animated Sun/Moon).
*   **Quick Stats:** "Your Balance: +$20", "Tasks Left: 2".
*   **Active Tasks Carousel:** Immediate to-dos.
*   **Notifications:** "Mom added a grocery item".

#### C. Tasks
*   **Task Board:** Columns (To Do, Doing, Done). Drag & drop.
*   **Add Task Modal:** Title, Type, Assignee (or "Assign to AI/Random"), Points.
*   **Task Details:** Comments/Chat specific to task, "Complete" button (triggers confetti).

#### D. Expenses
*   **Overview:** Pie chart of categorical spending.
*   **Add Expense:** Amount, Category, Split (Equal/Custom), Photo of receipt.
*   **Settlement:** "Who owes who". One-click "Settle Up" (Integration with payment links optional).

#### E. Chat
*   **Group Channel:** Main feed.
*   **System Messages:** "Dad paid $50 for Groceries" (Embedded in chat).
*   **AI Bot:** Mention @Homie to ask about budget or cleaning schedule.

#### F. Privacy & Settings
*   **AI Settings:** Toggle "AI Analysis" on/off.
*   **Fairness Report:** Weekly view of contribution scores.

