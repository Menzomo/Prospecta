// Gera um link do Google Maps com a rota já na ordem otimizada, pra abrir
// direto no app de navegação do celular. Independe de qual provider calculou
// a rota — o Google Maps é o app que praticamente todo mundo já tem instalado.

export function buildGoogleMapsRouteUrl(
  start: { lat: number; lng: number },
  orderedStops: { lat: number; lng: number }[]
): string {
  if (orderedStops.length === 0) {
    return `https://www.google.com/maps/dir/?api=1&destination=${start.lat},${start.lng}&travelmode=driving`
  }

  const destination = orderedStops[orderedStops.length - 1]
  const middleStops = orderedStops.slice(0, -1)

  const params = new URLSearchParams({
    api: '1',
    origin: `${start.lat},${start.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving',
  })

  if (middleStops.length > 0) {
    params.set('waypoints', middleStops.map((s) => `${s.lat},${s.lng}`).join('|'))
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}
