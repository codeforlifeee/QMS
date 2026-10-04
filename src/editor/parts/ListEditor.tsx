/**
 * Simple one-item-per-line list editor.
 *
 * Used for inclusions, exclusions, payment policy, and terms. Each of these is a
 * free-form bullet list, so a single textarea where every non-blank line becomes an
 * item is far faster to use than a dedicated row-with-plus-button component — and
 * agents already think of them this way.
 */

interface Props {
  readonly value: readonly string[] | undefined;
  readonly onChange: (next: string[]) => void;
  readonly placeholder?: string;
  readonly rows?: number;
}

export default function ListEditor({ value, onChange, placeholder, rows = 5 }: Props) {
  const text = (value ?? []).join('\n');
  return (
    <textarea
      className="list-editor"
      rows={rows}
      placeholder={placeholder ?? 'One item per line'}
      value={text}
      onChange={(e) => {
        const next = e.target.value
          .split('\n')
          .map((s) => s.trimEnd())
          .filter((s) => s.length > 0);
        onChange(next);
      }}
    />
  );
}
