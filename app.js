/*
    poc
    input excel file > parse, remove PII, and show as html table > make it nice and printable for printing!
    use sheetJS library for parsing excel
*/

const fileInput = document.getElementById("file-uploader");
const outputArea = document.getElementById("output-area");

console.log(fileInput);

fileInput.onchange = async (e) => {
  console.log(e);
  const file = e.target.files[0];
  if (!file) return;

  try {
    const fileBuffer = await file.arrayBuffer();
    const wb = XLSX.read(fileBuffer);
    console.log(wb.SheetNames[0]);
    const ws = wb.Sheets[wb.SheetNames[0]];
    console.log(wb);
    const html = XLSX.utils.sheet_to_html(ws);
    console.log(html);
    outputArea.innerHTML = html;
  } catch (error) {
    console.log(error);
  }
};
