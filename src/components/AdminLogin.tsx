import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isOwnerEmail } from '@/lib/admin';
import { GENERIC_ERROR } from '@/lib/errors';

interface AdminLoginProps {
  onForgotPassword: () => void;
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20';

export default function AdminLogin({ onForgotPassword }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isOwnerEmail(email)) {
      setError('This email does not have admin access.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) setError('Incorrect email or password.');
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="admin-email" className="text-sm font-medium text-slate-700">Owner email</label>
        <input
          id="admin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="text-sm font-medium text-slate-700">Password</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </button>
      <button type="button" onClick={onForgotPassword} className="w-full text-center text-sm font-medium text-teal-700 hover:text-teal-900">
        Forgot password?
      </button>
    </form>
  );
}
