import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {uploadedProductData} from '../src/data/uploadedProductData.js';

const directory = 'public/images/optimized';
await fs.mkdir(directory, {recursive:true});
const manifest = {};
let originalBytes = 0;
let optimizedBytes = 0;
for (const product of uploadedProductData) {
  for (const [index, [source]] of product.photos.entries()) {
    const input = await fs.readFile(path.join('public', source));
    const checksum = createHash('sha256').update(input).digest('hex');
    const metadata = await sharp(input).metadata();
    const widths = [...new Set([480, 960, Math.min(metadata.width, 1440)])]
      .filter(width => width <= metadata.width).sort((a,b) => a-b);
    const variants = [];
    for (const width of widths) {
      const name = `${product.slug}-${index+1}-${width}.webp`;
      const output = await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:84}).toBuffer();
      await fs.writeFile(path.join(directory, name), output);
      variants.push({src:'/images/optimized/'+name,width});
      if (width === widths.at(-1)) optimizedBytes += output.length;
    }
    originalBytes += input.length;
    manifest[encodeURI(source)] = {checksum,variants};
  }
}
await fs.writeFile('src/data/productImageVariants.json', JSON.stringify(manifest,null,2)+'\n');
console.log(`Product photos: ${originalBytes} original bytes, ${optimizedBytes} bytes for the largest optimized variants.`);
