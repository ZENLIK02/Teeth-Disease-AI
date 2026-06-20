# Teeth Disease AI

An oral-health AI prototype for screening mouth photos, tracking daily follow-up images, and generating dentist-friendly PDF summaries.

> This project is a screening and triage prototype. It is not a replacement for a real dental diagnosis.

## English

### Features

- Upload or capture 2-8 oral/mouth photos for multi-angle analysis
- Select symptoms and add duration notes
- Analyze risk, severity, chronicity, and suggested dental-care timing
- Show a short disease/condition title with a smaller explanation underneath
- Save daily follow-up history in `localStorage`
- Click any timeline entry to review the previous AI result
- Reset all follow-up history
- Generate a dentist summary and download a patient PDF report
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

If `OPENAI_API_KEY` is not set, the app uses `local-demo-triage` so the prototype flow can still be tested.

### Build

```bash
npm run build
```

### Deploy To Render

This repository includes `render.yaml`, so it can be deployed as a Render Web Service.

1. Push this repository to GitHub.
2. Open Render and choose **New +** > **Blueprint**.
3. Connect `ZENLIK02/Teeth-Disease-AI`.
4. Add the secret environment variable `OPENAI_API_KEY`.
5. Keep `OPENAI_MODEL=gpt-4.1-mini`.
6. Deploy.
7. To use your own domain, add a custom domain in Render and point your DNS `CNAME` to Render's target.

Render will run:

```bash
npm ci && npm run build
NODE_ENV=production node server.js
```

### Security

- Do not commit `.env`
- `.env` is ignored in `.gitignore`
- Store production API keys only as hosting environment variables
- If an API key appeared in a chat, issue, commit, or screenshot, revoke/rotate it immediately

### Risk Score Note

The score shown in the app is a risk/urgency score: higher means more concerning and more urgent for dental review.

## ภาษาไทย

เว็บ prototype สำหรับคัดกรองภาพช่องปากด้วย AI ติดตามรูปถ่ายรายวัน และสร้าง PDF สรุปเคสสำหรับส่งให้ทันตแพทย์

> โปรเจกต์นี้เป็นระบบคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยแทนทันตแพทย์

### ความสามารถหลัก

- อัปโหลดหรือถ่ายรูปช่องปากพร้อมกัน 2-8 รูป เพื่อให้ AI วิเคราะห์หลายมุม
- เลือกอาการร่วมและใส่บันทึกระยะเวลา
- วิเคราะห์ความเสี่ยง ความรุนแรง แนวโน้มเรื้อรัง และช่วงเวลาที่ควรพบทันตแพทย์
- แสดงหัวข้อโรค/ภาวะที่สงสัยแบบสั้น และใส่คำอธิบายตัวเล็กด้านล่าง
- เก็บประวัติการติดตามรายวันใน `localStorage`
- คลิกประวัติแต่ละวันเพื่อดูผลตรวจ AI รอบก่อนหน้า
- Reset ประวัติการติดตามทั้งหมดได้
- สร้างสรุปสำหรับหมอและดาวน์โหลดรายงาน PDF ให้คนไข้
- ใช้ OpenAI vision model ผ่าน backend API
- มีโหมด demo fallback เมื่อยังไม่ได้ตั้งค่า API key

### เทคโนโลยีที่ใช้

- React + Vite
- Express
- OpenAI Responses API
- Multer สำหรับรับไฟล์รูปภาพ
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

ถ้าไม่ใส่ `OPENAI_API_KEY` ระบบจะใช้ `local-demo-triage` เพื่อให้ทดลอง flow ได้

### Build

```bash
npm run build
```

### เอาขึ้นเว็บด้วย Render

โปรเจกต์นี้มี `render.yaml` แล้ว สามารถ deploy เป็น Render Web Service ได้

1. Push repository นี้ขึ้น GitHub
2. เปิด Render แล้วเลือก **New +** > **Blueprint**
3. เชื่อมต่อ repo `ZENLIK02/Teeth-Disease-AI`
4. เพิ่ม secret environment variable ชื่อ `OPENAI_API_KEY`
5. ใช้ `OPENAI_MODEL=gpt-4.1-mini`
6. กด Deploy
7. ถ้าต้องการใช้ domain ของตัวเอง ให้เพิ่ม Custom Domain ใน Render แล้วตั้งค่า DNS `CNAME` ไปยัง target ที่ Render ให้มา

Render จะรัน:

```bash
npm ci && npm run build
NODE_ENV=production node server.js
```

### ความปลอดภัย

- ห้าม commit ไฟล์ `.env`
- `.env` ถูก ignore ใน `.gitignore` แล้ว
- API key บน production ให้ใส่เป็น environment variable ของ hosting เท่านั้น
- ถ้า API key เคยหลุดใน chat, issue, commit หรือ screenshot ควร revoke/rotate key ทันที

### หมายเหตุเรื่องคะแนน

คะแนนในหน้าเว็บคือ risk/urgency score: ยิ่งสูงยิ่งควรระวังและควรให้ทันตแพทย์ตรวจเร็วขึ้น
