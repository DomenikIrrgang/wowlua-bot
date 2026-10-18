// The wowlua Discord server, as data. setup.mjs makes the server match this file; run it again after a change.
// It follows the wowlua design system (https://claude.ai/artifact/XSnoJQkRAB4T9fuSZvmYRw):
// - output is the ornament: [ brackets ], $ prompts and code blocks, never emoji;
// - one brand hue: amber marks the people and things to act on, everything else is neutral;
// - UI chrome (roles, tags, voice channels, options) is lowercase like the CLI; headings use sentence case;
// - the compiler's voice: short, present tense, "you", never "I" or "we", no exclamation marks;
// - flavors are Blizzard's game types (standard, mists, vanilla), with "Retail" only next to standard.

const links = {
  site: "https://wowlua.dev",
  docs: "https://wowlua.dev/docs",
  install: "https://wowlua.dev/docs/install",
  start: "https://wowlua.dev/docs/getting-started",
  adopt: "https://wowlua.dev/docs/adopting-an-addon",
  debugging: "https://wowlua.dev/docs/debugging-in-game",
  roadmap: "https://wowlua.dev/roadmap",
  changelog: "https://wowlua.dev/changelog",
  playground: "https://wowlua.dev/playground",
  showcase: "https://wowlua.dev/showcase",
  github: "https://github.com/DomenikIrrgang/wowlua",
  issues: "https://github.com/DomenikIrrgang/wowlua/issues",
  spec: "https://github.com/DomenikIrrgang/wowlua/tree/main/spec",
  developing: "https://github.com/DomenikIrrgang/wowlua#developing",
};

export const guild = {
  name: "wowlua",
  description: "Home of wowlua: typed Lua for WoW AddOns. A language, compiler, framework and package manager in one binary.",
  icon: "assets/icon.png",
  botNickname: "wowlua",
  botAvatar: "assets/avatar.png", // the mark tile (render-images.mjs)
  botBanner: "assets/banner.png", // the README's banner
  verificationLevel: 4, // highest: a verified phone number, as on the SuuUI server
  explicitContentFilter: 2, // scan everyone's media
  defaultNotifications: 1, // mentions only
  rulesChannel: "rules",
  updatesChannel: "mod-updates",
  systemChannel: "mod-log",
  embedColor: 0x6e6554, // line-strong: posts are framed like code blocks; amber is kept for releases
};

const amber = 0xffb547;

// Top to bottom, as they appear in the member list. Only staff wear amber, the one brand hue; every other name keeps
// Discord's own ink, which suits both themes. The hoisted groups name each role, so no role relies on colour alone.
export const roles = [
  { key: "dev", name: "developer", was: "Developer", color: amber, hoist: true, perms: ["ADMINISTRATOR"] },
  {
    key: "mod", name: "moderator", was: "Moderator", color: amber, hoist: true, mentionable: true,
    perms: ["KICK_MEMBERS", "BAN_MEMBERS", "MODERATE_MEMBERS", "MANAGE_MESSAGES", "MANAGE_THREADS", "MANAGE_NICKNAMES",
      "VIEW_AUDIT_LOG", "MUTE_MEMBERS", "DEAFEN_MEMBERS", "MOVE_MEMBERS", "MANAGE_EVENTS", "CREATE_EVENTS", "MENTION_EVERYONE"],
  },
  { key: "contributor", name: "contributor", was: "Contributor", hoist: true }, // a merged pull request
  { key: "author", name: "addon author", was: "Addon Author", hoist: true }, // shipped an AddOn built with wowlua
  { key: "bots", name: "bots", was: "Bots", hoist: true },
  // The game types members write for (wowlua-flavors' table), so helpers know which client a question is about.
  { key: "retail", name: "standard", was: "Retail" },
  { key: "forever", name: "camelot", was: "WoW Forever" },
  { key: "mists", name: "mists", was: "MoP Classic" },
  { key: "cata", name: "cata", was: "Cata Classic" },
  { key: "wrath", name: "wrath", was: "Wrath Classic" },
  { key: "tbc", name: "tbc", was: "TBC Anniversary" },
  { key: "vanilla", name: "vanilla", was: "Classic Era" },
  { key: "pingRelease", name: "release pings", was: "Release pings" },
  { key: "pingBreaking", name: "breaking change pings", was: "Breaking change pings" },
  { key: "pingEvent", name: "event pings", was: "Event pings" },
];

// What every member can do. Everything else comes from roles and channel overwrites.
export const everyonePerms = [
  "VIEW_CHANNEL", "SEND_MESSAGES", "SEND_MESSAGES_IN_THREADS", "CREATE_PUBLIC_THREADS", "READ_MESSAGE_HISTORY",
  "ADD_REACTIONS", "EMBED_LINKS", "ATTACH_FILES", "USE_EXTERNAL_EMOJIS", "CHANGE_NICKNAME", "USE_APPLICATION_COMMANDS",
  "CONNECT", "SPEAK", "STREAM", "USE_VAD", "REQUEST_TO_SPEAK", "SEND_VOICE_MESSAGES", "SEND_POLLS", "CREATE_INSTANT_INVITE",
];

// Overwrite presets. "everyone" is @everyone; other keys are role keys above.
const readOnly = {
  everyone: { deny: ["SEND_MESSAGES", "CREATE_PUBLIC_THREADS", "CREATE_PRIVATE_THREADS", "SEND_MESSAGES_IN_THREADS"] },
  mod: { allow: ["SEND_MESSAGES"] },
};
const staffOnly = { everyone: { deny: ["VIEW_CHANNEL"] }, mod: { allow: ["VIEW_CHANNEL"] } };

// wowlua's parts, in the spec's terms. Tags are badges, so lowercase; 20 characters at most, 20 per forum.
const areaTags = ["language", "type checker", "builds & toc", "standard library", "packages", "publishing", "debugging",
  "fmt & lint", "adopting an addon", "editor support"];
const flavorTags = ["standard", "camelot", "mists", "cata", "wrath", "tbc", "vanilla"];

// type: text | announcement | forum | voice | stage. Categories keep their overwrites; channels add their own on top.
// Discord shows category names in capitals; the brackets are the site's section labels ("[ community ]").
export const categories = [
  {
    name: "[ information ]", was: "📢 ◆ INFORMATION ◆ 📢", overwrites: readOnly,
    channels: [
      { name: "welcome", type: "text", topic: "What wowlua is, how to start, and how this server works." },
      { name: "rules", type: "text", topic: "Read these before you post." },
      { name: "announcements", type: "announcement", topic: "News about wowlua and this server." },
      // wowlua's release workflow posts each release through this webhook and pings @release pings
      // (.github/scripts/discord-release.mjs). A plain text channel: the Server Guide only takes those as resource pages.
      { name: "releases", type: "text", topic: `Every wowlua release, posted as it ships. The full history: ${links.changelog}`, webhook: { name: "wowlua releases", was: "wowlua Releases", avatar: "assets/avatar.png" } },
      { name: "faq", type: "text", topic: "Answers to the questions asked most." },
    ],
  },
  {
    name: "[ community ]", was: "💬 ◆ COMMUNITY ◆ 💬",
    channels: [
      { name: "general", type: "text", topic: "Talk about wowlua and writing AddOns. Questions go to <#help>, bugs to <#bug-reports>." },
      {
        name: "showcase", type: "forum", layout: "gallery", reaction: ":wowlua:",
        topic: `AddOns built with wowlua. One post per AddOn: what it does, a screenshot, and where to get it. Shipped ones can join ${links.showcase}.`,
        tags: [...flavorTags, "library", "open source", "work in progress"],
      },
      {
        name: "snippets", type: "forum", requireTag: true, reaction: ":plus1:",
        topic: "Code worth reusing: classes, decorators, patterns, build and publish setups. One snippet per post, in a ```lua code block, with a line on what it does and the wowlua version.",
        tags: ["language", "types", "standard library", "ui & widgets", "builds & publishing", "performance", "testing"],
      },
      {
        name: "suggestions", type: "forum", requireTag: true, reaction: ":plus1:",
        topic: `One idea per post. Start with the problem you have, then your idea. Check the roadmap (${links.roadmap}) and search first: if the idea is there, add a +1 and your case.`,
        tags: [...areaTags, "other"], modTags: ["under review", "on the roadmap", "on main", "shipped", "not planned"],
      },
      // The one channel not about wowlua, so off-topic talk has a place outside #general and #help.
      { name: "off-topic", type: "text", topic: "Anything else. Keep the rules in mind." },
    ],
  },
  {
    name: "[ support ]", was: "🆘 ◆ SUPPORT ◆ 🆘",
    channels: [
      {
        name: "help", type: "forum", requireTag: true,
        topic: "One question per post, with a tag. Paste `wowlua --version`, the command you ran and its full output as text, and the code it's about. When it's solved, add the solved tag.",
        tags: ["install", ...areaTags, "wow api", "other", "solved"], // solved: whoever asked sets it
      },
      {
        name: "bug-reports", type: "forum", requireTag: true,
        topic: "One bug per post. Include:\n1. `wowlua --version` and your OS\n2. The command you ran, and its full output as text\n" +
          "3. The smallest code or project that shows it\n4. What you expected instead\n" +
          "5. For an error in game: the output of `wowlua trace`, which maps it back to your source\n\n" +
          "A confirmed bug gets a GitHub issue and a link back here.",
        tags: [...areaTags, "crash / panic", "wrong diagnostic", "wrong output", "wow api types", "other"],
        modTags: ["confirmed", "fixed on main", "can't reproduce", "duplicate"],
      },
      { name: "known-issues", type: "text", overwrites: readOnly, topic: "Confirmed bugs that many people hit, and their workarounds." },
    ],
  },
  {
    name: "[ development ]", was: "💻 ◆ DEVELOPMENT ◆ 💻",
    channels: [
      { name: "contributing", type: "text", topic: `Working on wowlua itself. Behaviour changes start in the spec: ${links.spec}` },
      { name: "language-design", type: "text", topic: "Syntax, semantics, the type system and the standard library's API: how wowlua should work, and why." },
      { name: "wow-api", type: "text", topic: "The WoW API across flavors: patch changes, Blizzard's documentation and wowlua's generated declarations." },
      { name: "github-feed", type: "text", overwrites: readOnly, topic: "Commits, pull requests and issues from GitHub.", webhook: { name: "GitHub", avatar: "assets/avatar.png", github: ["push", "pull_request", "issues"] } },
    ],
  },
  {
    name: "[ voice ]", was: "🔊 ◆ VOICE ◆ 🔊",
    channels: [
      { name: "lounge", type: "voice" },
      { name: "pair programming", type: "voice" }, // screen-share and work through a problem together
      { name: "dev stream", type: "stage", topic: "Live development and Q&A." },
      // Hidden on its own, unlike the category: never "Sync now" it.
      { name: "very secret channel", type: "voice", overwrites: staffOnly },
    ],
  },
  {
    name: "[ very secret area ]", was: "🤫 ◆ VERY SECRET AREA ◆ 🤫", overwrites: staffOnly,
    channels: [
      { name: "mod-chat", type: "text", topic: "Moderators and developers." },
      { name: "mod-log", type: "text", topic: "AutoMod alerts, joins and Discord safety alerts." },
      { name: "mod-updates", type: "text", topic: "Updates from Discord for community servers." },
    ],
  },
];

// The server rules: the #rules post and Discord's rules screening, which members accept before they can post.
// Each is [headline, sentence]; screening shows them as plain text, at most 300 characters each.
export const rules = [
  ["Be kind.", "Critique the code, never the person. No insults, harassment or drama."],
  ["Use the right channel.", "Questions go in #help, bugs in #bug-reports, ideas in #suggestions. One topic per post, and search first."],
  ["Code and output as text.", "Paste them in a code block, not a screenshot, so others can copy and run them."],
  ["English in public channels,", "so everyone can follow and help."],
  ["No spam, ads or unsolicited DMs.", "No invites to other servers, and no self-promotion outside #showcase without asking a moderator."],
  ["AddOns, not cheats.", "No bots, automation, exploits or anything else against Blizzard's Terms of Service or its AddOn policy."],
  ["Nothing NSFW, hateful or discriminatory.", "This includes names, avatars and links."],
  ["Don't ping developers or moderators for support.", "Post in #help and someone will get to you."],
  ["Moderators have the final word.", "Breaking the rules gets a warning, then a timeout, then a ban. Serious cases go straight to a ban."],
];

export const screening = {
  description: "wowlua's home for help, bug reports, ideas and the AddOns built with it. Read and accept the rules to post.",
};

// Messages the bot keeps in a channel. Each entry is one message of one or more embeds; on a re-run they are edited.
// Links are lowercase like the site's footer, external ones end in ↗.
export const messages = {
  welcome: [[
    {
      title: "Welcome to wowlua",
      description:
        "Typed Lua for World of Warcraft AddOns. One binary type-checks your code, builds a complete AddOn for every " +
        "game flavor and publishes it to CurseForge, Wago, WoWInterface and GitHub.\n\n" +
        "Every Lua file you have today is already valid wowlua, so you can start with the AddOn you already have.\n" +
        "```sh\n$ wowlua new MyAddon && cd MyAddon\n$ wowlua dev               # watch, build and sync into your AddOns folders\n```",
      fields: [
        { name: "Start", value: `[Install wowlua ↗](${links.install}) and follow [getting started ↗](${links.start}). Bringing an AddOn you have? Run \`wowlua init --from-pkgmeta\`.` },
        { name: "Ask", value: "Questions go in <#help>, one per post, with `wowlua --version` and the full output." },
        { name: "Report", value: "Bugs go in <#bug-reports>. For an error in game, run `wowlua trace` first: it maps the stack back to your source." },
        { name: "Share", value: "Show your AddOn in <#showcase>, and post code worth reusing in <#snippets>." },
        { name: "Roles", value: "Pick the flavors you write for and your pings under **Channels & Roles**." },
        { name: "Links", value: `[wowlua.dev ↗](${links.site}) · [docs ↗](${links.docs}) · [github ↗](${links.github}) · [roadmap ↗](${links.roadmap}) · [playground ↗](${links.playground})` },
      ],
      footer: { text: "[wl] Typed Lua for World of Warcraft AddOns." },
    },
  ]],
  rules: [[
    {
      title: "Rules",
      description: [
        ...rules.map(([head, text], i) => `**${i + 1}. ${head}** ${text.replace(/#([a-z-]+)/g, "<#$1>")}`),
        "",
        "Something needs attention now? Use Discord's report, or ping @moderator.",
        "Discord's [terms of service ↗](https://discord.com/terms) and [community guidelines ↗](https://discord.com/guidelines) apply here too.",
      ].join("\n\n"),
    },
  ]],
  faq: [[
    {
      title: "FAQ",
      fields: [
        { name: "How do I install it?", value: "macOS and Linux:\n```sh\n$ curl -fsSL https://github.com/DomenikIrrgang/wowlua/releases/latest/download/install.sh | sh\n```\nWindows (PowerShell):\n```powershell\n> irm https://github.com/DomenikIrrgang/wowlua/releases/latest/download/install.ps1 | iex\n```\n" + `Run the installer again to update. More in the [install guide ↗](${links.install}).` },
        { name: "Which game flavors does it support?", value: "All of them: `standard` (Retail), `camelot` (WoW: Forever), `mists`, `cata`, `wrath`, `tbc` and `vanilla`. One project builds a TOC file for every flavor it lists, and the type checker knows each flavor's API." },
        { name: "Do I have to rewrite my AddOn?", value: `No. Every Lua file is already valid wowlua. \`wowlua init --from-pkgmeta\` adopts an existing AddOn and builds it the way the BigWigs packager does. In plain Lua files the checker only warns; rename files to \`.wowlua\` one at a time when you want types. More in [adopting an addon ↗](${links.adopt}).` },
        { name: "Do players need anything extra?", value: "No. wowlua compiles to plain Lua 5.1 and builds a complete AddOn with only the runtime pieces you use. Release builds carry none of the debugging tools." },
        { name: "My AddOn errors in game. Where is that in my code?", value: `Save the error from BugSack or the error frame and run \`wowlua trace\`: it maps the message and stack back to your source lines, also through bundled builds. In dev builds, \`/wl\` opens the dev window. More in [debugging in game ↗](${links.debugging}).` },
        { name: "Can I use Ace3, LibStub and other libraries?", value: "Yes. git, SVN, path and archive dependencies are locked in `wowlua.lock` and embedded, only the files the game loads. `.pkgmeta` externals become dependencies when you adopt an AddOn." },
        { name: "Which editors does it work with?", value: `\`wowlua check\`, \`wowlua lint\` and \`wowlua fmt\` run from any editor's terminal today. A language server and a VS Code extension are on the [roadmap ↗](${links.roadmap}).` },
        { name: "Is it stable?", value: `wowlua is at 0.x: each minor version closes a milestone of the roadmap, and things can change between versions. <#releases> and the [changelog ↗](${links.changelog}) say what changed.` },
        { name: "How do I work on wowlua itself?", value: `wowlua is MIT-licensed and on [github ↗](${links.github}). Behaviour changes start in the [specification ↗](${links.spec}); the README's [developing ↗](${links.developing}) section gets you building. Talk it over in <#contributing>.` },
      ],
      footer: { text: "Not affiliated with Blizzard Entertainment. World of Warcraft is a trademark of Blizzard Entertainment, Inc." },
    },
  ]],
  "known-issues": [[
    { title: "Known issues", description: "None listed. A confirmed bug that many people hit is listed here, with its workaround." },
  ]],
};

// Discord AutoMod. Alerts go to #mod-log; developer and moderator are exempt.
export const automod = {
  alertChannel: "mod-log",
  exempt: ["dev", "mod"],
  message: "error[automod]: this message breaks a server rule and was not posted. Read #rules, then post it again without it.",
  rules: [
    { name: "Slurs and sexual content", trigger: "keyword_preset", presets: [2, 3] },
    { name: "Spam", trigger: "spam" },
    // Discord made this one with Community; saved once in Server Settings, the API can edit it.
    { name: "Block Mention Spam", trigger: "mention_spam", mentionLimit: 8, raidProtection: true },
    {
      name: "Invites and scams", trigger: "keyword", timeoutSeconds: 60,
      regex: ["discord(?:\\.gg|app\\.com/invite|\\.com/invite)/\\S+"],
      keywords: ["*free nitro*", "*nitro for free*", "*steam gift*", "*steamcommunity.com/gift*"],
    },
  ],
};

// Discord's onboarding: the default channels new members see, and the questions that hand out roles.
// Options are lowercase like buttons; the descriptions say what each one is in plain words.
export const onboarding = {
  // Every channel @everyone can see. Onboarding hides public channels that aren't defaults, even from admins.
  defaultChannels: "public",
  // Busy or narrow channels only some want; members get them through an answer below, or Browse Channels.
  notDefault: ["contributing", "github-feed"],
  prompts: [
    {
      title: "Which game flavors do you write AddOns for?", multi: true,
      options: [
        ["standard", "retail", null, "Retail"],
        ["camelot", "forever", null, "WoW: Forever"],
        ["mists", "mists", null, "Mists of Pandaria Classic"],
        ["cata", "cata", null, "Cataclysm Classic"],
        ["wrath", "wrath", null, "Wrath of the Lich King Classic"],
        ["tbc", "tbc", null, "The Burning Crusade Anniversary"],
        ["vanilla", "vanilla", null, "Classic Era"],
      ],
    },
    {
      title: "What should pings tell you about?", multi: true,
      options: [
        ["new releases", "pingRelease", null, "A ping in #releases when a version ships"],
        ["breaking changes", "pingBreaking", null, "Changes that need a change in your AddOn"],
        ["events and streams", "pingEvent", null, "Dev streams, Q&As and community events"],
      ],
    },
    {
      title: "Want to work on wowlua itself?",
      options: [["show the development channels", null, null, "#contributing and the GitHub feed", ["contributing", "github-feed"]]],
    },
  ],
};

export const welcomeScreen = {
  description: "The home of wowlua: typed Lua for World of Warcraft AddOns.",
  channels: [
    ["welcome", "Start here: what wowlua is and how to start"],
    ["help", "Ask a question"],
    ["bug-reports", "Report a bug"],
    ["showcase", "AddOns built with wowlua"],
    ["releases", "Every new version"],
  ],
};

// Custom emoji, used as :name: in messages. Discord can't swap an emoji's picture: delete it to upload a new one.
// Both are drawn from the brand (render-images.mjs), so reactions stay inside it: the mark, and +1 for votes.
export const emojis = [
  { name: "wowlua", image: "assets/emoji-wowlua.png" },
  { name: "plus1", image: "assets/emoji-plus1.png" },
];

export const github = { repo: "DomenikIrrgang/wowlua" };
export const invite = { channel: "welcome" };
