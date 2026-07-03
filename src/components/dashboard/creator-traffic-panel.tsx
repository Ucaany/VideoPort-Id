"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Eye,
  Lock,
  MousePointerClick,
  RefreshCcw,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrafficLineChart } from "@/components/dashboard/traffic-line-chart";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import { CACHE_TIMES } from "@/lib/swr-config";

type PeriodValue = "today" | "7d" | "30d" | "custom";

type SummaryPayload = {
  totalViews: number;
  uniqueVisitors: number;
  topPage: string | null;
  topPageViews: number;
  appliedPeriod?: PeriodValue;
  analyticsMaxDays?: number;
  requestedRangeDays?: number;
  appliedRangeDays?: number;
  planName?: "free" | "creator" | "business";
};

type Point = {
  day: string;
  views: number;
  uniqueVisitors: number;
};

type TopPage = {
  path: string;
  label: string;
  views: number;
};

type RecentActivity = {
  id: string;
  path: string;
  label: string;
  createdAt: string;
};

type TopPagesPayload = {
  topPages: TopPage[];
  recent: RecentActivity[];
};

const numberFormatter = new Intl.NumberFormat("id-ID");

function formatNumber(value: number) {
  return numberFormatter.format(value || 0);
}

function getPeriodLabel(period: PeriodValue) {
  if (period === "today") return "Hari ini";
  if (period === "30d") return "30 hari terakhir";
  if (period === "custom") return "Custom range";
  return "7 hari terakhir";
}

function formatRecentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Baru saja";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  badge,
  loading,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  helper: string;
  badge?: string;
  loading: boolean;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
        {badge ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-muted" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {value}
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </article>
  );
}

function InsightListCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("rounded-lg border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-full bg-muted p-2 text-muted-foreground">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export function CreatorTrafficPanel({
  compact = false,
  className = "",
  periodMode = "full",
}: {
  compact?: boolean;
  className?: string;
  periodMode?: "dashboard" | "full";
}) {
  const [period, setPeriod] = useState<PeriodValue>("7d");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const effectivePeriod: PeriodValue =
    periodMode === "dashboard" && (period === "today" || period === "custom") ? "7d" : period;

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("period", effectivePeriod);

    if (periodMode === "full" && effectivePeriod === "custom" && start && end) {
      params.set("start", start);
      params.set("end", end);
    }

    return params.toString();
  }, [effectivePeriod, end, periodMode, start]);

  const {
    data: summaryData,
    isLoading: summaryLoading,
    error: summaryError,
    mutate: mutateSummary,
  } = useSWR<SummaryPayload>(
    `/api/analytics/summary?${query}`,
    fetcher,
    {
      dedupingInterval: CACHE_TIMES.REALTIME,
      refreshInterval: 30000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  const {
    data: trafficData,
    isLoading: trafficLoading,
  } = useSWR<{ points: Point[] }>(
    `/api/analytics/traffic?${query}`,
    fetcher,
    {
      dedupingInterval: CACHE_TIMES.REALTIME,
      refreshInterval: 30000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  const {
    data: topPagesData,
    isLoading: topPagesLoading,
  } = useSWR<TopPagesPayload>(
    `/api/analytics/top-pages?${query}`,
    fetcher,
    {
      dedupingInterval: CACHE_TIMES.REALTIME,
      refreshInterval: 30000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  const summary: SummaryPayload = summaryData || {
    totalViews: 0,
    uniqueVisitors: 0,
    topPage: null,
    topPageViews: 0,
    requestedRangeDays: 0,
    appliedRangeDays: 0,
    planName: "free",
  };
  const points: Point[] = trafficData?.points || [];
  const topPages: TopPage[] = topPagesData?.topPages || [];
  const recent: RecentActivity[] = topPagesData?.recent || [];
  const loading = summaryLoading || trafficLoading || topPagesLoading;
  const error = summaryError ? "Gagal memuat analytics." : "";

  const analyticsMaxDays = summary.analyticsMaxDays || 30;
  const appliedPeriod = summary.appliedPeriod || "7d";
  const isThirtyDayLocked = analyticsMaxDays < 30;
  const lockedCountdownDays = Math.max(0, 30 - analyticsMaxDays);
  const hasRangeClamp =
    (summary.requestedRangeDays || 0) > 0 &&
    (summary.appliedRangeDays || 0) > 0 &&
    (summary.requestedRangeDays || 0) > (summary.appliedRangeDays || 0);
  const hasTraffic = summary.totalViews > 0 || summary.uniqueVisitors > 0 || points.some((point) => point.views > 0);
  const averageViews = points.length > 0 ? Math.round(summary.totalViews / points.length) : 0;
  const engagementRate = summary.totalViews > 0 ? Math.round((summary.uniqueVisitors / summary.totalViews) * 100) : 0;
  const topPageShare = summary.totalViews > 0 ? Math.round((summary.topPageViews / summary.totalViews) * 100) : 0;

  const metrics = [
    {
      icon: Eye,
      label: "Total Views",
      value: formatNumber(summary.totalViews),
      helper: `Akumulasi ${getPeriodLabel(appliedPeriod).toLowerCase()}`,
      badge: hasTraffic ? "+aktif" : "0 data",
    },
    {
      icon: Activity,
      label: "Unique Visitors",
      value: formatNumber(summary.uniqueVisitors),
      helper: "Estimasi pengunjung unik pada periode ini",
      badge: engagementRate > 0 ? `${engagementRate}%` : "baru",
    },
    {
      icon: MousePointerClick,
      label: "Top Page Views",
      value: formatNumber(summary.topPageViews),
      helper: summary.topPage || "Belum ada halaman unggulan",
      badge: topPageShare > 0 ? `${topPageShare}% share` : "insight",
    },
    {
      icon: TrendingUp,
      label: "Avg. Daily Views",
      value: formatNumber(averageViews),
      helper: "Rata-rata views harian dari titik chart",
      badge: "vs period",
    },
  ];

  return (
    <section className={cn("space-y-5", compact ? "" : "", className)}>
      {/* Filter bar */}
      <div className="rounded-lg border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Filter Analytics
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Periode aktif:{" "}
              <span className="font-medium text-foreground">{getPeriodLabel(appliedPeriod)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Limit plan: {analyticsMaxDays} hari
            </span>
            <Select value={effectivePeriod} onValueChange={(v) => setPeriod(v as PeriodValue)}>
              <SelectTrigger
                aria-label="Filter periode analytics"
                className="min-w-[160px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 hari terakhir</SelectItem>
                <SelectItem value="30d">
                  {isThirtyDayLocked ? "Terkunci - 30 hari" : "30 hari terakhir"}
                </SelectItem>
                {periodMode === "full" ? (
                  <SelectItem value="today">Hari ini</SelectItem>
                ) : null}
                {periodMode === "full" ? (
                  <SelectItem value="custom">Custom range</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
        </div>

        {periodMode === "full" && effectivePeriod === "custom" ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">
              Mulai
              <input
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Sampai
              <input
                type="date"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Range custom mengikuti limit plan maksimal {analyticsMaxDays} hari. Jika melebihi limit, data otomatis disesuaikan.
            </p>
          </div>
        ) : null}

        {periodMode === "full" && (appliedPeriod !== effectivePeriod || hasRangeClamp) ? (
          <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Range disesuaikan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasRangeClamp
                ? `Permintaan ${summary.requestedRangeDays} hari disesuaikan ke ${summary.appliedRangeDays} hari sesuai limit plan.`
                : `Periode disesuaikan otomatis ke ${appliedPeriod.toUpperCase()} sesuai limit plan.`}
            </p>
          </div>
        ) : null}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} loading={loading} />
        ))}
      </div>

      {/* Error state */}
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <Button size="sm" variant="secondary" onClick={() => void mutateSummary()}>
              <RefreshCcw className="h-4 w-4" />
              Coba Lagi
            </Button>
          </div>
        </div>
      ) : null}

      {/* Chart + upsell */}
      <div className="grid gap-5 xl:grid-cols-12">
        <article className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6 xl:col-span-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Traffic Overview</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground md:text-2xl">Analytics Trafik Creator</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Pantau kunjungan profil dan performa video publik secara interaktif.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">Views</span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Visitors</span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Clicks soon</span>
            </div>
          </div>

          <div className="mt-5">
            {loading ? <SkeletonBlock className="h-72 rounded-lg" /> : <TrafficLineChart points={points} />}
          </div>
        </article>

        <aside className="space-y-5 xl:col-span-4">
          {/* Insight upsell card — intentionally dark */}
          <article className="rounded-lg bg-primary p-5 text-primary-foreground shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/10">
                {isThirtyDayLocked ? <Lock className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </span>
              <span className="rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-medium text-primary-foreground/80">
                {isThirtyDayLocked ? "Plan terbatas" : "Insight aktif"}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-semibold">Buka insight yang lebih mendalam</h3>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/70">
              Lihat halaman paling aktif, pola kunjungan terbaru, dan rekomendasi tindakan untuk menaikkan traffic profil.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-primary-foreground/70">
              <li className="flex gap-2"><span className="text-primary-foreground">•</span> Link yang paling banyak dikunjungi</li>
              <li className="flex gap-2"><span className="text-primary-foreground">•</span> Aktivitas terbaru visitor</li>
              <li className="flex gap-2"><span className="text-primary-foreground">•</span> Rekomendasi optimasi profil</li>
            </ul>
            <Link href={isThirtyDayLocked ? "/dashboard/billing" : "/dashboard/link-builder"} className="mt-5 inline-flex">
              <Button variant="secondary" size="sm">
                <Sparkles className="h-4 w-4" />
                {isThirtyDayLocked ? "Upgrade Plan" : "Optimasi Link"}
              </Button>
            </Link>
            {isThirtyDayLocked ? (
              <p className="mt-3 text-xs text-primary-foreground/50">Sisa {lockedCountdownDays} hari menuju akses 30 hari.</p>
            ) : null}
          </article>

          <InsightListCard title="Recommendations" description="Aksi cepat berdasarkan kondisi analytics saat ini.">
            <div className="space-y-3">
              {[
                hasTraffic ? "Promosikan halaman dengan traffic terbaik minggu ini." : "Bagikan public link untuk mulai mengumpulkan traffic.",
                "Pastikan CTA utama terlihat di bagian atas Link Builder.",
                "Aktifkan video publik agar pengunjung punya konteks portfolio.",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </InsightListCard>
        </aside>
      </div>

      {/* Top pages + recent activity */}
      <div className="grid gap-5 lg:grid-cols-2">
        <InsightListCard title="Top Performing Pages" description="Halaman atau video dengan kunjungan tertinggi.">
          {loading ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
            </div>
          ) : topPages.length > 0 ? (
            <div className="space-y-3">
              {topPages.slice(0, 4).map((page, index) => (
                <div key={page.path} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{index + 1}. {page.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{page.path}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-foreground border border-border">
                    {formatNumber(page.views)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
              Belum ada data halaman populer untuk periode ini.
            </p>
          )}
        </InsightListCard>

        <InsightListCard title="Recent Activity" description="Aktivitas visitor terbaru dari profil dan video publik.">
          {loading ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
            </div>
          ) : recent.length > 0 ? (
            <div className="space-y-3">
              {recent.slice(0, 4).map((item) => (
                <div key={item.id} className="flex gap-3 rounded-lg bg-muted p-3">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{formatRecentTime(item.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
              Belum ada aktivitas terbaru yang tercatat.
            </p>
          )}
        </InsightListCard>
      </div>

      {/* Lifetime summary */}
      <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Lifetime Summary</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Ringkasan periode aktif</h3>
          </div>
          <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {getPeriodLabel(appliedPeriod)}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Views", formatNumber(summary.totalViews)],
            ["Visitors", formatNumber(summary.uniqueVisitors)],
            ["Top Page", formatNumber(summary.topPageViews)],
            ["Avg Daily", formatNumber(averageViews)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-muted p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{loading ? "—" : value}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
