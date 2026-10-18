# The wowlua Discord setup as a one-shot container: it makes the server match plan.mjs, then exits.
#
#   docker build -t wowlua-discord-setup .
#   docker run --rm --env-file .env wowlua-discord-setup            # dry run: shows what would change
#   docker run --rm --env-file .env wowlua-discord-setup --apply    # makes the changes
#
# Needs DISCORD_TOKEN and GUILD_ID; GITHUB_TOKEN (repo admin) adds the GitHub webhooks. Secrets never go in the image.

FROM node:24-alpine

WORKDIR /app

# setup.mjs has no npm dependencies: Node's own fetch talks to Discord and GitHub.
COPY plan.mjs setup.mjs ./
COPY assets/*.png assets/

USER node

ENTRYPOINT ["node", "setup.mjs"]
