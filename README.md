# 🔐 Centinela

**Centinela** is a zero-knowledge password and secret manager built with **Next.js 16**, **React 19**, and the **Web Crypto API**. All sensitive credentials are encrypted and decrypted entirely client-side using **AES-256-GCM** before reaching the database. The server never sees your plaintext data or Master Password.

---

## ✨ Features

- **Zero-Knowledge Encryption** — Client-side encryption with **AES-256-GCM**; server only stores ciphertext and IVs.
- **Envelope Encryption** — A dedicated `vaultKey` is wrapped by a PBKDF2-derived `masterKey` (600,000 iterations, OWASP recommended). Changing Master Passwords requires re-wrapping only the `vaultKey`, without re-encrypting vault items.
- **Flexible Vault Items**:
  - **Account**: Stores Email, **Username / ID** (accommodates usernames, member numbers, account IDs), optional Password/PIN, and secure notes.
  - **Credential History**: Tracks password/PIN changes with individual delete controls and toggle to exclude accidental typos.
  - **Note**: Secure markdown/text notes up to 10,000 characters.
- **Built-in Password Generator** — Cryptographically secure (`crypto.getRandomValues`) generator with customizable length, character sets, and ambiguous character filtering.
- **Independent Authentication** — User account sessions managed by **Better Auth** with email verification via **Resend**.
- **In-Memory Security** — Encryption keys live strictly in browser memory and are flushed on page reload.
- **Database Keep-Alive** — Automated GitHub Actions workflow to keep free-tier Supabase PostgreSQL active.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Client["Client (Browser Memory)"]
        MP["Master Password"]
        Salt["vaultSalt"]
        PBKDF2["PBKDF2-SHA256 (600k iters)"]
        MK["masterKey (AES-256-GCM)"]
        VK["vaultKey (256-bit random)"]
        ItemData["Plaintext Credentials / Note"]
        CipherEngine["AES-GCM 256-bit Engine"]
    end

    subgraph Server["Server & PostgreSQL (Prisma)"]
        UserDB[("User Table\nvaultSalt, encryptedVaultKey, IV")]
        VaultDB[("VaultItem Table\nciphertext, iv, metadata")]
    end

    MP & Salt --> PBKDF2 --> MK
    MK -- "Wrap / Unwrap" --> VK
    VK & ItemData <--> CipherEngine
    CipherEngine <-->|"ciphertext + iv"| VaultDB
    MK <-->|"encryptedVaultKey + iv"| UserDB
```

---

## 🧰 Tech Stack

| Layer                  | Technology                                                                               |
| :--------------------- | :--------------------------------------------------------------------------------------- |
| **Framework**          | [Next.js 16](https://nextjs.org/) (App Router, Server Actions)                           |
| **Frontend**           | React 19, Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com/)                           |
| **Cryptography**       | Web Crypto API (`PBKDF2-SHA256`, `AES-256-GCM`, `crypto.getRandomValues`)                |
| **Database & ORM**     | PostgreSQL ([Supabase](https://supabase.com/)) + [Prisma ORM v7](https://www.prisma.io/) |
| **Authentication**     | [Better Auth](https://www.better-auth.com/) + [Resend](https://resend.com/)              |
| **Forms & Validation** | [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev/)                     |
| **Testing**            | [Vitest](https://vitest.dev/)                                                            |

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js** >= 20 (recommended: Node 24)
- PostgreSQL database (e.g. [Supabase](https://supabase.com/))
- [Resend](https://resend.com/) account for verification emails

### 2. Installation

```bash
git clone https://github.com/sanwxyz/centinela.git
cd centinela
npm install
cp .env.example .env
```

### 3. Environment Variables (`.env`)

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
RESEND_API_KEY="re_xxxxxxxxxxxx"
BETTER_AUTH_SECRET="your-32-character-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
CRON_SECRET="your-cron-secret-key"
```

### 4. Database Setup & Run

```bash
# Push migrations and generate client
npx prisma generate
npx prisma migrate dev

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the application.

---

## 🧪 Available Scripts

- `npm run dev` — Starts Next.js development server.
- `npm run build` — Lints code and builds production bundle.
- `npm run test` — Runs test suite with Vitest.
- `npm run test:watch` — Runs tests in watch mode.
- `npm run lint` — Runs ESLint checks.
- `npm run format:check` — Checks code formatting with Prettier.
- `npm run format` — Formats all files with Prettier.
- `npm run db:keep-alive` — Executes keep-alive ping query to Supabase.

---

## 🔒 Security Principles

1. **Zero Knowledge**: The server and database never receive plaintext credentials, notes, or the Master Password.
2. **Key Isolation**: Master Password derivation key (`masterKey`) never encrypts items directly; it only wraps the random `vaultKey`.
3. **OWASP Compliance**: Key derivation uses PBKDF2 with SHA-256 and 600,000 iterations.
4. **Authenticity Verification**: AES-256-GCM authentication tags prevent tampering; any incorrect key or corrupted ciphertext results in immediate decryption failure.
5. **No Local Persistence**: Neither `masterKey` nor `vaultKey` is ever stored in `localStorage` or `sessionStorage`.

---

## 📄 License

MIT License. Designed and built by [Joko Santoso](https://github.com/sanwxyz).
