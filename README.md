# AXL device-profile catalog

A **catalog** is a static, hostable collection of Modbus-RTU device profiles for the
`axl-device` node. It is just an `index.json` plus a `profiles/` directory of profile
files — serve it from any HTTP(S) location (a raw GitHub URL, a web server, an intranet
share). Nothing device-specific is bundled in the npm package; users fetch profiles from
a catalog like this one and install them into their own profile store
(`<userDir>/axl-device-profiles`).

## Layout

```
index.json            # the catalog index (metadata + file pointers)
profiles/<id>.json    # one device profile per file (the schema the axl-device node loads)
```

## `index.json`

```json
{
  "version": 1,
  "updated": "2026-09-18",
  "profiles": [
    { "id": "XY-MD02", "name": "XY-MD02 temperature / humidity",
      "vendor": "generic", "description": "SHT20-based sensor",
      "file": "profiles/XY-MD02.json" }
  ]
}
```

`file` may be relative (resolved against the index URL) or an absolute http(s) URL.

## Profile files

Each profile follows the device-profile schema (see
`packages/node-red-contrib-axl-bk-eth/schema/device-profile.schema.json`): a declarative
set of Modbus `reads` with `decode` specs, and optional `commands`. Profiles are
validated on install and on load, so a malformed file is skipped, never crashes the node.

## Using it

In the Node-RED editor **AXL** sidebar → *Device profiles*: paste the catalog `index.json`
URL, press **Fetch**, then **install** the profiles you need. Installed profiles appear in
the `axl-device` node's profile dropdown. You can also **edit** a profile in place or
create a **new** one from a template.

## Hosting your own

Copy this directory to its own repo (e.g. `axl-device-profiles`), push, and point the
sidebar at the raw `index.json` URL. Community contributions = a PR adding a
`profiles/<id>.json` and an `index.json` entry.

## Seeded profiles

These ship as examples/seeds (register maps contributed from real deployments — verify
against your firmware revision before trusting them):

- `entes-energy-meter` — Entes three-phase energy meter
- `calio-v2` / `calio-v3` / `calio-v4` — KSB Calio smart pump (register map varies by firmware)
- `XY-MD02` — SHT20 temperature/humidity sensor
