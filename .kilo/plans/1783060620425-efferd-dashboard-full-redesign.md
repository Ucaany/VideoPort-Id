# Full Redesign Showreels.id — Efferd Dashboard-3 Design Language

**Tanggal**: 3 Juli 2026  
**Scope**: Redesign penuh semua halaman dashboard & onboarding menggunakan visual language dari `@efferd/dashboard-3`

---

## Konteks & Keputusan Desain

### Apa yang sudah terinstall dari `@efferd/dashboard-3`
Saat `npx shadcn@latest add @efferd/dashboard-3` dijalankan, komponen berikut diinstall/overwrite:
- `src/components/ui/button.tsx` — Base UI primitives (bukan Radix)
- `src/components/ui/select.tsx` — Base UI `@base-ui/react/select`
- `src/components/ui/table.tsx` — shadcn table standard
- `src/components/indicator.tsx` — `StatusIndicator` dengan color variants (emerald/rose/amber/sky) + pulse animation

### Design Language Efferd Dashboard-3
Berdasarkan analisis komponen yang diinstall:
- **Primitives**: Base UI (`@base-ui/react`) — bukan Radix UI
- **Button**: `rounded-lg`, variant `default/outline/secondary/ghost/destructive/link`, size `xs/sm/default/lg/icon`
- **Select**: Base UI select dengan `rounded-lg`, border `border-input`
- **Indicator**: Status dot dengan pulse animation, warna emerald/rose/amber/sky
- **Table**: Standard shadcn table dengan `hover:bg-muted/50`
- **Warna token**: oklch-based CSS variables (`--background`, `--foreground`, `--primary`, `--muted`, `--border`)
- **Radius**: `rounded-lg` dominan, `rounded-[min(var(--radius-md),10px)]` untuk xs
- **Font**: Inter (sudah ada), ukuran `text-sm` dominan di komponen

### Yang HARUS Dihapus (desain lama)
- Semua hardcoded `bg-slate-*`, `text-slate-*`, `border-slate-*` di komponen dashboard
- CSS variables lama: `--bento-*`, `--cream*`, custom `--dashboard-*` manual
- Plugin `tw-animate-css` jika tidak dipakai Efferd
- Tailwind config lama: warna `cream`, `creamStrong`, `star`, shadow `phone`/`button`/`card`/`soft`
- Semua class `rounded-2xl` yang tidak konsisten dengan sistem Efferd
- `NativeSelect` custom yang tidak dipakai lagi (select sudah diganti Base UI)

---

## File yang Harus Diubah (Lengkap, Tidak Ada yang Dilewat)

### Layer 0 — Infrastruktur & Tokens
1. **`tailwind.config.ts`** — Hapus semua extend colors lama (cream, creamStrong, star, accent, success), hapus boxShadow lama, hapus borderRadius manual. Ganti dengan token Efferd murni.
2. **`src/app/globals.css`** — Reset semua CSS variables ke sistem Efferd. Hapus `--bento-*`, `--blue-*` manual, `--ink-*`, `--surface-*`, `--type-*`, `--dashboard-*`. Pertahankan hanya shadcn CSS vars (`--background`, `--foreground`, `--primary` dll) + tambah dark mode vars.

### Layer 1 — App Shell (Layout Utama)
3. **`src/components/app-shell.tsx`** — Update padding/gap layout utama sesuai Efferd spacing (`p-4 md:p-6`). Pastikan `SidebarInset` menggunakan background token baru.
4. **`src/components/app-sidebar.tsx`** — Redesign penuh: sidebar background `bg-sidebar`, active item menggunakan `bg-sidebar-accent`, logo bar dengan border-b, nav items `rounded-lg` konsisten, user menu di footer pakai Efferd style.
5. **`src/components/app-header.tsx`** — Redesign: `h-14`, `border-b`, breadcrumb lebih clean, notification bell pakai `Button` variant ghost size icon dari Efferd, hapus `backdrop-blur` lama, ganti ke styling Efferd murni.

### Layer 2 — Dashboard Utama
6. **`src/app/dashboard/page.tsx`** — Redesign penuh:
   - Hapus semua `border-slate-*`, `bg-white`, `rounded-2xl` lama
   - `StatCard`: pakai `Card` + `CardHeader/Content/Footer` dengan token baru, angka besar `text-2xl font-semibold tabular-nums`, trend badge pakai `StatusIndicator` dari Efferd
   - `VideoListCard`: redesign dengan `Table` component dari Efferd, thumbnail 16:9 dengan `rounded-md`
   - `QuickLinksCard`: pakai `Button` variant outline dari Efferd
   - Header greeting: `text-2xl font-semibold tracking-tight` consistent
7. **`src/components/dashboard/dashboard-client.tsx`** — Sinkronkan styling dengan page.tsx baru
8. **`src/components/dashboard/dashboard-greeting-card.tsx`** — Redesign dengan token Efferd
9. **`src/components/dashboard/dashboard-live-preview-card.tsx`** — Redesign dengan token Efferd
10. **`src/components/dashboard/dashboard-data-loader.tsx`** — Tidak ada UI change, pastikan import bersih
11. **`src/components/dashboard/zero-loading-shell.tsx`** — Update skeleton styling ke Efferd tokens

### Layer 3 — Analytics
12. **`src/components/dashboard/creator-traffic-panel.tsx`** — Redesign penuh:
    - Hapus semua `bg-white`, `border-slate-200`, `rounded-2xl`, `bg-slate-50`, `text-slate-*`
    - `MetricCard`: ganti ke `Card` component dengan `CardHeader/Content`, icon `size-4`, angka `text-2xl font-semibold`, helper `text-xs text-muted-foreground`
    - Period selector: pakai `Button` group variant outline (7d/30d/90d) bergaya Efferd toggle
    - Summary section: `grid grid-cols-2 md:grid-cols-4 gap-3`, background `bg-muted/50 rounded-lg p-4`
    - Top pages list: pakai `Table` dari Efferd
    - Recent activity: pakai list dengan `StatusIndicator` dot dari Efferd
    - Locked/upgrade section: pakai `Card` dengan `Button` default dari Efferd
13. **`src/components/dashboard/traffic-line-chart.tsx`** — Update warna chart line ke `hsl(var(--primary))` dan `hsl(var(--muted-foreground))`, hapus hardcoded hex warna lama
14. **`src/app/dashboard/analytics/page.tsx`** — Update header section, tombol shortcut pakai `Button` dari Efferd, tips cards pakai `Card` dengan token baru

### Layer 4 — Video Management
15. **`src/components/dashboard/videos-page-client.tsx`** — Redesign penuh:
    - Header dengan counter badges: pakai `Badge` dari shadcn dengan variant baru
    - Stat counter row: 3 item (Public/Draft/Pinned) bergaya Efferd metric mini
    - Tombol aksi: `Button` variant `default` untuk Upload, `outline` untuk Build Link
    - Empty state dengan icon `Film` dan `Button` CTA
16. **`src/components/dashboard/dashboard-video-list.tsx`** — Redesign penuh:
    - Ganti card grid ke `Table` component dari Efferd
    - Kolom: Thumbnail | Judul + source | Visibility badge | Pin | Tanggal | Aksi
    - Visibility badge: pakai `StatusIndicator` (emerald=public, amber=draft, sky=semi_private, rose=private)
    - Aksi dropdown: pakai Efferd button group atau dropdown menu
    - Drag handle: `GripVertical` icon konsisten
17. **`src/components/dashboard/video-form.tsx`** — Redesign penuh:
    - Field groups dengan `Card` sections bergaya Efferd
    - Input, Textarea pakai token baru
    - Hapus semua hardcoded warna lama
18. **`src/app/dashboard/videos/page.tsx`** — Update import dan layout wrapper
19. **`src/app/dashboard/videos/new/page.tsx`** — Update header dan card wrapper
20. **`src/app/dashboard/videos/[id]/page.tsx`** — Update header dan card wrapper

### Layer 5 — Link Builder
21. **`src/components/builder/link-builder-editor.tsx`** — Redesign penuh:
    - Split layout: editor list kiri, preview kanan (atau stacked mobile)
    - DnD handle bergaya Efferd (`rounded-lg border hover:bg-muted/50`)
    - Link item row: icon platform, title+url, toggle enable/disable, edit/delete aksi
    - Toggle: pakai Base UI Switch atau checkbox Efferd style
    - "Tambah Link" button: `Button` variant default full-width di bawah list
    - Upgrade prompt: `Card` dengan `StatusIndicator` amber + `Button` default
    - Preview toggle: `Button` group Desktop/Mobile
22. **`src/app/dashboard/link-builder/page.tsx`** — Update wrapper dan header

### Layer 6 — Profile Editor
23. **`src/components/dashboard/profile-form.tsx`** — Redesign penuh (593 baris):
    - Section cards: "Informasi Dasar", "Foto Profil & Cover" masing-masing `Card` bergaya Efferd
    - Field labels: `text-sm font-medium text-foreground`
    - Input/Textarea: konsisten dengan token Efferd
    - Avatar & cover upload area: `rounded-lg border-2 border-dashed border-border hover:border-ring`
    - Auto-save status bar: `StatusIndicator` + teks di pojok kanan atas
    - Action bar: `Button` default (Simpan), `Button` outline (Preview), ghost (Copy Link)
    - Hapus semua `bg-white`, `rounded-2xl`, `shadow-sm` lama — ganti ke token
24. **`src/components/dashboard/image-crop-dialog.tsx`** — Update modal/dialog styling ke Efferd tokens
25. **`src/app/dashboard/profile/page.tsx`** — Update wrapper

### Layer 7 — Billing & Subscription
26. **`src/components/dashboard/billing-panel.tsx`** — Redesign penuh (560 baris):
    - Plan aktif card: `Card` dengan header nama plan, `StatusIndicator` untuk status (emerald=active, amber=trial, rose=expired/failed), price `text-2xl font-semibold`, renewal date, countdown
    - Perbandingan plan: `Table` dari Efferd (kolom Fitur | Free | Creator | Business), checkmark/X dengan `StatusIndicator` colors
    - Payment method section: `Button` variant outline per metode
    - Riwayat transaksi: `Table` dengan status badge `StatusIndicator`
    - Tombol aksi: Upgrade `Button` default, Ganti Siklus `outline`, Batalkan `destructive`
    - Hapus semua hardcoded `text-green-*`, `text-red-*`, `text-yellow-*` — ganti ke token
27. **`src/components/dashboard/payment-page-panel.tsx`** — Update styling ke Efferd tokens
28. **`src/components/dashboard/payment-checkout-panel.tsx`** — Update styling ke Efferd tokens
29. **`src/app/dashboard/billing/page.tsx`** — Update wrapper
30. **`src/app/dashboard/payment/page.tsx`** — Update wrapper

### Layer 8 — Settings
31. **`src/components/dashboard/settings-hub.tsx`** — Redesign penuh (263 baris):
    - `SettingsNavCard`: hapus `rounded-xl` manual, pakai `Card` dengan `hover:bg-muted/50`, icon container `rounded-md bg-muted size-9`, chevron `text-muted-foreground`
    - Grid 3-kolom dengan `gap-3`
    - Header badge plan: `StatusIndicator` emerald + plan name
    - Danger zone: section terpisah dengan `border-destructive/20 bg-destructive/5 rounded-lg`
    - 3-step delete confirmation: input field, 2x confirm dialog — styling Efferd
    - Semua `Button` → Efferd variants
32. **`src/components/dashboard/settings-panel.tsx`** — Update styling ke Efferd tokens
33. **`src/components/dashboard/settings-coming-soon.tsx`** — Update dengan `StatusIndicator` amber + text
34. **`src/app/dashboard/settings/page.tsx`** — Update wrapper
35. **`src/app/dashboard/settings/privacy/page.tsx`** — Update styling
36. **`src/app/dashboard/settings/security/page.tsx`** — Update styling
37. **`src/app/dashboard/settings/link-profile/page.tsx`** — Update styling
38. **`src/app/dashboard/settings/payment/page.tsx`** — Update styling
39. **`src/app/dashboard/settings/whitelabel/page.tsx`** — Update styling

### Layer 9 — Account
40. **`src/app/dashboard/account/page.tsx`** — Redesign penuh:
    - Avatar hero card: `Card` dengan avatar `size-16 rounded-full`, nama `text-lg font-semibold`, badge plan `StatusIndicator`
    - Quick action grid: 4 `Card` link bergaya `SettingsNavCard` Efferd
    - Hapus semua hardcoded warna

### Layer 10 — Onboarding
41. **`src/components/onboarding/onboarding-stepper.tsx`** — Redesign penuh (583 baris):
    - Layout: sidebar kiri (step navigator) + konten kanan
    - Step navigator: numbered circles `size-8 rounded-full`, connected dengan vertical line, status Selesai=`bg-primary text-primary-foreground`, Active=`bg-muted border-primary`, Next=`bg-muted text-muted-foreground`
    - Step 1 (Identitas): field groups dengan `Card`, Input/Textarea Efferd, username availability dengan `StatusIndicator`
    - Step 2 (Link): link list item bergaya Efferd (`rounded-lg border p-3`), "Tambah Link" `Button` default, delete `Button` ghost icon
    - Step 3 (Preview): grid 4 info cards, iPhone mockup preview dengan `rounded-3xl border-8 border-foreground/10`
    - Auto-save status: `StatusIndicator` pulse + teks di sidebar
    - Tombol Next/Skip/Selesai: `Button` dari Efferd
42. **`src/components/onboarding/onboarding-wizard.tsx`** — Update styling wrapper
43. **`src/app/onboarding/page.tsx`** — Update layout wrapper, hapus background lama

### Layer 11 — Shared & Misc Components
44. **`src/components/dashboard/onboarding-reminder-card.tsx`** — Redesign dengan `Card` + `StatusIndicator` amber
45. **`src/components/dashboard/bottom-navigation.tsx`** — Update tab bar mobile ke Efferd tokens
46. **`src/components/dashboard/copy-profile-link-button.tsx`** — Update `Button` ke Efferd
47. **`src/components/dashboard/share-profile-actions.tsx`** — Update buttons ke Efferd
48. **`src/components/dashboard/public-link-card-compact.tsx`** — Redesign card compact ke Efferd tokens
49. **`src/components/dashboard/notification-inbox-panel.tsx`** — Redesign notifikasi list ke Efferd, `StatusIndicator` untuk unread dot
50. **`src/app/dashboard/notifications/page.tsx`** — Update wrapper

### Layer 12 — Dashboard Tabs
51. **`src/components/dashboard/tabs/profile-tab.tsx`** — Update ke Efferd tokens
52. **`src/components/dashboard/tabs/links-tab.tsx`** — Update ke Efferd tokens
53. **`src/components/dashboard/tabs/videos-tab.tsx`** — Update ke Efferd tokens
54. **`src/components/dashboard/tabs/visibility-tab.tsx`** — Update ke Efferd tokens

### Layer 13 — Loading & Error States
55. **`src/app/dashboard/loading.tsx`** — Redesign skeleton loading ke Efferd style (`animate-pulse bg-muted rounded-lg`)
56. **`src/app/dashboard/error.tsx`** — Redesign error state dengan `StatusIndicator` rose

---

## Urutan Implementasi yang Benar

```
1. globals.css + tailwind.config.ts   ← foundation, harus pertama
2. app-shell + app-sidebar + app-header  ← layout wrapper semua halaman
3. dashboard/page.tsx                 ← halaman utama
4. analytics (creator-traffic-panel + chart)
5. videos (videos-page-client + video-list + video-form)
6. link-builder
7. profile-form + image-crop-dialog
8. billing-panel + payment panels
9. settings-hub + semua settings sub-pages
10. account/page.tsx
11. onboarding (stepper + wizard + page)
12. shared components (onboarding-reminder, bottom-nav, dll)
13. dashboard tabs
14. loading + error states
```

---

## Aturan Desain yang Harus Diikuti Setiap File

| Aturan | Detail |
|---|---|
| **Warna** | Hanya gunakan CSS token: `bg-background`, `bg-muted`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, `bg-primary`, `bg-destructive` — **DILARANG** hardcode `slate-*`, `gray-*`, `white`, `black` |
| **Radius** | `rounded-lg` (default), `rounded-md` (inner elements), `rounded-full` (avatar/badge), `rounded-sm` (tight) |
| **Spacing** | Gap: `gap-2`, `gap-3`, `gap-4`, `gap-6`. Padding: `p-3`, `p-4`, `p-6`. Konsisten dengan Base UI button sizing |
| **Typography** | Page title: `text-2xl font-semibold tracking-tight`. Section: `text-sm font-medium`. Helper: `text-xs text-muted-foreground` |
| **Button** | Selalu pakai `Button` dari `@/components/ui/button` (Base UI). Variant: `default`=CTA utama, `outline`=aksi sekunder, `ghost`=icon/navigasi, `destructive`=hapus |
| **Status** | Selalu pakai `StatusIndicator` dari `@/components/indicator` untuk dot status. emerald=aktif/sukses, amber=warning/trial/pending, rose=error/gagal, sky=info |
| **Cards** | Pakai `Card` dari shadcn dengan `CardHeader`, `CardContent`, `CardFooter`. Hapus semua custom div card lama |
| **Table** | Pakai `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` dari `@/components/ui/table` |
| **Select** | Pakai `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` dari `@/components/ui/select` (Base UI) |
| **Hapus** | `NativeSelect`, semua `bg-white rounded-2xl shadow-sm`, semua `border-slate-*`, semua `bg-slate-*` |

---

## Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| `NativeSelect` masih diimport di `creator-traffic-panel.tsx` | Ganti ke `Select` dari Base UI saat redesign analytics |
| `@base-ui/react` belum terinstall penuh | Jalankan `npm install` setelah install block, verifikasi `@base-ui/react` ada di `node_modules` |
| `button.tsx` baru pakai Base UI bukan Radix — breaking change | Semua komponen yang pakai `Button` tetap bisa pakai props yang sama, tidak ada breaking change pada interface |
| `select.tsx` baru ganti Radix Select ke Base UI | Cek semua file yang import dari `@/components/ui/select` — pastikan tidak ada `SelectPortal`, `SelectViewport` Radix yang tidak ada di Base UI |
| Warna chart recharts hardcoded | Update `TrafficLineChart` ke CSS vars `hsl(var(--primary))` dan `hsl(var(--muted-foreground))` |
| `tailwind.config.ts` tidak include `src/` path | Config lama salah path (`./components/**` bukan `./src/components/**`) — perbaiki content paths |

---

## Validasi

Setelah semua perubahan:
1. `npm run build` — harus 0 error TypeScript
2. Visual check: semua halaman tidak ada warna lama (`slate-*`, `white` hardcoded, `rounded-2xl` tanpa token)
3. Mobile responsive: sidebar collapsible, bottom-nav, onboarding split layout
4. Dark mode: semua token CSS vars sudah support dark mode via oklch
5. Aksesibilitas: semua `Button` punya `aria-label`, `StatusIndicator` punya teks tersembunyi atau `title`
