import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const loggedInUser = await login({ email, password });
      navigate(`/dashboard/${loggedInUser.id}`);
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="card w-full p-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-slate-400">Access your saved recent searches.</p>

        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-emerald-400"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-400">
          Need an account?{' '}
          <Link className="text-emerald-300 hover:text-emerald-200" to="/signup">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
