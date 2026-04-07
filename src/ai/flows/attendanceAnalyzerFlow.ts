
'use server';
/**
 * @fileOverview An AI flow for analyzing user attendance records.
 * 
 * - analyzeAttendance: A function that takes attendance records and returns a summary.
 * - AttendanceAnalysisInput: The input type for the analysis function.
 * - AttendanceAnalysisOutput: The return type for the analysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AttendanceAnalysisInputSchema = z.array(z.any()).describe("An array of user attendance records in JSON format.");

export type AttendanceAnalysisInput = z.infer<typeof AttendanceAnalysisInputSchema>;

const AttendanceAnalysisOutputSchema = z.object({
  analysis: z.string().describe("A concise summary of the user's attendance patterns, highlighting potential issues like tardiness, early departures, or long breaks. Should be formatted as a short report."),
});

export type AttendanceAnalysisOutput = z.infer<typeof AttendanceAnalysisOutputSchema>;


const attendanceAnalyzerFlow = ai.defineFlow(
  {
    name: 'attendanceAnalyzerFlow',
    inputSchema: AttendanceAnalysisInputSchema,
    outputSchema: AttendanceAnalysisOutputSchema,
  },
  async (records) => {
    const prompt = `
        You are an expert HR analyst. Your task is to analyze the following attendance records for a single user and provide a concise summary of their behavior and patterns. 
        Assume a standard workday is from 9:00 AM to 5:00 PM.

        Analyze these records:
        {{json records}}

        Based on the a brief summary highlighting:
        - Punctuality: Is the user consistently on time (first entry around 9 AM)? Mention any patterns of lateness.
        - Departure: Does the user stay for the full workday? Note any patterns of leaving early (last exit before 5 PM).
        - Breaks: Are there unusually long breaks between an exit and the next entry on the same day?
        - Overall consistency and any other notable patterns.

        Keep the summary professional, brief, and to the point.
    `;

    const { output } = await ai.generate(prompt);
    
    return output!;
  }
);


export async function analyzeAttendance(records: any[]): Promise<AttendanceAnalysisOutput> {
  return attendanceAnalyzerFlow(records);
}
