import Link from 'next/link';
import CarSpecs from '@/components/CarSpecs';
import type { CarClass } from '@/lib/data';
import { money, plural } from '@/lib/format';

export type Availability = { available: boolean; unitsLeft: number; quote: { total: number; days: number } };

type Props = {
  car: Omit<CarClass, 'units' | 'highlights'>;
  availability?: Availability;
  days?: number;
  locationId?: string;
  bookHref: string;
  highlight?: boolean;
};

export default function CarRow({ car, availability, days, locationId, bookHref, highlight }: Props) {
  const unavailable = availability ? !availability.available : false;
  const total = availability?.quote.total ?? (days ? car.pricePerDay * days : undefined);

  return (
    <article className={`car${unavailable ? ' is-unavailable' : ''}${highlight ? ' is-highlight' : ''}`} id={`car-${car.id}`}>
      <div className="car__stage">
        <img src={car.image} alt={`${car.name} class car, side view`} width={490} height={190} loading="lazy" />
      </div>
      <div className="car__body">
        <h3 className="car__name"><Link href={`/cars/${car.id}`}>{car.name}</Link></h3>
        <p className="car__example">{car.example}</p>
        <CarSpecs car={car} />
        <p className="car__desc">{car.description}</p>
      </div>
      <div className="car__price">
        <p className="car__rate"><strong>{money(car.pricePerDay)}</strong> a day</p>
        {total !== undefined && days ? <p className="car__total">{money(total)} for {plural(days, 'day')}</p> : null}
        {unavailable && <p className="car__left">Booked out for these dates</p>}
        {!unavailable && availability && availability.unitsLeft <= 2 && <p className="car__left">{availability.unitsLeft} left at {locationId}</p>}
        {unavailable ? (
          <button type="button" className="btn btn--primary" disabled>Not available</button>
        ) : (
          <Link className="btn btn--primary" href={bookHref}>Book {car.name}</Link>
        )}
      </div>
    </article>
  );
}
