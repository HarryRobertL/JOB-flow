import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
  id?: string
  name?: string
  "aria-invalid"?: React.AriaAttributes["aria-invalid"]
  "aria-describedby"?: string
}

export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder,
  ariaLabel = "Add item",
  className,
  id,
  name,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}) => {
  const [input, setInput] = React.useState("")

  const addTag = React.useCallback(() => {
    const next = input
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .filter((tag) => !value.includes(tag))
    if (next.length > 0) onChange([...value, ...next])
    setInput("")
  }, [input, onChange, value])

  const removeTag = React.useCallback(
    (tag: string) => onChange(value.filter((v) => v !== tag)),
    [onChange, value]
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border-default bg-surface-DEFAULT px-3 py-2 flex flex-wrap gap-2",
        className
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-primary-500/20 text-primary-700 dark:text-primary-300 px-2 py-0.5 text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-error-600"
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <Input
        id={id}
        name={name}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={addTag}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="flex-1 min-w-[140px] border-none shadow-none focus-visible:ring-0 bg-transparent px-0 py-1 h-auto"
      />
    </div>
  )
}
