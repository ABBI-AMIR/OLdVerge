# Product image uploads

## Current owner uploads (2026-11-08)

The active local catalogue is `src/data/uploadedProductData.js`, assembled by
`uploadedProducts.js`. It contains 19 watches and four quarter-zips. Each entry
explicitly lists its photo files and actual pixel dimensions; the first photo is
the card and product-page cover. PNG filenames and nested brand/model folders
are preserved exactly. Do not rename or delete an existing file casually.

The folder `quarter-zip-beige` contains the **Chocolate Brown** garment; its
public product slug is `quarter-zip-chocolate-brown`. Burgundy replaces the old
olive sample in the visible local collection. The old sample product definitions
and flat images remain on disk for historical seeds and regression fixtures.

The owner has replaced the Rolex files with 15 PNG photos. The website uses the
current PNGs, including the revised navy-dial cover and strap detail. Some watch
folders share bracelet photographs. Explicit cover selection prevents these
from becoming the main photo instead of the correct dial colour.

Prices are `null` and displayed as **Price to be confirmed**. Cart and Buy now
reject pending-price entries. Do not substitute zero or sample amounts. Supply
final PKR prices and confirm specifications/sizes before enabling purchasing.
The watch in `Rolex Yacht-Master 40` is labelled **Black Dial — Model to Confirm**
because the pictured dial reads Submariner. Resolve that mismatch with the owner.

For another upload, prefer the category/slug/view naming rules below. Existing
owner filenames may also be kept: add an explicit entry to
`uploadedProductData.js`, record width/height and select the correct main view.
Photos do not become products automatically, and unreviewed files are not
automatically published. Refresh/restart Vite after changes.

This is a **local visual catalogue**. No hosted product, stock, Storage object,
price or deployment has been changed. Backend mode continues to use approved
Supabase records; publishing these products there requires a separate import
and image approval step. Never replay old sample seeds for that purpose.

## Naming for new products

Prefer lowercase kebab-case category and product folders:

```text
public/images/products/<category>/<product-slug>/front.jpg
public/images/products/<category>/<product-slug>/back.jpg
public/images/products/<category>/<product-slug>/detail-1.jpg
public/images/products/<category>/<product-slug>/detail-2.jpg
```

Use watches or quarter-zips (and any future real catalogue categories). Front is
the cover; other views are optional. Genuine PNG/JPEG files are accepted; changing
a filename extension does not convert image data. Galleries use only listed files.
Cards/thumbnails load lazily, the main product image eagerly. Name-based alt text
and recorded intrinsic dimensions reserve layout space. Images are contained
without stretching. Quarter-zip card/carousel images fill portrait frames by
trimming background at the sides; product galleries keep the complete photo.
Record provenance in docs/asset-sources.md.

Update the explicit local catalogue entry after uploading. A production rebuild
is needed before new files can be hosted. No automatic deployment occurs here.

The homepage 3D quarter-zip showcase reads each product's colour, `artColor` and
main image automatically. Adding a quarter-zip entry updates the list, colour copy,
headline count and fan together. See `docs/quarter-zip-showcase.md` for the recipe.
