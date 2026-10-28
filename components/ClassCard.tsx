import Link from 'next/link';
import type { CarClass } from '@/lib/data';
import { money } from '@/lib/format';

/** Compact card linking to a car class page. */
export default function ClassCard({ car }: { car: CarClass }) {
  return (
    <Link className="class-card" href={`/cars/${car.id}`}>
      <img src={car.image} alt="" width={490} height={190} loading="lazy" />
      <h3>{car.name}</h3>
      <p>{car.seats} seats, {car.suitcases} suitcases</p>
      <strong>from {money(car.pricePerDay)}<span className="car__rate"> a day</span></strong>
    </Link>
  );
}
