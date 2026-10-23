import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');

let url = process.env.VITE_SUPABASE_URL;
let key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) url = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) key = trimmed.split('=')[1].trim();
  });
}

console.log('--- SUPABASE CONNECTION DIAGNOSTIC ---');
console.log('Project URL:', url || '(missing)');
console.log('Publishable Key:', key ? `${key.slice(0, 15)}... (${key.length} chars)` : '(missing)');

if (!url || !key) {
  console.log('\n❌ STATUS: INCOMPLETE');
  console.log('VITE_SUPABASE_PUBLISHABLE_KEY is not set yet in .env.local.');
  console.log('Get it from: https://supabase.com/dashboard/project/qeczhyiwgvglilwqbveh/settings/api');
  process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
  console.log('\nTesting connection to Supabase...');
  try {
    const { data, error } = await supabase.from('products').select('slug, name, status').limit(5);
    if (error) {
      console.log('❌ DATABASE QUERY FAILED:', error.message);
      process.exit(1);
    }
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY!');
    console.log('Found products in database:', data);

    const { data: categories, error: catError } = await supabase.from('categories').select('slug, name');
    if (!catError) {
      console.log('✅ Categories accessible:', categories);
    }
  } catch (err) {
    console.log('❌ UNEXPECTED ERROR:', err.message);
    process.exit(1);
  }
}

testConnection();
