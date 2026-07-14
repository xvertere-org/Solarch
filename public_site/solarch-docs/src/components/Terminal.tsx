import { useEffect, useState } from 'react'

interface TerminalProps {
  command: string
  outputLines: string[]
  typingSpeed?: number
  lineDelay?: number
}

export default function Terminal({
  command,
  outputLines,
  typingSpeed = 50,
  lineDelay = 400,
}: TerminalProps) {
  const [displayedCommand, setDisplayedCommand] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    setDisplayedCommand('')
    setShowOutput(false)
    setVisibleLines(0)

    let i = 0
    const typeInterval = setInterval(() => {
      i++
      setDisplayedCommand(command.slice(0, i))
      if (i >= command.length) {
        clearInterval(typeInterval)
        setTimeout(() => setShowOutput(true), lineDelay)
      }
    }, typingSpeed)

    return () => clearInterval(typeInterval)
  }, [command, typingSpeed, lineDelay])

  useEffect(() => {
    if (!showOutput) return
    if (visibleLines >= outputLines.length) return

    const timer = setTimeout(() => {
      setVisibleLines((prev) => prev + 1)
    }, lineDelay)

    return () => clearTimeout(timer)
  }, [showOutput, visibleLines, outputLines.length, lineDelay])

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-theme bg-theme-body shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 border-b border-theme px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
        <span className="ml-2 text-xs text-theme-muted font-mono">solarch — zsh</span>
      </div>
      <div className="px-5 py-4 font-mono text-sm leading-relaxed">
        <div className="flex items-start gap-2">
          <span className="shrink-0 text-primary">➜</span>
          <span className="shrink-0 text-theme-tertiary">~/my-project</span>
          <span className="text-theme-muted">$</span>
          <span className="text-theme-secondary">{displayedCommand}</span>
          <span className="inline-block h-4 w-2 animate-pulse bg-primary/80" />
        </div>
        {showOutput && (
          <div className="mt-3 space-y-1">
            {outputLines.slice(0, visibleLines).map((line, idx) => (
              <div
                key={idx}
                className={`${
                  line.startsWith('✓')
                    ? 'text-primary'
                    : line.startsWith('▸')
                    ? 'text-accent'
                    : line.startsWith('Error')
                    ? 'text-red-400'
                    : 'text-theme-secondary'
                }`}
              >
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
