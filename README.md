# wowlua-bot

The bot behind the wowlua Discord server. The whole server lives in [`plan.mjs`](plan.mjs): roles, channels,
permissions, posts, rules, AutoMod, onboarding. [`setup.mjs`](setup.mjs) makes the server match it through the Discord
API. Change the plan, run it again, done.

It runs once and exits; it is not an always-online bot. It's the same setup as the
[SuuUI server's](https://github.com/DomenikIrrgang/suuui-bot), with wowlua's plan and images.

## The look

The server follows the [wowlua design system](https://claude.ai/artifact/XSnoJQkRAB4T9fuSZvmYRw), as far as Discord
lets it:

- **Output is the ornament.** Categories are bracketed like the site's section labels (`🟧 [ community ]`), posts show
  real commands in code blocks, and the only emoji is 🟧: Discord can't colour category names, so it stands in for
  the brand's amber block caret. The only reactions are the server's own `:wowlua:` and `:plus1:`, drawn from the brand.
- **One brand hue.** Only developer and moderator wear amber. Every other name keeps Discord's own ink, and the hoisted
  groups name each role, so no role relies on colour alone. Posts are framed in `line-strong`; release posts are amber.
- **Lowercase chrome.** Roles, forum tags, voice channels and onboarding options are lowercase like the CLI. Flavors
  are Blizzard's game types (`standard`, `mists`, `vanilla`), with "Retail" and the rest in the option's description.
- **The compiler's voice.** Short, present tense, "you"; never "we", no exclamation marks. AutoMod answers like a
  diagnostic (`error[automod]: …`).

## What it sets up

| | |
|---|---|
| **Server** | Name, icon, Community, verification and media filter, description |
| **Roles** | developer and moderator (amber), contributor, addon author; the flavors (`standard`, `camelot`, `mists`, `cata`, `wrath`, `tbc`, `vanilla`); ping roles |
| **Channels** | Six categories, each marked 🟧: `[ information ]`, `[ community ]`, `[ support ]`, `[ development ]`, `[ voice ]`, `[ very secret area ]` (staff only) |
| **Forums** | #showcase, #snippets, #suggestions, #help and #bug-reports, with tags and posting guidelines |
| **Posts** | #welcome, #rules, #faq, #known-issues; edited in place on every run |
| **Rules** | The #rules post and Discord's rules screening, from one list |
| **Onboarding** | Flavors, pings, and the development channels; the welcome screen |
| **AutoMod** | Slurs and sexual content, spam, invite links and scams, alerts to #mod-log |
| **Webhooks** | #releases, which wowlua's release workflow posts each release to with a ping for @release pings; commits, pull requests and issues to #github-feed |
| **Images** | The server icon, the bot's avatar and banner, the `:wowlua:` and `:plus1:` emoji |

## First run

1. **Server:** create an empty Discord server.
2. **Bot:** in the [Developer Portal](https://discord.com/developers/applications), create an application. Under **Bot**, click **Reset Token** and copy the token.
3. **Invite:** under **OAuth2 → URL Generator**, tick **bot** and **Administrator**, open the URL and add the bot to the server.
4. **Server ID:** turn on **User Settings → Advanced → Developer Mode**, then right-click the server and click **Copy Server ID**.
5. **Settings:** copy `.env.example` to `.env` and fill in `DISCORD_TOKEN` and `GUILD_ID`. `GITHUB_TOKEN` is only needed for the repository webhooks.
6. **Apply:** run `node setup.mjs --apply --prune`. `--prune` removes Discord's default channels.
7. **Roles:** in **Server Settings → Roles**, drag the bot's role to the top, then run `node setup.mjs --apply` again to sort the roles. A bot can't move its own role.
8. **Releases:** in the wowlua repository, add the #releases webhook's URL as the `DISCORD_RELEASES_WEBHOOK` secret and the
   release pings role's ID as the `DISCORD_RELEASE_ROLE_ID` variable (Settings → Secrets and variables → Actions).
   The bot made the webhook, so Discord won't copy its URL; the bot can read it, and `gh` stores it without showing it:

   ```sh
   node --input-type=module -e '
   import { readFileSync } from "node:fs";
   const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
   const api = (p) => fetch(`https://discord.com/api/v10${p}`, { headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` } }).then((r) => r.json());
   const channel = (await api(`/guilds/${env.GUILD_ID}/channels`)).find((c) => c.name === "releases");
   const hook = (await api(`/channels/${channel.id}/webhooks`)).find((h) => h.name === "wowlua releases");
   process.stdout.write(`https://discord.com/api/webhooks/${hook.id}/${hook.token}`);' | gh secret set DISCORD_RELEASES_WEBHOOK -R DomenikIrrgang/wowlua
   ```

## Running it

```sh
node setup.mjs                  # dry run: shows what would change, changes nothing
node setup.mjs --apply          # make the server match plan.mjs
node setup.mjs --apply --prune  # also delete channels the plan doesn't have
node setup.mjs --apply --profile  # upload the bot's avatar and banner, and the webhooks' pictures, again
node setup.mjs --apply --no-github  # leave the GitHub repository's webhooks alone
```

Needs Node 22 or newer; there are no runtime dependencies. Settings come from the environment, or from `.env` for
anything the environment doesn't set.

### In a container

```sh
docker build -t wowlua-discord-setup .
docker run --rm --env-file .env wowlua-discord-setup            # dry run
docker run --rm --env-file .env wowlua-discord-setup --apply
```

Or `docker compose run --rm discord-setup --apply`. `.env` never goes into the image.

## Changing the server

Edit [`plan.mjs`](plan.mjs) and run `node setup.mjs --apply`. Things are found by name. To rename a channel, category,
role or webhook, give it its new `name` and its old one as `was`: a channel keeps its messages, a role its members and
a webhook its URL. A change of case alone needs no `was`.

- **`:wowlua:` in text** becomes the server's emoji; `<#channel>` becomes a channel link; `@moderator` a mention.
- **Rules** live in `rules`, used by both the #rules post and rules screening (300 characters each at most).
- **contributor** and **addon author** are given by hand: contributor for a merged pull request, addon author for an
  AddOn built with wowlua that's out (a #showcase post is a good place to notice one).

## Images

`assets/` holds the tile and mark from the design system's logos, the banner from the
[wowlua repository](https://github.com/DomenikIrrgang/wowlua/tree/main/.github/assets), IBM Plex Mono for the `+1`,
and the PNGs made from them: the server icon, the bot's avatar and banner, and the emoji. After changing
[`render-images.mjs`](render-images.mjs):

```sh
npm install
npm run images
node setup.mjs --apply --profile
```

Discord can't replace an emoji's picture: delete the emoji in Server Settings, then run the setup again.

## Set by hand

Discord doesn't let bots change these, so they live in Server Settings, not in the plan.

- **Safety Setup:** verification Highest (a verified phone number), 2FA required for moderator actions, raid and DM
  spam alerts. The plan keeps the verification level at Highest.
- **Server Guide** (Server Settings → Onboarding → Server Guide), with the server owner as the welcome message's author.
  Leave every emoji empty, or pick the server's `:wowlua:`:

  > wowlua is typed Lua for World of Warcraft AddOns. Install it, try it on an AddOn you already have, and report what
  > breaks in #bug-reports.

  | New member to-do | Channel | Description | Done when |
  |---|---|---|---|
  | Read the FAQ | #faq | Installing, flavors, and the questions asked most | they open it |
  | Ask in #help | #help | One question per post, with `wowlua --version` | they open it |
  | Report a bug | #bug-reports | With the command you ran and its output | they open it |
  | Show what you built | #showcase | An AddOn made with wowlua | they open it |
  | Say what you're building | #general | Your AddOn, and the flavors it runs on | they post |

  | Resource page | Channel | Description |
  |---|---|---|
  | Get wowlua | #welcome | How to install it and start |
  | FAQ | #faq | Answers to the questions asked most |
  | Known issues | #known-issues | Confirmed bugs and their workarounds |
  | Releases | #releases | Every release as it ships |
  | Snippets | #snippets | Code worth reusing |

## Good to know

- **Rules screening** uses an endpoint Discord's own client uses but doesn't document. If it stops working, edit the
  rules under Server Settings → Safety Setup.
- **Mass-mention AutoMod:** Community servers get Discord's own "Block Mention Spam" rule. The API can only edit it
  once it has been saved in Server Settings → AutoMod; after that the plan keeps it at 8 mentions, staff exempt.
- **Profile changes** are rate-limited hard, so the avatar and banner only go up when the bot has none or with
  `--profile`.

## Licence

MIT, see [`LICENSE`](LICENSE). wowlua's logo and banner are set in Martian Mono and IBM Plex Mono (SIL Open Font
License 1.1) and converted to outlines. [IBM Plex Mono](assets/fonts) is under the SIL Open Font License, see
[`assets/fonts/OFL.txt`](assets/fonts/OFL.txt).
