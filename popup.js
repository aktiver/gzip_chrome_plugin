document.getElementById("compressBtn").addEventListener("click", async () => {
  const input = document.getElementById("folderInput");
  const files = Array.from(input.files);
  const progressBar = document.getElementById("progressBar");
  const status = document.getElementById("status");

  if (files.length === 0) {
    status.textContent = "❌ No files selected.";
    return;
  }

  progressBar.max = files.length;
  progressBar.value = 0;
  status.textContent = `Compressing ${files.length} files...`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const content = await file.arrayBuffer();
    const compressed = window.pako.gzip(new Uint8Array(content));  // true GZIP

    const blob = new Blob([compressed], { type: "application/gzip" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url,
      filename: file.webkitRelativePath + ".gz",
      saveAs: false
    });

    progressBar.value = i + 1;
  }

  status.textContent = `✅ Done! Compressed ${files.length} file(s).`;
});
