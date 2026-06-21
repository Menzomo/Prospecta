const COLORS = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-teal-600',
  'bg-sky-600',
  'bg-pink-600',
  'bg-orange-600',
]

function pickColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

const SIZE_CLASSES = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

type Props = {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ name, size = 'md' }: Props) {
  return (
    <div
      className={`shrink-0 flex items-center justify-center rounded-full font-bold text-white ${SIZE_CLASSES[size]} ${pickColor(name)}`}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  )
}
