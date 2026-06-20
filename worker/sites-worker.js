const triageSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    condition: { type: 'string' },
    severity: { type: 'string' },
    riskScore: { type: 'number' },
    chronicity: { type: 'string' },
    shouldSeeDentist: { type: 'boolean' },
    timeframe: { type: 'string' },
    explanation: { type: 'string' },
    lesionSizeCm: { type: 'number' },
    lesionSizeConfidence: { type: 'string' },
    lesionSizeNote: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },
    nextSteps: { type: 'array', items: { type: 'string' } },
    doctorSummary: { type: 'string' },
    caveat: { type: 'string' },
  },
  required: [
    'condition',
    'severity',
    'riskScore',
    'chronicity',
    'shouldSeeDentist',
    'timeframe',
    'explanation',
    'lesionSizeCm',
    'lesionSizeConfidence',
    'lesionSizeNote',
    'evidence',
    'nextSteps',
    'doctorSummary',
    'caveat',
  ],
}

const demoResult = {
  condition: 'สงสัยเหงือกอักเสบ',
  severity: 'ปานกลาง',
  riskScore: 58,
  lesionSizeCm: 0.8,
  lesionSizeConfidence: 'low',
  lesionSizeNote: 'Approximate demo estimate. For better centimeter accuracy, include a ruler or known-size reference in the photo.',
  chronicity: 'อาจเป็นซ้ำหรือเรื้อรังได้หากมีคราบหินปูนหรือเลือดออกต่อเนื่อง',
  shouldSeeDentist: true,
  timeframe: 'ควรนัดทันตแพทย์ภายใน 1-2 สัปดาห์',
  explanation: 'ระบบยังไม่ได้ตั้งค่า API key บน production จึงแสดงผล demo สำหรับทดสอบขั้นตอนใช้งานเท่านั้น',
  evidence: ['มีรูปช่องปากหลายมุมสำหรับติดตาม', 'ต้องใช้ทันตแพทย์ยืนยันผลจริง'],
  nextSteps: ['ถ่ายรูปติดตามในแสงชัดเจน', 'หลีกเลี่ยงการกดหรือแกะแผล', 'พบทันตแพทย์หากปวด บวม หรือเลือดออก'],
  doctorSummary: 'Demo triage result. Please configure OPENAI_API_KEY to enable live AI analysis.',
  caveat: 'AI เป็นเครื่องมือคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยแทนทันตแพทย์',
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  })
}

function clampScore(value) {
  const score = Number(value)
  if (Number.isNaN(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

function normalize(result) {
  return {
    condition: result.condition || 'รอประเมินโดยทันตแพทย์',
    severity: result.severity || 'ไม่ระบุ',
    riskScore: clampScore(result.riskScore),
    chronicity: result.chronicity || 'ต้องติดตามอาการต่อเนื่อง',
    shouldSeeDentist: Boolean(result.shouldSeeDentist),
    timeframe: result.timeframe || 'ควรปรึกษาทันตแพทย์เมื่อมีอาการผิดปกติ',
    explanation: result.explanation || 'AI ไม่สามารถยืนยันโรคได้จากรูปเพียงอย่างเดียว',
    lesionSizeCm: Number.isFinite(Number(result.lesionSizeCm))
      ? Math.max(0, Number(Number(result.lesionSizeCm).toFixed(2)))
      : 0,
    lesionSizeConfidence: result.lesionSizeConfidence || 'low',
    lesionSizeNote:
      result.lesionSizeNote ||
      'Approximate visual estimate only. Add a ruler or known-size reference in the photo for better centimeter accuracy.',
    evidence: Array.isArray(result.evidence) ? result.evidence.slice(0, 5) : [],
    nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps.slice(0, 5) : [],
    doctorSummary: result.doctorSummary || 'ไม่มีข้อมูลสรุปเพิ่มเติม',
    caveat: result.caveat || 'AI เป็นเครื่องมือคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยแทนทันตแพทย์',
  }
}

function toBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

async function analyze(request, env) {
  const form = await request.formData()
  const files = form.getAll('photos').filter((item) => item && typeof item.arrayBuffer === 'function')

  if (files.length < 2 || files.length > 8) {
    return json({ error: '2_to_8_photos_required' }, { status: 400 })
  }

  const symptoms = JSON.parse(form.get('symptoms') || '[]')
  const notes = form.get('notes') || ''

  if (!env.OPENAI_API_KEY) {
    return json({
      ...demoResult,
      photoCount: files.length,
      model: 'local-demo-triage',
      analyzedAt: new Date().toISOString(),
    })
  }

  const imageInputs = await Promise.all(
    files.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      return {
        type: 'input_image',
        image_url: `data:${file.type || 'image/jpeg'};base64,${toBase64(bytes)}`,
      }
    }),
  )

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: [
            'You are an oral-health triage assistant. Do not provide a definitive diagnosis.',
            'Return Thai JSON only and recommend dental care when risk signs appear.',
            'riskScore is an oral-health risk/urgency score, not model confidence.',
            'condition must be a short disease/condition title only, ideally 2-8 Thai words.',
            'Put longer observations and explanations in explanation, evidence, and doctorSummary.',
            'Estimate the visible lesion/wound largest diameter in centimeters as lesionSizeCm. If there is no clear lesion, use 0. lesionSizeConfidence must be high, medium, or low. lesionSizeNote must explain that this is approximate and more accurate when a ruler or known-size reference appears in the photo.',
            'Use this calibration: 0-15 normal/no visible concern, 16-35 low concern, 36-60 moderate concern, 61-80 high concern, 81-100 urgent red flags.',
            'Red/white patches, non-healing ulcers, suspicious masses, numbness, spreading swelling, severe pain, rapid growth, or bleeding should not receive a single-digit score.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Analyze these ${files.length} oral photos together for screening. Symptoms: ${symptoms.join(', ') || 'none'}. Notes: ${notes || 'none'}. Higher riskScore means more urgent dental review. Estimate the largest visible lesion/wound diameter in centimeters when possible and mention uncertainty if there is no scale reference.`,
            },
            ...imageInputs,
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'oral_triage',
          schema: triageSchema,
          strict: true,
        },
      },
    }),
  })

  if (!response.ok) {
    return json({ error: 'analysis_failed' }, { status: 500 })
  }

  const data = await response.json()
  const result = normalize(JSON.parse(data.output_text || '{}'))
  return json({
    ...result,
    photoCount: files.length,
    model: env.OPENAI_MODEL || 'gpt-4.1-mini',
    analyzedAt: new Date().toISOString(),
  })
}

async function serveAsset(request, env) {
  const url = new URL(request.url)
  const assetResponse = await env.ASSETS.fetch(request)

  if (assetResponse.status !== 404 || url.pathname.startsWith('/assets/')) {
    return assetResponse
  }

  return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request))
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'oral-ai-prototype' })
    }

    if (url.pathname === '/api/analyze' && request.method === 'POST') {
      return analyze(request, env)
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      return serveAsset(request, env)
    }

    return json({ error: 'not_found' }, { status: 404 })
  },
}
