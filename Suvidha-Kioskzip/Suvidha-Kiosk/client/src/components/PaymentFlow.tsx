import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { 
  Smartphone, Banknote, Wallet, CheckCircle2, ArrowRight, 
  QrCode, Loader2, ArrowLeft, Receipt, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { t, type TranslationKey } from "@/lib/translations";
import { loadPreferences } from "@/lib/userPreferences";

interface PaymentFlowProps {
  amount: number;
  billDetails: { label: string; value: string }[];
  lang: string;
  onComplete: () => void;
  onBack: () => void;
}

type PaymentMethod = "upi" | "cash" | "wallet" | null;
type PaymentStep = "method" | "processing" | "success" | "failed";

export default function PaymentFlow({ amount, billDetails, lang, onComplete, onBack }: PaymentFlowProps) {
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [step, setStep] = useState<PaymentStep>("method");
  const [upiId, setUpiId] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [payError, setPayError] = useState("");
  const [txnId, setTxnId] = useState(`TXN${Date.now().toString(36).toUpperCase()}`);

  useEffect(() => {
    const fetchBalance = async () => {
      const userId = loadPreferences().userId || "1";
      try {
        const res = await fetch(`/api/wallet/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setWalletBalance(parseFloat(data.balance || "0"));
        }
      } catch {}
      setLoadingBalance(false);
    };
    fetchBalance();
  }, []);

  const handlePay = async () => {
    setStep("processing");
    setPayError("");
    const userId = loadPreferences().userId || "1";

    if (method === "wallet") {
      try {
        const res = await fetch(`/api/wallet/${userId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amount.toString(),
            description: billDetails.map(d => `${d.label}: ${d.value}`).join(", "),
            referenceId: txnId,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setWalletBalance(parseFloat(data.balance));
          setStep("success");
        } else {
          setPayError(data.message || "Payment failed");
          setStep("failed");
        }
      } catch {
        setPayError("Payment failed. Please try again.");
        setStep("failed");
      }
    } else {
      setTimeout(() => setStep("success"), 2500);
    }
  };

  const handlePrintReceipt = () => {
    const printDiv = document.createElement("div");
    printDiv.className = "print-area";
    printDiv.innerHTML = `
      <div style="max-width: 500px; margin: 0 auto; font-family: Arial, sans-serif; padding: 24px;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 16px;">
          <h1 style="font-size: 22px; font-weight: bold; margin: 0;">SUVIDHA PAYMENT RECEIPT</h1>
          <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">Government of Chhattisgarh</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">Transaction ID</p>
          <p style="font-size: 18px; font-weight: bold; margin: 2px 0 0 0;">${txnId}</p>
        </div>
        ${billDetails.map(d => `
          <div style="margin-bottom: 8px;">
            <p style="font-size: 12px; color: #666; margin: 0;">${d.label}</p>
            <p style="font-size: 14px; font-weight: bold; margin: 2px 0 0 0;">${d.value}</p>
          </div>
        `).join("")}
        <div style="margin-bottom: 12px; border-top: 1px solid #ccc; padding-top: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">Amount Paid</p>
          <p style="font-size: 22px; font-weight: bold; margin: 2px 0 0 0; color: #16a34a;">₹${amount.toLocaleString("en-IN")}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p style="font-size: 12px; color: #666; margin: 0;">Payment Method</p>
          <p style="font-size: 14px; font-weight: bold; margin: 2px 0 0 0; text-transform: uppercase;">${method}</p>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="font-size: 12px; color: #666; margin: 0;">Date / Time</p>
          <p style="font-size: 14px; margin: 2px 0 0 0;">${new Date().toLocaleString()}</p>
        </div>
        <hr style="border: 1px solid #ccc; margin: 16px 0;" />
        <p style="font-size: 12px; color: #666; text-align: center;">Thank you for using Suvidha Kiosk</p>
      </div>
    `;
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
  };

  const balanceDisplay = walletBalance !== null ? `₹${walletBalance.toLocaleString("en-IN")}` : "...";
  const insufficientBalance = walletBalance !== null && walletBalance < amount;

  return (
    <AnimatePresence mode="wait">
      {step === "method" && (
        <motion.div
          key="method"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-3xl p-6 border border-border shadow-sm">
            <h3 className="text-xl font-bold mb-4">{t("bill_summary", lang)}</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {billDetails.map((d, i) => (
                <div key={i} className="bg-secondary/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                  <p className="font-bold text-sm">{d.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">{t("total_amount", lang)}</p>
              <p className="text-4xl font-bold text-primary">₹{amount.toLocaleString("en-IN")}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-bold">{t("select_payment", lang)}</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setMethod("upi")}
                className={`p-5 rounded-2xl border-2 text-center transition-all ${
                  method === "upi" ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-white hover:border-primary/50"
                }`}
              >
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-7 h-7 text-purple-600" />
                </div>
                <p className="font-bold text-base">{t("upi_payment", lang)}</p>
                <p className="text-xs text-muted-foreground mt-1">GPay, PhonePe, Paytm</p>
              </button>

              <button
                onClick={() => setMethod("cash")}
                className={`p-5 rounded-2xl border-2 text-center transition-all ${
                  method === "cash" ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-white hover:border-primary/50"
                }`}
              >
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Banknote className="w-7 h-7 text-green-600" />
                </div>
                <p className="font-bold text-base">{t("cash_payment", lang)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("insert_cash", lang)}</p>
              </button>

              <button
                onClick={() => setMethod("wallet")}
                className={`p-5 rounded-2xl border-2 text-center transition-all ${
                  method === "wallet" ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-white hover:border-primary/50"
                } ${insufficientBalance ? "opacity-60" : ""}`}
              >
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-7 h-7 text-blue-600" />
                </div>
                <p className="font-bold text-base">{t("suvidha_wallet_pay", lang)}</p>
                <p className={`text-xs mt-1 ${insufficientBalance ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
                  {loadingBalance ? "..." : balanceDisplay} {t("balance", lang)}
                </p>
              </button>
            </div>
          </div>

          {method === "upi" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-white rounded-2xl p-6 border border-border space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-40 h-40 bg-secondary rounded-xl flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <QrCode className="w-20 h-20 text-muted-foreground/40" />
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-base font-bold">{t("scan_upi_qr", lang)}</p>
                  <p className="text-sm text-muted-foreground">{t("or_enter_upi", lang)}</p>
                  <Input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="h-12 text-base rounded-xl"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {method === "cash" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-green-50 rounded-2xl p-6 border border-green-200 text-center space-y-3"
            >
              <Banknote className="w-12 h-12 text-green-600 mx-auto" />
              <p className="text-lg font-bold text-green-800">{t("insert_notes", lang)}</p>
              <p className="text-sm text-green-600">{t("cash_accepted", lang)}</p>
            </motion.div>
          )}

          {method === "wallet" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={`rounded-2xl p-6 border space-y-2 ${insufficientBalance ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}
            >
              {insufficientBalance ? (
                <div className="flex items-center gap-3 text-red-700">
                  <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Insufficient Balance</p>
                    <p className="text-sm">Your wallet has {balanceDisplay} but ₹{amount.toLocaleString("en-IN")} is required. Please add funds first.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-blue-800">{t("suvidha_wallet_pay", lang)}</p>
                    <p className="text-sm text-blue-600">{t("wallet_balance", lang)}: {balanceDisplay}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{t("after_payment", lang)}</p>
                    <p className="font-bold text-blue-800">₹{walletBalance !== null ? (walletBalance - amount).toLocaleString("en-IN") : "..."}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl gap-2" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
              {t("back", lang)}
            </Button>
            <Button
              size="lg"
              className="h-14 px-10 text-lg rounded-2xl gap-2 shadow-lg shadow-primary/20"
              onClick={handlePay}
              disabled={!method || (method === "upi" && !upiId) || (method === "wallet" && insufficientBalance)}
            >
              {t("pay_now", lang)} ₹{amount.toLocaleString("en-IN")}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      )}

      {step === "processing" && (
        <motion.div
          key="processing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-6"
        >
          <div className="relative">
            <div className="w-28 h-28 rounded-full border-4 border-primary/20 bg-primary/5 flex items-center justify-center">
              {method === "upi" && <Smartphone className="w-14 h-14 text-primary/50" />}
              {method === "cash" && <Banknote className="w-14 h-14 text-primary/50" />}
              {method === "wallet" && <Wallet className="w-14 h-14 text-primary/50" />}
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-3xl font-bold">{t("processing_payment", lang)}</h3>
            <p className="text-xl text-muted-foreground mt-2">₹{amount.toLocaleString("en-IN")}</p>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </motion.div>
      )}

      {step === "failed" && (
        <motion.div
          key="failed"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-10 space-y-8"
        >
          <div className="w-28 h-28 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <AlertTriangle className="w-14 h-14" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold">Payment Failed</h2>
            <p className="text-xl text-muted-foreground mt-2">{payError}</p>
          </div>
          <div className="flex gap-4">
            <Button className="h-14 px-8 text-lg rounded-xl" onClick={() => { setStep("method"); setPayError(""); }}>
              Try Again
            </Button>
            <Button variant="outline" className="h-14 px-8 text-lg rounded-xl" onClick={onBack}>
              {t("back", lang)}
            </Button>
          </div>
        </motion.div>
      )}

      {step === "success" && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-10 space-y-8"
        >
          <div className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-14 h-14" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold">{t("payment_successful", lang)}</h2>
            <p className="text-xl text-muted-foreground mt-2">₹{amount.toLocaleString("en-IN")} {t("paid_successfully", lang)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-border w-full max-w-md space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono font-bold">{txnId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("payment_method_label", lang)}</span>
              <span className="font-bold uppercase">{method}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-bold">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-4 w-full max-w-md">
            <Button className="flex-1 h-14 text-lg rounded-xl gap-2" onClick={onComplete}>
              {t("go_dashboard", lang)}
            </Button>
            <Button variant="outline" className="flex-1 h-14 text-lg rounded-xl gap-2" onClick={handlePrintReceipt}>
              <Receipt className="w-5 h-5" />
              {t("print_receipt", lang)}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
