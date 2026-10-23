import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import ClientBoot from './ssr/ClientBoot.jsx';
import './styles.css';
import './home.css';
import './store.css';

let snapshot=null;
try { const value=JSON.parse(document.getElementById('ov-ssr-state')?.textContent||'null'); if(value?.version===1&&Array.isArray(value.products)) snapshot=value; } catch { /* normal client-only fallback */ }
const app=<React.StrictMode><ClientBoot snapshot={snapshot} /></React.StrictMode>;
const root=document.getElementById('root');
if(snapshot) hydrateRoot(root,app);else createRoot(root).render(app);
