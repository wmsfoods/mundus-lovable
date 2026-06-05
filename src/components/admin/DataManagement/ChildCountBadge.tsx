type Detail = { label: string; value: number | string };

export function ChildCountBadge({ total, details }: { total: number; details?: Detail[] }) {
  const tip = details?.length
    ? details.map((d) => `${d.label}: ${d.value}`).join(" • ")
    : undefined;
  return (
    <span
      title={tip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 6px",
        borderRadius: 999,
        background: "#f1f0ed",
        color: "#5e5e58",
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      {total}
    </span>
  );
}