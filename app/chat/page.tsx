"use client"

import { useMemo, useRef, useState } from 'react'
import { ModelSelector } from '../components/model-selector'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [model, setModel] = useState<string>('gpt-5')
  const outputRef = useRef<HTMLDivElement>(null)

  const placeholder = useMemo(
    () => 'Ask me anything about this blog, coding, or deployment…',
    []
  )

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, model }),
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
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">Chat</h1>
      <p className="text-neutral-600 dark:text-neutral-300 mb-6">
        Chat with Yurie AI powered by OpenAI's GPT-5 family models.
      </p>

      <div className="w-full">
        <div
          ref={outputRef}
          className="border border-neutral-200 dark:border-neutral-800 rounded p-3 h-96 overflow-y-auto text-sm whitespace-pre-wrap"
        >
          {messages.length === 0 ? (
            <p className="text-neutral-500">Assistant is ready. Start the conversation below.</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="mb-2">
                <span className="font-semibold mr-2">
                  {m.role === 'user' ? 'You' : 'Assistant'}:
                </span>
                <span>{m.content}</span>
              </div>
            ))
          )}
        </div>
        <form onSubmit={sendMessage} className="mt-3 flex items-center gap-2">
          <ModelSelector
            value={model}
            onChange={setModel}
            disabled={isLoading}
          />
          <input
            className="flex-1 rounded border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 outline-none"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded bg-black text-white dark:bg-white dark:text-black px-4 py-2 disabled:opacity-50"
          >
            {isLoading ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>
    </section>
  )
}


