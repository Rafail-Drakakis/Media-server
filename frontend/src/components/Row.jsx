import { useRef } from 'react';
import Card from './Card';

export default function Row({ title, items, progressMap }) {
  const rowRef = useRef(null);

  if (!items || items.length === 0) return null;

  function scroll(direction) {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.8;
    rowRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  return (
    <div className="row-section">
      <h2 className="row-title">{title}</h2>
      <div className="row-wrapper">
        <button className="row-arrow row-arrow-left" onClick={() => scroll('left')}>&#10094;</button>
        <div className="row-items" ref={rowRef}>
          {items.map(item => (
            <Card
              key={item.id}
              show={item}
              progress={progressMap?.[item.id] || null}
            />
          ))}
        </div>
        <button className="row-arrow row-arrow-right" onClick={() => scroll('right')}>&#10095;</button>
      </div>
    </div>
  );
}
