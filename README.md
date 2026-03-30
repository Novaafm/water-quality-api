# 💧 Water Quality Monitoring API
### Tugas Akhir - Telkom University

Backend API untuk monitoring kualitas air menggunakan Express.js, PostgreSQL, MQTT, dan Google Gemini AI.

---

## 🚀 Setup Step-by-Step

### Step 1: Buka folder project di VSCode
```bash
cd water-quality-api
code .
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Buat database di PostgreSQL
Buka terminal / pgAdmin, lalu jalankan:
```sql
CREATE DATABASE water_quality;
```

### Step 4: Setting file .env
Buka file `.env` dan ubah sesuai konfigurasi kamu:
```
DB_PASSWORD=password_postgresql_kamu
GEMINI_API_KEY=api_key_dari_aistudio_google
```

### Step 5: Inisialisasi tabel database
```bash
npm run db:init
```
Harusnya muncul:
```
✅ Tabel sensor_data created
✅ Tabel chat_sessions created
✅ Tabel chat_messages created
✅ Indexes created
🎉 Database initialization complete!
```

### Step 6: Jalankan server
```bash
npm run dev
```
Harusnya muncul:
```
🚀 Server running at http://localhost:3000
✅ PostgreSQL connected
✅ MQTT connected
```

---

## 🧪 Testing dengan Postman

### Import Collection
1. Buka Postman
2. Klik Import → Upload file `Water_Quality_API.postman_collection.json`
3. Collection "Water Quality API" akan muncul

### Urutan Testing

**1. Health Check**
- `GET http://localhost:3000/` → harus return status "running"

**2. Simpan Data Sensor (simulasi ESP32)**
- `POST http://localhost:3000/api/sensors`
- Body (JSON):
```json
{
  "device_id": "esp32-01",
  "ph": 7.2,
  "turbidity": 15.3,
  "tds": 350,
  "temperature": 28.5
}
```

**3. Cek Data Sensor**
- `GET http://localhost:3000/api/sensors/latest`
- `GET http://localhost:3000/api/sensors/stats`

**4. Buat Sesi Chat**
- `POST http://localhost:3000/api/chat/sessions`
- Body: `{ "title": "Test Chat" }`
- Catat `id` yang dikembalikan (misal: 1)

**5. Chat dengan AI** ⭐
- `POST http://localhost:3000/api/chat/sessions/1/messages`
- Body: `{ "message": "Bagaimana kualitas air hari ini?" }`
- AI akan menjawab berdasarkan data sensor yang ada di database!

**6. Cek History Chat**
- `GET http://localhost:3000/api/chat/sessions/1/messages`

---

## 📁 Struktur Project

```
water-quality-api/
├── src/
│   ├── config/
│   │   ├── database.js      # Koneksi PostgreSQL
│   │   ├── initDb.js        # Script buat tabel
│   │   └── mqtt.js          # Koneksi MQTT broker
│   ├── routes/
│   │   ├── sensorRoutes.js  # API sensor data
│   │   └── chatRoutes.js    # API chatbot AI
│   └── index.js             # Entry point
├── .env                      # Environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## 📡 API Endpoints

### Sensor
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/sensors | Simpan data sensor |
| GET | /api/sensors | Ambil data sensor |
| GET | /api/sensors/latest | Data sensor terbaru |
| GET | /api/sensors/stats | Statistik hari ini |

### Chat AI
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/chat/sessions | Buat sesi baru |
| GET | /api/chat/sessions | Ambil semua sesi |
| GET | /api/chat/sessions/:id/messages | History pesan |
| POST | /api/chat/sessions/:id/messages | Kirim pesan ke AI |
