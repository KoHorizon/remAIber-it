import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  minRows?: number;
};

/**
 * A textarea that grows with its content. Generated answers vary from one line
 * to twenty, so a fixed height either wastes the column or hides the text.
 */
export function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
  minRows = 2,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset first: scrollHeight only shrinks if the element isn't already
      // holding the taller height from the previous value.
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
      rows={minRows}
    />
  );
}
