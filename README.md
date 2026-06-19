# Teeth Disease AI

An oral-health AI prototype for screening mouth photos, tracking daily follow-up images, and generating dentist-friendly case summaries.

> This project is a screening and triage prototype. It is not a replacement for a real dental diagnosis.

## English

### Features

- Upload or capture 2-8 oral/mouth photos for multi-angle analysis
- Select symptoms and add duration notes
- Analyze risk, severity, chronicity, and suggested dental-care timing
- Save daily follow-up history in `localStorage`
- Click any timeline entry to review the previous AI result
- Reset all follow-up history
- Generate a doctor summary for dental review
- Download a patient PDF report when sending a case to the dentist
- Use an OpenAI vision model through the backend API
- Fall back to local demo triage when no API key is configured

### Tech Stack

- React + Vite
- Express
- OpenAI Responses API
- Multer for image upload handling
- `localStorage` for prototype follow-up history

### Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

### Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Set values in `.env`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

Run the app:

```bash
npm run dev
```

If `OPENAI_API_KEY` is not set, the app uses `local-demo-triage` so the prototype flow can still be tested.

### Build

```bash
npm run build
```

### Security

- Do not commit `.env`
- `.env` is already ignored in `.gitignore`
- Use `.env.example` only to document required environment variable names
- If an API key has appeared in a chat, issue, commit, or screenshot, revoke/rotate it immediately

### Risk Score Note

The score shown in the app is a risk/urgency score: higher means more concerning and more urgent for dental review.

## ภาษาไทย

เว็บ prototype สำหรับคัดกรองภาพช่องปาก ติดตามรูปถ่ายรายวัน และสร้างสรุปสำหรับทันตแพทย์

> โปรเจกต์นี้เป็นระบบคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยแทนทันตแพทย์

### ความสามารถหลัก

- อัปโหลดหรือถ่ายรูปช่องปาก 2-8 รูปเพื่อให้ AI วิเคราะห์หลายมุม
- เลือกอาการร่วมและบันทึกระยะเวลา
- วิเคราะห์ความเสี่ยง ความรุนแรง แนวโน้มเรื้อรัง และช่วงเวลาที่ควรพบทันตแพทย์
- เก็บประวัติการติดตามรายวันใน `localStorage`
- คลิกประวัติแต่ละวันเพื่อดูผลตรวจ AI รอบก่อนหน้า
- Reset การติดตามทั้งหมดได้
- สร้าง doctor summary สำหรับส่งต่อให้ทันตแพทย์
- ดาวน์โหลดรายงาน PDF ลงเครื่องคนไข้เมื่อกดส่งเคสให้หมอ
- ใช้ OpenAI vision model ผ่าน backend API
- มีโหมด demo fallback เมื่อไม่ได้ตั้งค่า API key

### เทคโนโลยีที่ใช้

- React + Vite
- Express
- OpenAI Responses API
- Multer สำหรับรับรูปภาพ
- `localStorage` สำหรับเก็บประวัติ follow-up ใน prototype

### วิธีรันบนเครื่อง

```bash
npm install
npm run dev
```

เปิดเว็บที่:

```text
http://localhost:5173
```

### การตั้งค่า Environment

คัดลอกไฟล์ตัวอย่าง:

```bash
cp .env.example .env
```

ใส่ค่าใน `.env`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

จากนั้นรัน:

```bash
npm run dev
```

ถ้าไม่ใส่ `OPENAI_API_KEY` ระบบจะใช้ `local-demo-triage` เพื่อให้ทดลอง flow ได้

### Build

```bash
npm run build
```

### ความปลอดภัย

- ห้าม commit ไฟล์ `.env`
- `.env` ถูก ignore ใน `.gitignore` แล้ว
- ใช้ `.env.example` เพื่อบอกชื่อ environment variables ที่ต้องตั้งเท่านั้น
- ถ้า API key เคยถูกเผยแพร่ใน chat, issue, commit หรือ screenshot ควร revoke/rotate key ทันที

### หมายเหตุเรื่องคะแนน

คะแนนในหน้าเว็บคือ risk/urgency score: ยิ่งสูงยิ่งควรระวังและควรให้ทันตแพทย์ตรวจเร็วขึ้น
