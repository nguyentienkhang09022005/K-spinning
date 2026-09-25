import { NextResponse } from "next/server";
// Stop this server process (Shutdown button in the dashboard menu).
export async function POST() {
  const response = NextResponse.json({ success: true, message: "Shutting down..." });

  setTimeout(() => process.exit(0), 500);

  return response;
}
