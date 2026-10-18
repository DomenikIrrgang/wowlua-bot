// Makes a Discord server match plan.mjs through the Discord REST API.
//
//   node setup.mjs            show what would change, change nothing
//   node setup.mjs --apply    make the changes
//   --prune                   also delete channels the plan doesn't have (Discord's default ones)
//   --no-github               skip adding the GitHub webhooks to the repository
//   --profile                 upload the bot's avatar and banner, and the webhooks' pictures, again
//
// Settings come from the environment (DISCORD_TOKEN, GUILD_ID, and GITHUB_TOKEN for the repository webhooks), or from
// a .env file next to this file for whatever the environment doesn't set. Safe to run again: it finds what exists by name.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as plan from "./plan.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const prune = args.has("--prune");

const envFile = join(here, ".env");
const env = {
  ...(existsSync(envFile) ? Object.fromEntries(
    readFileSync(envFile, "utf8").split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  ) : {}),
  ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v)),
};
const token = env.DISCORD_TOKEN;
const guildId = env.GUILD_ID;
const githubToken = env.GITHUB_TOKEN;
if (!token || !guildId) throw new Error("Set DISCORD_TOKEN and GUILD_ID in the environment or in .env");
const withGithub = !args.has("--no-github") && !!githubToken;

const PERMS = {
  CREATE_INSTANT_INVITE: 0, KICK_MEMBERS: 1, BAN_MEMBERS: 2, ADMINISTRATOR: 3, MANAGE_CHANNELS: 4, MANAGE_GUILD: 5,
  ADD_REACTIONS: 6, VIEW_AUDIT_LOG: 7, PRIORITY_SPEAKER: 8, STREAM: 9, VIEW_CHANNEL: 10, SEND_MESSAGES: 11,
  MANAGE_MESSAGES: 13, EMBED_LINKS: 14, ATTACH_FILES: 15, READ_MESSAGE_HISTORY: 16, MENTION_EVERYONE: 17,
  USE_EXTERNAL_EMOJIS: 18, CONNECT: 20, SPEAK: 21, MUTE_MEMBERS: 22, DEAFEN_MEMBERS: 23, MOVE_MEMBERS: 24, USE_VAD: 25,
  CHANGE_NICKNAME: 26, MANAGE_NICKNAMES: 27, MANAGE_ROLES: 28, MANAGE_WEBHOOKS: 29, USE_APPLICATION_COMMANDS: 31,
  REQUEST_TO_SPEAK: 32, MANAGE_EVENTS: 33, MANAGE_THREADS: 34, CREATE_PUBLIC_THREADS: 35, CREATE_PRIVATE_THREADS: 36,
  SEND_MESSAGES_IN_THREADS: 38, MODERATE_MEMBERS: 40, CREATE_EVENTS: 44, SEND_VOICE_MESSAGES: 46, SEND_POLLS: 49,
};
const bits = (names = []) => names.reduce((acc, n) => {
  if (!(n in PERMS)) throw new Error(`Unknown permission ${n}`);
  return acc | (1n << BigInt(PERMS[n]));
}, 0n).toString();

const TYPES = { text: 0, voice: 2, category: 4, announcement: 5, stage: 13, forum: 15 };
const NEEDS_COMMUNITY = new Set(["announcement", "stage", "forum"]);

// ---- HTTP ---------------------------------------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body) {
  for (;;) {
    const res = await fetch(`https://discord.com/api/v10${path}`, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
        "X-Audit-Log-Reason": `${plan.guild.name} server setup`,
        "User-Agent": "DiscordBot (wowlua-setup, 1.0)",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 429) {
      const { retry_after = 1 } = await res.json().catch(() => ({}));
      await sleep(retry_after * 1000 + 100);
      continue;
    }
    if (res.headers.get("x-ratelimit-remaining") === "0") {
      await sleep(Number(res.headers.get("x-ratelimit-reset-after") ?? 1) * 1000);
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
    return data;
  }
}

// ---- Bookkeeping --------------------------------------------------------------------------------------------------

const log = (...a) => console.log(...a);
const warnings = [];
const warn = (msg) => { warnings.push(msg); console.log(`  ! ${msg}`); };

async function step(title, fn) {
  log(`\n▸ ${title}`);
  try { await fn(); } catch (e) { warn(`${title} failed: ${e.message}`); }
}

const roleIds = {}; // plan key → role id, plus "everyone"
const channelIds = {}; // plan name → channel id
const emojiIds = {}; // custom emoji name → id
let channels = [];

const allChannels = () => plan.categories.flatMap((c) => c.channels.map((ch) => ({ ...ch, category: c })));
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();
const findChannel = (name, type) => channels.find((c) => sameName(c.name, name) &&
  (c.type === TYPES[type] || (type === "announcement" && c.type === 0) || (type === "text" && c.type === 5)));

function overwrites(...presets) {
  const merged = {};
  for (const preset of presets.filter(Boolean)) {
    for (const [key, { allow = [], deny = [] }] of Object.entries(preset)) {
      const o = (merged[key] ??= { allow: new Set(), deny: new Set() });
      allow.forEach((p) => { o.allow.add(p); o.deny.delete(p); });
      deny.forEach((p) => { o.deny.add(p); o.allow.delete(p); });
    }
  }
  return Object.entries(merged).map(([key, o]) => ({ id: roleIds[key], type: 0, allow: bits([...o.allow]), deny: bits([...o.deny]) }));
}

const resolveMentions = (text) => text
  ?.replace(/<#([a-z0-9-]+)>/g, (m, name) => (channelIds[name] ? `<#${channelIds[name]}>` : `#${name}`))
  .replace(/@Moderator\b/g, () => (roleIds.mod ? `<@&${roleIds.mod}>` : "@Moderator"))
  .replace(/:([a-z0-9_]+):/g, (m, name) => (emojiIds[name] ? `<:${name}:${emojiIds[name]}>` : m));

// A forum's default reaction: a unicode emoji, or ":name:" for one of the server's own.
const reactionEmoji = (r) => {
  const custom = r?.match(/^:([a-z0-9_]+):$/);
  if (custom) return emojiIds[custom[1]] ? { emoji_id: emojiIds[custom[1]] } : null;
  return r ? { emoji_name: r } : null;
};

const pngDataUri = (file) => `data:image/png;base64,${readFileSync(join(here, file)).toString("base64")}`;
const iconDataUri = () => pngDataUri(plan.guild.icon);

// ---- Steps --------------------------------------------------------------------------------------------------------

const me = await api("GET", "/users/@me");
const guild = await api("GET", `/guilds/${guildId}`);
channels = await api("GET", `/guilds/${guildId}/channels`);
let roles = await api("GET", `/guilds/${guildId}/roles`);
roleIds.everyone = guildId;
let community = guild.features.includes("COMMUNITY");

log(`Bot ${me.username} on server "${guild.name}" (${guildId}) — ${apply ? "APPLYING" : "dry run, nothing changes"}`);
log(`Community: ${community ? "on" : "off (will be turned on)"}`);

if (!apply) {
  log("\nRoles:");
  for (const r of plan.roles) log(`  ${roles.some((x) => x.name === r.name) ? "keep  " : "create"} ${r.name}`);
  log("\nChannels:");
  for (const cat of plan.categories) {
    const hasCategory = (name) => channels.some((c) => c.type === 4 && sameName(c.name, name));
    log(`  ${hasCategory(cat.name) ? "keep  " : cat.was && hasCategory(cat.was) ? `rename [${cat.was}] →` : "create"} [${cat.name}]`);
    for (const ch of cat.channels) {
      const status = findChannel(ch.name, ch.type) ? "keep  " : ch.was && findChannel(ch.was, ch.type) ? `rename ${ch.was} →` : "create";
      log(`    ${status} ${ch.type === "voice" || ch.type === "stage" ? "🔊" : "#"}${ch.name} (${ch.type})`);
    }
  }
  const planned = new Set([...plan.categories.flatMap((c) => [c.name, c.was].filter(Boolean).map((n) => n.toLowerCase())),
    ...allChannels().flatMap((c) => [c.name, c.was].filter(Boolean).map((n) => n.toLowerCase()))]);
  const extra = channels.filter((c) => !planned.has(c.name.toLowerCase()));
  if (extra.length) log(`\nNot in the plan${prune ? " (deleted with --prune)" : " (kept; --prune deletes them)"}: ${extra.map((c) => c.name).join(", ")}`);
  log("\nThen: messages, AutoMod, onboarding, welcome screen, webhooks" + (withGithub ? " + GitHub repo hooks" : "") + ", invite.");
  log("\nRun again with --apply to make these changes.");
  process.exit(0);
}

await step("Server settings", async () => {
  await api("PATCH", `/guilds/${guildId}`, {
    name: plan.guild.name,
    icon: iconDataUri(),
    verification_level: plan.guild.verificationLevel,
    explicit_content_filter: plan.guild.explicitContentFilter,
    default_message_notifications: plan.guild.defaultNotifications,
  });
});

await step("Roles", async () => {
  await api("PATCH", `/guilds/${guildId}/roles/${guildId}`, { permissions: bits(plan.everyonePerms) });
  for (const r of plan.roles) {
    const body = { name: r.name, color: r.color ?? 0, hoist: !!r.hoist, mentionable: !!r.mentionable, permissions: bits(r.perms) };
    const existing = roles.find((x) => x.name === r.name);
    const role = existing ? await api("PATCH", `/guilds/${guildId}/roles/${existing.id}`, body) : await api("POST", `/guilds/${guildId}/roles`, body);
    roleIds[r.key] = role.id;
    log(`  ${existing ? "updated" : "created"} ${r.name}`);
  }
  // Bottom-up positions just above @everyone, with the bot's role and any others above them. New roles all land on
  // position 1, so the bot's role can tie with them; Discord only lets it sort roles strictly below its own.
  roles = await api("GET", `/guilds/${guildId}/roles`);
  const ours = new Set(Object.values(roleIds));
  const others = roles.filter((x) => !ours.has(x.id) && x.id !== guildId).sort((a, b) => a.position - b.position);
  const order = [...plan.roles].reverse().map((r, i) => ({ id: roleIds[r.key], position: i + 1 }));
  others.forEach((x, i) => order.push({ id: x.id, position: plan.roles.length + 1 + i }));
  try {
    await api("PATCH", `/guilds/${guildId}/roles`, order);
  } catch (e) {
    const botRole = roles.find((x) => x.tags?.bot_id === me.id);
    warn(`Couldn't sort the roles (${e.message}). Drag "${botRole?.name}" to the top in Server Settings → Roles and run again.`);
  }
});

async function ensureChannels(filter) {
  for (const cat of plan.categories) {
    const findCategory = (name) => channels.find((c) => c.type === 4 && sameName(c.name, name));
    let parent = findCategory(cat.name);
    const old = !parent && cat.was && findCategory(cat.was);
    if (old) {
      parent = Object.assign(old, await api("PATCH", `/channels/${old.id}`, { name: cat.name }));
      log(`  renamed [${cat.was}] → [${cat.name}]`);
    }
    if (!parent) {
      parent = await api("POST", `/guilds/${guildId}/channels`, { name: cat.name, type: 4, permission_overwrites: overwrites(cat.overwrites) });
      channels.push(parent);
      log(`  created [${cat.name}]`);
    }
    channelIds[cat.name] = parent.id;
    for (const ch of cat.channels.filter(filter)) {
      let c = findChannel(ch.name, ch.type);
      // A channel renamed in the plan keeps its messages: `was` names it before the rename.
      const old = !c && ch.was && findChannel(ch.was, ch.type);
      if (old) {
        c = Object.assign(old, await api("PATCH", `/channels/${old.id}`, { name: ch.name }));
        log(`  renamed ${ch.was} → ${ch.name}`);
      }
      if (!c) {
        c = await api("POST", `/guilds/${guildId}/channels`, {
          name: ch.name, type: TYPES[ch.type], parent_id: parent.id, permission_overwrites: overwrites(cat.overwrites, ch.overwrites),
        });
        channels.push(c);
        log(`  created ${ch.name}`);
      }
      channelIds[ch.name] = c.id;
    }
  }
}

// Before channels and messages, which can use the emoji as :name:.
await step("Emoji", async () => {
  const existing = await api("GET", `/guilds/${guildId}/emojis`);
  for (const e of plan.emojis) {
    const found = existing.find((x) => x.name === e.name);
    if (found) { emojiIds[e.name] = found.id; log(`  :${e.name}: already there`); continue; }
    emojiIds[e.name] = (await api("POST", `/guilds/${guildId}/emojis`, { name: e.name, image: pngDataUri(e.image), roles: [] })).id;
    log(`  :${e.name}:`);
  }
});

await step("Channels", () => ensureChannels((ch) => community || !NEEDS_COMMUNITY.has(ch.type)));

await step("Community", async () => {
  if (community) return log("  already on");
  await api("PATCH", `/guilds/${guildId}`, {
    features: [...new Set([...guild.features, "COMMUNITY"])],
    rules_channel_id: channelIds[plan.guild.rulesChannel],
    public_updates_channel_id: channelIds[plan.guild.updatesChannel],
  });
  community = true;
  log("  turned on");
  await ensureChannels((ch) => NEEDS_COMMUNITY.has(ch.type));
});

await step("Channel settings and order", async () => {
  const positions = [];
  plan.categories.forEach((cat, ci) => {
    positions.push({ id: channelIds[cat.name], position: ci });
    cat.channels.forEach((ch, i) => channelIds[ch.name] && positions.push({ id: channelIds[ch.name], position: i, parent_id: channelIds[cat.name] }));
  });
  for (const cat of plan.categories) {
    await api("PATCH", `/channels/${channelIds[cat.name]}`, { permission_overwrites: overwrites(cat.overwrites) });
    for (const ch of cat.channels) {
      const id = channelIds[ch.name];
      if (!id) continue;
      const current = channels.find((c) => c.id === id);
      const body = { permission_overwrites: overwrites(cat.overwrites, ch.overwrites) };
      if (ch.type === "announcement" && current.type === 0) body.type = 5;
      if (ch.type === "text" && current.type === 5) body.type = 0;
      if (ch.topic && ch.type !== "voice") body.topic = resolveMentions(ch.topic);
      if (ch.type === "voice") body.user_limit = ch.userLimit ?? 0; // 0: no limit
      if (ch.type === "forum") {
        const keep = Object.fromEntries((current.available_tags ?? []).map((t) => [t.name, t.id]));
        body.available_tags = [
          ...(ch.tags ?? []).map((name) => ({ name, moderated: false })),
          ...(ch.modTags ?? []).map((name) => ({ name, moderated: true })),
        ].map((t) => (keep[t.name] ? { ...t, id: keep[t.name] } : t));
        body.default_forum_layout = ch.layout === "gallery" ? 2 : 1;
        body.default_sort_order = 0;
        body.default_reaction_emoji = reactionEmoji(ch.reaction);
      }
      try {
        await api("PATCH", `/channels/${id}`, body);
        // Discord checks "require a tag" against the tags the forum has before the change, so the flag goes second.
        if (ch.type === "forum") await api("PATCH", `/channels/${id}`, { flags: ch.requireTag ? 1 << 4 : 0 });
      } catch (e) { warn(`#${ch.name}: ${e.message}`); }
    }
  }
  // Discord moves one channel to another category per call; the rest are sorted in one go.
  const fresh = await api("GET", `/guilds/${guildId}/channels`);
  for (const p of positions.filter((p) => p.parent_id && fresh.find((c) => c.id === p.id)?.parent_id !== p.parent_id)) {
    await api("PATCH", `/channels/${p.id}`, { parent_id: p.parent_id, lock_permissions: false });
  }
  await api("PATCH", `/guilds/${guildId}/channels`, positions.map(({ id, position }) => ({ id, position })));
  log(`  ${positions.length} channels set`);
});

await step("Community settings", async () => {
  await api("PATCH", `/guilds/${guildId}`, {
    description: plan.guild.description,
    rules_channel_id: channelIds[plan.guild.rulesChannel],
    public_updates_channel_id: channelIds[plan.guild.updatesChannel],
    safety_alerts_channel_id: channelIds[plan.guild.systemChannel],
    system_channel_id: channelIds[plan.guild.systemChannel],
    system_channel_flags: 0b1110, // keep join messages; hide boosts, setup tips and sticker replies
    preferred_locale: "en-US",
  });
});

// Discord rate-limits profile changes hard, so the pictures go up once, or again with --profile.
await step("Bot profile picture and banner", async () => {
  const body = {};
  if (!me.avatar || args.has("--profile")) body.avatar = pngDataUri(plan.guild.botAvatar);
  if (!me.banner || args.has("--profile")) body.banner = pngDataUri(plan.guild.botBanner);
  if (!Object.keys(body).length) return log("  already set (--profile replaces them)");
  await api("PATCH", "/users/@me", body);
  log(`  set ${Object.keys(body).join(" and ")}`);
});

await step("Bot nickname and owner role", async () => {
  await api("PATCH", `/guilds/${guildId}/members/@me`, { nick: plan.guild.botNickname });
  await api("PUT", `/guilds/${guildId}/members/${me.id}/roles/${roleIds.bots}`);
  await api("PUT", `/guilds/${guildId}/members/${guild.owner_id}/roles/${roleIds.dev}`);
  log("  owner has Developer");
});

await step("Messages", async () => {
  for (const [name, posts] of Object.entries(plan.messages)) {
    const id = channelIds[name];
    const mine = (await api("GET", `/channels/${id}/messages?limit=50`)).filter((m) => m.author.id === me.id).reverse();
    for (const [i, embeds] of posts.entries()) {
      const body = {
        embeds: embeds.map((e) => ({
          color: plan.guild.embedColor,
          ...e,
          description: resolveMentions(e.description),
          fields: e.fields?.map((f) => ({ ...f, value: resolveMentions(f.value) })),
        })),
        allowed_mentions: { parse: [] },
      };
      if (mine[i]) await api("PATCH", `/channels/${id}/messages/${mine[i].id}`, body);
      else await api("POST", `/channels/${id}/messages`, body);
    }
    log(`  #${name}`);
  }
});

await step("AutoMod", async () => {
  const existing = await api("GET", `/guilds/${guildId}/auto-moderation/rules`);
  const triggers = { keyword: 1, spam: 3, keyword_preset: 4, mention_spam: 5 };
  for (const r of plan.automod.rules) {
    const actions = [{ type: 1, metadata: { custom_message: `${plan.guild.name}'s AutoMod blocked this message.` } },
      { type: 2, metadata: { channel_id: channelIds[plan.automod.alertChannel] } }];
    if (r.timeoutSeconds) actions.push({ type: 3, metadata: { duration_seconds: r.timeoutSeconds } });
    const trigger_metadata = {};
    if (r.presets) trigger_metadata.presets = r.presets;
    if (r.keywords) trigger_metadata.keyword_filter = r.keywords;
    if (r.regex) trigger_metadata.regex_patterns = r.regex;
    if (r.mentionLimit) Object.assign(trigger_metadata, { mention_total_limit: r.mentionLimit, mention_raid_protection_enabled: !!r.raidProtection });
    const body = {
      name: r.name, event_type: 1, trigger_type: triggers[r.trigger], trigger_metadata, actions, enabled: true,
      exempt_roles: plan.automod.exempt.map((k) => roleIds[k]),
    };
    const same = existing.find((x) => x.name === r.name);
    // Discord allows one spam and one mention-spam rule per server. A Community server gets Discord's own
    // "Block Mention Spam", which the API can't edit; it stays as it is.
    const builtIn = !same && body.trigger_type !== 1 && existing.find((x) => x.trigger_type === body.trigger_type);
    if (builtIn) { log(`  ${r.name}: Discord's "${builtIn.name}" already covers it`); continue; }
    try {
      if (same) { delete body.trigger_type; delete body.event_type; await api("PATCH", `/guilds/${guildId}/auto-moderation/rules/${same.id}`, body); }
      else await api("POST", `/guilds/${guildId}/auto-moderation/rules`, body);
      log(`  ${r.name}`);
    } catch (e) { warn(`AutoMod "${r.name}": ${e.message}`); }
  }
});

// "public": every planned channel whose category and own overwrites leave @everyone able to see it.
const defaultChannelIds = () => {
  const hidden = (o) => o?.everyone?.deny?.includes("VIEW_CHANNEL");
  const names = plan.onboarding.defaultChannels === "public"
    ? allChannels().filter((ch) => !hidden(ch.category.overwrites) && !hidden(ch.overwrites)).map((ch) => ch.name)
    : plan.onboarding.defaultChannels;
  return names.filter((n) => !plan.onboarding.notDefault?.includes(n)).map((n) => channelIds[n]).filter(Boolean);
};

await step("Onboarding", async () => {
  // Onboarding objects need snowflake-shaped ids; Discord keeps them or assigns its own.
  let n = 0;
  const snowflake = () => ((BigInt(Date.now() - 1420070400000) << 22n) + BigInt(n++)).toString();
  const prompts = plan.onboarding.prompts.map((p) => ({
    id: snowflake(), type: 0, title: p.title, single_select: !p.multi, required: !!p.required, in_onboarding: true,
    options: p.options.map(([title, role, emoji, description, channels = []]) => ({
      id: snowflake(), title, description: description ?? null, emoji_name: emoji ?? null,
      role_ids: role ? [roleIds[role]] : [], channel_ids: channels.map((c) => channelIds[c]).filter(Boolean),
    })),
  }));
  await api("PUT", `/guilds/${guildId}/onboarding`, {
    prompts, default_channel_ids: defaultChannelIds(), enabled: true, mode: 0,
  });
  log(`  ${prompts.length} questions`);
});

// Rules screening isn't in Discord's public API docs; this is the endpoint Discord's own client uses.
await step("Rules screening", async () => {
  const rules = plan.rules.map(([head, text]) => `${head} ${text}`);
  const tooLong = rules.find((r) => r.length > 300);
  if (tooLong) throw new Error(`a rule is over 300 characters: "${tooLong}"`);
  await api("PATCH", `/guilds/${guildId}/member-verification`, {
    enabled: true,
    description: plan.screening.description,
    form_fields: [{ field_type: "TERMS", label: "Read and agree to the server rules", values: rules, required: true }],
  });
  log(`  ${rules.length} rules`);
});

await step("Welcome screen", async () => {
  await api("PATCH", `/guilds/${guildId}/welcome-screen`, {
    enabled: true,
    description: plan.welcomeScreen.description,
    welcome_channels: plan.welcomeScreen.channels.map(([c, description, emoji]) => ({ channel_id: channelIds[c], description, emoji_name: emoji })),
  });
});

await step("Webhooks", async () => {
  for (const ch of allChannels().filter((c) => c.webhook)) {
    const id = channelIds[ch.name];
    const avatar = ch.webhook.avatar ? pngDataUri(ch.webhook.avatar) : iconDataUri();
    const hooks = await api("GET", `/channels/${id}/webhooks`);
    let hook = hooks.find((h) => h.name === ch.webhook.name);
    if (!hook) hook = await api("POST", `/channels/${id}/webhooks`, { name: ch.webhook.name, avatar });
    else if (args.has("--profile")) await api("PATCH", `/webhooks/${hook.id}`, { avatar });
    log(`  #${ch.name}: ${ch.webhook.name}${args.has("--profile") ? " (picture uploaded)" : ""}`);
    if (!ch.webhook.github) continue;
    if (!withGithub) { log(`    GitHub hook skipped${githubToken ? "" : " (no GITHUB_TOKEN)"}`); continue; }
    // GitHub's own webhook format, which Discord reads at the /github endpoint.
    const url = `https://discord.com/api/webhooks/${hook.id}/${hook.token}/github`;
    try {
      const repoHooks = await githubApi("GET", `/repos/${plan.github.repo}/hooks`);
      if (repoHooks.some((h) => h.config?.url === url)) { log("    GitHub hook already there"); continue; }
      await githubApi("POST", `/repos/${plan.github.repo}/hooks`, {
        name: "web", active: true, events: ch.webhook.github, config: { url, content_type: "json" },
      });
      log(`    GitHub ${plan.github.repo}: ${ch.webhook.github.join(", ")}`);
    } catch (e) {
      warn(`GitHub hook for #${ch.name}: ${e.message}`);
    }
  }
});

async function githubApi(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "wowlua-discord-setup",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data?.message ?? ""}`);
  return data;
}

if (prune) {
  await step("Prune", async () => {
    const keep = new Set(Object.values(channelIds));
    for (const c of channels.filter((c) => !keep.has(c.id))) {
      await api("DELETE", `/channels/${c.id}`);
      log(`  deleted ${c.name}`);
    }
  });
}

await step("Invite", async () => {
  const id = channelIds[plan.invite.channel];
  const invites = await api("GET", `/channels/${id}/invites`);
  const inv = invites.find((i) => i.max_age === 0 && i.max_uses === 0) ?? await api("POST", `/channels/${id}/invites`, { max_age: 0, max_uses: 0, unique: false });
  log(`  https://discord.gg/${inv.code}`);
});

log(warnings.length ? `\nDone, with ${warnings.length} warning(s):\n${warnings.map((w) => `  - ${w}`).join("\n")}` : "\nDone.");
