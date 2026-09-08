import { useEffect, useId, useState } from "react";

export interface SearchableSelectOption {
  id: number;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder: string;
  disabled?: boolean;
}

// Type-to-search dropdown for long lists (จังหวัด/อำเภอ/ตำบล — up to ~7000
// rows) where a plain <select> is painful to scroll through. Built on a
// native <input list="..."> + <datalist> instead of a picker library, so it
// needs no new dependency (and no `npm install`).
//
// Typing is free-form and NOT reported to `onChange` until it exactly
// matches an option's label — reporting on every keystroke would feed a
// `null` back down as `value` while a partial word is still being typed,
// which would then re-sync the visible text back to "" and make the field
// look like it can't be typed into at all. Only a match (while typing) or a
// non-match (on blur, which clears the field) ever calls `onChange`.
export function SearchableSelect({ options, value, onChange, placeholder, disabled }: SearchableSelectProps) {
  const datalistId = useId();
  const [text, setText] = useState(() => options.find((o) => o.id === value)?.label ?? "");

  // Re-sync the visible text whenever the selected id changes from outside
  // (profile loads, or a parent field like จังหวัด resets this one) — never
  // while the user is mid-keystroke, since that path doesn't touch `value`
  // unless it just found an exact match (in which case the label already
  // equals what's on screen, so this is a no-op).
  useEffect(() => {
    setText(options.find((o) => o.id === value)?.label ?? "");
  }, [value, options]);

  function handleChange(inputValue: string) {
    setText(inputValue);
    const match = options.find((o) => o.label === inputValue);
    if (match) {
      onChange(match.id);
    }
  }

  function handleBlur() {
    const match = options.find((o) => o.label === text);
    if (!match) {
      setText("");
      if (value !== null) onChange(null);
    }
  }

  return (
    <>
      <input
        className="input-plain"
        list={datalistId}
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      <datalist id={datalistId}>
        {options.map((option) => (
          <option key={option.id} value={option.label} />
        ))}
      </datalist>
    </>
  );
}
