# World News · 17 November 2026

A single 1024×1024 PNG infographic summing up the world's news of
Tuesday 17 November 2026, drawn from scratch by `main.ts` (Node 22+,
standard library only, no network).

Seven verified stories — Kerch Bridge strike, Bahrain drone
interceptions, Trump–Quad meeting in Manila, EU–Rwanda return hub,
Nepal's COP31 appeal, the US losing measles-elimination status, and
US stocks sliding as Nvidia beat earnings — are pinned on a world map
with numbered callouts.

Run: `MAKEFUN_OUTPUT_DIR=<dir> node main.ts` (or set `NEWS_LAYOUT=A|B`
to pick a layout variant; default B). The program writes exactly one
file, `<dir>/entry.png`, and is deterministic: two runs produce
byte-identical output.
