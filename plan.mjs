// The wowlua Discord server, as data. setup.mjs makes the server match this file; run it again after a change.
// Colours come from wowlua's design tokens (amber, ink, and the syntax colours syn-*).

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
  botAvatar: "assets/avatar.png", // the mark on wowlua's background (render-images.mjs)
  botBanner: "assets/banner.png", // the README's banner
  verificationLevel: 4, // highest: a verified phone number, as on the SuuUI server
  explicitContentFilter: 2, // scan everyone's media
  defaultNotifications: 1, // mentions only
  rulesChannel: "rules",
  updatesChannel: "mod-updates",
  systemChannel: "mod-log",
  embedColor: 0xffb547, // amber
};

// Top to bottom, as they appear in the member list. The coloured roles wear wowlua's syntax colours, so the member
// list reads like highlighted code: keyword amber, decorator pink, type blue, string green.
export const roles = [
  { key: "dev", name: "Developer", color: 0xffb547, hoist: true, perms: ["ADMINISTRATOR"] }, // syn-keyword
  {
    key: "mod", name: "Moderator", color: 0xe59bd8, hoist: true, mentionable: true, // syn-decorator
    perms: ["KICK_MEMBERS", "BAN_MEMBERS", "MODERATE_MEMBERS", "MANAGE_MESSAGES", "MANAGE_THREADS", "MANAGE_NICKNAMES",
      "VIEW_AUDIT_LOG", "MUTE_MEMBERS", "DEAFEN_MEMBERS", "MOVE_MEMBERS", "MANAGE_EVENTS", "CREATE_EVENTS", "MENTION_EVERYONE"],
  },
  { key: "contributor", name: "Contributor", color: 0x74c7ec, hoist: true }, // syn-type; a merged pull request
  { key: "author", name: "Addon Author", color: 0x9bd982, hoist: true }, // syn-string; shipped an addon built with wowlua
  { key: "bots", name: "Bots", color: 0xa39b8a, hoist: true }, // ink-muted
  // The flavors members write for (wowlua-flavors' table), so helpers know which client a question is about.
  { key: "retail", name: "Retail" },
  { key: "forever", name: "WoW Forever" },
  { key: "mists", name: "MoP Classic" },
  { key: "cata", name: "Cata Classic" },
  { key: "wrath", name: "Wrath Classic" },
  { key: "tbc", name: "TBC Anniversary" },
  { key: "vanilla", name: "Classic Era" },
  { key: "pingRelease", name: "Release pings" },
  { key: "pingBreaking", name: "Breaking change pings" },
  { key: "pingEvent", name: "Event pings" },
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

// wowlua's parts, as the README and the docs name them. Discord tags are 20 characters at most, 20 per forum.
const areaTags = ["Language", "Type checker", "Builds & TOC", "Standard library", "Packages", "Publishing", "Debugging",
  "Formatter & lint", "Adopting an addon", "Editor support"];
const flavorTags = ["Retail", "WoW Forever", "MoP Classic", "Cata Classic", "Wrath Classic", "TBC Anniversary", "Classic Era"];

// type: text | announcement | forum | voice | stage. Categories keep their overwrites; channels add their own on top.
export const categories = [
  {
    name: "📢 ◆ INFORMATION ◆ 📢", overwrites: readOnly,
    channels: [
      { name: "welcome", type: "text", topic: "What wowlua is, how to start, and how this server works." },
      { name: "rules", type: "text", topic: "Read these before you post." },
      { name: "announcements", type: "announcement", topic: "News about wowlua and this server." },
      // wowlua's release workflow posts each release through this webhook and pings @Release pings
      // (.github/scripts/discord-release.mjs). A plain text channel: the Server Guide only takes those as resource pages.
      { name: "releases", type: "text", topic: `Every wowlua release, posted as it ships. The full history: ${links.changelog}`, webhook: { name: "wowlua Releases", avatar: "assets/avatar.png" } },
      { name: "faq", type: "text", topic: "Answers to the questions we hear most." },
    ],
  },
  {
    name: "💬 ◆ COMMUNITY ◆ 💬",
    channels: [
      { name: "general", type: "text", topic: "Talk about wowlua and writing addons. Questions go to <#help>, bugs to <#bug-reports>." },
      {
        name: "showcase", type: "forum", layout: "gallery", reaction: ":wowlua:",
        topic: `Addons built with wowlua. One post per addon: what it does, a screenshot, and where to get it. Shipped ones can join ${links.showcase}.`,
        tags: [...flavorTags, "Library", "Open source", "Work in progress"],
      },
      {
        name: "snippets", type: "forum", requireTag: true, reaction: "👍",
        topic: "Code worth sharing: classes, decorators, patterns, build and publish setups. One snippet per post, in a ```lua code block, with a line on what it does and the wowlua version.",
        tags: ["Language", "Types", "Standard library", "UI & widgets", "Builds & publishing", "Performance", "Testing"],
      },
      {
        name: "suggestions", type: "forum", requireTag: true, reaction: "👍",
        topic: `One idea per post. Start with the problem you have, then your idea. Check the roadmap (${links.roadmap}) and search first: if it's there, add your 👍 and your case.`,
        tags: [...areaTags, "Other"], modTags: ["Under review", "On the roadmap", "On main", "Shipped", "Not planned"],
      },
      // The one channel not about wowlua, so off-topic talk has a place outside #general and #help.
      { name: "off-topic", type: "text", topic: "Anything else. Keep the rules in mind." },
    ],
  },
  {
    name: "🆘 ◆ SUPPORT ◆ 🆘",
    channels: [
      {
        name: "help", type: "forum", requireTag: true,
        topic: "One question per post, with a tag. Paste `wowlua --version`, the command you ran and its full output as text, and the code it's about. When it's solved, add the Solved tag.",
        tags: ["Install", ...areaTags, "WoW API", "Other", "Solved"], // Solved: whoever asked sets it
      },
      {
        name: "bug-reports", type: "forum", requireTag: true,
        topic: "One bug per post. Please include:\n1. `wowlua --version` and your OS\n2. The command you ran, and its full output as text\n" +
          "3. The smallest code or project that shows it\n4. What you expected instead\n" +
          "5. For an error in game: the output of `wowlua trace`, which maps it back to your source\n\n" +
          "Confirmed bugs get a GitHub issue and a link back here.",
        tags: [...areaTags, "Crash / panic", "Wrong diagnostic", "Wrong output", "WoW API types", "Other"],
        modTags: ["Confirmed", "Fixed on main", "Can't reproduce", "Duplicate"],
      },
      { name: "known-issues", type: "text", overwrites: readOnly, topic: "Confirmed bugs that many hit, and their workarounds." },
    ],
  },
  {
    name: "💻 ◆ DEVELOPMENT ◆ 💻",
    channels: [
      { name: "contributing", type: "text", topic: `Working on wowlua itself. Behaviour changes start in the spec: ${links.spec}` },
      { name: "language-design", type: "text", topic: "Syntax, semantics, the type system and the standard library's API: how wowlua should work, and why." },
      { name: "wow-api", type: "text", topic: "The WoW API across flavors: patch changes, Blizzard's documentation and wowlua's generated declarations." },
      { name: "github-feed", type: "text", overwrites: readOnly, topic: "Commits, pull requests and issues from GitHub.", webhook: { name: "GitHub", avatar: "assets/avatar.png", github: ["push", "pull_request", "issues"] } },
    ],
  },
  {
    name: "🔊 ◆ VOICE ◆ 🔊",
    channels: [
      { name: "Lounge", type: "voice" },
      { name: "Pair programming", type: "voice" }, // screen-share and work through a problem together
      { name: "Dev stream", type: "stage", topic: "Live development and Q&A." },
      // Hidden on its own, unlike the category: never "Sync now" it.
      { name: "Very secret channel", type: "voice", overwrites: staffOnly },
    ],
  },
  {
    name: "🤫 ◆ VERY SECRET AREA ◆ 🤫", overwrites: staffOnly,
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
  ["No spam, ads or unsolicited DMs.", "No invites to other servers and no self-promotion outside #showcase without asking a moderator."],
  ["Addons, not cheats.", "No bots, automation, exploits or anything else against Blizzard's Terms of Service or its AddOn policy."],
  ["Nothing NSFW, hateful or discriminatory.", "This includes names, avatars and links."],
  ["Don't ping developers or moderators for support.", "Post in #help and someone will get to you."],
  ["Moderators have the final word.", "Breaking the rules gets a warning, then a timeout, then a ban. Serious cases skip straight to a ban."],
];

export const screening = {
  description: "wowlua's home for help, bug reports, ideas and the addons built with it. Please read and accept the rules.",
};

// Messages the bot keeps in a channel. Each entry is one message of one or more embeds; on a re-run they are edited.
export const messages = {
  welcome: [[
    {
      title: "Welcome to wowlua! 👋",
      description:
        "Hey, glad you're here! :wowlua:\n\n" +
        "wowlua is **typed Lua for World of Warcraft AddOns**: a language, a compiler, a framework and a package manager, " +
        "shipped as one binary. It checks your code against the WoW API of every flavor, builds a complete AddOn, and " +
        "publishes it to CurseForge, Wago, WoWInterface and GitHub with one command.\n\n" +
        "Every Lua file you have today is already valid wowlua, so you can start with the addon you already have. " +
        "wowlua is young and moving fast, and what you build with it and tell us shapes where it goes next.",
      fields: [
        { name: "🚀 Get started", value: `[Install it](${links.install}), then \`wowlua new MyAddon\` and \`wowlua dev\`. Already have an addon? \`wowlua init --from-pkgmeta\` brings it over. The [guide](${links.start}) walks you through it.` },
        { name: "❓ Stuck?", value: "Ask in <#help> with `wowlua --version` and the full output. No question is too small." },
        { name: "✨ Built something?", value: "Show your addon in <#showcase>, and share code worth stealing in <#snippets>." },
        { name: "🎨 Make it yours", value: "Pick the flavors you write for and your pings under **Channels & Roles**." },
        { name: "🐞 Something broken?", value: "Tell us in <#bug-reports> with `wowlua --version`, the command and its output. Every report helps." },
        { name: "🔗 Links", value: `[wowlua.dev](${links.site}) · [Docs](${links.docs}) · [GitHub](${links.github}) · [Roadmap](${links.roadmap}) · [Playground](${links.playground})` },
      ],
      footer: { text: "Typed Lua for World of Warcraft AddOns" },
    },
  ]],
  rules: [[
    {
      title: "Rules",
      description: [
        ...rules.map(([head, text], i) => `**${i + 1}. ${head}** ${text.replace(/#([a-z-]+)/g, "<#$1>")}`),
        "",
        "Something needs attention now? Use Discord's report, or ping @Moderator.",
        "Discord's [Terms of Service](https://discord.com/terms) and [Community Guidelines](https://discord.com/guidelines) apply here too.",
      ].join("\n\n"),
    },
  ]],
  faq: [[
    {
      title: "FAQ",
      fields: [
        { name: "How do I install it?", value: `macOS and Linux: \`curl -fsSL https://github.com/DomenikIrrgang/wowlua/releases/latest/download/install.sh | sh\`\nWindows (PowerShell): \`irm https://github.com/DomenikIrrgang/wowlua/releases/latest/download/install.ps1 | iex\`\nMore ways in the [install guide](${links.install}).` },
        { name: "Which game versions does it support?", value: "All of them: Retail, WoW Forever, MoP, Cata and Wrath Classic, TBC Anniversary and Classic Era. One project builds a TOC file for every flavor it lists, and the type checker knows each flavor's API." },
        { name: "Do I have to rewrite my addon?", value: `No. Every Lua file is already valid wowlua. \`wowlua init --from-pkgmeta\` adopts an existing addon and builds it like the BigWigs packager does. In plain Lua files the checker only warns; rename files to \`.wowlua\` one at a time when you want types. See [adopting an addon](${links.adopt}).` },
        { name: "Do players need anything extra?", value: "No. wowlua compiles to plain Lua 5.1 and builds a complete AddOn, with only the runtime pieces you use. Release builds carry none of the debugging tools." },
        { name: "My addon errors in game. Where is it in my code?", value: `Save the error from BugSack or the error frame and run \`wowlua trace\`: it maps the message and stack back to your source lines, also through bundled builds. In dev builds, \`/wl\` opens the dev window. More in [debugging in game](${links.debugging}).` },
        { name: "Can I use Ace3, LibStub and other libraries?", value: "Yes. git, SVN, path and archive dependencies are locked in `wowlua.lock` and embedded, only the files the game loads. `.pkgmeta` externals become dependencies on their own." },
        { name: "Which editors does it work with?", value: `\`wowlua check\`, \`wowlua lint\` and \`wowlua fmt\` work from any editor's terminal today. A language server and a VS Code extension are on the [roadmap](${links.roadmap}).` },
        { name: "Is it stable?", value: `wowlua is at 0.x: each minor version closes a milestone of the roadmap, and things can change between versions. <#releases> and the [changelog](${links.changelog}) say what changed.` },
        { name: "How can I help build it?", value: `wowlua is MIT-licensed and on [GitHub](${links.github}). Behaviour changes start in the [specification](${links.spec}); the README's [developing section](${links.developing}) gets you building. Talk it over in <#contributing>.` },
      ],
      footer: { text: "Not affiliated with Blizzard Entertainment. World of Warcraft is a trademark of Blizzard Entertainment, Inc." },
    },
  ]],
  "known-issues": [[
    { title: "Known issues", description: "Nothing listed yet. Confirmed bugs that many hit go here, with a workaround if there is one." },
  ]],
};

// Discord AutoMod. Alerts go to #mod-log; Developer and Moderator are exempt.
export const automod = {
  alertChannel: "mod-log",
  exempt: ["dev", "mod"],
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
export const onboarding = {
  // Every channel @everyone can see. Onboarding hides public channels that aren't defaults, even from admins.
  defaultChannels: "public",
  // Busy or narrow channels only some want; members get them through an answer below, or Browse Channels.
  notDefault: ["contributing", "github-feed"],
  prompts: [
    {
      title: "Which game flavors do you write addons for?", multi: true,
      options: [["Retail", "retail"], ["WoW Forever", "forever"], ["MoP Classic", "mists"], ["Cata Classic", "cata"],
        ["Wrath Classic", "wrath"], ["TBC Anniversary", "tbc"], ["Classic Era", "vanilla"]],
    },
    {
      title: "What should we ping you for?", multi: true,
      options: [
        ["New releases", "pingRelease", "📦", "A ping in #releases when a version ships"],
        ["Breaking changes", "pingBreaking", "⚠️", "Changes that need a change in your addon"],
        ["Events and streams", "pingEvent", "📅", "Dev streams, Q&As and community events"],
      ],
    },
    {
      title: "Want to help build wowlua?",
      options: [["Show me the development channels", null, "🦀", "#contributing and the GitHub feed", ["contributing", "github-feed"]]],
    },
  ],
};

export const welcomeScreen = {
  description: "The home of wowlua: typed Lua for World of Warcraft AddOns.",
  channels: [
    ["welcome", "Start here: what wowlua is and how to start", "👋"],
    ["help", "Ask a question", "❓"],
    ["bug-reports", "Report a bug", "🐞"],
    ["showcase", "Addons built with wowlua", "✨"],
    ["releases", "Every new version", "📦"],
  ],
};

// Custom emoji, used as :name: in messages. Discord can't swap an emoji's picture: delete it to upload a new one.
export const emojis = [
  { name: "wowlua", image: "assets/emoji-wowlua.png" },
];

export const github = { repo: "DomenikIrrgang/wowlua" };
export const invite = { channel: "welcome" };
