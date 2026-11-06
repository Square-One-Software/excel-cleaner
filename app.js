/*
    poc
    input excel file > parse, remove some PII, and show as html table > make it nice and printable for printing!
    use sheetJS library for parsing excel
*/

const fileInput = document.getElementById("file-uploader");
const outputArea = document.getElementById("output-area");

const colFallback = "N/A";
const valFallback = " ";

function fillEmptySlotsWithFallBack(arr, fallback) {
  return Array.from(arr, (_, i) => {
    return !(i in arr) ? fallback : arr[i];
  });
}

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const fileBuffer = await file.arrayBuffer();
    const wb = XLSX.read(fileBuffer);
    const ws = wb.Sheets[wb.SheetNames[0]];

    const jsonData = XLSX.utils.sheet_to_json(ws, {header: 1}); // -> arr of json | [0] = header

    let cleanedData = jsonData.map((data) => fillEmptySlots(data));
    const targets = ["身份证", "地址"];
    const idxs = targets.map((t) => cleanedData[0].indexOf(t));

    cleanedData = cleanedData.reduce((acc, curr) => {
      const filteredData = curr.filter((_, index) => !idxs.includes(index));
      return [...acc, filteredData];
    }, []);

    const ns = XLSX.utils.aoa_to_sheet(cleanedData);
    const html = XLSX.utils.sheet_to_html(ns);
    outputArea.innerHTML = html;
  } catch (error) {
    console.log(error);
  }
};
