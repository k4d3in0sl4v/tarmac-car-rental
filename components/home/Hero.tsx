'use client';

import { useState } from 'react';
import Lineup from '@/components/Lineup';
import TripSearch from '@/components/TripSearch';

const guarantees = [
  { icon: '/img/icon-free.png', text: 'Free cancellation up to 24 hours before pick-up' },
  { icon: '/img/icon-coin.png', text: 'No hidden charges: taxes and fees included' },
  { icon: '/img/icon-24.png', text: 'Customer support 24/7, by phone' },
];

export default function Hero() {
  const [carId, setCarId] = useState('');

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero__inner">
        <div className="hero__copy">
          <h1 id="hero-title">Your contract is ready before you land.</h1>
          <p className="hero__lead">Rent a car at 7 US airports. Book online in two minutes, show your license at the desk and drive off.</p>
        </div>
        <TripSearch carId={carId} onCarIdChange={setCarId} />
        <ul className="guarantees">
          {guarantees.map((g) => (
            <li key={g.text}><img src={g.icon} alt="" width={40} height={40} />{g.text}</li>
          ))}
        </ul>
      </div>
      <Lineup selected={carId} onSelect={setCarId} />
    </section>
  );
}
