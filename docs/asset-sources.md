# Asset sources (internal)

Provenance of the photographs in `public/images/`. This file is internal; nothing here is shown on the site.

## Status

On 2026-10-17 every photograph in `public/images/` was replaced with a freely licensed photo from Unsplash (the Unsplash License allows free commercial use, no attribution required, but crediting is good practice). The previous photos had no recorded source or licence, and several showed third-party brands (Fossil, Omega) or did not match the product they were attached to.

Photographer names below were read from Unsplash search or photo pages at download time. Re-check them on the linked page before publishing credits. Files were downloaded at 1200 px wide (`w=1200&q=78`) from `images.unsplash.com`.

## These are stand-ins, not product photos

The photos show similar-looking items, not the exact products in `src/data/products.js`. Small brand names may be legible on some watch dials. The only close match is `watch-casio-a168.jpg` (a Casio F-91W/A168-style digital watch). Replace the rest with real product photography when available (see `quarterZipVariants.js` for the colour swap-in).

## Photographs

All links are `https://unsplash.com` + the path shown.

| File | Used for | Photo page | Credit |
|---|---|---|---|
| `quarter-zip-black.jpg` | "Black" quarter zip | `/photos/man-in-black-jacket-standing-near-bare-tree-during-daytime-BlWuMf0tAsQ` | Napendra Singh |
| `quarter-zip-beige.jpg` | "Beige" quarter zip, colour explorer, hero ribbon | `/photos/man-in-white-dress-shirt-standing-beside-brown-wall-n7mTIkd26h4` | kamal alkhatib |
| `quarter-zip-navy.jpg` | "Navy" quarter zip | `/photos/a-man-standing-in-front-of-a-black-door-7sjcnB8dLMU` | Benjamin Fay |
| `quarter-zip-olive.jpg` | "Olive" quarter zip | `/photos/man-in-green-hoodie-smiling-kya_DUurB00` | Emmalee Couturier |
| `quarter-zip-neutral.jpg` | Home "collar" feature, hero ribbon | `/photos/a-man-wearing-a-gray-sweater-with-a-zipper-LlTOg2mWZP4` | Laurenz Heymann |
| `quarter-zip-soft-knit.jpg` | Home "Our story" section, Our Story page, hero ribbon | `/photos/black-sweater-on-white-clothes-hanger-NA9dtyWAFV4` | Caio Coelho |
| `oldverge-hero-model.jpg` | Home "Clothes" tile, Our Story, hero ribbon | `/photos/man-in-black-long-sleeve-shirt-sitting-on-chair-BrW0YeCb-zg` | Joseph Antigua |
| `oldverge-hero-watch-detail.jpg` | Hero ribbon | `/photos/person-in-black-jacket-wearing-wristwatch-hNoSCxPWYII` | Hunters Race |
| `oldverge-watch-editorial.jpg` | Home "Watches" tile, hero ribbon | `/photos/person-wearing-silver-and-black-analog-watch-SzPmNWX_4uo` | Gilles De Muynck |
| `watch-hero-wrist.jpg` | Hero ribbon | `/photos/a-close-up-of-a-person-wearing-a-watch-3GxCtu6HTc4` | Andreas Bentele |
| `watch-casio-a168.jpg` | "Casio Vintage A168" | `/photos/a-vintage-digital-watch-on-a-dark-fabric-dUtGH-4KcV0` | Kareena |
| `watch-casio-mtp.jpg` | "Casio MTP-1302" | `/photos/silver-and-gold-round-analog-watch-bBTWoeep1vw` | Saif71.com |
| `watch-timex-weekender.jpg` | "Timex Weekender" | `/photos/a-watch-sitting-on-top-of-a-white-table-QQ_nm-OFlBs` | Tareq Hasan |
| `watch-seiko-sports.jpg` | "Seiko 5 Sports" | `/photos/a-watch-sitting-on-top-of-a-white-table-2PElXwv6IPs` | liam ward |
| `watch-citizen-eco.jpg` | "Citizen Eco-Drive" | `/photos/round-gold-colored-and-black-mvmth-chronograph-watch-with-link-bracelet-83DnGfaWV24` | Josh Miller (dial shows another brand) |
| `watch-orient-bambino.jpg` | "Orient Bambino" | `/photos/a-watch-sitting-on-top-of-a-table-n7ppaMG1z5o` | Vivek Doshi |

Descriptions of what each photo shows come from looking at the files and the Unsplash titles.

## Cut-outs (2026-10-17)

The product tiles use background-removed versions of ten of the photos above so they sit on the beige tile (`--ov-tile #E7E1D6`): `watch-*-cutout.webp` (6 watches) and `quarter-zip-{black,beige,navy,olive}-cutout.webp`, plus `quarter-zip-soft-knit-cutout.webp` for the home "Our story" section. They were made locally with `rembg` (u2net model), cropped and padded to 4:5 (960x1200). The originals `.jpg` stay in the folder (hero ribbon, colour explorer, etc.). The quarter-zip cut-outs show the person wearing the garment, and the black one is cropped at the hips. Replace them with proper product-only photos when available.

## To record when a photo is added

File name, source URL, photographer or supplier, licence name and URL, date retrieved, whether attribution is required, and exactly what the photo shows (brand and model only if legible and verified). Add the pixel size to `src/data/imageSizes.js`.
