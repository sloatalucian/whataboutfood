// Utilitar pentru export CSV (folosit in tab-urile SuperAdmin: proprietari,
// restaurante, statistici, abonamente). Genereaza un CSV cu BOM UTF-8 (ca sa
// se deschida corect cu diacritice in Excel) si declanseaza descarcarea.
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data
    .map((row) =>
      Object.values(row)
        .map((val) =>
          typeof val === "string"
            ? `"${val.replace(/"/g, '""')}"`
            : (val ?? ""),
        )
        .join(","),
    )
    .join("\n");
  const csv = `${headers}\n${rows}`;
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
