import variants from './heroImageVariants.json';
// One order for the server-rendered ribbon and the interactive animation.
export const HERO_SLOTS = [
  {key:'ribbon-watch-stone',fallback:'oldverge-watch-editorial',position:'50% 50%'},
  {key:'ribbon-navy-collar',position:'50% 32%'},
  {key:'ribbon-watch-wrist',fallback:'watch-hero-wrist',position:'50% 50%'},
  {key:'ribbon-brown-knit',position:'50% 52%'},
  {key:'oldverge-hero-watch-detail',position:'50% 55%'},
  {src:'/images/ribbon-folded-burgundy.jpg',position:'50% 50%',width:1024,height:1024},
  {key:'ribbon-seiko',position:'50% 50%'},
  {key:'ribbon-black-collar',position:'50% 50%'},
  {key:'ribbon-swiss',position:'50% 50%'},
  {key:'ribbon-burgundy',position:'50% 50%'},
  {src:'/images/ribbon-four-colours.jpg',position:'50% 68%',width:1290,height:2106},
];
export const buildHeroImages = lookup => HERO_SLOTS.map(slot=>{
  const image=slot.src?slot:lookup(slot.key)||(slot.fallback&&lookup(slot.fallback));
  return image?{...image,...variants[image.src],position:slot.position}:null;
}).filter(Boolean);
