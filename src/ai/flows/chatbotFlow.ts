
'use server';
/**
 * @fileOverview A chatbot flow for user support.
 * 
 * - chatbot: A function that takes a user query and returns a helpful response.
 * - ChatbotInput: The input type for the chatbot function.
 * - ChatbotOutput: The return type for the chatbot function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChatbotInputSchema = z.object({
  query: z.string().describe("The user's question for the chatbot."),
});
export type ChatbotInput = z.infer<typeof ChatbotInputSchema>;

const ChatbotOutputSchema = z.object({
  response: z.string().describe("The chatbot's helpful response."),
});
export type ChatbotOutput = z.infer<typeof ChatbotOutputSchema>;

const chatbotFlow = ai.defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatbotInputSchema,
    outputSchema: ChatbotOutputSchema,
  },
  async ({ query }) => {
    const prompt = `
        You are a friendly and helpful support chatbot for an application called "CheckIn". 
        Your goal is to answer user questions clearly and concisely.

        Here is some information about the app to help you answer questions:

        **Common Questions & Answers:**

        *   **Q: Cómo me registro? (How do I register?)**
            *   **A:** Para registrarte, ve a la página de inicio de sesión y haz clic en el enlace "Regístrate aquí". Deberás ingresar tu nombre completo, tu número de cédula (que será tu ID de usuario) y crear una contraseña. Una vez completado, se generará tu código QR personal.
            *   **A (EN):** To register, go to the login page and click the "Register here" link. You'll need to enter your full name, your ID card number (which will be your user ID), and create a password. Once complete, your personal QR code will be generated.

        *   **Q: ¿Por qué no aparece mi asistencia? (Why isn't my attendance showing up?)**
            *   **A:** La asistencia puede tardar unos momentos en aparecer después de escanear tu código QR. Asegúrate de haber escaneado correctamente y de que viste un mensaje de confirmación. Si después de un minuto aún no aparece, intenta refrescar la página. Si el problema persiste, contacta a un administrador.
            *   **A (EN):** Attendance may take a few moments to appear after scanning your QR code. Make sure you scanned it correctly and saw a confirmation message. If it still doesn't appear after a minute, try refreshing the page. If the problem continues, please contact an administrator.

        *   **Q: ¿Cómo exporto mi historial? (How do I export my history?)**
            *   **A:** En tu panel de usuario, ve a la pestaña "Mi Asistencia". Verás un botón que dice "Exportar CSV". Al hacer clic, se descargará un archivo con todo tu historial de asistencia.
            *   **A (EN):** On your user dashboard, go to the "My Attendance" tab. You will see a button that says "Export CSV". Clicking it will download a file with your complete attendance history.

        *   **Q: General App Functionality**
            *   The app uses QR codes for attendance.
            *   Users have a personal QR code.
            *   Admins can scan QR codes to record entry and exit times.
            *   Users can view their own attendance history.
            
        Now, please answer the following user question. Respond in the same language as the user's question.

        User question: "{{query}}"
    `;

    const { output } = await ai.generate(prompt);
    
    return output!;
  }
);

export async function chatbot(input: ChatbotInput): Promise<ChatbotOutput> {
  return chatbotFlow(input);
}
