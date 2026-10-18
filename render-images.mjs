// Renders the server icon, the bot's avatar, its profile banner and the emoji from the wowlua design system's logos
// (https://claude.ai/artifact/XSnoJQkRAB4T9fuSZvmYRw, assets/Logos) and the README's banner. The logos' text is
// outlined; the +1 emoji is set in IBM Plex Mono, the brand's text face.
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

const bg = "#14120e"; // bg-100, the tile's ground
const ink = "#ece6d6";
const svgBody = (file) => readFileSync(file, "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<title>.*?<\/title>/, "");
const tile = svgBody("assets/wowlua-mark-tile.svg"); // 48×48: the mark on its own bg-100 square, for avatars
const mark = svgBody("assets/wowlua-mark-dark.svg"); // the same mark without the ground
const banner = svgBody("assets/wowlua-banner-dark.svg"); // 1280×360, on its own bg-100

function render(name, viewWidth, viewHeight, outWidth, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}">${body}</svg>`;
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: outWidth },
    font: { fontFiles: ["assets/fonts/IBMPlexMono-Medium.ttf"], loadSystemFonts: false, defaultFontFamily: "IBM Plex Mono" },
  }).render().asPng();
  writeFileSync(`assets/${name}.png`, png);
  console.log(`${name}.png`, png.length, "bytes");
}

// Server icon and avatar: the tile. Discord crops both to a circle, which the brand would never draw, so the mark
// sits at 70% on the tile's ground: its corners stay inside the circle and keep the clear space around them.
const centred = (size, scale) => `<g transform="translate(${(size - 48 * scale) / 2} ${(size - 48 * scale) / 2}) scale(${scale})">${mark}</g>`;
render("icon", 100, 100, 512, `<rect width="100" height="100" fill="${bg}"/>${centred(100, 1.45)}`);
render("avatar", 100, 100, 1024, `<rect width="100" height="100" fill="${bg}"/>${centred(100, 1.45)}`);

// Emoji: the tile as it is, square and flat, at Discord's 128px. Its ground keeps the light brackets readable on
// Discord's light theme too.
render("emoji-wowlua", 48, 48, 128, tile);

// +1, the vote reaction for #suggestions and #snippets: text a terminal could print, in ink on the same tile ground.
render("emoji-plus1", 48, 48, 128, `<rect width="48" height="48" fill="${bg}"/>
  <text x="24" y="32" text-anchor="middle" font-family="IBM Plex Mono" font-weight="500" font-size="23" fill="${ink}">+1</text>`);

// Profile banner (5:2): the README's banner on the same background, high enough that the avatar, which overlaps the
// banner's lower left in a profile, leaves the tagline clear.
render("banner", 1280, 512, 1280, `<rect width="1280" height="512" fill="${bg}"/><g transform="translate(0 30)">${banner}</g>`);
