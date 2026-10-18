import { useId, useState } from 'react';
import { Eye, EyeOff, Minus, Plus } from 'lucide-react';
import { MAX_QTY } from '../lib/money.js';
import Reveal from './Reveal.jsx';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Label + control + message, wired together for assistive technology. `as` is input | textarea | select. */
export function Field({ label, name, value, onChange, error, hint, as = 'input', type = 'text', children, className = '', ...rest }) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
  const props = { id, name, value, onChange, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy, ...rest };
  return <div className={`ov-field ${error ? 'has-error' : ''} ${className}`}>
    <label htmlFor={id}>{label}</label>
    {as === 'textarea' ? <textarea rows="5" {...props} />
      : as === 'select' ? <select {...props}>{children}</select>
        : <input type={type} {...props} />}
    {hint && <p className="ov-field-hint" id={`${id}-hint`}>{hint}</p>}
    {error && <p className="ov-field-error" id={`${id}-error`}>{error}</p>}
  </div>;
}

export function PasswordField({ label = 'Password', error, hint, ...rest }) {
  const [shown, setShown] = useState(false);
  const id = useId();
  return <div className={`ov-field ov-password ${error ? 'has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <div className="ov-password-wrap">
      <input id={id} type={shown ? 'text' : 'password'} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} {...rest} />
      <button type="button" className="ov-password-toggle" aria-pressed={shown} aria-label={shown ? 'Hide password' : 'Show password'} onClick={() => setShown((value) => !value)}>{shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
    </div>
    {hint && <p className="ov-field-hint">{hint}</p>}
    {error && <p className="ov-field-error" id={`${id}-error`}>{error}</p>}
  </div>;
}

export function QuantityControl({ value, onChange, label = 'Quantity', compact = false }) {
  return <div className={`ov-qty ${compact ? 'is-compact' : ''}`} role="group" aria-label={label}>
    <button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(value - 1)}><Minus size={15} aria-hidden="true" /></button>
    <output aria-live="polite">{value}</output>
    <button type="button" aria-label="Increase quantity" disabled={value >= MAX_QTY} onClick={() => onChange(value + 1)}><Plus size={15} aria-hidden="true" /></button>
  </div>;
}

export function EmptyState({ title, children, actions }) {
  return <div className="ov-empty" role="status">
    <h2>{title}</h2>
    {children && <p>{children}</p>}
    {actions && <div className="ov-empty-actions">{actions}</div>}
  </div>;
}

export function DemoNotice({ children }) {
  return <p className="ov-demo-notice" role="note"><strong>Demo.</strong> {children}</p>;
}

export function PageHead({ title, intro, children }) {
  return <Reveal as="header" className="ov-page-head">
    <h1>{title}</h1>
    {intro && <p className="ov-page-intro">{intro}</p>}
    {children}
  </Reveal>;
}

/** A titled block of an information page; fades in as it scrolls into view. */
export function InfoSection({ title, children, delay = 0 }) {
  return <Reveal as="section" className="ov-info-section" delay={delay}>
    <h2>{title}</h2>
    {children}
  </Reveal>;
}

/** Native <details>: keyboard and screen-reader support without extra scripting. */
export function Accordion({ items, openFirst = false }) {
  return <div className="ov-accordions">
    {items.map((item, index) => <details key={item.title} id={item.id} open={openFirst && index === 0 ? true : undefined}>
      <summary>{item.title}</summary>
      <div className="ov-acc-body">{item.body}</div>
    </details>)}
  </div>;
}
