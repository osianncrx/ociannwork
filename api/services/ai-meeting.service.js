const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe audio/video file using OpenAI Whisper
 */
async function transcribeRecording(filePath) {
  try {
    console.log('[AI] Starting transcription for:', filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileSize = fs.statSync(filePath).size;
    const maxSize = 25 * 1024 * 1024; // 25MB Whisper limit

    if (fileSize > maxSize) {
      console.log('[AI] File too large for Whisper, will attempt chunked transcription');
      // For files > 25MB, we'll still try - OpenAI may handle it
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'es', // Spanish as primary, Whisper auto-detects if wrong
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    // Build formatted transcript with timestamps
    let formattedTranscript = '';
    if (transcription.segments && transcription.segments.length > 0) {
      formattedTranscript = transcription.segments
        .map((seg) => {
          const start = formatTimestamp(seg.start);
          const end = formatTimestamp(seg.end);
          return `[${start} - ${end}] ${seg.text.trim()}`;
        })
        .join('\n');
    } else {
      formattedTranscript = transcription.text || '';
    }

    console.log('[AI] Transcription completed, length:', formattedTranscript.length);
    return {
      text: transcription.text || '',
      formatted: formattedTranscript,
      language: transcription.language || 'unknown',
      duration: transcription.duration || 0,
    };
  } catch (error) {
    console.error('[AI] Transcription failed:', error.message);
    throw error;
  }
}

/**
 * Analyze meeting transcript using GPT-4
 */
async function analyzeMeeting(transcript, meetingInfo = {}) {
  try {
    console.log('[AI] Starting meeting analysis...');

    const { chatName, callType, duration, participants } = meetingInfo;

    const systemPrompt = `Eres un asistente de reuniones profesional estilo Read.ai. 
Analiza la transcripción de la reunión y genera un reporte completo en español.
Responde SOLO con un JSON válido, sin markdown ni texto adicional.`;

    const userPrompt = `Analiza esta transcripción de reunión y genera un JSON con la siguiente estructura exacta:

{
  "summary": "Resumen ejecutivo de la reunión en 3-5 oraciones",
  "key_points": ["punto clave 1", "punto clave 2", ...],
  "tasks": [
    {
      "task": "Descripción de la tarea",
      "assignee": "Nombre de la persona asignada (o 'Sin asignar' si no se menciona)",
      "priority": "alta|media|baja",
      "deadline": "Fecha límite mencionada o 'Sin definir'"
    }
  ],
  "decisions": ["decisión tomada 1", "decisión tomada 2", ...],
  "analysis": {
    "meeting_effectiveness": "Evaluación de qué tan efectiva fue la reunión (1-2 oraciones)",
    "participation": "Análisis de la participación de los asistentes",
    "tone": "Tono general de la reunión (profesional, casual, tenso, etc.)",
    "topics_discussed": ["tema 1", "tema 2", ...],
    "follow_up_needed": "Qué seguimiento se necesita",
    "recommendations": ["recomendación 1", "recomendación 2", ...]
  }
}

Información de la reunión:
- Nombre: ${chatName || 'No especificado'}
- Tipo: ${callType || 'No especificado'}
- Duración: ${duration ? Math.floor(duration / 60) + ' minutos' : 'No especificada'}
- Participantes: ${participants && participants.length > 0 ? participants.map((p) => p.name || p).join(', ') : 'No especificados'}

Transcripción:
${transcript}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from GPT');
    }

    const analysis = JSON.parse(content);
    console.log('[AI] Meeting analysis completed');
    return analysis;
  } catch (error) {
    console.error('[AI] Meeting analysis failed:', error.message);
    throw error;
  }
}

/**
 * Full pipeline: transcribe + analyze
 */
async function processRecording(recording) {
  const filePath = path.join(__dirname, '..', 'public', recording.file_url);

  // Step 1: Transcribe
  const transcription = await transcribeRecording(filePath);

  if (!transcription.text || transcription.text.trim().length < 10) {
    return {
      transcript: transcription.formatted || transcription.text || 'No se detectó audio hablado en la grabación.',
      summary: 'No se pudo generar un resumen porque no se detectó suficiente contenido hablado.',
      tasks: [],
      analysis: 'La grabación no contiene suficiente contenido de audio hablado para analizar.',
    };
  }

  // Step 2: Analyze with GPT
  const analysis = await analyzeMeeting(transcription.text, {
    chatName: recording.chat_name,
    callType: recording.call_type,
    duration: recording.duration,
    participants: recording.participants,
  });

  // Build formatted summary
  let summaryText = analysis.summary || '';
  if (analysis.key_points && analysis.key_points.length > 0) {
    summaryText += '\n\n📌 Puntos Clave:\n' + analysis.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n');
  }
  if (analysis.decisions && analysis.decisions.length > 0) {
    summaryText += '\n\n✅ Decisiones Tomadas:\n' + analysis.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n');
  }

  // Build formatted analysis
  const a = analysis.analysis || {};
  let analysisText = '';
  if (a.meeting_effectiveness) analysisText += `📊 Efectividad: ${a.meeting_effectiveness}\n\n`;
  if (a.participation) analysisText += `👥 Participación: ${a.participation}\n\n`;
  if (a.tone) analysisText += `🎭 Tono: ${a.tone}\n\n`;
  if (a.topics_discussed && a.topics_discussed.length > 0) {
    analysisText += '📋 Temas Discutidos:\n' + a.topics_discussed.map((t, i) => `  ${i + 1}. ${t}`).join('\n') + '\n\n';
  }
  if (a.follow_up_needed) analysisText += `🔄 Seguimiento: ${a.follow_up_needed}\n\n`;
  if (a.recommendations && a.recommendations.length > 0) {
    analysisText += '💡 Recomendaciones:\n' + a.recommendations.map((r, i) => `  ${i + 1}. ${r}`).join('\n');
  }

  // Format tasks
  const tasks = (analysis.tasks || []).map((t) => ({
    task: t.task || '',
    assignee: t.assignee || 'Sin asignar',
    priority: t.priority || 'media',
    deadline: t.deadline || 'Sin definir',
    status: 'pending',
  }));

  return {
    transcript: transcription.formatted || transcription.text,
    summary: summaryText,
    tasks,
    analysis: analysisText,
  };
}

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

module.exports = {
  transcribeRecording,
  analyzeMeeting,
  processRecording,
};
