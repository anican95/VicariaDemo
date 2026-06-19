import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "src", "RepositorioImagenes");
const publicImageDir = path.join(rootDir, "public", "RepositorioImagenes");
const modelDir = path.join(rootDir, "public", "modelos");

const imageFiles = fs
  .readdirSync(sourceDir)
  .filter((file) => /\.(png|jpe?g)$/i.test(file))
  .sort((a, b) => a.localeCompare(b, "es"));

if (imageFiles.length !== 3) {
  throw new Error(`Se esperaban 3 imágenes en ${sourceDir}, pero se encontraron ${imageFiles.length}.`);
}

fs.mkdirSync(publicImageDir, { recursive: true });
fs.mkdirSync(modelDir, { recursive: true });
cleanDirectory(publicImageDir);
cleanDirectory(modelDir);
fs.mkdirSync(publicImageDir, { recursive: true });
fs.mkdirSync(modelDir, { recursive: true });

for (const fileName of imageFiles) {
  const sourcePath = path.join(sourceDir, fileName);
  const imageBuffer = fs.readFileSync(sourcePath);
  const { width, height, mimeType } = getImageMetadata(fileName, imageBuffer);
  const aspect = width / height;
  const stem = path.parse(fileName).name;
  const glbPath = path.join(modelDir, `${stem}.glb`);
  const usdzPath = path.join(modelDir, `${stem}.usdz`);

  fs.copyFileSync(sourcePath, path.join(publicImageDir, fileName));
  fs.writeFileSync(glbPath, createGlbPlane({ imageBuffer, mimeType, aspect }));
  fs.writeFileSync(usdzPath, createUsdzPlane({ fileName, imageBuffer, aspect }));
}

function getImageMetadata(fileName, buffer) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") {
    if (buffer.toString("ascii", 12, 16) !== "IHDR") {
      throw new Error(`El archivo ${fileName} no parece ser un PNG válido.`);
    }
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      mimeType: "image/png",
    };
  }

  if (ext === ".jpg" || ext === ".jpeg") {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        throw new Error(`No se pudo leer el JPG ${fileName}.`);
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
          mimeType: "image/jpeg",
        };
      }
      offset += 2 + length;
    }
    throw new Error(`No se encontró un segmento SOF en ${fileName}.`);
  }

  throw new Error(`Formato no soportado para ${fileName}.`);
}

function createGlbPlane({ imageBuffer, mimeType, aspect }) {
  const positions = new Float32Array([
    -aspect / 2, -0.5, 0,
    aspect / 2, -0.5, 0,
    aspect / 2, 0.5, 0,
    -aspect / 2, 0.5, 0,
  ]);
  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const chunks = [
    alignBuffer(Buffer.from(positions.buffer)),
    alignBuffer(Buffer.from(normals.buffer)),
    alignBuffer(Buffer.from(uvs.buffer)),
    alignBuffer(Buffer.from(indices.buffer)),
    alignBuffer(imageBuffer),
  ];

  const bufferOffsets = [];
  let totalLength = 0;
  for (const chunk of chunks) {
    bufferOffsets.push(totalLength);
    totalLength += chunk.length;
  }

  const buffer = Buffer.concat(chunks, totalLength);
  const json = {
    asset: { version: "2.0", generator: "VisionAR asset generator" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0,
          roughnessFactor: 1,
        },
      },
    ],
    textures: [{ sampler: 0, source: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9729, wrapS: 33071, wrapT: 33071 }],
    images: [{ bufferView: 4, mimeType }],
    buffers: [{ byteLength: totalLength }],
    bufferViews: [
      { buffer: 0, byteOffset: bufferOffsets[0], byteLength: chunks[0].length, target: 34962 },
      { buffer: 0, byteOffset: bufferOffsets[1], byteLength: chunks[1].length, target: 34962 },
      { buffer: 0, byteOffset: bufferOffsets[2], byteLength: chunks[2].length, target: 34962 },
      { buffer: 0, byteOffset: bufferOffsets[3], byteLength: chunks[3].length, target: 34963 },
      { buffer: 0, byteOffset: bufferOffsets[4], byteLength: chunks[4].length },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 4,
        type: "VEC3",
        min: [-aspect / 2, -0.5, 0],
        max: [aspect / 2, 0.5, 0],
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: 4,
        type: "VEC3",
      },
      {
        bufferView: 2,
        componentType: 5126,
        count: 4,
        type: "VEC2",
      },
      {
        bufferView: 3,
        componentType: 5123,
        count: 6,
        type: "SCALAR",
      },
    ],
  };

  return buildGlb(json, buffer);
}

function createUsdzPlane({ fileName, imageBuffer, aspect }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "visionar-usdz-"));
  const textureName = "texture" + path.extname(fileName).toLowerCase();
  const usdaPath = path.join(tempDir, "scene.usda");
  const texturePath = path.join(tempDir, textureName);

  fs.writeFileSync(texturePath, imageBuffer);
  fs.writeFileSync(usdaPath, buildUsda({ textureName, aspect }));

  const usdzPath = path.join(tempDir, "scene.usdz");
  execFileSync("zip", ["-0", "-q", usdzPath, "scene.usda", textureName], { cwd: tempDir });
  const usdzBytes = fs.readFileSync(usdzPath);
  fs.rmSync(tempDir, { recursive: true, force: true });
  return usdzBytes;
}

function buildUsda({ textureName, aspect }) {
  const width = aspect;
  const halfWidth = (width / 2).toFixed(6);
  return `#usda 1.0
(
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Root" {
    def Mesh "Plane" {
        uniform token subdivisionScheme = "none"
        point3f[] points = [(-${halfWidth}, -0.5, 0), (${halfWidth}, -0.5, 0), (${halfWidth}, 0.5, 0), (-${halfWidth}, 0.5, 0)]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        normal3f[] normals = [(0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1)]
        int[] normals:indices = [0, 1, 2, 3]
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)]
        uniform token primvars:st:interpolation = "vertex"
        rel material:binding = </Root/Looks/Material>
    }

    def Scope "Looks" {
        def Material "Material" {
            token outputs:surface.connect = </Root/Looks/Material/PreviewSurface.outputs:surface>

            def Shader "PreviewSurface" {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor.connect = </Root/Looks/Material/DiffuseTexture.outputs:rgb>
                float inputs:roughness = 1
                float inputs:metallic = 0
                token outputs:surface
            }

            def Shader "DiffuseTexture" {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @${textureName}@
                float2 inputs:st.connect = </Root/Plane.primvars:st>
                token outputs:rgb
            }
        }
    }
}
`;
}

function alignBuffer(buffer) {
  const padding = (4 - (buffer.length % 4)) % 4;
  if (!padding) {
    return buffer;
  }
  return Buffer.concat([buffer, Buffer.alloc(padding)]);
}

function cleanDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return;
  }

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    fs.rmSync(entryPath, { recursive: true, force: true });
  }
}

function buildGlb(json, binBuffer) {
  const jsonBuffer = alignBuffer(Buffer.from(JSON.stringify(json), "utf8"));
  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonChunkHeader.write("JSON", 4, 4, "ascii");

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0);
  binChunkHeader.write("BIN\0", 4, 4, "ascii");

  const header = Buffer.alloc(12);
  header.write("glTF", 0, 4, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + jsonChunkHeader.length + jsonBuffer.length + binChunkHeader.length + binBuffer.length, 8);

  return Buffer.concat([header, jsonChunkHeader, jsonBuffer, binChunkHeader, binBuffer]);
}
