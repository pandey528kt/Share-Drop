import { useState, type FormEvent } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { OWNER_EMAIL } from '@/lib/admin';
import { GENERIC_ERROR } from '@/lib/errors';

interface AdminForgotPasswordProps {
  initialStep: 'request' | 'set';
  onBack: () => void;
  onDone: () => void;
}

const MIN_PASSWORD_LENGTH = 8;

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20';

export default function AdminForgotPassword({ initialStep, onBack, onDone }: AdminForgotPasswordProps) {
  const [step, setStep] = useState<'request' | 'set'>(initialStep);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(OWNER_EMAIL);
    setBusy(false);
    if (sendError) {
      setError('The reset email could not be sent. Please wait a minute and try again.');
      return;
    }
    setNotice(`We sent a code to ${OWNER_EMAIL}. Enter it below with your new password.`);
    setStep('set');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for the new password.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (initialStep === 'request') {
        if (!code.trim()) {
          setError('Enter the 6-digit code from your email.');
          setBusy(false);
          return;
        }
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: OWNER_EMAIL,
          token: code.trim(),
          type: 'recovery',
        });
        if (verifyError) {
          setError('That code is incorrect or has expired. Request a new one.');
          setBusy(false);
          return;
        }
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || GENERIC_ERROR);
        setBusy(false);
        return;
      }
      onDone();
    } catch {
      setError(GENERIC_ERROR);
      setBusy(false);
    }
  };

  if (step === 'request') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Reset admin password</h2>
          <p className="mt-1 text-sm leading-normal text-slate-600">We will send a reset code to the owner email address only.</p>
        </div>
        {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
        <button
          type="button"
          onClick={sendCode}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send code to owner email
        </button>
        <button type="button" onClick={onBack} className="w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Set a new admin password</h2>
        {notice && <p className="mt-1 text-sm leading-normal text-slate-600">{notice}</p>}
      </div>
      {initialStep === 'request' && (
        <div>
          <label htmlFor="reset-code" className="text-sm font-medium text-slate-700">Reset code</label>
          <input
            id="reset-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className={inputClass}
            placeholder="6-digit code"
          />
        </div>
      )}
      <div>
        <label htmlFor="new-password" className="text-sm font-medium text-slate-700">New password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
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
        Save password
      </button>
    </form>
  );
}
