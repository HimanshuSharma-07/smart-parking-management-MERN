import { Menu as HeadlessMenu, Transition } from "@headlessui/react"
import { MapPin, Car, House, LogOut, LogIn, UserPlus, User } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import UserProfile from "../UserProfile"
import { useAppDispatch, useAppSelector } from "../../store/hooks"
import { logoutUser } from "../../store/authSlice"
import { Fragment } from "react"

function Navbar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector(s => s.auth.user)
  const isAuthLoading = useAppSelector(s => s.auth.status === "loading")
  const isAuthenticated = Boolean(user)

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate("/")
  }

  const NavLinks = () => (
    <>
      {user?.role === 'admin' ? (
        <>
          <Link to="/admin" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Dashboard
          </Link>
          <Link to="/admin/parking-lots" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <MapPin className="w-4 h-4" />
            Parking Lots
          </Link>
          <Link to="/admin/bookings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Bookings
          </Link>
          <Link to="/admin/payments" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Payments
          </Link>
          <Link to="/admin/customers" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <User className="w-4 h-4" />
            Customers Details
          </Link>
        </>
      ) : (
        <>
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <House className="w-4 h-4"/>
            Home
          </Link>
          <Link to="/parking-lots" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <MapPin className="w-4 h-4" />
            Parking Lots
          </Link>
          {isAuthenticated && (
            <Link to="/my-bookings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              My Bookings
            </Link>
          )}
        </>
      )}
    </>
  )

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Parkify</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <NavLinks />
          </div>

          <div className="flex items-center gap-3">
            {/* Unified Mobile/Desktop Menu */}
            <HeadlessMenu as="div" className="relative">
              <HeadlessMenu.Button className="flex items-center cursor-pointer outline-none">
                {isAuthenticated ? (
                  <UserProfile
                    name={user?.fullName ?? "Guest"}
                    image={user?.profileImg}
                  />
                ) : (
                  <div className="md:hidden flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full text-gray-500 overflow-hidden">
                    <User className="w-6 h-6" />
                  </div>
                )}
              </HeadlessMenu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <HeadlessMenu.Items className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-[60] focus:outline-none overflow-hidden">
                  {isAuthenticated && (
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  )}

                  {/* Adaptive Nav Section (Mobile only) */}
                  <div className="md:hidden border-b border-gray-100 pb-1 mb-1">
                    {user?.role === 'admin' ? (
                      <>
                        <HeadlessMenu.Item>
                          {({ active }) => (
                            <Link to="/admin" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${active ? 'bg-gray-50' : ''}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                              Dashboard
                            </Link>
                          )}
                        </HeadlessMenu.Item>
                        <HeadlessMenu.Item>
                          {({ active }) => (
                            <Link to="/admin/parking-lots" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${active ? 'bg-gray-50' : ''}`}>
                              <MapPin className="w-4 h-4" />
                              Parking Lots
                            </Link>
                          )}
                        </HeadlessMenu.Item>
                        <HeadlessMenu.Item>
                          {({ active }) => (
                            <Link to="/admin/bookings" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${active ? 'bg-gray-50' : ''}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              Bookings
                            </Link>
                          )}
                        </HeadlessMenu.Item>
                        <HeadlessMenu.Item>
                          {({ active }) => (
                            <Link to="/admin/payments" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${active ? 'bg-gray-50' : ''}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                              Payments
                            </Link>
                          )}
                        </HeadlessMenu.Item>
                      </>
                    ) : (
                      <>
                        <HeadlessMenu.Item>
                          {({ active }) => (
                            <Link to="/" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${active ? 'bg-gray-50' : ''}`}>
                              <House className="w-4 h-4"/>
                              Home
                            </Link>
                          )}
                        </HeadlessMenu.Item>
                        <HeadlessMenu.Item>
                          {({ active }) => (
                            <Link to="/parking-lots" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${active ? 'bg-gray-50' : ''}`}>
                              <MapPin className="w-4 h-4" />
                              Parking Lots
                            </Link>
                          )}
                        </HeadlessMenu.Item>
                        {isAuthenticated && (
                          <HeadlessMenu.Item>
                            {({ active }) => (
                              <Link to="/my-bookings" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${active ? 'bg-gray-50' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                My Bookings
                              </Link>
                            )}
                          </HeadlessMenu.Item>
                        )}
                      </>
                    )}
                  </div>

                  {isAuthenticated ? (
                    <>
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <Link to="/profile" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${active ? 'bg-gray-50' : ''}`}>
                            <User className="w-4 h-4" />
                            View Profile
                          </Link>
                        )}
                      </HeadlessMenu.Item>
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <button
                            type="button"
                            onClick={() => void handleLogout()}
                            disabled={isAuthLoading}
                            className={`w-full text-left px-4 py-2 text-sm text-red-600 transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-3 ${active ? 'bg-red-50' : ''}`}
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        )}
                      </HeadlessMenu.Item>
                    </>
                  ) : (
                    <>
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <Link to="/login" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${active ? 'bg-gray-50' : ''}`}>
                            <LogIn className="w-4 h-4" />
                            Login
                          </Link>
                        )}
                      </HeadlessMenu.Item>
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <Link to="/register" className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${active ? 'bg-gray-50' : ''}`}>
                            <UserPlus className="w-4 h-4" />
                            Register
                          </Link>
                        )}
                      </HeadlessMenu.Item>
                    </>
                  )}
                </HeadlessMenu.Items>
              </Transition>
            </HeadlessMenu>

            {/* Desktop Guest Actions */}
            {!isAuthenticated && (
              <div className="hidden md:flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="group inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
                >
                  <LogIn className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-4.5 py-2 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-md shadow-slate-900/15 cursor-pointer active:scale-[0.98]"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

