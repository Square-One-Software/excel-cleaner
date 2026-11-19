// element selection and global states
const fileInput = document.getElementById("file-uploader");
const fileNameLabel = document.getElementById("file-name");
const btnChoose = document.getElementById("btn-choose");
const btnPrint = document.getElementById("btn-print");
const btnBackTop = document.getElementById("btn-back-top");
const tabBtnsArea = document.getElementById("tab-btn-area");
const tabContainer = document.getElementById("tab-area");

const colFallback = "N/A";
const valFallback = " ";
const BACK_TOP_THRESHOLD = 80;
let TARGETS = []; // array of arrys
let WS_DATA = [];
let backTopRaf = 0;
let ROWS_POINTERS = [];

btnChoose.addEventListener("click", () => fileInput.click());
btnPrint.addEventListener("click", () => window.print());
btnBackTop.addEventListener("click", () => {
  tabContainer.scrollIntoView({behavior: "smooth", block: "start"});
});

function updateBackTopVisibility() {
  if (tabContainer.classList.contains("hidden")) {
    btnBackTop.classList.add("hidden");
    return;
  }
  const top = tabContainer.getBoundingClientRect().top;
  btnBackTop.classList.toggle("hidden", top >= -BACK_TOP_THRESHOLD);
}

function onScrollOrResize() {
  if (backTopRaf) return;
  backTopRaf = requestAnimationFrame(() => {
    backTopRaf = 0;
    updateBackTopVisibility();
  });
}

window.addEventListener("scroll", onScrollOrResize, {passive: true});
window.addEventListener("resize", onScrollOrResize);

// Source - https://stackoverflow.com/a/75988895
// Posted by Mr. Polywhirl, modified by community. See post 'Timeline' for change history
// Retrieved 2026-11-19, License - CC BY-SA 4.0

const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
};

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
    ROWS_POINTERS.push([]);
    const nonEmptyRolls = d.reduce((acc, curr) => {
      if (curr.length > 0) return acc + 1;
      return acc;
    }, 0);

    tabContent.appendChild(buildHeaderSelections(d[0], 1, nonEmptyRolls - 1, key));

    const output = buildDataTable(d);
    const tabOutputArea = document.createElement("div");
    tabOutputArea.id = `tb-${key}`;
    tabOutputArea.innerHTML = output;
    tabOutputArea.classList.add("tab-table");
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

function buildHeaderSelections(headers, start, end, pageIdx) {
  const form = document.createElement("form");
  form.classList.add("form-container");
  form.id = pageIdx;
  const formCol1 = document.createElement("div");
  const formCol2 = document.createElement("div");
  formCol2.className = "form-col-filter";
  form.appendChild(formCol1);
  form.appendChild(formCol2);

  let htmlString = "";
  for (const header of headers) {
    htmlString = htmlString.concat(`<label class="chip"><input type="checkbox" name="field" value="${header}" id="${header}" /> <span>${header}</span> </label>`);
  }

  formCol1.innerHTML = htmlString;

  const fromInput = document.createElement("input");
  fromInput.name = "start";
  fromInput.type = "number";
  fromInput.placeholder = start;
  fromInput.min = start;
  fromInput.max = end;
  fromInput.id = `start-${pageIdx}`;
  fromInput.className = "input-filter";
  ROWS_POINTERS[pageIdx].push(start);

  const endInput = document.createElement("input");
  endInput.name = "end";
  endInput.type = "number";
  endInput.placeholder = end;
  endInput.min = start;
  endInput.max = end;
  endInput.id = `end-${pageIdx}`;
  endInput.className = "input-filter";
  ROWS_POINTERS[pageIdx].push(end);

  const fromLabel = document.createElement("label");
  fromLabel.htmlFor = fromInput.id;
  fromLabel.className = "input-filter-label";
  fromLabel.textContent = "From";

  const endLabel = document.createElement("label");
  endLabel.htmlFor = endInput.id;
  endLabel.className = "input-filter-label";
  endLabel.textContent = "To";

  fromInput.addEventListener("keyup", (e) => debounce(filterAndUpdateTableListener(e, pageIdx), 300));
  endInput.addEventListener("keyup", (e) => debounce(filterAndUpdateTableListener(e, pageIdx), 300));

  formCol2.appendChild(fromLabel);
  formCol2.appendChild(fromInput);
  formCol2.appendChild(endLabel);
  formCol2.appendChild(endInput);

  form.addEventListener("change", (e) => filterAndUpdateTableListener(e, pageIdx));
  return form;
}

function filterDataByColumn(pageIdx) {
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
  return filteredData;
}

function filterDataByRow(e, dataFilteredByCol, pageIdx) {
  const [startPointer, endPointer] = ROWS_POINTERS[pageIdx];
  const currentData = dataFilteredByCol;

  let start = e.target.name == "start" ? +e.target.value : startPointer;
  let end = e.target.name == "end" ? +e.target.value : endPointer;
  if (start == 0) start = 1;
  if (end > dataFilteredByCol.length) end = dataFilteredByCol.length - 1;

  const filteredData = [currentData[0], ...currentData.slice(start, end + 1)];
  ROWS_POINTERS[pageIdx] = [start, end];
  return filteredData;
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
  }
  const dataFilteredByCol = filterDataByColumn(pageIdx);
  const filteredData = filterDataByRow(e, dataFilteredByCol, pageIdx);
  const table = document.getElementById(`tb-${pageIdx}`);
  table.innerHTML = buildDataTable(filteredData);
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
  for (const index in pagedData) {
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

function resetWorkspace() {
  TARGETS = [];
  WS_DATA = [];
  tabBtnsArea.innerHTML = "";
  tabContainer.querySelectorAll(".tab-content").forEach((el) => el.remove());
  btnBackTop.classList.add("hidden");
}

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  resetWorkspace();

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
    WS_DATA = [...filteredData];
    buildDataTab(filteredData, wb.SheetNames);
    updateBackTopVisibility();
  } catch (error) {
    console.log(error);
  }
};
