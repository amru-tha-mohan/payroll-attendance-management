import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (local date of check-in)
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    workHours: { type: Number, default: 0 },
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'HALF_DAY'], default: 'PRESENT' },
    remarks: { type: String, default: '' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
