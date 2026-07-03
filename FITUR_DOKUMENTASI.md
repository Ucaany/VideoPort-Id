# Dokumentasi Fitur Showreels.id

**Platform**: Showreels.id — Platform Portfolio Video & Link Bio untuk Creator Indonesia
**Terakhir diupdate**: 3 Juli 2026

---

## Daftar Isi

1. [Dashboard Utama](#1-dashboard-utama)
2. [Onboarding](#2-onboarding)
3. [Analytics](#3-analytics)
4. [Video Management](#4-video-management)
5. [Link Builder](#5-link-builder)
6. [Profile Editor](#6-profile-editor)
7. [Billing & Subscription](#7-billing--subscription)
8. [Account Management](#8-account-management)
9. [Settings](#9-settings)

---

## 1. Dashboard Utama

**Route**: `/dashboard`
**File**: `src/app/dashboard/page.tsx`, `src/components/dashboard/dashboard-client.tsx`

### Header

- Greeting: "Halo, [Nama User]"
- Deskripsi: "Kelola portfolio, link bio, dan analytics showreels.id kamu dari sini."
- Jika onboarding belum selesai, muncul `OnboardingReminderCard` dengan link ke `/onboarding`

---

### Statistik (4 Kartu)

| Kartu | Data | Link |
|---|---|---|
| Total Video | Jumlah semua video user | `/dashboard/videos` |
| Video Publik | Jumlah video visibility `public` | `/dashboard/videos` |
| Total Views | Kunjungan ke profile | `/dashboard/analytics` |
| Link Aktif | Jumlah custom link yang enabled | `/dashboard/link-builder` |

Setiap kartu menampilkan: nilai angka, delta perubahan, hint text, dan link "Lihat".

---

### Portfolio Terbaru

- Menampilkan **5 video terakhir** user
- Tombol **"+ Tambah"** di header → `/dashboard/videos/new`
- Per item: icon film, judul video, badge status (`Publik` / `Draft` / `Private`), link external (jika public)
- **Empty state**: icon film, teks, tombol CTA "Tambah Video"
- Footer: link "Lihat semua portfolio" → `/dashboard/videos`

---

### Akses Cepat

| Aksi | Tujuan |
|---|---|
| Kelola Link Bio | `/dashboard/link-builder` |
| Lihat Analytics | `/dashboard/analytics` |
| Edit Profile | `/dashboard/profile` |
| Lihat Profile Publik | `/creator/[username]` (new tab) |

---

### Guard & Access Control

- `requireCurrentUser()` — wajib login
- Admin email → redirect ke `/admin`
- Onboarding belum selesai → redirect ke `/onboarding`
- `getEffectiveCreatorPlan()` — fetch plan untuk feature gating

---

## 2. Onboarding

**Route**: `/onboarding`
**File**: `src/app/onboarding/page.tsx`, `src/components/onboarding/onboarding-stepper.tsx`

Flow 3 langkah yang wajib diselesaikan sebelum bisa akses dashboard. Progress disimpan otomatis ke `progressPayload` di database (debounced 900ms).

---

### Step 1: Identitas Creator

**Field yang diisi:**

| Field | Keterangan |
|---|---|
| Nama / Display Name | Required, auto-fill dari akun |
| Username | Required, real-time availability check, min 3 karakter, alphanumeric + underscore/hyphen |
| Role / Profesi | Input text, contoh: "Videographer" |
| Bio | Textarea, max 240 karakter |

**Validasi username:**
- "Mengecek username..."
- "Username tersedia."
- "Username dipakai. Saran: [suggestion]"
- "Username ini sudah terhubung ke akun kamu."

---

### Step 2: Tambah Link

- Tombol **"Tambah link"** membuka `AddLinkModal`
- Platform yang didukung: Website, Instagram, YouTube, WhatsApp, TikTok, Link custom
- Daftar link yang sudah ditambahkan: icon, title & URL, tombol Hapus
- Tombol **"Lewati langkah link"** tersedia (opsional)
- Validasi: title & URL wajib, URL harus valid (`http/https`)
- Batas jumlah link mengikuti plan aktif

---

### Step 3: Preview & Selesai

- Grid 4 kartu info: Nama, Username, Role, jumlah Link
- **Preview mobile** (iPhone mockup): cover image, avatar, nama, role, bio, daftar link (max 4 tampil)
- Tombol **"Selesai & Masuk Dashboard"** → POST `/api/onboarding/complete` → redirect ke `/dashboard`
- Tombol Back untuk kembali ke step sebelumnya

---

### Auto-Save Draft

Status ditampilkan di sidebar:
- "Draft otomatis aktif."
- "Menyimpan draft..."
- "Draft tersimpan otomatis."
- "Draft belum tersimpan. Coba lanjutkan lagi."

---

### Sidebar Navigation

- 3 step card (Identitas Creator, Tambah Link, Preview & Selesai)
- Status per step: Sedang diisi / Selesai / Berikutnya
- Badge info: nama plan, maks link, status trial

---

### Tombol Aksi

| Tombol | Fungsi |
|---|---|
| Next | Validasi step, simpan progress, pindah ke step berikutnya |
| Skip (Step 1) | Konfirmasi → skip seluruh onboarding, simpan flag `onboardingSkipped` |
| Skip (Step 2) | Lewati langkah link, langsung ke step 3 |
| Selesai | Complete onboarding, redirect ke `/dashboard` |

---

## 3. Analytics

**Route**: `/dashboard/analytics`
**File**: `src/app/dashboard/analytics/page.tsx`, `src/components/dashboard/creator-traffic-panel.tsx`

---

### Header

- Judul: "Analytics"
- Deskripsi: "Pantau kunjungan profil, performa video, dan peluang optimasi secara real-time."
- Tombol shortcut: Build Link → `/dashboard/link-builder`, Upload Video → `/dashboard/videos`

---

### Creator Traffic Panel

Metrics yang ditampilkan:
- Total Profile Views (periode terpilih)
- Total Link Clicks
- Top Performing Videos
- Traffic Sources
- Grafik line chart traffic over time

Filter periode: 7 hari / 30 hari / 90 hari (tergantung plan)

---

### Tips Tingkatkan Trafik (3 kartu)

| Tips | Deskripsi |
|---|---|
| Update Link Builder rutin | Letakkan link prioritas di urutan atas |
| Bagikan public link | Tambahkan ke Instagram bio, WhatsApp, email, proposal |
| Aktifkan video publik | Tampilkan karya terbaik untuk meningkatkan kunjungan |

---

## 4. Video Management

**Route**: `/dashboard/videos`
**File**: `src/app/dashboard/videos/page.tsx`, `src/components/dashboard/videos-page-client.tsx`

Load maksimal 50 video per request (`VIDEOS_PAGE_LIMIT`).

---

### Header & Ringkasan

- Judul: "Portfolio"
- Tombol **"+ Upload Video"** → `/dashboard/videos/new`
- Tombol **"Build Link"** → `/dashboard/link-builder`
- Counter otomatis: Public ready / Draft / Pinned

---

### Daftar Video

Data per video yang ditampilkan:
- Thumbnail (16:9)
- Judul
- Source platform
- Visibility badge: `Public` / `Draft` / `Private` / `Semi-Private`
- Status pin (jika di-pin ke profile)
- Tanggal upload

---

### Aksi per Video

| Aksi | Keterangan |
|---|---|
| Edit | Buka `/dashboard/videos/[id]` |
| View Public | Buka `/v/[publicSlug]` di tab baru |
| Delete | Konfirmasi hapus |
| Pin / Unpin | Toggle pin ke profile (maks 3 video) |
| Change Visibility | Switch Public / Draft / Private |

---

### Upload Video Baru

**Route**: `/dashboard/videos/new`

Source yang didukung:
- YouTube (URL)
- Vimeo (URL)
- Instagram (URL)
- Facebook (URL)
- TikTok (URL)
- Google Drive (URL)
- Direct Upload file (plan tertentu)

Field form: judul (required), deskripsi, source URL (required), thumbnail URL (opsional), visibility, pin to profile.

---

### Edit Video

**Route**: `/dashboard/videos/[id]`

Bisa diubah: judul, deskripsi, visibility, pin status, thumbnail, source URL. Tersedia embedded player preview dan delete video.

---

### Sistem Pin

- Video yang di-pin tampil di bagian atas profile creator
- Drag & drop untuk mengubah urutan (field `pinnedOrder`)
- Batas pin mengikuti plan

---

### Empty State

Jika belum ada video: icon film, teks "Belum ada video portfolio", tombol CTA "Upload video pertama".

---

## 5. Link Builder

**Route**: `/dashboard/link-builder`
**File**: `src/components/builder/link-builder-editor.tsx`

---

### Batas Link per Plan

| Plan | Maks Link |
|---|---|
| Free | 5 |
| Creator | 15 |
| Business | Unlimited |

---

### Manajemen Link

- **Drag & Drop** reorder via `@dnd-kit/core`
- Tombol Move Up / Move Down sebagai alternatif
- Toggle enable / disable per link
- Edit inline: title, URL, deskripsi
- Delete link (dengan konfirmasi)

---

### Tambah Link (Modal)

Tab di dalam AddLinkModal:

**Social Media**
- Platform: Instagram, YouTube, Facebook, LinkedIn, Threads
- Input username → auto-build URL yang benar
- Auto-extract username dari URL yang di-paste

**Website**
- Title, URL, deskripsi opsional

**Contact**
- Email: generate `mailto:` link
- WhatsApp: generate `wa.me/` link dengan pesan opsional

**Custom**
- Kontrol penuh: title, URL, deskripsi, icon

---

### Social Media yang Didukung

| Platform | Format URL | Icon |
|---|---|---|
| Instagram | `instagram.com/username` | Pink |
| YouTube | `youtube.com/@channel` | Merah |
| Facebook | `facebook.com/username` | Biru |
| LinkedIn | `linkedin.com/in/username` | Biru |
| Threads | `threads.net/@username` | Hitam |

---

### Experience Items (Portfolio Timeline)

- Tambah riwayat: nama perusahaan/proyek, role, periode, deskripsi
- Drag & drop reorder
- Tampil di public profile sebagai timeline

---

### Preview Mode

- Toggle **Desktop** / **Mobile** preview
- iPhone mockup untuk mobile preview
- Update real-time saat mengedit

---

### Upgrade Prompt

Saat jumlah link mencapai batas plan, muncul prompt upgrade dengan link ke `/dashboard/billing`.

---

## 6. Profile Editor

**Route**: `/dashboard/profile`
**File**: `src/components/dashboard/profile-form.tsx`

---

### Informasi Dasar

| Field | Keterangan |
|---|---|
| Display Name | Required, min 2 karakter |
| Username | Required, unique, min 3 maks 30 karakter, real-time availability check |
| Email | Read-only (dari akun login) |
| Role / Profesi | Maks 120 karakter |
| Bio | Maks 240 karakter, support multiline |
| Tanggal Lahir | Menghitung umur otomatis |
| Kota | Opsional |

Perubahan username dibatasi sesuai plan (contoh Free: 2x per 30 hari).

---

### Foto Profil & Cover

**Foto Profil:**
- Upload dari device atau paste URL
- Image crop dialog: aspect ratio 1:1, zoom & pan
- Format: JPG, PNG, WebP

**Cover Image:**
- Upload dari device atau paste URL
- Image crop dialog: aspect ratio 16:9
- Recommended size: 1200x400px

Crop menggunakan field `avatarCropX`, `avatarCropY`, `avatarCropZoom` (dan padanan untuk cover).

---

### Auto-save

Form menggunakan debounced autosave (timer ref). Status: idle / saving / saved / error.

---

### Aksi

| Aksi | Keterangan |
|---|---|
| Simpan | PATCH `/api/profile/update` |
| Preview Profile | Buka `/creator/[username]` di tab baru |
| Copy Profile Link | Salin URL profil publik |
| Share Profile | Native share dialog (mobile) |

---

## 7. Billing & Subscription

**Route**: `/dashboard/billing`
**File**: `src/app/dashboard/billing/page.tsx`, `src/components/dashboard/billing-panel.tsx`

---

### Kartu Plan Aktif

Info yang ditampilkan:
- Nama plan: FREE / CREATOR / BUSINESS
- Harga (format IDR)
- Status: `active` / `trial` / `expired` / `failed` / `pending`
- Tanggal renewal
- Countdown hari tersisa (jika trial)

Tombol aksi: Upgrade Plan, Ganti Siklus (monthly/yearly), Batalkan Langganan, Perpanjang Lebih Awal.

---

### Perbandingan Plan

| Fitur | Free | Creator | Business |
|---|---|---|---|
| Custom links | 5 | 15 | Unlimited |
| Analytics | 7 hari | 30 hari | 90 hari |
| Custom thumbnail | - | Ya | Ya |
| Whitelabel | - | - | Ya |
| Grup Creator | - | - | Ya |
| Support | Basic | Email | 24/7 |

---

### Payment

**Provider**: Bayar.gg integration
- Virtual Account (BCA, BNI, Mandiri, BRI)
- E-wallet (GoPay, OVO, DANA, ShopeePay)
- QRIS
- Kartu Kredit

**Flow pembayaran:**
1. Pilih plan & siklus billing
2. Review order
3. Pilih metode pembayaran
4. Redirect ke payment gateway
5. Callback → update subscription

---

### Riwayat Transaksi

Kolom: Invoice ID, Tanggal, Plan, Jumlah, Status, Aksi.

Status transaksi: `paid` / `pending` / `failed` / `expired` / `cancelled`

Aksi per transaksi: Lihat invoice, Download PDF, Bayar sekarang (jika pending).

---

### Auto-refresh Status

Jika URL mengandung query `?invoice=[id]`, halaman otomatis memanggil `refreshPaymentTransactionStatus` untuk sinkronisasi status terbaru dari gateway.

---

## 8. Account Management

**Route**: `/dashboard/account`
**File**: `src/app/dashboard/account/page.tsx`

---

### Kartu Informasi Akun

- Avatar (64px, fallback inisial 2 huruf)
- Nama, email, username
- Badge role/plan

---

### Kartu Pengaturan Cepat

| Menu | Tujuan |
|---|---|
| Edit Profile | `/dashboard/profile` |
| Settings | `/dashboard/settings` |
| Billing & Langganan | `/dashboard/billing` |
| Keamanan & Password | `/dashboard/settings/security` |

---

## 9. Settings

**Route**: `/dashboard/settings`
**File**: `src/components/dashboard/settings-hub.tsx`

Header menampilkan badge: nama plan aktif dan jumlah hari analytics yang tersedia.

---

### Menu Settings (Grid 3 Kolom)

| Menu | Route | Deskripsi |
|---|---|---|
| Privasi Creator | `/settings/privacy` | Public profile, indexing, email publik, statistik publik |
| Link Profile | `/settings/link-profile` | Ganti slug, cek username, URL publik profile |
| Payment | `/settings/payment` | Billing email, payment method default, tax info, invoice note |
| Whitelabel | `/settings/whitelabel` | Aktifkan/nonaktifkan branding Showreels.id (Business only) |
| Ganti Tema | — | Coming Soon, Business plan only |
| Security | `/settings/security` | Ganti password, logout semua perangkat |
| Grup Khusus Creator | External link | Komunitas creator (jika plan mendukung) |
| Contact Support | External link | Hubungi tim support (jika plan mendukung) |

---

### Hapus Akun (Danger Zone)

Proses 3 tahap:
1. User mengetik `HAPUS AKUN` di input field
2. Konfirmasi pertama: "Akun akan dihapus permanen"
3. Konfirmasi kedua: "Yakin ingin hapus akun?"

Setelah berhasil:
- DELETE `/api/profile`
- `signOut()` → redirect ke `/auth/login`
- Data profile, link, analytics, billing history **tidak bisa dikembalikan**

---

## Catatan Teknis

### Arsitektur Data Fetching

| Pendekatan | Digunakan Pada |
|---|---|
| Server Components (async/await) | page.tsx semua halaman dashboard |
| SWR Client Hooks | dashboard-client.tsx, videos-page-client.tsx |
| Prefetch via PrefetchLink | Navigasi antar halaman dashboard |

### Stack Utama

- **Framework**: Next.js App Router
- **Database ORM**: Drizzle ORM
- **Auth**: NextAuth.js
- **Drag & Drop**: @dnd-kit/core
- **Form Validation**: react-hook-form + Zod
- **Data Fetching Client**: SWR
- **Payment**: Bayar.gg

### API Endpoints Onboarding

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/onboarding/status` | Cek status onboarding |
| POST | `/api/onboarding/progress` | Simpan progress step |
| POST | `/api/onboarding/skip` | Skip onboarding |
| POST | `/api/onboarding/complete` | Selesaikan onboarding |
