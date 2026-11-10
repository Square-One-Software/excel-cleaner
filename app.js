// element selection and global states
const fileInput = document.getElementById("file-uploader");
const fileNameLabel = document.getElementById("file-name");
const btnChoose = document.getElementById("btn-choose");
const btnPrint = document.getElementById("btn-print");
const outputArea = document.getElementById("output-area");
const selectionArea = document.getElementById("selection-area");
const tabBtnsArea = document.getElementById("tab-btn-area");
const tabContainer = document.getElementById("tab-area");

const colFallback = "N/A";
const valFallback = " ";
const TARGETS = []; // array of arrys
let WS_DATA = [];

btnChoose.addEventListener("click", () => fileInput.click());
btnPrint.addEventListener("click", () => window.print());
btnPrint.disabled = true;

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

    TARGETS.push([]); // set selection input state
    tabContent.appendChild(buildHeaderSelections(d[0], key));

    const output = buildDataTable(d);
    const tabOutputArea = document.createElement("div");
    tabOutputArea.id = `tb-${key}`;
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
  tabContainer.scrollIntoView({behavior: "smooth", block: "nearest"});
}

function buildHeaderSelections(headers, pageIdx) {
  const form = document.createElement("form");
  form.classList.add("form-container");
  form.id = pageIdx;

  let htmlString = "";
  for (const header of headers) {
    htmlString = htmlString.concat(`<label class="chip"><input type="checkbox" name="field" value="${header}" id="${header}" /> <span>${header}</span> </label>`);
  }

  form.innerHTML = htmlString;
  form.addEventListener("change", (e) => filterAndUpdateTableListener(e, pageIdx));
  return form;
}

function filterAndUpdateTableListener(e, pageIdx) {
  if (e.target.type === "checkbox") {
    const isChecked = e.target.checked;
    if (isChecked) {
      TARGETS[pageIdx].push(e.target.value);
    } else {
      const targetIdx = TARGETS[pageIdx].indexOf(e.target.value);
      if (targetIdx >= 0) TARGETS[pageIdx].splice(targetIdx, 1);
    }
    // filter out the table data based on updated TARGET
    const currentData = WS_DATA[pageIdx];
    const targetIdxs = currentData[0]
      .map((name, key) => {
        return TARGETS[pageIdx].includes(name) ? key : -1;
      })
      .filter((index) => index !== -1);
    const filteredData = currentData.reduce((acc, curr) => {
      const updatedCurr = curr.filter((name, key) => {
        if (!targetIdxs.includes(key)) return name;
      });
      return [...acc, updatedCurr];
    }, []);
    const table = document.getElementById(`tb-${pageIdx}`);
    table.innerHTML = buildDataTable(filteredData);
  }
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

fileInput.onchange = async (e) => {
  const file = e.target.files[0];

  if (!file) return;

  fileNameLabel.textContent = file.name;
  fileNameLabel.classList.add("has-file");
  btnPrint.removeAttribute("disabled");

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
    WS_DATA = [...filteredData];
    buildDataTab(filteredData, wb.SheetNames);
  } catch (error) {
    console.log(error);
  }
};
