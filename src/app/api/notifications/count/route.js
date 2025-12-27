// Prismic's editor toolbar tries to fetch notification counts
// This endpoint satisfies that request to prevent 404 errors
export async function GET() {
  return Response.json({ count: 0 });
}

