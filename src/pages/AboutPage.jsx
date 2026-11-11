import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal.jsx';


// Copy is limited to what the project can support: what is sold, the four colours, the watch styles listed.
export default function AboutPage() {
  return <main id="main-content" className="ov-page ov-about">
    <section className="ov-about-intro">
      <Reveal className="ov-about-title">
        <h1>Considered clothing. Distinctive watches.</h1>
        <p>OLDVERGE is a small range for everyday wear: a quarter zip in four colours, and watches that suit a plain white shirt as well as a weekend. Your everyday signature.</p>
      </Reveal>
      <Reveal className="ov-about-photos" delay={0.08}>
        <img className="ov-about-photo is-tall" src="/images/ribbon-navy-collar.webp" width="712" height="950" alt="Detail of the navy Oldverge quarter-zip collar" decoding="async" />
        <img className="ov-about-photo is-wide" src="/images/editorial-tank-watch.webp" width="1100" height="1350" alt="A rectangular watch nestled in a red presentation box" decoding="async" />
      </Reveal>
    </section>

    <Reveal as="section" className="ov-about-statement">
      <h2>Two things, kept deliberately simple.</h2>
    </Reveal>

    <section className="ov-about-split">
      <Reveal className="ov-about-media"><img className="ov-about-photo" src="/images/ribbon-burgundy.jpg" width="640" height="640" alt="Burgundy Oldverge quarter-zip laid flat" loading="lazy" decoding="async" /></Reveal>
      <Reveal className="ov-about-text" delay={0.08}>
        <h3>The quarter zip</h3>
        <p>One layer, in black, burgundy, navy and brown. It is the piece you reach for when the day starts cool and ends later than planned.</p>
        <h3>The watches</h3>
        <p>Digital, field, sport and dress styles at different price points, so there is something for the desk and something for the weekend.</p>
        <p className="ov-about-links"><Link to="/shop/quarter-zips">Shop quarter zips</Link><span aria-hidden="true">·</span><Link to="/shop/watches">Shop watches</Link></p>
      </Reveal>
    </section>
  </main>;
}
