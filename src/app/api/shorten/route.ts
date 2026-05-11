import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "url query parameter is required" },
        { status: 400 }
      );
    }

    if (typeof url !== "string") {
      return NextResponse.json(
        { error: "Invalid url parameter" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
      { method: "GET" }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to shorten URL" },
        { status: 502 }
      );
    }

    const shortUrl = await response.text();

    return NextResponse.json({ shortUrl, originalUrl: url });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
