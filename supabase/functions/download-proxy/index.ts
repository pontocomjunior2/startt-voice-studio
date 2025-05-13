// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // Permite qualquer origem, ajuste se necessário
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

console.log("Hello from Functions!")

serve(async (req) => {
  // Lidar com requisições OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const urlParams = new URL(req.url).searchParams;
    const audioUrl = urlParams.get("url");

    if (!audioUrl) {
      return new Response(JSON.stringify({ error: "Missing audio URL parameter" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let decodedAudioUrl = "";
    try {
      decodedAudioUrl = decodeURIComponent(audioUrl);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid audio URL encoding" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    console.log(`Proxying download for: ${decodedAudioUrl}`);

    const response = await fetch(decodedAudioUrl);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch audio: ${response.statusText}` }), {
        status: response.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Tentar extrair um nome de arquivo da URL original
    let filename = "audio_download.mp3"; // Default filename
    try {
      const pathSegments = new URL(decodedAudioUrl).pathname.split('/');
      const lastSegment = pathSegments.pop();
      if (lastSegment && lastSegment.includes('.')) {
        filename = lastSegment;
      }
    } catch (e) {
      console.warn("Could not parse filename from URL, using default.");
    }

    // Clona a resposta para poder modificar os headers
    const newHeaders = new Headers(response.headers);

    // Adiciona/sobrescreve headers para CORS e download
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });
    newHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);
    
    // Importante: Se o áudio for muito grande, streamar o body pode ser mais eficiente
    // Mas para a maioria dos casos de áudio, response.body é suficiente.
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });

  } catch (error) {
    console.error("Error in download-proxy function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/download-proxy' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
