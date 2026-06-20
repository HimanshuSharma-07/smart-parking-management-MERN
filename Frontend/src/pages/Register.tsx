import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { registerUser, clearAuthError, googleLogin } from '../store/authSlice';
import { GoogleLogin } from '@react-oauth/google';

export default function Register() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const authError = useAppSelector(s => s.auth.error);
  const authBusy = useAppSelector(s => s.auth.status === 'loading');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [profileImg, setProfileImg] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    dispatch(clearAuthError());

    if (!fullName.trim() || !email.trim() || !password || !phoneNo.trim()) {
      setLocalError('All fields are required.');
      return;
    }
    if (!profileImg) {
      setLocalError('Profile image is required.');
      return;
    }

    const formData = new FormData();
    formData.append('fullName', fullName.trim());
    formData.append('email', email.trim());
    formData.append('password', password);
    formData.append('phoneNo', phoneNo.trim());
    formData.append('profileImg', profileImg);

    try {
      await dispatch(registerUser(formData)).unwrap();
      /* Backend register does not set auth cookies — send user to login */
      navigate('/login', { replace: true, state: { registered: true } });
    } catch {
      /* auth slice holds message */
    }
  };

  const onGoogleSuccess = async (response: any) => {
    try {
      const user = await dispatch(googleLogin(response.credential)).unwrap();
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/parking-lots', { replace: true });
      }
    } catch {
      /* error surfaced via auth slice */
    }
  };

  const displayError = localError ?? authError;

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
        <p className="text-sm text-gray-600 mb-6">Register to book and manage parking.</p>

        {displayError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {displayError}
          </div>
        )}

        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              id="reg-name"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="reg-phone"
              type="tel"
              value={phoneNo}
              onChange={e => setPhoneNo(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="reg-img" className="block text-sm font-medium text-gray-700 mb-1">
              Profile photo
            </label>
            <input
              id="reg-img"
              type="file"
              accept="image/*"
              onChange={e => setProfileImg(e.target.files?.[0] ?? null)}
              className="w-full text-sm cursor-pointer text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-900 file:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={authBusy}
            className="w-full py-3  cursor-pointer rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authBusy ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={() => dispatch(clearAuthError())}
            theme="outline"
            size="large"
            width="100%"
          />
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
