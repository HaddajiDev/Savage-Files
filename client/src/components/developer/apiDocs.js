export const LIMITS = [
  { label: "Per file", value: "5 MB" },
  { label: "Storage", value: "5 GB" },
  { label: "Requests", value: "200 per 15 min" },
]

export const LANGUAGES = [
  { id: "curl", label: "cURL", prism: "plain" },
  { id: "python", label: "Python", prism: "python" },
  { id: "javascript", label: "JavaScript", prism: "javascript" },
  { id: "node", label: "Node.js", prism: "javascript" },
]

export const COMMON_ERRORS = [
  { status: 401, text: "The API key is missing, wrong or revoked." },
  { status: 403, text: "The account's email isn't confirmed yet." },
  { status: 429, text: "Too many requests. Wait a few minutes and retry." },
]

export const ENDPOINTS = [
  {
    id: "upload",
    title: "Upload a file",
    method: "POST",
    path: "/api/upload",
    description: "Send the file as multipart/form-data. Files are public unless you pass private=true.",
    params: [
      { name: "file", where: "form", type: "file", required: true, text: "The file to upload, up to 5 MB." },
      { name: "private", where: "form", type: "boolean", text: "Set to true to keep the file private. Defaults to false." },
    ],
    response: {
      success: true,
      fileId: "6650c1f2a1b2c3d4e5f60718",
      filename: "report.pdf",
      size: "812.40 KB",
      isPublic: false,
      uploadDate: "2026-11-24T10:30:00.000Z",
    },
    errors: [
      { status: 400, text: "No file was sent in the file field." },
      { status: 413, text: "The file is over 5 MB, or your storage is full." },
    ],
  },
  {
    id: "list",
    title: "List files",
    method: "GET",
    path: "/api/files",
    description: "Returns every file in your account, newest uploads included.",
    params: [],
    response: {
      success: true,
      files: [
        { id: "6650c1f2a1b2c3d4e5f60718", filename: "report.pdf", size: "812.40 KB", uploadDate: "2026-11-24T10:30:00.000Z", isPublic: false },
      ],
      count: 1,
    },
    errors: [],
  },
  {
    id: "download",
    title: "Download a file",
    method: "GET",
    path: "/api/files/:fileId",
    description: "Streams the file's bytes. Works for private files too, as long as they're yours.",
    params: [{ name: "fileId", where: "path", type: "string", required: true, text: "The id returned by upload or list." }],
    response: null,
    responseNote: "The raw file, sent as application/octet-stream with a Content-Disposition filename.",
    errors: [
      { status: 400, text: "The file id isn't valid." },
      { status: 404, text: "No file with that id in your account." },
    ],
  },
  {
    id: "delete",
    title: "Delete a file",
    method: "DELETE",
    path: "/api/files/:fileId",
    description: "Permanently removes the file and breaks any links to it.",
    params: [{ name: "fileId", where: "path", type: "string", required: true, text: "The id of the file to delete." }],
    response: { success: true, message: "File deleted successfully" },
    errors: [{ status: 404, text: "No file with that id in your account." }],
  },
  {
    id: "storage",
    title: "Check storage",
    method: "GET",
    path: "/api/storage",
    description: "How much of your 5 GB is used, in bytes.",
    params: [],
    response: { success: true, used: 15728640, total: 5368709120, fileCount: 8, usagePercentage: 0.29 },
    errors: [],
  },
]

const SAMPLE_FILE = "report.pdf"
const FILE_ID = "FILE_ID"

function curl(ep, base, key) {
  const url = `${base}${ep.path.replace(":fileId", FILE_ID)}`
  const auth = `  -H "Authorization: Bearer ${key}"`
  switch (ep.id) {
    case "upload":
      return [`curl -X POST "${url}" \\`, `${auth} \\`, `  -F "file=@${SAMPLE_FILE}" \\`, `  -F "private=true"`].join("\n")
    case "download":
      return [`curl "${url}" \\`, `${auth} \\`, `  -o ${SAMPLE_FILE}`].join("\n")
    case "delete":
      return [`curl -X DELETE "${url}" \\`, auth].join("\n")
    default:
      return [`curl "${url}" \\`, auth].join("\n")
  }
}

function python(ep, base, key) {
  const head = ["import requests", "", `API_KEY = "${key}"`, `BASE_URL = "${base}"`, 'headers = {"Authorization": f"Bearer {API_KEY}"}', ""]
  const path = ep.path.replace(":fileId", FILE_ID)
  const body = {
    upload: [
      `with open("${SAMPLE_FILE}", "rb") as f:`,
      "    response = requests.post(",
      `        f"{BASE_URL}${path}",`,
      "        headers=headers,",
      '        files={"file": f},',
      '        data={"private": "true"},',
      "    )",
      "",
      "print(response.json())",
    ],
    download: [
      `response = requests.get(f"{BASE_URL}${path}", headers=headers)`,
      "response.raise_for_status()",
      "",
      `with open("${SAMPLE_FILE}", "wb") as f:`,
      "    f.write(response.content)",
    ],
    delete: [`response = requests.delete(f"{BASE_URL}${path}", headers=headers)`, "print(response.json())"],
  }[ep.id] || [`response = requests.get(f"{BASE_URL}${path}", headers=headers)`, "print(response.json())"]
  return [...head, ...body].join("\n")
}

function javascript(ep, base, key) {
  const head = [`const API_KEY = "${key}";`, `const BASE_URL = "${base}";`, ""]
  const url = "`${BASE_URL}" + ep.path.replace(":fileId", FILE_ID) + "`"
  const auth = "  headers: { Authorization: `Bearer ${API_KEY}` },"
  const body = {
    upload: [
      "const form = new FormData();",
      'form.append("file", fileInput.files[0]);',
      'form.append("private", "true");',
      "",
      `const res = await fetch(${url}, {`,
      '  method: "POST",',
      auth,
      "  body: form,",
      "});",
      "console.log(await res.json());",
    ],
    download: [
      `const res = await fetch(${url}, {`,
      auth,
      "});",
      "const blob = await res.blob();",
      "",
      'const link = document.createElement("a");',
      "link.href = URL.createObjectURL(blob);",
      `link.download = "${SAMPLE_FILE}";`,
      "link.click();",
    ],
    delete: [`const res = await fetch(${url}, {`, '  method: "DELETE",', auth, "});", "console.log(await res.json());"],
  }[ep.id] || [`const res = await fetch(${url}, {`, auth, "});", "console.log(await res.json());"]
  return [...head, ...body].join("\n")
}

function node(ep, base, key) {
  const imports = ['import axios from "axios";']
  if (ep.id === "upload" || ep.id === "download") imports.push('import fs from "node:fs";')
  if (ep.id === "upload") imports.push('import FormData from "form-data";')
  const head = [...imports, "", `const API_KEY = "${key}";`, `const BASE_URL = "${base}";`, "const headers = { Authorization: `Bearer ${API_KEY}` };", ""]
  const url = "`${BASE_URL}" + ep.path.replace(":fileId", FILE_ID) + "`"
  const body = {
    upload: [
      "const form = new FormData();",
      `form.append("file", fs.createReadStream("${SAMPLE_FILE}"));`,
      'form.append("private", "true");',
      "",
      `const { data } = await axios.post(${url}, form, {`,
      "  headers: { ...headers, ...form.getHeaders() },",
      "});",
      "console.log(data);",
    ],
    download: [
      `const { data } = await axios.get(${url}, {`,
      "  headers,",
      '  responseType: "arraybuffer",',
      "});",
      `fs.writeFileSync("${SAMPLE_FILE}", data);`,
    ],
    delete: [`const { data } = await axios.delete(${url}, { headers });`, "console.log(data);"],
  }[ep.id] || [`const { data } = await axios.get(${url}, { headers });`, "console.log(data);"]
  return [...head, ...body].join("\n")
}

const GENERATORS = { curl, python, javascript, node }

export function codeSample(endpoint, language, base, key) {
  return GENERATORS[language](endpoint, base, key || "YOUR_API_KEY")
}
