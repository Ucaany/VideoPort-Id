"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirmFeedbackAction, showFeedbackAlert } from "@/lib/feedback-alert";
import { CACHE_KEYS } from "@/lib/swr-config";
import type { PlanFeatureChecklistItem } from "@/lib/plan-feature-matrix";

type PlanName = "free" | "creator" | "business";
type BillingCycle = "monthly" | "yearly";

type PlanConfig = {
  name: PlanName;
  label: string;
  monthly: number;
  yearlyLegacy: number;
  benefits: string[];
  benefitItems?: PlanFeatureChecklistItem[];
};

type BillingEntitlements = {
  linkBuilderMax: number | null;
  usernameChangesPer30Days: number;
  analyticsMaxDays: number;
  customThumbnailEnabled: boolean;
  whitelabelEnabled: boolean;
  creatorGroupEnabled: boolean;
  supportEnabled: boolean;
  themeSwitchComingSoon: boolean;
};

type PlanPayload = {
  id: string;
  planName: PlanName;
  billingCycle: BillingCycle;
  status: "active" | "trial" | "expired" | "failed" | "pending";
  price: number;
  currency: string;
  renewalDate: string | null;
  nextPlanName: PlanName;
};

type TransactionPayload = {
  id: string;
  invoiceId: string;
  planName: PlanName;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "expired";
  createdAt: string;
  checkoutUrl: string | null;
  expiredAt: string | null;
  provider: string;
};

function toIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | Date | null) {
  if (!value) return "Tidak ada renewal";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Tidak ada renewal";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getRemainingDays(value: string | null) {
  if (!value) return 0;
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}

/**
 * Menghitung sisa waktu pembayaran sebelum expired.
 * Returns null jika sudah expired atau tidak ada expiredAt.
 */
function getPaymentTimeRemaining(expiredAt: string | null): string | null {
  if (!expiredAt) return null;
  const end = new Date(expiredAt).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  }
  return `${minutes} menit`;
}

export function BillingPanel({
  initialPlan,
  effectivePlan,
  catalog,
  initialTransactions,
  billingEmail,
  billingEnabled = false,
}: {
  initialPlan: PlanPayload;
  effectivePlan: PlanName;
  entitlements: BillingEntitlements;
  catalog: Record<PlanName, PlanConfig>;
  initialTransactions: TransactionPayload[];
  billingEmail: string;
  paymentMethod: string;
  bayarGGConfig: {
    configured: boolean;
  };
  creatorGroupLink: string;
  supportLink: string;
  billingEnabled?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const [activePlan, setActivePlan] = useState(initialPlan);
  const [effectivePlanName, setEffectivePlanName] = useState<PlanName>(effectivePlan);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [refreshing, setRefreshing] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [nowMs] = useState(() => Date.now());

  const activePlanLabel = catalog[effectivePlanName]?.label || effectivePlanName;
  const activePrice = catalog[effectivePlanName]?.monthly || 0;
  const remainingDays = getRemainingDays(activePlan.renewalDate);
  const renewTarget: PlanName = effectivePlanName === "free" ? "creator" : effectivePlanName;
  const recentTransactions = useMemo(() => transactions.slice(0, 4), [transactions]);

  // Cari transaksi pending yang masih bisa dibayar (belum expired)
  const pendingTransaction = useMemo(() => {
    return transactions.find((tx) => {
      if (tx.status !== "pending") return false;
      if (tx.provider !== "bayar_gg") return false;
      if (!tx.checkoutUrl) return false;
      if (!tx.expiredAt) return true; // Jika tidak ada expiredAt, anggap masih valid
      return new Date(tx.expiredAt).getTime() > nowMs;
    }) || null;
  }, [nowMs, transactions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const [planRes, txRes] = await Promise.all([
      fetch("/api/billing/plan"),
      fetch("/api/billing/transactions"),
    ]);
    if (planRes.ok) {
      const payload = (await planRes.json()) as {
        plan: PlanPayload;
        effectivePlan?: { planName?: PlanName };
      };
      setActivePlan(payload.plan);
      if (payload.effectivePlan?.planName) {
        setEffectivePlanName(payload.effectivePlan.planName);
      }
    }
    if (txRes.ok) {
      const payload = (await txRes.json()) as { transactions: TransactionPayload[] };
      setTransactions(payload.transactions || []);
    }
    setRefreshing(false);
    // Invalidate SWR cache agar halaman lain juga mendapat data terbaru
    void globalMutate(CACHE_KEYS.BILLING_PLAN);
    void globalMutate(CACHE_KEYS.BILLING_TRANSACTIONS);
  }, [globalMutate]);

  const handleRenew = () => {
    router.push(`/dashboard/payment?plan=${renewTarget}&intent=checkout`);
  };

  const handleStopPlan = async () => {
    if (effectivePlanName === "free") {
      await showFeedbackAlert({
        title: "Plan Free aktif",
        text: "Tidak ada paket berbayar yang perlu dihentikan.",
        icon: "info",
      });
      return;
    }

    const confirmed = await confirmFeedbackAction({
      title: "Stop paket aktif?",
      text: "Paket akan kembali ke Free dan fitur Creator/Business akan terkunci.",
      confirmButtonText: "Ya, stop paket",
      cancelButtonText: "Batal",
      icon: "warning",
    });
    if (!confirmed) return;

    setStopping(true);
    const response = await fetch("/api/billing/downgrade", { method: "POST" });
    setStopping(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      await showFeedbackAlert({
        title: "Stop paket gagal",
        text: payload?.error || "Coba lagi beberapa saat.",
        icon: "error",
      });
      return;
    }

    await showFeedbackAlert({
      title: "Paket berhasil distop",
      text: "Akun kamu sekarang kembali ke plan Free.",
      icon: "success",
      timer: 1400,
    });
    // Invalidate dashboard summary karena plan berubah
    void globalMutate(CACHE_KEYS.DASHBOARD_SUMMARY);
    await handleRefresh();
  };

  // Handle payment=success: sync invoice yang dikembalikan Bayar.gg sebelum redirect
  useEffect(() => {
    if (searchParams.get("payment") !== "success") return;

    const handleSuccess = async () => {
      const invoiceToSync = searchParams.get("invoice");

      if (invoiceToSync) {
        const MAX_RETRIES = 5;
        const POLL_INTERVAL = 2000;

        for (let i = 0; i < MAX_RETRIES; i++) {
          try {
            const res = await fetch(`/api/billing/payment-status/${encodeURIComponent(invoiceToSync)}`);
            if (res.ok) {
              const data = await res.json() as { payment?: { status?: string } };
              if (data.payment?.status === "paid") break;
            }
          } catch {
            // Ignore fetch errors, retry
          }
          if (i < MAX_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL));
          }
        }
      }

      // Refresh data dari DB setelah sync
      await handleRefresh();

      await showFeedbackAlert({
        title: "Pembayaran berhasil! 🎉",
        text: "Paket kamu sudah aktif. Sekarang kamu bisa menggunakan fitur Showreels.id sesuai paket yang dipilih.",
        icon: "success",
        confirmButtonText: "Masuk Dashboard",
      });

      // Invalidate dashboard summary karena plan berubah
      void globalMutate(CACHE_KEYS.DASHBOARD_SUMMARY);

      // Redirect ke dashboard setelah user klik "Masuk Dashboard"
      router.replace("/dashboard");
    };

    void handleSuccess();
  }, [globalMutate, handleRefresh, router, searchParams]);

  // Handle payment=cancel: tampilkan notifikasi pembatalan
  useEffect(() => {
    if (searchParams.get("payment") !== "cancel") return;

    const handleCancel = async () => {
      // Refresh data untuk mendapatkan status terbaru
      await handleRefresh();

      await showFeedbackAlert({
        title: "Pembayaran dibatalkan",
        text: pendingTransaction
          ? "Kamu masih bisa melanjutkan pembayaran selama waktu pembayaran belum habis."
          : "Silakan coba lagi jika ingin berlangganan.",
        icon: "info",
        confirmButtonText: "OK",
      });

      // Bersihkan query params
      router.replace("/dashboard/billing");
    };

    void handleCancel();
  }, [handleRefresh, pendingTransaction, router, searchParams]);

  return (
    <div className="space-y-5">
      {/* Warning banner: sisa hari < 7 (non-trial, non-free) */}
      {effectivePlanName !== "free" && activePlan.status === "active" && remainingDays > 0 && remainingDays <= 7 && (
        <Card className={`p-4 shadow-sm ${
          remainingDays <= 3
            ? "border-destructive/30 bg-destructive/10"
            : "border-amber-200 bg-amber-50"
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 shrink-0 ${
              remainingDays <= 3 ? "text-destructive" : "text-amber-600"
            }`} />
            <div>
              <p className={`text-sm font-semibold ${
                remainingDays <= 3 ? "text-destructive" : "text-amber-900"
              }`}>
                {remainingDays <= 3
                  ? `Paket akan berakhir dalam ${remainingDays} hari!`
                  : `Paket akan berakhir dalam ${remainingDays} hari`}
              </p>
              <p className={`mt-1 text-sm ${
                remainingDays <= 3 ? "text-destructive/80" : "text-amber-700"
              }`}>
                Perpanjang sekarang agar fitur {activePlanLabel} tetap aktif dan tidak terganggu.
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={handleRenew}
                disabled={!billingEnabled}
              >
                <Sparkles className="h-4 w-4" />
                Perpanjang Sekarang
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Pending transaction card: user bisa bayar ulang */}
      {pendingTransaction && (
        <Card className="border-primary/30 bg-primary/10 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Menunggu Pembayaran
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Transaksi <span className="font-mono font-semibold">{pendingTransaction.invoiceId}</span> untuk paket{" "}
                <span className="font-semibold">{catalog[pendingTransaction.planName]?.label || pendingTransaction.planName}</span>{" "}
                sebesar <span className="font-semibold">{toIdr(pendingTransaction.amount)}</span> menunggu pembayaran.
              </p>
              {pendingTransaction.expiredAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" />
                  Sisa waktu: {getPaymentTimeRemaining(pendingTransaction.expiredAt) || "Segera berakhir"}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={pendingTransaction.checkoutUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm">
                    <ExternalLink className="h-4 w-4" />
                    Bayar Sekarang
                  </Button>
                </a>
                <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Cek Status
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden border-border bg-card p-0 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-5 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              Billing
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Paket aktif kamu: {activePlanLabel}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Ringkasan paket, masa aktif, perpanjang, dan stop paket dibuat sederhana agar mudah dipantau.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={handleRenew} disabled={!billingEnabled}>
                <Sparkles className="h-4 w-4" />
                {billingEnabled ? "Perpanjang" : "Coming Soon"}
              </Button>
              <Button variant="secondary" onClick={handleStopPlan} disabled={stopping || effectivePlanName === "free"}>
                <XCircle className="h-4 w-4" />
                {stopping ? "Memproses..." : "Stop Paket"}
              </Button>
              <Button variant="secondary" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="border-t border-border bg-muted/30 p-5 sm:p-7 lg:border-l lg:border-t-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Harga Bulanan</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{toIdr(activePrice)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Status: <span className="font-semibold capitalize text-foreground">{activePlan.status}</span></p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  Sisa Masa Aktif
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{remainingDays} hari</p>
                <p className="mt-1 text-xs text-muted-foreground">Renewal: {formatDate(activePlan.renewalDate)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {activePlan.status === "trial" && activePlan.renewalDate && (
        <Card className="overflow-hidden border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="text-4xl">🎁</span>
            <div className="flex-1">
              <p className="text-lg font-semibold text-foreground">
                Trial Plan Creator Aktif
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Berakhir pada: {new Date(activePlan.renewalDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })} ({remainingDays} hari lagi)
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Setelah trial berakhir, akun akan otomatis turun ke plan Free. Upgrade sekarang untuk terus menggunakan fitur Creator!
              </p>
              <Link href="/dashboard/payment?plan=creator&intent=checkout" className="mt-3 inline-block">
                <Button size="sm">
                  <Sparkles className="h-4 w-4" />
                  Upgrade ke Creator
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {!billingEnabled ? (
        <Card className="border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚧</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">Pembayaran Segera Hadir (Coming Soon)</p>
              <p className="mt-1 text-sm text-amber-700">
                Fitur pembayaran sedang dalam persiapan. Trial gratis untuk user baru tetap aktif. Nantikan update selanjutnya!
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold text-foreground">Info Akun</h2>
          <div className="mt-4">
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email Billing</p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">{billingEmail}</p>
            </div>
          </div>
        </Card>

        <Card className="border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Transaksi</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Riwayat terbaru</h2>
            </div>
            <Link href="/dashboard/payment">
              <Button variant="secondary" size="sm">
                <ShieldCheck className="h-4 w-4" />
                Pilih Plan
              </Button>
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted p-5 text-sm text-muted-foreground">
                Belum ada transaksi.
              </div>
            ) : (
              recentTransactions.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.invoiceId}</p>
                    <p className="text-xs text-muted-foreground">
                      {catalog[item.planName]?.label || item.planName} - {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                      item.status === "paid"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : item.status === "pending"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : item.status === "expired" || item.status === "failed"
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-border bg-muted text-muted-foreground"
                    }`}>
                      {item.status === "paid" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                      {item.status === "pending" ? <Clock className="h-3.5 w-3.5" /> : null}
                      {item.status}
                    </span>
                    {item.provider === "bayar_gg" && item.status === "pending" && item.checkoutUrl && item.expiredAt && new Date(item.expiredAt).getTime() > nowMs && (
                      <a href={item.checkoutUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="secondary" aria-label="Bayar sekarang">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    <Link href={`/api/billing/invoice/${item.invoiceId}?download=1`} target="_blank">
                      <Button size="sm" variant="secondary" aria-label="Download invoice">
                        <Download className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
