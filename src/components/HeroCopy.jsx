export default function HeroCopy({Link='a'}) {
  const target=path=>Link==='a'?{href:path}:{to:path};
  return <div className="ov-hero2-copy">
    <h1 id="ov-hero-title" className="ov-rise" style={{'--d':'0ms'}}>Timeless Elegance</h1>
    <p className="ov-rise" style={{'--d':'120ms'}}>Considered clothing. Distinctive watches. Your everyday signature.</p>
    <div className="ov-hero2-actions ov-rise" style={{'--d':'220ms'}}><Link {...target('/shop')} className="ov-button ov-button-dark">Shop all</Link><Link {...target('/shop/watches')} className="ov-button ov-button-light">Shop watches</Link></div>
  </div>;
}
