# 🎨 TalkSpace Frontend

TalkSpace Frontend is a **production-grade real-time communication UI** built with
**React, TypeScript, Vite, Tailwind CSS, Socket.IO, and WebRTC**.

It delivers a complete messaging experience including **real-time chat, media sharing, voice messaging, and audio/video calling**, all wrapped in a scalable and clean architecture.

---

## 🌐 Live Demo

> The live demo is hosted separately — check your deployment configuration for the production URL.

* 🔐 Create an account or log in
* 💬 Experience real-time messaging
* 🎙️ Send voice messages
* 📞 Try audio & video calling in real-time

---

## 🚀 Features

### 💬 Messaging & Communication

* Real-time chat (Socket.IO powered)
* Optimistic UI updates
* Message pagination & scroll preservation
* Reply-to message support
* Delivery & read receipts
* File attachments with previews
* 🎙️ Voice messaging support
* Typing indicators 

### 📞 Calling System

* 🎙️ Voice messaging
* 📹 Real-time audio & video calling (WebRTC)
* Socket-based signaling system
* Peer-to-peer media streaming

### 👥 Social Features

* Friend system & requests
* User presence (online/offline)
* Notifications panel (real-time synced)

### 🔐 Authentication

* Login & Registration
* Email verification
* Password reset flow
* Protected routes

### 🎨 UI/UX

* Modern dark-themed UI
* Glassmorphic design system
* Fully responsive (desktop + mobile)
* Smooth transitions & interactions

---

## 🧠 Architecture Highlights

* Feature-based scalable folder structure
* Context-driven global state management
* Custom hooks for business logic separation
* Socket layer for real-time sync
* WebRTC layer for peer-to-peer communication
* Clean separation between UI and logic

---

## 🛠 Tech Stack

### Frontend Core

* React (Vite)
* TypeScript
* Tailwind CSS

### State & Networking

* Context API
* Axios
* Socket.IO Client

### Realtime & Media

* WebRTC APIs (RTCPeerConnection, MediaStream)

### DevOps

* Docker
* Nginx

---

## 📂 Project Structure

```txt
frontend/
├── public/
├── src/
│ ├── apis/
│ │ ├── auth.api.ts
│ │ ├── axios.ts
│ │ ├── chat.api.ts
│ │ ├── friend.api.ts
│ │ ├── notification.api.ts
│ │ ├── profile.api.ts
│ │ └── socket.ts
│ │
│ ├── components/
│ │ ├── call/                 
│ │ │ ├── hooks/
│ │ │ │ └── useCall.ts
│ │ │ └── CallWindow.tsx
│ │ │
│ │ ├── chat/
│ │ │ ├── hooks/
│ │ │ ├── ChatHeader.tsx
│ │ │ ├── ChatWindow.tsx
│ │ │ ├── MessageBubble.tsx
│ │ │ ├── MessageInput.tsx
│ │ │ ├── FilePreview.tsx
│ │ │ └── index.ts
│ │ │
│ │ ├── dashboard/
│ │ ├── layout/
│ │ ├── notifications/
│ │ ├── profile/
│ │ └── TopLoader.tsx
│ │
│ ├── context/
│ │ ├── AuthContext.tsx
│ │ ├── CallContext.tsx
│ │ ├── NotificationContext.tsx
│ │ └── PresenceContext.tsx
│ │
│ ├── pages/
│ │ ├── auth/
│ │ ├── profile/
│ │ ├── DashboardPage.tsx
│ │ ├── NotificationsPage.tsx
│ │ └── SettingsPage.tsx
│ │
│ ├── routes/
│ │ ├── ProtectedRoute.tsx
│ │ └── PublicRoute.tsx
│ │
│ ├── utils/
│ ├── App.tsx
│ ├── main.tsx
│ └── styles/
│
├── .env
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── vite.config.ts
└── package.json
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 📥 Installation & Running Locally

```bash
npm install
npm run dev
```

App runs on: `http://localhost:5173`

---

## 🐳 Docker

```bash
docker build -t talkspace-frontend .
docker run -p 5173:80 talkspace-frontend
```

---

## 🧪 Scripts

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
```

---

## 🔐 Routing Strategy

* **PublicRoute** → Authentication pages
* **ProtectedRoute** → Authenticated application
* Context-based authentication guard

---

## 📡 Real-Time & Calling Flow

### Messaging

1. User sends a message
2. UI updates optimistically
3. Socket event emitted
4. Backend persists message
5. Receiver gets instant update

### Calling (WebRTC)

1. User initiates call
2. Socket sends signaling event
3. Peer connection is created
4. Offer/Answer exchange
5. ICE candidates shared
6. Direct media stream established

---

## 🎯 Design Principles

* Feature-based architecture
* Clean separation of concerns
* Reusable components
* Scalable real-time system design
* Maintainable and modular codebase

---

## 📄 License

This project is intended for learning, portfolio, and development use. See [LICENSE](../LICENSE).
