import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, clearAuthError, googleLogin } from '../store/authSlice';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authError = useAppSelector(s => s.auth.error);
  const authBusy = useAppSelector(s => s.auth.status === 'loading');

  const from = (location.state as { from?: string; registered?: boolean } | null)?.from ?? '/parking-lots';
  const justRegistered = Boolean((location.state as { registered?: boolean } | null)?.registered);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLoginSuccess = (user: { role?: string }) => {
    if (user.role === 'admin' && from === '/parking-lots') {
      navigate('/admin', { replace: true });
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    dispatch(clearAuthError());

    if (!email.trim() || !password) {
      setLocalError('Email and password are required.');
      return;
    }

    try {
      const loggedInUser = await dispatch(loginUser({ email: email.trim(), password })).unwrap();
      handleLoginSuccess(loggedInUser);
    } catch {
      /* error surfaced via auth slice or unwrap rejection */
    }
  };

  const onGoogleSuccess = async (response: any) => {
    try {
      const user = await dispatch(googleLogin(response.credential)).unwrap();
      handleLoginSuccess(user);
    } catch {
      /* error surfaced via auth slice */
    }
  };


  const displayError = localError ?? authError;


  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md bg-white border flex flex-col justify-center border-gray-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Sign in</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">Use your Parkify account to book parking.</p>

        {justRegistered && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Account created. Please sign in with your email and password.
          </div>
        )}

        {displayError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {displayError}
          </div>
        )}

        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={authBusy}
            className="w-full py-3 cursor-pointer rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authBusy ? 'Signing in…' : 'Sign in'}
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
          No account?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
