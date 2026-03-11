export default function TransparencyToggle({
  isTransparent,
  onToggle,
}: {
  isTransparent: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      aria-label={isTransparent ? "Disable transparent popup" : "Enable transparent popup"}
      title={isTransparent ? "Disable transparent mode" : "Enable transparent mode"}
      onClick={onToggle}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        border: "1px solid #2a2d35",
        background: isTransparent ? "#2f415f" : "#161920",
        color: "#eaeaea",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 16,
        lineHeight: 1,
      }}
    >
      👁
    </button>
  );
}
