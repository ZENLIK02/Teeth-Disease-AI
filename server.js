import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import { createServer as createViteServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })
const port = Number(process.env.PORT || 5173)
const isProduction = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json({ limit: '12mb' }))

const conditions = [
  {
    key: 'gingivitis',
    label: 'สงสัยเหงือกอักเสบ',
    severity: 'ปานกลาง',
    chronicity: 'อาจเป็นซ้ำ/เรื้อรังถ้ามีคราบหินปูนหรือเลือดออกต่อเนื่อง',
    score: 68,
    urgent: false,
    signs: ['เหงือกบวมแดง', 'เลือดออกขณะแปรงฟัน', 'กลิ่นปากหรือเจ็บเหงือก'],
    advice: 'นัดพบทันตแพทย์เพื่อตรวจเหงือกและขูดหินปูน โดยเฉพาะถ้ามีเลือดออกเกิน 7 วัน',
  },
  {
    key: 'ulcer',
    label: 'สงสัยแผลในช่องปากหรือแผลร้อนใน',
    severity: 'เล็กน้อยถึงปานกลาง',
    chronicity: 'มักหายภายใน 7-14 วัน ถ้าไม่หายควรตรวจเพิ่ม',
    score: 56,
    urgent: false,
    signs: ['แผลวงรีหรือจุดขาวเหลือง', 'เจ็บเวลาพูดหรือกินอาหาร', 'ขอบแผลแดง'],
    advice: 'เฝ้าดูขนาดแผลทุกวัน หลีกเลี่ยงอาหารเผ็ดจัด และพบแพทย์ถ้าแผลโตขึ้นหรือเกิน 14 วัน',
  },
  {
    key: 'caries',
    label: 'สงสัยฟันผุหรือคราบพลัคสะสม',
    severity: 'ปานกลาง',
    chronicity: 'มีแนวโน้มลุกลามถ้าไม่ได้รักษา',
    score: 63,
    urgent: false,
    signs: ['รอยคล้ำบนผิวฟัน', 'เสียวฟัน', 'เศษอาหารติดซ้ำบริเวณเดิม'],
    advice: 'ควรนัดตรวจฟันและเอกซเรย์เฉพาะจุดเพื่อยืนยันรอยผุ',
  },
  {
    key: 'redWhitePatch',
    label: 'พบสัญญาณรอยโรคที่ควรให้ทันตแพทย์ตรวจ',
    severity: 'สูง',
    chronicity: 'ต้องประเมินซ้ำโดยผู้เชี่ยวชาญ โดยเฉพาะถ้าอยู่นานเกิน 2 สัปดาห์',
    score: 82,
    urgent: true,
    signs: ['รอยขาวหรือแดงผิดปกติ', 'แผลไม่หาย', 'เจ็บหรือชาเฉพาะจุด'],
    advice: 'ควรนัดพบทันตแพทย์หรือแพทย์ช่องปากโดยเร็ว เพื่อคัดกรองรอยโรคก่อนมะเร็ง/โรคอื่น',
  },
]

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
    'evidence',
    'nextSteps',
    'doctorSummary',
    'caveat',
  ],
}

function clampRiskScore(score) {
  const value = Number(score)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeTriageResult(result) {
  const evidenceText = Array.isArray(result.evidence) ? result.evidence.join(' ') : ''
  const text = `${result.condition || ''} ${result.severity || ''} ${result.chronicity || ''} ${result.timeframe || ''} ${evidenceText}`.toLowerCase()
  let riskScore = clampRiskScore(result.riskScore)
  let shouldSeeDentist = Boolean(result.shouldSeeDentist)
  let timeframe = result.timeframe || 'ติดตามอาการ'

  const redFlagPattern =
    /มะเร็ง|ก่อนมะเร็ง|รอยขาว|รอยแดง|ขาว\/แดง|white patch|red patch|leukoplakia|erythroplakia|ไม่หาย|ก้อน|ชา|บวมลาม|กลืนลำบาก|แผลโตเร็ว|เลือดออกมาก/
  const highPattern = /สูง|รุนแรง|urgent|ฉุกเฉิน|high|severe/
  const moderatePattern = /ปานกลาง|moderate|ฟันผุ|เหงือกอักเสบ|แผล|ulcer|caries|gingivitis/

  if (redFlagPattern.test(text)) {
    riskScore = Math.max(riskScore, 78)
    shouldSeeDentist = true
    timeframe = /24|72|ทันที|ฉุกเฉิน/.test(timeframe) ? timeframe : 'ภายใน 24-72 ชั่วโมง'
  } else if (highPattern.test(text)) {
    riskScore = Math.max(riskScore, 70)
    shouldSeeDentist = true
    timeframe = timeframe === 'ติดตามอาการ' ? 'ภายใน 24-72 ชั่วโมง' : timeframe
  } else if (moderatePattern.test(text)) {
    riskScore = Math.max(riskScore, 35)
  }

  return {
    ...result,
    riskScore,
    shouldSeeDentist,
    timeframe,
  }
}

function pickMockCondition(symptoms, notes, fileName) {
  const text = `${symptoms.join(' ')} ${notes} ${fileName}`.toLowerCase()

  if (/white|red|patch|ขาว|แดง|ไม่หาย|ชา|ก้อน|บุหรี่|หมาก/.test(text)) {
    return conditions[3]
  }

  if (/bleed|gum|swelling|เหงือก|เลือด|บวม|กลิ่น/.test(text)) {
    return conditions[0]
  }

  if (/cavity|caries|dark|เสียว|ผุ|ดำ|คราบ/.test(text)) {
    return conditions[2]
  }

  return conditions[1]
}

function mockAnalyze({ symptoms, notes, file }) {
  const picked = pickMockCondition(symptoms, notes, file?.originalname || '')
  const hasLongDuration = /14|สองสัปดาห์|2 สัปดาห์|นาน|ไม่หาย/.test(notes)
  const shouldSeeDentist = picked.urgent || hasLongDuration || picked.score >= 63

  return {
    condition: picked.label,
    severity: hasLongDuration && picked.key === 'ulcer' ? 'ปานกลางถึงสูง' : picked.severity,
    riskScore: Math.min(95, picked.score + (hasLongDuration ? 10 : 0)),
    chronicity: picked.chronicity,
    shouldSeeDentist,
    timeframe: picked.urgent
      ? 'ภายใน 24-72 ชั่วโมง'
      : shouldSeeDentist
        ? 'ภายใน 1-2 สัปดาห์'
        : 'ติดตามอาการทุกวัน 7 วัน',
    explanation:
      'ระบบประเมินจากรูปที่ส่งมา ประวัติอาการ และรูปแบบสัญญาณที่พบบ่อยในช่องปาก ผลนี้เป็นการคัดกรองเพื่อช่วยตัดสินใจ ไม่ใช่การวินิจฉัยสุดท้าย',
    evidence: picked.signs,
    nextSteps: [
      picked.advice,
      'ถ่ายรูปตำแหน่งเดิมทุกวันในแสงสม่ำเสมอ พร้อมบันทึกอาการเจ็บ เลือดออก หรือขนาดรอยโรค',
      'ถ้ามีไข้ บวมลาม กลืนลำบาก ปวดรุนแรง หรือแผลโตเร็ว ให้พบแพทย์ทันที',
    ],
    doctorSummary: `AI คัดกรองว่า ${picked.label} ระดับ ${picked.severity}. อาการร่วม: ${symptoms.join(', ') || 'ไม่ได้ระบุ'}. หมายเหตุ: ${notes || 'ไม่มี'}.`,
    caveat: 'AI ไม่สามารถยืนยันโรคจากภาพเพียงอย่างเดียว ควรให้ทันตแพทย์ตรวจช่องปากจริงก่อนตัดสินใจรักษา',
  }
}

async function liveAnalyze({ symptoms, notes, file }) {
  if (!process.env.OPENAI_API_KEY) {
    return mockAnalyze({ symptoms, notes, file })
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content:
          [
            'You are an oral-health triage assistant. Do not provide a definitive diagnosis.',
            'Return Thai JSON only and recommend dental care when risk signs appear.',
            'riskScore is an oral-health risk/urgency score, not model confidence.',
            'Use this calibration: 0-15 = normal/no visible concern, 16-35 = low concern, 36-60 = moderate concern or likely routine dental issue, 61-80 = high concern or should see dentist soon, 81-100 = urgent red flags.',
            'Red/white patches, non-healing ulcers, suspicious masses, numbness, spreading swelling, severe pain, rapid growth, or bleeding should not receive a single-digit score.',
          ].join(' '),
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Analyze this oral photo for screening. Symptoms: ${symptoms.join(', ') || 'none'}. Notes: ${notes || 'none'}. Calibrate riskScore as urgency/risk: higher means more concerning and faster dental review.`,
          },
          { type: 'input_image', image_url: imageUrl },
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
  })

  return normalizeTriageResult(JSON.parse(response.output_text))
}

app.post('/api/analyze', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'photo is required' })
    }

    const symptoms = JSON.parse(req.body.symptoms || '[]')
    const notes = req.body.notes || ''
    const result = await liveAnalyze({ symptoms, notes, file: req.file })

    res.json({
      ...result,
      model: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL || 'gpt-4.1-mini' : 'local-demo-triage',
      analyzedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'analysis_failed' })
  }
})

if (isProduction) {
  app.use(express.static(resolve(__dirname, 'dist')))
  app.get('*', (_req, res) => res.sendFile(resolve(__dirname, 'dist', 'index.html')))
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

app.listen(port, () => {
  console.log(`Oral AI prototype running at http://localhost:${port}`)
})
