import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { faqGroups } from '../data/faq.js';
import Reveal from '../components/Reveal.jsx';

function Answer({ segments }) {
  return <p>{segments.map((segment, index) => (typeof segment === 'string' ? segment : <Link key={index} to={segment.to}>{segment.text}</Link>))}</p>;
}

export default function FaqPage() {
  const groups = useMemo(() => faqGroups(), []);
  const { hash } = useLocation();
  const [open, setOpen] = useState(() => (hash ? [hash.slice(1)] : []));

  // /faq#sizing opens that answer and brings it into view.
  useEffect(() => {
    const id = hash.slice(1);
    if (!id) return;
    setOpen((current) => (current.includes(id) ? current : [...current, id]));
    window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, [hash]);

  const toggle = (id) => setOpen((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  return <main id="main-content" className="ov-page ov-faq">
    <Reveal className="ov-page-head"><h1>Frequently asked questions</h1><p className="ov-page-intro">Answers about the range, ordering, delivery, returns and getting in touch. Delivery and return terms are not final yet, and the answers say so.</p></Reveal>
    {groups.map((group) => <Reveal as="section" className="ov-faq-group" key={group.id} aria-labelledby={`faq-group-${group.id}`}>
      <h2 id={`faq-group-${group.id}`}>{group.title}</h2>
      <div className="ov-faq-list">
        {group.items.map((item) => {
          const expanded = open.includes(item.id);
          return <div className={`ov-faq-item ${expanded ? 'is-open' : ''}`} id={item.id} key={item.id}>
            <h3><button type="button" id={`faq-q-${item.id}`} aria-expanded={expanded} aria-controls={`faq-a-${item.id}`} onClick={() => toggle(item.id)}>
              <span>{item.q}</span><Plus className="ov-faq-icon" size={16} aria-hidden="true" />
            </button></h3>
            <div className="ov-faq-answer" id={`faq-a-${item.id}`} role="region" aria-labelledby={`faq-q-${item.id}`}><div><Answer segments={item.a} /></div></div>
          </div>;
        })}
      </div>
    </Reveal>)}
  </main>;
}
