import { SelectDropdown, type SelectDropdownOption } from '../../components/ui/SelectDropdown';

export function FieldSelect({
  value,
  options,
  onChange,
  label,
  className,
  inline,
}: {
  value: string;
  options: SelectDropdownOption[];
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  inline?: boolean;
}) {
  const select = (
    <SelectDropdown
      value={value}
      options={options}
      onChange={onChange}
      className={inline ? 'min-w-0 flex-1' : label ? 'mt-1' : ''}
    />
  );

  if (inline) {
    return (
      <div className={`filter-group ${className ?? ''}`.trim()}>
        {label ? <span className="filter-label">{label}:</span> : null}
        {select}
      </div>
    );
  }

  return (
    <label className={`form-group block ${className ?? ''}`.trim()}>
      {label ? <span>{label}</span> : null}
      {select}
    </label>
  );
}
