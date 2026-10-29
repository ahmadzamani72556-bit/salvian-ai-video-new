import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Alur drama/storyboard telah dinonaktifkan permanen. Gunakan alur Lagu → Video Musik." },
    { status: 410 }
  );
}
