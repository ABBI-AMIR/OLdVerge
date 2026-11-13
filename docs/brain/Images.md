<!-- SNAPSHOT exported from the canonical Obsidian brain (Downloads/oldv/brain). Do not edit here: edit the brain, then run `node scripts/export-brain.mjs`. -->
---
type: assets
updated: 2026-10-18
---
# Images

Full provenance table: `oldv/docs/asset-sources.md`. All photos in `oldv/public/images/` are **Unsplash stand-ins** (replaced 2026-10-17), downloaded at 1200 px wide. Unsplash licence: free commercial use, attribution optional but good practice. Re-check photographer credits before publishing.

## Facts
- Only `watch-casio-a168.jpg` closely matches its product.
- `watch-casio-mtp.jpg` dial reads Omega Seamaster (used for Casio MTP-1302). `watch-citizen-eco.jpg` dial shows another brand. `watch-timex-weekender.jpg` is a generic watch.
- Quarter-zip photos show people wearing knits; Navy and Olive do not read as navy or olive.
- Product tiles use `*-cutout.webp` (made locally with `rembg`, u2net, 960x1200, 4:5, on tile colour `#E7E1D6`). The quarter-zip cut-outs show a person wearing the garment; the black one is cropped at the hips.
- `oldverge-quarter-zip-campaign.jpg` was downscaled to 1000x1500 (227 KB); the original is in `oldverge-images.zip`.
- Files: hero (`oldverge-hero-model`, `oldverge-hero-watch-detail`, `oldverge-watch-editorial`, `watch-hero-wrist`), `quarter-zip-{black,beige,navy,olive,neutral,soft-knit}`, `watch-{casio-a168,casio-mtp,citizen-eco,orient-bambino,seiko-sports,timex-weekender}`.

## When adding a photo, record
File name, source URL, photographer/supplier, licence + URL, date, attribution needed, what it truly shows. Add pixel size to `src/data/imageSizes.js`.

## Rules
Do not replace real photos with placeholders. Colour-explorer illustrations are labelled stand-ins; swap in real photos via `quarterZipVariants.js`.

Related: [[Products]] · [[Known Issues]] · [[Launch Blockers]]

## Manual product photo folders — 2026-11-08
Owner requested folder scaffolding and code wiring only; images supplied manually. Existing conventions found: src/data/products.js+productBuilders local10sampleproducts with flat public/images cutout+original files; backend uses product_images and approved Supabase Storage via catalogMapper/admin workflow/seedgenerator. Preserved existing images, slugs, seedfiles and backend mapping; no delete/rename/image editing/provider or DB calls. Created public/images/products/{watches,quarter-zips}/<existing-slug>/.gitkeep for6watch+4quarterzipproducts and README instructions. Constructors declare imageFiles front/back/detail-1/detail-2.jpg; localProductImages discovers filenames via Vite glob, activates front only when present, omits missing optional views, preserves oldphotos untilfrontupload. Localcatalog/demoSSR/testsetup consume resolver; colour explorer uses actual uploadedfront whenpresent. Product cards lazy, producthero eager, thumbs lazy76x95, alt generated fromproductname/view; uploadedphotos contain in4:5reservedframes withoutcrop/stretch. Newtests coverall10paths/folders, traversal rejection, partial/frontonlygallery/order, backendpreservation/alt fallback, cardloading.307unit/lint/client+SSRbuild/bundle/scan/diffcheck pass. BrowserlocalCasio page confirms oldgalleryworking andzero nonexistentnewuploadrequests. No actualnewphotoeveradded; optionalupload behavior tested with path-only mocks (no synthetic imagefixture). ScreenshotUI evidence scripts/out/product-upload-existing-preview-20261108.png; this is not a product asset. Currentlocalvisualpreview retained, stagingSupabaseDNS ENOTFOUND frompriorstartup notresolved/modified. No commit/push/deploy/order/stock/domainchanges. Repo source files changed: productBuilders.js,productImages.js,catalog.js,quarterZipVariants.js,localProductImages.js(new),productImages.test.jsx(new),ProductArt.jsx,ProductPage.jsx,home.css,server/public-data.js,src/test-setup.js. README+10gitkeepsnew. Owner should copyJPEGs into existing slugfolder andrefresh/restartVite; backendactualstoreimages needadminStorageupload/approval separately. Fullguidance public/images/products/README.md.

## 2026-11-08 — Owner images reviewed and mapped
52 gallery references across 23 products, explicit dial-facing covers, name-based alt text and recorded actual dimensions. Nested PNG folders and filenames kept. Owner explicitly approved local JPEG conversion: added 15 JPEG copies beside Rolex HEICs, originals unchanged. Shared bracelet photos do not replace distinct dial covers. encodeURI preserves commas in static paths; escaping commas caused verified local 404s and was fixed. All 52 local image GETs returned 200/image types. Source files and complete created/changed file list: oldv/docs/product-upload-review-2026-11-08.md. README updated. No original image removed/renamed/retouched. Local visual preview runs separately from backend; publication to hosted Storage/catalogue remains separate.

## 2026-11-08 — Replacement Rolex PNGs and quarter-zip card framing
Owner replaced the seven Rolex galleries with 15 PNG files (previous HEIC/JPEG copies no longer present). Refreshed explicit paths and actual dimensions; navy cover IMG_1249_beige.png and new black-strap detail IMG_1261_beige.png included. All 52 current local image URLs returned 200/image content types. No image file created/edited/removed/renamed by agent. Quarter-zip card/carousel CSS now cover/center instead of contain, trimming only side background from square covers; detail galleries retain contain. Pending prices and closed purchasing unchanged. Local preview switched to polling after Windows EBUSY while owner replaced photos. Screenshots scripts/out/quarter-zips-framing-updated-20261108.png and rolex-replacement-photos-20261108.png. Unit/lint/client+SSR build/bundle/secret scan/diff checks passed. Backend/Storage/domain unchanged.

## 2026-11-08 — Interactive quarter-zip showcase
Replaced ColorExplorer random/default photo and illustration overlay with four-owner-photo idle CSS3D fan (10-second float), bounded desktop cursor tilt, 450ms single-colour transitions and same 4:5 panel/9% padding/contain image bounds. All images mounted eager/predecoded. Hover exit300ms, keyboard focus/Escape, tap-toggle/outside reset, active row bold/dot ring, selected-link keyboard focus preserved. Motion preference disables float/tilt/rotation and uses static grid/fade. Shared memoized catalogue array (slug,name,hex,image) drives list/count/paragraph/stack/previews; no stale beige/olive copy. Backend uses approved loaded product photos, no local override. New helper/tests and docs/quarter-zip-showcase.md; README recipe. 320 tests/lint/client+SSRbuild/bundle/secret/diff pass. Browser390/768/1440 nooverflow/equalbounds; keyboard/selectiontoggle/outside reset/productlink passed, console clean. Real touch hardware and actual OS reduced-motion toggle not tested. Product image bytes, prices, orders, stock, ordering, DB/Storage/cloud/domain unchanged. Screenshots ignored scripts/out/quarter-zip-showcase-idle-20261108.png and -single-20261108.png.

The local quarter-zip showcase now cycles a layered pair into a centred solo turn using the four owner front photos. A display-only sand matte separates the garments. Reduced motion shows a static grid.

Quarter-zip fronts now drive a canvas turntable using sampled silhouettes and estimated depth/rear knit. Side and rear views are approximate.

Burgundy has a dedicated reference-generated 64-frame studio turn. Source photos IMG_7284 front, IMG_7294 collar, IMG_7298 back. Homepage and local product gallery use burgundy-turntable.webp. The second half mirrors intermediate views.

The homepage limits the burgundy studio turn to idle. Other idle colours use layered front photos. All colour previews and product galleries use actual stills.
