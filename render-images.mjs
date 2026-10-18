// Renders the server icon, the bot's avatar, its profile banner and the emoji from wowlua's mark and banner
// (.github/assets in the wowlua repository). Their text is outlined, so no fonts are needed.
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

const bg = "#14120e"; // bg-100
const svgBody = (file) => readFileSync(file, "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<title>.*?<\/title>/, "");
const mark = svgBody("assets/wowlua-mark-dark.svg"); // 48×48: ink brackets around the amber "wl"
const banner = svgBody("assets/wowlua-banner-dark.svg"); // 1280×360, on its own bg-100

function render(name, viewWidth, viewHeight, outWidth, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}">${body}</svg>`;
  const png = new Resvg(svg, { fitTo: { mode: "width", value: outWidth }, font: { loadSystemFonts: false } }).render().asPng();
  writeFileSync(`assets/${name}.png`, png);
  console.log(`${name}.png`, png.length, "bytes");
}

// Server icon and avatar: Discord crops them to a circle, so the mark sits at 70% to keep the brackets' corners inside.
const centred = (size, scale) => `<g transform="translate(${(size - 48 * scale) / 2} ${(size - 48 * scale) / 2}) scale(${scale})">${mark}</g>`;
render("icon", 100, 100, 512, `<rect width="100" height="100" fill="${bg}"/>${centred(100, 1.45)}`);
render("avatar", 100, 100, 1024, `<rect width="100" height="100" fill="${bg}"/>${centred(100, 1.45)}`);

// Emoji: the whole mark on a dark rounded tile, so the light brackets read on light and dark themes alike.
render("emoji-wowlua", 48, 48, 128, `<rect width="48" height="48" rx="8" fill="${bg}"/>${mark}`);

// Profile banner (5:2): the README's banner on the same background, high enough that the avatar, which overlaps the
// banner's lower left in a profile, leaves the tagline clear.
render("banner", 1280, 512, 1280, `<rect width="1280" height="512" fill="${bg}"/><g transform="translate(0 30)">${banner}</g>`);
