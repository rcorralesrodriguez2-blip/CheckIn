
'use server';
/**
 * @fileOverview An AI flow for analyzing global attendance patterns across all users.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GlobalAnalysisInputSchema = z.object({
  users: z.array(z.any()).describe("List of all registered users."),
  records: z.array(z.any()).describe("List of all attendance records."),
  appMode: z.enum(['corporate', 'school']).describe("The current mode of the application."),
});

export type GlobalAnalysisInput = z.infer<typeof GlobalAnalysisInputSchema>;

const GlobalAnalysisOutputSchema = z.object({
  analysis: z.string().describe("A comprehensive report analyzing global attendance, absences, and tardiness."),
});

export type GlobalAnalysisOutput = z.infer<typeof GlobalAnalysisOutputSchema>;

const globalAttendanceAnalysisFlow = ai.defineFlow(
  {
    name: 'globalAttendanceAnalysisFlow',
    inputSchema: GlobalAnalysisInputSchema,
    outputSchema: GlobalAnalysisOutputSchema,
  },
  async (input) => {
    const terminology = input.appMode === 'school' 
        ? { group: 'Colegio', people: 'Estudiantes', supervisor: 'Coordinador' }
        : { group: 'Empresa', people: 'Empleados', supervisor: 'Gerente de RRHH' };

    const prompt = `
        Actúa como un ${terminology.supervisor} experto en análisis de datos.
        Tu tarea es analizar los datos de asistencia para este ${terminology.group}.

        Usuarios Registrados (${terminology.people}):
        {{json users}}

        Registros de Asistencia:
        {{json records}}

        Por favor, genera un informe detallado que responda a lo siguiente:
        1. **Frecuencia**: ¿Quiénes son las personas más constantes?
        2. **Inasistencias**: Identifica por nombre a quienes NO tienen ningún registro de asistencia en la lista proporcionada pero sí están registrados como usuarios.
        3. **Tardanzas**: ¿Quiénes llegan tarde frecuentemente (después de las 9:00 AM)?
        4. **Resumen de Comportamiento**: Menciona tendencias interesantes (ej. si hay más faltas los lunes).

        Escribe el informe en español, de forma profesional y clara.
    `;

    const { output } = await ai.generate(prompt);
    
    return output!;
  }
);

export async function analyzeGlobalAttendance(input: GlobalAnalysisInput): Promise<GlobalAnalysisOutput> {
  return globalAttendanceAnalysisFlow(input);
}
