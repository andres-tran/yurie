import ChatClient from './ChatClient'

export default function Page() {
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_PLAYGROUND === 'true' || process.env.NODE_ENV !== 'production'
  if (!isEnabled) {
    // Render 404 in production when the playground is disabled
    return (
      <section>
        <h1 className="mb-8 text-2xl font-semibold tracking-tighter">404 - Page Not Found</h1>
        <p className="mb-4">The page you are looking for does not exist.</p>
      </section>
    )
  }
  return <ChatClient />
}


