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
  status.textContent = `📦 Packing ${files.length} files into archive...`;

  try {
    const tar = new window.Tar();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const content = new Uint8Array(await file.arrayBuffer());

      // Preserve folder structure via webkitRelativePath
      tar.append(file.webkitRelativePath, content);
      progressBar.value = i + 1;
    }

    // Compress the entire tar buffer with true GZIP
    const gzipped = window.pako.gzip(tar.out.subarray(0, tar.written));
    const blob = new Blob([gzipped], { type: "application/gzip" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url,
      filename: "compressed_folder.tar.gz",
      saveAs: true
    });

    status.textContent = `✅ Done! ${files.length} files archived.`;
  } catch (err) {
    status.textContent = `❌ Compression failed: ${err.message}`;
    console.error(err);
  }
});
