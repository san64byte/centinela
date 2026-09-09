# 🔐 Centinela

**Centinela** adalah password manager **zero-knowledge** yang dibangun dengan Next.js. Nama "Centinela" (bahasa Spanyol: _penjaga/sentry_) mencerminkan fungsi utamanya — menjaga rahasia kamu tanpa pernah melihat isinya sendiri.

> **Zero-knowledge** berarti: server (dan siapa pun yang punya akses ke database) **tidak pernah** bisa melihat data asli kamu — username, password, catatan — karena semuanya dienkripsi di browser **sebelum** dikirim ke server. Bahkan developer aplikasi ini sendiri tidak bisa membukanya tanpa Master Password kamu.

---

## ✨ Fitur Utama

- 🔑 **End-to-end encryption** — data dienkripsi/didekripsi sepenuhnya di client (browser), menggunakan **AES-256-GCM**.
- 🧂 **Key derivation aman** — Master Password diubah jadi kunci lewat **PBKDF2-SHA256** (600.000 iterasi, sesuai rekomendasi OWASP).
- 🗝️ **Dua lapis kunci (envelope encryption)** — `vaultKey` (kunci asli yang mengenkripsi vault item) dipisah dari `masterKey` (kunci turunan Master Password yang cuma membungkus `vaultKey`). Ganti Master Password tidak perlu membongkar ulang seluruh vault.
- 🎲 **Built-in Password Generator** — alat pembuat kata sandi acak ber-entropi tinggi (`crypto.getRandomValues`) dengan pengaturan panjang karakter, variasi simbol/angka, opsi menghindari karakter ambigu, dan indikator kekuatan (_strength meter_).
- ⚡ **Supabase Keep-Alive Automation** — alur kerja GitHub Actions otomatis yang melakukan _ping_ query ke database Supabase setiap 3 hari sekali agar database gratis tidak di-pause.
- 🚫 **Master Password tidak pernah dikirim ke server** — hanya digunakan untuk derive key di browser.
- 🧠 **Kunci hanya hidup di memory** — `masterKey` dan `vaultKey` otomatis hilang saat refresh halaman, memaksa re-derive dari Master Password.
- 🔒 **Autentikasi terpisah** — login/register dikelola oleh [Better Auth](https://www.better-auth.com/), independen dari sistem enkripsi vault.
- ✉️ **Verifikasi Email** — konfirmasi akun aman via email menggunakan [Resend](https://resend.com/).
- ✅ **Integritas data terjamin** — AES-GCM punya _authentication tag_ built-in, otomatis mendeteksi password salah atau data yang di-tamper.

---

## 🏗️ Arsitektur

```mermaid
graph TD
    subgraph Client["BROWSER - Client Side"]
        Auth["Better Auth: Login/Register"]
        MP_Input["User Input: Master Password"]
        PBKDF2["PBKDF2 Function"]
        MK["masterKey - di memory, hilang saat refresh"]
        VaultKeyGen["vaultKey - random, dibuat sekali saat setup Master Password"]
        Wrap["Wrap - encrypt vaultKey pakai masterKey"]
        Unwrap["Unwrap - decrypt encryptedVaultKey pakai masterKey"]
        PlainData["Plaintext Data - sebelum dienkripsi"]
        Encrypt_Proc["Encryption Process - AES-GCM"]
        Decrypt_Proc["Decryption Process - AES-GCM"]
    end
    subgraph Server["SERVER and DATABASE - Prisma & Supabase"]
        UserTable["User Table: id, email, password hash, vaultSalt, encryptedVaultKey"]
        VaultTable["VaultItem Table: title, category, url plain - ciphertext, iv encrypted"]
    end

    Auth --> MP_Input
    MP_Input --> PBKDF2
    PBKDF2 -->|generates| MK
    PBKDF2 -.->|vaultSalt generated once at register| VS_Gen["vaultSalt"]
    VS_Gen -->|stored in| UserTable

    VaultKeyGen -->|generated once, at setup Master Password| Wrap
    MK --> Wrap
    Wrap -->|stores| UserTable

    UserTable -->|fetch vaultSalt| PBKDF2
    UserTable -->|fetch encryptedVaultKey| Unwrap
    MK --> Unwrap
    Unwrap -->|yields| VaultKeyGen

    PlainData --> Encrypt_Proc
    VaultKeyGen --> Encrypt_Proc
    Encrypt_Proc -->|sends ciphertext plus iv| VaultTable

    VaultTable -->|fetch metadata| Dashboard["Dashboard List"]
    VaultTable -->|fetch ciphertext plus iv| Decrypt_Proc
    VaultKeyGen --> Decrypt_Proc
    Decrypt_Proc -->|success or fail| PlainData

    style MK fill:#ffcdd2,stroke:#b71c1c
    style VaultKeyGen fill:#ffe0b2,stroke:#e65100
    style VS_Gen fill:#c8e6c9,stroke:#1b5e20
    style Client fill:#f3e5f5,stroke:#4a148c
    style Server fill:#e1f5fe,stroke:#01579b
```

### Alur Singkat Kriptografi

1. **Register** — User register lewat Better Auth → `vaultSalt` random di-generate sekali → disimpan di `User` table. Vault belum siap dipakai di titik ini.
2. **Setup Master Password** — User membuat Master Password → Master Password + `vaultSalt` di-derive lewat PBKDF2 jadi **`masterKey`** → `vaultKey` (kunci acak 256-bit) di-generate → `vaultKey` dienkripsi pakai `masterKey` → hasilnya (`encryptedVaultKey`) disimpan di `User` table.
3. **Unlock Vault** — Setiap kali buka app / refresh, user input Master Password → `vaultSalt` + `encryptedVaultKey` diambil dari server → `masterKey` di-derive ulang → dipakai untuk membuka `encryptedVaultKey` → didapat `vaultKey` asli di memori browser.
4. **Simpan Item** — Kredensial akun digabung jadi JSON → dienkripsi pakai `vaultKey` + AES-GCM → hanya `ciphertext` + `iv` yang dikirim & disimpan di server.
5. **Buka Item** — `ciphertext` + `iv` diambil dari server → didekripsi di client pakai `vaultKey` → jika Master Password salah, `masterKey` salah, dan dekripsi gagal otomatis (_authentication tag mismatch_).
6. **Ganti Master Password** — `masterKey` lama membuka `encryptedVaultKey` → `masterKey` baru membungkus ulang `vaultKey` yang sama → **`vaultKey` tidak berubah**, sehingga seluruh data vault tidak perlu dienkripsi ulang.

---

## 🧰 Tech Stack

| Layer               | Teknologi                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Framework**       | [Next.js](https://nextjs.org/) 16 (App Router, Server Actions)                               |
| **Bahasa**          | TypeScript                                                                                   |
| **Autentikasi**     | [Better Auth](https://www.better-auth.com/)                                                  |
| **Database & ORM**  | [Prisma](https://www.prisma.io/) + [Supabase](https://supabase.com/) (PostgreSQL)            |
| **Enkripsi Client** | Web Crypto API (`PBKDF2-SHA256`, `AES-256-GCM`, `getRandomValues`)                           |
| **Form & Validasi** | [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev/)                         |
| **UI Components**   | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/) + Radix UI |
| **Email Service**   | [Resend](https://resend.com/)                                                                |
| **Automasi / Cron** | GitHub Actions (Scheduled Supabase Keep-Alive)                                               |
| **Testing**         | [Vitest](https://vitest.dev/)                                                                |

---

## 📁 Struktur Direktori

```text
centinela/
├── .github/
│   └── workflows/
│       └── keep-alive.yml      # Workflow otomatisasi anti-pause Supabase
├── prisma/
│   └── schema.prisma           # Skema database Prisma (User, VaultItem, Session)
├── scripts/
│   └── keep-alive.mjs          # Script Node.js mandiri ping PostgreSQL Supabase
├── src/
│   ├── actions/                # Server Actions (settings, setup-vault, vault)
│   ├── app/                    # Next.js App Router (pages & API routes)
│   │   └── api/
│   │       ├── auth/           # Better Auth handler
│   │       └── cron/keep-alive # Endpoint alternatif cron ping database
│   ├── components/
│   │   ├── auth/               # Form login, register, reset password
│   │   ├── settings/           # Form profil, email, master password
│   │   ├── ui/                 # Komponen dasar shadcn/ui
│   │   ├── vault/              # Dashboard vault, form modal, card, detail
│   │   └── password-generator.tsx # Komponen dialog password generator
│   ├── hooks/                  # Custom React hooks (useVaultKey, useSignout, dll)
│   ├── lib/
│   │   ├── crypto/             # Modul Web Crypto (keys, encryption, setup, generator)
│   │   ├── auth.ts             # Konfigurasi Better Auth
│   │   └── prisma.ts           # Inisialisasi Prisma Client & adapter-pg
│   ├── schemas/                # Skema validasi Zod
│   ├── test/                   # Unit test Vitest (crypto, schema, actions)
│   └── types/                  # Definisi tipe TypeScript
└── vercel.json                 # Konfigurasi deployment & Vercel Cron
```

---

## 🔬 Detail Kriptografi

### 1. Key Derivation — PBKDF2-SHA256 (menghasilkan `masterKey`)

```text
Master Password + vaultSalt
        ↓  (600.000 iterasi HMAC-SHA256)
       masterKey (256-bit, non-extractable)
```

| Parameter           | Nilai             | Alasan                                                                 |
| ------------------- | ----------------- | ---------------------------------------------------------------------- |
| Iterasi             | 600.000           | Rekomendasi minimum OWASP untuk PBKDF2-SHA256                          |
| Hash function       | SHA-256           | Aman, didukung bawaan Web Crypto API browser                           |
| Panjang `masterKey` | 256-bit           | Wrapping key untuk `vaultKey`                                          |
| Panjang `vaultSalt` | 16 byte (128-bit) | Dibuat sekali saat register; mencegah serangan _rainbow table_         |
| `extractable`       | `false`           | Key tidak bisa di-export keluar memori browser — proteksi terhadap XSS |

### 2. Envelope Encryption — `vaultKey` dibungkus oleh `masterKey`

```text
vaultKey (256-bit random, dibuat sekali saat setup Master Password)
        ↓  (encrypt / wrap pakai masterKey, AES-GCM)
   encryptedVaultKey  ← disimpan permanen di database
```

### 3. Enkripsi/Dekripsi Vault Item — AES-256-GCM (pakai `vaultKey`)

| Parameter          | Nilai            | Alasan                                                                       |
| ------------------ | ---------------- | ---------------------------------------------------------------------------- |
| Mode               | GCM              | Punya _authentication tag_ bawaan — mendeteksi manipulasi data / kunci salah |
| Panjang `iv`       | 12 byte (96-bit) | Standar optimal untuk AES-GCM, **wajib unik** setiap proses enkripsi         |
| `vaultSalt` & `iv` | Tidak rahasia    | Aman disimpan plain di database — mencegah pola, bukan menyembunyikan        |

> Implementasi lengkap tersedia di folder [`src/lib/crypto/`](./src/lib/crypto).

---

## 🚀 Getting Started

### 1. Prasyarat

- Node.js versi 20 atau 24+
- Akun [Supabase](https://supabase.com/) (atau instance PostgreSQL lainnya)
- Akun [Resend](https://resend.com/) untuk pengiriman email verifikasi

### 2. Instalasi

```bash
# Clone repositori
git clone https://github.com/sannxyz/centinela.git
cd centinela

# Install dependencies
npm install

# Salin konfigurasi environment
cp .env.example .env
```

### 3. Setup Environment Variables (`.env`)

Isi variabel di file `.env`:

```env
# Database Connection (Supabase Transaction Pooler)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct Connection (Session Pooler untuk migrasi Prisma)
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Resend API Key
RESEND_API_KEY="re_xxxxxxxxxxxx"

# Better Auth Configuration
BETTER_AUTH_SECRET="your-32-character-random-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Opsional: Cron Secret untuk mengamankan route /api/cron/keep-alive
CRON_SECRET="your-cron-secret-key"
```

### 4. Database Setup & Menjalankan Aplikasi

```bash
# Generate Prisma Client & jalankan migrasi
npx prisma generate
npx prisma migrate dev

# Uji coba koneksi database
npm run db:keep-alive

# Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🧪 Skrip yang Tersedia

- `npm run dev` — Menjalankan development server Next.js.
- `npm run build` — Melakukan linting dan membuat build produksi.
- `npm run test` — Menjalankan automated test suite menggunakan Vitest.
- `npm run test:watch` — Menjalankan Vitest dalam mode watch interaktif.
- `npm run lint` — Memeriksa kualitas kode dengan ESLint.
- `npm run db:keep-alive` — Menjalankan uji ping ke database Supabase untuk memastikan koneksi aktif.

---

## ⚙️ Supabase Anti-Pause (GitHub Actions)

Supabase Free Tier otomatis menghentikan (_pause_) project jika tidak ada aktivitas selama 7 hari. Repository ini dilengkapi workflow GitHub Actions di `.github/workflows/keep-alive.yml` yang otomatis melakukan query ringan ke database setiap 3 hari sekali.

**Cara mengaktifkannya di GitHub:**

1. Masuk ke repository GitHub Anda: **Settings** > **Secrets and variables** > **Actions**.
2. Buat secret baru bernama `DATABASE_URL`.
3. Masukkan connection string Supabase Anda.
4. Selesai! GitHub Actions akan berjalan otomatis setiap 3 hari sekali tanpa perlu menyalakan komputer lokal Anda.

---

## ⚠️ Catatan Keamanan

- **Master Password tidak bisa direset** jika lupa: Karena server tidak pernah menyimpan `masterKey` atau `vaultKey`, tidak ada tombol "Forgot Master Password" konvensional. Mereset Master Password akan menghapus seluruh data vault demi keamanan.
- **Ganti Master Password aman & ringan**: Dengan envelope encryption, mengganti Master Password hanya membungkus ulang `vaultKey` yang sama tanpa perlu decrypt-encrypt ulang item vault.
- **Peringatan GitGuardian pada Test Credentials**: String password di dalam `src/test/vault-crypto.test.ts` hanyalah data tiruan (_mock data_) untuk unit testing Vitest dan bukan password akun atau database yang sebenarnya.

---

## 📄 Lisensi

MIT License. Dibuat oleh [Joko Santoso](https://github.com/sannxyz).
