import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function NotFoundPage({ what = 'page' }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const titles = { product: 'We could not find that product.', collection: 'We could not find that collection.', page: 'We could not find that page.' };
  return <main id="main-content" className="ov-page ov-notfound">
    <p className="ov-eyebrow-dark">Error 404</p>
    <h1>{titles[what] || titles.page}</h1>
    <p className="ov-page-intro">The link may be out of date, or the address may have a typo. Head back to the shop or search for what you need.</p>
    <div className="ov-notfound-actions"><Link to="/" className="ov-button ov-button-dark">Back to home</Link><Link to="/shop" className="ov-button ov-button-light">Shop all</Link></div>
    <form className="ov-inline-search" role="search" onSubmit={(event) => { event.preventDefault(); if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`); }}>
      <label htmlFor="ov-404-search">Search the shop</label>
      <div><input id="ov-404-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “navy” or “watch”" /><button type="submit" className="ov-button ov-button-dark">Search</button></div>
    </form>
  </main>;
}

export default NotFoundPage;
