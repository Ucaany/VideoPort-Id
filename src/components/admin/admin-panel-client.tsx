"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock3, Database, Edit3, Eye, HardDrive, LayoutDashboard, Loader2, Mail, Megaphone, PlayCircle, Radar, Search, Settings2, Sparkles, Trash2, Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { NativeSelect as Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { confirmFeedbackAction, showFeedbackAlert } from "@/lib/feedback-alert";
import type { AdminAnalyticsOverview } from "@/server/admin-analytics";
import { AdminAuditPanel, type AuditDashboardData } from "@/components/admin/admin-audit-panel";

export type AdminUserItem = { id: string; name: string; email: string; username: string; role: string; bio: string; city: string; contactEmail: string; phoneNumber: string; websiteUrl: string; isBlocked: boolean; blockedReason: string; createdAt: string; videoCount: number };
export type AdminVideoItem = { id: string; title: string; description: string; visibility: "public" | "draft" | "private" | "semi_private"; source: string; sourceUrl: string; thumbnailUrl: string; outputType: string; durationLabel: string; aspectRatio: "landscape" | "portrait"; publicSlug: string; createdAt: string; authorName: string; authorUsername: string; authorEmail: string };
export type AdminNotificationScheduleItem = { id: string; targetType: "all" | "active" | "blocked" | "public" | "private"; targetUser: { name: string; email: string; username: string } | null; title: string; message: string; status: "draft" | "scheduled" | "sent" | "paused" | "cancelled"; sendMode: "now" | "scheduled"; recurrence: "once" | "daily" | "weekly" | "monthly"; startsAt: string; endsAt: string | null; nextRunAt: string | null; lastSentAt: string | null; activeDurationDays: number };

type DatabaseStorageInfo = { usedBytes: number; limitBytes: number; remainingBytes: number; usedPercent: number; status: "ok" | "warning" | "danger" };
type AdminMenuKey = "dashboard" | "audit" | "users" | "videos" | "maintenance" | "notifications";

type EmailQuotaInfo = { used: number; limit: number; remaining: number; percentage: number };
type AdminPanelClientProps = {
  stats: { totalUsers: number; totalVideos: number; publicVideos: number; semiPrivateVideos: number; draftVideos: number; privateVideos: number; visitorToday: number; visitorYesterday: number; visitorLast7Days: number; scheduledNotifications: number; activeCampaigns: number };
  dbHealth: { ok: boolean; message: string; latencyMs?: number; storage?: DatabaseStorageInfo | null };
  analytics: AdminAnalyticsOverview;
  audit: AuditDashboardData;
  settings: { maintenanceEnabled: boolean; pauseEnabled: boolean; maintenanceMessage: string; billingEnabled: boolean; defaultPaymentMethod: string };
  emailQuota: EmailQuotaInfo;
  users: AdminUserItem[];
  videos: AdminVideoItem[];
  schedules: AdminNotificationScheduleItem[];
  filters: { search: string; platform: string; status: string; sort: string; page: number };
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  ownerProfile: { username: string; email: string };
};

function formatShortDate(value: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function formatDateTime(value: string | null) { if (!value) return "-"; return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function formatNumber(value: number) { return new Intl.NumberFormat("id-ID").format(value); }
function formatBytes(bytes: number) { if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB"; const units = ["B", "KB", "MB", "GB"]; let value = bytes; let unitIndex = 0; while (value >= 1024 && unitIndex < units.length - 1) { value /= 1024; unitIndex += 1; } return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: value >= 10 ? 0 : 1 }).format(value)} ${units[unitIndex]}`; }
async function parseApiError(response: Response) { const payload = (await response.json().catch(() => null)) as { error?: string } | null; return payload?.error || "Aksi belum berhasil diproses."; }

function SummaryCard({ icon: Icon, label, value, delta, tone = "emerald" }: { icon: typeof Users; label: string; value: string; delta: string; tone?: "emerald" | "amber" | "blue" }) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700";
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl", toneClass)}>
            <Icon className="h-4 w-4" />
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", toneClass)}>{delta}</span>
        </div>
        <CardTitle className="mt-3 font-normal text-muted-foreground text-xs">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-2xl tabular-nums tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
function platformClass(source: string) { const value = source.toLowerCase(); if (value.includes("instagram")) return "bg-pink-50 text-pink-700 ring-pink-200"; if (value.includes("facebook")) return "bg-blue-50 text-blue-700 ring-blue-200"; if (value.includes("youtube")) return "bg-rose-50 text-rose-700 ring-rose-200"; return "bg-slate-100 text-slate-700 ring-slate-200"; }

export function AdminPanelClient({ stats, analytics, audit, dbHealth, settings, emailQuota, users, videos, schedules, filters, pagination, ownerProfile }: AdminPanelClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeMenu, setActiveMenu] = useState<AdminMenuKey>("dashboard");
  const [health, setHealth] = useState(dbHealth);
  const [settingsState, setSettingsState] = useState(settings);
  const [notificationTitle, setNotificationTitle] = useState("Update Showcase Terbaru");
  const [notificationMessage, setNotificationMessage] = useState("Ada update showcase baru yang siap ditampilkan ke dashboard Anda.");
  const [sendMode, setSendMode] = useState("now");
  const [sending, setSending] = useState(false);
  const ownerOptions = useMemo(() => users.slice(0, 200), [users]);
  const firstItem = Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.totalItems || 0);
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);
  const refresh = () => startTransition(() => router.refresh());
  const menuItems: { key: AdminMenuKey; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { key: "audit", label: "Audit Website", icon: Radar }, { key: "users", label: "User", icon: Users }, { key: "videos", label: "Video", icon: Video }, { key: "maintenance", label: "Maintenance", icon: Settings2 }, { key: "notifications", label: "Kirim Notifikasi", icon: Bell },
  ];

  const pushQuery = (patch: Record<string, string | number>) => { const params = new URLSearchParams(); const next = { ...filters, ...patch }; if (next.search) params.set("search", String(next.search)); if (next.platform && next.platform !== "all") params.set("platform", String(next.platform)); if (next.status && next.status !== "all") params.set("status", String(next.status)); if (next.sort && next.sort !== "newest") params.set("sort", String(next.sort)); if (Number(next.page) > 1) params.set("page", String(next.page)); router.push(`/admin${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false }); };
  const onFilterSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const formData = new FormData(event.currentTarget); pushQuery({ search: String(formData.get("search") || ""), sort: String(formData.get("sort") || "newest"), page: 1 }); };
  const refreshHealth = async () => { const response = await fetch("/api/admin/health", { cache: "no-store" }); const payload = (await response.json().catch(() => null)) as { ok?: boolean; latencyMs?: number; error?: string; storage?: DatabaseStorageInfo | null } | null; setHealth({ ok: Boolean(payload?.ok), latencyMs: payload?.latencyMs, storage: payload?.storage ?? null, message: payload?.ok ? `Database sehat (${payload.latencyMs ?? 0}ms)` : payload?.error || "Database tidak merespons." }); };
  const updateSettings = async () => { if ((settingsState.maintenanceEnabled || settingsState.pauseEnabled) && settingsState.maintenanceMessage.trim().length < 10) { await showFeedbackAlert({ title: "Pesan maintenance terlalu pendek", text: "Isi minimal 10 karakter agar pengunjung memahami status website.", icon: "error" }); return; } const confirmed = await confirmFeedbackAction({ title: "Simpan pengaturan website?", text: "Mode maintenance/pause akan langsung memengaruhi akses pengunjung.", confirmButtonText: "Simpan" }); if (!confirmed) return; const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settingsState) }); if (!response.ok) { await showFeedbackAlert({ title: "Pengaturan gagal disimpan", text: await parseApiError(response), icon: "error" }); return; } const payload = (await response.json()) as { settings: typeof settingsState }; setSettingsState(payload.settings); await showFeedbackAlert({ title: "Pengaturan tersimpan", icon: "success", timer: 1100 }); refresh(); };
  const updateVideo = async (event: FormEvent<HTMLFormElement>, videoId: string) => { event.preventDefault(); const formData = new FormData(event.currentTarget); const response = await fetch(`/api/admin/videos/${videoId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: formData.get("title"), description: formData.get("description"), visibility: formData.get("visibility"), sourceUrl: formData.get("sourceUrl"), thumbnailUrl: formData.get("thumbnailUrl"), outputType: formData.get("outputType"), durationLabel: formData.get("durationLabel"), aspectRatio: formData.get("aspectRatio") }) }); if (!response.ok) { await showFeedbackAlert({ title: "Video gagal diperbarui", text: await parseApiError(response), icon: "error" }); return; } await showFeedbackAlert({ title: "Video diperbarui", icon: "success", timer: 900 }); refresh(); };
  const deleteVideo = async (video: AdminVideoItem) => { const confirmed = await confirmFeedbackAction({ title: `Hapus video "${video.title}"?`, text: "Postingan ini akan dihapus permanen dari database.", confirmButtonText: "Hapus video", icon: "warning" }); if (!confirmed) return; const response = await fetch(`/api/admin/videos/${video.id}`, { method: "DELETE" }); if (!response.ok) { await showFeedbackAlert({ title: "Video gagal dihapus", text: await parseApiError(response), icon: "error" }); return; } await showFeedbackAlert({ title: "Video dihapus", icon: "success", timer: 900 }); refresh(); };
  const sendNotification = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (notificationTitle.trim().length < 3 || notificationMessage.trim().length < 3) { await showFeedbackAlert({ title: "Notifikasi belum lengkap", text: "Isi judul dan pesan minimal 3 karakter.", icon: "error" }); return; } setSending(true); const formData = new FormData(event.currentTarget); const startsAtRaw = String(formData.get("startsAt") || ""); const endsAtRaw = String(formData.get("endsAt") || ""); const response = await fetch("/api/admin/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType: formData.get("targetType"), targetUserId: formData.get("targetUserId") || null, title: notificationTitle.trim(), message: notificationMessage.trim(), sendMode: formData.get("sendMode"), recurrence: formData.get("recurrence"), startsAt: startsAtRaw ? new Date(startsAtRaw).toISOString() : null, endsAt: endsAtRaw ? new Date(endsAtRaw).toISOString() : null, activeDurationDays: formData.get("activeDurationDays") }) }); setSending(false); if (!response.ok) { await showFeedbackAlert({ title: "Notifikasi gagal dikirim", text: await parseApiError(response), icon: "error" }); return; } const payload = (await response.json()) as { schedule?: { deliveredCount?: number; status?: string } }; await showFeedbackAlert({ title: sendMode === "now" ? "Notifikasi dikirim" : "Notifikasi dijadwalkan", text: sendMode === "now" ? `Terkirim ke ${payload.schedule?.deliveredCount ?? 0} user.` : "Campaign tersimpan dan akan dikirim sesuai jadwal.", icon: "success", timer: 1400 }); refresh(); };

  const renderFilterCard = () => (
    <Card className="p-4">
      <form onSubmit={onFilterSubmit} className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="search" defaultValue={filters.search} placeholder="Cari user/video berdasarkan nama, email, judul, atau slug" className="pl-9" />
        </div>
        <Select name="sort" defaultValue={filters.sort} className="xl:w-44">
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="az">A-Z</option>
          <option value="za">Z-A</option>
        </Select>
        <Button variant="secondary" type="submit"><Search className="h-4 w-4" />Terapkan</Button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {[{ v: "all", l: "All Platform" }, { v: "instagram", l: "Instagram" }, { v: "facebook", l: "Facebook" }, { v: "youtube", l: "YouTube" }].map((item) => (
          <button key={item.v} type="button" onClick={() => pushQuery({ platform: item.v, page: 1 })} aria-pressed={filters.platform === item.v}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition", filters.platform === item.v ? "border-foreground bg-foreground text-background shadow-sm" : "border-border bg-background text-foreground hover:bg-muted")}>
            {item.l}
          </button>
        ))}
        <span className="mx-1 hidden h-8 w-px bg-border sm:inline-block" />
        {[{ v: "all", l: "All Status" }, { v: "public", l: "Public" }, { v: "private", l: "Private" }].map((item) => (
          <button key={item.v} type="button" onClick={() => pushQuery({ status: item.v, page: 1 })} aria-pressed={filters.status === item.v}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition", filters.status === item.v ? "border-foreground bg-foreground text-background shadow-sm" : "border-border bg-background text-foreground hover:bg-muted")}>
            {item.l}
          </button>
        ))}
      </div>
    </Card>
  );

  const renderVideoGrid = () => (
    <div className="space-y-4">
      {renderFilterCard()}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {videos.map((video) => (
          <Card key={video.id} className="group p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">{video.title}</h3>
                <p className="mt-1 truncate text-sm text-muted-foreground">{video.authorName} · {video.authorEmail}</p>
              </div>
              <Badge className={cn("capitalize ring-1", platformClass(video.source))}>{video.source}</Badge>
            </div>
            <p className="mt-3 truncate rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">/v/{video.publicSlug}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{formatShortDate(video.createdAt)}</span>
              <Badge variant={video.visibility === "public" ? "default" : "secondary"}>{video.visibility === "public" ? "Public" : "Private"}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a href={`/v/${video.publicSlug}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <Eye className="h-4 w-4" />View
              </a>
              <details className="contents">
                <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  <Edit3 className="h-4 w-4" />Edit
                </summary>
                <form onSubmit={(event) => updateVideo(event, video.id)} className="col-span-3 mt-3 grid gap-2 rounded-xl border border-border bg-muted/30 p-3">
                  <Input name="title" defaultValue={video.title} />
                  <Textarea name="description" defaultValue={video.description} />
                  <Select name="visibility" defaultValue={video.visibility}>
                    <option value="public">Public</option>
                    <option value="semi_private">Semi Private</option>
                    <option value="draft">Draft</option>
                    <option value="private">Private</option>
                  </Select>
                  <Select name="aspectRatio" defaultValue={video.aspectRatio}>
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </Select>
                  <Input name="sourceUrl" defaultValue={video.sourceUrl} />
                  <Input name="thumbnailUrl" defaultValue={video.thumbnailUrl} />
                  <Input name="outputType" defaultValue={video.outputType} />
                  <Input name="durationLabel" defaultValue={video.durationLabel} />
                  <Button variant="secondary" type="submit" size="sm">Simpan</Button>
                </form>
              </details>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => void deleteVideo(video)}>
                <Trash2 className="h-4 w-4" />Hapus
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {!videos.length && (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada showcase yang cocok dengan filter.</p>
      )}
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Menampilkan <strong className="text-foreground">{firstItem}-{lastItem}</strong> dari <strong className="text-foreground">{formatNumber(pagination.totalItems)}</strong> data</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].filter((p) => p <= pagination.totalPages).map((p) => (
            <Button key={p} size="sm" variant={pagination.page === p ? "default" : "outline"} onClick={() => pushQuery({ page: p })}>{p}</Button>
          ))}
          {pagination.totalPages > 3 && (
            <Button size="sm" variant="outline" onClick={() => pushQuery({ page: pagination.totalPages })}>{pagination.totalPages}</Button>
          )}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs text-muted-foreground">showreels.id / Admin Panel</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin Panel</h1>
              <p className="mt-1 text-sm text-muted-foreground">Kelola user, video, maintenance, dan notifikasi dari satu panel.</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted border text-xs font-semibold">
                {ownerProfile.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">@{ownerProfile.username}</p>
                <p className="text-xs text-muted-foreground">{ownerProfile.email}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveMenu(item.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                    activeMenu === item.key
                      ? "border-foreground bg-foreground text-background shadow-sm"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />{item.label}
                </button>
              );
            })}
          </div>
        </CardHeader>
      </Card>

      {activeMenu === "dashboard" && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Users} label="Total Users" value={formatNumber(stats.totalUsers)} delta="User" />
            <SummaryCard icon={PlayCircle} label="Total Showcase" value={formatNumber(stats.totalVideos)} delta="Video" />
            <SummaryCard icon={Clock3} label="Notifikasi Terjadwal" value={formatNumber(stats.scheduledNotifications)} delta="Queue" tone="amber" />
            <SummaryCard icon={Megaphone} label="Active Campaigns" value={formatNumber(stats.activeCampaigns)} delta="Live" tone="blue" />
          </section>
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Subscription Aktif</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-700">{formatNumber(analytics.subscriptions.active)}</p>
              <p className="mt-1 text-sm text-muted-foreground">User dengan plan berbayar aktif</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trial Aktif</p>
              <p className="mt-2 text-3xl font-semibold text-amber-600">{formatNumber(analytics.subscriptions.trial)}</p>
              <p className="mt-1 text-sm text-muted-foreground">User dalam masa trial Creator</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Paket Tersedia</p>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
                  <span className="text-sm font-semibold text-blue-800">Creator</span>
                  <span className="text-xs text-blue-600">50 video/platform</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2">
                  <span className="text-sm font-semibold text-purple-800">Business</span>
                  <span className="text-xs text-purple-600">Unlimited</span>
                </div>
              </div>
            </Card>
          </section>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visitor Hari Ini</p>
              <p className="mt-2 text-3xl font-semibold">{formatNumber(stats.visitorToday)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Kemarin</p>
              <p className="mt-2 text-3xl font-semibold">{formatNumber(stats.visitorYesterday)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">7 Hari Terakhir</p>
              <p className="mt-2 text-3xl font-semibold">{formatNumber(stats.visitorLast7Days)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Email Quota</p>
              <p className="mt-2 text-3xl font-semibold">{emailQuota.used}<span className="text-base font-normal text-muted-foreground">/{emailQuota.limit}</span></p>
            </Card>
          </section>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Database</p>
                <p className={cn("mt-1 text-sm font-medium", health.ok ? "text-emerald-600" : "text-destructive")}>{health.message}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void refreshHealth()}>
                <Database className="h-4 w-4" />Cek
              </Button>
            </div>
            {health.storage && (
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <HardDrive className="h-4 w-4 shrink-0" />
                <span>{formatBytes(health.storage.usedBytes)} / {formatBytes(health.storage.limitBytes)} ({health.storage.usedPercent.toFixed(1)}%)</span>
              </div>
            )}
          </Card>
        </>
      )}

      {activeMenu === "users" && (
        <Card className="p-5">
          <h2 className="text-2xl font-semibold">User Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">Kelola user: blokir, unblock, atau hapus akun.</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {users.map((user) => (
              <div key={user.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{user.name || user.email}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">@{user.username || "-"} · {user.videoCount} video</p>
                  </div>
                  <Badge variant={user.isBlocked ? "destructive" : "default"}>{user.isBlocked ? "Blocked" : "Active"}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.isBlocked ? (
                    <Button variant="outline" size="sm" onClick={async () => {
                      const confirmed = await confirmFeedbackAction({ title: `Unblock "${user.name || user.email}"?`, text: "User akan bisa login dan mengakses dashboard kembali.", confirmButtonText: "Unblock" });
                      if (!confirmed) return;
                      const res = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: user.name, username: user.username, isBlocked: false, blockedReason: "" }) });
                      if (!res.ok) { await showFeedbackAlert({ title: "Gagal unblock", text: await parseApiError(res), icon: "error" }); return; }
                      await showFeedbackAlert({ title: "User di-unblock", icon: "success", timer: 900 }); refresh();
                    }}>Unblock</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={async () => {
                      const confirmed = await confirmFeedbackAction({ title: `Blokir "${user.name || user.email}"?`, text: "User tidak akan bisa login selama diblokir.", confirmButtonText: "Blokir", icon: "warning" });
                      if (!confirmed) return;
                      const Swal = (await import("sweetalert2")).default;
                      const reasonResult = await Swal.fire({
                        title: "Alasan pemblokiran",
                        input: "textarea",
                        inputPlaceholder: "Tulis alasan pemblokiran...",
                        confirmButtonText: "Simpan & Blokir",
                        showCancelButton: true,
                        cancelButtonText: "Batal",
                        buttonsStyling: false,
                        customClass: { popup: "rounded-2xl bg-white text-slate-950", confirmButton: "inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800", cancelButton: "mr-2 inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50" },
                      });
                      if (!reasonResult.isConfirmed) return;
                      const blockedReason = (reasonResult.value as string || "").trim() || "Diblokir oleh admin.";
                      const res = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: user.name, username: user.username, isBlocked: true, blockedReason }) });
                      if (!res.ok) { await showFeedbackAlert({ title: "Gagal memblokir", text: await parseApiError(res), icon: "error" }); return; }
                      await showFeedbackAlert({ title: "User diblokir", icon: "success", timer: 900 }); refresh();
                    }}>Blokir</Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async () => {
                    const confirmed = await confirmFeedbackAction({ title: `Hapus akun "${user.name || user.email}"?`, text: "Akun akan dihapus permanen.", confirmButtonText: "Hapus", icon: "warning" });
                    if (!confirmed) return;
                    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
                    if (!res.ok) { await showFeedbackAlert({ title: "Gagal menghapus", text: await parseApiError(res), icon: "error" }); return; }
                    await showFeedbackAlert({ title: "Akun dihapus", icon: "success", timer: 900 }); refresh();
                  }}><Trash2 className="h-4 w-4" />Hapus</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeMenu === "audit" && <AdminAuditPanel initialData={audit} />}
      {activeMenu === "videos" && renderVideoGrid()}

      {activeMenu === "maintenance" && (
        <>
          <Card className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Website Control</p>
                <h2 className="mt-1 text-2xl font-semibold">Maintenance dan pause sementara</h2>
              </div>
              {isPending && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <label className="flex items-center justify-between gap-3 text-sm font-semibold">
                  Maintenance mode
                  <input type="checkbox" checked={settingsState.maintenanceEnabled} onChange={(e) => setSettingsState((prev) => ({ ...prev, maintenanceEnabled: e.target.checked }))} className="h-5 w-5 accent-primary" />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm font-semibold">
                  Pause website sementara
                  <input type="checkbox" checked={settingsState.pauseEnabled} onChange={(e) => setSettingsState((prev) => ({ ...prev, pauseEnabled: e.target.checked }))} className="h-5 w-5 accent-primary" />
                </label>
                <p className="text-xs text-muted-foreground">Status: {settingsState.maintenanceEnabled || settingsState.pauseEnabled ? "Aktif" : "Nonaktif"}</p>
              </div>
              <div className="space-y-3">
                <Textarea value={settingsState.maintenanceMessage} onChange={(e) => setSettingsState((prev) => ({ ...prev, maintenanceMessage: e.target.value }))} placeholder="Pesan maintenance untuk pengunjung" className="min-h-24" />
                <Button variant="secondary" onClick={updateSettings}><Settings2 className="h-4 w-4" />Simpan pengaturan</Button>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Billing & Payment</p>
              <h2 className="mt-1 text-2xl font-semibold">Pengaturan Billing</h2>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 text-sm font-semibold">
                Aktifkan Billing
                <input type="checkbox" checked={settingsState.billingEnabled} onChange={(e) => setSettingsState((prev) => ({ ...prev, billingEnabled: e.target.checked }))} className="h-5 w-5 accent-primary" />
              </label>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Metode Pembayaran Default</p>
                <Select value={settingsState.defaultPaymentMethod} onChange={(e) => setSettingsState((prev) => ({ ...prev, defaultPaymentMethod: e.target.value }))}>
                  <option value="bayar_gg">bayar.gg</option>
                  <option value="manual">Manual Transfer</option>
                </Select>
              </div>
              <Button variant="secondary" onClick={updateSettings}><Settings2 className="h-4 w-4" />Simpan Billing</Button>
            </div>
          </Card>
        </>
      )}

      {activeMenu === "notifications" && (
        <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h2 className="text-2xl font-semibold">Kirim Notifikasi</h2>
            </div>
            <form onSubmit={sendNotification} className="mt-4 space-y-3">
              <Select name="targetType" defaultValue="all">
                <option value="all">Semua user</option>
                <option value="active">User aktif</option>
                <option value="blocked">User diblokir</option>
                <option value="public">Profile public</option>
                <option value="private">Profile private</option>
              </Select>
              <Select name="targetUserId" defaultValue="">
                <option value="">Tidak pilih user spesifik</option>
                {ownerOptions.map((u) => <option key={u.id} value={u.id}>{u.name || u.email} — {u.email}</option>)}
              </Select>
              <Input value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} placeholder="Judul notifikasi" />
              <Textarea value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} placeholder="Isi pesan notifikasi" className="min-h-28" />
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Preview Notifikasi</p>
                <div className="mt-3 rounded-xl border bg-background p-4 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 font-semibold">{notificationTitle || "Judul notifikasi"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{notificationMessage || "Isi pesan akan tampil di sini."}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select name="sendMode" value={sendMode} onChange={(e) => setSendMode(e.target.value)}>
                  <option value="now">Kirim sekarang</option>
                  <option value="scheduled">Terjadwal</option>
                </Select>
                <Select name="recurrence" defaultValue="once">
                  <option value="once">Sekali</option>
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                </Select>
              </div>
              {sendMode === "scheduled" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs text-muted-foreground">Mulai</label><Input type="datetime-local" name="startsAt" /></div>
                  <div><label className="mb-1 block text-xs text-muted-foreground">Selesai (opsional)</label><Input type="datetime-local" name="endsAt" /></div>
                </div>
              )}
              <Input type="number" name="activeDurationDays" defaultValue={7} placeholder="Durasi tampil (hari)" min={1} max={90} />
              <Button variant="secondary" type="submit" disabled={sending} className="w-full">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {sendMode === "now" ? "Kirim Sekarang" : "Jadwalkan"}
              </Button>
            </form>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Riwayat Campaign</h3>
            <div className="mt-3 space-y-3">
              {schedules.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada campaign.</p>
              ) : schedules.map((s) => (
                <div key={s.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{s.title}</p>
                    <Badge variant={s.status === "sent" ? "default" : "secondary"}>{s.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.message}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{formatDateTime(s.startsAt)} · {s.targetType}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

