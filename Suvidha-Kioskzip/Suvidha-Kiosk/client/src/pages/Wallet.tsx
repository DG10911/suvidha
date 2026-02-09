import KioskLayout from "@/components/layout/KioskLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, IndianRupee,
  History, CreditCard, Loader2, CheckCircle2, QrCode, ArrowLeft
} from "lucide-react";
import { loadPreferences } from "@/lib/userPreferences";
import { t } from "@/lib/translations";
import QRCode from "qrcode";

type WalletState = "balance" | "add" | "upi" | "processing" | "success";

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  method: string;
  description: string;
  referenceId: string;
  balanceAfter: number;
  createdAt: string;
}

const quickAmounts = [100, 200, 500, 1000, 2000];

export default function Wallet() {
  const [, navigate] = useLocation();
  const [lang, setLang] = useState(() => loadPreferences().language);
  const [state, setState] = useState<WalletState>("balance");
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [newBalance, setNewBalance] = useState<number>(0);

  const userId = loadPreferences().userId || "guest";

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) setLang(detail.language);
    };
    window.addEventListener("prefs-changed", handler);
    return () => window.removeEventListener("prefs-changed", handler);
  }, []);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [walletRes, txRes] = await Promise.all([
        fetch(`/api/wallet/${userId}`),
        fetch(`/api/wallet/${userId}/transactions`),
      ]);
      const walletData = await walletRes.json();
      const txData = await txRes.json();
      if (walletData.success) setBalance(walletData.wallet.balance);
      if (txData.success) setTransactions(txData.transactions);
    } catch {
      setBalance(0);
      setTransactions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmount = (val: string) => {
    const num = parseInt(val);
    setCustomAmount(val);
    if (!isNaN(num) && num > 0) {
      setSelectedAmount(num);
    } else {
      setSelectedAmount(0);
    }
  };

  const handleProceedToUpi = () => {
    if (selectedAmount <= 0) return;
    setState("upi");
  };

  const handleGenerateQr = async () => {
    if (!upiId.trim()) return;
    const upiUrl = `upi://pay?pa=${upiId}&pn=Suvidha&am=${selectedAmount}&cu=INR`;
    try {
      const dataUrl = await QRCode.toDataURL(upiUrl, { width: 280, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl("");
    }
  };

  const handleConfirmPayment = async () => {
    setState("processing");
    try {
      const res = await fetch(`/api/wallet/${userId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selectedAmount, method: "upi" }),
      });
      const data = await res.json();
      if (data.success) {
        setNewBalance(data.balance);
      }
    } catch {}
    setTimeout(() => {
      setState("success");
    }, 2000);
  };

  const handleDone = () => {
    setState("balance");
    setSelectedAmount(0);
    setCustomAmount("");
    setUpiId("");
    setQrDataUrl("");
    fetchWalletData();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <KioskLayout>
      <div className="space-y-6 max-w-4xl mx-auto w-full pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="lg"
            className="rounded-full h-14 w-14 p-0"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-7 h-7" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold font-heading flex items-center gap-3">
              <WalletIcon className="w-8 h-8 text-blue-600" />
              {t("wallet_balance" as any, lang) || "Suvidha Wallet"}
            </h2>
            <p className="text-lg text-muted-foreground mt-1">
              {t("balance" as any, lang) || "Manage your wallet balance"}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {state === "balance" && (
            <motion.div
              key="balance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-lg font-medium mb-2">
                      {t("wallet_balance" as any, lang) || "Available Balance"}
                    </p>
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-2xl">Loading...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-10 h-10" />
                        <span className="text-5xl font-bold">{balance.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                  <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center">
                    <WalletIcon className="w-10 h-10" />
                  </div>
                </div>
                <div className="mt-6">
                  <Button
                    size="lg"
                    className="h-16 px-10 rounded-2xl text-xl font-bold bg-white text-blue-700 hover:bg-blue-50 gap-3 shadow-lg active:scale-95 transition-transform"
                    onClick={() => setState("add")}
                  >
                    <Plus className="w-6 h-6" />
                    {t("pay_now" as any, lang) || "Add Money"}
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-md border border-border">
                <div className="flex items-center gap-3 mb-5">
                  <History className="w-6 h-6 text-blue-600" />
                  <h3 className="text-2xl font-bold">
                    {t("notifications" as any, lang) || "Transaction History"}
                  </h3>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <WalletIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {transactions.map((tx) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-4 p-4 rounded-2xl border ${
                          tx.type === "credit"
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            tx.type === "credit"
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {tx.type === "credit" ? (
                            <ArrowDownLeft className="w-6 h-6" />
                          ) : (
                            <ArrowUpRight className="w-6 h-6" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base truncate">{tx.description}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="capitalize">{tx.method}</span>
                            <span>•</span>
                            <span>{formatDate(tx.createdAt)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${
                              tx.type === "credit" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bal: ₹{tx.balanceAfter.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {state === "add" && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl p-8 shadow-md border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <Plus className="w-7 h-7 text-blue-600" />
                  <h3 className="text-2xl font-bold">
                    {t("pay_now" as any, lang) || "Add Money to Wallet"}
                  </h3>
                </div>

                <p className="text-lg text-muted-foreground mb-4">Select amount</p>
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount && !customAmount ? "default" : "outline"}
                      size="lg"
                      className={`h-16 rounded-2xl text-xl font-bold transition-all active:scale-95 ${
                        selectedAmount === amount && !customAmount
                          ? "bg-blue-600 text-white shadow-lg"
                          : "border-2 hover:border-blue-300"
                      }`}
                      onClick={() => handleSelectAmount(amount)}
                    >
                      ₹{amount.toLocaleString("en-IN")}
                    </Button>
                  ))}
                </div>

                <div className="mb-8">
                  <p className="text-lg text-muted-foreground mb-2">Or enter custom amount</p>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={customAmount}
                        onChange={(e) => handleCustomAmount(e.target.value)}
                        className="h-16 pl-12 text-2xl rounded-2xl border-2 font-bold"
                        min="1"
                      />
                    </div>
                  </div>
                </div>

                {selectedAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 rounded-2xl p-5 border border-blue-200 mb-6"
                  >
                    <p className="text-lg text-blue-800">
                      Adding <span className="font-bold text-2xl">₹{selectedAmount.toLocaleString("en-IN")}</span> to wallet
                    </p>
                  </motion.div>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-16 px-8 rounded-2xl text-xl flex-1 border-2 active:scale-95 transition-transform"
                    onClick={handleDone}
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    {t("back" as any, lang) || "Back"}
                  </Button>
                  <Button
                    size="lg"
                    className="h-16 px-8 rounded-2xl text-xl flex-1 bg-blue-600 hover:bg-blue-700 gap-3 shadow-lg active:scale-95 transition-transform"
                    onClick={handleProceedToUpi}
                    disabled={selectedAmount <= 0}
                  >
                    <QrCode className="w-6 h-6" />
                    {t("upi_payment" as any, lang) || "Pay via UPI"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {state === "upi" && (
            <motion.div
              key="upi"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl p-8 shadow-md border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <QrCode className="w-7 h-7 text-blue-600" />
                  <h3 className="text-2xl font-bold">
                    {t("upi_payment" as any, lang) || "UPI Payment"}
                  </h3>
                </div>

                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 mb-6">
                  <p className="text-lg text-blue-800">
                    Amount: <span className="font-bold text-2xl">₹{selectedAmount.toLocaleString("en-IN")}</span>
                  </p>
                </div>

                <div className="mb-6">
                  <p className="text-lg font-medium mb-3">
                    {t("or_enter_upi" as any, lang) || "Enter UPI ID"}
                  </p>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      placeholder="yourname@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="h-16 text-xl rounded-2xl border-2 flex-1"
                    />
                    <Button
                      size="lg"
                      className="h-16 px-8 rounded-2xl text-lg bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform"
                      onClick={handleGenerateQr}
                      disabled={!upiId.trim()}
                    >
                      Generate QR
                    </Button>
                  </div>
                </div>

                {qrDataUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4 py-6"
                  >
                    <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-blue-200">
                      <img src={qrDataUrl} alt="UPI QR Code" className="w-[280px] h-[280px]" />
                    </div>
                    <p className="text-muted-foreground text-lg">
                      {t("scan_upi_qr" as any, lang) || "Scan this QR code to pay"}
                    </p>
                  </motion.div>
                )}

                <div className="flex gap-4 mt-6">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-16 px-8 rounded-2xl text-xl flex-1 border-2 active:scale-95 transition-transform"
                    onClick={() => {
                      setState("add");
                      setQrDataUrl("");
                      setUpiId("");
                    }}
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    {t("back" as any, lang) || "Back"}
                  </Button>
                  <Button
                    size="lg"
                    className="h-16 px-8 rounded-2xl text-xl flex-1 bg-green-600 hover:bg-green-700 gap-3 shadow-lg active:scale-95 transition-transform"
                    onClick={handleConfirmPayment}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    {t("pay_now" as any, lang) || "Confirm Payment"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {state === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="bg-white rounded-3xl p-12 shadow-xl border border-border text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 mx-auto mb-6"
                >
                  <Loader2 className="w-24 h-24 text-blue-600" />
                </motion.div>
                <h3 className="text-3xl font-bold mb-3">
                  {t("processing_payment" as any, lang) || "Processing Payment"}
                </h3>
                <p className="text-xl text-muted-foreground">
                  ₹{selectedAmount.toLocaleString("en-IN")} via UPI
                </p>
                <motion.div
                  className="w-64 h-2 bg-blue-100 rounded-full mx-auto mt-8 overflow-hidden"
                >
                  <motion.div
                    className="h-full bg-blue-600 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

          {state === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="bg-white rounded-3xl p-12 shadow-xl border border-border text-center max-w-lg">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-14 h-14 text-green-600" />
                  </div>
                </motion.div>
                <h3 className="text-3xl font-bold text-green-700 mb-3">
                  {t("payment_successful" as any, lang) || "Payment Successful!"}
                </h3>
                <p className="text-xl text-muted-foreground mb-2">
                  ₹{selectedAmount.toLocaleString("en-IN")} {t("paid_successfully" as any, lang) || "added to wallet"}
                </p>
                {newBalance > 0 && (
                  <div className="bg-green-50 rounded-2xl p-4 border border-green-200 mt-4 mb-6">
                    <p className="text-lg text-green-800">
                      New Balance: <span className="font-bold text-2xl">₹{newBalance.toLocaleString("en-IN")}</span>
                    </p>
                  </div>
                )}
                <Button
                  size="lg"
                  className="h-16 px-12 rounded-2xl text-xl bg-blue-600 hover:bg-blue-700 gap-3 shadow-lg active:scale-95 transition-transform mt-4"
                  onClick={handleDone}
                >
                  <WalletIcon className="w-6 h-6" />
                  {t("back" as any, lang) || "Back to Wallet"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </KioskLayout>
  );
}
