// Prevent prerendering of this page
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <html>
      <body>
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404 - Page Not Found</h1>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            Oops! The page you're looking for doesn't exist.
          </p>
          <a 
            href="/" 
            style={{ 
              color: '#0070f3', 
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              border: '1px solid #0070f3',
              borderRadius: '4px'
            }}
          >
            ← Back to homepage
          </a>
        </div>
      </body>
    </html>
  );
}
