import pool from '@/lib/db';
import { User, AttendanceRecord, Message } from '@/types';

// ====== USUARIOS ======
export async function getUser(userId: string): Promise<User | null> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    return (rows as any[])[0] || null;
  } finally {
    connection.release();
  }
}

export async function getAllUsers(): Promise<User[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM users');
    return rows as User[];
  } finally {
    connection.release();
  }
}

export async function createUser(user: User): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `INSERT INTO users (id, fullName, role, password, photoUrl, exitLockUntil, fingerprintTemplate) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.fullName,
        user.role,
        user.password || null,
        (user as any).photoUrl || null,
        user.exitLockUntil || null,
        user.fingerprintTemplate || null,
      ]
    );
  } finally {
    connection.release();
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(userId);
    
    await connection.query(
      `UPDATE users SET ${fields} WHERE id = ?`,
      values
    );
  } finally {
    connection.release();
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query('DELETE FROM users WHERE id = ?', [userId]);
  } finally {
    connection.release();
  }
}

// ====== REGISTROS DE ASISTENCIA ======
export async function createAttendanceRecord(record: AttendanceRecord): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const recordId = record.id || `${record.userId}-${Date.now()}`;
    const timestampDate = record.timestamp ? new Date(record.timestamp) : new Date();

    console.log('DB: Inserting attendance record:', {
      id: recordId,
      userId: record.userId,
      timestamp: timestampDate,
      type: record.type,
      method: record.method || 'qr'
    });
    
    const result = await connection.query(
      `INSERT INTO attendance_records (id, userId, timestamp, type, photo, photoUrl, observations, method) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [recordId, record.userId, timestampDate, record.type, record.photo || null, record.photoUrl || null, record.observations || '', record.method || 'qr']
    );
    
    console.log('DB: Attendance record inserted successfully:', result);
  } catch (error) {
    console.error('DB: Error inserting attendance record:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getAttendanceRecords(userId: string, startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]> {
  const connection = await pool.getConnection();
  try {
    let query = 'SELECT ar.*, u.fullName as userName, u.photo as userPhoto FROM attendance_records ar LEFT JOIN users u ON ar.userId = u.id WHERE ar.userId = ?';
    const params: any[] = [userId];
    
    if (startDate) {
      query += ' AND ar.timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND ar.timestamp <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY ar.timestamp DESC';
    const [rows] = await connection.query(query, params);
    return rows as AttendanceRecord[];
  } finally {
    connection.release();
  }
}

export async function getAllAttendanceRecords(startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]> {
  const connection = await pool.getConnection();
  try {
    let query = 'SELECT ar.*, u.fullName as userName, u.photo as userPhoto FROM attendance_records ar LEFT JOIN users u ON ar.userId = u.id WHERE 1=1';
    const params: any[] = [];
    
    if (startDate) {
      query += ' AND ar.timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND ar.timestamp <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY ar.timestamp DESC';
    const [rows] = await connection.query(query, params);
    return rows as AttendanceRecord[];
  } finally {
    connection.release();
  }
}

export async function deleteAttendanceRecord(recordId: string): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query('DELETE FROM attendance_records WHERE id = ?', [recordId]);
  } finally {
    connection.release();
  }
}

export async function getAttendanceRecordById(recordId: string): Promise<AttendanceRecord | null> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM attendance_records WHERE id = ?', [recordId]);
    return (rows as any[])[0] || null;
  } finally {
    connection.release();
  }
}

export async function updateAttendanceRecord(recordId: string, updates: Partial<AttendanceRecord>): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(recordId);
    
    await connection.query(
      `UPDATE attendance_records SET ${fields} WHERE id = ?`,
      values
    );
  } finally {
    connection.release();
  }
}

// ====== MENSAJES ======
export async function createMessage(message: Message): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const messageId = message.id || `msg-${Date.now()}`;
    const timestampDate = message.timestamp ? new Date(message.timestamp) : new Date();
    
    await connection.query(
      `INSERT INTO messages (id, userId, userName, message, timestamp, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [messageId, message.userId, message.userName, message.message, timestampDate, message.status]
    );
  } finally {
    connection.release();
  }
}

export async function getMessages(status?: 'new' | 'read'): Promise<Message[]> {
  const connection = await pool.getConnection();
  try {
    let query = 'SELECT * FROM messages';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY timestamp DESC';
    const [rows] = await connection.query(query, params);
    return rows as Message[];
  } finally {
    connection.release();
  }
}

export async function updateMessageStatus(messageId: string, status: 'new' | 'read'): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      'UPDATE messages SET status = ? WHERE id = ?',
      [status, messageId]
    );
  } finally {
    connection.release();
  }
}

export async function deleteMessage(messageId: string): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query('DELETE FROM messages WHERE id = ?', [messageId]);
  } finally {
    connection.release();
  }
}

// ====== REPORTES ======
export async function createReport(id: string, userId: string, title: string, description: string): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const createdAt = new Date();
    await connection.query(
      `INSERT INTO reports (id, userId, title, description, status, createdAt) 
       VALUES (?, ?, ?, ?, 'new', ?)`,
      [id, userId, title, description, createdAt]
    );
  } finally {
    connection.release();
  }
}

export async function getReports(userId?: string): Promise<any[]> {
  const connection = await pool.getConnection();
  try {
    let query = `
      SELECT 
        r.id, 
        r.userId, 
        u.fullName as userName, 
        r.title, 
        r.description as message, 
        r.status, 
        r.createdAt as timestamp 
      FROM reports r
      LEFT JOIN users u ON r.userId = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (userId) {
      query += ' AND r.userId = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY r.createdAt DESC';
    const [rows] = await connection.query(query, params);
    return rows as any[];
  } finally {
    connection.release();
  }
}

export async function updateReportStatus(reportId: string, status: string): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      'UPDATE reports SET status = ? WHERE id = ?',
      [status, reportId]
    );
  } finally {
    connection.release();
  }
}

export async function deleteReport(reportId: string): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query('DELETE FROM reports WHERE id = ?', [reportId]);
  } finally {
    connection.release();
  }
}

export async function getAppSettings(): Promise<{ appMode: 'corporate' | 'school' }> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT appMode FROM app_settings ORDER BY id DESC LIMIT 1');
    const settings = (rows as any[])[0];
    return settings || { appMode: 'corporate' };
  } finally {
    connection.release();
  }
}

export async function updateAppMode(mode: 'corporate' | 'school'): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query('INSERT INTO app_settings (appMode) VALUES (?)', [mode]);
  } finally {
    connection.release();
  }
}

// ====== CÓDIGOS QR ======
export async function createQRCode(id: string, userId: string, qrData: string, expiresAt?: Date): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `INSERT INTO qr_codes (id, userId, qrData, expiresAt) 
       VALUES (?, ?, ?, ?)`,
      [id, userId, qrData, expiresAt || null]
    );
  } finally {
    connection.release();
  }
}

export async function getQRCode(qrId: string): Promise<any | null> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT * FROM qr_codes WHERE id = ?',
      [qrId]
    );
    return (rows as any[])[0] || null;
  } finally {
    connection.release();
  }
}

export async function getUserQRCodes(userId: string): Promise<any[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT * FROM qr_codes WHERE userId = ? AND (expiresAt IS NULL OR expiresAt > NOW())',
      [userId]
    );
    return rows as any[];
  } finally {
    connection.release();
  }
}

export async function deleteQRCode(qrId: string): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query('DELETE FROM qr_codes WHERE id = ?', [qrId]);
  } finally {
    connection.release();
  }
}
