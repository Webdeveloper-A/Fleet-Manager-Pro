export async function downloadDocumentFile(
  fileUrl: string,
  fileName: string | null | undefined,
  token: string | null | undefined,
) {
  if (!token) {
    throw new Error("Avval tizimga qayta kiring.");
  }

  const res = await fetch(fileUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Faylni yuklab bo‘lmadi.");
  }

  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName || "document";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(objectUrl);
}