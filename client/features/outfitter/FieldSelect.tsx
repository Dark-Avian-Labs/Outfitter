import { SelectDropdown, type SelectDropdownOption } from '../../components/ui/SelectDropdown';

export function FieldSelect({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: string;
  options: SelectDropdownOption[];
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={`form-group block ${className ?? ''}`.trim()}>
      {label ? <span>{label}</span> : null}
      <SelectDropdown
        value={value}
        options={options}
        onChange={onChange}
        className={label ? 'mt-1' : ''}
      />
    </label>
  );
}
