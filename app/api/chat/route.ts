import OpenAI from 'openai'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(request: Request) {
  try {
    const { messages, model } = (await request.json()) as {
      messages: ChatMessage[]
      model?: string
    }

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid body: messages[] required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY server env var' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const client = new OpenAI({ apiKey })

    const prompt =
      messages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n') + '\nAssistant:'

    const selectedModel = typeof model === 'string' && model.trim() ? model : 'gpt-5'

    const stream = await client.responses.stream({
      model: selectedModel,
      reasoning: { effort: "high" },
      instructions: "You are Yurie, a fun and helpful assistant.",
      input: prompt,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'response.output_text.delta') {
              controller.enqueue(encoder.encode(event.delta))
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          controller.enqueue(encoder.encode(`\n[error] ${message}`))
        } finally {
          controller.close()
          // Ensure underlying stream is finalized
          try {
            // @ts-ignore finalize helper may exist in newer SDKs
            if (typeof (stream as any).final === 'function') {
              await (stream as any).final()
            }
          } catch {}
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}