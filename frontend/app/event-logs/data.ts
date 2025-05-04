"use server";
import { neon } from "@neondatabase/serverless";
const sql = neon(`${process.env.DATABASE_URL}`);

export type DataItem = {
  event_id: number;
  event_timestamp: string;
  event_code: string;
  event_description: string;
  event_video_url: string;
  event_detection_explanation_by_ai: string;
};

export async function fetchData(): Promise<DataItem[]> {
  try {
    const data = (await sql`SELECT * FROM event_logs LIMIT 100`) as DataItem[];
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}
