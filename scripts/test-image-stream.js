'use strict'

;(async () => {
  const payload = {
    messages: [
      { role: 'user', content: 'Generate a watercolor image of a small fox in a pine forest' },
    ],
  }

  const res = await fetch('http://localhost:3000/api/playground', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok || !res.body) {
    console.error('Request failed', res.status, res.statusText)
    process.exit(1)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let total = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    total += chunk
    process.stdout.write(chunk)
  }

  // Flush
  const tail = decoder.decode()
  if (tail) {
    total += tail
    process.stdout.write(tail)
  }

  // Simple assertion
  const hasPartial = total.includes('<image_partial:')
  const hasFinal = total.includes('<image:')
  console.error('\n\n[summary] partial:', hasPartial, 'final:', hasFinal)
})().catch((err) => {
  console.error(err)
  process.exit(1)
})


