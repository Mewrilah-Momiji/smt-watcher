export interface PickerOption {
  value: string;
  label: string;
  /** The language the label is written in, so that screen readers pronounce it correctly. */
  lang?: string;
}

export interface Picker {
  input: HTMLInputElement;
  /** The input and its list, to put into the page. */
  elements: HTMLElement[];
  setValue(value: string): void;
}

let pickerCount = 0;

/**
 * A text field with a list of suggestions: typing shortens the list, and only an entry from the list counts.
 * On focus the field empties, so that the whole list shows; leaving it without a choice brings the old value back.
 */
export function createPicker(options: PickerOption[], value: string, onChoose: (value: string) => void): Picker {
  const list = document.createElement('datalist');
  list.id = `picker-${++pickerCount}`;
  for (const option of options) {
    const entry = document.createElement('option');
    entry.value = option.label;
    if (option.lang) entry.lang = option.lang;
    list.append(entry);
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'picker';
  input.setAttribute('list', list.id);
  input.autocomplete = 'off';
  input.spellcheck = false;

  let chosen = value;
  const labelOf = (code: string) => options.find((option) => option.value === code)?.label ?? code;
  const show = () => {
    input.value = labelOf(chosen);
    input.placeholder = labelOf(chosen);
  };

  // An exact name, or a code such as "DE", or the only entry that contains the typed text.
  const match = (text: string, allowPartial: boolean): PickerOption | undefined => {
    const typed = text.trim().toLowerCase();
    if (!typed) return undefined;
    const exact = options.find((option) => option.label.toLowerCase() === typed || option.value.toLowerCase() === typed);
    if (exact || !allowPartial) return exact;
    const partial = options.filter((option) => option.label.toLowerCase().includes(typed));
    return partial.length === 1 ? partial[0] : undefined;
  };

  const choose = (option: PickerOption) => {
    const changed = option.value !== chosen;
    chosen = option.value;
    show();
    if (changed) onChoose(option.value);
  };

  input.addEventListener('focus', () => {
    input.placeholder = labelOf(chosen);
    input.value = '';
  });
  // Picking from the list fills in a whole name at once.
  input.addEventListener('input', () => {
    const option = match(input.value, false);
    if (option) choose(option);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const option = match(input.value, true);
      if (option) {
        event.preventDefault();
        choose(option);
      }
    } else if (event.key === 'Escape') {
      show();
    }
  });
  input.addEventListener('blur', () => {
    const option = match(input.value, true);
    if (option) choose(option);
    else show();
  });

  show();
  return {
    input,
    elements: [input, list],
    setValue(next: string) {
      chosen = next;
      if (document.activeElement !== input) show();
    },
  };
}
