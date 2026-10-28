import Link from 'next/link';
import ClassCard from '@/components/ClassCard';
import CallbackForm from '@/components/CallbackForm';
import Faq from '@/components/Faq';
import Hero from '@/components/home/Hero';
import { cars, PHONE, PHONE_HREF } from '@/lib/data';

const pillars = [
  { tone: 'blue', icon: '/img/icon-card.png', title: 'Faster pick-up', text: 'We prepare your contract as soon as you book. At the desk you only sign.' },
  { tone: 'olive', icon: '/img/icon-car.png', title: '70 years on the road', text: 'Over seven decades of renting cars to travelers across the United States.' },
  { tone: 'rose', icon: '/img/icon-key.png', title: 'Better service', text: 'We know you better, we serve you better. Your next rental remembers your extras.' },
];

const steps = [
  { title: 'Choose dates and a car', text: 'The price you see includes taxes and airport fees. What you see is what you pay.' },
  { title: 'Get your booking reference', text: 'Your contract is prepared right away. Cancel free of charge until 24 hours before pick-up.' },
  { title: 'Pick up at the airport', text: 'Show your driver’s license and a credit card in the driver’s name. Sign, take the keys, go.' },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      <section className="pillars" aria-label="Why rent with us">
        {pillars.map((p) => (
          <article key={p.title} className={`pillar pillar--${p.tone}`}>
            <img src={p.icon} alt="" width={64} height={64} />
            <h2>{p.title}</h2>
            <p>{p.text}</p>
          </article>
        ))}
      </section>

      <section className="preview" aria-labelledby="preview-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="preview-title">Car and van rentals from top suppliers</h2>
            <Link className="link-more" href="/cars">See all cars and prices</Link>
          </div>
          <div className="preview__grid">
            {cars.map((car) => <ClassCard key={car.id} car={car} />)}
          </div>
        </div>
      </section>

      <section className="how" id="how" aria-labelledby="how-title">
        <div className="wrap">
          <h2 id="how-title">From booking to driving off</h2>
          <ol className="steps">
            {steps.map((s) => (
              <li key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="call" aria-labelledby="call-title">
        <div className="wrap call__inner">
          <div className="call__copy">
            <h2 id="call-title">Book a car rental near you by giving us a call</h2>
            <a className="call__number" href={PHONE_HREF}>{PHONE}</a>
            <p>Day and night, every day of the year.</p>
          </div>
          <CallbackForm />
        </div>
      </section>

      <Faq />
    </>
  );
}
