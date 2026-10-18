// A thin-group symbol marks a reference plane, rather than a physical lens edge.
// Arrow tips distinguish positive and negative power even without color.
export function thinGroup(x, center, halfHeight, power, color = "#4d8ba7") {
  const top = center - halfHeight,
    bottom = center + halfHeight;
  const upper =
    power > 0
      ? `M${x - 5} ${top + 9}L${x} ${top}L${x + 5} ${top + 9}`
      : `M${x - 5} ${top}L${x} ${top + 9}L${x + 5} ${top}`;
  const lower =
    power > 0
      ? `M${x - 5} ${bottom - 9}L${x} ${bottom}L${x + 5} ${bottom - 9}`
      : `M${x - 5} ${bottom}L${x} ${bottom - 9}L${x + 5} ${bottom}`;
  return `<g data-thin-group="${power}"><rect x="${x - 7}" y="${top}" width="14" height="${2 * halfHeight}" rx="7" fill="${color}" fill-opacity=".09"/><path d="M${x} ${top}V${bottom}" stroke="${color}" stroke-width="1.6"${power === 0 ? ' stroke-dasharray="3 4"' : ""}/>${power === 0 ? "" : `<path d="${upper}${lower}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`}</g>`;
}

export function rayArrow(from, to, color, position = 0.64) {
  const dx = to[0] - from[0],
    dy = to[1] - from[1],
    length = Math.hypot(dx, dy);
  if (length < 20) return "";
  const x = from[0] + dx * position,
    y = from[1] + dy * position,
    u = dx / length,
    v = dy / length;
  return `<path d="M${x - 6 * u - 2.8 * v} ${y - 6 * v + 2.8 * u}L${x} ${y}L${x - 6 * u + 2.8 * v} ${y - 6 * v - 2.8 * u}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}
