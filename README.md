# SPYCHAT — Privacy-First Android Chat & Audio/Video Calling App

A modern, secure, privacy-focused Android messaging and calling application.

## Core Goal

SPYCHAT is designed as a privacy-first communication app.

The application will NOT use:
- Phone number signup
- Phone number verification
- OTP login
- Contact-book synchronization
- Advertising trackers
- Precise location collection
- Public email exposure

Users create an account using only:

```text
Email
Password
   ↓
Create Account
   ↓
JWT Session
   ↓
Chat Home
```

No OTP or email verification is required for initial signup.

---

## 1. Technology Stack

### Android Client
- **React + TypeScript + Vite**
- **Capacitor** (for native Android runtime, camera/mic permissions, background handling)
- **Mobile-first responsive UI** with sleek Cyber-Dark aesthetic
- **WebRTC** for peer-to-peer HD Audio & Video Calling
- **Socket.io Client** for real-time signaling & E2EE ciphertext relay
- **Web Crypto API (SubtleCrypto)** for Client-Side End-to-End Encryption (ECDH + AES-256-GCM)

### Backend
- **Node.js + Express + TypeScript**
- **Socket.io** for real-time messaging, presence, and WebRTC call signaling
- **Database**: SQLite / PostgreSQL compatible schema
- **Security**: Argon2/Bcrypt password hashing, short-lived JWT, refresh tokens, rate-limiting, CORS, and strict input validation
- **Zero Knowledge Message Storage**: The server stores only encrypted ciphertexts, never plaintext

---

## 2. Authentication & Privacy

- **Endpoint**: `POST /auth/signup` and `POST /auth/login`
- **Private Identity**: Email is strictly private and never exposed to other users.
- **Public ID**: Each user gets a unique tag/username (e.g. `@shadow99`, `@cyber_fox`) for user discovery.
- **Zero Information Leakage**: IP address, device metadata, and internal DB keys are completely hidden from other peers.

---

## 3. WebRTC Calling Engine

- **Socket.io Signaling**: Used only to exchange SDP Offers, Answers, and ICE Candidates.
- **Peer-to-Peer Media**: Voice and Video media travel directly between peers via WebRTC (using Google STUN and optional TURN).
- **Call State Machine**: `IDLE` → `CALLING` → `RINGING` → `CONNECTING` → `CONNECTED` → `ENDING` → `ENDED`.
- **In-Call Controls**: Mute Microphone, Toggle Camera, Flip Camera, Speaker Toggle, HD Timer, and Network Quality Indicator.

---

## 4. End-to-End Encryption (E2EE)

```text
       User A (Sender)
              │
    [Local AES-256-GCM Encrypt]
              │
       Ciphertext only
              │
              ▼
   [SPYCHAT Node.js Server]
     (Stores Ciphertext only)
              │
              ▼
       Ciphertext only
              │
       User B (Receiver)
              │
    [Local AES-256-GCM Decrypt]
              │
       Decrypted Message
```

---

## 5. Project Directory Structure

```text
SPYCHAT/
├── server/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── conversations/
│   │   ├── messages/
│   │   ├── calls/
│   │   ├── middleware/
│   │   ├── socket/
│   │   ├── database/
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   ├── Chat/
│   │   │   ├── Call/
│   │   │   ├── Profile/
│   │   │   └── Settings/
│   │   ├── services/
│   │   │   ├── auth.ts
│   │   │   ├── socket.ts
│   │   │   ├── webrtc.ts
│   │   │   └── encryption.ts
│   │   ├── types/
│   │   └── App.tsx
│   ├── capacitor.config.ts
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```
