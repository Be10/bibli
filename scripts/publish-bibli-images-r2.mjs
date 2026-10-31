import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import sharp from "sharp";

import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";

const CONTENT_TYPE = "image/webp";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const args = new Set(process.argv.slice(2));

const selectedModes = [
  args.has("--plan") ? "plan" : null,
  args.has("--publish") ? "publish" : null,
  args.has("--check") ? "check" : null
].filter(Boolean);

if (selectedModes.length !== 1) {
  throw new Error(
    "Usa exactamente uno: --plan, --publish o --check"
  );
}

const mode = selectedModes[0];
const repoRoot = process.cwd();

const integratedManifestPath = path.join(
  repoRoot,
  "content",
  "bibli-images-integrated.json"
);

const deliveryManifestPath = path.join(
  repoRoot,
  "content",
  "bibli-images-r2.json"
);

function assertSha256(value, label) {
  if (!/^[a-f0-9]{64}$/i.test(value ?? "")) {
    throw new Error(`SHA-256 inválido para ${label}`);
  }
}

function sha256(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

function r2KeyFromPublicPath(publicPath) {
  if (!publicPath.startsWith("/media/editorial/")) {
    throw new Error(
      `Ruta editorial inesperada: ${publicPath}`
    );
  }

  return publicPath.replace(/^\/media\//, "");
}

function localFileFromPublicPath(publicPath) {
  return path.join(
    repoRoot,
    "public",
    publicPath.replace(/^\/+/, "")
  );
}

async function buildAssetPlan() {
  const raw = await fs.readFile(
    integratedManifestPath,
    "utf8"
  );

  const manifest = JSON.parse(raw);

  if (
    !manifest.entries ||
    typeof manifest.entries !== "object"
  ) {
    throw new Error(
      "bibli-images-integrated.json no contiene entries"
    );
  }

  const tierDefinitions = [
    {
      tier: "optimized",
      pathField: "optimizedPath",
      checksumField: "optimizedChecksum",
      widthField: "optimizedWidth",
      heightField: "optimizedHeight"
    },
    {
      tier: "high",
      pathField: "highPath",
      checksumField: "highChecksum",
      widthField: "highWidth",
      heightField: "highHeight"
    }
  ];

  const assets = [];
  let integratedEntries = 0;

  const entries = Object.entries(manifest.entries)
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [slug, entry] of entries) {
    if (
      entry.sourceStatus !== "approved" ||
      entry.integrationStatus !== "integrated"
    ) {
      continue;
    }

    integratedEntries += 1;

    const visual = entry.visual;

    if (!visual) {
      throw new Error(
        `${slug}: falta visual`
      );
    }

    const version = Number(visual.version);

    if (
      !Number.isInteger(version) ||
      version < 1
    ) {
      throw new Error(
        `${slug}: visual.version inválido`
      );
    }

    const versionSegment =
      `v${String(version).padStart(3, "0")}`;

    for (const definition of tierDefinitions) {
      const publicPath =
        visual[definition.pathField];

      const expectedChecksum =
        visual[definition.checksumField];

      const expectedWidth =
        Number(visual[definition.widthField]);

      const expectedHeight =
        Number(visual[definition.heightField]);

      if (!publicPath) {
        throw new Error(
          `${slug}/${definition.tier}: falta ${definition.pathField}`
        );
      }

      if (
        !publicPath.includes(
          `/${versionSegment}/`
        )
      ) {
        throw new Error(
          `${slug}/${definition.tier}: la ruta no coincide con visual.version=${version}`
        );
      }

      assertSha256(
        expectedChecksum,
        `${slug}/${definition.tier}`
      );

      const filePath =
        localFileFromPublicPath(publicPath);

      let buffer;

      try {
        buffer = await fs.readFile(filePath);
      } catch (error) {
        throw new Error(
          `${slug}/${definition.tier}: no existe ${filePath}`,
          { cause: error }
        );
      }

      const actualChecksum = sha256(buffer);

      if (
        actualChecksum.toLowerCase() !==
        expectedChecksum.toLowerCase()
      ) {
        throw new Error(
          `${slug}/${definition.tier}: SHA-256 local no coincide con el manifiesto`
        );
      }

      const metadata =
        await sharp(buffer).metadata();

      if (metadata.format !== "webp") {
        throw new Error(
          `${slug}/${definition.tier}: formato ${metadata.format}, se esperaba webp`
        );
      }

      if (
        metadata.width !== expectedWidth ||
        metadata.height !== expectedHeight
      ) {
        throw new Error(
          `${slug}/${definition.tier}: dimensiones ${metadata.width}x${metadata.height}; se esperaba ${expectedWidth}x${expectedHeight}`
        );
      }

      assets.push({
        slug,
        group: entry.group,
        canonicalName: entry.canonicalName,
        version,
        versionSegment,
        tier: definition.tier,
        publicPath,
        filePath,
        key: r2KeyFromPublicPath(publicPath),
        sha256: actualChecksum,
        bytes: buffer.length,
        width: metadata.width,
        height: metadata.height
      });
    }
  }

  if (integratedEntries === 0) {
    throw new Error(
      "No se encontraron entradas BibliImg integradas"
    );
  }

  const duplicateKeys = new Set();
  const seenKeys = new Set();

  for (const asset of assets) {
    if (seenKeys.has(asset.key)) {
      duplicateKeys.add(asset.key);
    }

    seenKeys.add(asset.key);
  }

  if (duplicateKeys.size > 0) {
    throw new Error(
      `Keys R2 duplicadas:\n${[
        ...duplicateKeys
      ].join("\n")}`
    );
  }

  return {
    integratedEntries,
    assets
  };
}

function buildDeliveryManifest(plan) {
  const assets = plan.assets
    .map((asset) => ({
      slug: asset.slug,
      group: asset.group ?? null,
      canonicalName: asset.canonicalName ?? asset.slug,
      version: asset.version,
      tier: asset.tier,
      key: asset.key,
      sha256: asset.sha256,
      bytes: asset.bytes,
      width: asset.width,
      height: asset.height
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const summarizeTier = (tier) => {
    const selected = assets.filter(
      (asset) => asset.tier === tier
    );

    return {
      assetCount: selected.length,
      totalBytes: selected.reduce(
        (sum, asset) => sum + asset.bytes,
        0
      )
    };
  };

  const revisionSource = assets.map((asset) => ({
    slug: asset.slug,
    version: asset.version,
    tier: asset.tier,
    key: asset.key,
    sha256: asset.sha256,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height
  }));

  const revision = crypto
    .createHash("sha256")
    .update(JSON.stringify(revisionSource))
    .digest("hex")
    .slice(0, 16);

  return {
    schemaVersion: 1,
    source: "content/bibli-images-integrated.json",
    revision,
    entryCount: plan.integratedEntries,
    assetCount: assets.length,
    tiers: {
      optimized: summarizeTier("optimized"),
      high: summarizeTier("high")
    },
    assets
  };
}

async function writeDeliveryManifest(plan) {
  const manifest = buildDeliveryManifest(plan);

  await fs.writeFile(
    deliveryManifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.log(
    "Delivery manifest:",
    path.relative(repoRoot, deliveryManifestPath)
  );
  console.log(
    "Delivery revision:",
    manifest.revision
  );
}

function printPlan(plan) {
  const optimized =
    plan.assets.filter(
      (asset) => asset.tier === "optimized"
    );

  const high =
    plan.assets.filter(
      (asset) => asset.tier === "high"
    );

  const totalBytes = plan.assets.reduce(
    (sum, asset) => sum + asset.bytes,
    0
  );

  console.log("BibliImg R2 plan: PASS");
  console.log(
    "Integrated entries:",
    plan.integratedEntries
  );
  console.log(
    "Assets:",
    plan.assets.length
  );
  console.log(
    "Optimized:",
    optimized.length
  );
  console.log(
    "High:",
    high.length
  );
  console.log(
    "Total bytes:",
    totalBytes
  );
}

function requireR2Environment() {
  const required = [
    "BIBLI_R2_ENDPOINT",
    "BIBLI_R2_ACCESS_KEY_ID",
    "BIBLI_R2_SECRET_ACCESS_KEY",
    "BIBLI_R2_BUCKET"
  ];

  for (const name of required) {
    if (!process.env[name]) {
      throw new Error(
        `Falta la variable ${name}`
      );
    }
  }
}

function createR2Client() {
  requireR2Environment();

  return new S3Client({
    region: "auto",
    endpoint:
      process.env.BIBLI_R2_ENDPOINT,
    credentials: {
      accessKeyId:
        process.env.BIBLI_R2_ACCESS_KEY_ID,
      secretAccessKey:
        process.env.BIBLI_R2_SECRET_ACCESS_KEY
    }
  });
}

async function getRemoteHead(r2, asset) {
  try {
    return await r2.send(
      new HeadObjectCommand({
        Bucket:
          process.env.BIBLI_R2_BUCKET,
        Key: asset.key
      })
    );
  } catch (error) {
    if (
      error?.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }

    throw error;
  }
}

function verifyRemoteHead(asset, head) {
  if (!head) {
    throw new Error(
      `${asset.key}: no existe en R2`
    );
  }

  if (
    head.ContentType !== CONTENT_TYPE
  ) {
    throw new Error(
      `${asset.key}: Content-Type remoto inválido: ${head.ContentType}`
    );
  }

  if (
    head.CacheControl !== CACHE_CONTROL
  ) {
    throw new Error(
      `${asset.key}: Cache-Control remoto inválido: ${head.CacheControl}`
    );
  }

  if (
    Number(head.ContentLength) !==
    asset.bytes
  ) {
    throw new Error(
      `${asset.key}: tamaño remoto ${head.ContentLength}; esperado ${asset.bytes}`
    );
  }

  const remoteSha =
    head.Metadata?.sha256;

  if (
    remoteSha?.toLowerCase() !==
    asset.sha256.toLowerCase()
  ) {
    throw new Error(
      `${asset.key}: SHA-256 remoto no coincide`
    );
  }
}

async function verifyRemoteBytes(
  r2,
  asset
) {
  const response = await r2.send(
    new GetObjectCommand({
      Bucket:
        process.env.BIBLI_R2_BUCKET,
      Key: asset.key
    })
  );

  const remoteBytes = Buffer.from(
    await response.Body.transformToByteArray()
  );

  const remoteSha = sha256(remoteBytes);

  if (
    remoteSha.toLowerCase() !==
    asset.sha256.toLowerCase()
  ) {
    throw new Error(
      `${asset.key}: bytes descargados desde R2 no coinciden`
    );
  }
}

async function publish(plan) {
  const r2 = createR2Client();

  let uploaded = 0;
  let reused = 0;

  for (const asset of plan.assets) {
    const existing =
      await getRemoteHead(r2, asset);

    if (existing) {
      verifyRemoteHead(
        asset,
        existing
      );

      reused += 1;

      console.log(
        `REUSED ${asset.key}`
      );

      continue;
    }

    const body =
      await fs.readFile(asset.filePath);

    try {
      await r2.send(
        new PutObjectCommand({
          Bucket:
            process.env.BIBLI_R2_BUCKET,
          Key: asset.key,
          Body: body,
          ContentType: CONTENT_TYPE,
          CacheControl: CACHE_CONTROL,
          Metadata: {
            sha256: asset.sha256,
            slug: asset.slug,
            version: String(
              asset.version
            ),
            tier: asset.tier
          },
          IfNoneMatch: "*"
        })
      );
    } catch (error) {
      if (
        error?.$metadata
          ?.httpStatusCode !== 412
      ) {
        throw error;
      }

      const racedHead =
        await getRemoteHead(r2, asset);

      verifyRemoteHead(
        asset,
        racedHead
      );

      reused += 1;

      console.log(
        `REUSED ${asset.key}`
      );

      continue;
    }

    const head =
      await getRemoteHead(r2, asset);

    verifyRemoteHead(
      asset,
      head
    );

    await verifyRemoteBytes(
      r2,
      asset
    );

    uploaded += 1;

    console.log(
      `UPLOADED ${asset.key}`
    );
  }

  console.log("");
  console.log(
    "BibliImg R2 publish: PASS"
  );
  console.log(
    "Assets:",
    plan.assets.length
  );
  console.log(
    "Uploaded:",
    uploaded
  );
  console.log(
    "Reused:",
    reused
  );
}

async function check(plan) {
  const r2 = createR2Client();

  let checked = 0;

  for (const asset of plan.assets) {
    const head =
      await getRemoteHead(r2, asset);

    verifyRemoteHead(
      asset,
      head
    );

    checked += 1;

    console.log(
      `OK ${asset.key}`
    );
  }

  console.log("");
  console.log(
    "BibliImg R2 check: PASS"
  );
  console.log(
    "Checked:",
    checked
  );
}

const plan = await buildAssetPlan();

printPlan(plan);

if (mode === "plan") {
  await writeDeliveryManifest(plan);
}

if (mode === "publish") {
  console.log("");
  await publish(plan);
}

if (mode === "check") {
  console.log("");
  await check(plan);
}
