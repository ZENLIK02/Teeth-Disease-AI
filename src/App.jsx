import { useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle,
  ClipboardList,
  Clock,
  FileText,
  RotateCcw,
  Send,
  ShieldCheck,
  Upload,
  User,
} from 'lucide-react'
import './App.css'

const symptomOptions = [
  'เจ็บหรือแสบ',
  'เลือดออก',
  'เหงือกบวม',
  'รอยขาว/แดง',
  'เสียวฟัน',
  'แผลไม่หาย',
]

const emptyResult = {
  condition: 'รอรูปตรวจช่องปาก',
  severity: 'ยังไม่ประเมิน',
  chronicity: 'ระบบจะแสดงแนวโน้มหลังวิเคราะห์รูป',
  shouldSeeDentist: false,
  timeframe: 'ยังไม่มีคำแนะนำ',
  explanation: 'อัปโหลดหรือถ่ายรูปช่องปากก่อน ระบบจึงจะแสดงผลคัดกรองและ score เพื่อไม่ให้คนไข้สับสนจากข้อมูลตัวอย่าง',
  evidence: ['ยังไม่มีภาพสำหรับวิเคราะห์'],
  nextSteps: ['ถ่ายภาพให้เห็นตำแหน่งเดิมในแสงสว่าง', 'ใส่อาการร่วมและระยะเวลาก่อนกดวิเคราะห์'],
  doctorSummary: 'ยังไม่มีผลวิเคราะห์',
  caveat: 'ผล AI เป็นการคัดกรอง ไม่ใช่การวินิจฉัยแทนทันตแพทย์',
}

const ANALYSIS_DELAY_MS = 2200

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function scoreTone(score) {
  if (score >= 75) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

function loadSavedEntries() {
  try {
    const saved = localStorage.getItem('oral-ai-entries')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function App() {
  const [patient, setPatient] = useState({ name: 'คุณใหม่', age: '32', phone: '080-000-0000' })
  const [symptoms, setSymptoms] = useState(['เจ็บหรือแสบ'])
  const [notes, setNotes] = useState('เริ่มเจ็บบริเวณกระพุ้งแก้มด้านซ้าย 3 วัน')
  const [preview, setPreview] = useState('')
  const [file, setFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [entries, setEntries] = useState(loadSavedEntries)
  const [selectedId, setSelectedId] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendStatus, setSendStatus] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const reportRef = useRef(null)

  const hasAnalysis = Boolean(analysis)
  const visibleResult = analysis || emptyResult
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) || entries[0] || null,
    [entries, selectedId],
  )
  const tone = scoreTone(analysis?.riskScore || 0)

  function updatePatient(field, value) {
    setPatient((current) => ({ ...current, [field]: value }))
  }

  function toggleSymptom(symptom) {
    setSymptoms((current) =>
      current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom],
    )
  }

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    setFile(nextFile)
    setAnalysis(null)
    setError('')

    const reader = new FileReader()
    reader.onload = () => {
      setPreview(String(reader.result || ''))
    }
    reader.readAsDataURL(nextFile)
  }

  function selectTimelineEntry(entry) {
    setSelectedId(entry.id)
    setAnalysis(entry.result)
    setPreview(entry.image)
    setFile(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function resetTracking() {
    localStorage.removeItem('oral-ai-entries')
    setEntries([])
    setSelectedId(null)
    setAnalysis(null)
    setPreview('')
    setFile(null)
    setError('')
    setSendStatus('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function analyzePhoto() {
    if (!file) {
      setError('กรุณาอัปโหลดหรือถ่ายรูปก่อนวิเคราะห์')
      return
    }

    const startedAt = Date.now()
    setIsAnalyzing(true)
    setError('')
    setAnalysis(null)

    try {
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('symptoms', JSON.stringify(symptoms))
      formData.append('notes', notes)

      const response = await fetch('/api/analyze', { method: 'POST', body: formData })
      const remaining = Math.max(0, ANALYSIS_DELAY_MS - (Date.now() - startedAt))
      await wait(remaining)

      if (!response.ok) throw new Error('analysis failed')

      const result = await response.json()
      const entry = {
        id: Date.now(),
        day: `Day ${entries.length + 1}`,
        date: new Date().toISOString().slice(0, 10),
        image: preview,
        sent: false,
        symptoms,
        notes,
        result,
      }
      const nextEntries = [entry, ...entries]

      setAnalysis(result)
      setEntries(nextEntries)
      setSelectedId(entry.id)
      localStorage.setItem('oral-ai-entries', JSON.stringify(nextEntries))
    } catch {
      const remaining = Math.max(0, ANALYSIS_DELAY_MS - (Date.now() - startedAt))
      await wait(remaining)
      setError('วิเคราะห์ไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function buildPdfFilename(entry) {
    const safeName = patient.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'patient'
    return `oral-ai-report-${safeName}-${entry.date}.pdf`
  }

  async function saveCasePdf(entry) {
    if (!reportRef.current) return

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    })
    const imageData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 8
    const imageWidth = pageWidth - margin * 2
    const imageHeight = (canvas.height * imageWidth) / canvas.width
    let heightLeft = imageHeight
    let position = margin

    pdf.addImage(imageData, 'PNG', margin, position, imageWidth, imageHeight)
    heightLeft -= pageHeight - margin * 2

    while (heightLeft > 0) {
      position = heightLeft - imageHeight + margin
      pdf.addPage()
      pdf.addImage(imageData, 'PNG', margin, position, imageWidth, imageHeight)
      heightLeft -= pageHeight - margin * 2
    }

    pdf.save(buildPdfFilename(entry))
  }

  async function markSent() {
    if (!selectedEntry) return
    setIsSending(true)
    setSendStatus('กำลังอัปโหลดเคสให้หมอ...')

    try {
      await wait(700)
      setSendStatus('กำลังสร้างไฟล์ PDF สำหรับคนไข้...')
      await saveCasePdf(selectedEntry)
      await wait(500)

      const nextEntries = entries.map((entry) =>
        entry.id === selectedEntry.id ? { ...entry, sent: true } : entry,
      )
      setEntries(nextEntries)
      localStorage.setItem('oral-ai-entries', JSON.stringify(nextEntries))
      setSendStatus('ส่งเคสให้หมอแล้ว และบันทึก PDF ลงเครื่องแล้ว')
    } catch {
      setSendStatus('สร้าง PDF หรือส่งเคสไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark"><ShieldCheck size={22} /></span>
          <div>
            <h1>Oral AI Follow-up</h1>
            <p>ระบบคัดกรองช่องปากและติดตามภาพรายวันสำหรับคนไข้กับทันตแพทย์</p>
          </div>
        </div>
        <div className="status-pill">
          <Activity size={18} />
          <span>AI ready</span>
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="intake-panel" aria-label="ข้อมูลคนไข้และรูปช่องปาก">
          <div className="section-title">
            <User size={20} />
            <h2>ข้อมูลคนไข้</h2>
          </div>
          <div className="field-grid">
            <label>
              ชื่อ
              <input value={patient.name} onChange={(event) => updatePatient('name', event.target.value)} />
            </label>
            <label>
              อายุ
              <input value={patient.age} onChange={(event) => updatePatient('age', event.target.value)} />
            </label>
            <label className="span-2">
              เบอร์โทร
              <input value={patient.phone} onChange={(event) => updatePatient('phone', event.target.value)} />
            </label>
          </div>

          <div className={preview ? 'upload-zone has-photo' : 'upload-zone'} onClick={() => fileInputRef.current?.click()}>
            {preview ? (
              <img src={preview} alt="รูปช่องปากที่อัปโหลด" />
            ) : (
              <div className="upload-placeholder">
                <Camera size={42} />
                <strong>ยังไม่มีรูป</strong>
                <span>ถ่ายหรืออัปโหลดรูปช่องปากเพื่อเริ่มตรวจ</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
            />
          </div>
          <div className="upload-actions">
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <Camera size={18} />
              ถ่าย/เลือกรูป
            </button>
            <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload size={18} />
              อัปโหลด
            </button>
          </div>

          <div className="symptom-grid">
            {symptomOptions.map((symptom) => (
              <button
                key={symptom}
                type="button"
                className={symptoms.includes(symptom) ? 'selected' : ''}
                onClick={() => toggleSymptom(symptom)}
              >
                {symptom}
              </button>
            ))}
          </div>

          <label className="notes-field">
            อาการและระยะเวลา
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
          </label>

          {error && <p className="error-text">{error}</p>}
          <button className="analyze-button" type="button" onClick={analyzePhoto} disabled={isAnalyzing}>
            {isAnalyzing ? <Clock size={19} /> : <ClipboardList size={19} />}
            {isAnalyzing ? 'กำลังตรวจภาพ...' : 'ตรวจและบันทึกวันนี้'}
          </button>
        </aside>

        <section className="analysis-panel" aria-label="ผลวิเคราะห์ AI">
          {isAnalyzing && (
            <div className="scan-animation" role="status" aria-live="polite">
              <div className="scan-frame">
                <div className="scan-line" />
                <Camera size={42} />
              </div>
              <div>
                <h2>AI กำลังตรวจช่องปาก</h2>
                <p>กำลังอ่านภาพ ประเมินรอยโรค และสร้างสรุปสำหรับหมอ ใช้เวลาประมาณ 2.2 วินาที</p>
                <div className="progress-track"><span /></div>
              </div>
            </div>
          )}

          <div className={hasAnalysis ? 'risk-band' : 'risk-band pending'}>
            <div>
              <span className="eyebrow">AI triage</span>
              <h2>{visibleResult.condition}</h2>
              <p>{visibleResult.explanation}</p>
            </div>
            {hasAnalysis ? (
              <div className={`risk-meter ${tone}`}>
                <small>ความเสี่ยง</small>
                <strong>{analysis.riskScore}</strong>
                <span>/100</span>
                <em>ยิ่งสูงยิ่งควรระวัง</em>
              </div>
            ) : (
              <div className="pending-score">
                <Upload size={28} />
                <span>Score จะแสดงหลังตรวจรูป</span>
              </div>
            )}
          </div>

          {hasAnalysis && (
            <div className="metrics-row">
              <div className="metric">
                <span>ความรุนแรง</span>
                <strong>{analysis.severity}</strong>
              </div>
              <div className="metric">
                <span>แนวโน้มเรื้อรัง</span>
                <strong>{analysis.chronicity}</strong>
              </div>
              <div className="metric urgent">
                <span>ควรพบหมอ</span>
                <strong>{analysis.shouldSeeDentist ? analysis.timeframe : 'ติดตามต่อ'}</strong>
              </div>
            </div>
          )}

          <div className="two-column">
            <div>
              <div className="section-title">
                <AlertTriangle size={19} />
                <h3>หลักฐานที่ AI ใช้</h3>
              </div>
              <ul className="check-list">
                {visibleResult.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="section-title">
                <CheckCircle size={19} />
                <h3>คำแนะนำต่อไป</h3>
              </div>
              <ul className="check-list">
                {visibleResult.nextSteps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="medical-caveat">{visibleResult.caveat}</p>

          <div className="timeline-header">
            <div className="section-title">
              <CalendarDays size={20} />
              <h3>ติดตามรายวัน</h3>
            </div>
            <div className="timeline-tools">
              <span>{entries.length} ภาพ</span>
              <button type="button" className="reset-button" onClick={resetTracking} disabled={isAnalyzing}>
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>
          {entries.length > 0 ? (
            <div className="timeline">
              {entries.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  className={entry.id === selectedId ? 'timeline-item active' : 'timeline-item'}
                  onClick={() => selectTimelineEntry(entry)}
                >
                  <img src={entry.image} alt={`รูปช่องปาก ${entry.day}`} />
                  <div>
                    <strong>{entry.day}</strong>
                    <span>{entry.result.condition}</span>
                  </div>
                  <b>{entry.result.riskScore}</b>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-timeline">ยังไม่มีประวัติรายวัน กดตรวจรูปแรกเพื่อเริ่มติดตาม</div>
          )}
        </section>

        <aside className="doctor-panel" aria-label="สรุปสำหรับทันตแพทย์">
          <div className="section-title">
            <FileText size={20} />
            <h2>สรุปส่งหมอ</h2>
          </div>

          {selectedEntry ? (
            <>
              <div className="doctor-photo">
                <img src={selectedEntry.image} alt="รูปที่เลือกสำหรับส่งให้หมอ" />
              </div>
              <dl className="summary-list">
                <div>
                  <dt>คนไข้</dt>
                  <dd>{patient.name}, {patient.age} ปี</dd>
                </div>
                <div>
                  <dt>วันที่</dt>
                  <dd>{selectedEntry.date}</dd>
                </div>
                <div>
                  <dt>ผลคัดกรอง</dt>
                  <dd>{selectedEntry.result.condition}</dd>
                </div>
                <div>
                  <dt>ความเร่งด่วน</dt>
                  <dd>{selectedEntry.result.timeframe}</dd>
                </div>
              </dl>
              <blockquote>{selectedEntry.result.doctorSummary}</blockquote>
              <button className="send-button" type="button" onClick={markSent} disabled={isSending}>
                {isSending ? <Clock size={18} /> : <Send size={18} />}
                {isSending ? 'กำลังอัปโหลดส่งหมอ...' : selectedEntry.sent ? 'ส่งให้หมอแล้ว / ดาวน์โหลด PDF' : 'ส่งเคสให้หมอ + เซฟ PDF'}
              </button>
              {sendStatus && (
                <div className={isSending ? 'send-status sending' : 'send-status'}>
                  {isSending && <span className="mini-spinner" />}
                  <span>{sendStatus}</span>
                </div>
              )}
            </>
          ) : (
            <div className="doctor-empty">
              <FileText size={36} />
              <strong>ยังไม่มีเคสสำหรับส่งหมอ</strong>
              <span>ผลสรุปจะถูกสร้างหลังจาก AI ตรวจรูปแรกเสร็จ</span>
            </div>
          )}
        </aside>
      </section>

      {selectedEntry && (
        <section ref={reportRef} className="pdf-report" aria-hidden="true">
          <header>
            <div>
              <span>Oral AI Follow-up</span>
              <h2>รายงานผลคัดกรองช่องปาก</h2>
            </div>
            <strong>สำหรับทันตแพทย์</strong>
          </header>

          <div className="pdf-grid">
            <div>
              <h3>ข้อมูลคนไข้</h3>
              <p><b>ชื่อ:</b> {patient.name}</p>
              <p><b>อายุ:</b> {patient.age} ปี</p>
              <p><b>เบอร์โทร:</b> {patient.phone}</p>
              <p><b>วันที่ตรวจ:</b> {selectedEntry.date}</p>
            </div>
            <div>
              <h3>ผลสแกน AI</h3>
              <p><b>โรค/ภาวะที่สงสัย:</b> {selectedEntry.result.condition}</p>
              <p><b>คะแนนความเสี่ยง:</b> {selectedEntry.result.riskScore}/100</p>
              <p><b>ความรุนแรง:</b> {selectedEntry.result.severity}</p>
              <p><b>ควรพบหมอ:</b> {selectedEntry.result.timeframe}</p>
            </div>
          </div>

          <div className="pdf-photo-row">
            <img src={selectedEntry.image} alt="" />
            <div>
              <h3>อาการร่วมและหมายเหตุ</h3>
              <p><b>อาการร่วม:</b> {(selectedEntry.symptoms || symptoms).join(', ') || 'ไม่ได้ระบุ'}</p>
              <p><b>หมายเหตุ:</b> {selectedEntry.notes || notes || 'ไม่มี'}</p>
              <p><b>แนวโน้มเรื้อรัง:</b> {selectedEntry.result.chronicity}</p>
            </div>
          </div>

          <div className="pdf-section">
            <h3>หลักฐานที่ AI ใช้พิจารณา</h3>
            <ul>
              {selectedEntry.result.evidence.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div className="pdf-section">
            <h3>คำแนะนำต่อไป</h3>
            <ul>
              {selectedEntry.result.nextSteps.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div className="pdf-summary">
            <h3>Doctor Summary</h3>
            <p>{selectedEntry.result.doctorSummary}</p>
          </div>

          <footer>
            {selectedEntry.result.caveat} รายงานนี้สร้างจากระบบ AI เพื่อช่วยคัดกรองเบื้องต้น
          </footer>
        </section>
      )}
    </main>
  )
}

export default App
