# Teeth Disease AI

เว็บ prototype สำหรับคัดกรองภาพช่องปาก ติดตามรูปถ่ายรายวัน และสร้างสรุปสำหรับทันตแพทย์

## Features

- อัปโหลดหรือถ่ายรูปช่องปาก
- เลือกอาการร่วมและบันทึกระยะเวลา
- วิเคราะห์ความเสี่ยง ความรุนแรง แนวโน้มเรื้อรัง และช่วงเวลาที่ควรพบทันตแพทย์
- เก็บ timeline รายวันใน `localStorage`
- คลิกประวัติแต่ละวันเพื่อดูผลตรวจ AI รอบก่อนหน้า
- Reset การติดตามทั้งหมดได้
- สร้าง doctor summary สำหรับส่งต่อให้ทันตแพทย์
- ใช้ OpenAI vision model ผ่าน backend API และมี demo fallback เมื่อไม่มี API key

> ผลจาก AI เป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยแทนทันตแพทย์

## Tech Stack

- React + Vite
- Express
- OpenAI Responses API
- Multer สำหรับรับรูปภาพ
- LocalStorage สำหรับ prototype follow-up history

## Run Local

```bash
npm install
npm run dev
```

เปิดเว็บที่:

```text
http://localhost:5173
```

## Environment Setup

คัดลอกไฟล์ตัวอย่าง:

```bash
cp .env.example .env
```

ใส่ค่าใน `.env`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

แล้วรัน:

```bash
npm run dev
```

ถ้าไม่ใส่ `OPENAI_API_KEY` ระบบจะใช้ `local-demo-triage` เพื่อเดโม flow ได้

## Security

- ห้าม commit ไฟล์ `.env`
- `.env` ถูก ignore ใน `.gitignore` แล้ว
- ใช้ `.env.example` สำหรับบอกชื่อ environment variables ที่ต้องตั้ง
- ถ้า API key เคยถูกเผยแพร่ใน chat, issue, commit, หรือ screenshot ควร revoke/rotate key ทันที

## Build

```bash
npm run build
```

## Notes

คะแนนในหน้าเว็บคือ risk/urgency score: ยิ่งสูงยิ่งควรระวังและควรให้ทันตแพทย์ตรวจเร็วขึ้น
