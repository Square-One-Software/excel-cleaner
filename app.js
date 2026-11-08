// element selection and global states
const fileInput = document.getElementById("file-uploader");
const fileNameLabel = document.getElementById("file-name");
const btnChoose = document.getElementById("btn-choose");
const outputArea = document.getElementById("output-area");
const selectionArea = document.getElementById("selection-area");
const tabBtnsArea = document.getElementById("tab-btn-area");
const tabContainer = document.getElementById("tab-area");

const colFallback = "N/A";
const valFallback = " ";
const TARGETS = []; // array of arrys
const WS_DATA = [];

// functions and main logic
function buildDataTab(data, sheetNames) {
  data.forEach((d, key) => {
    const tabBtn = document.createElement("button");
    tabBtn.textContent = sheetNames[key];
    tabBtn.dataset.tab = sheetNames[key];
    tabBtn.classList = key === 0 ? "tab active" : "tab";
    tabBtnsArea.appendChild(tabBtn);

    const tabContent = document.createElement("div");
    tabContent.classList = key === 0 ? "tab-content active" : "tab-content";
    tabContent.id = sheetNames[key];
    tabContent.innerHTML += buildHeaderSelections(d[0]);
    const output = buildDataTable(d);
    const tabOutputArea = document.createElement("div");
    tabOutputArea.id = sheetNames[key];
    tabOutputArea.innerHTML = output;
    tabContent.appendChild(tabOutputArea);
    tabContainer.appendChild(tabContent);
  });

  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(target).classList.add("active");
    });
  });
}

function buildHeaderSelections(headers) {
  let htmlString = "";
  for (const header of headers) {
    htmlString = htmlString.concat(`<input type="checkbox" value="${header} id="${header}" /><label for="${header}">${header}</label>`);
  }
  return htmlString;
}

function selectTargets(target, pageIdx) {
  TARGETS[pageIdx].push(target);
}

function buildDataTable(data) {
  const ns = XLSX.utils.aoa_to_sheet(data);
  const html = XLSX.utils.sheet_to_html(ns);
  return html;
}

function fillEmptySlotsWithFallBack(arr, fallback) {
  return Array.from(arr, (_, i) => {
    return !(i in arr) ? fallback : arr[i];
  });
}

function convertAllSheets2Json(wb) {
  for (const sheet of wb.SheetNames) {
    const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[sheet], {header: 1});
    WS_DATA.push(jsonData);
  }
}

function extractPagedData(pagedData, headerOnly = false) {
  const extractedData = [];
  for (index in pagedData) {
    if (headerOnly) {
      const headerArr = pagedData[index][0];
      const sheetHeaders = fillEmptySlotsWithFallBack(headerArr, colFallback);
      extractedData.push(sheetHeaders);
    } else {
      const rowData = pagedData[index].splice(1).map((r) => fillEmptySlotsWithFallBack(r, valFallback));
      extractedData.push(rowData);
    }
  }
  return extractedData;
}

btnChoose.addEventListener("click", () => fileInput.click());

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  fileNameLabel.textContent = file.name;
  fileNameLabel.classList.add("has-file");

  try {
    const fileBuffer = await file.arrayBuffer();
    const wb = XLSX.read(fileBuffer);

    convertAllSheets2Json(wb);

    const headers = extractPagedData(WS_DATA, true);
    const rows = extractPagedData(WS_DATA);

    const filteredData = headers.reduce((acc, curr, idx) => {
      const joinedData = [curr, ...rows[idx]];
      return [...acc, joinedData];
    }, []);

    tabContainer.classList.remove("hidden");
    buildDataTab(filteredData, wb.SheetNames);
  } catch (error) {
    console.log(error);
  }
};
