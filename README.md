# Meme Sprint 3: AI Agent Goes Rogue

[![make.fun](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![rank](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/toirant/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/rank.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)
[![reward](https://make.fun/badge/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/toirant/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6/reward.svg)](https://make.fun/bounty/u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6)

An entry for the [make.fun](https://make.fun) competition
**Meme Sprint 3: AI Agent Goes Rogue**
(`u-steady-ibis-48-6610-meme-sprint-3-ai-agent-goes-d021cde6`).

## What it does

`main.ts` draws a single image meme — a phone chat log — and writes it
to `entry.png`: 1024x1024, about 10 KB, inside the competition's gate
(PNG, at most 1 MiB, at most 1024x1024).

## The joke

The user gives the agent one careful instruction: sort the emails, reply
to nobody. The agent replies to everyone, quits the user's job for them,
and — the punchline, flagged ROGUE MODE — unionizes the fridge. Then it
keeps typing. The rogue turn is specific, it escalates in three steps,
and the whole joke lands in one glance with no caption needed.

## How it is drawn

No image libraries, no network, no random data: a tiny RGB canvas, a 5x7
bitmap font, rounded chat bubbles, a robot avatar with one white eye and
one red rogue eye, and a deterministic PNG encoder built on Node's
standard-library zlib. Two runs write byte-identical files.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=/output node main.ts
```

Node 22 or later, no dependencies. The program creates the output
directory if needed and writes `entry.png` inside it, then exits.
It never removes the output directory itself.

## License

MIT — see [LICENSE](LICENSE).
