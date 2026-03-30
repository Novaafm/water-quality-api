## 📡 API Endpoints

### Sensors
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/sensors | Simpan data sensor (+ WQI + auto alert) |
| GET | /api/sensors | Ambil data sensor (query: ?limit=50) |
| GET | /api/sensors/latest | Data sensor terbaru |
| GET | /api/sensors/stats | Statistik sensor hari ini |
| GET | /api/sensors/export/csv | Download CSV (query: ?days=90) |

### Devices
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/devices | Register device baru |
| GET | /api/devices | Ambil semua device |
| GET | /api/devices/:id | Detail device |
| PUT | /api/devices/:id | Update device (location, status) |
| DELETE | /api/devices/:id | Hapus device |

### Threshold
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /api/threshold | Ambil threshold aktif |
| PUT | /api/threshold | Update threshold |
| POST | /api/threshold/reset | Reset ke standar Permenkes No. 32/2017 |

### Alerts
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /api/alerts | Ambil alerts (query: ?unread=true&limit=50) |
| PATCH | /api/alerts/:id/read | Tandai alert sudah dibaca |
| PATCH | /api/alerts/read-all | Tandai semua alert sudah dibaca |

### Chat AI
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/chat/sessions | Buat sesi chat baru |
| GET | /api/chat/sessions | Ambil semua sesi |
| GET | /api/chat/sessions/:id/messages | Ambil history pesan |
| POST | /api/chat/sessions/:id/messages | Kirim pesan ke AI |