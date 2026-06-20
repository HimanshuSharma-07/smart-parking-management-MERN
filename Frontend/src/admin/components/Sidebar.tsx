import { NavLink } from "react-router-dom";
import { LayoutDashboard, Grid, CalendarDays, CreditCard, Users } from "lucide-react";

const Sidebar = () => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 p-3 rounded-lg transition-colors text-sm font-medium cursor-pointer ${
      isActive
        ? "bg-gray-100 text-gray-900"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`;

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
      <div className="mb-8 px-2">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Admin Panel</h2>
      </div>

      <nav className="space-y-1">
        <NavLink to="/admin" end className={linkClass}>
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </NavLink>
        <NavLink to="/admin/slots" className={linkClass}>
          <Grid className="w-5 h-5" />
          Slots
        </NavLink>
        <NavLink to="/admin/bookings" className={linkClass}>
          <CalendarDays className="w-5 h-5" />
          Bookings
        </NavLink>
        <NavLink to="/admin/payments" className={linkClass}>
          <CreditCard className="w-5 h-5" />
          Payments
        </NavLink>
        <NavLink to="/admin/customers" className={linkClass}>
          <Users className="w-5 h-5" />
          Customer Records
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;