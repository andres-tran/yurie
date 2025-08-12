"use client"

import { useMemo, useRef, useState } from 'react'
import { ModelSelector } from '../components/model-selector'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [model, setModel] = useState<string>('gpt-5')
  const outputRef = useRef<HTMLDivElement>(null)

  const placeholder = useMemo(
    () => 'Ask me anything...',
    []
  )

  function renderMessageContent(content: string) {
    // Supported image tokens:
    // 1) <image:data:image/<type>;base64,...>
    // 2) Legacy square-bracket token with data URL
    const legacyBracketPattern = "\\[" + "data:image" + "\\/[a-zA-Z]+;base64,[^\\]]+" + "\\]"
    const pattern = new RegExp(
      `<image:([^>]+)>|${legacyBracketPattern}`,
      'g'
    )
    const parts: Array<{ type: 'text'; value: string } | { type: 'image'; src: string }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, match.index) })
      }
      const full = match[0]
      const anglePayload = match[1]
      const src = anglePayload
        ? anglePayload
        : full.startsWith('[')
          ? full.slice(1, -1)
          : ''
      if (src) {
        parts.push({ type: 'image', src })
      }
      lastIndex = match.index + full.length
    }
    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.slice(lastIndex) })
    }

    return (
      <>
        {parts.map((p, i) =>
          p.type === 'text' ? (
            <span key={i}>{p.value}</span>
          ) : (
            <img
              key={i}
              src={p.src}
              alt="Generated image"
              className="mt-2 rounded border border-neutral-200 dark:border-neutral-800 max-w-full"
            />
          )
        )}
      </>
    )
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const nextMessages: ChatMessage[] = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)

    try {
      // Strip embedded base64 images before sending to the server to keep payloads small
      const stripImageData = (text: string): string => {
        const angleTag = /<image:[^>]+>/gi
        const bracketDataUrl = /\[data:image\/[a-zA-Z0-9+.-]+;base64,[^\]]+\]/gi
        const bareDataUrl = /data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/gi
        return text
          .replace(angleTag, '[image omitted]')
          .replace(bracketDataUrl, '[image omitted]')
          .replace(bareDataUrl, '[image omitted]')
      }
      const payloadMessages = nextMessages.map((m) => ({ ...m, content: stripImageData(m.content) }))
      const res = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages, model }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      // Add placeholder assistant message to preserve previous assistant turns
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      // Stream chunks
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          const lastIndex = updated.length - 1
          if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
            updated[lastIndex] = { role: 'assistant', content: assistantText }
          } else {
            updated.push({ role: 'assistant', content: assistantText })
          }
          return updated
        })
        // Keep view scrolled
        queueMicrotask(() => {
          outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight })
        })
      }

      // Flush any remaining decoded bytes
      const finalChunk = decoder.decode()
      if (finalChunk) {
        assistantText += finalChunk
        setMessages((prev) => {
          const updated = [...prev]
          const lastIndex = updated.length - 1
          if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
            updated[lastIndex] = { role: 'assistant', content: assistantText }
          }
          return updated
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `There was an error: ${message}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">Playground</h1>
      <p className="text-neutral-600 dark:text-neutral-300 mb-6">
        Chat with Yurie. Powered by OpenAI's LLM.
      </p>

      <div className="w-full">
        <div
          ref={outputRef}
          className="border border-neutral-200 dark:border-neutral-800 rounded p-3 h-96 overflow-y-auto text-sm whitespace-pre-wrap"
        >
          {messages.length === 0 ? (
            <p className="text-neutral-500">Yurie is ready. Start the conversation below.</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="mb-2">
                <span className="font-semibold mr-2">
                  {m.role === 'user' ? 'You' : 'Yurie'}:
                </span>
                <span>{renderMessageContent(m.content)}</span>
              </div>
            ))
          )}
        </div>
        <form onSubmit={sendMessage} className="mt-3 flex items-center gap-2" aria-busy={isLoading}>
          <ModelSelector
            value={model}
            onChange={setModel}
            disabled={isLoading}
          />
          <input
            className="flex-1 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black px-3 py-2 outline-none"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            readOnly={isLoading}
            aria-disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            aria-label="Send message"
            className="rounded border border-neutral-200 dark:border-neutral-800 bg-white text-black dark:bg-black dark:text-white h-10 w-10 flex items-center justify-center"
          >
            {isLoading ? (
              <div
                className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin"
                aria-hidden="true"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </section>
  )
}