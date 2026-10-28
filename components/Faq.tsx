import { faq } from '@/lib/data';

export default function Faq({ title = 'Questions before you book' }: { title?: string }) {
  return (
    <section className="faq" id="faq" aria-labelledby="faq-title">
      <div className="wrap faq__inner">
        <h2 id="faq-title">{title}</h2>
        <div className="faq__list">
          {faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
