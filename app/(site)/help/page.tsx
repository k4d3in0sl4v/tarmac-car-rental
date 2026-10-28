import type { Metadata } from 'next';
import CallbackForm from '@/components/CallbackForm';
import Faq from '@/components/Faq';
import { PHONE, PHONE_HREF } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Help and contact',
  description: 'Answers about documents, age, deposit and cancellation, and how to reach us 24/7.',
};

export default function HelpPage() {
  return (
    <>
      <div className="wrap" style={{ paddingTop: 'clamp(40px, 6vw, 72px)' }}>
        <header className="page-head" style={{ marginBottom: 0 }}>
          <h1>Help and contact</h1>
          <p>Most answers are below. For anything else, call us any time or leave your number.</p>
        </header>
      </div>
      <Faq title="Frequent questions" />
      <section className="call" aria-labelledby="call-title">
        <div className="wrap call__inner">
          <div className="call__copy">
            <h2 id="call-title">Talk to a person, day or night</h2>
            <a className="call__number" href={PHONE_HREF}>{PHONE}</a>
            <p>Every day of the year, including holidays.</p>
          </div>
          <CallbackForm />
        </div>
      </section>
    </>
  );
}
