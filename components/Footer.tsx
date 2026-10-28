import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="site-footer__deal">
          <h2>Best valued deals from top car rental companies in the USA</h2>
          <p>In the USA we work with Sixt, Alamo, Europcar, Fox, Dollar, National, Hertz, Advantage and many others.</p>
          <Link className="btn btn--light" href="/cars">Find a car</Link>
        </div>
        <div className="site-footer__bottom">
          <nav aria-label="Footer">
            <Link href="/cars">Cars</Link>
            <Link href="/#how">How it works</Link>
            <Link href="/help">Help</Link>
            <Link href="/manage">Manage booking</Link>
          </nav>
          <p>© {new Date().getFullYear()} Tarmac Car Rental</p>
        </div>
      </div>
    </footer>
  );
}
