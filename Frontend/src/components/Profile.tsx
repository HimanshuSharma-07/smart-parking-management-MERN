
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, Car, CreditCard, Crown, Settings, Calendar,
  Edit2, Check, Clock, X, Loader2
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchMyBookings,
  mapRawToMyBookingsCard,
  mapRawToProfileRecent,
  type ProfileRecentBooking,
} from '../services/bookings';
import { updateProfileDetails, updateProfileImage } from '../services/user';
import { setUser } from '../store/authSlice';
import { Skeleton } from './ui/Skeleton';

type TabType = 'Personal Info' | 'Vehicles' | 'Payment Methods' | 'Membership' | 'Settings';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const Profile: React.FC = () => {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>('Personal Info');
  const user = useAppSelector(s => s.auth.user);
  const initialized = useAppSelector(s => s.auth.initialized);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phoneNo: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [recentBookings, setRecentBookings] = useState<ProfileRecentBooking[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    activeBookings: 0,
    totalSpent: 0,
  });
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        phoneNo: user.phoneNo || '',
      });
    }
  }, [user]);

  const loadBookings = useCallback(async () => {
    if (!user) {
      setRecentBookings([]);
      setStats({ totalBookings: 0, completedBookings: 0, activeBookings: 0, totalSpent: 0 });
      return;
    }
    setLoadingBookings(true);
    try {
      const raw = await fetchMyBookings();
      const cards = raw.map(mapRawToMyBookingsCard);
      setStats({
        totalBookings: cards.length,
        completedBookings: cards.filter(c => c.status === 'completed').length,
        activeBookings: cards.filter(c => c.status === 'active' || c.status === 'upcoming').length,
        totalSpent: cards.filter(c => c.status !== 'cancelled').reduce((s, c) => s + c.totalPrice, 0),
      });
      setRecentBookings(
        raw.slice(0, 3).map(mapRawToProfileRecent)
      );
    } catch {
      setRecentBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [user]);

  useEffect(() => {
    if (!initialized) return;
    void loadBookings();
  }, [initialized, loadBookings]);

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updatedUser = await updateProfileDetails(formData);
      dispatch(setUser(updatedUser));
      setIsEditing(false);
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const updatedUser = await updateProfileImage(file);
      dispatch(setUser(updatedUser));
      setSuccess("Profile picture updated!");
    } catch (err: any) {
      setError("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: ProfileRecentBooking['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 bg-gray-900 text-white text-xs font-semibold rounded-full">active</span>;
      case 'upcoming':
        return <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">upcoming</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">completed</span>;
    }
  };

  const getIconForBooking = (index: number) => {
    const colors = ['bg-blue-100', 'bg-orange-100', 'bg-green-100'];
    const iconColors = ['text-blue-600', 'text-orange-600', 'text-green-600'];
    return (
      <div className={`w-12 h-12 ${colors[index % colors.length]} rounded-lg flex items-center justify-center`}>
        <Car className={`w-6 h-6 ${iconColors[index % iconColors.length]}`} />
      </div>
    );
  };

  const tabs: TabType[] = ['Personal Info', 'Vehicles', 'Payment Methods', 'Membership', 'Settings'];

  const displayName = user?.fullName ?? 'Guest';
  const displayEmail = user?.email ?? '—';

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">My Profile</h1>
            <p className="text-sm text-gray-600">Manage your account and preferences</p>
          </div>
        </div>

        {!initialized && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
              <Skeleton className="w-24 h-24 rounded-full shrink-0" />
              <div className="flex-1 space-y-3 py-2 w-full">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-32 mt-4" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-64">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          </div>
        )}

        {initialized && !user && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
            Please sign in to view your profile.
          </div>
        )}

        {initialized && user && (
          <>
            {success && (
              <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
                <Check className="w-4 h-4" /> {success}
              </div>
            )}
            {error && (
              <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <X className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative shrink-0">
                  <div className="relative group overflow-hidden rounded-full">
                    {user.profileImg ? (
                      <img
                        src={user.profileImg}
                        alt={displayName}
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {initialsFromName(displayName)}
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <Edit2 className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center border-2 border-white cursor-pointer hover:bg-black transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Member since {new Date().getFullYear()}</span>
                  </div>
                </div>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateDetails}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalBookings}</div>
                  <div className="text-xs text-gray-600 mt-1">Total Bookings</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.completedBookings}</div>
                  <div className="text-xs text-gray-600 mt-1">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{stats.activeBookings}</div>
                  <div className="text-xs text-gray-600 mt-1">Active / Upcoming</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-600">₹{stats.totalSpent.toFixed(0)}</div>
                  <div className="text-xs text-gray-600 mt-1">Total Spent</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 mb-6 font-poppins">
              <div className="border-b border-gray-200 px-6">
                <div className="flex gap-8 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === tab
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'Personal Info' && (
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <User className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-bold text-gray-900 font-poppins">Personal Information</h3>
                    </div>

                    <form onSubmit={handleUpdateDetails} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          value={isEditing ? formData.fullName : displayName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            isEditing ? 'bg-white' : 'bg-gray-50'
                          }`}
                          readOnly={!isEditing}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={displayEmail}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 focus:outline-none cursor-not-allowed"
                            readOnly
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input
                          type="tel"
                          value={isEditing ? formData.phoneNo : (user?.phoneNo || '—')}
                          onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                          className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                            isEditing ? 'bg-white' : 'bg-gray-50'
                          }`}
                          readOnly={!isEditing}
                        />
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'Vehicles' && (
                  <div className="text-center py-12">
                    <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No vehicles added</h3>
                    <p className="text-sm text-gray-600 mb-4">Add your vehicles to speed up booking</p>
                    <button
                      type="button"
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Add Vehicle
                    </button>
                  </div>
                )}

                {activeTab === 'Payment Methods' && (
                  <div className="text-center py-12">
                    <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment methods</h3>
                    <p className="text-sm text-gray-600 mb-4">Add a payment method for faster checkout</p>
                    <button
                      type="button"
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Add Payment Method
                    </button>
                  </div>
                )}

                {activeTab === 'Membership' && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-linear-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Crown className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Membership</h3>
                    <p className="text-sm text-gray-600 mb-4">Standard account — benefits coming soon</p>
                    <div className="max-w-md mx-auto bg-linear-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
                      <ul className="space-y-3 text-left text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-600 shrink-0" />
                          <span>Book parking across all connected lots</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === 'Settings' && (
                  <div className="text-center py-12">
                    <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Settings</h3>
                    <p className="text-sm text-gray-600">Manage your preferences and notifications</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-bold text-gray-900">Recent Bookings</h3>
              </div>

              {loadingBookings && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="space-y-2">
                          <Skeleton className="w-32 h-5" />
                          <Skeleton className="w-24 h-3" />
                        </div>
                      </div>
                      <div className="space-y-2 text-right flex flex-col items-end">
                        <Skeleton className="w-16 h-5" />
                        <Skeleton className="w-20 h-6 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingBookings && recentBookings.length === 0 && (
                <p className="text-sm text-gray-600">No recent bookings yet.</p>
              )}

              <div className="space-y-4">
                {!loadingBookings &&
                  recentBookings.map((booking, index) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {getIconForBooking(index)}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">{booking.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span>{booking.spot}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>{booking.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-gray-900">₹{booking.price}</div>
                          {getStatusBadge(booking.status)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;
