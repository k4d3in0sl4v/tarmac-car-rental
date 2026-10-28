import type { Metadata } from 'next';
import { Suspense } from 'react';
import FleetView from '@/components/fleet/FleetView';

export const metadata: Metadata = {
  title: 'Cars and prices',
  description: 'Economy, luxury, convertible, SUV and minivan rentals at 7 US airports. See the total for your dates and book online.',
};

export default function CarsPage() {
  return (
    <div className="page">
      <div className="wrap">
        <header className="page-head">
          <h1>Car and van rentals from top suppliers</h1>
          <p>Our suppliers offer both automatic and manual cars in the US. Availability depends on the supplier and the airport you rent from.</p>
        </header>
        <Suspense fallback={<p className="fleet__status">Loading cars…</p>}>
          <FleetView />
        </Suspense>
      </div>
    </div>
  );
}
