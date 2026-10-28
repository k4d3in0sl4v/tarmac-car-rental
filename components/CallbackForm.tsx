'use client';

import { useState } from 'react';
import { PHONE } from '@/lib/data';
import { api } from '@/lib/client';
import { hasErrors, validateCallback, type FieldErrors } from '@/lib/validate';
import FieldError, { invalidProps } from './FieldError';

export default function CallbackForm() {
  const [form, setForm] = useState({ name: '', phone: '', preferredTime: 'Any time', website: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: found } = validateCallback(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setBusy(true);
    setStatus('');
    const res = await api('/api/callbacks', { method: 'POST', body: form });
    setBusy(false);
    if (res.ok) {
      setSent(true);
      const when = form.preferredTime === 'Any time' ? 'soon' : `in the ${form.preferredTime.toLowerCase()}`;
      setStatus(`Request sent. We’ll call ${form.phone} ${when}.`);
    } else if (res.fields) setErrors(res.fields);
    else setStatus(res.status === 0 ? `We couldn’t send the request. Call us at ${PHONE}.` : res.error);
  };

  return (
    <form className="callback" onSubmit={submit} noValidate>
      <h3>Or leave your number and we’ll call you</h3>
      {!sent && (
        <>
          <div className="field">
            <label htmlFor="c-name">Your name</label>
            <input id="c-name" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} {...invalidProps('c-name-error', errors.name)} />
            <FieldError id="c-name-error" message={errors.name} />
          </div>
          <div className="field">
            <label htmlFor="c-phone">Phone, with country code</label>
            <input id="c-phone" type="tel" autoComplete="tel" placeholder={PHONE} value={form.phone} onChange={(e) => set('phone', e.target.value)} {...invalidProps('c-phone-error', errors.phone)} />
            <FieldError id="c-phone-error" message={errors.phone} />
          </div>
          <div className="field">
            <label htmlFor="c-time">When to call</label>
            <select id="c-time" value={form.preferredTime} onChange={(e) => set('preferredTime', e.target.value)}>
              {['Any time', 'Morning', 'Afternoon', 'Evening'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="hp" aria-hidden>
            <label htmlFor="c-website">Website</label>
            <input id="c-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </div>
          <button className="btn btn--light" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Call me back'}</button>
        </>
      )}
      <p className="form-status" role="status">{status}</p>
    </form>
  );
}
