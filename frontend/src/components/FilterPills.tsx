interface FilterPillsProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FilterPills({
  label,
  options,
  selected,
  onToggle,
}: FilterPillsProps) {
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="filter-pills">
        {options.map((option) => (
          <button
            key={option}
            className={`pill ${selected.includes(option) ? "active" : ""}`}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
