#!/usr/bin/env node
'use strict';
// Self-contained catalog validator (no dependency on the node-red package) so this
// directory can live as its own repo. Checks that:
//   - index.json is well-formed and every entry points at an existing file
//   - every profile file is valid per the device-profile schema
//   - each profile's own "id" matches its index entry
// Exit non-zero on any problem (used by CI on pull requests).
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// mirror of lib/profiles.js validateProfile (kept in sync intentionally - this repo
// must validate standalone). If the schema changes, update both.
function validateProfile(p) {
    if (!p || typeof p !== 'object') return 'not an object';
    if (!p.id || typeof p.id !== 'string') return 'missing "id"';
    if (!Array.isArray(p.reads) || !p.reads.length) return 'needs a non-empty "reads" array';
    for (const r of p.reads) {
        if (!r.key) return 'a read is missing "key"';
        if (r.fc !== 3 && r.fc !== 4) return 'read "' + r.key + '": fc must be 3 or 4';
        if (!(r.address >= 0) || !(r.quantity >= 1)) return 'read "' + r.key + '": needs address and quantity';
        if (!Array.isArray(r.decode)) return 'read "' + r.key + '": missing "decode"';
    }
    if (p.commands && typeof p.commands === 'object') {
        for (const name in p.commands) {
            const c = p.commands[name];
            if (c.fc !== 6 && c.fc !== 16) return 'command "' + name + '": fc must be 6 or 16';
            if (!(c.address >= 0)) return 'command "' + name + '": needs address';
        }
    }
    return null;
}

function fail(msg) { console.error('✗ ' + msg); process.exitCode = 1; }

let index;
try { index = JSON.parse(fs.readFileSync(path.join(ROOT, 'index.json'), 'utf8')); }
catch (e) { fail('index.json: ' + e.message); process.exit(1); }

const entries = Array.isArray(index) ? index : (index.profiles || []);
if (!entries.length) fail('index.json has no profiles');

const seen = new Set();
for (const e of entries) {
    if (!e.id) { fail('an index entry is missing "id"'); continue; }
    if (seen.has(e.id)) fail('duplicate id in index: ' + e.id);
    seen.add(e.id);
    if (!e.file) { fail(e.id + ': index entry missing "file"'); continue; }
    const fp = path.join(ROOT, e.file);
    let p;
    try { p = JSON.parse(fs.readFileSync(fp, 'utf8')); }
    catch (err) { fail(e.id + ': cannot read ' + e.file + ' (' + err.message + ')'); continue; }
    const err = validateProfile(p);
    if (err) { fail(e.id + ' (' + e.file + '): ' + err); continue; }
    if (p.id !== e.id) { fail(e.id + ': profile id "' + p.id + '" does not match index entry'); continue; }
    console.log('✓ ' + e.id + '  (' + e.file + ')');
}

// warn about orphan profile files not referenced by the index
try {
    const referenced = new Set(entries.map((e) => e.file && path.basename(e.file)));
    for (const f of fs.readdirSync(path.join(ROOT, 'profiles')).filter((f) => /\.json$/i.test(f))) {
        if (!referenced.has(f)) console.warn('! profiles/' + f + ' is not listed in index.json');
    }
} catch (e) { /* no profiles dir */ }

if (process.exitCode) { console.error('\nCatalog validation FAILED'); }
else { console.log('\nCatalog OK - ' + entries.length + ' profiles'); }
