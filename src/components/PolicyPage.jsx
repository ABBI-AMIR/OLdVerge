import Reveal from './Reveal.jsx';
import { DemoNotice } from './ui.jsx';
import { isBackend } from '../lib/config.js';

// Document layout shared by the four policy pages (see data/policies.js).
export default function PolicyPage({ policy }) {
  return <main id="main-content" className="ov-page ov-policy">
    <Reveal className="ov-page-head"><h1>{policy.title}</h1></Reveal>
    {!isBackend && <DemoNotice>Draft placeholder. OLDVERGE has not confirmed this policy, so treat it as unfinished text for the demo.</DemoNotice>}
    <div className="ov-policy-body">
      {policy.sections.map((section) => <section key={section.heading}>
        <h2>{section.heading}</h2>
        {section.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </section>)}
      {policy.slug === 'refund-policy' && <p>For returns, contact us on <a href="https://wa.me/923442765766">WhatsApp at 03442765766</a> or email <a href="mailto:oldverge6@gmail.com">oldverge6@gmail.com</a>. Include your order number.</p>}
      {policy.updated && <p className="ov-policy-updated">Last updated {new Date(policy.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
    </div>
  </main>;
}
