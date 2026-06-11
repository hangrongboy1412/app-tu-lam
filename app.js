const STORAGE_KEY = "luu-kho-records-v1";
const SETTINGS_KEY = "luu-kho-settings-v1";

const fields = {
  editingId: document.querySelector("#editingId"),
  code: document.querySelector("#code"),
  type: document.querySelector("#type"),
  info: document.querySelector("#info"),
  entryDate: document.querySelector("#entryDate"),
  wageA: document.querySelector("#wageA"),
  wageB: document.querySelector("#wageB"),
  wageC: document.querySelector("#wageC"),
  tlv: document.querySelector("#tlv"),
  tlh: document.querySelector("#tlh"),
  note: document.querySelector("#note"),
  imageFile: document.querySelector("#imageFile"),
};

const form = document.querySelector("#stockForm");
const formTitle = document.querySelector("#formTitle");
const resetBtn = document.querySelector("#resetBtn");
const rowsEl = document.querySelector("#stockCards");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const typeFilter = document.querySelector("#typeFilter");
const fromDateFilter = document.querySelector("#fromDateFilter");
const toDateFilter = document.querySelector("#toDateFilter");
const clearFiltersBtn = document.querySelector("#clearFiltersBtn");
const exportCsvBtn = document.querySelector("#exportCsvBtn");
const pullBtn = document.querySelector("#pullBtn");
const syncBtn = document.querySelector("#syncBtn");
const scriptUrlInput = document.querySelector("#scriptUrl");
const saveSettingsBtn = document.querySelector("#saveSettingsBtn");
const statusText = document.querySelector("#statusText");

const totals = {
  rows: document.querySelector("#totalRows"),
  a: document.querySelector("#totalA"),
  b: document.querySelector("#totalB"),
  c: document.querySelector("#totalC"),
  tlv: document.querySelector("#totalTlv"),
  tlh: document.querySelector("#totalTlh"),
};

let records = loadRecords();
let settings = loadSettings();

scriptUrlInput.value = settings.scriptUrl || "";
fields.entryDate.valueAsDate = new Date();
render();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
let uploadedImage = "";

if (fields.imageFile.files[0]) {

  const previewBase64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(fields.imageFile.files[0]);
  });

const result = await uploadImageToDrive(
  fields.imageFile.files[0]
);

uploadedImage = result.imageUrl || "";

console.log("uploadedImage =", uploadedImage);
}

console.log("uploadedImage =", uploadedImage);

const data = readForm(uploadedImage);

 if (data.id) {
  records = records.map(item =>
    item.id === data.id ? data : item
  );
} else {
  data.id = crypto.randomUUID();
  records.unshift(data);
}

  saveRecords();
  resetForm();
  render();
});

resetBtn.addEventListener("click", resetForm);
searchInput.addEventListener("input", render);
typeFilter.addEventListener("change", render);
fromDateFilter.addEventListener("change", render);
toDateFilter.addEventListener("change", render);
clearFiltersBtn.addEventListener("click", clearFilters);
exportCsvBtn.addEventListener("click", exportCsv);
pullBtn.addEventListener("click", pullFromSheet);
saveSettingsBtn.addEventListener("click", saveSettings);
syncBtn.addEventListener("click", syncToSheet);

function readForm(imageUrl = "") {
  return {
    id: fields.editingId.value,
    code: fields.code.value.trim(),
    type: fields.type.value.trim(),
    info: fields.info.value.trim(),
    imageUrl: imageUrl,
    entryDate: fields.entryDate.value,
    wageA: parseMoney(fields.wageA.value),
    wageB: parseMoney(fields.wageB.value),
    wageC: parseMoney(fields.wageC.value),
    tlv: parseMoney(fields.tlv.value),
    tlh: parseMoney(fields.tlh.value),
    note: fields.note.value.trim(),
  };
}

function resetForm() {
  form.reset();
  fields.imageFile.value = "";
  fields.editingId.value = "";
  fields.entryDate.valueAsDate = new Date();
  formTitle.textContent = "Th\u00eam d\u1eef li\u1ec7u";
}

function render() {
  renderTypeOptions();
  const filtered = getFilteredRecords();

  rowsEl.innerHTML = "";
  emptyState.style.display = filtered.length ? "none" : "block";

  for (const item of filtered) {

  const card = document.createElement("div");
  card.className = "card";

  const fileId = (item.imageUrl || "").match(/id=([^&]+)/)?.[1];

  const imgUrl = fileId
    ? `https://lh3.googleusercontent.com/d/${fileId}=w1000`
    : "";

  card.innerHTML = `
  ${
  imgUrl
    ? `<img
        src="${imgUrl}"
        alt=""
        loading="lazy"
        onclick="showImage('${imgUrl}')"
        style="cursor:pointer"
      >`
    : `<div class="no-image">Không có ảnh</div>`
}
  <div class="card-info">

    <div class="card-code">
      ${escapeHtml(item.code)}
    </div>

    <div class="card-meta">
      ${escapeHtml(item.type)} • ${formatDate(item.entryDate)}
    </div>

    <div class="card-meta">
      Linh: ${formatNumber(item.wageA)}
      |
      KHD: ${formatNumber(item.wageB)}
      |
      KLT: ${formatNumber(item.wageC)}
    </div>

    <div class="card-meta">
      TLH: ${formatNumber(item.tlh)}
      |
      TLV: ${formatNumber(item.tlv)}
    </div>

    <div class="card-meta">
      ${escapeHtml(item.note || "")}
    </div>

  </div>

  <div class="row-actions">
    <button data-action="edit" data-id="${item.id}">
      Sửa
    </button>

    <button class="danger" data-action="delete" data-id="${item.id}">
      Xóa
    </button>
  </div>
`;
    rowsEl.appendChild(card);
    card.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", handleRowAction);
});

  }   // <-- THÊM DẤU } NÀY

  renderTotals(filtered);
}

function getFilteredRecords() {
  const keyword = normalizeSearchValue(searchInput.value).trim();
  const selectedType = typeFilter.value;
  const fromDate = fromDateFilter.value;
  const toDate = toDateFilter.value;

  return records.filter((item) => {
    const matchesKeyword = !keyword || getSearchText(item).includes(keyword);
    const matchesType = !selectedType || item.type === selectedType;
    const matchesFrom = !fromDate || item.entryDate >= fromDate;
    const matchesTo = !toDate || item.entryDate <= toDate;
    return matchesKeyword && matchesType && matchesFrom && matchesTo;
  });
}

function getSearchText(item) {
  return [
    item.code,
    item.type,
    item.info,
    formatDate(item.entryDate),
    item.entryDate,
    item.wageA,
    item.wageB,
    item.wageC,
    item.tlh,
    item.tlv,
    item.note,
  ]
    .map((value) => normalizeSearchValue(value))
    .join(" ");
}

function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

function renderTypeOptions() {
  const currentValue = typeFilter.value;
  const types = [...new Set(records.map((item) => item.type).filter(Boolean))].sort((a, b) => {
    return a.localeCompare(b, "vi");
  });

  typeFilter.innerHTML = '<option value="">T\u1ea5t c\u1ea3 lo\u1ea1i</option>';
  for (const type of types) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeFilter.appendChild(option);
  }

  if (types.includes(currentValue)) {
    typeFilter.value = currentValue;
  }
}

function clearFilters() {
  searchInput.value = "";
  typeFilter.value = "";
  fromDateFilter.value = "";
  toDateFilter.value = "";
  render();
}

function renderTotals(list) {
  totals.rows.textContent = countUniqueItems(list);
  totals.a.textContent = formatNumber(countType(list, "vong"));
  totals.b.textContent = formatNumber(countType(list, "nhan"));
  totals.c.textContent = formatNumber(countType(list, "mat"));
  totals.tlh.textContent = formatNumber(countType(list, "bong"));
  totals.tlv.textContent = formatNumber(countOtherTypes(list));
}

function countType(list, keyword) {
  return list.filter((item) => normalizeText(item.type).includes(keyword)).length;
}

function countOtherTypes(list) {
  const knownTypes = ["vong", "nhan", "mat", "bong"];
  return list.filter((item) => {
    const type = normalizeText(item.type);
    return !knownTypes.some((keyword) => type.includes(keyword));
  }).length;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

function countUniqueItems(list) {
  const codes = new Set();
  for (const item of list) {
    const code = String(item.code || "").trim().toLowerCase();
    codes.add(code || item.id);
  }
  return codes.size;
}

function handleRowAction(event) {
  const id = event.currentTarget.dataset.id;
  const action = event.currentTarget.dataset.action;
  const item = records.find((record) => record.id === id);

  if (!item) return;

  if (action === "edit") {
    fields.editingId.value = item.id;
    fields.code.value = item.code;
    fields.type.value = item.type;
    fields.info.value = item.info || "";
    fields.entryDate.value = item.entryDate;
    fields.wageA.value = item.wageA || "";
    fields.wageB.value = item.wageB || "";
    fields.wageC.value = item.wageC || "";
    fields.tlv.value = item.tlv || "";
    fields.tlh.value = item.tlh || "";
    fields.note.value = item.note || "";
    formTitle.textContent = "S\u1eeda d\u1eef li\u1ec7u";
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (action === "delete" && confirm("X\u00f3a d\u00f2ng n\u00e0y?")) {
    records = records.filter((record) => record.id !== id);
    saveRecords();
    render();
    setStatus("\u0110\u00e3 x\u00f3a d\u1eef li\u1ec7u.");
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSettings() {
  settings.scriptUrl = scriptUrlInput.value.trim();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  setStatus("\u0110\u00e3 l\u01b0u link Google Sheet.");
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

async function syncToSheet() {
  const scriptUrl = scriptUrlInput.value.trim();
  if (!scriptUrl) {
    setStatus("Ch\u01b0a c\u00f3 link Google Apps Script.");
    return;
  }

  try {
    setStatus("\u0110ang \u0111\u1ed3ng b\u1ed9...");
    await fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ records }),
    });
    setStatus("\u0110\u00e3 g\u1eedi d\u1eef li\u1ec7u l\u00ean Google Sheet.");
  } catch {
    setStatus("Ch\u01b0a \u0111\u1ed3ng b\u1ed9 \u0111\u01b0\u1ee3c. Ki\u1ec3m tra m\u1ea1ng ho\u1eb7c link Google Apps Script.");
  }
}

function pullFromSheet() {
  const scriptUrl = scriptUrlInput.value.trim();
  if (!scriptUrl) {
    setStatus("Ch\u01b0a c\u00f3 link Google Apps Script.");
    return;
  }

  if (records.length && !confirm("T\u1ea3i t\u1eeb Sheet s\u1ebd thay d\u1eef li\u1ec7u trong app b\u1eb1ng d\u1eef li\u1ec7u tr\u00ean Sheet. Ti\u1ebfp t\u1ee5c?")) {
    return;
  }

  setStatus("\u0110ang t\u1ea3i d\u1eef li\u1ec7u t\u1eeb Sheet...");
  loadJsonp(scriptUrl)
    .then((payload) => {
      if (!payload || !payload.ok || !Array.isArray(payload.records)) {
        throw new Error("Invalid payload");
      }
      records = payload.records.map(normalizePulledRecord);
      saveRecords();
      resetForm();
      render();
      setStatus("\u0110\u00e3 t\u1ea3i d\u1eef li\u1ec7u t\u1eeb Sheet.");
    })
    .catch(() => {
      setStatus("Ch\u01b0a t\u1ea3i \u0111\u01b0\u1ee3c. Ki\u1ec3m tra link, quy\u1ec1n truy c\u1eadp ho\u1eb7c deploy l\u1ea1i Apps Script.");
    });
}

function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `sheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const separator = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP failed"));
    };

    script.src = `${url}${separator}callback=${callbackName}`;
    document.body.appendChild(script);

    function cleanup() {
      delete window[callbackName];
      script.remove();
    }
  });
}

function normalizePulledRecord(item) {
  return {
    id: item.id || crypto.randomUUID(),
    code: String(item.code || ""),
    type: String(item.type || ""),
    info: String(item.info || ""),
    imageUrl: String(item.imageUrl || ""),
    entryDate: item.entryDate || new Date().toISOString().slice(0, 10),
    wageA: Number(item.wageA || 0),
    wageB: Number(item.wageB || 0),
    wageC: Number(item.wageC || 0),
    tlv: Number(item.tlv || 0),
    tlh: Number(item.tlh || 0),
    note: String(item.note || ""),
    imageUrl: String(item.imageUrl || ""),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

function exportCsv() {
  const header = ["Ma so", "Loai", "Thong tin", "Ngay nhap", "Khach 1", "Khach 2", "Khach 3", "TLH", "TLV", "Ghi chu"];
  const lines = getFilteredRecords().map((item) => [
    item.code,
    item.type,
    item.info,
    item.entryDate,
    item.wageA,
    item.wageB,
    item.wageC,
    item.tlh,
    item.tlv,
    item.note,
  ]);
  const csv = [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `du-lieu-kho-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function parseMoney(value) {
  const text = String(value || "").trim().replace(/\s/g, "");
  const commaIndex = text.lastIndexOf(",");
  const dotIndex = text.lastIndexOf(".");
  let normalized = text;

  if (commaIndex !== -1 && dotIndex !== -1) {
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = text.replaceAll(thousandsSeparator, "").replace(decimalSeparator, ".");
  } else if (commaIndex !== -1) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (dotIndex !== -1) {
    const decimalDigits = text.length - dotIndex - 1;
    normalized = decimalDigits > 0 && decimalDigits < 3 ? text : text.replace(/\./g, "");
  }

  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function sum(list, key) {
  return list.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
  console.log(message);
}
async function uploadImageToDrive(file) {

  const scriptUrl = scriptUrlInput.value.trim();

  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result.split(",")[1]);
    };

    reader.readAsDataURL(file);
  });

const res = await fetch(scriptUrl, {
  method: "POST",
  headers: {
    "Content-Type": "text/plain;charset=utf-8"
  },
  body: JSON.stringify({
    action: "uploadImage",
    fileName: file.name,
    mimeType: file.type,
    base64: base64
  })
});

const result = await res.json();

console.log("result =", result);

return result;
}
function showImage(url){
  const modal = document.getElementById("imgModal");
  const img = document.getElementById("imgPreview");

  img.src = url;
  modal.style.display = "flex";
}

document.addEventListener("click", (e)=>{
  if(e.target.id === "imgModal"){
    e.target.style.display = "none";
  }
});
