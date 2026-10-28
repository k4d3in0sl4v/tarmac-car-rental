import type { Metadata } from 'next';
import Link from 'next/link';
import ClassCard from '@/components/ClassCard';
import { notFound } from 'next/navigation';
import CarSpecs from '@/components/CarSpecs';
import { carById, cars } from '@/lib/data';
import { money } from '@/lib/format';

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return cars.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const car = carById((await params).id);
  return car ? { title: `${car.name} rental`, description: car.description } : {};
}

export default async function CarPage({ params }: Props) {
  const car = carById((await params).id);
  if (!car) notFound();
  const others = cars.filter((c) => c.id !== car.id);

  return (
    <div className="page">
      <div className="wrap">
        <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
          <ol>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/cars">Cars</Link></li>
            <li aria-current="page">{car.name}</li>
          </ol>
        </nav>

        <div className="detail">
          <div className="detail__stage">
            <div className="car__stage">
              <img src={car.image} alt={`${car.name} class car, side view`} width={980} height={380} />
            </div>
          </div>
          <div>
            <h1>{car.name}</h1>
            <p className="detail__example">{car.example}</p>
            <p className="detail__price"><strong>{money(car.pricePerDay)}</strong> <span>a day, taxes and airport fees included</span></p>
            <CarSpecs car={car} />
            <p className="detail__desc">{car.description}</p>
            <ul className="highlights">
              {car.highlights.map((h) => <li key={h}>{h}</li>)}
            </ul>
            <dl className="facts">
              <dt>Minimum driver age</dt><dd>21</dd>
              <dt>Cancellation</dt><dd>Free until 24 hours before pick-up</dd>
              <dt>Mileage</dt><dd>Unlimited</dd>
              <dt>Fuel policy</dt><dd>Full to full</dd>
            </dl>
            <Link className="btn btn--primary" href={`/book?car=${car.id}`}>Book {car.name}</Link>
          </div>
        </div>

        <section className="other-classes" aria-labelledby="others-title">
          <div className="section-head">
            <h2 id="others-title">Other classes</h2>
            <Link className="link-more" href="/cars">Compare all cars</Link>
          </div>
          <div className="preview__grid">
            {others.map((c) => <ClassCard key={c.id} car={c} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
