import type { CarClass } from '@/lib/data';
import { BagIcon, DoorIcon, GearIcon, SeatIcon, SnowIcon } from './icons';

export default function CarSpecs({ car }: { car: Pick<CarClass, 'seats' | 'suitcases' | 'doors' | 'transmission' | 'airConditioning'> }) {
  return (
    <ul className="car__specs">
      <li><SeatIcon />{car.seats} seats</li>
      <li><BagIcon />{car.suitcases} suitcases</li>
      <li><DoorIcon />{car.doors} doors</li>
      <li><GearIcon />{car.transmission.length > 1 ? 'Automatic or manual' : 'Automatic'}</li>
      {car.airConditioning && <li><SnowIcon />Air conditioning</li>}
    </ul>
  );
}
