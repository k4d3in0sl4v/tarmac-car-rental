'use client';

import { cars } from '@/lib/data';
import { money } from '@/lib/format';

/** The five car classes parked on a road. Clicking a car picks that class. */
export default function Lineup({ selected, onSelect }: { selected: string; onSelect: (carId: string) => void }) {
  return (
    <div className="road">
      <div className="road__lineup" role="group" aria-label="Pick a car class">
        {cars.map((car) => (
          <button
            key={car.id}
            type="button"
            className="lineup-car"
            aria-pressed={selected === car.id}
            onClick={() => onSelect(selected === car.id ? '' : car.id)}
          >
            <img src={car.image} alt="" width={490} height={190} />
            <span className="lineup-car__label" aria-hidden>
              <b>{car.name}</b>
              <span>from {money(car.pricePerDay)}</span>
            </span>
            <span className="sr-only">{car.name}, from {money(car.pricePerDay)} a day</span>
          </button>
        ))}
      </div>
    </div>
  );
}
