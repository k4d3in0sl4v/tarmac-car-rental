// All catalogue data for the site: car classes, pick-up airports, extras and FAQ.
// Shared by the pages (rendering) and the API route handlers (pricing, validation).

export type CarClass = {
  id: string;
  name: string;
  example: string;
  image: string;
  seats: number;
  suitcases: number;
  doors: number;
  transmission: ('automatic' | 'manual')[];
  airConditioning: boolean;
  pricePerDay: number;
  /** Cars of this class available at each airport */
  units: number;
  description: string;
  highlights: string[];
};

export type Location = { id: string; name: string; short: string; city: string };
export type Extra = { id: string; name: string; pricePerDay: number };

export const PHONE = '+1 234 567 8908';
export const PHONE_HREF = 'tel:+12345678908';
export const MAX_DAYS = 30;
export const FREE_CANCELLATION_HOURS = 24;

export const cars: CarClass[] = [
  {
    id: 'economy',
    name: 'Economy',
    example: 'Hyundai i30 or similar',
    image: '/img/car-1.webp',
    seats: 4,
    suitcases: 2,
    doors: 5,
    transmission: ['automatic', 'manual'],
    airConditioning: true,
    pricePerDay: 39,
    units: 6,
    description: 'Popular with budget travelers on short trips. Cheap to rent, easy to park and light on fuel.',
    highlights: ['Around 40 mpg on the highway', 'Fits a city parking spot with room to spare', 'Manual gearbox available at some airports'],
  },
  {
    id: 'luxury',
    name: 'Luxury',
    example: 'Toyota GR86 or similar',
    image: '/img/car-2.webp',
    seats: 5,
    suitcases: 2,
    doors: 2,
    transmission: ['automatic'],
    airConditioning: true,
    pricePerDay: 129,
    units: 2,
    description: 'For business trips, anniversaries and other occasions when comfort and style matter as much as getting there.',
    highlights: ['Leather seats and premium sound', 'Delivered detailed and fully fueled', 'Priority desk at pick-up'],
  },
  {
    id: 'convertible',
    name: 'Convertible',
    example: 'Audi A5 Cabriolet or similar',
    image: '/img/car-3.webp',
    seats: 4,
    suitcases: 2,
    doors: 2,
    transmission: ['automatic'],
    airConditioning: true,
    pricePerDay: 89,
    units: 3,
    description: 'Roof down on the Pacific Coast Highway or the Florida Keys. Best for two people with light luggage.',
    highlights: ['Soft top opens in under 20 seconds', 'Heated seats for cool evenings', 'Best picked up at LAX, SFO or MIA'],
  },
  {
    id: 'suv',
    name: 'SUV',
    example: 'Ford Edge or similar',
    image: '/img/car-4.webp',
    seats: 5,
    suitcases: 3,
    doors: 4,
    transmission: ['automatic'],
    airConditioning: true,
    pricePerDay: 79,
    units: 4,
    description: 'Room for the family and the camping gear. A safe pick for road trips to Disney World or the Grand Canyon.',
    highlights: ['All-wheel drive on most models', 'Roof rails for extra luggage', 'Child seats fit in every rear seat'],
  },
  {
    id: 'van',
    name: 'Van / Minivan',
    example: 'Chrysler Pacifica or similar',
    image: '/img/car-5.webp',
    seats: 8,
    suitcases: 5,
    doors: 5,
    transmission: ['automatic'],
    airConditioning: true,
    pricePerDay: 99,
    units: 3,
    description: 'Legroom and luggage space no other class offers. 7- and 8-seat minivans, larger passenger vans on request.',
    highlights: ['Sliding doors on both sides', 'Separate climate control for the rear', '12- and 15-seat vans on request'],
  },
];

export const locations: Location[] = [
  { id: 'LAX', name: 'Los Angeles International Airport (LAX)', short: 'Los Angeles (LAX)', city: 'Los Angeles, CA' },
  { id: 'SFO', name: 'San Francisco International Airport (SFO)', short: 'San Francisco (SFO)', city: 'San Francisco, CA' },
  { id: 'LAS', name: 'Harry Reid International Airport (LAS)', short: 'Las Vegas (LAS)', city: 'Las Vegas, NV' },
  { id: 'JFK', name: 'John F. Kennedy International Airport (JFK)', short: 'New York (JFK)', city: 'New York, NY' },
  { id: 'ORD', name: "O'Hare International Airport (ORD)", short: 'Chicago (ORD)', city: 'Chicago, IL' },
  { id: 'MCO', name: 'Orlando International Airport (MCO)', short: 'Orlando (MCO)', city: 'Orlando, FL' },
  { id: 'MIA', name: 'Miami International Airport (MIA)', short: 'Miami (MIA)', city: 'Miami, FL' },
];

export const extras: Extra[] = [
  { id: 'insurance', name: 'Full coverage, no deductible', pricePerDay: 19 },
  { id: 'driver', name: 'Additional driver', pricePerDay: 12 },
  { id: 'childSeat', name: 'Child seat', pricePerDay: 9 },
  { id: 'gps', name: 'GPS navigator', pricePerDay: 7 },
];

export const faq: { q: string; a: string }[] = [
  {
    q: 'What do I need to pick up the car?',
    a: 'A driver’s license you have held for at least a year and a credit card in the main driver’s name. Visitors from abroad also need a passport, and an International Driving Permit if the license is not in English.',
  },
  { q: 'How old do I need to be?', a: 'The main driver must be 21 or older. Additional drivers have to meet the same rules and be present at pick-up.' },
  { q: 'How do I cancel?', a: 'Open Manage booking, enter your reference and email, and cancel. It’s free until 24 hours before pick-up.' },
  { q: 'Is there a deposit?', a: 'A refundable hold is placed on your credit card at pick-up and released after you return the car undamaged and with a full tank.' },
  { q: 'Automatic or manual?', a: 'Most cars in the US are automatic. Economy cars with a manual gearbox are available at some airports. Write your preference in the booking comment.' },
  { q: 'Can I return the car at a different airport?', a: 'Yes, one-way rentals are possible between most of our airports. Call us to arrange one, since the price depends on the route.' },
];

export const carById = (id: string) => cars.find((c) => c.id === id);
export const locationById = (id: string) => locations.find((l) => l.id === id);
