interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Rechercher une vidéo, chaîne..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange("")}>
          ×
        </button>
      )}
    </div>
  );
}
