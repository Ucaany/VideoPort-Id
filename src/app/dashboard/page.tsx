import Link from "next/link";
import {
  ArrowUpRightIcon,
  FilmIcon,
  EyeIcon,
  Link2Icon,
  BarChart3Icon,
  PlusIcon,
  ExternalLinkIcon,
  VideoIcon,
  UsersIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { OnboardingReminderCard } from "@/components/dashboard/onboarding-reminder-card";
import { normalizeCustomLinks } from "@/lib/profile-utils";
import { requireCurrentUser } from "@/server/current-user";
import { getDashboardMetrics } from "@/server/dashboard-data";
import { getOrCreateUserOnboarding } from "@/server/onboarding";

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string;
  value: string;
  delta: number;
  hint: string;
  href: string;
  icon: React.ElementType;
};

function StatCard({ label, value, delta, hint, href, icon: Icon }: StatCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </CardDescription>
        <CardAction>
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Lihat ${label}`}
          >
            Lihat
            <ArrowUpRightIcon className="size-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-balance font-semibold text-2xl tabular-nums tracking-tight">
          {value}
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Delta value={delta} variant="badge">
          <DeltaIcon variant="trend" />
          <DeltaValue />
        </Delta>
        <span className="text-pretty text-xs text-muted-foreground">{hint}</span>
      </CardFooter>
    </Card>
  );
}

// ─── Video List Card ─────────────────────────────────────────────────────────

type VideoSummary = {
  id: string;
  title: string;
  visibility: string;
  publicSlug: string | null;
};

function visibilityBadge(visibility: string) {
  if (visibility === "public")
    return <Badge variant="default">Publik</Badge>;
  if (visibility === "draft")
    return <Badge variant="outline">Draft</Badge>;
  return <Badge variant="secondary">Private</Badge>;
}

function VideoListCard({
  videos,
  username,
}: {
  videos: VideoSummary[];
  username: string | null;
}) {
  const recent = videos.slice(0, 5);

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Portfolio Terbaru</CardTitle>
        <CardDescription>5 video terakhir kamu</CardDescription>
        <CardAction>
          <Link
            href="/dashboard/videos/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Tambah
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <FilmIcon className="size-6 text-muted-foreground/60" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Belum ada portfolio</p>
              <p className="text-xs text-muted-foreground">
                Tambahkan video pertamamu untuk mulai membangun portfolio.
              </p>
            </div>
            <Link
              href="/dashboard/videos/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="size-4" />
              Tambah Video
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((video) => (
              <li
                key={video.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FilmIcon className="size-4 text-muted-foreground" />
                  </div>
                  <p className="truncate text-sm font-medium">{video.title}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {visibilityBadge(video.visibility)}
                  {video.visibility === "public" && video.publicSlug && (
                    <a
                      href={`/v/${video.publicSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Lihat ${video.title}`}
                      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {recent.length > 0 && (
        <CardFooter>
          <Link
            href="/dashboard/videos"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Lihat semua portfolio
            <ArrowUpRightIcon className="size-3.5" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}

// ─── Quick Links Card ─────────────────────────────────────────────────────────

function QuickLinksCard({ username }: { username: string | null }) {
  const actions = [
    {
      label: "Kelola Link Bio",
      href: "/dashboard/link-builder",
      icon: Link2Icon,
      description: "Atur link di bio kamu",
    },
    {
      label: "Lihat Analytics",
      href: "/dashboard/analytics",
      icon: BarChart3Icon,
      description: "Pantau statistik kunjungan",
    },
    {
      label: "Edit Profile",
      href: "/dashboard/profile",
      icon: EyeIcon,
      description: "Ubah info profil kamu",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Akses Cepat</CardTitle>
        <CardDescription>Navigasi cepat ke fitur utama</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 hover:bg-muted transition-colors"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-none">{action.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {action.description}
                </p>
              </div>
              <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}

        {username && (
          <a
            href={`/creator/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 hover:bg-primary/10 transition-colors"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <UsersIcon className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-none text-primary">Lihat Profile Publik</p>
              <p className="mt-0.5 text-xs text-primary/60 truncate">
                showreels.id/creator/{username}
              </p>
            </div>
            <ExternalLinkIcon className="size-3.5 shrink-0 text-primary/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  // Guard: redirect admin to /admin
  if (user.role === "admin") {
    const { redirect } = await import("next/navigation");
    redirect("/admin");
  }

  let onboarding: Awaited<ReturnType<typeof getOrCreateUserOnboarding>>;
  try {
    onboarding = await getOrCreateUserOnboarding({
      userId: user.id,
      customLinks: user.customLinks,
      createdAt: user.createdAt,
      profile: {
        fullName: user.name,
        username: user.username,
        role: user.role,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("dashboard_onboarding_error", error);
    onboarding = {
      userId: user.id,
      onboardingCompleted: true,
      onboardingSkipped: false,
      firstLinkCreated: false,
      firstVideoUploaded: false,
      hasPublicProfile: Boolean(user.name && user.username),
      currentStep: 4,
      progressPayload: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  let metrics: Awaited<ReturnType<typeof getDashboardMetrics>>;
  try {
    metrics = await getDashboardMetrics({
      userId: user.id,
      username: user.username || "creator",
    });
  } catch (error) {
    console.error("dashboard_metrics_error", error);
    metrics = { totalVideos: 0, publicVideos: 0, totalViews: 0, videoSummaries: [] };
  }

  const normalizedLinks = normalizeCustomLinks(user.customLinks);
  const activeLinks = normalizedLinks.filter((link) => link.enabled !== false);

  const stats: StatCardProps[] = [
    {
      label: "Total Video",
      value: formatNumber(metrics.totalVideos),
      delta: 0,
      hint: "portfolio kamu",
      href: "/dashboard/videos",
      icon: VideoIcon,
    },
    {
      label: "Video Publik",
      value: formatNumber(metrics.publicVideos),
      delta: 0,
      hint: "bisa dilihat orang",
      href: "/dashboard/videos",
      icon: FilmIcon,
    },
    {
      label: "Total Views",
      value: formatNumber(metrics.totalViews),
      delta: 0,
      hint: "kunjungan ke profilemu",
      href: "/dashboard/analytics",
      icon: BarChart3Icon,
    },
    {
      label: "Link Aktif",
      value: formatNumber(activeLinks.length),
      delta: 0,
      hint: "di link bio kamu",
      href: "/dashboard/link-builder",
      icon: Link2Icon,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Onboarding reminder */}
      {!onboarding.onboardingCompleted && (
        <OnboardingReminderCard userId={user.id} resumeHref="/onboarding" />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Halo, {user.name || "Creator"} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola portfolio, link bio, dan analytics showreels.id kamu dari sini.
        </p>
      </div>

      {/* Stat cards — 4 kolom */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Portfolio + Quick links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <VideoListCard videos={metrics.videoSummaries} username={user.username} />
        <QuickLinksCard username={user.username} />
      </div>
    </div>
  );
}
