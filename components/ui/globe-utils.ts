// Shared globe math utilities derived from the COBE mapping.
// Center lat/lon from current phi/theta.
// m = [-sin(phi)*cos(theta), sin(theta), cos(phi)*cos(theta)]
// Then convert m -> [lat, lon] using COBE's marker convention:
// lat = asin(m.y), lon = atan2(-m.z, m.x)  (degrees)
export function centerLatLon(phi: number, theta: number): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const sf = Math.sin(phi);
  const cf = Math.cos(phi);

  const mx = -sf * c;
  const my = s;
  const mz = cf * c;

  const lat = Math.asin(my) * (180 / Math.PI);
  const lon = Math.atan2(-mz, mx) * (180 / Math.PI);
  return [lat, lon];
}
