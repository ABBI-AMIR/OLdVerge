// Application INIT, cache MISS, fresh deployment and bytecode-cache MISS are
// not substitutes for the provider's start type (Fluid may prewarm the app).
export function coldStartEvidence({providerStartType=null,providerColdDurationMs=null,applicationBoot=null}={}) {
  const value=typeof providerStartType==='string'?providerStartType.trim().toLowerCase():'';
  const startType=value==='cold'?'cold':['hot (prewarmed)','prewarmed'].includes(value)?'prewarmed':value==='hot'?'hot':'unknown';
  const duration=startType==='cold'&&typeof providerColdDurationMs==='number'&&Number.isFinite(providerColdDurationMs)&&providerColdDurationMs>=0?providerColdDurationMs:null;
  return {startType,confirmedCold:startType==='cold',coldDurationMs:duration,applicationInitialized:applicationBoot==='INIT'};
}
