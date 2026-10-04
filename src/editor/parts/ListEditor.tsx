import { useState, useEffect, useRef } from 'react';

interface Props {
  readonly value: readonly string[] | undefined;
  readonly onChange: (next: string[]) => void;
  readonly placeholder?: string;
  readonly rows?: number;
}

export default function ListEditor({ value, onChange, placeholder, rows = 5 }: Props) {
  const [text, setText] = useState((value ?? []).join('\n'));
  const localEdit = useRef(false);

  useEffect(() => {
    if (localEdit.current) {
      localEdit.current = false;
      return;
    }
    setText((value ?? []).join('\n'));
  }, [value]);

  return (
    <textarea
      className="list-editor"
      rows={rows}
      placeholder={placeholder ?? 'One item per line'}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        localEdit.current = true;
        const next = raw
          .split('\n')
          .map((s) => s.trimEnd())
          .filter((s) => s.length > 0);
        onChange(next);
      }}
    />
  );
}
