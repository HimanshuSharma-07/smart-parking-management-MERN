import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import { getSocket } from "../../services/socket";
import {
  Search, User as UserIcon, Car, Phone, Mail,
  Clock, CreditCard, Banknote, CheckCircle2,
  XCircle, AlertCircle, Filter, Download
} from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";

const statusConfig: Record<string, { label: string; color: string }> = {
  active:    { label: "Active",    color: "bg-blue-50 text-blue-700 border-blue-100" },
  reserved:  { label: "Reserved",  color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-100" },
};

const payStatusConfig: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  paid:       { icon: CheckCircle2, color: "text-emerald-600" },
  successful: { icon: CheckCircle2, color: "text-emerald-600" },
  completed:  { icon: CheckCircle2, color: "text-emerald-600" },
  failed:     { icon: XCircle,       color: "text-red-500"     },
  pending:    { icon: AlertCircle,   color: "text-amber-500"   },
};

function formatDuration(hours: number) {
  if (!hours || hours <= 0) return "–";
  if (hours === 1) return "1 hr";
  return `${hours} hrs`;
}

function formatDate(d: string | Date) {
  if (!d) return "–";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const CustomerRecords = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");

  const fetchRecords = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/customer-records")
      .then((res) => setRecords(res.data.data))
      .catch((err) => console.error("Failed to fetch customer records", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Real-time refresh on booking or payment changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => fetchRecords();
    socket.on("booking:new", refresh);
    socket.on("booking:completed", refresh);
    socket.on("booking:cancelled", refresh);
    socket.on("payment:created", refresh);
    socket.on("payment:verified", refresh);
    return () => {
      socket.off("booking:new", refresh);
      socket.off("booking:completed", refresh);
      socket.off("booking:cancelled", refresh);
      socket.off("payment:created", refresh);
      socket.off("payment:verified", refresh);
    };
  }, [fetchRecords]);

  const filtered = records.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      r.user?.fullName?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.vehicleNumber?.toLowerCase().includes(q) ||
      r.user?.phoneNo?.toLowerCase().includes(q) ||
      r.lot?.lotName?.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === "all" || r.bookingStatus === statusFilter;

    const payStatus = r.payment?.paymentStatus || "pending";
    const matchPay = payFilter === "all" || payStatus === payFilter;

    return matchSearch && matchStatus && matchPay;
  });

  const handleExport = () => {
    const headers = [
      "Customer Name", "Email", "Phone", "Vehicle No",
      "Lot", "Slot", "Floor", "Slot Type", "Price/Hr",
      "Entry Time", "Exit Time", "Duration (hrs)",
      "Amount (₹)", "Payment Method", "Payment Status", "Booking Status"
    ];
    const rows = filtered.map((r) => [
      r.user?.fullName || "",
      r.user?.email || "",
      r.user?.phoneNo || "",
      r.vehicleNumber || "",
      r.lot?.lotName || "",
      r.slot?.slotNumber || "",
      r.slot?.floor || "",
      r.slot?.type || "",
      r.slot?.pricePerHour || "",
      r.startTime ? new Date(r.startTime).toLocaleString() : "",
      r.endTime ? new Date(r.endTime).toLocaleString() : "",
      r.durationHours || "",
      r.payment?.amount || "",
      r.payment?.paymentMethod || "",
      r.payment?.paymentStatus || "pending",
      r.bookingStatus || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-records-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">Customer Records</h1>
          <p className="text-sm font-medium text-gray-500">
            Complete parking history — {records.length} total records
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-sm active:scale-95 shrink-0"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="customer-records-search"
            type="text"
            placeholder="Search by name, email, vehicle, phone, lot…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-gray-900/5 shadow-sm"
          />
        </div>

        {/* Booking Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            id="booking-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-gray-900/5 shadow-sm appearance-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="reserved">Reserved</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Payment Filter */}
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            id="payment-status-filter"
            value={payFilter}
            onChange={(e) => setPayFilter(e.target.value)}
            className="pl-9 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-gray-900/5 shadow-sm appearance-none cursor-pointer"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Unpaid / Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Records",   value: filtered.length,                                       color: "text-gray-900" },
          { label: "Completed",       value: filtered.filter(r => r.bookingStatus === "completed").length,  color: "text-emerald-600" },
          { label: "Active / Reserved", value: filtered.filter(r => ["active","reserved"].includes(r.bookingStatus)).length, color: "text-blue-600" },
          { label: "Paid",            value: filtered.filter(r => ["paid","successful","completed"].includes(r.payment?.paymentStatus)).length, color: "text-indigo-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  {['Customer', 'Vehicle', 'Parking Spot', 'Entry Time', 'Exit Time', 'Duration', 'Amount', 'Payment', 'Status'].map(h => (
                    <th key={h} className="px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td className="px-6 py-5"><Skeleton className="h-10 w-32" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-10 w-24" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-10 w-20" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-6 w-20 rounded-full" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4">Parking Spot</th>
                  <th className="px-6 py-4">Entry Time</th>
                  <th className="px-6 py-4">Exit Time</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => {
                  const bookingStatus = statusConfig[r.bookingStatus] ?? { label: r.bookingStatus, color: "bg-gray-100 text-gray-600 border-gray-200" };
                  const payStatus = r.payment?.paymentStatus ?? "pending";
                  const payConf = payStatusConfig[payStatus] ?? payStatusConfig.pending;
                  const PayIcon = payConf.icon;
                  const isPaid = ["paid","successful","completed"].includes(payStatus);

                  return (
                    <tr key={r._id} className="hover:bg-gray-50/60 group transition-colors">
                      {/* Customer */}
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{r.user?.fullName || "–"}</div>
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {r.user?.email || "–"}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {r.user?.phoneNo || "–"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-bold text-gray-900 tracking-wide font-mono uppercase text-xs bg-gray-100 px-2 py-1 rounded-md">
                            {r.vehicleNumber}
                          </span>
                        </div>
                      </td>

                      {/* Parking Spot */}
                      <td className="px-6 py-5">
                        <div className="text-sm font-semibold text-gray-900">{r.lot?.lotName || "–"}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Slot {r.slot?.slotNumber} &middot; Floor {r.slot?.floor}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 capitalize">
                          {r.slot?.type} &middot; ₹{r.slot?.pricePerHour}/hr
                        </div>
                      </td>

                      {/* Entry Time */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium">{formatDate(r.startTime)}</span>
                        </div>
                      </td>

                      {/* Exit Time */}
                      <td className="px-6 py-5">
                        <div className="text-xs text-gray-700 font-medium">
                          {r.endTime ? formatDate(r.endTime) : <span className="text-gray-400 italic">In Progress</span>}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-gray-900">
                          {formatDuration(r.durationHours)}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-gray-900">
                          {r.payment?.amount != null ? `₹${r.payment.amount.toLocaleString()}` : "–"}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          {/* Method */}
                          {r.payment?.paymentMethod ? (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${
                              r.payment.paymentMethod === "online"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            }`}>
                              {r.payment.paymentMethod === "online"
                                ? <CreditCard className="w-3 h-3" />
                                : <Banknote className="w-3 h-3" />}
                              {r.payment.paymentMethod}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300 italic">No payment</span>
                          )}

                          {/* Status */}
                          <div className={`flex items-center gap-1 text-[10px] font-bold ${payConf.color}`}>
                            <PayIcon className="w-3 h-3" />
                            {isPaid ? "Paid" : payStatus.charAt(0).toUpperCase() + payStatus.slice(1)}
                          </div>
                        </div>
                      </td>

                      {/* Booking Status */}
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight ${bookingStatus.color}`}>
                          {bookingStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                  <Search className="w-8 h-8" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No customer records found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerRecords;
