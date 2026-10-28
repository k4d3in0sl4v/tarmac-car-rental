import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="not-found">
        <div className="wrap not-found__inner">
          <h1>This road ends here.</h1>
          <p>The page you opened doesn’t exist or has moved.</p>
          <Link className="btn btn--primary" href="/cars">Back to the cars</Link>
        </div>
        <div className="road" aria-hidden>
          <div className="road__lineup not-found__lineup">
            <span className="lineup-car"><img src="/img/car-1.webp" alt="" width={490} height={190} /></span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
