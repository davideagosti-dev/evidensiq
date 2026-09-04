#!/usr/bin/env node
/**
 * EvidensIQ release-channel resolver (EVI-REL-0.3).
 *
 * Supported git tags / package versions:
 *   vX.Y.Z              -> dist-tag latest
 *   vX.Y.Z-alpha.N      -> dist-tag alpha
 *   vX.Y.Z-beta.N       -> dist-tag beta
 *   vX.Y.Z-rc.N         -> dist-tag next
 *
 * CI-only helper. Not part of the published @evidensiq/core public API.
 */

const STABLE = /^(?:v)?([0-9]+\.[0-9]+\.[0-9]+)$/;
const ALPHA = /^(?:v)?([0-9]+\.[0-9]+\.[0-9]+-alpha\.[0-9]+)$/;
const BETA = /^(?:v)?([0-9]+\.[0-9]+\.[0-9]+-beta\.[0-9]+)$/;
const RC = /^(?:v)?([0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+)$/;

/**
 * @param {string} tagOrVersion
 * @returns {{ version: string, distTag: "latest" | "alpha" | "beta" | "next", channel: "stable" | "alpha" | "beta" | "rc" }}
 */
export function resolveReleaseChannel(tagOrVersion) {
  const raw = String(tagOrVersion ?? "").trim();
  if (!raw) {
    throw new Error("release channel input is empty");
  }

  let match = raw.match(STABLE);
  if (match) {
    return { version: match[1], distTag: "latest", channel: "stable" };
  }
  match = raw.match(ALPHA);
  if (match) {
    return { version: match[1], distTag: "alpha", channel: "alpha" };
  }
  match = raw.match(BETA);
  if (match) {
    return { version: match[1], distTag: "beta", channel: "beta" };
  }
  match = raw.match(RC);
  if (match) {
    return { version: match[1], distTag: "next", channel: "rc" };
  }

  throw new Error(
    `unsupported release tag/version '${raw}'; expected vX.Y.Z, vX.Y.Z-alpha.N, vX.Y.Z-beta.N, or vX.Y.Z-rc.N`,
  );
}

/**
 * Defense-in-depth: prerelease versions must never resolve to latest.
 * @param {{ version: string, distTag: string }} resolved
 */
export function assertPrereleaseCannotBeLatest(resolved) {
  const isPrerelease = /-(?:alpha|beta|rc)\.[0-9]+$/.test(resolved.version);
  if (isPrerelease && resolved.distTag === "latest") {
    throw new Error(
      `prerelease safety invariant violated: version '${resolved.version}' must not use dist-tag latest`,
    );
  }
  if (!isPrerelease && resolved.distTag !== "latest") {
    throw new Error(
      `stable safety invariant violated: version '${resolved.version}' must use dist-tag latest (got '${resolved.distTag}')`,
    );
  }
  if (resolved.distTag === "latest" && isPrerelease) {
    throw new Error(
      `prerelease safety invariant violated: latest is only permitted for plain X.Y.Z`,
    );
  }
}

const PASS_CASES = [
  ["v0.2.0", "0.2.0", "latest"],
  ["0.2.0", "0.2.0", "latest"],
  ["v0.2.0-alpha.1", "0.2.0-alpha.1", "alpha"],
  ["v0.2.0-beta.1", "0.2.0-beta.1", "beta"],
  ["v0.2.0-beta.3", "0.2.0-beta.3", "beta"],
  ["v0.2.0-rc.1", "0.2.0-rc.1", "next"],
  ["v0.2.0-rc.2", "0.2.0-rc.2", "next"],
  ["v1.0.0", "1.0.0", "latest"],
];

const FAIL_CASES = [
  "v0.2",
  "v0.2.0-preview.1",
  "v0.2.0-dev.1",
  "v0.2.0-alpha",
  "v0.2.0-rc",
  "release-0.2.0",
  "0.2.0+build.1",
  "v0.2.0-alpha.1+meta",
];

function runSelfTest() {
  let failures = 0;

  for (const [input, version, distTag] of PASS_CASES) {
    try {
      const resolved = resolveReleaseChannel(input);
      assertPrereleaseCannotBeLatest(resolved);
      if (resolved.version !== version || resolved.distTag !== distTag) {
        console.error(`FAIL ${input}: expected ${version}/${distTag}, got ${resolved.version}/${resolved.distTag}`);
        failures += 1;
      } else {
        console.log(`PASS ${input} -> ${resolved.distTag}`);
      }
    } catch (error) {
      console.error(`FAIL ${input}: unexpected throw: ${error.message}`);
      failures += 1;
    }
  }

  for (const input of FAIL_CASES) {
    try {
      resolveReleaseChannel(input);
      console.error(`FAIL ${input}: expected rejection`);
      failures += 1;
    } catch {
      console.log(`PASS ${input} -> REJECTED`);
    }
  }

  // Explicit invariant probe: never allow prerelease + latest even if forced.
  try {
    assertPrereleaseCannotBeLatest({ version: "0.2.0-alpha.1", distTag: "latest" });
    console.error("FAIL invariant probe: prerelease+latest was accepted");
    failures += 1;
  } catch {
    console.log("PASS invariant probe: prerelease+latest REJECTED");
  }

  if (failures > 0) {
    console.error(`release-channel self-test FAILED (${failures})`);
    process.exit(1);
  }
  console.log("release-channel self-test PASSED");
}

function main(argv) {
  const [, , command, input] = argv;
  if (command === "self-test") {
    runSelfTest();
    return;
  }
  if (command === "resolve") {
    if (!input) {
      console.error("usage: node scripts/release-channel.mjs resolve <tag-or-version>");
      process.exit(1);
    }
    const resolved = resolveReleaseChannel(input);
    assertPrereleaseCannotBeLatest(resolved);
    process.stdout.write(`${JSON.stringify(resolved)}\n`);
    return;
  }
  console.error("usage: node scripts/release-channel.mjs <resolve|self-test> [tag-or-version]");
  process.exit(1);
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("release-channel.mjs") ||
    process.argv[1].endsWith("release-channel.js"));

if (isDirectRun) {
  main(process.argv);
}
