export function TrashBadge({ label }: { label: string }) {
  return (
    <span
      title={label}
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 999,
        background: "#eeece7",
        color: "#5e5e58",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}