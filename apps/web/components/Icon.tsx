// A few stroke icons (24x24, outline style) so the UI needs no icon library.
const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  agent: 'M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21a8 8 0 0 1 16 0',
  tasks: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3',
  check: 'M5 12.5 10 17 19 7',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chat: 'M4 5h16v11H8l-4 4z',
  sheet: 'M4 4h16v16H4zM4 10h16M4 15h16M10 4v16',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  slack: 'M8 4v6M16 14v6M4 16h6M14 8h6M8 14h.01M16 10h.01',
  report: 'M6 3h9l4 4v14H6zM9 13h6M9 17h6M14 3v5h5',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5',
}

export default function Icon({ name, className = 'h-5 w-5' }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  )
}
