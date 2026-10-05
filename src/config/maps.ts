const configuredKey = typeof __CARTO_BASEMAP_API_KEY__ === 'string' ? __CARTO_BASEMAP_API_KEY__ : '';

export function cartoTileUrl(key = configuredKey) {
  const url = 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png';
  return key.trim() ? `${url}?key=${encodeURIComponent(key.trim())}` : url;
}
